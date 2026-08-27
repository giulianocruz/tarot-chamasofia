import { addEvent } from '@/lib/database';
import { cleanText, sameOrigin } from '@/lib/security';
const allowed = new Set(['landing_view','start_question','question_completed','checkout_started','pix_generated','pix_copied','payment_confirmed','reading_started','card_revealed','reading_completed','pdf_download','ebook_claim','new_reading_click']);
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const event = cleanText(body.event, 60);
  if (!allowed.has(event)) return Response.json({ error: 'Evento inválido.' }, { status: 400 });
  await addEvent(event, Number.isInteger(body.orderId) ? body.orderId : null, cleanText(body.anonymousId, 100), body.metadata);
  return Response.json({ ok: true });
}
