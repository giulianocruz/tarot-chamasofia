import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin';
import { runRecoverySweep } from '@/lib/recovery';
import { safeEqual } from '@/lib/security';

export async function POST(request: Request) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || '';
  const secretOk = Boolean(env.RECOVERY_CRON_SECRET && bearer && safeEqual(bearer,env.RECOVERY_CRON_SECRET));
  if (!secretOk && !(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});
  return Response.json({ok:true,...await runRecoverySweep(10)});
}
