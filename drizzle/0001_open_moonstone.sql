CREATE INDEX `idx_events_name_created` ON `analytics_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_payment_status` ON `orders` (`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);