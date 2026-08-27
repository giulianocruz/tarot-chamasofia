import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ metaPixelId: env.META_PIXEL_ID || '', whatsappNumber: env.WHATSAPP_NUMBER || '' }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
