'use client';
import { useEffect, useState } from 'react';

type Order = {
  id:number;orderNumber:string;customerName:string;price:number;paymentStatus:string;readingStatus:string;
  referral:{code:string;qualified:number;rewardUnlocked:boolean}|null;
};
type PublicConfig = {metaPixelId?:string;whatsappNumber?:string};

const offers = [
  ['five-cards','Leitura de 5 cartas','Aprofunde uma nova pergunta com mais posições e nuances.'],
  ['relationship','Leitura de relacionamento','Uma leitura temática para refletir sobre vínculos, limites e caminhos.'],
  ['career','Leitura de carreira','Olhe para decisões, oportunidades e seu momento profissional.'],
  ['monthly','Pacote mensal de leituras','Acompanhe temas importantes ao longo do mês.'],
  ['pomba-gira','Livro Pomba Gira','Continue pela coleção Chama Sofia com uma nova leitura.'],
  ['preto-velho','Livro Preto Velho','Conheça outro volume da coleção Chama Sofia.'],
  ['premium-media','Versão premium em áudio ou vídeo','Receba uma explicação complementar da sua leitura.'],
] as const;

function track(event:string,orderId?:number,metadata?:unknown) {
  void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,orderId,metadata})});
}

export default function ThankYouClient({token}:{token:string}) {
  const [order,setOrder]=useState<Order|null>(null);
  const [error,setError]=useState('');
  const [whatsapp,setWhatsapp]=useState('5514996428874');
  const [copied,setCopied]=useState(false);
  useEffect(()=>{
    Promise.all([
      fetch(`/api/orders/${token}`,{cache:'no-store'}).then(async (response)=>{const data=await response.json() as Order&{error?:string};if(!response.ok) throw new Error(data.error);return data;}),
      fetch('/api/config').then((response)=>response.json() as Promise<PublicConfig>).catch(()=>({} as PublicConfig)),
    ]).then(([data,config])=>{
      if (!['paid','reading_generated','delivered'].includes(data.paymentStatus)) { location.replace(`/leitura/${token}`); return; }
      setOrder(data);if(config.whatsappNumber)setWhatsapp(String(config.whatsappNumber));
      track('thank_you_view',data.id);track('upsell_viewed',data.id);
      const key=`cs_purchase_${data.orderNumber}`;
      if (!localStorage.getItem(key) && config.metaPixelId) {
        const w=window as typeof window&{fbq?:(...args:unknown[])=>void};
        if (!w.fbq) {
          const queue:unknown[][]=[];w.fbq=(...args:unknown[])=>queue.push(args);(w.fbq as unknown as {queue:unknown[][]}).queue=queue;
          const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);w.fbq('init',config.metaPixelId);
        }
        w.fbq('track','Purchase',{value:data.price/100,currency:'BRL',order_id:data.orderNumber},{eventID:`purchase-${data.orderNumber}`});
        localStorage.setItem(key,'1');
      }
    }).catch((reason)=>setError(reason instanceof Error?reason.message:'Não foi possível carregar sua compra.'));
  },[token]);
  const referralUrl = order?.referral ? `${typeof location==='undefined'?'https://tarot.chamasofia.com.br':location.origin}/?ref=${encodeURIComponent(order.referral.code)}&utm_source=indicacao&utm_medium=whatsapp&utm_campaign=cliente_indica` : '';
  async function shareReferral() {
    if (!referralUrl || !order) return;
    const message=`Conheci esta experiência do Tarot Chama Sofia e achei que você poderia gostar ✨\n${referralUrl}`;
    track('referral_share',order.id,{channel:'whatsapp'});
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  }
  async function copyReferral() {
    if(!referralUrl||!order)return;await navigator.clipboard.writeText(referralUrl);setCopied(true);track('referral_share',order.id,{channel:'copy'});setTimeout(()=>setCopied(false),2500);
  }
  function openOffer(id:string,title:string) {
    if(!order)return;track('upsell_clicked',order.id,{offer:id});
    const message=`Olá! Já recebi meu livro e minha leitura do Tarot Chama Sofia. Gostaria de saber mais sobre: ${title}.`;
    window.open(`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  }
  if(error)return <main className="thank-you-shell center-state"><div className="status-orb">✦</div><h1>Não foi possível abrir sua compra</h1><p>{error}</p></main>;
  if(!order)return <main className="thank-you-shell center-state"><div className="status-orb pulse">✦</div><p>Confirmando sua jornada...</p></main>;
  return <main className="thank-you-shell">
    <header className="reading-header"><a className="brand" href="/"><span className="brand-mark">✦</span><span>CHAMA SOFIA</span></a><span>Pedido {order.orderNumber}</span></header>
    <section className="thank-you-hero">
      <span className="thank-you-check">✓</span><p className="eyebrow">Pagamento confirmado</p><h1>Obrigada, {order.customerName.split(' ')[0]}.</h1>
      <p>Seu livro já está disponível. Baixe agora e comece a leitura bônus quando sentir que é o momento.</p>
      <div className="thank-you-actions"><a className="primary-button" href={`/api/ebook/${token}`}>BAIXAR O LIVRO <span>⇩</span></a><a className="secondary-button" href={`/leitura/${token}?start=1`}>COMEÇAR MINHA LEITURA <span>→</span></a></div>
    </section>
    <section className="referral-section">
      <div><p className="eyebrow">Indique e continue sua jornada</p><h2>Uma próxima leitura com condição especial</h2><p>Indique uma pessoa. Quando ela concluir a compra pelo seu link, sua condição especial fica registrada para a próxima leitura.</p>
        {order.referral?.rewardUnlocked && <><strong className="reward-unlocked">Condição especial desbloqueada ✦</strong><button className="reward-button" onClick={()=>openOffer('referral_reward','usar minha condição especial de indicação')}>USAR MINHA CONDIÇÃO ESPECIAL</button></>}
      </div>
      <div className="referral-card"><span>SEU LINK DE INDICAÇÃO</span><code>{referralUrl}</code><button className="primary-button" onClick={()=>void shareReferral()}>INDICAR PELO WHATSAPP</button><button className="secondary-button" onClick={()=>void copyReferral()}>{copied?'LINK COPIADO':'COPIAR LINK'}</button><small>{order.referral?.qualified||0} indicação(ões) confirmada(s)</small></div>
    </section>
    <section className="post-purchase-offers">
      <p className="eyebrow">Depois da primeira experiência</p><h2>Escolha apenas se fizer sentido para você</h2><p className="offers-intro">Estas opções aparecem somente agora, depois da entrega do seu produto.</p>
      <div className="upsell-grid">{offers.map(([id,title,text])=><article key={id}><span>✦</span><h3>{title}</h3><p>{text}</p><button onClick={()=>openOffer(id,title)}>Quero conhecer</button></article>)}</div>
    </section>
    <footer><p>O Tarot possui finalidade de entretenimento, reflexão e autoconhecimento.</p></footer>
  </main>;
}
