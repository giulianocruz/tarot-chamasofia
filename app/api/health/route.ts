import { env } from 'cloudflare:workers';
import { ensureSchema, getD1 } from '@/lib/database';

export const dynamic='force-dynamic';

export async function GET() {
  const capabilities = {
    tarot78: true,
    spreads: 8,
    maxCards: 12,
    localAstrology: true,
    premiumAstrologyConfigured: Boolean(
      env.PROKERALA_ENABLED === '1' &&
      env.PROKERALA_CLIENT_ID &&
      env.PROKERALA_CLIENT_SECRET,
    ),
    paymentConfigured: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN || env.PIX_KEY),
  };

  try {
    await ensureSchema();
    await getD1().prepare('SELECT 1').first();
    const ebook = await env.BOOKS.head('tarot-para-iniciantes.pdf');
    return Response.json({
      ok:true,
      product:'chama-sofia-tarot',
      release:'premium-v2-20261007',
      database:'ok',
      ebook:ebook?'ok':'missing',
      capabilities,
      timestamp:new Date().toISOString(),
    },{
      headers:{
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff',
      },
    });
  } catch {
    return Response.json({
      ok:false,
      product:'chama-sofia-tarot',
      release:'premium-v2-20261007',
      database:'error',
      capabilities,
      timestamp:new Date().toISOString(),
    },{
      status:503,
      headers:{
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }
}
