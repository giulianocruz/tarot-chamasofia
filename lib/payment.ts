import { addEvent, ensureSchema, getD1 } from './database';
import { notifyReadingReady } from './notifications';
import { sendMetaPurchase } from './meta';
import { createReading } from './reading';
import { drawThreeCards, type Category } from './tarot';

export async function completePayment(orderNumber: string, transactionId?: string, gateway = 'manual', forceRegenerate = false) {
  await ensureSchema();
  const order = await getD1().prepare('SELECT * FROM orders WHERE order_number=?').bind(orderNumber).first<Record<string,unknown>>();
  if (!order) return { ok:false as const, status:404, error:'Pedido não encontrado.' };
  if (order.payment_status === 'cancelled') return { ok:false as const, status:409, error:'Pedido cancelado.' };
  if (!forceRegenerate && (order.reading_status === 'reading_generated' || order.reading_status === 'delivered')) return { ok:true as const, alreadyProcessed:true, token:String(order.public_token) };
  const cards = drawThreeCards();
  const reading = createReading(String(order.question), String(order.category) as Category, cards);
  const now = new Date().toISOString();
  await getD1().prepare("UPDATE orders SET payment_status='paid',reading_status='reading_generated',cards_json=?,reading_json=?,paid_at=COALESCE(paid_at,?),generated_at=?,gateway_name=?,gateway_transaction_id=COALESCE(?,gateway_transaction_id) WHERE id=?")
    .bind(JSON.stringify(cards.map(({id,name,number,symbol,image,keywords,general,constructive,alert})=>({id,name,number,symbol,image,keywords,general,constructive,alert}))),JSON.stringify(reading),now,now,gateway,transactionId||null,order.id).run();
  await addEvent('payment_confirmed',Number(order.id),null,{gateway,transactionId});
  await addEvent('reading_completed',Number(order.id));
  const fresh = { order_number:String(order.order_number), price:Number(order.price), customer_name:String(order.customer_name), customer_email:order.customer_email?String(order.customer_email):null, customer_whatsapp:order.customer_whatsapp?String(order.customer_whatsapp):null, public_token:String(order.public_token), created_at:String(order.created_at) };
  const [delivery,meta] = await Promise.all([notifyReadingReady(fresh),sendMetaPurchase(fresh)]);
  const notificationStatus = !delivery.attempted?'not_configured':delivery.ok?'sent':'failed';
  const notificationError = delivery.results.filter((item)=>!item.ok).map((item)=>`${item.channel}:${item.error}`).join('; ').slice(0,500) || null;
  await getD1().prepare('UPDATE orders SET notification_status=?,notification_error=? WHERE id=?').bind(notificationStatus,notificationError,order.id).run();
  return { ok:true as const, token:String(order.public_token), delivery, meta };
}
