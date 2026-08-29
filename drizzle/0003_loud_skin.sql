CREATE TABLE `operation_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alert_code` text NOT NULL,
	`reference_id` text NOT NULL,
	`status` text NOT NULL,
	`detail` text,
	`created_at` text NOT NULL,
	`sent_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_operation_alerts_code_created` ON `operation_alerts` (`alert_code`,`created_at`);--> statement-breakpoint
CREATE TABLE `operation_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_cents` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`display_name` text NOT NULL,
	`public_consent` integer DEFAULT false NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_order_id_unique` ON `reviews` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_public` ON `reviews` (`public_consent`,`moderation_status`,`featured`,`created_at`);--> statement-breakpoint
CREATE TABLE `visitor_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`anonymous_id` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_activity_at` text NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`fbclid` text,
	`landing_variant` text DEFAULT 'A' NOT NULL,
	`device_type` text,
	`is_test` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_anonymous` ON `visitor_sessions` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_first_seen` ON `visitor_sessions` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_attribution` ON `visitor_sessions` (`utm_source`,`utm_campaign`,`utm_content`);--> statement-breakpoint
ALTER TABLE `abandoned_leads` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `abandoned_leads` ADD `is_test` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `is_test` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_events_session_name` ON `analytics_events` (`session_id`,`event_name`);--> statement-breakpoint
CREATE INDEX `idx_events_commercial` ON `analytics_events` (`is_test`,`event_name`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `anonymous_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `landing_variant` text DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `device_type` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `is_test` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `offer_code` text DEFAULT 'essential' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `included_books_json` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `upsell_status` text DEFAULT 'not_offered' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `upsell_price` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `upsell_pix_payload` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `upsell_gateway_transaction_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `journey_status` text DEFAULT 'checkout_started' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_orders_commercial_status` ON `orders` (`is_test`,`payment_status`,`created_at`);