"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MAJOR_ARCANA, type TarotCard } from '@/lib/tarot';
import styles from './page.module.css';

const PRESETS = [
  'O que preciso compreender sobre esta relação agora?',
  'O que as atitudes dessa pessoa mostram e o que preciso observar?',
  'Qual limite ou próximo passo pode me trazer mais clareza no amor?',
];
const POSITIONS = [
  ['DINÂMICA', 'O que aparece na relação agora'],
  ['PONTO DE ATENÇÃO', 'O que merece cautela ou mais clareza'],
  ['ORIENTAÇÃO', 'O que você pode levar para o próximo passo'],
] as const;

function storedId(storage: Storage, key: string) {
  let value=storage.getItem(key);
  if (!value) { value=crypto.randomUUID(); storage.setItem(key,value); }
  return value;
}
function track(event:string, metadata:Record<string,unknown>={}) {
  if (typeof window==='undefined') return;
  const anonymous_id=storedId(localStorage,'cs_anon');
  const session_id=storedId(sessionStorage,'cs_session');
  void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,anonymous_id,metadata:{...metadata,session_id,surface:'tarot_do_amor_gratis'}}),keepalive:true});
}

function shuffledNine() {
  const deck=[...MAJOR_ARCANA];
  for (let i=deck.length-1;i>0;i-=1) {
    const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck.slice(0,9);
}
export default function LoveTarotClient() {
  const [stage,setStage]=useState<'question'|'cards'|'result'>('question');
  const [question,setQuestion]=useState('');
  const [deck,setDeck]=useState<TarotCard[]>(()=>MAJOR_ARCANA.slice(0,9));
  const [selected,setSelected]=useState<number[]>([]);
  const [shareStatus,setShareStatus]=useState('');
  const cards=useMemo(()=>selected.map(index=>deck[index]).filter(Boolean),[deck,selected]);

  function begin(value:string) {
    const clean=value.trim();
    if (clean.length<10) return;
    setQuestion(clean); setDeck(shuffledNine()); setSelected([]); setStage('cards');
    track('tarot_started',{category:'Amor e relacionamentos',question_mode:PRESETS.includes(clean)?'preset':'custom'});
  }
  function toggle(index:number) {
    setSelected(current=>current.includes(index)?current.filter(item=>item!==index):current.length<3?[...current,index]:current);
  }
  function reveal() {
    if (selected.length!==3) return;
    track('cards_selected',{card_ids:cards.map(card=>card.id),free_tool:true});
    track('reading_preview',{card_ids:cards.map(card=>card.id),free_tool:true});
    setStage('result');
  }
  async function shareTool() {
    const data={title:'Tarot do Amor Grátis · Chama Sofia',text:'Escolha 3 cartas e faça uma leitura gratuita de Tarot do amor.',url:'https://tarot.chamasofia.com.br/tarot-do-amor-gratis'};
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setShareStatus('Link copiado'); }
      track('cta_click',{target:'share_free_tarot'});
    } catch { /* compartilhamento cancelado */ }
  }

  if (stage==='question') return <section className={styles.toolCard} id="tiragem">
    <div className={styles.toolHeading}><span>♡</span><div><strong>Comece pela pergunta</strong><small>Escolha uma opção ou escreva com suas palavras</small></div></div>
    <div className={styles.presets}>{PRESETS.map(preset=><button key={preset} type="button" onClick={()=>begin(preset)}>{preset}<span>→</span></button>)}</div>
    <div className={styles.divider}><span>ou</span></div>
    <form onSubmit={event=>{event.preventDefault();begin(question);}} className={styles.questionForm}>
      <label>Sua pergunta<textarea maxLength={240} value={question} onChange={event=>setQuestion(event.target.value)} placeholder="Ex.: O que preciso observar antes de continuar investindo nesta relação?" /></label>
      <small>{question.length}/240 · mínimo de 10 caracteres</small>
      <button disabled={question.trim().length<10} className={styles.mainButton}>ESCOLHER MINHAS 3 CARTAS <span>→</span></button>
    </form>
  </section>;
  if (stage==='cards') return <section className={styles.toolCard}>
    <button type="button" className={styles.backButton} onClick={()=>setStage('question')}>← mudar pergunta</button>
    <div className={styles.toolHeading}><span>✦</span><div><strong>Escolha 3 cartas</strong><small>Toque nas que mais chamarem sua atenção</small></div></div>
    <p className={styles.questionEcho}>“{question}”</p>
    <div className={styles.cardGrid}>
      {deck.map((card,index)=><button type="button" key={card.id} aria-pressed={selected.includes(index)} className={selected.includes(index)?styles.picked:''} onClick={()=>toggle(index)}>
        <img src="/assets/tarot/cards/verso-premium.jpg" alt="Carta virada" loading="lazy" />
        <span>{selected.includes(index)?selected.indexOf(index)+1:''}</span>
      </button>)}
    </div>
    <p className={styles.counter}>{selected.length}/3 escolhidas</p>
    <button type="button" disabled={selected.length!==3} className={styles.mainButton} onClick={reveal}>REVELAR MINHA LEITURA <span>→</span></button>
  </section>;

  return <section className={`${styles.toolCard} ${styles.resultCard}`}>
    <div className={styles.resultHeading}><span>♡</span><div><strong>Sua tiragem está aberta</strong><small>Leia as três cartas como uma sequência</small></div></div>
    <p className={styles.questionEcho}>“{question}”</p>
    <div className={styles.revealedCards}>{cards.map((card,index)=><article key={card.id}>
      <span>{POSITIONS[index][0]}</span><img src={card.image} alt={card.name}/><strong>{card.name}</strong><small>{card.keywords.slice(0,2).join(' · ')}</small>
    </article>)}</div>
    <div className={styles.readingText}>{cards.map((card,index)=><article key={card.id}>
      <span>{POSITIONS[index][0]}</span><h3>{card.name}</h3><p>{card.interpretationByCategory['Amor e relacionamentos']} Nesta posição, observe {card.keywords.slice(0,2).join(' e ')} sem ignorar o alerta para {card.alert.toLowerCase()}</p>
    </article>)}</div>
    <div className={styles.synthesis}><strong>Leitura em conjunto</strong><p>{cards[0].name} abre a dinâmica com {cards[0].keywords[0]}; {cards[1].name} chama atenção para {cards[1].keywords[0]}; e {cards[2].name} orienta a buscar {cards[2].constructive.toLowerCase()}. Compare essa sequência com atitudes reais, reciprocidade e seus próprios limites antes de tomar uma decisão.</p></div>
    <div className={styles.unlockBox}>
      <span>QUER APROFUNDAR ESTA PERGUNTA?</span><h3>Cruze as cartas com seu mapa natal e o céu do momento.</h3><p>O AstroTarot adiciona sua astrologia à leitura e entrega uma análise personalizada em PDF. Você vê a prévia antes do Pix.</p>
      <Link href="/consulta?utm_source=organic&utm_medium=free_tool&utm_campaign=tarot_amor_gratis&utm_content=result_cta" onClick={()=>track('cta_click',{target:'astrotarot_from_free_love'})} className={styles.mainButton}>VER ANÁLISE ASTROTAROT <span>→</span></Link>
      <small>Pagamento único de R$ 9,90 somente se você decidir aprofundar.</small>
    </div>
    <div className={styles.resultActions}>
      <button type="button" onClick={()=>{setDeck(shuffledNine());setSelected([]);setStage('cards');}}>Tirar outras 3 cartas</button>
      <button type="button" onClick={()=>void shareTool()}>{shareStatus||'Compartilhar ferramenta'}</button>
    </div>
    <p className={styles.disclaimer}>Tarot é apresentado como ferramenta simbólica de reflexão e autoconhecimento. Esta leitura não garante acontecimentos futuros nem substitui conversa, evidências ou orientação profissional.</p>
  </section>;
}
