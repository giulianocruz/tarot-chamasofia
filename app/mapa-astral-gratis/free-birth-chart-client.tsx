"use client";

import { useState } from 'react';
import type { FreeNatalPreview, AstroPlanet } from '@/lib/astrology-types';
import styles from './page.module.css';

const SIGN_PT:Record<string,string>={Aries:'Áries',Taurus:'Touro',Gemini:'Gêmeos',Cancer:'Câncer',Leo:'Leão',Virgo:'Virgem',Libra:'Libra',Scorpio:'Escorpião',Sagittarius:'Sagitário',Capricorn:'Capricórnio',Aquarius:'Aquário',Pisces:'Peixes'};
const ITEMS:Array<[keyof FreeNatalPreview['natal'],string,string]>=[
  ['sun','☉','Sol'],['moon','☾','Lua'],['mercury','☿','Mercúrio'],['venus','♀','Vênus'],['mars','♂','Marte'],['ascendantSign','ASC','Ascendente'],
];

function signName(value:string|undefined){return value ? SIGN_PT[value]||value : '—';}
function emit(event:string,metadata:Record<string,unknown>={}){
  void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event,metadata:{surface:'mapa-astral-gratis',...metadata}}),keepalive:true});
}
function planetText(value:AstroPlanet|undefined){
  if(!value)return 'Não calculado';
  const degree=Number.isFinite(value.degree)?` · ${Number(value.degree).toFixed(1)}°`:'';
  return `${signName(value.sign)}${degree}`;
}

export default function FreeBirthChartClient(){
  const [birthDate,setBirthDate]=useState('');
  const [birthTime,setBirthTime]=useState('');
  const [birthPlace,setBirthPlace]=useState('');
  const [timeKnown,setTimeKnown]=useState(true);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<FreeNatalPreview|null>(null);
  async function submit(event:React.FormEvent){
    event.preventDefault(); setError(''); setLoading(true); setResult(null);
    emit('form_step_view',{step:'free_birth_chart_submit',time_known:timeKnown});
    try{
      const response=await fetch('/api/astrology/free-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({birthDate,birthTime,timeKnown,birthPlace})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Não foi possível calcular sua prévia.');
      const preview=data.preview as FreeNatalPreview;
      setResult(preview);
      try{localStorage.setItem('cs_free_birth',JSON.stringify({birthDate,birthTime,timeKnown,birthPlace}));}catch{}
    }catch(reason){setError(reason instanceof Error?reason.message:'Tente novamente.');}
    finally{setLoading(false);}
  }
  function restart(){setResult(null);setError('');}
  function trackCta(){emit('cta_click',{target:'astrotarot',source:'free_birth_chart_result'});}

  return <section className={styles.toolCard} id="calcular">
    {!result ? <>
      <div className={styles.toolHeading}><span>✦</span><div><strong>Seu mapa começa aqui</strong><small>Resultado em alguns segundos</small></div></div>
      <form onSubmit={submit} className={styles.form}>
        <label>Data de nascimento<input required type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)}/></label>
        <div className={styles.timeRow}>
          <label>Horário de nascimento<input required={timeKnown} disabled={!timeKnown} type="time" value={birthTime} onChange={(e)=>setBirthTime(e.target.value)}/></label>
          <label className={styles.unknown}><input type="checkbox" checked={!timeKnown} onChange={(e)=>{setTimeKnown(!e.target.checked);if(e.target.checked)setBirthTime('');}}/> Não sei o horário</label>
        </div>
        <label>Cidade de nascimento<input required value={birthPlace} onChange={(e)=>setBirthPlace(e.target.value)} placeholder="Ex.: Botucatu, SP, Brasil" autoComplete="off"/></label>
        <p className={styles.dataNote}>Usamos a cidade para localizar coordenadas e o fuso histórico do nascimento. Seus dados servem apenas para calcular esta prévia.</p>
        {error&&<p className={styles.error}>{error}</p>}
        <button className={styles.calculateButton} disabled={loading}>{loading?'CALCULANDO SEU CÉU...':'VER MEU MAPA ASTRAL GRÁTIS'}<span>→</span></button>
      </form>
    </> : <>
      <div className={styles.resultHeading}><div><span>MAPA NATAL · PRÉVIA</span><h2>Seus principais pontos</h2><p>{result.birth.resolvedPlace}</p></div><button onClick={restart}>refazer</button></div>
      <div className={styles.resultGrid}>
        {ITEMS.map(([key,icon,label])=>{
          const isAsc=key==='ascendantSign';
          const value=isAsc ? (result.birth.timeKnown?signName(result.natal.ascendantSign):'Horário necessário') : planetText(result.natal[key] as AstroPlanet|undefined);
          return <article key={String(key)}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
        })}
      </div>
      <p className={styles.precision}>{result.precisionNote}</p>
      <div className={styles.resultUpsell}><span>PRÓXIMA CAMADA</span><strong>Agora aplique seu mapa a uma pergunta real.</strong><p>Escolha 3 cartas, veja uma prévia e, se quiser aprofundar, libere o cruzamento com seu mapa e o céu atual.</p>
        <a onClick={trackCta} href="/consulta?utm_source=organic&utm_medium=free_tool&utm_campaign=mapa_astral_gratis&utm_content=result_cta">CRUZAR MAPA + 3 CARTAS <b>→</b></a>
      </div>
    </>}
  </section>;
}
