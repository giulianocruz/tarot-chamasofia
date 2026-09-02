import { env } from 'cloudflare:workers';
import { BOOK_CATALOG } from '@/lib/book-catalog';

export const dynamic='force-dynamic';

export async function GET() {
  const availability=await Promise.all(BOOK_CATALOG.map(async (book)=>{
    try {
      const object=await env.BOOKS.head(book.r2Key);
      return {slug:book.slug,available:Boolean(object),size:object?.size??0};
    } catch {
      return {slug:book.slug,available:false,size:0};
    }
  }));
  return Response.json({books:availability},{headers:{'Cache-Control':'no-store'}});
}
