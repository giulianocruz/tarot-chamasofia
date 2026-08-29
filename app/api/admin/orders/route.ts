import { isAdmin } from '@/lib/admin';
import { addAdminAudit, ensureSchema, getCurrentPrice, getD1 } from '@/lib/database';
import { completePayment } from '@/lib/payment';
import { runRecoverySweep } from '@/lib/recovery';
import { cleanText, sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';
type QueryFilters = { period:string;source:string;campaign:string;creative:string;device:string;variant:string;offer:string };

function dateCondition(column:string,period:string) {
  if (period==='today') return `date(${column})=date('now')`;
  if (period==='yesterday') return `date(${column})=date('now','-1 day')`;
  if (period==='7d') return `datetime(${column})>=datetime('now','-7 days')`;
  if (period==='30d') return `datetime(${column})>=datetime('now','-30 days')`;
  return '1=1';
}

function filteredWhere(alias:string,dateColumn:string,filters:QueryFilters,isTest=0,orders=false) {
  const clauses=[`${alias}.is_test=?`,dateCondition(`${alias}.${dateColumn}`,filters.period)];
  const values:unknown[]=[isTest];
  if(filters.source!=='all'){clauses.push(`COALESCE(NULLIF(${alias}.utm_source,''),'direto')=?`);values.push(filters.source);}
  if(filters.campaign!=='all'){clauses.push(`COALESCE(NULLIF(${alias}.utm_campaign,''),'sem_campanha')=?`);values.push(filters.campaign);}
  if(filters.creative!=='all'){clauses.push(`COALESCE(NULLIF(${alias}.utm_content,''),'sem_criativo')=?`);values.push(filters.creative);}
  if(filters.device!=='all'){clauses.push(`COALESCE(NULLIF(${alias}.device_type,''),'unknown')=?`);values.push(filters.device);}
  if(filters.variant!=='all'){clauses.push(`${alias}.landing_variant=?`);values.push(filters.variant);}
  if(orders&&filters.offer!=='all'){clauses.push(`${alias}.offer_code=?`);values.push(filters.offer);}
  return {sql:clauses.join(' AND '),values};
}

function statement(sql:string,values:unknown[]) {
  const prepared=getD1().prepare(sql);
  return values.length?prepared.bind(...values):prepared;
}

export async function GET(request:Request) {
  if(!(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});
  await ensureSchema();
  await runRecoverySweep(10).catch(()=>undefined);
  const url=new URL(request.url);
  const candidatePeriod=url.searchParams.get('period')||'';
  const filters:QueryFilters={
    period:['today','yesterday','7d','30d','all'].includes(candidatePeriod)?candidatePeriod:'30d',
    source:cleanText(url.searchParams.get('source'),100)||'all',campaign:cleanText(url.searchParams.get('campaign'),150)||'all',
    creative:cleanText(url.searchParams.get('creative'),150)||'all',device:cleanText(url.searchParams.get('device'),20)||'all',
    variant:cleanText(url.searchParams.get('variant'),1)||'all',offer:cleanText(url.searchParams.get('offer'),30)||'all',
  };
  const sessionWhere=filteredWhere('s','first_seen_at',filters);
  const orderWhere=filteredWhere('o','created_at',filters,0,true);
  const [ordersResult,totals,visits,events,pricing,leadTotals,testTotals,sourceOptions,campaignOptions,creativeOptions,spend,pricePerformance] = await Promise.all([
    statement(`SELECT o.id,o.order_number,o.public_token,o.customer_name,o.customer_email,o.customer_whatsapp,o.category,o.question,o.price,o.payment_status,o.reading_status,o.cards_json,o.created_at,o.paid_at,o.utm_source,o.utm_medium,o.utm_campaign,o.utm_content,o.device_type,o.notification_status,o.notification_error,o.gateway_name,o.recovery_first_sent_at,o.recovery_second_sent_at,o.recovery_error,o.is_test,o.landing_variant,o.offer_code,o.upsell_status FROM orders o WHERE ${orderWhere.sql} ORDER BY o.id DESC LIMIT 100`,orderWhere.values).all(),
    statement(`SELECT COUNT(*) total,SUM(CASE WHEN o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) sales,SUM(CASE WHEN o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered') THEN o.price ELSE 0 END) revenue,SUM(CASE WHEN (o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered')) AND o.offer_code='essential' THEN o.price ELSE 0 END) essential_revenue,SUM(CASE WHEN (o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered')) AND o.offer_code='complete' THEN o.price ELSE 0 END) complete_revenue,SUM(CASE WHEN (o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered')) AND o.offer_code='essential' THEN 1 ELSE 0 END) essential_sales,SUM(CASE WHEN (o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered')) AND o.offer_code='complete' THEN 1 ELSE 0 END) complete_sales,SUM(CASE WHEN o.payment_status='pending' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN o.reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) generated,SUM(CASE WHEN o.upsell_status='paid' THEN o.upsell_price ELSE 0 END) upsell_revenue,SUM(CASE WHEN o.upsell_status='paid' THEN 1 ELSE 0 END) upsells FROM orders o WHERE ${orderWhere.sql}`,orderWhere.values).first<Record<string,number>>(),
    statement(`SELECT COUNT(*) sessions,COUNT(DISTINCT s.anonymous_id) visitors FROM visitor_sessions s WHERE ${sessionWhere.sql}`,sessionWhere.values).first<{sessions:number;visitors:number}>(),
    statement(`SELECT e.event_name,COUNT(DISTINCT COALESCE(e.session_id,'event:'||e.id)) count FROM analytics_events e JOIN visitor_sessions s ON s.session_id=e.session_id WHERE e.is_test=0 AND ${sessionWhere.sql} GROUP BY e.event_name`,sessionWhere.values).all<{event_name:string;count:number}>(),
    getCurrentPrice(),
    getD1().prepare('SELECT COUNT(*) total,SUM(CASE WHEN converted_order_id IS NULL THEN 1 ELSE 0 END) open FROM abandoned_leads WHERE is_test=0').first<Record<string,number>>(),
    getD1().prepare(`SELECT COUNT(*) total,SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) sales,SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN price ELSE 0 END) revenue,SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) pending FROM orders WHERE is_test=1`).first<Record<string,number>>(),
    getD1().prepare("SELECT DISTINCT COALESCE(NULLIF(utm_source,''),'direto') value FROM visitor_sessions WHERE is_test=0 ORDER BY value").all<{value:string}>(),
    getD1().prepare("SELECT DISTINCT COALESCE(NULLIF(utm_campaign,''),'sem_campanha') value FROM visitor_sessions WHERE is_test=0 ORDER BY value").all<{value:string}>(),
    getD1().prepare("SELECT DISTINCT COALESCE(NULLIF(utm_content,''),'sem_criativo') value FROM visitor_sessions WHERE is_test=0 ORDER BY value").all<{value:string}>(),
    getD1().prepare("SELECT value_cents FROM operation_settings WHERE key='ad_spend_daily_cents'").first<{value_cents:number}>(),
    statement(`SELECT o.price,COUNT(*) checkouts,SUM(CASE WHEN o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) sales FROM orders o WHERE ${orderWhere.sql} GROUP BY o.price ORDER BY o.price`,orderWhere.values).all<{price:number;checkouts:number;sales:number}>(),
  ]);
  const sales=Number(totals?.sales||0), baseRevenue=Number(totals?.revenue||0), upsellRevenue=Number(totals?.upsell_revenue||0), revenue=baseRevenue+upsellRevenue;
  const eventCounts=Object.fromEntries(events.results.map((item)=>[item.event_name,Number(item.count)]));
  const eventMax=(...names:string[])=>Math.max(0,...names.map((name)=>Number(eventCounts[name]||0)));
  const visitors=Number(visits?.visitors||0),sessions=Number(visits?.sessions||0),dailySpend=Number(spend?.value_cents||1000);
  const days=filters.period==='today'||filters.period==='yesterday'?1:filters.period==='7d'?7:filters.period==='30d'?30:0;
  const estimatedSpend=days?dailySpend*days:0;
  const cac=sales&&estimatedSpend?Math.round(estimatedSpend/sales):null,roas=estimatedSpend?revenue/estimatedSpend:null, revenuePerVisitor=visitors?Math.round(revenue/visitors):0;
  const cta=eventMax('cta_click','tarot_started','start_question'),questions=eventMax('question_completed'),offers=eventMax('offer_viewed','offer_view'),pix=eventMax('pix_generated');
  const abandonment={beforeCta:Math.max(visitors-cta,0),afterCta:Math.max(cta-questions,0),afterQuestion:Math.max(questions-offers,0),afterOffer:Math.max(offers-pix,0),afterPix:Math.max(pix-sales,0)};
  const guardian=visitors<30?{level:'yellow',label:'AMOSTRA INSUFICIENTE',message:'Acumule mais visitas reais antes de concluir sobre rentabilidade.'}
    : cta===0?{level:'red',label:'ATENÇÃO',message:'Há visitantes, mas nenhum início de jornada no período.'}
    : pix>=3&&sales===0?{level:'red',label:'ATENÇÃO',message:'Há vários Pix sem pagamento confirmado. Verifique confiança e webhook.'}
    : estimatedSpend>=3000&&sales===0?{level:'red',label:'ATENÇÃO',message:'Há gasto relevante estimado sem venda real.'}
    : {level:'green',label:'SAUDÁVEL',message:'Nenhuma intervenção imediata detectada.'};
  return Response.json({orders:ordersResult.results,filters:{selected:filters,options:{sources:sourceOptions.results.map(x=>x.value),campaigns:campaignOptions.results.map(x=>x.value),creatives:creativeOptions.results.map(x=>x.value),devices:['mobile','tablet','desktop','unknown'],variants:['A','B'],offers:['essential','complete']}},dashboard:{
    visitors,sessions,totalSales:sales,revenue,baseRevenue,essentialRevenue:Number(totals?.essential_revenue||0),completeRevenue:Number(totals?.complete_revenue||0),upsellRevenue,upsells:Number(totals?.upsells||0),completeSales:Number(totals?.complete_sales||0),completeAdoption:sales?Number(totals?.complete_sales||0)/sales:0,upsellRate:Number(totals?.essential_sales||0)?Number(totals?.upsells||0)/Number(totals?.essential_sales||0):0,averageTicket:sales?Math.round(revenue/sales):0,pending:Number(totals?.pending||0),generated:Number(totals?.generated||0),conversion:visitors?sales/visitors:0,pricing,
    test:{total:Number(testTotals?.total||0),sales:Number(testTotals?.sales||0),revenue:Number(testTotals?.revenue||0),pending:Number(testTotals?.pending||0)},
    funnel:{visitors,sessions,cta,questions,offers,pix,paid:sales},behavior:{depth25:eventMax('scroll_25','scroll_depth_25'),depth50:eventMax('scroll_50','scroll_depth_50'),depth75:eventMax('scroll_75','scroll_depth_75'),depth90:eventMax('scroll_90','scroll_depth_90'),faqOpened:eventMax('faq_opened','faq_open'),contactClicks:eventMax('support_clicked','contact_click'),pageHidden:eventMax('page_hidden','page_exit'),questionStarted:eventMax('question_started'),lastActivity:eventMax('last_activity')},
    recovery:{openForms:Number(leadTotals?.open||0),formFirst:eventMax('recovery_form_1_sent'),pixFirst:eventMax('recovery_pix_1_sent'),second:eventMax('recovery_form_2_sent')+eventMax('recovery_pix_2_sent'),resumed:eventMax('recovery_resumed')},growth:{referrals:eventMax('referral_qualified'),upsellClicks:eventMax('upsell_clicked')},
    abandonment,pricePerformance:pricePerformance.results.map(row=>({price:Number(row.price),checkouts:Number(row.checkouts),sales:Number(row.sales),conversion:Number(row.checkouts)?Number(row.sales)/Number(row.checkouts):0})),economics:{dailySpend,estimatedSpend,cac,roas,revenuePerVisitor},guardian,
  }},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request) {
  if(!sameOrigin(request)||!(await isAdmin(request))) return Response.json({error:'Não autorizado.'},{status:401});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const orderNumber=cleanText(body.orderNumber,40),action=cleanText(body.action,30);
  await ensureSchema();
  if(action==='update_spend'||action==='update_settings') {
    const spendCents=Math.max(0,Math.min(100000,Math.round(Number(body.valueCents)||0)));
    const completeCents=Math.max(990,Math.min(100000,Math.round(Number(body.completeCents)||1990)));
    const upsellCents=Math.max(0,Math.min(100000,Math.round(Number(body.upsellCents)||990)));
    const now=new Date().toISOString();
    await getD1().batch([
      getD1().prepare("INSERT INTO operation_settings (key,value_cents,updated_at) VALUES ('ad_spend_daily_cents',?,?) ON CONFLICT(key) DO UPDATE SET value_cents=excluded.value_cents,updated_at=excluded.updated_at").bind(spendCents,now),
      getD1().prepare("INSERT INTO operation_settings (key,value_cents,updated_at) VALUES ('complete_offer_cents',?,?) ON CONFLICT(key) DO UPDATE SET value_cents=excluded.value_cents,updated_at=excluded.updated_at").bind(completeCents,now),
      getD1().prepare("INSERT INTO operation_settings (key,value_cents,updated_at) VALUES ('library_upsell_cents',?,?) ON CONFLICT(key) DO UPDATE SET value_cents=excluded.value_cents,updated_at=excluded.updated_at").bind(upsellCents,now),
    ]);
    await addAdminAudit('update_settings',null,{spendCents,completeCents,upsellCents});
    return Response.json({ok:true});
  }
  const order=await getD1().prepare('SELECT * FROM orders WHERE order_number=?').bind(orderNumber).first<Record<string,unknown>>();
  if(!order) return Response.json({error:'Pedido não encontrado.'},{status:404});
  const now=new Date().toISOString();
  if(action==='mark_test'||action==='mark_real') {
    const value=action==='mark_test'?1:0;
    await getD1().batch([
      getD1().prepare('UPDATE orders SET is_test=? WHERE id=?').bind(value,order.id),
      getD1().prepare('UPDATE analytics_events SET is_test=? WHERE order_id=? OR (? IS NOT NULL AND anonymous_id=?) OR (? IS NOT NULL AND session_id=?)').bind(value,order.id,order.anonymous_id,order.anonymous_id,order.session_id,order.session_id),
      getD1().prepare('UPDATE visitor_sessions SET is_test=? WHERE session_id=?').bind(value,order.session_id||''),
      getD1().prepare('UPDATE abandoned_leads SET is_test=? WHERE anonymous_id=?').bind(value,order.anonymous_id||''),
    ]);
    await addAdminAudit(action,Number(order.id));
    return Response.json({ok:true,isTest:Boolean(value)});
  }
  if(action==='mark_paid') {
    if(order.payment_status!=='pending') return Response.json({error:'Transição inválida.'},{status:409});
    const completed=await completePayment(orderNumber,undefined,'manual');if(!completed.ok)return Response.json({error:completed.error},{status:completed.status});await addAdminAudit('mark_paid',Number(order.id));
  } else if(action==='regenerate') {
    const completed=await completePayment(orderNumber,undefined,'manual-regenerate',true);if(!completed.ok)return Response.json({error:completed.error},{status:completed.status});await addAdminAudit('regenerate',Number(order.id));
  } else if(action==='deliver') {
    if(order.reading_status!=='reading_generated')return Response.json({error:'Gere a leitura antes de entregar.'},{status:409});await getD1().prepare("UPDATE orders SET reading_status='delivered',delivered_at=? WHERE id=?").bind(now,order.id).run();await completePayment(orderNumber,undefined,'manual-delivery');await addAdminAudit('deliver',Number(order.id));
  } else if(action==='resend') {
    if(!['reading_generated','delivered'].includes(String(order.reading_status)))return Response.json({error:'A leitura ainda não foi gerada.'},{status:409});await getD1().prepare('UPDATE orders SET notification_status=NULL,notification_error=NULL WHERE id=?').bind(order.id).run();const completed=await completePayment(orderNumber,undefined,'manual-resend');if(!completed.ok)return Response.json({error:completed.error},{status:completed.status});await addAdminAudit('resend',Number(order.id));
  } else if(action==='cancel') {await getD1().prepare("UPDATE orders SET payment_status='cancelled',reading_status='cancelled' WHERE id=?").bind(order.id).run();await addAdminAudit('cancel',Number(order.id));}
  else return Response.json({error:'Ação inválida.'},{status:400});
  return Response.json({ok:true});
}
