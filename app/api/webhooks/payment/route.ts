import { env } from "cloudflare:workers";
import { addEvent, ensureSchema, getD1 } from "@/lib/database";
import {
  getMercadoPagoPayment,
  verifyMercadoPagoSignature,
} from "@/lib/mercado-pago";
import { completePayment } from "@/lib/payment";
import { cleanText } from "@/lib/security";

export async function POST(request: Request) {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN || !env.MERCADO_PAGO_WEBHOOK_SECRET) {
    return Response.json(
      { error: "Mercado Pago não configurado." },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const data = (body.data || {}) as Record<string, unknown>;
  const url = new URL(request.url);
  const paymentId = cleanText(
    data.id || url.searchParams.get("data.id") || url.searchParams.get("id"),
    120,
  );
  if (!(await verifyMercadoPagoSignature(request, paymentId))) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }
  if (body.type !== "payment")
    return Response.json({ ok: true, ignored: true });
  if (body.live_mode === false && paymentId === "123456") {
    return Response.json({ ok: true, simulation: true });
  }
  const payment = await getMercadoPagoPayment(paymentId);
  if (
    !payment ||
    payment.status !== "approved" ||
    !payment.external_reference
  ) {
    return Response.json({ ok: true, ignored: true });
  }
  await ensureSchema();
  if(payment.external_reference.startsWith('UP-')) {
    const orderNumber=payment.external_reference.slice(3);
    const upsell=await getD1().prepare('SELECT id,upsell_price,upsell_status,is_test FROM orders WHERE order_number=?').bind(orderNumber).first<{id:number;upsell_price:number;upsell_status:string;is_test:number}>();
    if(!upsell||Math.round(Number(payment.transaction_amount||0)*100)!==Number(upsell.upsell_price))return Response.json({error:'Pagamento complementar não corresponde ao pedido.'},{status:409});
    if(upsell.upsell_status!=='paid'){
      await getD1().prepare("UPDATE orders SET upsell_status='paid',journey_status='completed' WHERE id=?").bind(upsell.id).run();
      await addEvent('upsell_paid',upsell.id,null,{price:upsell.upsell_price});
    }
    return Response.json({ok:true,upsell:true,alreadyProcessed:upsell.upsell_status==='paid'});
  }
  const order = await getD1()
    .prepare("SELECT order_number,price FROM orders WHERE order_number=?")
    .bind(payment.external_reference)
    .first<{ order_number: string; price: number }>();
  if (
    !order ||
    Math.round(Number(payment.transaction_amount || 0) * 100) !==
      Number(order.price)
  ) {
    return Response.json(
      { error: "Pagamento não corresponde ao pedido." },
      { status: 409 },
    );
  }
  const result = await completePayment(
    order.order_number,
    paymentId,
    "mercado_pago",
  );
  if (!result.ok)
    return Response.json({ error: result.error }, { status: result.status });
  return Response.json({
    ok: true,
    alreadyProcessed: "alreadyProcessed" in result && result.alreadyProcessed,
  });
}
