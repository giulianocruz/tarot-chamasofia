import { env } from 'cloudflare:workers';
import { addEvent, ensureSchema, getD1 } from './database';
import { sendLifecycleMessage } from './notifications';

type Candidate = {
  id: number;
  public_token: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_whatsapp?: string | null;
  anonymous_id?: string | null;
  recovery_first_sent_at?: string | null;
};

const minutes = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
};

function recoveryCopy(kind: 'form' | 'pix', step: 1 | 2, firstName: string, url: string) {
  if (step === 2) return {
    subject: 'Seu acesso continua disponível',
    message: `${firstName}, seu acesso continua disponível caso queira retomar com calma: ${url}`,
  };
  if (kind === 'pix') return {
    subject: 'Sua jornada ficou pausada',
    message: `Olá, ${firstName}. Percebemos que sua jornada ficou pausada. Se quiser continuar, seu acesso ainda está disponível por aqui: ${url}`,
  };
  return {
    subject: 'Continue sua jornada no Tarot',
    message: `Olá, ${firstName}. Percebemos que você começou sua jornada e fez uma pausa. Se quiser continuar, suas informações estão disponíveis por aqui: ${url}`,
  };
}

async function deliver(candidate: Candidate, kind: 'form' | 'pix', step: 1 | 2) {
  const appUrl = (env.APP_URL || 'https://tarot.chamasofia.com.br').replace(/\/$/, '');
  const url = kind === 'pix'
    ? `${appUrl}/leitura/${candidate.public_token}`
    : `${appUrl}/?resume=${encodeURIComponent(candidate.public_token)}#pergunta`;
  const firstName = (candidate.customer_name || 'Olá').trim().split(/\s+/)[0] || 'Olá';
  const copy = recoveryCopy(kind, step, firstName, url);
  return sendLifecycleMessage({
    customerName:candidate.customer_name || firstName,
    customerEmail:candidate.customer_email,
    customerWhatsapp:candidate.customer_whatsapp,
    orderNumber:candidate.order_number,
    kind:`${kind}_recovery_${step}`,
    subject:copy.subject,
    message:copy.message,
    url,
  });
}

async function processCandidate(candidate: Candidate, kind: 'form' | 'pix', step: 1 | 2) {
  const table = kind === 'pix' ? 'orders' : 'abandoned_leads';
  const eligibility = kind === 'pix' ? "payment_status='pending'" : 'converted_order_id IS NULL';
  const now = new Date().toISOString();
  const claimed = await getD1().prepare(`UPDATE ${table} SET recovery_last_attempt_at=?,recovery_error=NULL WHERE id=? AND ${eligibility}`)
    .bind(now,candidate.id).run();
  if (!claimed.meta.changes) return false;
  const result = await deliver(candidate,kind,step);
  if (result.ok) {
    const column = step === 1 ? 'recovery_first_sent_at' : 'recovery_second_sent_at';
    await getD1().prepare(`UPDATE ${table} SET ${column}=?,recovery_error=NULL WHERE id=?`).bind(now,candidate.id).run();
    await addEvent(`recovery_${kind}_${step}_sent`,kind==='pix'?candidate.id:null,candidate.anonymous_id||null,{channels:result.results.filter((item)=>item.ok).map((item)=>item.channel)});
    return true;
  }
  const error = result.attempted
    ? result.results.map((item)=>`${item.channel}:${item.error || 'falhou'}`).join('; ')
    : 'Nenhum canal de recuperação configurado para este contato.';
  await getD1().prepare(`UPDATE ${table} SET recovery_error=? WHERE id=?`).bind(error.slice(0,500),candidate.id).run();
  return false;
}

export async function runRecoverySweep(limit = 4) {
  await ensureSchema();
  const firstDelay = minutes(env.RECOVERY_FIRST_DELAY_MINUTES,15);
  const secondDelay = minutes(env.RECOVERY_SECOND_DELAY_MINUTES,1440);
  const retryDelay = minutes(env.RECOVERY_RETRY_DELAY_MINUTES,30);
  const now = Date.now();
  const firstCutoff = new Date(now-firstDelay*60_000).toISOString();
  const secondCutoff = new Date(now-secondDelay*60_000).toISOString();
  const retryCutoff = new Date(now-retryDelay*60_000).toISOString();
  const contact = "(COALESCE(customer_whatsapp,'')<>'' OR COALESCE(customer_email,'')<>'')";
  const retry = '(recovery_last_attempt_at IS NULL OR recovery_last_attempt_at<=?)';
  const [ordersFirst,ordersSecond,leadsFirst,leadsSecond] = await Promise.all([
    getD1().prepare(`SELECT * FROM orders WHERE payment_status='pending' AND created_at<=? AND recovery_first_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(firstCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM orders WHERE payment_status='pending' AND recovery_first_sent_at<=? AND recovery_second_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(secondCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM abandoned_leads WHERE converted_order_id IS NULL AND updated_at<=? AND recovery_first_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(firstCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM abandoned_leads WHERE converted_order_id IS NULL AND recovery_first_sent_at<=? AND recovery_second_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(secondCutoff,retryCutoff,limit).all<Candidate>(),
  ]);
  let sent = 0;
  for (const item of ordersFirst.results) if (await processCandidate(item,'pix',1)) sent += 1;
  for (const item of leadsFirst.results) if (await processCandidate(item,'form',1)) sent += 1;
  for (const item of ordersSecond.results) if (await processCandidate(item,'pix',2)) sent += 1;
  for (const item of leadsSecond.results) if (await processCandidate(item,'form',2)) sent += 1;
  return {sent,examined:ordersFirst.results.length+ordersSecond.results.length+leadsFirst.results.length+leadsSecond.results.length};
}

export async function maybeRecoverPendingOrder(publicToken: string) {
  await ensureSchema();
  const delay = minutes(env.RECOVERY_FIRST_DELAY_MINUTES,15);
  const secondDelay = minutes(env.RECOVERY_SECOND_DELAY_MINUTES,1440);
  const retryDelay = minutes(env.RECOVERY_RETRY_DELAY_MINUTES,30);
  const candidate = await getD1().prepare(`SELECT * FROM orders WHERE public_token=? AND payment_status='pending' AND created_at<=? AND recovery_first_sent_at IS NULL AND (recovery_last_attempt_at IS NULL OR recovery_last_attempt_at<=?)`)
    .bind(publicToken,new Date(Date.now()-delay*60_000).toISOString(),new Date(Date.now()-retryDelay*60_000).toISOString()).first<Candidate>();
  if (candidate && (candidate.customer_whatsapp || candidate.customer_email)) await processCandidate(candidate,'pix',1);
  if (candidate) return;
  const second = await getD1().prepare(`SELECT * FROM orders WHERE public_token=? AND payment_status='pending' AND recovery_first_sent_at<=? AND recovery_second_sent_at IS NULL AND (recovery_last_attempt_at IS NULL OR recovery_last_attempt_at<=?)`)
    .bind(publicToken,new Date(Date.now()-secondDelay*60_000).toISOString(),new Date(Date.now()-retryDelay*60_000).toISOString()).first<Candidate>();
  if (second && (second.customer_whatsapp || second.customer_email)) await processCandidate(second,'pix',2);
}
