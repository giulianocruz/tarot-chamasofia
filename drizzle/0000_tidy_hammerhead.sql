CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer,
	`event_name` text NOT NULL,
	`anonymous_id` text,
	`metadata_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`public_token` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text,
	`customer_whatsapp` text,
	`category` text NOT NULL,
	`question` text NOT NULL,
	`price` integer NOT NULL,
	`pix_payload` text,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`reading_status` text DEFAULT 'pending' NOT NULL,
	`cards_json` text,
	`reading_json` text,
	`created_at` text NOT NULL,
	`paid_at` text,
	`generated_at` text,
	`delivered_at` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_token_unique` ON `orders` (`public_token`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL
);
