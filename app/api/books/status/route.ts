import { env } from 'cloudflare:workers';
import { BOOK_CATALOG } from '@/lib/book-catalog';

export const dynamic='force-dynamic';

export async function GET() {
  const availability=await Promise.all(BOOK_CATALOG.map(async (book)=>({
    slug:book.slug,
    available:Boolean(await env.BOOKS.head(book.r2Key)),
  })));
  return Response.json({books:availability},{headers:{'Cache-Control':'no-store'}});
}
