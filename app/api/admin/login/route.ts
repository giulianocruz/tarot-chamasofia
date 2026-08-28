import { adminConfig } from '@/lib/admin';
import { checkRateLimit } from '@/lib/database';
import { cleanText, sameOrigin, sha256, signSession } from '@/lib/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'local';
  if(!(await checkRateLimit(`admin:${await sha256(ip)}`,5,15*60*1000)))return Response.json({error:'Muitas tentativas. Aguarde 15 minutos.'},{status:429});
  const body = await request.json().catch(() => ({})) as Record<string,unknown>;
  const { email, password, secret } = adminConfig();
  if (!password || cleanText(body.email, 120).toLowerCase() !== email.toLowerCase() || String(body.password ?? '') !== password) return Response.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  const session = await signSession(email, secret);
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': `cs_admin=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`, 'Cache-Control': 'no-store' } });
}
