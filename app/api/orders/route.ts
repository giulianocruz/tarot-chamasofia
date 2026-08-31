import { env } from "cloudflare:workers";
import { CATEGORIES, getCards, type Category } from "@/lib/tarot";
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
import {
  ATTRIBUTION_KEYS,
  analyticsMetadata,
  normalizeTestFlag,
  type AnalyticsContext,
} from "@/lib/analytics-context";
import { consultationPrice } from "@/lib/pricing";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  }
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "local";
  if (!(await checkRateLimit(`order:${await sha256(ip)}`))) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const whatsapp = cleanText(body.whatsapp, 30);
  const category = cleanText(body.category, 50) as Category;
  const question = cleanText(body.question, 500);
  const cardIds = Array.isArray(body.cardIds)
    ? body.cardIds.map((id: unknown) => cleanText(id, 40)).slice(0, 3)
    : [];
  const selectedCards =
    cardIds.length === 3 && new Set(cardIds).size === 3 ? getCards(cardIds) : [];
  const offer = cleanText(body.offer || body.offerCode, 40);
  const isConsultaOffer = ["consulta", "consulta-990"].includes(offer) && selectedCards.length === 3;

  if (
    name.length < 2 ||
    question.length < 10 ||
    !CATEGORIES.includes(category) ||
    (!email && !whatsapp) ||
    (cardIds.length > 0 && selectedCards.length !== 3) ||
    (["consulta", "consulta-990"].includes(offer) && !isConsultaOffer)
  ) {
    return Response.json(
      { error: "Confira contato, tema, pergunta e cartas." },
      { status: 400 },
    );
  }
  if (env.MERCADO_PAGO_ACCESS_TOKEN && !email) {
    return Response.json(
      { error: "Informe seu e-mail para gerar o Pix seguro." },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const price = isConsultaOffer ? consultationPrice() : await getCurrentPrice();
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
  const fallbackId = `order:${orderNumber}`;
  const anonymousId = cleanText(body.anonymous_id || body.anonymousId, 100) || fallbackId;
  const sessionId = cleanText(body.session_id || body.sessionId, 100) || fallbackId;
  const attribution = Object.fromEntries(
    ATTRIBUTION_KEYS.map((key) => [
      key,
      cleanText(body[key], key === "fbclid" ? 255 : 150),
    ]),
  ) as Record<(typeof ATTRIBUTION_KEYS)[number], string>;
  const isTest = normalizeTestFlag(body.is_test);
  const analyticsContext: AnalyticsContext = {
    anonymous_id: anonymousId,
    session_id: sessionId,
    is_test: isTest,
  };
  for (const key of ATTRIBUTION_KEYS) {
    if (attribution[key]) analyticsContext[key] = attribution[key];
  }

  await ensureSchema();
  const result = await getD1()
    .prepare(
      `INSERT INTO orders (order_number,public_token,customer_name,customer_email,customer_whatsapp,category,question,price,pix_payload,payment_status,reading_status,created_at,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,anonymous_id,session_id,is_test) VALUES (?,?,?,?,?,?,?,?,?,'pending','pending',?,?,?,?,?,?,?,?,?,?)`,
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
      attribution.utm_source || null,
      attribution.utm_medium || null,
      attribution.utm_campaign || null,
      attribution.utm_content || null,
      attribution.utm_term || null,
      attribution.fbclid || null,
      anonymousId || null,
      sessionId || null,
      isTest ? 1 : 0,
    )
    .run();

  if (selectedCards.length === 3) {
    await getD1()
      .prepare("UPDATE orders SET cards_json=? WHERE id=?")
      .bind(JSON.stringify(cardIds), result.meta.last_row_id)
      .run();
  }

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
      if (!pixPayload) {
        return Response.json(
          { error: "Não foi possível gerar o Pix. Tente novamente em instantes." },
          { status: 502 },
        );
      }
    }
  }

  await addEvent(
    "pix_generated",
    Number(result.meta.last_row_id),
    anonymousId,
    analyticsMetadata(analyticsContext, { price: price.cents }),
  );
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
