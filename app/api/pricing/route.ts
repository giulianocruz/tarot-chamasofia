import { getCurrentPrice } from '@/lib/database';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json(await getCurrentPrice(), { headers: { 'Cache-Control': 'no-store' } });
}
