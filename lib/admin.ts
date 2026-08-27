import { env } from 'cloudflare:workers';
import { getCookie, verifySession } from './security';

export function adminConfig() {
  return {
    email: env.ADMIN_EMAIL || 'admin@chamasofia.com.br',
    password: env.ADMIN_PASSWORD || '',
    secret: env.ADMIN_SESSION_SECRET || env.ADMIN_PASSWORD || 'configure-admin-session-secret',
  };
}

export async function isAdmin(request: Request) {
  const config = adminConfig();
  const session = getCookie(request, 'cs_admin');
  if (await verifySession(session, config.secret)) return true;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Basic ') && config.password) {
    try {
      const [email, password] = atob(auth.slice(6)).split(':');
      return email === config.email && password === config.password;
    } catch { return false; }
  }
  return false;
}
