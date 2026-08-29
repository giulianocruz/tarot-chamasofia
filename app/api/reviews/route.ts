import { ensureSchema,getD1 } from '@/lib/database';
export const dynamic='force-dynamic';
export async function GET(){
  await ensureSchema();
  const result=await getD1().prepare(`SELECT r.rating,r.comment,r.display_name,r.created_at FROM reviews r JOIN orders o ON o.id=r.order_id
    WHERE r.public_consent=1 AND r.moderation_status='approved' AND o.is_test=0 AND r.comment IS NOT NULL AND length(r.comment)>0 ORDER BY r.featured DESC,r.created_at DESC LIMIT 6`).all();
  return Response.json({reviews:result.results},{headers:{'Cache-Control':'public, max-age=300'}});
}
