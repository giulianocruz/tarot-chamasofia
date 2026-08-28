import { getCurrentPrice } from '@/lib/database';
import { runRecoverySweep } from '@/lib/recovery';
export const dynamic = 'force-dynamic';
export async function GET() {
  await runRecoverySweep(2).catch(()=>undefined);
  return Response.json(await getCurrentPrice(), { headers: { 'Cache-Control': 'no-store' } });
}
