import { completePayment } from "@/lib/payment";
import { getStripeCheckout, stripeConfigured } from "@/lib/stripe";
import { cleanText } from "@/lib/security";

export async function GET(request: Request) {
  if (!stripeConfigured()) return Response.json({ error: "International checkout is not active yet." }, { status: 503 });
  const sessionId = cleanText(new URL(request.url).searchParams.get("session_id"), 180);
  if (!sessionId.startsWith("cs_")) return Response.json({ error: "Invalid checkout session." }, { status: 400 });

  try {
    const session = await getStripeCheckout(sessionId);
    const orderNumber = session.metadata?.order_number || session.client_reference_id || "";
    if (!orderNumber) return Response.json({ error: "Order reference not found." }, { status: 409 });
    if (session.payment_status !== "paid") return Response.json({ paid: false, orderNumber });
    const result = await completePayment(orderNumber, sessionId, "stripe");
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ paid: true, orderNumber, token: result.token });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to verify checkout." }, { status: 502 });
  }
}
