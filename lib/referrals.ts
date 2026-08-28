import { addEvent, ensureSchema, getD1 } from './database';
import { cleanText, randomToken } from './security';

export async function ensureReferralCode(orderId: number) {
  await ensureSchema();
  const existing = await getD1().prepare('SELECT code FROM referral_codes WHERE referrer_order_id=?').bind(orderId).first<{code:string}>();
  if (existing?.code) return existing.code;
  for (let attempt=0;attempt<4;attempt+=1) {
    const code = randomToken(9).replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toLowerCase();
    try {
      await getD1().prepare('INSERT INTO referral_codes (code,referrer_order_id,created_at) VALUES (?,?,?)')
        .bind(code,orderId,new Date().toISOString()).run();
      return code;
    } catch {
      const race = await getD1().prepare('SELECT code FROM referral_codes WHERE referrer_order_id=?').bind(orderId).first<{code:string}>();
      if (race?.code) return race.code;
    }
  }
  throw new Error('Não foi possível gerar o código de indicação.');
}

export async function registerReferral(referredOrderId: number, rawCode: unknown) {
  const code = cleanText(rawCode,32).toLowerCase();
  if (!code) return false;
  await ensureSchema();
  const referrer = await getD1().prepare(`SELECT rc.referrer_order_id FROM referral_codes rc JOIN orders o ON o.id=rc.referrer_order_id
    WHERE rc.code=? AND (o.payment_status='paid' OR o.reading_status IN ('reading_generated','delivered'))`).bind(code).first<{referrer_order_id:number}>();
  if (!referrer || Number(referrer.referrer_order_id)===referredOrderId) return false;
  await getD1().prepare(`INSERT OR IGNORE INTO referral_conversions (code,referred_order_id,status,created_at) VALUES (?,?,'pending',?)`)
    .bind(code,referredOrderId,new Date().toISOString()).run();
  await addEvent('referral_attributed',referredOrderId,null,{code});
  return true;
}

export async function qualifyReferralForOrder(referredOrderId: number) {
  await ensureSchema();
  const conversion = await getD1().prepare("SELECT id,code,status FROM referral_conversions WHERE referred_order_id=?").bind(referredOrderId).first<{id:number;code:string;status:string}>();
  if (!conversion || conversion.status==='qualified') return false;
  const now = new Date().toISOString();
  await getD1().prepare("UPDATE referral_conversions SET status='qualified',qualified_at=? WHERE id=? AND status='pending'").bind(now,conversion.id).run();
  const referrer = await getD1().prepare('SELECT referrer_order_id FROM referral_codes WHERE code=?').bind(conversion.code).first<{referrer_order_id:number}>();
  if (referrer) await addEvent('referral_qualified',Number(referrer.referrer_order_id),null,{referredOrderId});
  return true;
}

export async function getReferralSnapshot(orderId: number) {
  const code = await ensureReferralCode(orderId);
  const result = await getD1().prepare("SELECT COUNT(*) AS count FROM referral_conversions WHERE code=? AND status='qualified'").bind(code).first<{count:number}>();
  const qualified = Number(result?.count || 0);
  return {code,qualified,rewardUnlocked:qualified>0};
}
