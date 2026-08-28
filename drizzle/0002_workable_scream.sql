CREATE TABLE `abandoned_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_token` text NOT NULL,
	`anonymous_id` text NOT NULL,
	`customer_name` text,
	`customer_email` text,
	`customer_whatsapp` text,
	`category` text,
	`question` text,
	`stage` text DEFAULT 'form_started' NOT NULL,
	`converted_order_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`recovery_first_sent_at` text,
	`recovery_second_sent_at` text,
	`recovery_last_attempt_at` text,
	`recovery_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `abandoned_leads_public_token_unique` ON `abandoned_leads` (`public_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `abandoned_leads_anonymous_id_unique` ON `abandoned_leads` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `idx_abandoned_leads_recovery` ON `abandoned_leads` (`converted_order_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`referrer_order_id` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_referrer_order_id_unique` ON `referral_codes` (`referrer_order_id`);--> statement-breakpoint
CREATE TABLE `referral_conversions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`referred_order_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`qualified_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_conversions_referred_order_id_unique` ON `referral_conversions` (`referred_order_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_conversions_code_status` ON `referral_conversions` (`code`,`status`);--> statement-breakpoint
ALTER TABLE `orders` ADD `recovery_first_sent_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `recovery_second_sent_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `recovery_last_attempt_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `recovery_error` text;
