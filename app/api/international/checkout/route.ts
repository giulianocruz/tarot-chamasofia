import { env } from "cloudflare:workers";
import { addEvent, checkRateLimit, ensureSchema, getD1 } from "@/lib/database";
import { getCards } from "@/lib/tarot";
import { cleanText, randomToken, sameOrigin, sha256 } from "@/lib/security";
import { createStripeCheckout } from "@/lib/stripe";
import { internationalReadiness } from "@/lib/international-readiness";

const CATEGORY_MAP: Record<string, string> = {
  love: "Amor e relacionamentos",
  money: "Dinheiro",
  career: "Trabalho e carreira",
  decision: "Decisões",
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  if (!internationalReadiness().ready) return Response.json({ error: "International checkout is not active yet." }, { status: 503 });

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  if (!(await checkRateLimit(`intl:${await sha256(ip)}`, 6))) return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120).toLowerCase();
  const question = cleanText(body.question, 500);
  const categoryKey = cleanText(body.category, 20);
  const category = CATEGORY_MAP[categoryKey];
  const cardIds = Array.isArray(body.cardIds) ? body.cardIds.map((id: unknown) => cleanText(id, 40)).slice(0, 3) : [];
  const cards = cardIds.length === 3 && new Set(cardIds).size === 3 ? getCards(cardIds) : [];

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || question.length < 10 || !category || cards.length !== 3) {
    return Response.json({ error: "Please check your name, email, question and three selected cards." }, { status: 400 });
  }

  await ensureSchema();
  const orderNumber = `CSI${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${randomToken(5).slice(0, 7).toUpperCase()}`;
  const publicToken = randomToken(32);
  const now = new Date().toISOString();
  const priceCents = 199;
  const anonymousId = cleanText(body.anonymous_id || body.anonymousId, 100) || `order:${orderNumber}`;
  const sessionId = cleanText(body.session_id || body.sessionId, 100) || `order:${orderNumber}`;
  const attribution = {
    utm_source: cleanText(body.utm_source, 150), utm_medium: cleanText(body.utm_medium, 150),
    utm_campaign: cleanText(body.utm_campaign, 150), utm_content: cleanText(body.utm_content, 150),
    utm_term: cleanText(body.utm_term, 150), fbclid: cleanText(body.fbclid, 255),
  };

  const result = await getD1().prepare(`INSERT INTO orders
    (order_number,public_token,customer_name,customer_email,category,question,price,payment_status,reading_status,cards_json,created_at,
     utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,anonymous_id,session_id,is_test,offer_code,delivery_channel,locale,currency,gateway_name)
    VALUES (?,?,?,?,?,?,?,'pending','pending',?,?,?,?,?,?,?,?,?,?,?,0,'astro-tarot-en','email','en-US','USD','stripe')`)
    .bind(orderNumber, publicToken, name, email, category, question, priceCents, JSON.stringify(cards.map((card) => card.id)), now,
      attribution.utm_source || null, attribution.utm_medium || null, attribution.utm_campaign || null,
      attribution.utm_content || null, attribution.utm_term || null, attribution.fbclid || null, anonymousId, sessionId).run();

  const orderId = Number(result.meta.last_row_id);
  const appUrl = String((env as Record<string, unknown>).APP_URL || "https://tarot.chamasofia.com.br").replace(/\/$/, "");
  try {
    const checkout = await createStripeCheckout({
      orderNumber, email, amountCents: priceCents,
      successUrl: `${appUrl}/en/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/en?checkout=cancelled`,
    });
    await getD1().prepare("UPDATE orders SET gateway_transaction_id=? WHERE id=?").bind(checkout.id, orderId).run();
    await addEvent("checkout_started", orderId, anonymousId, {
      locale: "en-US", currency: "USD", market: "international", value: 1.99,
      session_id: sessionId, ...attribution,
    });
    return Response.json({ url: checkout.url, orderNumber }, { status: 201 });
  } catch (error) {
    await getD1().prepare("DELETE FROM orders WHERE id=? AND payment_status='pending'").bind(orderId).run();
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start checkout." }, { status: 502 });
  }
}
