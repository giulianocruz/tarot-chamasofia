import { env } from "cloudflare:workers";
import { CATEGORIES, type Category } from "@/lib/tarot";
import {
  addEvent,
  checkRateLimit,
  ensureSchema,
  getCurrentPrice,
  getD1,
} from "@/lib/database";
import { createPixPayload } from "@/lib/pix";
import { createMercadoPagoPix } from "@/lib/mercado-pago";
import { cleanText, randomToken, sameOrigin, sha256 } from "@/lib/security";
import { registerReferral } from '@/lib/referrals';

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "local";
  if (!(await checkRateLimit(`order:${await sha256(ip)}`)))
    return Response.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    );
  const body = await request.json().catch(() => ({})) as Record<string,unknown>;
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const whatsapp = cleanText(body.whatsapp, 30);
  const category = cleanText(body.category, 50) as Category;
  const question = cleanText(body.question, 500);
  if (
    name.length < 2 ||
    question.length < 10 ||
    !CATEGORIES.includes(category) ||
    (!email && !whatsapp)
  )
    return Response.json(
      { error: "Confira nome, contato, tema e pergunta." },
      { status: 400 },
    );
  if (env.MERCADO_PAGO_ACCESS_TOKEN && !email)
    return Response.json(
      { error: "Informe seu e-mail para gerar o Pix seguro." },
      { status: 400 },
    );
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json(
      { error: "Informe um e-mail válido." },
      { status: 400 },
    );
  const price = await getCurrentPrice();
  const orderNumber = `CS${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${randomToken(5).slice(0, 7).toUpperCase()}`;
  const publicToken = randomToken(32);
  let pixPayload = env.PIX_KEY
    ? createPixPayload(
        env.PIX_KEY,
        env.PIX_RECEIVER_NAME || "CHAMA SOFIA",
        env.PIX_RECEIVER_CITY || "SAO PAULO",
        price.cents,
        orderNumber,
      )
    : "";
  await ensureSchema();
  const result = await getD1()
    .prepare(
      `INSERT INTO orders (order_number,public_token,customer_name,customer_email,customer_whatsapp,category,question,price,pix_payload,payment_status,reading_status,created_at,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid) VALUES (?,?,?,?,?,?,?,?,?,'pending','pending',?,?,?,?,?,?,?)`,
    )
    .bind(
      orderNumber,
      publicToken,
      name,
      email || null,
      whatsapp || null,
      category,
      question,
      price.cents,
      pixPayload,
      new Date().toISOString(),
      cleanText(body.utm_source, 100) || null,
      cleanText(body.utm_medium, 100) || null,
      cleanText(body.utm_campaign, 150) || null,
      cleanText(body.utm_content, 150) || null,
      cleanText(body.utm_term, 150) || null,
      cleanText(body.fbclid, 255) || null,
    )
    .run();
  if (env.MERCADO_PAGO_ACCESS_TOKEN && email) {
    try {
      const payment = await createMercadoPagoPix({
        orderNumber,
        amountCents: price.cents,
        customerName: name,
        email,
      });
      pixPayload = payment.pixPayload;
      await getD1()
        .prepare(
          "UPDATE orders SET pix_payload=?,gateway_name=?,gateway_transaction_id=? WHERE id=?",
        )
        .bind(
          pixPayload,
          "mercado_pago",
          payment.transactionId,
          result.meta.last_row_id,
        )
        .run();
    } catch {
      if (!pixPayload)
        return Response.json(
          {
            error:
              "Não foi possível gerar o Pix. Tente novamente em instantes.",
          },
          { status: 502 },
        );
    }
  }
  await addEvent(
    "checkout_started",
    Number(result.meta.last_row_id),
    cleanText(body.anonymousId, 100),
    { price: price.cents },
  );
  await addEvent(
    "pix_generated",
    Number(result.meta.last_row_id),
    cleanText(body.anonymousId, 100),
  );
  const orderId = Number(result.meta.last_row_id);
  const leadToken = cleanText(body.leadToken,80);
  const anonymousId = cleanText(body.anonymousId,100);
  if (leadToken || anonymousId) {
    await getD1().prepare(`UPDATE abandoned_leads SET converted_order_id=?,stage='pix_generated',updated_at=?
      WHERE converted_order_id IS NULL AND (public_token=? OR anonymous_id=?)`)
      .bind(orderId,new Date().toISOString(),leadToken||'',anonymousId||'').run();
  }
  await registerReferral(orderId,body.referralCode);
  return Response.json(
    {
      orderNumber,
      publicToken,
      price,
      pixPayload,
      url: `/leitura/${publicToken}`,
    },
    { status: 201 },
  );
}
