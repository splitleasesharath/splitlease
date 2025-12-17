# Implementation Plan: Normalize Thread-Message Relationships with Junction Tables

## Overview

This plan converts the JSONB array fields in the `thread` table that store message references into proper relational junction tables with foreign keys to the `_message` table. This normalization improves query performance, enables proper referential integrity, and follows database best practices.

## Success Criteria

- [ ] Junction table `thread_message` created in `junctions` schema
- [ ] All five message relationship types properly represented with `message_type` enum
- [ ] Foreign key constraints established to `thread._id` and `_message._id`
- [ ] Existing JSONB data migrated to junction table
- [ ] Application code updated to use new junction table (if any direct JSONB access exists)
- [ ] Backward compatibility maintained during migration period
- [ ] No data loss during migration

## Context & References

### Current State Analysis

#### Thread Table - JSONB Message Fields

| Column Name | Data Type | Non-null Rows | Sample Data |
|-------------|-----------|---------------|-------------|
| `Messages sent by SLBot to Host` | jsonb | 770 | `["1757673924798x...", "1759477545910x..."]` |
| `Messages sent by SLBot to Guest` | jsonb | 766 | `["1757673924671x...", "1759477551455x..."]` |
| `Message list` | jsonb | 802 | `["1757673924671x...", "1757673924798x...", ...]` |
| `Messages Sent by Host` | jsonb | 84 | `["msgId1", "msgId2", ...]` |
| `Messages Sent by Guest` | jsonb | 135 | `["msgId1", "msgId2", ...]` |

**Key Observations:**
1. Values are stored as **double-encoded JSON strings** (e.g., `"[\"id1\", \"id2\"]"` instead of native arrays)
2. `Message list` contains ALL messages for the thread (superset of other columns)
3. The other four columns categorize messages by sender type and visibility
4. Total threads: 802
5. Existing junction table pattern exists in `junctions` schema (e.g., `thread_participant`)

#### _message Table Structure

| Key Column | Type | Purpose |
|------------|------|---------|
| `_id` | text (PK) | Bubble-style ID (e.g., `1757673924798x980755487759654300`) |
| `Associated Thread/Conversation` | text | Foreign key to thread._id |
| `-Originator User` | text | Message sender |
| `-Host User` | text | Thread host |
| `-Guest User` | text | Thread guest |
| `is Split Bot` | boolean | Whether sent by SLBot |
| `is Visible to Host` | boolean | Host visibility |
| `is Visible to Guest` | boolean | Guest visibility |

**Important:** The `_message` table already has an `Associated Thread/Conversation` field linking to thread, but the JSONB arrays in `thread` provide categorized access and are used by Bubble.io.

### Existing Junction Table Pattern

```sql
-- Example from junctions.thread_participant
CREATE TABLE junctions.thread_participant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text REFERENCES public.thread(_id),
  user_id text REFERENCES public.user(_id),
  role text,  -- 'host' or 'guest'
  joined_at timestamptz DEFAULT now()
);
```

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/_shared/messagingHelpers.ts` | Creates threads/messages | No changes needed - uses `_message` table directly |
| `supabase/functions/messages/handlers/sendMessage.ts` | Send message handler | No changes needed - writes to `_message` table |
| `supabase/functions/messages/handlers/getMessages.ts` | Get messages handler | No changes needed - queries `_message` table by thread |
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Frontend messaging | No changes needed - queries thread directly |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | Bubble sync mappings | May need mapping for junction table sync |

### Critical Finding: Low/No Direct JSONB Usage

After thorough code analysis, the JSONB message fields in `thread` are:
1. **Not directly queried** by the application frontend
2. **Not used** by the Edge Functions for message retrieval
3. **Likely maintained** for Bubble.io compatibility (legacy sync)

The `_message` table's `Associated Thread/Conversation` field is the actual source of truth for thread-message relationships in Supabase queries.

## Proposed Schema Design

### Option Selected: Single Junction Table with Enum

A single junction table with a `message_type` enum column provides:
- Simpler schema with one table to maintain
- Flexibility to query all types or filter by type
- Follows existing pattern in `junctions` schema
- Easy to extend with new message types if needed

### Junction Table Schema

```sql
-- Create enum for message relationship types
CREATE TYPE junctions.thread_message_type AS ENUM (
  'all',              -- Message list (all messages)
  'slbot_to_host',    -- Messages sent by SLBot to Host
  'slbot_to_guest',   -- Messages sent by SLBot to Guest
  'host_sent',        -- Messages Sent by Host
  'guest_sent'        -- Messages Sent by Guest
);

-- Create junction table
CREATE TABLE junctions.thread_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL REFERENCES public.thread(_id) ON DELETE CASCADE,
  message_id text NOT NULL REFERENCES public._message(_id) ON DELETE CASCADE,
  message_type junctions.thread_message_type NOT NULL,
  position integer,  -- Preserve ordering from original arrays
  created_at timestamptz DEFAULT now(),

  -- Ensure no duplicate entries for same thread/message/type combination
  CONSTRAINT thread_message_unique UNIQUE (thread_id, message_id, message_type)
);

-- Indexes for common query patterns
CREATE INDEX idx_thread_message_thread_id ON junctions.thread_message(thread_id);
CREATE INDEX idx_thread_message_message_id ON junctions.thread_message(message_id);
CREATE INDEX idx_thread_message_type ON junctions.thread_message(message_type);
CREATE INDEX idx_thread_message_thread_type ON junctions.thread_message(thread_id, message_type);

-- Comments for documentation
COMMENT ON TABLE junctions.thread_message IS 'Junction table normalizing thread-message relationships from legacy JSONB arrays';
COMMENT ON COLUMN junctions.thread_message.message_type IS 'Categorizes the message relationship: all (full list), slbot_to_host, slbot_to_guest, host_sent, guest_sent';
COMMENT ON COLUMN junctions.thread_message.position IS 'Preserves original array ordering for display purposes';
```

## Implementation Steps

### Step 1: Create Migration for Junction Table Schema

**Files:** New migration file
**Purpose:** Create the junction table and enum type in the `junctions` schema

**Details:**
- Create the `thread_message_type` enum in `junctions` schema
- Create the `thread_message` junction table
- Add foreign key constraints with ON DELETE CASCADE
- Create performance indexes
- Add documentation comments

**Migration Name:** `create_thread_message_junction`

**SQL:**
```sql
-- Migration: create_thread_message_junction
-- Purpose: Normalize JSONB message arrays in thread table to proper relational structure

-- Create enum for message relationship types
CREATE TYPE junctions.thread_message_type AS ENUM (
  'all',              -- Message list (all messages in thread)
  'slbot_to_host',    -- Messages sent by SLBot to Host
  'slbot_to_guest',   -- Messages sent by SLBot to Guest
  'host_sent',        -- Messages Sent by Host
  'guest_sent'        -- Messages Sent by Guest
);

-- Create junction table
CREATE TABLE junctions.thread_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  message_id text NOT NULL,
  message_type junctions.thread_message_type NOT NULL,
  position integer,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT fk_thread_message_thread
    FOREIGN KEY (thread_id)
    REFERENCES public.thread(_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_thread_message_message
    FOREIGN KEY (message_id)
    REFERENCES public._message(_id)
    ON DELETE CASCADE,

  CONSTRAINT thread_message_unique
    UNIQUE (thread_id, message_id, message_type)
);

-- Performance indexes
CREATE INDEX idx_thread_message_thread_id
  ON junctions.thread_message(thread_id);

CREATE INDEX idx_thread_message_message_id
  ON junctions.thread_message(message_id);

CREATE INDEX idx_thread_message_type
  ON junctions.thread_message(message_type);

CREATE INDEX idx_thread_message_thread_type
  ON junctions.thread_message(thread_id, message_type);

-- Documentation
COMMENT ON TABLE junctions.thread_message IS
  'Junction table normalizing thread-message relationships from legacy JSONB arrays in thread table';

COMMENT ON COLUMN junctions.thread_message.message_type IS
  'Categorizes the relationship: all=full list, slbot_to_host/slbot_to_guest=SLBot messages, host_sent/guest_sent=user messages';

COMMENT ON COLUMN junctions.thread_message.position IS
  'Preserves original array ordering for chronological display';
```

**Validation:**
- Run `\dt junctions.*` to verify table created
- Run `\d junctions.thread_message` to verify schema

---

### Step 2: Create Data Migration Function

**Files:** New migration file (separate from schema)
**Purpose:** Migrate existing JSONB data to junction table

**Details:**
- Parse double-encoded JSON strings from JSONB columns
- Insert records for each message relationship type
- Preserve array position for ordering
- Handle NULL values and empty arrays
- Use batch processing for performance
- Log migration progress

**Migration Name:** `migrate_thread_message_data`

**SQL:**
```sql
-- Migration: migrate_thread_message_data
-- Purpose: Populate junction table from existing JSONB arrays

-- Helper function to safely parse potentially double-encoded JSON arrays
CREATE OR REPLACE FUNCTION _temp_parse_jsonb_array(val jsonb)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  result text[];
  parsed jsonb;
BEGIN
  IF val IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Check if it's a string (double-encoded)
  IF jsonb_typeof(val) = 'string' THEN
    BEGIN
      -- Try to parse the string as JSON
      parsed := (val #>> '{}')::jsonb;
      IF jsonb_typeof(parsed) = 'array' THEN
        SELECT array_agg(elem::text)
        INTO result
        FROM jsonb_array_elements_text(parsed) AS elem;
        RETURN COALESCE(result, ARRAY[]::text[]);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN ARRAY[]::text[];
    END;
  END IF;

  -- It's already a proper array
  IF jsonb_typeof(val) = 'array' THEN
    SELECT array_agg(elem::text)
    INTO result
    FROM jsonb_array_elements_text(val) AS elem;
    RETURN COALESCE(result, ARRAY[]::text[]);
  END IF;

  RETURN ARRAY[]::text[];
END;
$$;

-- Migrate data from thread JSONB columns to junction table
DO $$
DECLARE
  thread_rec RECORD;
  msg_id text;
  arr_position integer;
  msg_ids text[];
  total_threads integer;
  processed integer := 0;
BEGIN
  SELECT COUNT(*) INTO total_threads FROM public.thread;
  RAISE NOTICE 'Starting migration of % threads', total_threads;

  FOR thread_rec IN
    SELECT
      _id,
      "Message list",
      "Messages sent by SLBot to Host",
      "Messages sent by SLBot to Guest",
      "Messages Sent by Host",
      "Messages Sent by Guest"
    FROM public.thread
  LOOP
    -- Migrate "Message list" (all messages)
    msg_ids := _temp_parse_jsonb_array(thread_rec."Message list");
    arr_position := 0;
    FOREACH msg_id IN ARRAY msg_ids LOOP
      IF msg_id IS NOT NULL AND msg_id != '' THEN
        INSERT INTO junctions.thread_message (thread_id, message_id, message_type, position)
        VALUES (thread_rec._id, msg_id, 'all', arr_position)
        ON CONFLICT (thread_id, message_id, message_type) DO NOTHING;
        arr_position := arr_position + 1;
      END IF;
    END LOOP;

    -- Migrate "Messages sent by SLBot to Host"
    msg_ids := _temp_parse_jsonb_array(thread_rec."Messages sent by SLBot to Host");
    arr_position := 0;
    FOREACH msg_id IN ARRAY msg_ids LOOP
      IF msg_id IS NOT NULL AND msg_id != '' THEN
        INSERT INTO junctions.thread_message (thread_id, message_id, message_type, position)
        VALUES (thread_rec._id, msg_id, 'slbot_to_host', arr_position)
        ON CONFLICT (thread_id, message_id, message_type) DO NOTHING;
        arr_position := arr_position + 1;
      END IF;
    END LOOP;

    -- Migrate "Messages sent by SLBot to Guest"
    msg_ids := _temp_parse_jsonb_array(thread_rec."Messages sent by SLBot to Guest");
    arr_position := 0;
    FOREACH msg_id IN ARRAY msg_ids LOOP
      IF msg_id IS NOT NULL AND msg_id != '' THEN
        INSERT INTO junctions.thread_message (thread_id, message_id, message_type, position)
        VALUES (thread_rec._id, msg_id, 'slbot_to_guest', arr_position)
        ON CONFLICT (thread_id, message_id, message_type) DO NOTHING;
        arr_position := arr_position + 1;
      END IF;
    END LOOP;

    -- Migrate "Messages Sent by Host"
    msg_ids := _temp_parse_jsonb_array(thread_rec."Messages Sent by Host");
    arr_position := 0;
    FOREACH msg_id IN ARRAY msg_ids LOOP
      IF msg_id IS NOT NULL AND msg_id != '' THEN
        INSERT INTO junctions.thread_message (thread_id, message_id, message_type, position)
        VALUES (thread_rec._id, msg_id, 'host_sent', arr_position)
        ON CONFLICT (thread_id, message_id, message_type) DO NOTHING;
        arr_position := arr_position + 1;
      END IF;
    END LOOP;

    -- Migrate "Messages Sent by Guest"
    msg_ids := _temp_parse_jsonb_array(thread_rec."Messages Sent by Guest");
    arr_position := 0;
    FOREACH msg_id IN ARRAY msg_ids LOOP
      IF msg_id IS NOT NULL AND msg_id != '' THEN
        INSERT INTO junctions.thread_message (thread_id, message_id, message_type, position)
        VALUES (thread_rec._id, msg_id, 'guest_sent', arr_position)
        ON CONFLICT (thread_id, message_id, message_type) DO NOTHING;
        arr_position := arr_position + 1;
      END IF;
    END LOOP;

    processed := processed + 1;
    IF processed % 100 = 0 THEN
      RAISE NOTICE 'Processed % of % threads', processed, total_threads;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration complete: % threads processed', processed;
END;
$$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS _temp_parse_jsonb_array(jsonb);
```

**Validation:**
- Run count queries to verify data migrated:
```sql
SELECT message_type, COUNT(*)
FROM junctions.thread_message
GROUP BY message_type;
```

---

### Step 3: Create Validation Queries

**Files:** None (execute in SQL client)
**Purpose:** Verify data integrity after migration

**SQL Validation Queries:**
```sql
-- 1. Compare counts: JSONB vs Junction Table
WITH jsonb_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE "Message list" IS NOT NULL) as message_list_threads,
    COUNT(*) FILTER (WHERE "Messages sent by SLBot to Host" IS NOT NULL) as slbot_host_threads,
    COUNT(*) FILTER (WHERE "Messages sent by SLBot to Guest" IS NOT NULL) as slbot_guest_threads,
    COUNT(*) FILTER (WHERE "Messages Sent by Host" IS NOT NULL) as host_sent_threads,
    COUNT(*) FILTER (WHERE "Messages Sent by Guest" IS NOT NULL) as guest_sent_threads
  FROM public.thread
),
junction_counts AS (
  SELECT
    COUNT(DISTINCT thread_id) FILTER (WHERE message_type = 'all') as message_list_threads,
    COUNT(DISTINCT thread_id) FILTER (WHERE message_type = 'slbot_to_host') as slbot_host_threads,
    COUNT(DISTINCT thread_id) FILTER (WHERE message_type = 'slbot_to_guest') as slbot_guest_threads,
    COUNT(DISTINCT thread_id) FILTER (WHERE message_type = 'host_sent') as host_sent_threads,
    COUNT(DISTINCT thread_id) FILTER (WHERE message_type = 'guest_sent') as guest_sent_threads
  FROM junctions.thread_message
)
SELECT 'JSONB' as source, * FROM jsonb_counts
UNION ALL
SELECT 'Junction' as source, * FROM junction_counts;

-- 2. Verify message IDs exist in _message table
SELECT COUNT(*) as orphan_references
FROM junctions.thread_message tm
LEFT JOIN public._message m ON tm.message_id = m._id
WHERE m._id IS NULL;

-- 3. Sample data comparison for a specific thread
SELECT
  t._id as thread_id,
  t."Message list" as jsonb_messages,
  array_agg(tm.message_id ORDER BY tm.position) as junction_messages
FROM public.thread t
LEFT JOIN junctions.thread_message tm
  ON t._id = tm.thread_id AND tm.message_type = 'all'
WHERE t."Message list" IS NOT NULL
GROUP BY t._id, t."Message list"
LIMIT 5;
```

**Validation:** All counts should match, orphan_references should be 0

---

### Step 4: Create Database Trigger for Future Inserts (Optional)

**Files:** New migration file
**Purpose:** Keep junction table in sync when JSONB columns are updated

**Note:** This step is optional since:
1. Current application code writes directly to `_message` table
2. JSONB columns may be maintained by Bubble.io sync only
3. Can be deferred until Bubble.io sync is fully deprecated

**SQL (for future consideration):**
```sql
-- Trigger function to sync junction table when thread JSONB is updated
CREATE OR REPLACE FUNCTION sync_thread_message_junction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process if Message list changed
  IF NEW."Message list" IS DISTINCT FROM OLD."Message list" THEN
    -- Delete existing 'all' type entries
    DELETE FROM junctions.thread_message
    WHERE thread_id = NEW._id AND message_type = 'all';

    -- Insert new entries (would need proper JSON parsing)
    -- ... implementation depends on how Bubble updates these fields
  END IF;

  RETURN NEW;
END;
$$;

-- CREATE TRIGGER thread_message_sync_trigger
--   AFTER UPDATE ON public.thread
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_thread_message_junction();
```

---

### Step 5: Update Bubble Sync Mapping (If Needed)

**Files:** `supabase/functions/bubble_sync/lib/tableMapping.ts`
**Purpose:** Add mapping for junction table if Bubble needs to sync with it

**Evaluation:**
Based on code review, Bubble sync currently:
1. Pushes data FROM Supabase TO Bubble (not the reverse for messages)
2. Message creation happens in Supabase first, then syncs to Bubble
3. The JSONB arrays in `thread` are likely updated by Bubble-side workflows

**Recommendation:** No immediate changes needed. The junction table serves as:
- A normalized view for Supabase-native queries
- Future replacement for JSONB arrays when Bubble is fully deprecated

---

### Step 6: Create Utility View (Optional Enhancement)

**Files:** New migration file
**Purpose:** Create a view that makes querying the junction table easier

**SQL:**
```sql
-- Create view for easier querying
CREATE OR REPLACE VIEW public.v_thread_messages AS
SELECT
  tm.thread_id,
  tm.message_id,
  tm.message_type,
  tm.position,
  m."Message Body",
  m."-Originator User" as sender_id,
  m."Created Date" as message_created,
  m."is Split Bot",
  m."is Visible to Host",
  m."is Visible to Guest"
FROM junctions.thread_message tm
JOIN public._message m ON tm.message_id = m._id
ORDER BY tm.thread_id, tm.position;

COMMENT ON VIEW public.v_thread_messages IS
  'Denormalized view joining thread_message junction with _message table for easy querying';
```

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Double-encoded JSON strings | Helper function parses both native arrays and stringified JSON |
| NULL JSONB columns | Returns empty array, no junction records created |
| Empty arrays `[]` | No junction records created (valid state) |
| Message ID not in _message table | Foreign key constraint will reject; ON CONFLICT DO NOTHING skips |
| Duplicate entries in JSONB array | UNIQUE constraint prevents duplicates; first occurrence wins |
| Thread deleted | ON DELETE CASCADE removes all junction records |
| Message deleted | ON DELETE CASCADE removes all junction records referencing it |

## Testing Considerations

### Pre-Migration Tests
1. Count messages per type in JSONB columns
2. Sample 10 threads and manually verify JSONB content
3. Verify `_message` table has matching IDs

### Post-Migration Tests
1. Junction table counts match JSONB counts
2. No orphan references (all message_ids exist in _message)
3. Position ordering matches original array order
4. Sample queries return expected results
5. Application messaging still works (regression test)

### Performance Tests
1. Query junction table by thread_id (should use index)
2. Query junction table by message_type (should use index)
3. Compare query time: JSONB vs junction table for message list

## Rollback Strategy

### If Schema Migration Fails
```sql
-- Drop junction table and enum
DROP TABLE IF EXISTS junctions.thread_message;
DROP TYPE IF EXISTS junctions.thread_message_type;
```

### If Data Migration Fails
```sql
-- Clear junction table, keep schema
TRUNCATE junctions.thread_message;
-- Re-run data migration
```

### If Application Errors After Migration
1. Junction table is additive - JSONB columns still exist
2. No application code currently depends on junction table
3. Simply drop junction table if needed

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| `junctions` schema exists | Ready | Already contains `thread_participant`, `user_lease`, etc. |
| `thread._id` is valid PK | Ready | Text primary key |
| `_message._id` is valid PK | Ready | Text primary key |
| JSONB parsing logic | Needs implementation | Handle double-encoding |
| Application code changes | None required | No code currently queries JSONB arrays |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Use ON CONFLICT DO NOTHING, backup first |
| Performance degradation | Low | Medium | Proper indexes added |
| Bubble sync breaks | Low | Medium | JSONB columns preserved, junction is additive |
| Double-encoding parsing fails | Medium | Medium | Comprehensive helper function with error handling |
| Foreign key violations | Low | Medium | ON CONFLICT DO NOTHING skips invalid references |

## Post-Implementation Notes

### Future Considerations
1. **Deprecate JSONB columns**: After confirming junction table works, consider removing JSONB columns from thread table
2. **Update Bubble sync**: When fully migrating away from Bubble, junction table becomes primary source
3. **Add triggers**: If Bubble continues updating JSONB, add sync triggers to keep junction current
4. **Performance monitoring**: Monitor query performance on junction table vs JSONB

### Documentation Updates
- Update DATABASE_SCHEMA_OVERVIEW.md with junction table
- Update supabase/CLAUDE.md with new table
- Document in .claude/plans/Documents/

---

## File References Summary

### Files Examined
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\messagingHelpers.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\handlers\sendMessage.ts`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\messages\handlers\getMessages.ts`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\MessagingPage\useMessagingPageLogic.js`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabaseUtils.js`

### Files to Create
- New Supabase migration: `create_thread_message_junction.sql`
- New Supabase migration: `migrate_thread_message_data.sql`

### Files NOT Requiring Changes
- `supabase/functions/_shared/messagingHelpers.ts` - Uses `_message` table directly
- `supabase/functions/messages/handlers/sendMessage.ts` - Writes to `_message` table
- `supabase/functions/messages/handlers/getMessages.ts` - Queries by thread via `_message.Associated Thread/Conversation`
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` - Queries thread directly, no JSONB parsing
- `supabase/functions/bubble_sync/lib/tableMapping.ts` - No immediate changes needed

### Database Tables Referenced
- `public.thread` - Source table with JSONB arrays
- `public._message` - Target table for foreign key
- `junctions.thread_participant` - Pattern reference for existing junction tables
- `junctions.thread_message` - New junction table to create
