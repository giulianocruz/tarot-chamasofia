import { env } from 'cloudflare:workers';
import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  await ensureSchema();
  const order = await getD1().prepare("SELECT id,payment_status,reading_status FROM orders WHERE public_token=?").bind(token).first<{id:number;payment_status:string;reading_status:string}>();
  if (!order || (order.payment_status !== 'paid' && !['reading_generated','delivered'].includes(order.reading_status))) return Response.json({ error: 'Bônus disponível somente após a confirmação do pagamento.' }, { status: 403 });
  const object = await env.BOOKS.get('tarot-para-iniciantes.pdf');
  if (!object) return Response.json({ error: 'O e-book está sendo preparado. Tente novamente em instantes.' }, { status: 503 });
  await addEvent('ebook_download', order.id);
  return new Response(object.body, { headers: { 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="${env.EBOOK_DOWNLOAD_NAME || 'tarot-para-iniciantes-sofia-labs.pdf'}"`, 'Content-Length':String(object.size), 'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow' } });
}
