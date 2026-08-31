"use client";
import { useEffect, useMemo, useState } from "react";
import { MAJOR_ARCANA } from "@/lib/tarot";

type Price={cents:number;formatted:string};
const CATEGORY_MAP=[
  ["Amor e relacionamentos","❤️","Amor e relacionamento"],
  ["Dinheiro","💰","Dinheiro"],
  ["Trabalho e carreira","💼","Trabalho e carreira"],
  ["Decisões","🔮","Uma decisão importante"],
] as const;
function anon(){let id=localStorage.getItem("cs_anon");if(!id){id=crypto.randomUUID();localStorage.setItem("cs_anon",id)}return id}
function session(){let id=sessionStorage.getItem("cs_session");if(!id){id=crypto.randomUUID();sessionStorage.setItem("cs_session",id)}return id}
function track(event:string,metadata:Record<string,unknown>={}){void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,anonymousId:anon(),metadata:{...metadata,sessionId:session()}})});}
export default function ConsultaClient(){
 const [step,setStep]=useState(0); const [category,setCategory]=useState(""); const [question,setQuestion]=useState("");
 const [selected,setSelected]=useState<string[]>([]); const [price,setPrice]=useState<Price>({cents:990,formatted:'R$ 9,90'});
 const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const deck=useMemo(()=>MAJOR_ARCANA.slice().sort(()=>Math.random()-.5).slice(0,7),[]); const cards=selected.map(id=>MAJOR_ARCANA.find(c=>c.id===id)).filter(Boolean);
 useEffect(()=>{fetch('/api/pricing').then(r=>r.json()).then(setPrice).catch(()=>{});track('onboarding_started');return()=>track('onboarding_abandon',{step});},[]);
 const go=(n:number)=>{setError('');setStep(n);window.scrollTo({top:0,behavior:'smooth'})};
 const chooseCategory=(v:string)=>{setCategory(v);track('category_selected',{category:v});go(2)};
 const saveQuestion=()=>{if(question.trim().length<10){setError('Escreva sua pergunta com pelo menos 10 caracteres.');return}track('question_written',{category,length:question.trim().length});go(3)};
 const toggleCard=(id:string)=>{setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<3?[...s,id]:s)};
 const confirmCards=()=>{if(selected.length!==3){setError('Escolha exatamente 3 cartas.');return}track('cards_selected',{cardIds:selected});go(4);setTimeout(()=>go(5),1400)};
 const showOffer=()=>{track('reading_preview',{cardIds:selected});track('offer_viewed',{value:price.cents/100,currency:'BRL'});go(6)};
 async function checkout(e:React.FormEvent){e.preventDefault();setError('');if(name.trim().length<2||!/^\S+@\S+\.\S+$/.test(email)){setError('Informe nome e e-mail válidos para receber sua leitura.');return}setLoading(true);try{
  const qs=new URLSearchParams(location.search);const body:any={name,email,whatsapp:'',category,question,anonymousId:anon(),cardIds:selected};['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(k=>body[k]=qs.get(k)||localStorage.getItem(`cs_${k}`)||'');
  const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Não foi possível gerar o Pix.');track('checkout_started',{value:price.cents/100,currency:'BRL',order_id:data.orderNumber});location.href=data.url;
 }catch(err){setLoading(false);setError(err instanceof Error?err.message:'Tente novamente.')}}
 return <main className="consult-shell"><section className="consult-card"><header className="consult-brand"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA · TAROT</span></header>
  {step===0&&<div className="consult-step hero-consult"><p className="eyebrow">Uma pergunta. Três cartas. Uma nova perspectiva.</p><h1>Existe uma pergunta que não sai da sua cabeça?</h1><p>Em menos de 2 minutos você prepara sua leitura. Primeiro escolha o que quer entender — o pagamento só aparece depois da sua prévia.</p><button className="primary-button" onClick={()=>go(1)}>COMEÇAR MINHA LEITURA →</button><small>Leitura privada · 3 cartas · PDF + e-book bônus</small></div>}
  {step===1&&<div className="consult-step"><p className="consult-progress">1 de 5</p><h2>O que mais ocupa seus pensamentos agora?</h2><div className="consult-options">{CATEGORY_MAP.map(([v,icon,label])=><button key={v} onClick={()=>chooseCategory(v)}><b>{icon}</b><span>{label}</span></button>)}</div></div>}
  {step===2&&<div className="consult-step"><p className="consult-progress">2 de 5</p><button className="consult-back" onClick={()=>go(1)}>← voltar</button><h2>Transforme isso em uma pergunta</h2><p className="consult-muted">Seja específica. Sua pergunta orientará a interpretação das cartas.</p><textarea autoFocus maxLength={500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: O que preciso compreender sobre esta relação neste momento?"/><small>{question.length}/500</small><button className="primary-button" onClick={saveQuestion}>CONTINUAR →</button></div>}
  {step===3&&<div className="consult-step"><p className="consult-progress">3 de 5</p><button className="consult-back" onClick={()=>go(2)}>← voltar</button><h2>Escolha 3 cartas pela sua intuição</h2><p className="consult-muted">Não existe escolha certa. Toque nas três cartas que mais chamarem sua atenção.</p><div className="consult-deck">{deck.map(c=><button aria-label="Carta virada" className={selected.includes(c.id)?'picked':''} key={c.id} onClick={()=>toggleCard(c.id)}><img src="/assets/tarot/cards/verso-premium.jpg" alt="Carta virada"/><span>{selected.includes(c.id)?selected.indexOf(c.id)+1:''}</span></button>)}</div><p className="consult-count">{selected.length}/3 escolhidas</p><button className="primary-button" onClick={confirmCards}>REVELAR MINHAS CARTAS →</button></div>}
  {step===4&&<div className="consult-step consult-loading"><div className="orb">✦</div><h2>Conectando sua pergunta às cartas...</h2><p>Organizando os símbolos e a posição de cada carta na sua leitura.</p></div>}
  {step===5&&<div className="consult-step"><p className="consult-progress">4 de 5</p><h2>Suas cartas foram reveladas</h2><div className="consult-reveal">{cards.map((c:any)=><article key={c.id}><img src={c.image} alt={c.name}/><strong>{c.name}</strong><small>{c.keywords.slice(0,2).join(' · ')}</small></article>)}</div><div className="consult-preview"><span>PRÉVIA DA LEITURA</span><p><strong>{cards[0]?.name}</strong> abre sua leitura destacando {cards[0]?.keywords?.[0]}. Em relação à sua pergunta, isso pede atenção ao que já está presente — mas a conexão entre as três cartas revela a parte mais importante.</p><div className="consult-fade">A interpretação completa continua com as influências, tendência e orientação final...</div></div><button className="primary-button" onClick={showOffer}>VER MINHA LEITURA COMPLETA →</button></div>}
  {step===6&&<div className="consult-step consult-offer"><p className="consult-progress">5 de 5</p><h2>Sua leitura completa está pronta.</h2><p className="consult-muted">Você já fez a parte mais importante: trouxe sua pergunta e escolheu suas cartas.</p><ul><li>✓ interpretação personalizada das 3 cartas</li><li>✓ conexão entre situação, influências e tendência</li><li>✓ orientação final para a sua pergunta</li><li>✓ PDF da leitura para guardar</li><li>✓ e-book Tarot para Iniciantes de presente</li></ul><div className="consult-price"><small>LIBERAÇÃO IMEDIATA NO PIX</small><strong>{price.formatted}</strong></div><form onSubmit={checkout}><label>Seu primeiro nome<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>E-mail para receber a leitura<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>{error&&<p className="consult-error">{error}</p>}<button disabled={loading} className="primary-button">{loading?'GERANDO PIX...':`LIBERAR MINHA LEITURA — ${price.formatted}`}</button></form><small>Pagamento seguro via Pix · O valor é mostrado antes de qualquer cobrança.</small></div>}
  {error&&step<6&&<p className="consult-error">{error}</p>}
 </section></main>;
}
