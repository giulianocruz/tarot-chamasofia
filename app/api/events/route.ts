import { addEvent } from '@/lib/database';
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
]);
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string,unknown>;
  const event = cleanText(body.event, 60);
  if (!allowed.has(event)) return Response.json({ error: 'Evento inválido.' }, { status: 400 });
  const orderId = typeof body.orderId === 'number' && Number.isInteger(body.orderId) ? body.orderId : null;
  await addEvent(event, orderId, cleanText(body.anonymousId, 100), body.metadata);
  return Response.json({ ok: true });
}
