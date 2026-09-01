import { getCurrentPrice } from '@/lib/database';
import { consultationPrice } from '@/lib/pricing';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const offer = new URL(request.url).searchParams.get('offer');
  return Response.json(['consulta','astro-tarot'].includes(offer || '') ? consultationPrice() : await getCurrentPrice(), { headers: { 'Cache-Control': 'no-store' } });
}
