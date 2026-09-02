import { addEvent } from "@/lib/database";
import { cleanText, sameOrigin } from "@/lib/security";
import {
  ATTRIBUTION_KEYS,
  analyticsMetadata,
  normalizeTestFlag,
  type AnalyticsContext,
} from "@/lib/analytics-context";

const allowed = new Set([
  "landing_view", "cta_click", "tarot_started", "question_completed", "offer_view",
  "checkout_started", "pix_generated", "pix_copy_clicked", "payment_confirmed",
  "reading_started", "card_selected", "reading_generated", "reading_completed",
  "reading_pdf_download", "ebook_download", "purchase", "upsell_viewed",
  "new_reading_click", "scroll_depth_25", "scroll_depth_50", "scroll_depth_75",
  "scroll_depth_90", "faq_open", "contact_click", "page_exit", "form_step_view",
  "form_abandon", "onboarding_started", "category_selected", "question_written",
  "cards_selected", "reading_preview", "offer_viewed", "onboarding_abandon",
  "contact_captured", "delivery_channel_selected", "astrology_profile_completed",
  "ebook_offer_viewed", "ebook_selected", "ebook_checkout_started", "library_view", "library_click",
  "lead_saved", "recovery_resumed", "recovery_form_1_sent", "recovery_form_2_sent",
  "recovery_pix_1_sent", "recovery_pix_2_sent",
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const event = cleanText(body.event, 60);
  if (!allowed.has(event)) {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  }
  const inputMetadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};
  const suppliedAnonymousId = cleanText(body.anonymous_id || body.anonymousId, 100);
  const suppliedSessionId = cleanText(
    body.session_id || inputMetadata.session_id || inputMetadata.sessionId,
    100,
  );
  const fallbackId = suppliedAnonymousId || suppliedSessionId || `event:${crypto.randomUUID()}`;
  const context: AnalyticsContext = {
    anonymous_id: suppliedAnonymousId || fallbackId,
    session_id: suppliedSessionId || fallbackId,
    is_test: normalizeTestFlag(body.is_test ?? inputMetadata.is_test),
  };
  for (const key of ATTRIBUTION_KEYS) {
    const value = cleanText(
      body[key] || inputMetadata[key],
      key === "fbclid" ? 255 : 150,
    );
    if (value) context[key] = value;
  }
  await addEvent(
    event,
    Number.isInteger(body.orderId) ? body.orderId : null,
    context.anonymous_id,
    analyticsMetadata(context, inputMetadata),
  );
  return Response.json({ ok: true });
}
