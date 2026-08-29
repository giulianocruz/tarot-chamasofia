import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin';
import { ensureSchema, getD1 } from '@/lib/database';
import { runRecoverySweep } from '@/lib/recovery';
import { safeEqual } from '@/lib/security';
import { runOperationalGuardian } from '@/lib/guardian';

export async function POST(request: Request) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i,'') || '';
  const secretOk = Boolean(env.RECOVERY_CRON_SECRET && bearer && safeEqual(bearer,env.RECOVERY_CRON_SECRET));
  if (!secretOk && !(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});

  const [recovery,guardian]=await Promise.all([runRecoverySweep(10),runOperationalGuardian()]);
  await ensureSchema();
  const heartbeat=Math.floor(Date.now()/1000);
  await getD1().prepare(`INSERT INTO operation_settings (key,value_cents,updated_at)
    VALUES ('last_recovery_run_epoch',?,?,)
    ON CONFLICT(key) DO UPDATE SET value_cents=excluded.value_cents,updated_at=excluded.updated_at`)
    .bind(heartbeat,new Date().toISOString()).run();

  return Response.json({ok:true,...recovery,guardian,heartbeat});
}
