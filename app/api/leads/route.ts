import { addEvent, checkRateLimit, ensureSchema, getD1 } from '@/lib/database';
import { cleanText, randomToken, sameOrigin, sha256 } from '@/lib/security';
import { isAdmin } from '@/lib/admin';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Origem inválida.'},{status:403});
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  if (!(await checkRateLimit(`lead:${await sha256(ip)}`,30,10*60*1000))) return Response.json({error:'Muitas tentativas.'},{status:429});
  const body = await request.json().catch(()=>({})) as Record<string,unknown>;
  const anonymousId = cleanText(body.anonymousId,100);
  const name = cleanText(body.name,80);
  const email = cleanText(body.email,120).toLowerCase();
  const whatsapp = cleanText(body.whatsapp,30);
  const category = cleanText(body.category,50);
  const question = cleanText(body.question,500);
  const sessionId = cleanText(body.sessionId,100);
  const isTest = body.isTest === true && await isAdmin(request);
  if (anonymousId.length < 8 || (!email && !whatsapp)) return Response.json({error:'Contato insuficiente.'},{status:400});
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:'E-mail inválido.'},{status:400});
  await ensureSchema();
  const existing = await getD1().prepare('SELECT public_token FROM abandoned_leads WHERE anonymous_id=?').bind(anonymousId).first<{public_token:string}>();
  const publicToken = existing?.public_token || randomToken(24);
  const now = new Date().toISOString();
  await getD1().prepare(`INSERT INTO abandoned_leads (public_token,anonymous_id,session_id,is_test,customer_name,customer_email,customer_whatsapp,category,question,stage,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'contact_started',?,?)
    ON CONFLICT(anonymous_id) DO UPDATE SET customer_name=excluded.customer_name,customer_email=excluded.customer_email,
      customer_whatsapp=excluded.customer_whatsapp,category=excluded.category,question=excluded.question,stage='contact_started',updated_at=excluded.updated_at,
      session_id=excluded.session_id,is_test=MAX(abandoned_leads.is_test,excluded.is_test)`)
    .bind(publicToken,anonymousId,sessionId||null,isTest?1:0,name||null,email||null,whatsapp||null,category||null,question||null,now,now).run();
  await addEvent('recovery_contact_saved',null,anonymousId,{hasWhatsapp:Boolean(whatsapp),hasEmail:Boolean(email)},{sessionId,isTest});
  return Response.json({ok:true,publicToken});
}
