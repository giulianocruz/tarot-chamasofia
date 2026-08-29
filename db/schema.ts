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
  anonymousId: text('anonymous_id'),
  sessionId: text('session_id'),
  landingVariant: text('landing_variant').notNull().default('A'),
  deviceType: text('device_type'),
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
  offerCode: text('offer_code').notNull().default('essential'),
  includedBooksJson: text('included_books_json'),
  upsellStatus: text('upsell_status').notNull().default('not_offered'),
  upsellPrice: integer('upsell_price'),
  upsellPixPayload: text('upsell_pix_payload'),
  upsellGatewayTransactionId: text('upsell_gateway_transaction_id'),
  journeyStatus: text('journey_status').notNull().default('checkout_started'),
  recoveryFirstSentAt: text('recovery_first_sent_at'),
  recoverySecondSentAt: text('recovery_second_sent_at'),
  recoveryLastAttemptAt: text('recovery_last_attempt_at'),
  recoveryError: text('recovery_error'),
}, (table) => [
  index('idx_orders_payment_status').on(table.paymentStatus),
  index('idx_orders_created_at').on(table.createdAt),
  index('idx_orders_commercial_status').on(table.isTest, table.paymentStatus, table.createdAt),
]);

export const visitorSessions = sqliteTable('visitor_sessions', {
  sessionId: text('session_id').primaryKey(),
  anonymousId: text('anonymous_id').notNull(),
  firstSeenAt: text('first_seen_at').notNull(),
  lastActivityAt: text('last_activity_at').notNull(),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  fbclid: text('fbclid'),
  landingVariant: text('landing_variant').notNull().default('A'),
  deviceType: text('device_type'),
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_sessions_anonymous').on(table.anonymousId),
  index('idx_sessions_first_seen').on(table.firstSeenAt),
  index('idx_sessions_attribution').on(table.utmSource, table.utmCampaign, table.utmContent),
]);

export const abandonedLeads = sqliteTable('abandoned_leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicToken: text('public_token').notNull().unique(),
  anonymousId: text('anonymous_id').notNull().unique(),
  sessionId: text('session_id'),
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
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
  sessionId: text('session_id'),
  isTest: integer('is_test', { mode: 'boolean' }).notNull().default(false),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_events_name_created').on(table.eventName, table.createdAt),
  index('idx_events_session_name').on(table.sessionId, table.eventName),
  index('idx_events_commercial').on(table.isTest, table.eventName, table.createdAt),
]);

export const operationSettings = sqliteTable('operation_settings', {
  key: text('key').primaryKey(),
  valueCents: integer('value_cents').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement:true }),
  orderId: integer('order_id').notNull().unique(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  displayName: text('display_name').notNull(),
  publicConsent: integer('public_consent',{mode:'boolean'}).notNull().default(false),
  moderationStatus: text('moderation_status').notNull().default('pending'),
  featured: integer('featured',{mode:'boolean'}).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table)=>[
  index('idx_reviews_public').on(table.publicConsent,table.moderationStatus,table.featured,table.createdAt),
]);

export const operationAlerts = sqliteTable('operation_alerts', {
  id: integer('id').primaryKey({autoIncrement:true}),
  alertCode:text('alert_code').notNull(),
  referenceId:text('reference_id').notNull(),
  status:text('status').notNull(),
  detail:text('detail'),
  createdAt:text('created_at').notNull(),
  sentAt:text('sent_at'),
}, (table)=>[index('idx_operation_alerts_code_created').on(table.alertCode,table.createdAt)]);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: integer('window_started_at').notNull(),
});
