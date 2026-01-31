-- Migration: add `channel` column to deliveries
-- Safe default: set existing rows to 'email' and future rows default to 'email'
-- Run with: psql "$PG_CONNECTION" -f infra/sql/001-add-channel-to-deliveries.sql

BEGIN;

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deliveries' AND column_name = 'channel'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN channel text;
    END IF;
END$$;

-- Backfill existing rows with a reasonable default (email)
UPDATE deliveries SET channel = 'email' WHERE channel IS NULL;

-- Set a default for future inserts
ALTER TABLE deliveries ALTER COLUMN channel SET DEFAULT 'email';

COMMIT;

-- Note: if you prefer a NOT NULL constraint, run:
-- ALTER TABLE deliveries ALTER COLUMN channel SET NOT NULL;
-- after verifying backfill completed successfully.
