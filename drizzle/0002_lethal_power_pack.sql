ALTER TABLE `orders` ADD `anonymous_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `is_test` integer DEFAULT false NOT NULL;
