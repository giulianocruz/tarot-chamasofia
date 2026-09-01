import { ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  await ensureSchema();
  const order = await getD1().prepare(`SELECT id,order_number,public_token,customer_name,category,question,price,pix_payload,payment_status,reading_status,cards_json,reading_json,created_at,paid_at,generated_at,offer_code,product_slug,delivery_channel,birth_date,birth_time,birth_place,birth_time_known,astrology_status,astrology_json,astrology_generated_at FROM orders WHERE public_token=?`).bind(token).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: 'Leitura não encontrada.' }, { status: 404 });
  const released = order.payment_status === 'paid' || order.reading_status === 'reading_generated' || order.reading_status === 'delivered';
  return Response.json({
    id: order.id, orderNumber: order.order_number, customerName: order.customer_name, category: order.category,
    question: order.question, price: order.price, pixPayload: order.pix_payload, paymentStatus: order.payment_status,
    readingStatus: order.reading_status, offerCode: order.offer_code, productSlug: order.product_slug, deliveryChannel: order.delivery_channel, astrologyStatus: order.astrology_status, astrologyGeneratedAt: order.astrology_generated_at, createdAt: order.created_at, paidAt: order.paid_at, generatedAt: order.generated_at,
    cards: released && order.cards_json ? JSON.parse(String(order.cards_json)) : null,
    reading: released && order.reading_json ? JSON.parse(String(order.reading_json)) : null,
    astrology: released && order.astrology_json ? JSON.parse(String(order.astrology_json)) : null,
    birth: released && order.birth_date ? { birthDate: order.birth_date, birthTime: order.birth_time, birthPlace: order.birth_place, timeKnown: Boolean(order.birth_time_known) } : null,
  }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
