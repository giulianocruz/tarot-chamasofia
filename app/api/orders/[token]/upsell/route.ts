import { env } from 'cloudflare:workers';
import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { createMercadoPagoPix } from '@/lib/mercado-pago';
import { getCommercialOffers } from '@/lib/offers';
import { createPixPayload } from '@/lib/pix';
import { cleanText, sameOrigin } from '@/lib/security';

export async function POST(request:Request,context:{params:Promise<{token:string}>}) {
  if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
  const token=cleanText((await context.params).token,80);
  await ensureSchema();
  const order=await getD1().prepare('SELECT * FROM orders WHERE public_token=?').bind(token).first<Record<string,unknown>>();
  if(!order||!(order.payment_status==='paid'||['reading_generated','delivered'].includes(String(order.reading_status))))return Response.json({error:'Compra principal não confirmada.'},{status:403});
  if(order.offer_code==='complete')return Response.json({error:'Sua biblioteca completa já está incluída.'},{status:409});
  if(order.upsell_status==='paid')return Response.json({ok:true,alreadyPaid:true},{status:200});
  const offers=await getCommercialOffers();
  if(!offers.upsell.available)return Response.json({error:'A biblioteca ampliada ainda está sendo preparada.'},{status:409});
  const reference=`UP-${String(order.order_number)}`;
  let pixPayload=env.PIX_KEY?createPixPayload(env.PIX_KEY,env.PIX_RECEIVER_NAME||'CHAMA SOFIA',env.PIX_RECEIVER_CITY||'SAO PAULO',offers.upsell.cents,reference):'';
  let transactionId:string|null=null;
  if(env.MERCADO_PAGO_ACCESS_TOKEN&&order.customer_email){
    const payment=await createMercadoPagoPix({orderNumber:reference,amountCents:offers.upsell.cents,customerName:String(order.customer_name),email:String(order.customer_email)});
    pixPayload=payment.pixPayload;transactionId=payment.transactionId;
  }
  if(!pixPayload)return Response.json({error:'Não foi possível gerar o Pix do complemento.'},{status:502});
  await getD1().prepare("UPDATE orders SET upsell_status='pending',upsell_price=?,upsell_pix_payload=?,upsell_gateway_transaction_id=?,journey_status='upsell_offered' WHERE id=?").bind(offers.upsell.cents,pixPayload,transactionId,order.id).run();
  await addEvent('upsell_accepted',Number(order.id),null,{price:offers.upsell.cents});
  return Response.json({ok:true,price:offers.upsell.cents,formatted:offers.upsell.formatted,pixPayload});
}
