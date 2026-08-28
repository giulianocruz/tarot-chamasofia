import { env } from 'cloudflare:workers';
import { completePayment } from '@/lib/payment';
import { cleanText, hmacHex, safeEqual } from '@/lib/security';

export async function POST(request: Request) {
  if (!env.PAYMENT_WEBHOOK_SECRET) return Response.json({error:'Webhook não configurado.'},{status:503});
  const raw = await request.text();
  const received = (request.headers.get('x-webhook-signature') || '').replace(/^sha256=/,'').toLowerCase();
  const expected = await hmacHex(raw,env.PAYMENT_WEBHOOK_SECRET);
  if (!received || !safeEqual(received,expected)) return Response.json({error:'Assinatura inválida.'},{status:401});
  const body = JSON.parse(raw) as Record<string,unknown>;
  if (cleanText(body.status,30).toLowerCase() !== 'paid') return Response.json({ok:true,ignored:true});
  const result = await completePayment(cleanText(body.order_number,40),cleanText(body.transaction_id,120),cleanText(body.gateway,40)||env.PAYMENT_GATEWAY||'webhook');
  if (!result.ok) return Response.json({error:result.error},{status:result.status});
  return Response.json({ok:true,alreadyProcessed:'alreadyProcessed' in result&&result.alreadyProcessed});
}
