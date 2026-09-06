import { env } from 'cloudflare:workers';
import { normalizeTestFlag } from './analytics-context';
import { sha256 } from './security';

type MetaOrder = {
  order_number:string; price:number; customer_email?:string|null; customer_whatsapp?:string|null;
  created_at:string; locale?:string|null; currency?:string|null; fbclid?:string|null;
  anonymous_id?:string|null; is_test?:boolean|number|string|null; utm_source?:string|null;
  utm_medium?:string|null; utm_campaign?:string|null; utm_content?:string|null; utm_term?:string|null;
};

function fbcFromOrder(order: MetaOrder) {
  const fbclid = String(order.fbclid || '').trim();
  if (!fbclid) return '';
  const parsed = Date.parse(order.created_at || '');
  const createdAtMs = Number.isFinite(parsed) ? parsed : Date.now();
  return `fb.1.${createdAtMs}.${fbclid}`;
}

export async function sendMetaPurchase(order: MetaOrder) {
  if (normalizeTestFlag(order.is_test)) return { attempted:false, ok:false, skipped:'test' };
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return { attempted:false, ok:false };
  const version = env.META_GRAPH_VERSION || 'v26.0';
  const userData: Record<string,string|string[]> = {};
  if (order.customer_email) userData.em = [await sha256(order.customer_email.trim().toLowerCase())];
  if (order.customer_whatsapp) userData.ph = [await sha256(order.customer_whatsapp.replace(/\D/g,''))];
  if (order.anonymous_id) userData.external_id = [await sha256(String(order.anonymous_id))];
  const fbc = fbcFromOrder(order);
  if (fbc) userData.fbc = fbc;
  const currency = order.currency || 'BRL';
  const isEnglish = String(order.locale || '').toLowerCase().startsWith('en');
  const sourcePath = isEnglish ? '/en/consult' : '/consulta';
  const customData: Record<string,string|number> = { currency, value:order.price/100, order_id:order.order_number };
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const) {
    const value = String(order[key] || '').trim();
    if (value) customData[key] = value;
  }
  const response = await fetch(`https://graph.facebook.com/${version}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ data:[{
      event_name:'Purchase', event_time:Math.floor(Date.now()/1000), action_source:'website',
      event_id:`purchase-${order.order_number}`,
      event_source_url:`${env.APP_URL || 'https://tarot.chamasofia.com.br'}${sourcePath}`,
      user_data:userData, custom_data:customData,
    }] })
  });
  return { attempted:true, ok:response.ok, status:response.status };
}
