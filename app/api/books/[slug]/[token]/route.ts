import { env } from 'cloudflare:workers';
import { addEvent, ensureSchema, getD1 } from '@/lib/database';
import { LIBRARY_BOOKS } from '@/lib/offers';
import { cleanText } from '@/lib/security';

export async function GET(_request:Request,context:{params:Promise<{slug:string;token:string}>}) {
  const params=await context.params;
  const slug=cleanText(params.slug,60),token=cleanText(params.token,80);
  const book=LIBRARY_BOOKS.find(item=>item.slug===slug);
  if(!book)return Response.json({error:'Livro não encontrado.'},{status:404});
  await ensureSchema();
  const order=await getD1().prepare('SELECT id,payment_status,reading_status,included_books_json,upsell_status FROM orders WHERE public_token=?').bind(token).first<Record<string,unknown>>();
  const paid=order&&(order.payment_status==='paid'||['reading_generated','delivered'].includes(String(order.reading_status)));
  const included=order?.included_books_json?JSON.parse(String(order.included_books_json)) as string[]:['tarot-para-iniciantes'];
  const entitled=paid&&(included.includes(slug)||(order?.upsell_status==='paid'&&['pomba-gira','preto-velho'].includes(slug)));
  if(!entitled)return Response.json({error:'Este livro não faz parte da sua compra.'},{status:403});
  const object=await env.BOOKS.get(book.objectKey);
  if(!object)return Response.json({error:'Este livro ainda está sendo preparado.'},{status:503});
  await addEvent('ebook_accessed',Number(order!.id),null,{book:slug});
  return new Response(object.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${slug}.pdf"`,'Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
