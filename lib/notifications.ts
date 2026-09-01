import { env } from 'cloudflare:workers';
import { getBook } from './book-catalog';

type DeliveryOrder = {
  customer_name:string; customer_email?:string|null; customer_whatsapp?:string|null;
  public_token:string; order_number:string; offer_code?:string|null;
  product_slug?:string|null; delivery_channel?:string|null;
};

export async function notifyReadingReady(order: DeliveryOrder) {
  const appUrl = (env.APP_URL || 'https://tarot.chamasofia.com.br').replace(/\/$/, '');
  const readingUrl = `${appUrl}/leitura/${order.public_token}`;
  const pdfUrl = `${appUrl}/api/pdf/${order.public_token}`;
  const book = order.offer_code === 'ebook' ? getBook(order.product_slug) : undefined;
  const ebookUrl = book ? `${appUrl}/api/ebook/${order.public_token}/${book.slug}` : `${appUrl}/api/ebook/${order.public_token}`;
  const results: Array<{channel:string;ok:boolean;error?:string}> = [];
  const preference = order.delivery_channel || 'legacy';
  const sendEmail = preference !== 'whatsapp';
  const sendWhatsApp = preference !== 'email';
  const subject = book ? `Seu e-book ${book.shortTitle} está liberado ✦` : 'Sua leitura de Tarot está pronta ✦';
  const intro = book ? `Seu pagamento foi confirmado e o e-book <strong>${escapeHtml(book.title)}</strong> está liberado.` : 'Seu pagamento foi confirmado e sua leitura está pronta.';
  const actionLabel = book ? 'Baixar meu e-book' : 'Acessar minha leitura';
  const actionUrl = book ? ebookUrl : readingUrl;

  if (sendEmail && order.customer_email && env.BREVO_API_KEY && env.EMAIL_FROM) {    try {
      const match = env.EMAIL_FROM.match(/^(.*?)\s*<([^>]+)>$/);
      const sender = match ? { name: match[1].trim(), email: match[2] } : { name:'Chama Sofia', email:env.EMAIL_FROM };
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:'POST', headers:{'Content-Type':'application/json','api-key':env.BREVO_API_KEY},
        body:JSON.stringify({ sender, to:[{email:order.customer_email,name:order.customer_name}], subject,
          htmlContent:`<p>Olá, ${escapeHtml(order.customer_name)}.</p><p>${intro}</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>Pedido ${escapeHtml(order.order_number)} · Chama Sofia</p>` })
      });
      results.push({ channel:'email', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}` });
    } catch (error) { results.push({ channel:'email', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' }); }
  }

  if (sendWhatsApp && order.customer_whatsapp && env.WHATSAPP_AGENT_URL && env.WHATSAPP_AGENT_SECRET) {
    try {
      const response = await fetch(env.WHATSAPP_AGENT_URL, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WHATSAPP_AGENT_SECRET}`},
        body:JSON.stringify({ phone:order.customer_whatsapp, customerName:order.customer_name,
          orderNumber:order.order_number, readingUrl, pdfUrl, ebookUrl, productSlug:book?.slug || null }),
      });
      const detail = response.ok ? undefined : (await response.text()).slice(0,180);
      results.push({ channel:'whatsapp-agent', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}${detail?`: ${detail}`:''}` });
    } catch (error) { results.push({ channel:'whatsapp-agent', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' }); }
  } else if (sendWhatsApp && order.customer_whatsapp && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {    try {
      const phone = order.customer_whatsapp.replace(/\D/g, '');
      const version = env.WHATSAPP_GRAPH_VERSION || 'v23.0';
      const body = book
        ? `Olá, ${order.customer_name.split(' ')[0]} ✦ Seu pagamento foi confirmado. Baixe seu e-book ${book.shortTitle}: ${ebookUrl}`
        : `Olá, ${order.customer_name.split(' ')[0]} ✦ Seu pagamento foi confirmado e sua leitura de Tarot está pronta: ${readingUrl}`;
      const response = await fetch(`https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`},
        body:JSON.stringify({ messaging_product:'whatsapp', to:phone, type:'text', text:{ preview_url:true, body } })
      });
      results.push({ channel:'whatsapp', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}` });
    } catch (error) { results.push({ channel:'whatsapp', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' }); }
  }
  return { attempted:results.length>0, ok:results.length>0&&results.every((result)=>result.ok), results };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char] || char));
}
