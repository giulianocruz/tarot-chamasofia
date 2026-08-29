'use client';

import Link from 'next/link';
import { useCallback,useEffect,useState } from 'react';

type SpendEntry={id:number;spend_date:string;source:string;campaign:string;creative:string;amount_cents:number;created_at:string;updated_at:string};
type ViabilityData={
  period:string;
  metrics:{
    visitors:number;sales:number;revenue:number;baseRevenue:number;upsellRevenue:number;actualSpend:number;spendEntries:number;
    dailyBudget:number;plannedSpend:number|null;averageTicket:number;cac:number|null;roas:number|null;contribution:number;conversion:number;
    targetCac:number;breakEvenSales:number;currentPrice:number;currentPriceFormatted:string;
  };
  status:{level:string;label:string;message:string};
  entries:SpendEntry[];
};

const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);

export default function ViabilityClient(){
  const [data,setData]=useState<ViabilityData|null>(null);
  const [period,setPeriod]=useState('7d');
  const [unauthorized,setUnauthorized]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [spendDate,setSpendDate]=useState(localDate());
  const [amount,setAmount]=useState('');
  const [source,setSource]=useState('meta');
  const [campaign,setCampaign]=useState('tarot_lancamento');
  const [creative,setCreative]=useState('');

  const load=useCallback(async(currentPeriod=period)=>{
    const response=await fetch(`/api/admin/viability?period=${encodeURIComponent(currentPeriod)}`,{cache:'no-store'});
    if(response.status===401){setUnauthorized(true);setData(null);return;}
    if(!response.ok){setMessage('Não foi possível carregar a viabilidade.');return;}
    const result=await response.json() as ViabilityData;
    setUnauthorized(false);setData(result);
  },[period]);

  useEffect(()=>{void load();},[load]);

  async function saveSpend(event:React.FormEvent){
    event.preventDefault();setMessage('');
    const amountCents=Math.round(Number(amount.replace(',','.'))*100);
    if(!Number.isFinite(amountCents)||amountCents<=0){setMessage('Informe o gasto real do dia.');return;}
    setBusy(true);
    const response=await fetch('/api/admin/viability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',spendDate,amountCents,source,campaign,creative})});
    const result=await response.json() as {error?:string};
    setBusy(false);
    if(!response.ok){setMessage(result.error||'Falha ao salvar gasto.');return;}
    setMessage('Gasto real registrado. CAC e ROAS foram recalculados.');setAmount('');
    await load();
  }

  async function removeSpend(id:number){
    if(!window.confirm('Excluir este lançamento de mídia?'))return;
    setBusy(true);setMessage('');
    const response=await fetch('/api/admin/viability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id})});
    const result=await response.json() as {error?:string};setBusy(false);
    if(!response.ok){setMessage(result.error||'Falha ao excluir gasto.');return;}
    setMessage('Lançamento excluído.');await load();
  }

  if(unauthorized)return <main className="admin-login"><div><span className="brand-mark">✦</span><p className="eyebrow">Chama Sofia</p><h1>Viabilidade</h1><p>Entre primeiro no cockpit administrativo para abrir este módulo.</p><Link className="primary-button" href="/oraculo-gestao-7f3a">IR PARA O COCKPIT</Link></div></main>;
  if(!data)return <main className="admin-login">Carregando viabilidade...</main>;
  const m=data.metrics;

  return <main className="admin-shell">
    <header><div><p className="eyebrow">Cockpit comercial</p><h1>Viabilidade real</h1><p>CAC e ROAS calculados somente com gasto de mídia efetivamente registrado.</p></div><div className="admin-actions"><Link href="/oraculo-gestao-7f3a">← Cockpit principal</Link><button onClick={()=>void load()}>Atualizar</button></div></header>

    <section className="admin-filters"><label>Período<select value={period} onChange={event=>setPeriod(event.target.value)}><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="all">Todo período</option></select></label><small>Orçamento planejado: {money(m.dailyBudget)}/dia. A estimativa não entra no CAC/ROAS deste módulo.</small></section>

    <section className="metrics">{[
      ['Gasto real',money(m.actualSpend)],['Receita real',money(m.revenue)],['Contribuição após mídia',money(m.contribution)],['Vendas reais',m.sales],
      ['CAC',m.cac===null?'—':money(m.cac)],['Meta de CAC',money(m.targetCac)],['ROAS',m.roas===null?'—':`${m.roas.toFixed(2)}x`],['Conversão',`${(m.conversion*100).toFixed(2)}%`],
      ['Ticket médio',money(m.averageTicket)],['Visitantes',m.visitors],['Receita de upsell',money(m.upsellRevenue)],['Vendas p/ cobrir mídia',m.breakEvenSales]
    ].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</section>

    <section className={`guardian guardian-${data.status.level}`}><div><span>VIABILIDADE DA MÍDIA</span><strong>{data.status.label}</strong><p>{data.status.message}</p><small>Contribuição considera receita menos mídia e ainda não desconta taxas de pagamento ou impostos.</small></div><div className="economics"><p>Preço de entrada atual: <b>{m.currentPriceFormatted}</b></p><p>Gasto lançado no período: <b>{m.spendEntries} registro(s)</b></p><p>Planejado no período: <b>{m.plannedSpend===null?'—':money(m.plannedSpend)}</b></p><p>Regra verde: <b>CAC ≤ 50% do ticket + contribuição positiva.</b></p></div></section>

    <section className="behavior-panel"><div className="panel-title"><div><p className="eyebrow">Meta Ads</p><h2>Registrar gasto real</h2></div><span>um lançamento por data + origem + campanha + criativo</span></div>
      <form className="admin-filters" onSubmit={saveSpend}>
        <label>Data<input type="date" required value={spendDate} onChange={event=>setSpendDate(event.target.value)}/></label>
        <label>Gasto real (R$)<input inputMode="decimal" placeholder="5,89" required value={amount} onChange={event=>setAmount(event.target.value)}/></label>
        <label>Origem<input value={source} onChange={event=>setSource(event.target.value)} placeholder="meta"/></label>
        <label>Campanha<input value={campaign} onChange={event=>setCampaign(event.target.value)} placeholder="tarot_lancamento"/></label>
        <label>Criativo<input value={creative} onChange={event=>setCreative(event.target.value)} placeholder="opcional"/></label>
        <button className="primary-button" disabled={busy}>{busy?'SALVANDO...':'REGISTRAR GASTO'}</button>
      </form>{message&&<p>{message}</p>}
    </section>

    <section className="behavior-panel"><div className="panel-title"><h2>Últimos lançamentos de mídia</h2><span>{data.entries.length} registro(s) exibido(s)</span></div>
      {data.entries.length===0?<p>Nenhum gasto real registrado ainda.</p>:<div className="behavior-grid">{data.entries.map(entry=><div key={entry.id}><span>{entry.spend_date} · {entry.source}</span><strong>{money(entry.amount_cents)}</strong><small>{entry.campaign||'sem campanha'}{entry.creative?` · ${entry.creative}`:''}</small><button disabled={busy} onClick={()=>void removeSpend(entry.id)}>Excluir</button></div>)}</div>}
    </section>
  </main>;
}
