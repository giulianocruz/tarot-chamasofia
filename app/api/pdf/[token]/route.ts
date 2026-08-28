import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { createReadingPdf } from '@/lib/pdf';
import type { Reading } from '@/lib/reading';
import { cleanText } from '@/lib/security';
import { getCards } from '@/lib/tarot';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  await ensureSchema();
  const order = await getD1().prepare('SELECT * FROM orders WHERE public_token=?').bind(token).first<Record<string, unknown>>();
  if (!order || !order.reading_json || !order.cards_json) return Response.json({ error: 'Leitura ainda não liberada.' }, { status: 403 });
  const cardData = JSON.parse(String(order.cards_json)) as Array<{id:string}>;
  const cards = getCards(cardData.map((card) => card.id));
  const bytes = createReadingPdf(order as never, cards, JSON.parse(String(order.reading_json)) as Reading);
  await addEvent('reading_pdf_download', Number(order.id));
  return new Response(bytes as BodyInit, { headers: { 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="leitura-tarot-chama-sofia-${order.order_number}.pdf"`, 'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow' } });
}
