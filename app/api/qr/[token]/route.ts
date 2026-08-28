import QRCode from 'qrcode';
import { ensureSchema, getD1 } from '@/lib/database';
import { cleanText } from '@/lib/security';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: raw } = await context.params;
  const token = cleanText(raw, 80);
  await ensureSchema();
  const order = await getD1().prepare('SELECT pix_payload FROM orders WHERE public_token=?').bind(token).first<{ pix_payload: string }>();
  if (!order?.pix_payload) return new Response('QR indisponível', { status: 404 });
  const svg = await QRCode.toString(order.pix_payload, { type:'svg', errorCorrectionLevel:'M', margin:2, width:320, color:{ dark:'#16091f', light:'#ffffff' } });
  return new Response(svg, { headers:{ 'Content-Type':'image/svg+xml; charset=utf-8', 'Cache-Control':'private, max-age=300', 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options':'nosniff' } });
}
