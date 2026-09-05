import { env } from "cloudflare:workers";

function stripeSecret() {
  return String((env as Record<string, unknown>).STRIPE_SECRET_KEY || "");
}

export function stripeConfigured() { return Boolean(stripeSecret()); }

export async function createStripeCheckout(input: { orderNumber: string; email: string; amountCents: number; successUrl: string; cancelUrl: string }) {
  const secret = stripeSecret();
  if (!secret) throw new Error("Stripe not configured");
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("client_reference_id", input.orderNumber);
  body.set("customer_email", input.email);
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  body.set("line_items[0][price_data][product_data][name]", "Chama Sofia — Birth Chart + Tarot Reading");
  body.set("metadata[order_number]", input.orderNumber);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) throw new Error(data.error?.message || "Unable to create Stripe checkout");
  return { id: data.id, url: data.url };
}

export async function getStripeCheckout(sessionId: string) {
  const secret = stripeSecret();
  if (!secret) throw new Error("Stripe not configured");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${secret}` } });
  const data = await response.json() as { id?: string; payment_status?: string; client_reference_id?: string; metadata?: Record<string,string>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Unable to read Stripe checkout");
  return data;
}
