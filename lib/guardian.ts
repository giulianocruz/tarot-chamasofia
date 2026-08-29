import { env } from 'cloudflare:workers';
import { ensureSchema,getD1 } from './database';
import { sendLifecycleMessage } from './notifications';
import { randomToken } from './security';

export async function runOperationalGuardian(){
  await ensureSchema();
  const [sessions,events,orders,ebook]=await Promise.all([
    getD1().prepare("SELECT COUNT(*) count FROM visitor_sessions WHERE is_test=0 AND datetime(first_seen_at)>=datetime('now','-1 day')").first<{count:number}>(),
    getD1().prepare("SELECT event_name,COUNT(DISTINCT session_id) count FROM analytics_events WHERE is_test=0 AND datetime(created_at)>=datetime('now','-1 day') AND event_name IN ('cta_click','pix_generated') GROUP BY event_name").all<{event_name:string;count:number}>(),
    getD1().prepare("SELECT COUNT(*) paid FROM orders WHERE is_test=0 AND (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) AND datetime(paid_at)>=datetime('now','-1 day')").first<{paid:number}>(),
    env.BOOKS.head('tarot-para-iniciantes.pdf').catch(()=>null),
  ]);
  const counts=Object.fromEntries(events.results.map(item=>[item.event_name,Number(item.count)]));
  const visitors=Number(sessions?.count||0),cta=Number(counts.cta_click||0),pix=Number(counts.pix_generated||0),paid=Number(orders?.paid||0);
  let alert:{code:string;detail:string}|null=null;
  if(!ebook)alert={code:'ebook_unavailable',detail:'O e-book principal não está disponível para entrega.'};
  else if(visitors>=20&&cta===0)alert={code:'traffic_without_cta',detail:`${visitors} sessões reais nas últimas 24h e nenhum CTA.`};
  else if(pix>=3&&paid===0)alert={code:'pix_without_payment',detail:`${pix} Pix reais nas últimas 24h e nenhum pagamento confirmado.`};
  if(!alert)return {level:visitors<20?'yellow':'green',alerted:false,visitors,cta,pix,paid};
  const recent=await getD1().prepare("SELECT id FROM operation_alerts WHERE alert_code=? AND datetime(created_at)>=datetime('now','-12 hours') LIMIT 1").bind(alert.code).first();
  if(recent)return {level:'red',alerted:false,deduplicated:true,code:alert.code};
  const referenceId=`CS-${randomToken(8).slice(0,10).toUpperCase()}`,now=new Date().toISOString();
  const result=await sendLifecycleMessage({customerName:'Admin Chama Sofia',customerEmail:env.ADMIN_EMAIL||null,customerWhatsapp:env.WHATSAPP_NUMBER||null,kind:'operation_alert',subject:`Alerta operacional ${referenceId}`,message:`Tarot Chama Sofia requer atenção. ${alert.detail} Referência: ${referenceId}`,url:`${env.APP_URL||'https://tarot.chamasofia.com.br'}/oraculo-gestao-7f3a`});
  await getD1().prepare('INSERT INTO operation_alerts (alert_code,reference_id,status,detail,created_at,sent_at) VALUES (?,?,?,?,?,?)').bind(alert.code,referenceId,result.ok?'sent':'failed',alert.detail,now,result.ok?now:null).run();
  return {level:'red',alerted:result.ok,code:alert.code,referenceId};
}
