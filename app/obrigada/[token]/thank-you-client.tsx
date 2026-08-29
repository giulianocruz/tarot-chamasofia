'use client';
import { useEffect, useState } from 'react';

type Order = {
  id:number;orderNumber:string;customerName:string;price:number;paymentStatus:string;readingStatus:string;isTest:boolean;offerCode:string;includedBooks:string[];upsellStatus:string;upsellPrice:number|null;upsellPixPayload:string|null;
  referral:{code:string;qualified:number;rewardUnlocked:boolean}|null;
};
type PublicConfig = {metaPixelId?:string;whatsappNumber?:string};
type PublicOffers={upsell:{available:boolean;formatted:string}};

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
  const [publicOffers,setPublicOffers]=useState<PublicOffers|null>(null);
  const [upsellBusy,setUpsellBusy]=useState(false);
  const [upsellDismissed,setUpsellDismissed]=useState(false);
  const [rating,setRating]=useState(0);const [comment,setComment]=useState('');const [publicConsent,setPublicConsent]=useState(false);const [reviewStatus,setReviewStatus]=useState('');
  useEffect(()=>{
    Promise.all([
      fetch(`/api/orders/${token}`,{cache:'no-store'}).then(async (response)=>{const data=await response.json() as Order&{error?:string};if(!response.ok) throw new Error(data.error);return data;}),
      fetch('/api/config').then((response)=>response.json() as Promise<PublicConfig>).catch(()=>({} as PublicConfig)),
      fetch('/api/offers').then((response)=>response.json() as Promise<PublicOffers>).catch(()=>null),
    ]).then(([data,config,publicOffers])=>{
      if (!['paid','reading_generated','delivered'].includes(data.paymentStatus)) { location.replace(`/leitura/${token}`); return; }
      setOrder(data);setPublicOffers(publicOffers);if(config.whatsappNumber)setWhatsapp(String(config.whatsappNumber));
      track('thank_you_view',data.id);track('upsell_viewed',data.id);track('review_requested',data.id);
      const key=`cs_purchase_${data.orderNumber}`;
      if (!data.isTest && !localStorage.getItem(key) && config.metaPixelId) {
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
  useEffect(()=>{
    if(!order||!['pending'].includes(order.upsellStatus))return;
    const timer=setInterval(()=>fetch(`/api/orders/${token}`,{cache:'no-store'}).then(r=>r.json() as Promise<Order>).then(setOrder).catch(()=>undefined),5000);
    return()=>clearInterval(timer);
  },[order,token]);
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
  async function startLibraryUpsell(){
    setUpsellBusy(true);const response=await fetch(`/api/orders/${token}/upsell`,{method:'POST'});const data=await response.json() as {error?:string;pixPayload?:string;price?:number};
    if(!response.ok){setReviewStatus(data.error||'Não foi possível preparar o complemento.');setUpsellBusy(false);return;}
    setOrder(current=>current?{...current,upsellStatus:data.pixPayload?'pending':'paid',upsellPixPayload:data.pixPayload||current.upsellPixPayload,upsellPrice:data.price||current.upsellPrice}:current);setUpsellBusy(false);
  }
  async function copyUpsellPix(){if(order?.upsellPixPayload){await navigator.clipboard.writeText(order.upsellPixPayload);setCopied(true);setTimeout(()=>setCopied(false),2200);}}
  function declineUpsell(){if(!order)return;setUpsellDismissed(true);track('upsell_declined',order.id);}
  async function submitReview(event:React.FormEvent){
    event.preventDefault();setReviewStatus('Enviando...');const response=await fetch(`/api/reviews/${token}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment,publicConsent})});const data=await response.json() as {error?:string};setReviewStatus(response.ok?'Obrigada! Sua avaliação foi registrada para moderação.':data.error||'Não foi possível enviar.');
  }
  if(error)return <main className="thank-you-shell center-state"><div className="status-orb">✦</div><h1>Não foi possível abrir sua compra</h1><p>{error}</p></main>;
  if(!order)return <main className="thank-you-shell center-state"><div className="status-orb pulse">✦</div><p>Confirmando sua jornada...</p></main>;
  return <main className="thank-you-shell">
    <header className="reading-header"><a className="brand" href="/"><span className="brand-mark">✦</span><span>CHAMA SOFIA</span></a><span>Pedido {order.orderNumber}</span></header>
    {order.isTest && <div className="test-mode-banner">MODO DE TESTE · esta jornada não entra nas métricas comerciais</div>}
    <section className="thank-you-hero">
      <span className="thank-you-check">✓</span><p className="eyebrow">Pagamento confirmado</p><h1>Obrigada, {order.customerName.split(' ')[0]}.</h1>
      <p>Seu livro já está disponível. Baixe agora e comece a leitura bônus quando sentir que é o momento.</p>
      <div className="thank-you-actions"><a className="primary-button" href={`/api/ebook/${token}`}>BAIXAR O LIVRO <span>⇩</span></a><a className="secondary-button" href={`/leitura/${token}?start=1`}>COMEÇAR MINHA LEITURA <span>→</span></a></div>
      {(order.offerCode==='complete'||order.upsellStatus==='paid')&&<div className="library-downloads"><a href={`/api/books/pomba-gira/${token}`}>Baixar Pomba Gira</a><a href={`/api/books/preto-velho/${token}`}>Baixar Preto Velho</a></div>}
    </section>
    {order.offerCode==='essential'&&publicOffers?.upsell.available&&order.upsellStatus!=='paid'&&!upsellDismissed&&<section className="library-upsell">
      <div><p className="eyebrow">Oferta opcional pós-compra</p><h2>Complete sua biblioteca</h2><p>Adicione Pomba Gira e Preto Velho à sua compra por {publicOffers.upsell.formatted}. Sua leitura original já está liberada e não depende desta oferta.</p></div>
      {order.upsellStatus==='pending'&&order.upsellPixPayload?<div className="upsell-pix"><img src={`/api/qr/${token}?type=upsell`} alt="QR Code Pix do complemento"/><button onClick={()=>void copyUpsellPix()}>{copied?'PIX COPIADO':'COPIAR PIX'}</button><small>A biblioteca é liberada automaticamente após a confirmação.</small></div>:<div><button className="primary-button" disabled={upsellBusy} onClick={()=>void startLibraryUpsell()}>{upsellBusy?'PREPARANDO PIX...':`ADICIONAR POR ${publicOffers.upsell.formatted}`}</button><button className="secondary-button" onClick={declineUpsell}>AGORA NÃO</button></div>}
    </section>}
    <section className="referral-section">
      <div><p className="eyebrow">Indique e continue sua jornada</p><h2>Uma próxima leitura com condição especial</h2><p>Indique uma pessoa. Quando ela concluir a compra pelo seu link, sua condição especial fica registrada para a próxima leitura.</p>
        {order.referral?.rewardUnlocked && <><strong className="reward-unlocked">Condição especial desbloqueada ✦</strong><button className="reward-button" onClick={()=>openOffer('referral_reward','usar minha condição especial de indicação')}>USAR MINHA CONDIÇÃO ESPECIAL</button></>}
      </div>
      <div className="referral-card"><span>SEU LINK DE INDICAÇÃO</span><code>{referralUrl}</code><button className="primary-button" onClick={()=>void shareReferral()}>INDICAR PELO WHATSAPP</button><button className="secondary-button" onClick={()=>void copyReferral()}>{copied?'LINK COPIADO':'COPIAR LINK'}</button><small>{order.referral?.qualified||0} indicação(ões) confirmada(s)</small></div>
    </section>
    <section className="review-section"><div><p className="eyebrow">Avaliação real</p><h2>Como foi sua experiência?</h2><p>Seu comentário só poderá aparecer publicamente com sua autorização e após aprovação.</p></div><form onSubmit={submitReview}><div className="star-picker" aria-label="Nota de 1 a 5">{[1,2,3,4,5].map(value=><button type="button" aria-label={`${value} estrela${value>1?'s':''}`} className={rating>=value?'selected':''} onClick={()=>setRating(value)} key={value}>★</button>)}</div><textarea maxLength={500} value={comment} onChange={event=>setComment(event.target.value)} placeholder="Comentário opcional"/><label><input type="checkbox" checked={publicConsent} onChange={event=>setPublicConsent(event.target.checked)}/> Autorizo exibir meu comentário publicamente.</label><button className="primary-button" disabled={!rating}>ENVIAR AVALIAÇÃO</button>{reviewStatus&&<small>{reviewStatus}</small>}</form></section>
    <section className="post-purchase-offers">
      <p className="eyebrow">Depois da primeira experiência</p><h2>Escolha apenas se fizer sentido para você</h2><p className="offers-intro">Estas opções aparecem somente agora, depois da entrega do seu produto.</p>
      <div className="upsell-grid">{offers.map(([id,title,text])=><article key={id}><span>✦</span><h3>{title}</h3><p>{text}</p><button onClick={()=>openOffer(id,title)}>Quero conhecer</button></article>)}</div>
    </section>
    <footer><p>O Tarot possui finalidade de entretenimento, reflexão e autoconhecimento.</p></footer>
  </main>;
}
