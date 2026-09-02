import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin';
import { getBook } from '@/lib/book-catalog';

function resolveBook(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('book') || 'tarot-iniciantes';
  return getBook(slug);
}

function tokenAuthorized(request: Request) {
  const token = request.headers.get('x-library-upload-token') || request.headers.get('x-upload-token');
  return Boolean(env.EBOOK_UPLOAD_SECRET && token === env.EBOOK_UPLOAD_SECRET);
}

export async function PUT(request: Request) {
  if (!tokenAuthorized(request) && !(await isAdmin(request)))
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const book = resolveBook(request);
  if (!book) return Response.json({ error: 'E-book inválido.' }, { status: 404 });
  if (!request.body) return Response.json({ error: 'Arquivo ausente.' }, { status: 400 });
  if (request.headers.get('content-type') !== 'application/pdf')
    return Response.json({ error: 'Envie um arquivo PDF.' }, { status: 415 });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength && contentLength > 95 * 1024 * 1024)
    return Response.json({ error: 'O arquivo excede 95 MB.' }, { status: 413 });
  await env.BOOKS.put(book.r2Key, request.body, {
    httpMetadata: {
      contentType: 'application/pdf',
      contentDisposition: `attachment; filename="${book.slug}-sofia-labs.pdf"`,
    },
    customMetadata: { brand: 'SofIA Labs', title: book.title, slug: book.slug },
  });
  return Response.json({ ok: true, book: book.slug });
}

export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const book = resolveBook(request);
  if (!book) return Response.json({ error: 'E-book inválido.' }, { status: 404 });
  const object = await env.BOOKS.head(book.r2Key);
  return Response.json({
    book: book.slug,
    uploaded: Boolean(object),
    size: object?.size ?? 0,
    title: book.title,
  });
}
