import { addEvent,ensureSchema,getD1 } from '@/lib/database';
import { cleanText,sameOrigin } from '@/lib/security';
export async function POST(request:Request,context:{params:Promise<{token:string}>}){
  if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
  const token=cleanText((await context.params).token,80),body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const rating=Math.round(Number(body.rating)),comment=cleanText(body.comment,500),consent=body.publicConsent===true;
  if(rating<1||rating>5)return Response.json({error:'Escolha uma nota de 1 a 5.'},{status:400});
  await ensureSchema();
  const order=await getD1().prepare("SELECT id,customer_name,payment_status,reading_status FROM orders WHERE public_token=?").bind(token).first<Record<string,unknown>>();
  if(!order||!(order.payment_status==='paid'||['reading_generated','delivered'].includes(String(order.reading_status))))return Response.json({error:'Compra não confirmada.'},{status:403});
  const firstName=String(order.customer_name).trim().split(/\s+/)[0]||'Cliente',now=new Date().toISOString();
  await getD1().prepare(`INSERT INTO reviews (order_id,rating,comment,display_name,public_consent,moderation_status,featured,created_at,updated_at)
    VALUES (?,?,?,?,?,'pending',0,?,?) ON CONFLICT(order_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,public_consent=excluded.public_consent,moderation_status='pending',featured=0,updated_at=excluded.updated_at`)
    .bind(order.id,rating,comment||null,firstName,consent?1:0,now,now).run();
  await getD1().prepare("UPDATE orders SET journey_status='completed' WHERE id=?").bind(order.id).run();
  await addEvent('review_submitted',Number(order.id),null,{rating,publicConsent:consent});
  return Response.json({ok:true});
}
