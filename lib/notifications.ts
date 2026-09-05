import { env } from 'cloudflare:workers';
import { getBook } from './book-catalog';
import { normalizeBrazilPhone } from './phone';

type DeliveryOrder = {
  customer_name:string; customer_email?:string|null; customer_whatsapp?:string|null;
  public_token:string; order_number:string; offer_code?:string|null;
  product_slug?:string|null; delivery_channel?:string|null; locale?:string|null; currency?:string|null;
};

type LifecycleMessage = {
  customerName: string;
  customerEmail?: string | null;
  customerWhatsapp?: string | null;
  orderNumber?: string | null;
  kind: 'form_recovery_1' | 'form_recovery_2' | 'pix_recovery_1' | 'pix_recovery_2';
  subject: string;
  message: string;
  url: string;
};

type DeliveryResult = { channel:string; ok:boolean; error?:string };

function emailSender() {
  if (!env.EMAIL_FROM) return null;
  const match = env.EMAIL_FROM.match(/^(.*?)\s*<([^>]+)>$/);
  return match
    ? { name: match[1].trim() || 'Chama Sofia', email: match[2] }
    : { name: 'Chama Sofia', email: env.EMAIL_FROM };
}

async function sendEmail(input: { email:string; name:string; subject:string; html:string }) {
  const sender = emailSender();
  if (!sender) return null;
  try {
    const values = env as unknown as Record<string,string|undefined>;
    let response: Response;
    if (values.RESEND_API_KEY) {
      response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${values.RESEND_API_KEY}`}, body:JSON.stringify({ from:`${sender.name} <${sender.email}>`, to:[input.email], subject:input.subject, html:input.html }) });
    } else if (env.BREVO_API_KEY) {
      response = await fetch('https://api.brevo.com/v3/smtp/email', { method:'POST', headers:{'Content-Type':'application/json','api-key':env.BREVO_API_KEY!}, body:JSON.stringify({ sender, to:[{email:input.email,name:input.name}], subject:input.subject, htmlContent:input.html }) });
    } else return null;
    return { channel:'email', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}` } satisfies DeliveryResult;
  } catch (error) {
    return { channel:'email', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' } satisfies DeliveryResult;
  }
}

export async function notifyReadingReady(order: DeliveryOrder) {
  const appUrl = (env.APP_URL || 'https://tarot.chamasofia.com.br').replace(/\/$/, '');
  const isEnglish = String(order.locale || '').toLowerCase().startsWith('en');
  const readingUrl = isEnglish ? `${appUrl}/en/reading/${order.public_token}` : `${appUrl}/leitura/${order.public_token}`;
  const pdfUrl = `${appUrl}/api/pdf/${order.public_token}`;
  const book = order.offer_code === 'ebook' ? getBook(order.product_slug) : undefined;
  const ebookUrl = book ? `${appUrl}/api/ebook/${order.public_token}/${book.slug}` : `${appUrl}/api/ebook/${order.public_token}`;
  const results: Array<{channel:string;ok:boolean;error?:string}> = [];
  const preference = order.delivery_channel || 'legacy';
  const shouldSendEmail = preference !== 'whatsapp';
  const shouldSendWhatsApp = preference !== 'email';
  const subject = isEnglish ? 'Your Chama Sofia reading is ready ✦' : (book ? `Seu e-book ${book.shortTitle} está liberado ✦` : 'Sua leitura de Tarot está pronta ✦');
  const intro = isEnglish ? 'Your payment was confirmed and your private reading is ready.' : (book ? `Seu pagamento foi confirmado e o e-book <strong>${escapeHtml(book.title)}</strong> está liberado.` : 'Seu pagamento foi confirmado e sua leitura está pronta.');
  const actionLabel = isEnglish ? 'Open my private reading' : (book ? 'Baixar meu e-book' : 'Acessar minha leitura');
  const actionUrl = book ? ebookUrl : readingUrl;

  if (shouldSendEmail && order.customer_email) {
    const result = await sendEmail({
      email:order.customer_email,
      name:order.customer_name,
      subject,
      html:isEnglish ? `<p>Hello, ${escapeHtml(order.customer_name)}.</p><p>${intro}</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>Order ${escapeHtml(order.order_number)} · Chama Sofia</p>` : `<p>Olá, ${escapeHtml(order.customer_name)}.</p><p>${intro}</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>Pedido ${escapeHtml(order.order_number)} · Chama Sofia</p>`,
    });
    if (result) results.push(result);
  }

  const normalizedPhone = normalizeBrazilPhone(order.customer_whatsapp);
  if (shouldSendWhatsApp && normalizedPhone && env.WHATSAPP_AGENT_URL && env.WHATSAPP_AGENT_SECRET) {
    try {
      const response = await fetch(env.WHATSAPP_AGENT_URL, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WHATSAPP_AGENT_SECRET}`},
        body:JSON.stringify({ phone:normalizedPhone, customerName:order.customer_name,
          orderNumber:order.order_number, readingUrl, pdfUrl, ebookUrl, productSlug:book?.slug || null }),
      });
      const detail = response.ok ? undefined : (await response.text()).slice(0,180);
      results.push({ channel:'whatsapp-agent', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}${detail?`: ${detail}`:''}` });
    } catch (error) { results.push({ channel:'whatsapp-agent', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' }); }
  } else if (shouldSendWhatsApp && normalizedPhone && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {    try {
      const version = env.WHATSAPP_GRAPH_VERSION || 'v23.0';
      const body = book
        ? `Olá, ${order.customer_name.split(' ')[0]} ✦ Seu pagamento foi confirmado. Baixe seu e-book ${book.shortTitle}: ${ebookUrl}`
        : `Olá, ${order.customer_name.split(' ')[0]} ✦ Seu pagamento foi confirmado e sua leitura de Tarot está pronta: ${readingUrl}`;
      const response = await fetch(`https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`},
        body:JSON.stringify({ messaging_product:'whatsapp', to:normalizedPhone, type:'text', text:{ preview_url:true, body } })
      });
      results.push({ channel:'whatsapp', ok:response.ok, error:response.ok?undefined:`HTTP ${response.status}` });
    } catch (error) { results.push({ channel:'whatsapp', ok:false, error:error instanceof Error?error.message:'Falha desconhecida' }); }
  }

  const whatsappFailed = shouldSendWhatsApp && results.some((result) => result.channel.includes('whatsapp') && !result.ok);
  if (whatsappFailed && order.customer_email && !results.some((result) => result.channel === 'email')) {
    const fallback = await sendEmail({
      email:order.customer_email,
      name:order.customer_name,
      subject:`Alternativa de acesso · ${subject}`,
      html:`<p>Olá, ${escapeHtml(order.customer_name)}.</p><p>Não conseguimos concluir o envio pelo WhatsApp, então protegemos seu acesso por e-mail.</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>Pedido ${escapeHtml(order.order_number)} · Chama Sofia</p>`,
    });
    if (fallback) results.push(fallback);
  }
  return { attempted:results.length>0, ok:results.some((result)=>result.ok), results };
}

export async function sendLifecycleMessage(input: LifecycleMessage) {
  const results: DeliveryResult[] = [];
  const phone = normalizeBrazilPhone(input.customerWhatsapp);

  if (phone && env.WHATSAPP_AGENT_URL && env.WHATSAPP_AGENT_SECRET) {
    try {
      const response = await fetch(env.WHATSAPP_AGENT_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.WHATSAPP_AGENT_SECRET}`},
        body:JSON.stringify({
          phone,
          customerName:input.customerName,
          orderNumber:input.orderNumber || undefined,
          notificationType:input.kind,
          message:input.message,
          url:input.url,
        }),
      });
      const detail = response.ok ? undefined : (await response.text()).slice(0,180);
      results.push({channel:'whatsapp-agent',ok:response.ok,error:response.ok?undefined:`HTTP ${response.status}${detail?`: ${detail}`:''}`});
    } catch (error) {
      results.push({channel:'whatsapp-agent',ok:false,error:error instanceof Error?error.message:'Falha desconhecida'});
    }
  }

  if ((!phone || !results.some((result) => result.ok)) && input.customerEmail) {
    const result = await sendEmail({
      email:input.customerEmail,
      name:input.customerName,
      subject:input.subject,
      html:`<p>${escapeHtml(input.message).replace(/\n/g,'<br>')}</p><p><a href="${escapeHtml(input.url)}">Continuar minha jornada</a></p>`,
    });
    if (result) results.push(result);
  }

  return {attempted:results.length>0,ok:results.some((result)=>result.ok),results};
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char] || char));
}
