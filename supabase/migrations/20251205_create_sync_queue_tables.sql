-- ============================================================================
-- Migration: Create Supabase → Bubble Sync Queue Tables
-- Created: 2025-12-05
-- Purpose: Enable queued synchronization from Supabase to Bubble via workflows
-- ============================================================================

-- ============================================================================
-- SYNC CONFIG TABLE
-- Maps Supabase tables to Bubble workflow endpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mapping
    supabase_table TEXT NOT NULL UNIQUE,
    bubble_workflow TEXT NOT NULL,        -- e.g., 'sync_user_from_supabase'
    bubble_object_type TEXT,              -- e.g., 'user' (for verification/logging)

    -- Behavior flags
    enabled BOOLEAN DEFAULT TRUE,
    sync_on_insert BOOLEAN DEFAULT TRUE,
    sync_on_update BOOLEAN DEFAULT TRUE,
    sync_on_delete BOOLEAN DEFAULT FALSE,

    -- Field mapping (optional, for complex transformations)
    -- Format: { "supabase_field": "bubble_field" }
    field_mapping JSONB,

    -- Fields to exclude from sync
    excluded_fields TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sync_config_table ON sync_config (supabase_table);
CREATE INDEX IF NOT EXISTS idx_sync_config_enabled ON sync_config (enabled) WHERE enabled = TRUE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_sync_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_config_updated
    BEFORE UPDATE ON sync_config
    FOR EACH ROW
    EXECUTE FUNCTION update_sync_config_timestamp();

-- ============================================================================
-- SYNC QUEUE TABLE
-- Stores pending sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What to sync
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,              -- The _id from the source table
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Snapshot of data at queue time
    payload JSONB,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting to be processed
        'processing',   -- Currently being processed
        'completed',    -- Successfully synced to Bubble
        'failed',       -- Failed after all retries
        'skipped'       -- Intentionally skipped (e.g., no workflow configured)
    )),

    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,

    -- Bubble response (for debugging)
    bubble_response JSONB,

    -- Idempotency key (prevent duplicate processing)
    idempotency_key TEXT UNIQUE
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created
    ON sync_queue (status, created_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_sync_queue_retry
    ON sync_queue (next_retry_at)
    WHERE status = 'failed' AND retry_count < 3;

CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record
    ON sync_queue (table_name, record_id);

-- Partial unique index to prevent duplicate pending items for same record
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_pending_unique
    ON sync_queue (table_name, record_id)
    WHERE status = 'pending';

-- ============================================================================
-- TRIGGER FUNCTION
-- Generic trigger that adds entries to sync_queue
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_sync_queue()
RETURNS TRIGGER AS $$
DECLARE
    config_record RECORD;
    should_sync BOOLEAN := FALSE;
    op_type TEXT;
    record_data JSONB;
    record_id TEXT;
BEGIN
    -- Determine operation type and get record data
    IF TG_OP = 'INSERT' THEN
        op_type := 'INSERT';
        record_data := to_jsonb(NEW);
        record_id := NEW._id;
    ELSIF TG_OP = 'UPDATE' THEN
        op_type := 'UPDATE';
        record_data := to_jsonb(NEW);
        record_id := NEW._id;
    ELSIF TG_OP = 'DELETE' THEN
        op_type := 'DELETE';
        record_data := to_jsonb(OLD);
        record_id := OLD._id;
    END IF;

    -- Skip if no _id (shouldn't happen but safety check)
    IF record_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Check if sync is configured and enabled for this table/operation
    SELECT * INTO config_record
    FROM sync_config
    WHERE supabase_table = TG_TABLE_NAME
      AND enabled = TRUE;

    IF config_record IS NULL THEN
        -- No config for this table, skip silently
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Check operation-specific flags
    IF (op_type = 'INSERT' AND config_record.sync_on_insert) OR
       (op_type = 'UPDATE' AND config_record.sync_on_update) OR
       (op_type = 'DELETE' AND config_record.sync_on_delete) THEN
        should_sync := TRUE;
    END IF;

    IF should_sync THEN
        -- Remove excluded fields from payload
        IF config_record.excluded_fields IS NOT NULL THEN
            DECLARE
                field TEXT;
            BEGIN
                FOREACH field IN ARRAY config_record.excluded_fields
                LOOP
                    record_data := record_data - field;
                END LOOP;
            END;
        END IF;

        -- Insert into queue (or update existing pending entry for same record)
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            idempotency_key
        ) VALUES (
            TG_TABLE_NAME,
            record_id,
            op_type,
            record_data,
            TG_TABLE_NAME || ':' || record_id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT idx_sync_queue_pending_unique
        DO UPDATE SET
            payload = EXCLUDED.payload,
            operation = EXCLUDED.operation,
            created_at = NOW(),
            idempotency_key = EXCLUDED.idempotency_key;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL CONFIGURATION (DISABLED BY DEFAULT)
-- Enable specific tables as needed
-- ============================================================================

-- Example configurations (all disabled by default - enable as needed)
INSERT INTO sync_config (supabase_table, bubble_workflow, bubble_object_type, enabled, sync_on_insert, sync_on_update, sync_on_delete) VALUES
    ('user', 'sync_user_from_supabase', 'user', FALSE, TRUE, TRUE, FALSE),
    ('listing', 'sync_listing_from_supabase', 'listing', FALSE, TRUE, TRUE, FALSE),
    ('proposal', 'sync_proposal_from_supabase', 'proposal', FALSE, TRUE, TRUE, FALSE),
    ('bookings_stays', 'sync_booking_stay_from_supabase', 'bookings-stays', FALSE, TRUE, TRUE, FALSE),
    ('bookings_leases', 'sync_booking_lease_from_supabase', 'bookings-leases', FALSE, TRUE, TRUE, FALSE)
ON CONFLICT (supabase_table) DO NOTHING;

-- ============================================================================
-- TRIGGER INSTALLATION (COMMENTED OUT - APPLY MANUALLY AS NEEDED)
-- ============================================================================

-- To enable sync triggers for a table, run:
--
-- CREATE TRIGGER <table>_sync_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON <table>
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_sync_queue();
--
-- Example:
-- CREATE TRIGGER user_sync_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON "user"
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_sync_queue();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Only service role should access these tables
-- ============================================================================

ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access
-- This is intentional - these tables are for internal sync processing only

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sync_config IS 'Configuration for Supabase → Bubble sync. Maps tables to workflow endpoints.';
COMMENT ON TABLE sync_queue IS 'Queue of pending Supabase → Bubble sync operations.';
COMMENT ON FUNCTION trigger_sync_queue() IS 'Generic trigger function that adds database changes to the sync queue.';

-- ============================================================================
-- DONE
-- ============================================================================
