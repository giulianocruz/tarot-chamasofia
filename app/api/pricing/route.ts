import { getCurrentPrice } from '@/lib/database';
import { consultationPrice } from '@/lib/pricing';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const offer = new URL(request.url).searchParams.get('offer');
  return Response.json(offer === 'consulta' ? consultationPrice() : await getCurrentPrice(), { headers: { 'Cache-Control': 'no-store' } });
}
