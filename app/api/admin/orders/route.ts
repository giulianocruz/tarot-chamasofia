import { isAdmin } from '@/lib/admin';
import { addEvent, ensureSchema, getCurrentPrice, getD1 } from '@/lib/database';
import { createReading } from '@/lib/reading';
import { cleanText, sameOrigin } from '@/lib/security';
import { drawThreeCards, type Category } from '@/lib/tarot';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  await ensureSchema();
  const [ordersResult, totals, today, events, pricing] = await Promise.all([
    getD1().prepare('SELECT id,order_number,customer_name,customer_email,customer_whatsapp,category,question,price,payment_status,reading_status,cards_json,created_at,paid_at,utm_source,utm_medium,utm_campaign FROM orders ORDER BY id DESC LIMIT 100').all(),
    getD1().prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) AS sales,SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN price ELSE 0 END) AS revenue,SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) AS generated FROM orders").first<Record<string,number>>(),
    getD1().prepare("SELECT COUNT(*) AS sales FROM orders WHERE (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) AND date(paid_at)=date('now')").first<{sales:number}>(),
    getD1().prepare("SELECT COUNT(*) AS views FROM analytics_events WHERE event_name='landing_view'").first<{views:number}>(),
    getCurrentPrice(),
  ]);
  const totalSales = Number(totals?.sales || 0); const revenue = Number(totals?.revenue || 0); const views = Number(events?.views || 0);
  return Response.json({ orders: ordersResult.results, dashboard: { salesToday:Number(today?.sales||0),totalSales,revenue,averageTicket:totalSales?Math.round(revenue/totalSales):0,pending:Number(totals?.pending||0),generated:Number(totals?.generated||0),conversion:views?totalSales/views:0,pricing } }, { headers: { 'Cache-Control':'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const orderNumber = cleanText(body.orderNumber, 40);
  const action = cleanText(body.action, 30);
  await ensureSchema();
  const order = await getD1().prepare('SELECT * FROM orders WHERE order_number=?').bind(orderNumber).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const now = new Date().toISOString();
  if (action === 'mark_paid' || action === 'regenerate') {
    if (action === 'mark_paid' && order.payment_status !== 'pending') return Response.json({ error: 'Transição inválida.' }, { status: 409 });
    const cards = drawThreeCards();
    const reading = createReading(String(order.question), String(order.category) as Category, cards);
    await getD1().prepare("UPDATE orders SET payment_status='paid',reading_status='reading_generated',cards_json=?,reading_json=?,paid_at=COALESCE(paid_at,?),generated_at=? WHERE id=?")
      .bind(JSON.stringify(cards.map(({id,name,number,symbol,keywords,general,constructive,alert}) => ({id,name,number,symbol,keywords,general,constructive,alert}))), JSON.stringify(reading), now, now, order.id).run();
    await addEvent('payment_confirmed', Number(order.id)); await addEvent('reading_completed', Number(order.id));
  } else if (action === 'deliver') {
    if (order.reading_status !== 'reading_generated') return Response.json({ error: 'Gere a leitura antes de entregar.' }, { status: 409 });
    await getD1().prepare("UPDATE orders SET reading_status='delivered',delivered_at=? WHERE id=?").bind(now, order.id).run();
  } else if (action === 'cancel') {
    await getD1().prepare("UPDATE orders SET payment_status='cancelled',reading_status='cancelled' WHERE id=?").bind(order.id).run();
  } else return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  return Response.json({ ok: true });
}
