import { ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: {params:Promise<{token:string}>}) {
  const {token:rawToken} = await context.params;
  const token = cleanText(rawToken,80);
  await ensureSchema();
  const lead = await getD1().prepare(`SELECT public_token,customer_name,customer_email,customer_whatsapp,category,question,stage,converted_order_id
    FROM abandoned_leads WHERE public_token=?`).bind(token).first<Record<string,unknown>>();
  if (!lead || lead.converted_order_id) return Response.json({error:'Jornada não encontrada.'},{status:404});
  return Response.json({
    name:lead.customer_name || '',email:lead.customer_email || '',whatsapp:lead.customer_whatsapp || '',
    category:lead.category || '',question:lead.question || '',stage:lead.stage,
  },{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
