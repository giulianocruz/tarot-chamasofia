import { addEvent, checkRateLimit, ensureSchema, getD1 } from '@/lib/database';
import { normalizeBrazilPhone } from '@/lib/phone';
import { cleanText, randomToken, sameOrigin, sha256 } from '@/lib/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Origem inválida.'},{status:403});
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  if (!(await checkRateLimit(`lead:${await sha256(ip)}`,30,10*60*1000)))
    return Response.json({error:'Muitas tentativas.'},{status:429});

  const body = await request.json().catch(()=>({})) as Record<string,unknown>;
  const anonymousId = cleanText(body.anonymous_id || body.anonymousId,100);
  const sessionId = cleanText(body.session_id || body.sessionId,100);
  const email = cleanText(body.email,120).toLowerCase();
  const whatsapp = normalizeBrazilPhone(body.whatsapp);
  const category = cleanText(body.category,50);
  const question = cleanText(body.question,500);
  const isTest = body.is_test === true || body.is_test === 1 || body.is_test === '1';

  if (anonymousId.length < 8 || !email)
    return Response.json({error:'Contato insuficiente.'},{status:400});
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({error:'E-mail inválido.'},{status:400});

  await ensureSchema();
  const existing = await getD1().prepare('SELECT public_token FROM abandoned_leads WHERE anonymous_id=?')
    .bind(anonymousId).first<{public_token:string}>();
  const publicToken = existing?.public_token || randomToken(24);
  const now = new Date().toISOString();
  await getD1().prepare(`INSERT INTO abandoned_leads
    (public_token,anonymous_id,session_id,customer_name,customer_email,customer_whatsapp,category,question,stage,is_test,created_at,updated_at)
    VALUES (?,?,?,'Consulente',?,?,?,?,'contact_captured',?,?,?)
    ON CONFLICT(anonymous_id) DO UPDATE SET
      session_id=excluded.session_id,customer_email=excluded.customer_email,customer_whatsapp=excluded.customer_whatsapp,
      category=excluded.category,question=excluded.question,stage='contact_captured',is_test=excluded.is_test,updated_at=excluded.updated_at`)
    .bind(publicToken,anonymousId,sessionId||null,email,whatsapp||null,category||null,question||null,isTest?1:0,now,now).run();
  await addEvent('lead_saved',null,anonymousId,{session_id:sessionId||undefined,is_test:isTest,hasWhatsapp:Boolean(whatsapp),hasEmail:true});
  return Response.json({ok:true,publicToken});
}
