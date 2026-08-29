import { addEvent, upsertVisitorSession } from '@/lib/database';
import { isAdmin } from '@/lib/admin';
import { cleanText, sameOrigin } from '@/lib/security';
const allowed = new Set([
  'landing_view','cta_click','tarot_started','question_completed','offer_view',
  'checkout_started','pix_generated','pix_copy_clicked','payment_confirmed',
  'reading_started','card_selected','reading_generated','reading_completed',
  'reading_pdf_download','ebook_download','purchase','upsell_viewed',
  'new_reading_click','scroll_depth_25','scroll_depth_50','scroll_depth_75','scroll_depth_90','faq_open','contact_click','page_exit',
  'form_step_view','form_abandon',
  'lead_saved','recovery_form_1_sent','recovery_form_2_sent','recovery_pix_1_sent','recovery_pix_2_sent','recovery_resumed',
  'thank_you_view','referral_share','referral_attributed','referral_qualified','upsell_clicked','ad_variant_copied',
  'question_started','offer_viewed','pdf_generated','ebook_accessed','recovery_contact_saved',
  'scroll_25','scroll_50','scroll_75','scroll_90','faq_opened','support_clicked','page_hidden','last_activity',
  'offer_selected','upsell_accepted','upsell_paid','upsell_declined','review_requested','review_submitted','journey_completed',
]);
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string,unknown>;
  const event = cleanText(body.event, 60);
  if (!allowed.has(event)) return Response.json({ error: 'Evento inválido.' }, { status: 400 });
  const orderId = typeof body.orderId === 'number' && Number.isInteger(body.orderId) ? body.orderId : null;
  const anonymousId = cleanText(body.anonymousId,100);
  const sessionId = cleanText(body.sessionId,100);
  const isTest = body.isTest === true && await isAdmin(request);
  if (anonymousId && sessionId) {
    const attribution = (body.attribution||{}) as Record<string,unknown>;
    await upsertVisitorSession({
      sessionId,anonymousId,isTest,
      landingVariant:cleanText(body.landingVariant,1)==='B'?'B':'A',
      deviceType:cleanText(body.deviceType,20)||'unknown',
      utmSource:cleanText(attribution.utm_source,100),utmMedium:cleanText(attribution.utm_medium,100),
      utmCampaign:cleanText(attribution.utm_campaign,150),utmContent:cleanText(attribution.utm_content,150),
      utmTerm:cleanText(attribution.utm_term,150),fbclid:cleanText(attribution.fbclid,255),
    });
  }
  await addEvent(event, orderId, anonymousId, body.metadata,{sessionId,isTest});
  return Response.json({ ok: true });
}
