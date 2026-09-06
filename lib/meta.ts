import { env } from 'cloudflare:workers';
import { sha256 } from './security';

type MetaOrder = {
  order_number:string;
  price:number;
  customer_email?:string|null;
  customer_whatsapp?:string|null;
  created_at:string;
  locale?:string|null;
  currency?:string|null;
  fbclid?:string|null;
  is_test?:boolean|null;
};

export function metaFbcFromFbclid(fbclid?: string | null, createdAt?: string | null) {
  const clickId = String(fbclid || '').trim();
  if (!clickId) return '';
  const parsed = createdAt ? Date.parse(createdAt) : Number.NaN;
  const timestampMs = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : Date.now();
  return `fb.1.${timestampMs}.${clickId}`;
}

export async function sendMetaPurchase(order: MetaOrder) {
  if (order.is_test) return { attempted:false, ok:false, reason:'test_order' as const };
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { attempted:false, ok:false };
  const version = env.META_GRAPH_VERSION || 'v26.0';
  const userData: Record<string,string|string[]> = {};
  if (order.customer_email) userData.em = [await sha256(order.customer_email.trim().toLowerCase())];
  if (order.customer_whatsapp) userData.ph = [await sha256(order.customer_whatsapp.replace(/\D/g,''))];
  const fbc = metaFbcFromFbclid(order.fbclid, order.created_at);
  if (fbc) userData.fbc = fbc;
  const currency = order.currency || 'BRL';
  const sourcePath = String(order.locale || '').toLowerCase().startsWith('en') ? '/en' : '/consulta';
  const response = await fetch(`https://graph.facebook.com/${version}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ data:[{ event_name:'Purchase', event_time:Math.floor(Date.now()/1000), action_source:'website', event_id:`purchase-${order.order_number}`, event_source_url:`${env.APP_URL || 'https://tarot.chamasofia.com.br'}${sourcePath}`, user_data:userData, custom_data:{currency,value:order.price/100,order_id:order.order_number} }] }) });
  return { attempted:true, ok:response.ok, status:response.status };
}
