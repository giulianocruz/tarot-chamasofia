-- These columns are maintained idempotently by lib/database.ts::ensureSchema.
-- Production already contains them, so this migration only records the schema milestone.
SELECT 1;
