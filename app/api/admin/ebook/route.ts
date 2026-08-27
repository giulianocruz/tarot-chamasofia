import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin';

export async function PUT(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!request.body) return Response.json({ error: 'Arquivo ausente.' }, { status: 400 });
  await env.BOOKS.put('tarot-para-iniciantes.pdf', request.body, { httpMetadata: { contentType: 'application/pdf', contentDisposition: 'attachment; filename="tarot-para-iniciantes-sofia-labs.pdf"' }, customMetadata: { pages: '276', brand: 'SofIA Labs' } });
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const object = await env.BOOKS.head('tarot-para-iniciantes.pdf');
  return Response.json({ uploaded: Boolean(object), size: object?.size ?? 0 });
}
