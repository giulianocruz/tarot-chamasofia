import { adminConfig } from '@/lib/admin';
import { cleanText, sameOrigin, signSession } from '@/lib/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const { email, password, secret } = adminConfig();
  if (!password || cleanText(body.email, 120).toLowerCase() !== email.toLowerCase() || String(body.password ?? '') !== password) return Response.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  const session = await signSession(email, secret);
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': `cs_admin=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`, 'Cache-Control': 'no-store' } });
}
