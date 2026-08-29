const base=(process.env.BASE_URL||'http://localhost:3000').replace(/\/$/,'');
const url=new URL(base);
if(!['localhost','127.0.0.1'].includes(url.hostname)&&process.env.ALLOW_REMOTE_SMOKE!=='1')throw new Error('Smoke remoto bloqueado para não contaminar métricas comerciais.');
const id=crypto.randomUUID(),sessionId=crypto.randomUUID(),headers={'Content-Type':'application/json',Origin:base};
const request=async(path,options={})=>{const response=await fetch(`${base}${path}`,options);const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(`${path} retornou ${response.status}: ${data?.error||'falha'}`);return {response,data};};

const landing=await fetch(`${base}/`);if(!landing.ok)throw new Error(`Landing retornou ${landing.status}`);
await request('/api/events',{method:'POST',headers,body:JSON.stringify({event:'landing_view',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop',attribution:{utm_source:'smoke'}})});
await request('/api/events',{method:'POST',headers,body:JSON.stringify({event:'cta_click',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop'})});
await request('/api/events',{method:'POST',headers,body:JSON.stringify({event:'question_started',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop'})});
await request('/api/events',{method:'POST',headers,body:JSON.stringify({event:'question_completed',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop'})});
await request('/api/events',{method:'POST',headers,body:JSON.stringify({event:'offer_viewed',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop'})});
const order=await request('/api/orders',{method:'POST',headers,body:JSON.stringify({name:'Smoke Test',email:`smoke+${id.slice(0,8)}@example.com`,whatsapp:'',category:'Dinheiro',question:'Como organizar melhor minhas prioridades profissionais?',anonymousId:id,sessionId,landingVariant:'A',deviceType:'desktop',offerCode:'essential',utm_source:'smoke'})});
if(!order.data.publicToken||!order.data.url)throw new Error('Checkout não retornou token e URL.');
const pending=await request(order.data.url.replace('/leitura/','/api/orders/'));
if(pending.data.paymentStatus!=='pending'||pending.data.cards!==null)throw new Error('Pedido pendente liberou conteúdo indevidamente.');
process.stdout.write('PASS landing → CTA → pergunta → oferta → checkout pendente, sem pagamento real.\n');
