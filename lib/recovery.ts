import { env } from 'cloudflare:workers';
import { addEvent, ensureSchema, getD1 } from './database';
import { sendLifecycleMessage } from './notifications';

type Candidate = {
  id:number;
  public_token:string;
  order_number?:string|null;
  customer_name?:string|null;
  customer_email?:string|null;
  customer_whatsapp?:string|null;
  anonymous_id?:string|null;
};

const delayMinutes = (value:string|undefined,fallback:number) => {
  const parsed=Number(value);
  return Number.isFinite(parsed)&&parsed>=1?parsed:fallback;
};

function message(kind:'form'|'pix',step:1|2,firstName:string,url:string) {
  if (step===2) return {
    subject:'Seu acesso continua disponível',
    message:`${firstName}, seu acesso continua disponível caso queira retomar com calma: ${url}`,
  };
  return kind==='pix'
    ? {subject:'Seu Pix ficou aguardando confirmação',message:`Olá, ${firstName}. Seu pedido ficou reservado. Se quiser concluir com segurança, o Pix e o acesso continuam aqui: ${url}`}
    : {subject:'Sua análise ficou pausada',message:`Olá, ${firstName}. Sua pergunta ficou salva. Se quiser continuar, retome sua escolha das cartas por aqui: ${url}`};
}

async function process(candidate:Candidate,kind:'form'|'pix',step:1|2) {
  const table=kind==='pix'?'orders':'abandoned_leads';
  const eligibility=kind==='pix'?"payment_status='pending'":"converted_order_id IS NULL";
  const now=new Date().toISOString();
  const claimed=await getD1().prepare(`UPDATE ${table} SET recovery_last_attempt_at=?,recovery_error=NULL WHERE id=? AND ${eligibility} AND COALESCE(is_test,0)=0`)
    .bind(now,candidate.id).run();
  if (!claimed.meta.changes) return false;

  const appUrl=(env.APP_URL||'https://tarot.chamasofia.com.br').replace(/\/$/,'');
  const url=kind==='pix'?`${appUrl}/leitura/${candidate.public_token}`:`${appUrl}/consulta?resume=${encodeURIComponent(candidate.public_token)}`;
  const firstName=(candidate.customer_name||'Olá').trim().split(/\s+/)[0]||'Olá';
  const copy=message(kind,step,firstName,url);
  const result=await sendLifecycleMessage({
    customerName:candidate.customer_name||firstName,
    customerEmail:candidate.customer_email,
    customerWhatsapp:candidate.customer_whatsapp,
    orderNumber:candidate.order_number,
    kind:`${kind}_recovery_${step}`,
    subject:copy.subject,
    message:copy.message,
    url,
  });

  if (result.ok) {
    const column=step===1?'recovery_first_sent_at':'recovery_second_sent_at';
    await getD1().prepare(`UPDATE ${table} SET ${column}=?,recovery_error=NULL WHERE id=?`).bind(now,candidate.id).run();
    await addEvent(`recovery_${kind}_${step}_sent`,kind==='pix'?candidate.id:null,candidate.anonymous_id||null,{channels:result.results.filter((item)=>item.ok).map((item)=>item.channel)});
    return true;
  }

  const error=result.attempted
    ? result.results.map((item)=>`${item.channel}:${item.error||'falhou'}`).join('; ')
    : 'Nenhum canal de recuperação configurado para este contato.';
  await getD1().prepare(`UPDATE ${table} SET recovery_error=? WHERE id=?`).bind(error.slice(0,500),candidate.id).run();
  return false;
}

export async function runRecoverySweep(limit=10) {
  await ensureSchema();
  const firstCutoff=new Date(Date.now()-delayMinutes(env.RECOVERY_FIRST_DELAY_MINUTES,15)*60_000).toISOString();
  const secondCutoff=new Date(Date.now()-delayMinutes(env.RECOVERY_SECOND_DELAY_MINUTES,1440)*60_000).toISOString();
  const retryCutoff=new Date(Date.now()-delayMinutes(env.RECOVERY_RETRY_DELAY_MINUTES,30)*60_000).toISOString();
  const contact="(COALESCE(customer_whatsapp,'')<>'' OR COALESCE(customer_email,'')<>'')";
  const retry='(recovery_last_attempt_at IS NULL OR recovery_last_attempt_at<=?)';
  const [ordersFirst,ordersSecond,leadsFirst,leadsSecond]=await Promise.all([
    getD1().prepare(`SELECT * FROM orders WHERE payment_status='pending' AND COALESCE(is_test,0)=0 AND created_at<=? AND recovery_first_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(firstCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM orders WHERE payment_status='pending' AND COALESCE(is_test,0)=0 AND recovery_first_sent_at<=? AND recovery_second_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(secondCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM abandoned_leads WHERE converted_order_id IS NULL AND COALESCE(is_test,0)=0 AND updated_at<=? AND recovery_first_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(firstCutoff,retryCutoff,limit).all<Candidate>(),
    getD1().prepare(`SELECT * FROM abandoned_leads WHERE converted_order_id IS NULL AND COALESCE(is_test,0)=0 AND recovery_first_sent_at<=? AND recovery_second_sent_at IS NULL AND ${retry} AND ${contact} ORDER BY id LIMIT ?`).bind(secondCutoff,retryCutoff,limit).all<Candidate>(),
  ]);

  let sent=0;
  for (const item of ordersFirst.results) if (await process(item,'pix',1)) sent+=1;
  for (const item of leadsFirst.results) if (await process(item,'form',1)) sent+=1;
  for (const item of ordersSecond.results) if (await process(item,'pix',2)) sent+=1;
  for (const item of leadsSecond.results) if (await process(item,'form',2)) sent+=1;
  return {sent,examined:ordersFirst.results.length+ordersSecond.results.length+leadsFirst.results.length+leadsSecond.results.length};
}
