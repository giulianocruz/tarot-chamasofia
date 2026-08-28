import { ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';
import { maybeRecoverPendingOrder } from '@/lib/recovery';
import { getReferralSnapshot } from '@/lib/referrals';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  await ensureSchema();
  await maybeRecoverPendingOrder(token);
  const order = await getD1().prepare(`SELECT id,order_number,public_token,customer_name,category,question,price,pix_payload,payment_status,reading_status,cards_json,reading_json,created_at,paid_at,generated_at FROM orders WHERE public_token=?`).bind(token).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: 'Leitura não encontrada.' }, { status: 404 });
  const released = order.payment_status === 'paid' || order.reading_status === 'reading_generated' || order.reading_status === 'delivered';
  const referral = released ? await getReferralSnapshot(Number(order.id)) : null;
  return Response.json({
    id: order.id, orderNumber: order.order_number, customerName: order.customer_name, category: order.category,
    question: order.question, price: order.price, pixPayload: order.pix_payload, paymentStatus: order.payment_status,
    readingStatus: order.reading_status, createdAt: order.created_at, paidAt: order.paid_at, generatedAt: order.generated_at,
    cards: released && order.cards_json ? JSON.parse(String(order.cards_json)) : null,
    reading: released && order.reading_json ? JSON.parse(String(order.reading_json)) : null,
    referral,
  }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
