import { env } from 'cloudflare:workers';
import { ensureSchema, getD1 } from '@/lib/database';

export const dynamic='force-dynamic';
export async function GET() {
  try {
    await ensureSchema();
    await getD1().prepare('SELECT 1').first();

    const [tarot,pombaGira,pretoVelho,heartbeatRow]=await Promise.all([
      env.BOOKS.head('tarot-para-iniciantes.pdf'),
      env.BOOKS.head('pomba-gira.pdf'),
      env.BOOKS.head('preto-velho.pdf'),
      getD1().prepare("SELECT value_cents,updated_at FROM operation_settings WHERE key='last_recovery_run_epoch'").first<{value_cents:number;updated_at:string}>(),
    ]);

    const nowEpoch=Math.floor(Date.now()/1000);
    const heartbeat=Number(heartbeatRow?.value_cents||0);
    const schedulerAgeSeconds=heartbeat ? Math.max(0,nowEpoch-heartbeat) : null;
    const schedulerStatus=!heartbeat?'never':schedulerAgeSeconds!==null&&schedulerAgeSeconds<=15*60?'ok':'stale';
    const books={
      tarot:tarot?'ok':'missing',
      pombaGira:pombaGira?'ok':'missing',
      pretoVelho:pretoVelho?'ok':'missing',
    };

    return Response.json({
      ok:true,
      database:'ok',
      ebook:tarot?'ok':'missing',
      books,
      scheduler:{
        status:schedulerStatus,
        lastRunAt:heartbeat?new Date(heartbeat*1000).toISOString():null,
        ageSeconds:schedulerAgeSeconds,
        expectedIntervalSeconds:300,
        healthyWithinSeconds:900,
      },
      timestamp:new Date().toISOString(),
    },{headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({ok:false,database:'error',timestamp:new Date().toISOString()},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
