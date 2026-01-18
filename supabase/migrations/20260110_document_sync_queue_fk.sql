-- Migration: 20260110_document_sync_queue_fk.sql
-- Purpose: Document the FK constraint on sync_queue.table_name -> sync_config.supabase_table
--          This constraint exists in production but was added outside of migration files.
--          Adding to version control for consistency and documentation.
--
-- Context: Debug plan 20260110143000-debug-supabase-import-fk-cascade-failure.md
--          This FK constraint caused cascade failures during production-to-dev data import
--          when triggers fired during COPY operations.
--
-- Note: Use IF NOT EXISTS to make this migration idempotent (safe to run on production)

-- Add FK constraint if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_sync_queue_sync_config'
    ) THEN
        ALTER TABLE sync_queue
        ADD CONSTRAINT fk_sync_queue_sync_config
        FOREIGN KEY (table_name) REFERENCES sync_config(supabase_table);

        RAISE NOTICE 'Created FK constraint fk_sync_queue_sync_config';
    ELSE
        RAISE NOTICE 'FK constraint fk_sync_queue_sync_config already exists';
    END IF;
END $$;

-- Add comment documenting the constraint's purpose
COMMENT ON CONSTRAINT fk_sync_queue_sync_config ON sync_queue IS
'Ensures sync_queue.table_name references a valid sync_config entry.
Added to version control 2026-01-10 after discovery during prod-to-dev import debugging.
Original constraint was added to production via SQL Editor.';
