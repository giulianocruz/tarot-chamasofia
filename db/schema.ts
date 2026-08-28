import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  publicToken: text('public_token').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerWhatsapp: text('customer_whatsapp'),
  category: text('category').notNull(),
  question: text('question').notNull(),
  price: integer('price').notNull(),
  pixPayload: text('pix_payload'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  readingStatus: text('reading_status').notNull().default('pending'),
  cardsJson: text('cards_json'),
  readingJson: text('reading_json'),
  createdAt: text('created_at').notNull(),
  paidAt: text('paid_at'),
  generatedAt: text('generated_at'),
  deliveredAt: text('delivered_at'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  fbclid: text('fbclid'),
  recoveryFirstSentAt: text('recovery_first_sent_at'),
  recoverySecondSentAt: text('recovery_second_sent_at'),
  recoveryLastAttemptAt: text('recovery_last_attempt_at'),
  recoveryError: text('recovery_error'),
}, (table) => [
  index('idx_orders_payment_status').on(table.paymentStatus),
  index('idx_orders_created_at').on(table.createdAt),
]);

export const abandonedLeads = sqliteTable('abandoned_leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicToken: text('public_token').notNull().unique(),
  anonymousId: text('anonymous_id').notNull().unique(),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  customerWhatsapp: text('customer_whatsapp'),
  category: text('category'),
  question: text('question'),
  stage: text('stage').notNull().default('form_started'),
  convertedOrderId: integer('converted_order_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  recoveryFirstSentAt: text('recovery_first_sent_at'),
  recoverySecondSentAt: text('recovery_second_sent_at'),
  recoveryLastAttemptAt: text('recovery_last_attempt_at'),
  recoveryError: text('recovery_error'),
}, (table) => [
  index('idx_abandoned_leads_recovery').on(table.convertedOrderId, table.updatedAt),
]);

export const referralCodes = sqliteTable('referral_codes', {
  code: text('code').primaryKey(),
  referrerOrderId: integer('referrer_order_id').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

export const referralConversions = sqliteTable('referral_conversions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  referredOrderId: integer('referred_order_id').notNull().unique(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  qualifiedAt: text('qualified_at'),
}, (table) => [
  index('idx_referral_conversions_code_status').on(table.code, table.status),
]);

export const analyticsEvents = sqliteTable('analytics_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id'),
  eventName: text('event_name').notNull(),
  anonymousId: text('anonymous_id'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_events_name_created').on(table.eventName, table.createdAt)]);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: integer('window_started_at').notNull(),
});
