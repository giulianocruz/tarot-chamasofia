import { isAdmin } from '@/lib/admin';
import { addAdminAudit,ensureSchema,getD1 } from '@/lib/database';
import { cleanText,sameOrigin } from '@/lib/security';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  if(!(await isAdmin(request)))return Response.json({error:'Não autorizado.'},{status:401});
  await ensureSchema();const rows=await getD1().prepare(`SELECT r.*,o.order_number,o.is_test FROM reviews r JOIN orders o ON o.id=r.order_id ORDER BY r.id DESC LIMIT 100`).all();return Response.json({reviews:rows.results},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
  if(!sameOrigin(request)||!(await isAdmin(request)))return Response.json({error:'Não autorizado.'},{status:401});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>,id=Math.round(Number(body.id)),action=cleanText(body.action,20);
  if(!id||!['approve','hide','delete','feature'].includes(action))return Response.json({error:'Ação inválida.'},{status:400});
  await ensureSchema();
  if(action==='delete')await getD1().prepare('DELETE FROM reviews WHERE id=?').bind(id).run();
  else if(action==='approve')await getD1().prepare("UPDATE reviews SET moderation_status='approved',updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
  else if(action==='hide')await getD1().prepare("UPDATE reviews SET moderation_status='hidden',featured=0,updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
  else await getD1().prepare("UPDATE reviews SET featured=CASE WHEN featured=1 THEN 0 ELSE 1 END,moderation_status='approved',updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
  await addAdminAudit(`review_${action}`,null,{reviewId:id});return Response.json({ok:true});
}
