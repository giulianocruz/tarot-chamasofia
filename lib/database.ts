import { env } from 'cloudflare:workers';
import { priceForConfirmedSales } from './pricing';

let schemaPromise: Promise<void> | null = null;

export function getD1() {
  if (!env.DB) throw new Error('D1 binding DB não disponível.');
  return env.DB;
}

export async function ensureSchema() {
  if (!schemaPromise) schemaPromise = initialize();
  return schemaPromise;
}

async function initialize() {
  const db = getD1();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT NOT NULL UNIQUE, public_token TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL, customer_email TEXT, customer_whatsapp TEXT, category TEXT NOT NULL, question TEXT NOT NULL,
      price INTEGER NOT NULL, pix_payload TEXT, payment_status TEXT NOT NULL DEFAULT 'pending', reading_status TEXT NOT NULL DEFAULT 'pending',
      cards_json TEXT, reading_json TEXT, created_at TEXT NOT NULL, paid_at TEXT, generated_at TEXT, delivered_at TEXT,
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, fbclid TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, event_name TEXT NOT NULL, anonymous_id TEXT,
      session_id TEXT, is_test INTEGER NOT NULL DEFAULT 0, metadata_json TEXT, created_at TEXT NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS visitor_sessions (
      session_id TEXT PRIMARY KEY, anonymous_id TEXT NOT NULL, first_seen_at TEXT NOT NULL, last_activity_at TEXT NOT NULL,
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, fbclid TEXT,
      landing_variant TEXT NOT NULL DEFAULT 'A', device_type TEXT, is_test INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS operation_settings (key TEXT PRIMARY KEY,value_cents INTEGER NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL UNIQUE,rating INTEGER NOT NULL,comment TEXT,display_name TEXT NOT NULL,
      public_consent INTEGER NOT NULL DEFAULT 0,moderation_status TEXT NOT NULL DEFAULT 'pending',featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS operation_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,alert_code TEXT NOT NULL,reference_id TEXT NOT NULL,status TEXT NOT NULL,
      detail TEXT,created_at TEXT NOT NULL,sent_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, window_started_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, order_id INTEGER, metadata_json TEXT, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS abandoned_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, public_token TEXT NOT NULL UNIQUE, anonymous_id TEXT NOT NULL UNIQUE,
      session_id TEXT, is_test INTEGER NOT NULL DEFAULT 0,
      customer_name TEXT, customer_email TEXT, customer_whatsapp TEXT, category TEXT, question TEXT,
      stage TEXT NOT NULL DEFAULT 'form_started', converted_order_id INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      recovery_first_sent_at TEXT, recovery_second_sent_at TEXT, recovery_last_attempt_at TEXT, recovery_error TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS referral_codes (
      code TEXT PRIMARY KEY, referrer_order_id INTEGER NOT NULL UNIQUE, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS referral_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, referred_order_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, qualified_at TEXT)`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_name_created ON analytics_events(event_name, created_at)'),
  ]);
  const columns = await db.prepare('PRAGMA table_info(orders)').all<{name:string}>();
  const names = new Set(columns.results.map((column) => column.name));
  const additions: Array<[string,string]> = [
    ['gateway_name','TEXT'], ['gateway_transaction_id','TEXT'], ['notification_status','TEXT'],
    ['notification_error','TEXT'], ['privacy_consent_at','TEXT'], ['terms_version','TEXT'],
    ['fbclid','TEXT'], ['recovery_first_sent_at','TEXT'], ['recovery_second_sent_at','TEXT'],
    ['recovery_last_attempt_at','TEXT'], ['recovery_error','TEXT'],
    ['anonymous_id','TEXT'], ['session_id','TEXT'], ["landing_variant","TEXT NOT NULL DEFAULT 'A'"],
    ['device_type','TEXT'], ["is_test","INTEGER NOT NULL DEFAULT 0"],
    ["offer_code","TEXT NOT NULL DEFAULT 'essential'"], ['included_books_json','TEXT'],
    ["upsell_status","TEXT NOT NULL DEFAULT 'not_offered'"], ['upsell_price','INTEGER'], ['upsell_pix_payload','TEXT'],
    ['upsell_gateway_transaction_id','TEXT'], ["journey_status","TEXT NOT NULL DEFAULT 'checkout_started'"],
  ];
  for (const [name, type] of additions) if (!names.has(name)) await db.prepare(`ALTER TABLE orders ADD COLUMN ${name} ${type}`).run();
  const eventColumns = await db.prepare('PRAGMA table_info(analytics_events)').all<{name:string}>();
  const eventNames = new Set(eventColumns.results.map((column) => column.name));
  if (!eventNames.has('session_id')) await db.prepare('ALTER TABLE analytics_events ADD COLUMN session_id TEXT').run();
  if (!eventNames.has('is_test')) await db.prepare('ALTER TABLE analytics_events ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0').run();
  const leadColumns = await db.prepare('PRAGMA table_info(abandoned_leads)').all<{name:string}>();
  const leadNames = new Set(leadColumns.results.map((column)=>column.name));
  if (!leadNames.has('session_id')) await db.prepare('ALTER TABLE abandoned_leads ADD COLUMN session_id TEXT').run();
  if (!leadNames.has('is_test')) await db.prepare('ALTER TABLE abandoned_leads ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_gateway_transaction ON orders(gateway_transaction_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_pending_recovery ON orders(payment_status,created_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_commercial_status ON orders(is_test,payment_status,created_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_abandoned_leads_recovery ON abandoned_leads(converted_order_id,updated_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_referral_conversions_code_status ON referral_conversions(code,status)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_anonymous ON visitor_sessions(anonymous_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON visitor_sessions(first_seen_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_attribution ON visitor_sessions(utm_source,utm_campaign,utm_content)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_events_session_name ON analytics_events(session_id,event_name)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_events_commercial ON analytics_events(is_test,event_name,created_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_reviews_public ON reviews(public_consent,moderation_status,featured,created_at)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_operation_alerts_code_created ON operation_alerts(alert_code,created_at)').run();
  const now=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO operation_settings (key,value_cents,updated_at) VALUES ('complete_offer_cents',1990,?)").bind(now),
    db.prepare("INSERT OR IGNORE INTO operation_settings (key,value_cents,updated_at) VALUES ('library_upsell_cents',990,?)").bind(now),
    db.prepare("INSERT OR IGNORE INTO operation_settings (key,value_cents,updated_at) VALUES ('ad_spend_daily_cents',1000,?)").bind(now),
  ]);
  // Jornada paga confirmada pelo proprietário como teste administrativo.
  await db.prepare("UPDATE orders SET is_test=1 WHERE order_number='CS260828IECKWIO'").run();
  await db.prepare("UPDATE analytics_events SET is_test=1 WHERE order_id=3 OR anonymous_id='41f8ceb8-7b35-4db0-8576-b651f885cd9e'").run();
  await db.prepare(`INSERT OR IGNORE INTO visitor_sessions (session_id,anonymous_id,first_seen_at,last_activity_at,landing_variant,device_type,is_test)
    SELECT 'legacy:'||anonymous_id,anonymous_id,MIN(created_at),MAX(created_at),'A','unknown',MAX(is_test)
    FROM analytics_events WHERE anonymous_id IS NOT NULL AND anonymous_id!='' GROUP BY anonymous_id`).run();
  await db.prepare("UPDATE analytics_events SET session_id='legacy:'||anonymous_id WHERE session_id IS NULL AND anonymous_id IS NOT NULL AND anonymous_id!=''").run();
  await db.prepare(`INSERT INTO admin_audit (action,order_id,metadata_json,created_at)
    SELECT 'mark_test',3,'{"reason":"Jornada administrativa confirmada pelo proprietário"}',datetime('now')
    WHERE EXISTS (SELECT 1 FROM orders WHERE id=3 AND is_test=1)
      AND NOT EXISTS (SELECT 1 FROM admin_audit WHERE action='mark_test' AND order_id=3)`).run();
  await db.prepare('PRAGMA optimize').run();
}

export async function addAdminAudit(action: string, orderId?: number | null, metadata?: unknown) {
  await ensureSchema();
  await getD1().prepare('INSERT INTO admin_audit (action,order_id,metadata_json,created_at) VALUES (?,?,?,?)')
    .bind(action.slice(0, 60), orderId ?? null, metadata ? JSON.stringify(metadata).slice(0, 2000) : null, new Date().toISOString()).run();
}

export async function getCurrentPrice() {
  await ensureSchema();
  const row = await getD1().prepare("SELECT COUNT(*) AS count FROM orders WHERE is_test=0 AND payment_status IN ('paid','reading_generated','delivered')").first<{ count: number }>();
  return priceForConfirmedSales(Number(row?.count ?? 0));
}

type EventContext = { sessionId?: string | null; isTest?: boolean };

export async function upsertVisitorSession(input: {
  sessionId:string; anonymousId:string; isTest:boolean; landingVariant?:string; deviceType?:string;
  utmSource?:string; utmMedium?:string; utmCampaign?:string; utmContent?:string; utmTerm?:string; fbclid?:string;
}) {
  await ensureSchema();
  const now = new Date().toISOString();
  await getD1().prepare(`INSERT INTO visitor_sessions
    (session_id,anonymous_id,first_seen_at,last_activity_at,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,landing_variant,device_type,is_test)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(session_id) DO UPDATE SET last_activity_at=excluded.last_activity_at,
      utm_source=COALESCE(visitor_sessions.utm_source,excluded.utm_source),utm_medium=COALESCE(visitor_sessions.utm_medium,excluded.utm_medium),
      utm_campaign=COALESCE(visitor_sessions.utm_campaign,excluded.utm_campaign),utm_content=COALESCE(visitor_sessions.utm_content,excluded.utm_content),
      utm_term=COALESCE(visitor_sessions.utm_term,excluded.utm_term),fbclid=COALESCE(visitor_sessions.fbclid,excluded.fbclid),
      landing_variant=excluded.landing_variant,device_type=excluded.device_type,is_test=MAX(visitor_sessions.is_test,excluded.is_test)`)
    .bind(input.sessionId,input.anonymousId,now,now,input.utmSource||null,input.utmMedium||null,input.utmCampaign||null,input.utmContent||null,input.utmTerm||null,input.fbclid||null,input.landingVariant||'A',input.deviceType||'unknown',input.isTest?1:0).run();
}

export async function addEvent(eventName: string, orderId?: number | null, anonymousId?: string | null, metadata?: unknown, context: EventContext = {}) {
  await ensureSchema();
  let sessionId = context.sessionId?.slice(0,100) || null;
  let isTest = context.isTest ? 1 : 0;
  let resolvedAnonymous = anonymousId?.slice(0,100) || null;
  if (orderId) {
    const order = await getD1().prepare('SELECT anonymous_id,session_id,is_test FROM orders WHERE id=?').bind(orderId).first<{anonymous_id:string|null;session_id:string|null;is_test:number}>();
    sessionId ||= order?.session_id || null;
    resolvedAnonymous ||= order?.anonymous_id || null;
    isTest = Math.max(isTest,Number(order?.is_test||0));
  }
  const dedupe = new Set(['landing_view','cta_click','question_started','question_completed','offer_viewed','checkout_started','pix_generated','scroll_25','scroll_50','scroll_75','scroll_90','faq_opened','support_clicked','page_hidden','recovery_contact_saved','recovery_resumed']);
  const name = eventName.slice(0,60);
  const payload = metadata ? JSON.stringify(metadata).slice(0,2000) : null;
  if (sessionId && dedupe.has(name)) {
    await getD1().prepare(`INSERT INTO analytics_events (order_id,event_name,anonymous_id,session_id,is_test,metadata_json,created_at)
      SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM analytics_events WHERE session_id=? AND event_name=? AND COALESCE(order_id,0)=COALESCE(?,0))`)
      .bind(orderId??null,name,resolvedAnonymous,sessionId,isTest,payload,new Date().toISOString(),sessionId,name,orderId??null).run();
    return;
  }
  await getD1().prepare('INSERT INTO analytics_events (order_id,event_name,anonymous_id,session_id,is_test,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(orderId ?? null,name,resolvedAnonymous,sessionId,isTest,payload,new Date().toISOString()).run();
}

export async function checkRateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  await ensureSchema();
  const now = Date.now();
  const row = await getD1().prepare('SELECT count,window_started_at FROM rate_limits WHERE key=?').bind(key).first<{count:number;window_started_at:number}>();
  if (!row || now - row.window_started_at > windowMs) {
    await getD1().prepare('INSERT OR REPLACE INTO rate_limits (key,count,window_started_at) VALUES (?,1,?)').bind(key, now).run();
    return true;
  }
  if (row.count >= max) return false;
  await getD1().prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').bind(key).run();
  return true;
}
