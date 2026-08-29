import { isAdmin } from '@/lib/admin';
import { addAdminAudit, ensureSchema, getCurrentPrice, getD1 } from '@/lib/database';
import { cleanText, sameOrigin } from '@/lib/security';

export const dynamic='force-dynamic';

type Period='today'|'yesterday'|'7d'|'30d'|'all';
type SpendRow={id:number;spend_date:string;source:string;campaign:string;creative:string;amount_cents:number;created_at:string;updated_at:string};

function normalizePeriod(value:string|null):Period {
  return value==='today'||value==='yesterday'||value==='7d'||value==='30d'||value==='all'?value:'7d';
}

function dateCondition(column:string,period:Period) {
  if(period==='today') return `date(${column})=date('now')`;
  if(period==='yesterday') return `date(${column})=date('now','-1 day')`;
  if(period==='7d') return `date(${column})>=date('now','-6 days')`;
  if(period==='30d') return `date(${column})>=date('now','-29 days')`;
  return '1=1';
}

function plannedDays(period:Period) {
  if(period==='today'||period==='yesterday') return 1;
  if(period==='7d') return 7;
  if(period==='30d') return 30;
  return null;
}

async function ensureSpendSchema() {
  await ensureSchema();
  const db=getD1();
  await db.prepare(`CREATE TABLE IF NOT EXISTS ad_spend_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spend_date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'meta',
    campaign TEXT NOT NULL DEFAULT '',
    creative TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(spend_date,source,campaign,creative)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend_daily(spend_date)').run();
}

export async function GET(request:Request) {
  if(!(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});
  await ensureSpendSchema();
  const db=getD1();
  const period=normalizePeriod(new URL(request.url).searchParams.get('period'));
  const orderDate=dateCondition('created_at',period);
  const visitDate=dateCondition('first_seen_at',period);
  const spendDate=dateCondition('spend_date',period);

  const [totals,visitors,spendTotal,entries,budget,pricing]=await Promise.all([
    db.prepare(`SELECT
      COUNT(*) sales,
      SUM(price) base_revenue,
      SUM(CASE WHEN upsell_status='paid' THEN COALESCE(upsell_price,0) ELSE 0 END) upsell_revenue
      FROM orders
      WHERE is_test=0
        AND (payment_status='paid' OR reading_status IN ('reading_generated','delivered'))
        AND ${orderDate}`).first<{sales:number;base_revenue:number;upsell_revenue:number}>(),
    db.prepare(`SELECT COUNT(DISTINCT anonymous_id) visitors FROM visitor_sessions WHERE is_test=0 AND ${visitDate}`).first<{visitors:number}>(),
    db.prepare(`SELECT COUNT(*) entries,COALESCE(SUM(amount_cents),0) amount FROM ad_spend_daily WHERE ${spendDate}`).first<{entries:number;amount:number}>(),
    db.prepare('SELECT id,spend_date,source,campaign,creative,amount_cents,created_at,updated_at FROM ad_spend_daily ORDER BY spend_date DESC,id DESC LIMIT 45').all<SpendRow>(),
    db.prepare("SELECT value_cents FROM operation_settings WHERE key='ad_spend_daily_cents'").first<{value_cents:number}>(),
    getCurrentPrice(),
  ]);

  const sales=Number(totals?.sales||0);
  const baseRevenue=Number(totals?.base_revenue||0);
  const upsellRevenue=Number(totals?.upsell_revenue||0);
  const revenue=baseRevenue+upsellRevenue;
  const visitorsCount=Number(visitors?.visitors||0);
  const actualSpend=Number(spendTotal?.amount||0);
  const spendEntries=Number(spendTotal?.entries||0);
  const dailyBudget=Number(budget?.value_cents||1000);
  const days=plannedDays(period);
  const plannedSpend=days===null?null:dailyBudget*days;
  const averageTicket=sales?Math.round(revenue/sales):0;
  const cac=sales&&actualSpend?Math.round(actualSpend/sales):null;
  const roas=actualSpend?revenue/actualSpend:null;
  const contribution=revenue-actualSpend;
  const conversion=visitorsCount?sales/visitorsCount:0;
  const targetCac=Math.max(1,Math.round((averageTicket||pricing.cents)*0.5));
  const breakEvenSales=actualSpend?Math.ceil(actualSpend/Math.max(1,pricing.cents)):0;

  const status=actualSpend===0
    ? {level:'yellow',label:'SEM GASTO REAL',message:'Registre o valor efetivamente gasto na Meta para calcular CAC e ROAS sem estimativa.'}
    : sales===0&&actualSpend>=targetCac*2
      ? {level:'red',label:'PREJUÍZO EM OBSERVAÇÃO',message:'Já houve gasto real relevante sem nenhuma venda comercial confirmada neste período.'}
      : sales===0
        ? {level:'yellow',label:'AMOSTRA INICIAL',message:'Há gasto real, mas ainda não há venda suficiente para calcular CAC.'}
        : cac!==null&&cac<=targetCac&&contribution>0
          ? {level:'green',label:'VIÁVEL',message:'CAC está dentro da meta de até 50% do ticket e a contribuição após mídia está positiva.'}
          : contribution>=0
            ? {level:'yellow',label:'NO LIMITE',message:'A mídia foi coberta, mas o CAC ainda não atingiu a meta de segurança.'}
            : {level:'red',label:'NEGATIVO',message:'A receita real do período ainda não cobre o gasto real de mídia.'};

  return Response.json({
    period,
    metrics:{
      visitors:visitorsCount,sales,revenue,baseRevenue,upsellRevenue,actualSpend,spendEntries,dailyBudget,plannedSpend,
      averageTicket,cac,roas,contribution,conversion,targetCac,breakEvenSales,currentPrice:pricing.cents,currentPriceFormatted:pricing.formatted,
    },
    status,
    entries:entries.results,
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request) {
  if(!sameOrigin(request)||!(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});
  await ensureSpendSchema();
  const db=getD1();
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const action=cleanText(body.action,30);

  if(action==='delete') {
    const id=Math.max(0,Math.round(Number(body.id)||0));
    if(!id) return Response.json({error:'Lançamento inválido.'},{status:400});
    await db.prepare('DELETE FROM ad_spend_daily WHERE id=?').bind(id).run();
    await addAdminAudit('delete_ad_spend',null,{id});
    return Response.json({ok:true});
  }

  if(action!=='save') return Response.json({error:'Ação inválida.'},{status:400});
  const spendDate=cleanText(body.spendDate,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(spendDate)) return Response.json({error:'Data inválida.'},{status:400});
  const amountCents=Math.max(0,Math.min(10000000,Math.round(Number(body.amountCents)||0)));
  if(!amountCents) return Response.json({error:'Informe um gasto maior que zero.'},{status:400});
  const source=cleanText(body.source,60)||'meta';
  const campaign=cleanText(body.campaign,150)||'';
  const creative=cleanText(body.creative,150)||'';
  const now=new Date().toISOString();

  await db.prepare(`INSERT INTO ad_spend_daily (spend_date,source,campaign,creative,amount_cents,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(spend_date,source,campaign,creative)
    DO UPDATE SET amount_cents=excluded.amount_cents,updated_at=excluded.updated_at`)
    .bind(spendDate,source,campaign,creative,amountCents,now,now).run();
  await addAdminAudit('save_ad_spend',null,{spendDate,source,campaign,creative,amountCents});
  return Response.json({ok:true});
}
