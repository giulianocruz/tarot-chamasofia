import { completePayment } from "@/lib/payment";
import { stripeWebhookConfigured, verifyStripeWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: { id?: string; payment_status?: string; client_reference_id?: string; metadata?: Record<string,string> } };
};

export async function POST(request: Request) {
  if (!stripeWebhookConfigured()) return Response.json({ error: "Stripe webhook not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature") || "";
  const payload = await request.text();
  if (!(await verifyStripeWebhook(payload, signature))) return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  let event: StripeEvent;
  try { event = JSON.parse(payload) as StripeEvent; }
  catch { return Response.json({ error: "Invalid payload." }, { status: 400 }); }
  if (!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(String(event.type || ""))) return Response.json({ received: true });
  const session = event.data?.object;
  if (!session || session.payment_status !== "paid") return Response.json({ received: true, paid: false });
  const orderNumber = session.metadata?.order_number || session.client_reference_id || "";
  if (!orderNumber) return Response.json({ error: "Order reference not found." }, { status: 409 });
  const result = await completePayment(orderNumber, session.id, "stripe");
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ received: true, paid: true, orderNumber });
}
