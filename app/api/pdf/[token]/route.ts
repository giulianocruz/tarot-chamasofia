import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { createReadingPdf } from '@/lib/pdf';
import { createReadingPdfEn } from '@/lib/pdf-en';
import type { Reading } from '@/lib/reading';
import type { AstroTarotLayer } from '@/lib/astrology-types';
import { cleanText } from '@/lib/security';
import { getCards } from '@/lib/tarot';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  await ensureSchema();
  const order = await getD1().prepare('SELECT * FROM orders WHERE public_token=?').bind(token).first<Record<string, unknown>>();
  if (!order || !order.reading_json || !order.cards_json) return Response.json({ error: 'Leitura ainda não liberada.' }, { status: 403 });
  const cardData = JSON.parse(String(order.cards_json)) as Array<{id:string}>;
  const cards = getCards(cardData.map((card) => card.id));
  let logoBytes: Uint8Array | undefined;
  try {
    const logoResponse = await fetch(new URL('/assets/brand/chama-sofia-logo.png', request.url), { cache: 'force-cache' });
    if (logoResponse.ok) logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  } catch { logoBytes = undefined; }
  const astrology = order.astrology_json ? JSON.parse(String(order.astrology_json)) as AstroTarotLayer : null;
  const isEnglish = String(order.locale || '').toLowerCase().startsWith('en');
  const reading = JSON.parse(String(order.reading_json)) as Reading;
  const bytes = isEnglish
    ? await createReadingPdfEn(order as never, cards, reading, logoBytes, astrology)
    : await createReadingPdf(order as never, cards, reading, logoBytes, astrology);
  await addEvent('reading_pdf_download', Number(order.id), order.anonymous_id ? String(order.anonymous_id) : null, { locale:String(order.locale||'pt-BR'), currency:String(order.currency||'BRL'), market:isEnglish?'international':'brazil' });
  const filename = isEnglish ? `chama-sofia-astrotarot-${order.order_number}.pdf` : `analise-astrotarot-chama-sofia-${order.order_number}.pdf`;
  return new Response(bytes as BodyInit, { headers: { 'Content-Type':'application/pdf', 'Content-Disposition':`attachment; filename="${filename}"`, 'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow' } });
}
