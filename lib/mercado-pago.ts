import { env } from "cloudflare:workers";
import { hmacHex, safeEqual } from "@/lib/security";

type MercadoPagoPayment = {
  id: number | string;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: { transaction_data?: { qr_code?: string } };
};

async function mercadoPagoRequest(path: string, init?: RequestInit) {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN)
    throw new Error("Mercado Pago não configurado.");
  return fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export async function createMercadoPagoPix(input: {
  orderNumber: string;
  amountCents: number;
  customerName: string;
  email: string;
}) {
  const names = input.customerName.trim().split(/\s+/);
  const response = await mercadoPagoRequest("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: "Leitura de Tarot Chama Sofia",
      payment_method_id: "pix",
      external_reference: input.orderNumber,
      notification_url: `${env.APP_URL || "https://tarot.chamasofia.com.br"}/api/webhooks/payment`,
      payer: {
        email: input.email,
        first_name: names.shift() || input.customerName,
        last_name: names.join(" ") || undefined,
      },
    }),
  });
  const payment = (await response.json()) as MercadoPagoPayment & {
    message?: string;
  };
  const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
  if (!response.ok || !payment.id || !qrCode) {
    throw new Error(
      payment.message || "Não foi possível gerar o Pix pelo Mercado Pago.",
    );
  }
  return { transactionId: String(payment.id), pixPayload: qrCode };
}

export async function getMercadoPagoPayment(id: string) {
  const response = await mercadoPagoRequest(
    `/v1/payments/${encodeURIComponent(id)}`,
  );
  if (!response.ok) return null;
  return (await response.json()) as MercadoPagoPayment;
}

export async function verifyMercadoPagoSignature(
  request: Request,
  paymentId: string,
) {
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) return false;
  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value];
    }),
  );
  if (!parts.ts || !parts.v1 || !requestId || !paymentId) return false;
  const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = await hmacHex(manifest, env.MERCADO_PAGO_WEBHOOK_SECRET);
  return safeEqual(parts.v1.toLowerCase(), expected);
}
