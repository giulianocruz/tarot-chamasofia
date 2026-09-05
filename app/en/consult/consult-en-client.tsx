"use client";
import { useMemo, useState } from "react";
import { getCards } from "@/lib/tarot";
import { englishCardCopy } from "@/lib/reading-en";

const DECK_IDS = ["mago","sacerdotisa","enamorados","diabo","estrela","lua","sol"];
const THEMES = [
  {key:"love",icon:"♡",title:"Love & attraction",copy:"Desire, reciprocity and what exists between you."},
  {key:"money",icon:"◇",title:"Money & growth",copy:"Prosperity, options and material expansion."},
  {key:"career",icon:"✦",title:"Career & ambition",copy:"Recognition, direction and your next leap."},
  {key:"decision",icon:"◉",title:"A decision",copy:"The choice that could change your direction."},
];
const QUESTIONS: Record<string,string[]> = {
  love:["What do I need to understand about this connection right now?","Is there real desire and reciprocity between us?","What is this person feeling but not showing?"],
  money:["Where is my strongest opportunity for financial growth?","What may be blocking me from prospering more?","What should I understand about money right now?"],
  career:["What move could increase my professional recognition?","Where is my unused growth potential?","What should I understand about my career right now?"],
  decision:["What am I not seeing clearly about this decision?","Which direction protects more of my autonomy?","What deserves the most weight before I choose?"],
};
function ids() {
  const anonymous_id = localStorage.getItem("cs_anon") || crypto.randomUUID();
  const session_id = sessionStorage.getItem("cs_session") || crypto.randomUUID();
  localStorage.setItem("cs_anon", anonymous_id); sessionStorage.setItem("cs_session", session_id);
  return { anonymous_id, session_id };
}
function emit(event:string, metadata:Record<string,unknown>={}) {
  const context=ids(); const params=new URLSearchParams(location.search);
  void fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event,...context,metadata:{locale:"en-US",currency:"USD",market:"international",...metadata,utm_source:params.get("utm_source"),utm_medium:params.get("utm_medium"),utm_campaign:params.get("utm_campaign"),fbclid:params.get("fbclid")}})});
}

export default function ConsultEnClient() {
  const deck=useMemo(()=>getCards(DECK_IDS),[]);
  const [step,setStep]=useState(1); const [category,setCategory]=useState(""); const [question,setQuestion]=useState("");
  const [picked,setPicked]=useState<string[]>([]); const [name,setName]=useState(""); const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const chooseTheme=(key:string)=>{setCategory(key);setStep(2);emit("category_selected",{category:key});};
  const chooseQuestion=(value:string)=>{setQuestion(value);setStep(3);emit("question_written",{category,source:"preset"});};
  const toggleCard=(id:string)=>{setPicked((current)=>current.includes(id)?current.filter(x=>x!==id):current.length<3?[...current,id]:current);};
  const reveal=()=>{if(picked.length!==3)return;setStep(4);emit("cards_selected",{category,card_ids:picked});};
  async function checkout(e:React.FormEvent){e.preventDefault();setError("");setLoading(true);try{
    const context=ids(); const params=new URLSearchParams(location.search);
    emit("checkout_started",{category,value:1.99});
    const response=await fetch("/api/international/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,category,question,cardIds:picked,...context,utm_source:params.get("utm_source"),utm_medium:params.get("utm_medium"),utm_campaign:params.get("utm_campaign"),fbclid:params.get("fbclid")})});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||"Unable to start checkout."); location.href=data.url;
  }catch(err){setError(err instanceof Error?err.message:"Unable to start checkout.");}finally{setLoading(false);}}

  return <main className="en-consult-shell"><section className="en-consult-card">
    <a className="en-consult-brand" href="/en"><img src="/assets/brand/chama-sofia-logo.png" alt=""/><span>CHAMA SOFIA</span></a>
    <div className="en-progress"><span style={{width:`${step*20}%`}}/></div>
    {step===1&&<div className="en-consult-step"><p className="en-kicker">START WITH WHAT MOVES YOU</p><h1>What is taking up space in your mind?</h1><p>Choose the theme carrying the most desire, ambition or uncertainty right now.</p><div className="en-theme-grid">{THEMES.map(t=><button key={t.key} onClick={()=>chooseTheme(t.key)}><b>{t.icon}</b><strong>{t.title}</strong><small>{t.copy}</small></button>)}</div></div>}
    {step===2&&<div className="en-consult-step"><button className="en-back" onClick={()=>setStep(1)}>← Back</button><p className="en-kicker">MAKE IT SPECIFIC</p><h2>Which answer would matter to you today?</h2><div className="en-question-list">{QUESTIONS[category].map(q=><button key={q} onClick={()=>chooseQuestion(q)}>{q}</button>)}</div><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Or write your own question..."/><button className="en-cta" disabled={question.trim().length<10} onClick={()=>{setStep(3);emit("question_written",{category,source:"custom"});}}>CONTINUE <span>→</span></button></div>}
    {step===3&&<div className="en-consult-step"><button className="en-back" onClick={()=>setStep(2)}>← Back</button><p className="en-kicker">TRUST YOUR FIRST RESPONSE</p><h2>Choose the three cards that pull your attention.</h2><p>Do not overthink it. Curiosity, attraction or discomfort can all be meaningful signals.</p><div className="en-card-grid">{deck.map(card=><button key={card.id} className={picked.includes(card.id)?"picked":""} onClick={()=>toggleCard(card.id)}><img src={`/assets/tarot/cards/${card.id}.webp`} alt={englishCardCopy(card.id)?.name||card.name}/>{picked.includes(card.id)&&<span>{picked.indexOf(card.id)+1}</span>}</button>)}</div><p className="en-card-count">{picked.length}/3 selected</p><button className="en-cta" disabled={picked.length!==3} onClick={reveal}>REVEAL MY PREVIEW <span>→</span></button></div>}
    {step===4&&<div className="en-consult-step"><button className="en-back" onClick={()=>setStep(3)}>← Back</button><p className="en-kicker">YOUR COMBINATION IS UNIQUE TO THIS READING</p><h2>There is tension between what you want and what is taking shape.</h2><div className="en-preview-cards">{picked.map((id,index)=>{const card=getCards([id])[0];const copy=englishCardCopy(id);return <article key={id}><img src={`/assets/tarot/cards/${id}.webp`} alt={copy?.name||card?.name}/><strong>{copy?.name||card?.name}</strong><small>{index===0?'What brought you here':index===1?'What is active now':'What asks for movement'}</small></article>})}</div><div className="en-preview-box"><span>FIRST LAYER</span><p>Your cards are already describing a pattern. The full reading connects that pattern to your question, your birth chart and the current sky.</p></div><button className="en-cta" onClick={()=>{setStep(5);emit("offer_viewed",{value:1.99,currency:"USD",category});}}>UNLOCK THE FULL READING · $1.99 <span>→</span></button><small className="en-microcopy">One-time payment · no subscription · private result</small></div>}
    {step===5&&<div className="en-consult-step"><button className="en-back" onClick={()=>setStep(4)}>← Back</button><p className="en-kicker">YOUR READING IS RESERVED</p><h2>Unlock your full Astrology + Tarot reading.</h2><div className="en-checkout-summary"><span>Personalized digital reading</span><strong>$1.99</strong></div><form className="en-checkout-form" onSubmit={checkout}><label>Your name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label>Email for your private access<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>{error&&<p className="en-error">{error}</p>}<button className="en-cta" disabled={loading}>{loading?'OPENING SECURE CHECKOUT...':'CONTINUE TO SECURE CHECKOUT'} <span>→</span></button><small>Cards are processed through Stripe when international checkout is active. No subscription.</small></form></div>}
  </section></main>;
}
