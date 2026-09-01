import { env } from 'cloudflare:workers';
import { getBook } from '@/lib/book-catalog';
import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; slug: string }> },
) {
  const { token: rawToken, slug: rawSlug } = await context.params;
  const token = cleanText(rawToken, 80);
  const slug = cleanText(rawSlug, 40);
  const book = getBook(slug);
  if (!book) return Response.json({ error: 'E-book não encontrado.' }, { status: 404 });

  await ensureSchema();
  const order = await getD1().prepare(
    'SELECT id,payment_status,reading_status,offer_code,product_slug,anonymous_id FROM orders WHERE public_token=?'
  ).bind(token).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const paid = order.payment_status === 'paid' || ['reading_generated','delivered'].includes(String(order.reading_status));
  if (!paid) return Response.json({ error: 'Disponível após a confirmação do pagamento.' }, { status: 403 });

  const ebookOrder = String(order.offer_code || '') === 'ebook';
  const allowed = ebookOrder ? String(order.product_slug || '') === book.slug : book.slug === 'tarot-iniciantes';  if (!allowed) return Response.json({ error: 'Este e-book não pertence a este pedido.' }, { status: 403 });

  const object = await env.BOOKS.get(book.r2Key);
  if (!object) return Response.json({ error: 'O e-book está sendo preparado. Tente novamente em instantes.' }, { status: 503 });
  await addEvent('ebook_download', Number(order.id), order.anonymous_id ? String(order.anonymous_id) : undefined, {
    product_slug: book.slug,
    offer: ebookOrder ? 'ebook' : 'consulta_bonus',
  });
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${book.slug}-sofia-labs.pdf"`,
      'Content-Length': String(object.size),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
