# Analysis: "Unrecognized field: pending" Error from Bubble API

**Date**: 2025-12-09 12:00 UTC
**Status**: ROOT CAUSE IDENTIFIED + SOLUTION PROVIDED
**Severity**: HIGH - Blocks proposal creation & updates syncing to Bubble
**Affected System**: Proposal creation workflow, Listing creation workflow

---

## Problem Statement

When syncing proposals (and listings) from Supabase to Bubble, the API returns:
```
400 Bad Request: Unrecognized field: pending
```

This error prevents proposal and listing data from syncing to Bubble, breaking the complete create workflow.

---

## Root Cause Analysis

### The Issue

The `sync_queue` table payload includes **ALL columns** from the source row, including internal metadata columns that Bubble doesn't recognize:

**Location**: `supabase/migrations/20251209_listing_bubble_sync_backend.sql:37`

```sql
payload = to_jsonb(NEW)  -- ❌ WRONG: Includes all columns
```

This converts the ENTIRE row (with columns like `status`, `updated_at`, internal flags, etc.) into the payload sent to Bubble. Bubble then rejects any unrecognized fields.

### Where This Happens

1. **Listing Creation** (Direct Trigger)
   - File: `20251209_listing_bubble_sync_backend.sql` (line 37)
   - Trigger: `trigger_listing_sync_queue()`
   - When: Every new listing is created in Supabase
   - Problem: `to_jsonb(NEW)` includes all listing table columns

2. **Proposal Creation** (Via enqueueBubbleSync)
   - File: `supabase/functions/proposal/lib/bubbleSyncQueue.ts` (line 57)
   - The `proposalData` object passed contains all fields from the database
   - The `to_jsonb()` conversion in the trigger will include these

3. **Database Trigger** (Generic)
   - File: `20251205_create_sync_queue_tables.sql:137`
   - Trigger: `trigger_sync_queue()`
   - When: Any table with `sync_config` enabled and `sync_on_insert/update = TRUE`
   - Problem: `to_jsonb(NEW)` includes all columns

### Why Bubble Rejects "pending"

The error message "Unrecognized field: pending" suggests:

1. **Scenario A** (Most Likely): A `pending` column exists in Supabase's proposal or listing table
   - This column is internal to Supabase
   - It's included in `to_jsonb(NEW)` conversion
   - Bubble API doesn't have a matching field
   - Bubble rejects the unrecognized field

2. **Scenario B**: The `sync_queue.status` column value is bleeding into the payload
   - Though less likely since code separates them
   - But worth verifying

### Cascading Problems

This affects:
- ✗ New proposal creation (enqueued for Bubble sync)
- ✗ New listing creation (auto-triggered sync)
- ✗ Proposal updates (if sync triggers are enabled)
- ✗ Listing updates (if sync triggers are enabled)

---

## Solution

### Quick Fix (Immediate)

**Remove or disable the problematic trigger** until fix is applied:

```sql
DROP TRIGGER IF EXISTS listing_bubble_sync_trigger ON listing;
```

This stops the auto-sync for listings and prevents the error while we fix it.

### Proper Fix (Comprehensive)

**Exclude metadata columns when building sync payloads**:

#### Fix #1: Update Listing Sync Trigger

**File**: `supabase/migrations/20251209_listing_bubble_sync_backend.sql`

**Current (Line 37)**:
```sql
payload = to_jsonb(NEW),  -- ❌ Includes all columns
```

**Replace with**:
```sql
payload = to_jsonb(NEW) - 'bubble_id' - 'created_at' - 'updated_at' - 'pending' - '_internal',
```

Or better, use a whitelist approach:

```sql
-- Build payload with only Bubble-compatible fields
payload = jsonb_build_object(
    '_id', NEW._id,
    'Name', NEW."Name",
    'Type of Space', NEW."Type of Space",
    'Bedrooms', NEW."Bedrooms",
    'rental type', NEW."rental type"
    -- ... include only fields that Bubble recognizes
),
```

#### Fix #2: Update Generic Sync Trigger

**File**: `supabase/migrations/20251205_create_sync_queue_tables.sql:137`

**Current**:
```sql
record_data := to_jsonb(NEW);
```

**Add exclusion logic** (after line 179):
```sql
-- Remove internal/Supabase-only fields
record_data := record_data
    - 'bubble_id'
    - 'created_at'
    - 'updated_at'
    - 'pending'
    - 'sync_status'
    - 'last_sync_error';
```

#### Fix #3: Update bubbleSyncQueue.ts (Defensive)

**File**: `supabase/functions/proposal/lib/bubbleSyncQueue.ts:56`

**Add field filtering** before enqueuing:

```typescript
// Filter out internal/Supabase-only fields
const cleanPayload = filterBubbleUnsupportedFields(item.payload);

const queuePayload = {
  ...cleanPayload,
  _id: item.bubbleId || item.recordId,
};

// Helper function
function filterBubbleUnsupportedFields(data: Record<string, unknown>) {
  const excluded = [
    'bubble_id',
    'created_at',
    'updated_at',
    'pending',
    'sync_status',
    'bubble_sync_error'
  ];

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!excluded.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}
```

---

## Implementation Steps

### Step 1: Create New Migration

Create: `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql`

```sql
-- ============================================================================
-- Migration: Fix Bubble Sync Payload Filtering
-- Created: 2025-12-09
-- Purpose: Remove internal/metadata columns from sync payloads sent to Bubble
-- ============================================================================

-- ============================================================================
-- PART 1: Fix listing_bubble_sync_queue Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_listing_sync_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if bubble_id is NULL (not yet synced to Bubble)
    IF NEW.bubble_id IS NULL THEN
        -- Build payload with excluded internal fields
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
                - 'bubble_id'
                - 'created_at'
                - 'updated_at'
                - 'sync_status'
                - 'bubble_sync_error'
                - 'pending',  -- Remove any "pending" fields
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

-- ============================================================================
-- PART 2: Fix generic trigger_sync_queue Trigger
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

        -- CRITICAL: Remove internal Supabase fields that Bubble won't recognize
        record_data := record_data
            - 'bubble_id'          -- Internal tracking field
            - 'created_at'         -- Supabase timestamp
            - 'updated_at'         -- Supabase timestamp
            - 'sync_status'        -- Internal status
            - 'bubble_sync_error'  -- Internal error tracking
            - 'pending';           -- Remove any "pending" fields

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
-- DONE
-- ============================================================================
```

### Step 2: Update Edge Function (Defensive)

**File**: `supabase/functions/proposal/lib/bubbleSyncQueue.ts`

Add before line 56:

```typescript
/**
 * Filter out Supabase/internal fields that Bubble won't recognize
 */
function filterBubbleIncompatibleFields(data: Record<string, unknown>): Record<string, unknown> {
  const incompatibleFields = new Set([
    'bubble_id',        // Supabase tracking
    'created_at',       // Supabase timestamp
    'updated_at',       // Supabase timestamp
    'sync_status',      // Internal flag
    'bubble_sync_error',// Internal error tracking
    'pending',          // Any pending status field
  ]);

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!incompatibleFields.has(key) && value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
}
```

Then update line 57-59:

```typescript
// Filter out Bubble-incompatible fields before queuing
const cleanPayload = filterBubbleIncompatibleFields(item.payload);

const queuePayload = {
  ...cleanPayload,
  _id: item.bubbleId || item.recordId,
};
```

### Step 3: Deploy Migration

```bash
supabase db push
```

### Step 4: Clear Existing Queue Items

If there are stuck items in the queue with bad payloads:

```sql
-- Check failing items
SELECT id, table_name, error_message, payload
FROM sync_queue
WHERE status = 'failed'
  AND error_message LIKE '%pending%';

-- Clear them (after investigating)
DELETE FROM sync_queue
WHERE status = 'failed'
  AND error_message LIKE '%pending%'
  AND created_at < now() - interval '1 hour';
```

---

## Verification

### Test 1: Create New Proposal
```bash
curl -X POST https://your-project.supabase.co/functions/v1/proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "create",
    "payload": { ... proposal data ... }
  }'
```

Expected: 200 OK, proposal created in both Supabase and Bubble

### Test 2: Create New Listing
```bash
# Direct Supabase INSERT (if listing trigger is active)
# Or via listing edge function
```

Expected: 200 OK, listing created in both Supabase and Bubble

### Test 3: Check Sync Queue
```sql
SELECT table_name, status, error_message
FROM sync_queue
ORDER BY created_at DESC
LIMIT 10;
```

Expected: All items in 'completed' status, no 'failed' items with "Unrecognized field" errors

---

## Files Affected

- `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql` (NEW)
- `supabase/migrations/20251209_listing_bubble_sync_backend.sql` (UPDATED)
- `supabase/migrations/20251205_create_sync_queue_tables.sql` (UPDATED)
- `supabase/functions/proposal/lib/bubbleSyncQueue.ts` (UPDATED)

---

## Prevention Measures

### For Future Syncs:

1. **Always filter metadata before sending to Bubble**
   - Use field exclusion lists
   - Whitelist approach preferred
   - Never send `to_jsonb(entire_row)`

2. **Document Bubble field requirements**
   - Create mapping between Supabase and Bubble fields
   - Maintain in `supabase/functions/bubble_sync/lib/fieldMapping.ts`
   - Validate before queueing

3. **Add validation to sync handlers**
   - Check for unrecognized fields
   - Log detailed payload before Bubble API call
   - Fail fast with clear error messages

---

## References

- **bubbleDataApi.ts**: Filtering happens here (line 98) via `applyFieldMappingToBubble()`
- **fieldMapping.ts**: Field mapping registry with EXCLUDED_SYNC_FIELDS
- **transformer.ts**: Field transformation logic
- **Database Schema**: `supabase/migrations/20251209_listing_bubble_sync_backend.sql`
