import { env } from 'cloudflare:workers';
import { ensureSchema, getD1 } from '@/lib/database';

export const dynamic='force-dynamic';
export async function GET() {
  try {
    await ensureSchema();
    await getD1().prepare('SELECT 1').first();
    const ebook = await env.BOOKS.head('tarot-para-iniciantes.pdf');
    return Response.json({ok:true,database:'ok',ebook:ebook?'ok':'missing',timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({ok:false,database:'error',timestamp:new Date().toISOString()},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
