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
      metadata_json TEXT, created_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, window_started_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, order_id INTEGER, metadata_json TEXT, created_at TEXT NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_name_created ON analytics_events(event_name, created_at)'),
  ]);
  const columns = await db.prepare('PRAGMA table_info(orders)').all<{name:string}>();
  const names = new Set(columns.results.map((column) => column.name));
  const additions: Array<[string,string]> = [
    ['gateway_name','TEXT'], ['gateway_transaction_id','TEXT'], ['notification_status','TEXT'],
    ['notification_error','TEXT'], ['privacy_consent_at','TEXT'], ['terms_version','TEXT'],
    ['fbclid','TEXT'],
  ];
  for (const [name, type] of additions) if (!names.has(name)) await db.prepare(`ALTER TABLE orders ADD COLUMN ${name} ${type}`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_gateway_transaction ON orders(gateway_transaction_id)').run();
  await db.prepare('PRAGMA optimize').run();
}

export async function addAdminAudit(action: string, orderId?: number | null, metadata?: unknown) {
  await ensureSchema();
  await getD1().prepare('INSERT INTO admin_audit (action,order_id,metadata_json,created_at) VALUES (?,?,?,?)')
    .bind(action.slice(0, 60), orderId ?? null, metadata ? JSON.stringify(metadata).slice(0, 2000) : null, new Date().toISOString()).run();
}

export async function getCurrentPrice() {
  await ensureSchema();
  const row = await getD1().prepare("SELECT COUNT(*) AS count FROM orders WHERE payment_status IN ('paid','reading_generated','delivered')").first<{ count: number }>();
  return priceForConfirmedSales(Number(row?.count ?? 0));
}

export async function addEvent(eventName: string, orderId?: number | null, anonymousId?: string | null, metadata?: unknown) {
  await ensureSchema();
  await getD1().prepare('INSERT INTO analytics_events (order_id,event_name,anonymous_id,metadata_json,created_at) VALUES (?,?,?,?,?)')
    .bind(orderId ?? null, eventName.slice(0, 60), anonymousId?.slice(0, 100) ?? null, metadata ? JSON.stringify(metadata).slice(0, 2000) : null, new Date().toISOString()).run();
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
