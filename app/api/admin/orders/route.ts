import { isAdmin } from '@/lib/admin';
import { addAdminAudit, ensureSchema, getCurrentPrice, getD1 } from '@/lib/database';
import { completePayment } from '@/lib/payment';
import { cleanText, sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  await ensureSchema();
  const [ordersResult, totals, today, events, pricing] = await Promise.all([
    getD1().prepare('SELECT id,order_number,customer_name,customer_email,customer_whatsapp,category,question,price,payment_status,reading_status,cards_json,created_at,paid_at,utm_source,utm_medium,utm_campaign,notification_status,notification_error,gateway_name FROM orders ORDER BY id DESC LIMIT 100').all(),
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
  if (action === 'mark_paid') {
    if (order.payment_status !== 'pending') return Response.json({ error: 'Transição inválida.' }, { status: 409 });
    const completed=await completePayment(orderNumber,undefined,'manual');
    if(!completed.ok)return Response.json({error:completed.error},{status:completed.status});
    await addAdminAudit('mark_paid',Number(order.id));
  } else if (action === 'regenerate') {
    const completed=await completePayment(orderNumber,undefined,'manual-regenerate',true);
    if(!completed.ok)return Response.json({error:completed.error},{status:completed.status});
    await addAdminAudit('regenerate',Number(order.id));
  } else if (action === 'deliver') {
    if (order.reading_status !== 'reading_generated') return Response.json({ error: 'Gere a leitura antes de entregar.' }, { status: 409 });
    await getD1().prepare("UPDATE orders SET reading_status='delivered',delivered_at=? WHERE id=?").bind(now, order.id).run();
    await addAdminAudit('deliver',Number(order.id));
  } else if (action === 'cancel') {
    await getD1().prepare("UPDATE orders SET payment_status='cancelled',reading_status='cancelled' WHERE id=?").bind(order.id).run();
    await addAdminAudit('cancel',Number(order.id));
  } else return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  return Response.json({ ok: true });
}
