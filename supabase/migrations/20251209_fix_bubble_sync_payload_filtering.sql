-- ============================================================================
-- Migration: Fix Bubble Sync Payload Filtering
-- Created: 2025-12-09
-- Purpose: Remove internal/metadata columns from sync payloads sent to Bubble
--
-- PROBLEM:
-- When syncing proposal/listing data to Bubble, the sync_queue payload
-- included ALL columns from the source row (via to_jsonb(NEW)), including
-- internal Supabase fields like 'bubble_id', 'created_at', 'pending', etc.
--
-- Bubble API rejected these unrecognized fields with:
-- "400 Bad Request: Unrecognized field: pending"
--
-- SOLUTION:
-- Filter out internal/metadata fields before building the sync payload
-- ============================================================================

-- ============================================================================
-- PART 1: Fix listing_bubble_sync_queue Trigger
-- Only sync fields that Bubble recognizes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_listing_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if bubble_id is NULL (not yet synced to Bubble)
    IF NEW.bubble_id IS NULL THEN
        -- Build payload with excluded internal fields
        -- CRITICAL: Remove fields that Bubble API doesn't recognize
        INSERT INTO sync_queue (
            table_name,
            record_id,
            operation,
            payload,
            status,
            idempotency_key
        ) VALUES (
            'listing',
            NEW._id,
            'INSERT',
            to_jsonb(NEW)
                - 'bubble_id'          -- Internal tracking field
                - 'created_at'         -- Supabase timestamp (Bubble has 'Created Date')
                - 'updated_at'         -- Supabase timestamp (Bubble has 'Modified Date')
                - 'sync_status'        -- Internal flag
                - 'bubble_sync_error'  -- Internal error tracking
                - 'pending'            -- Remove any "pending" fields (CRITICAL - was causing 400 errors)
                - '_internal',         -- Any internal marker fields
            'pending',
            'listing:' || NEW._id || ':' || extract(epoch from now())::text
        )
        ON CONFLICT ON CONSTRAINT idx_sync_queue_pending_unique
        DO UPDATE SET
            payload = EXCLUDED.payload,
            created_at = NOW();

        RAISE NOTICE '[trigger_listing_sync_queue] Queued listing % for Bubble sync', NEW._id;
    ELSE
        RAISE NOTICE '[trigger_listing_sync_queue] Listing % already has bubble_id, skipping queue', NEW._id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_listing_sync_queue() IS
'Auto-queues new listings to sync_queue for Bubble sync when bubble_id is NULL. Filters out internal Supabase fields.';

-- ============================================================================
-- PART 2: Fix generic trigger_sync_queue Trigger
-- Apply field filtering universally across all tables
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
        -- Remove excluded fields from payload (from sync_config)
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

        -- CRITICAL: Remove internal Supabase fields that Bubble won't recognize
        -- These are system/tracking fields that should never go to external systems
        record_data := record_data
            - 'bubble_id'          -- Supabase tracking field for Bubble record ID
            - 'created_at'         -- Supabase timestamp (Bubble uses 'Created Date')
            - 'updated_at'         -- Supabase timestamp (Bubble uses 'Modified Date')
            - 'sync_status'        -- Internal sync status field
            - 'bubble_sync_error'  -- Internal error tracking
            - 'pending'            -- CRITICAL: Was causing "Unrecognized field: pending" errors
            - '_internal'          -- Any internal marker fields
            - 'sync_at'            -- Any sync timestamp fields
            - 'last_synced';       -- Any last sync tracking fields

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

COMMENT ON FUNCTION trigger_sync_queue() IS
'Generic trigger that adds database changes to the sync queue. Filters out internal Supabase fields before queueing.';

-- ============================================================================
-- DONE
-- ============================================================================
