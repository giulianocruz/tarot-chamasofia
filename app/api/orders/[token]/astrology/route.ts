import { addEvent, checkRateLimit, ensureSchema, getD1 } from '@/lib/database';
import { createAstroTarotLayer, validateBirthInput } from '@/lib/astrology';
import type { BirthInput } from '@/lib/astrology-types';
import { cleanText, sameOrigin, sha256 } from '@/lib/security';
import { getCards, type Category } from '@/lib/tarot';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const { token: rawToken } = await context.params;
  const token = cleanText(rawToken, 80);
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  if (!(await checkRateLimit(`astro:${await sha256(`${ip}:${token}`)}`, 5, 15 * 60 * 1000))) {
    return Response.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const input: BirthInput = {
    birthDate: cleanText(body.birthDate, 10), birthTime: cleanText(body.birthTime, 5),
    birthPlace: cleanText(body.birthPlace, 140), timeKnown: body.timeKnown !== false,
  };
  try { validateBirthInput(input); } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Dados de nascimento inválidos.' }, { status: 400 });
  }
  await ensureSchema();
  const order = await getD1().prepare('SELECT * FROM orders WHERE public_token=?').bind(token).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const paid = ['paid','reading_generated','delivered'].includes(String(order.payment_status)) || ['reading_generated','delivered'].includes(String(order.reading_status));
  if (!paid) return Response.json({ error: 'O mapa é liberado após a confirmação do pagamento.' }, { status: 403 });
  if (String(order.offer_code || '') === 'ebook') return Response.json({ error: 'Este pedido é apenas de e-book.' }, { status: 409 });
  if (String(order.astrology_status || '') === 'generated' && order.astrology_json) {
    try { return Response.json({ ok: true, astrology: JSON.parse(String(order.astrology_json)), cached: true }, { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch { /* regenera apenas se o JSON salvo estiver inválido */ }
  }
  if (!order.cards_json) return Response.json({ error: 'As cartas deste pedido ainda não estão disponíveis.' }, { status: 409 });

  let cardIds: string[] = [];
  try {
    const raw = JSON.parse(String(order.cards_json));
    if (Array.isArray(raw)) cardIds = raw.map((item) => typeof item === 'string' ? item : String(item?.id || '')).filter(Boolean).slice(0,3);
  } catch { cardIds = []; }
  const cards = getCards(cardIds);
  if (cards.length !== 3) return Response.json({ error: 'Não foi possível recuperar as três cartas.' }, { status: 409 });
  try {
    const layer = await createAstroTarotLayer(input, String(order.question), String(order.category) as Category, cards, String(order.locale || 'pt-BR'));
    const now = new Date().toISOString();
    await getD1().prepare(`UPDATE orders SET birth_date=?,birth_time=?,birth_place=?,birth_time_known=?,astrology_status='generated',astrology_json=?,astrology_generated_at=? WHERE id=?`)
      .bind(input.birthDate, input.timeKnown ? input.birthTime : null, input.birthPlace, input.timeKnown ? 1 : 0, JSON.stringify(layer), now, order.id).run();
    await addEvent('astrology_generated', Number(order.id), order.anonymous_id ? String(order.anonymous_id) : null, { offer: String(order.offer_code || ''), time_known: input.timeKnown });
    return Response.json({ ok: true, astrology: layer }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível calcular seu mapa agora.';
    await getD1().prepare(`UPDATE orders SET astrology_status='failed' WHERE id=?`).bind(order.id).run();
    await addEvent('astrology_failed', Number(order.id), order.anonymous_id ? String(order.anonymous_id) : null, { message: message.slice(0,160) });
    return Response.json({ error: message }, { status: 502 });
  }
}
