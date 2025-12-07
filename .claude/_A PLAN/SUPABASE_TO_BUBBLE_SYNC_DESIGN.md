# Supabase → Bubble Push Sync System Design

**Created**: 2025-12-05
**Status**: Design/Ideation
**Related**: `bubble_to_supabase_sync.py` (reverse direction)

---

## Overview

This document outlines the architecture for a **generalized push/sync system** that pushes data FROM Supabase TO Bubble. When a new row is created or updated in Supabase, it gets added to a queue and processed by an Edge Function that calls Bubble workflow endpoints.

### Current State (Pull)
```
Bubble (Source of Truth) → bubble_to_supabase_sync.py → Supabase (Replica)
```

### New State (Push)
```
Supabase (Local Changes) → sync_queue → bubble_sync Edge Function → Bubble (wf/ endpoints)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE DATABASE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  user    │  │ listing  │  │ proposal │  │ booking  │  ...           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │             │             │             │                        │
│       └─────────────┴─────────────┴─────────────┘                        │
│                         │                                                │
│              ┌──────────▼──────────┐                                    │
│              │  DATABASE TRIGGERS   │                                    │
│              │  (on INSERT/UPDATE)  │                                    │
│              └──────────┬──────────┘                                    │
│                         │                                                │
│              ┌──────────▼──────────┐                                    │
│              │     sync_queue       │ ◄── Queue table                   │
│              │  (pending, retry)    │                                    │
│              └──────────┬──────────┘                                    │
│                         │                                                │
├─────────────────────────┼───────────────────────────────────────────────┤
│                         │                                                │
│              ┌──────────▼──────────┐                                    │
│              │   bubble_sync        │ ◄── Edge Function                 │
│              │   Edge Function      │                                    │
│              └──────────┬──────────┘                                    │
│                         │                                                │
│    ┌────────────────────┼────────────────────┐                          │
│    │                    │                    │                          │
│    ▼                    ▼                    ▼                          │
│ ┌──────────┐     ┌──────────┐        ┌──────────┐                      │
│ │sync_config│     │ Transform │        │  Bubble  │                      │
│ │  (table→  │     │   Data    │        │   wf/    │                      │
│ │ workflow) │     │ (reverse) │        │ endpoint │                      │
│ └──────────┘     └──────────┘        └──────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: sync_queue Table

The queue table stores pending synchronization operations.

### Schema

```sql
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What to sync
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,              -- The _id from the source table
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Snapshot of data at queue time (JSONB)
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
    idempotency_key TEXT UNIQUE,

    -- Index for efficient queue processing
    CONSTRAINT sync_queue_pending_idx UNIQUE (table_name, record_id, status)
        WHERE status = 'pending'
);

-- Index for efficient polling
CREATE INDEX idx_sync_queue_status_created ON sync_queue (status, created_at)
    WHERE status IN ('pending', 'failed');

-- Index for retry scheduling
CREATE INDEX idx_sync_queue_retry ON sync_queue (next_retry_at)
    WHERE status = 'failed' AND retry_count < max_retries;
```

### Status Flow

```
pending → processing → completed
              ↓
           failed → (retry) → processing → completed
              ↓                    ↓
         (max retries)         failed (permanent)
```

---

## Component 2: sync_config Table

Configuration table mapping Supabase tables to Bubble workflow endpoints.

### Schema

```sql
CREATE TABLE sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mapping
    supabase_table TEXT NOT NULL UNIQUE,
    bubble_workflow TEXT NOT NULL,        -- e.g., 'sync_user_from_supabase'
    bubble_object_type TEXT,              -- e.g., 'user' (for verification)

    -- Behavior
    enabled BOOLEAN DEFAULT TRUE,
    sync_on_insert BOOLEAN DEFAULT TRUE,
    sync_on_update BOOLEAN DEFAULT TRUE,
    sync_on_delete BOOLEAN DEFAULT FALSE,

    -- Field mapping (optional, for complex transformations)
    field_mapping JSONB,                  -- { "supabase_field": "bubble_field" }
    excluded_fields TEXT[],               -- Fields to NOT sync

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial configuration
INSERT INTO sync_config (supabase_table, bubble_workflow, bubble_object_type) VALUES
    ('user', 'sync_user_from_supabase', 'user'),
    ('listing', 'sync_listing_from_supabase', 'listing'),
    ('proposal', 'sync_proposal_from_supabase', 'proposal'),
    ('bookings_stays', 'sync_booking_stay_from_supabase', 'bookings-stays'),
    ('bookings_leases', 'sync_booking_lease_from_supabase', 'bookings-leases');
```

---

## Component 3: Database Triggers

Generic trigger function that adds entries to the queue.

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION trigger_sync_queue()
RETURNS TRIGGER AS $$
DECLARE
    config_record RECORD;
    should_sync BOOLEAN := FALSE;
    op_type TEXT;
    record_data JSONB;
    record_id TEXT;
BEGIN
    -- Determine operation type
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
            record_data := record_data - config_record.excluded_fields;
        END IF;

        -- Insert into queue (or update existing pending entry)
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
        ON CONFLICT (table_name, record_id, status)
            WHERE status = 'pending'
        DO UPDATE SET
            payload = EXCLUDED.payload,
            operation = EXCLUDED.operation,
            created_at = NOW();
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Apply Triggers to Tables

```sql
-- User table
CREATE TRIGGER user_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_queue();

-- Listing table
CREATE TRIGGER listing_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON listing
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_queue();

-- Proposal table
CREATE TRIGGER proposal_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON proposal
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_queue();

-- Add more as needed...
```

---

## Component 4: Field Transformation (Supabase → Bubble)

Reverse transformation from the pull script. Key conversions:

### Day Index Conversion
```typescript
// Supabase (JS): 0=Sunday, 1=Monday... 6=Saturday
// Bubble:        1=Sunday, 2=Monday... 7=Saturday

function adaptDaysToBubble(days: number[]): number[] {
    return days.map(day => day + 1);
}

function adaptDaysFromBubble(days: number[]): number[] {
    return days.map(day => day - 1);
}
```

### Boolean Handling
```typescript
// Supabase stores true/false
// Bubble accepts true/false (no conversion needed)
// But some legacy Bubble fields might need 0.0/1.0
function toBubbleBoolean(value: boolean, useLegacy: boolean = false): boolean | number {
    if (useLegacy) {
        return value ? 1.0 : 0.0;
    }
    return value;
}
```

### JSONB Fields
```typescript
// Supabase stores as JSONB (already parsed)
// Bubble expects arrays/objects directly
function parseJsonbField(value: any): any {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}
```

### Field Type Registry
```typescript
const FIELD_TYPES = {
    INTEGER_FIELDS: new Set([
        '# of nights available', '.Search Ranking', 'Features - Qty Bathrooms',
        'Features - Qty Bedrooms', 'Features - Qty Beds', 'Features - Qty Guests',
        'Features - SQFT Area', 'Features - SQFT of Room', 'Maximum Months',
        'Maximum Nights', 'Maximum Weeks', 'Metrics - Click Counter',
        'Minimum Months', 'Minimum Nights', 'Minimum Weeks',
        'weeks out to available', '💰Cleaning Cost / Maintenance Fee',
        '💰Damage Deposit', '💰Monthly Host Rate', '💰Price Override',
        '💰Unit Markup'
    ]),

    BOOLEAN_FIELDS: new Set([
        'Active', 'Approved', 'Complete', 'Default Extension Setting',
        'Default Listing', 'Features - Trial Periods Allowed', 'Showcase',
        'allow alternating roommates?', 'confirmedAvailability', 'is private?',
        'isForUsability', 'saw chatgpt suggestions?',
        // User table booleans
        'Additional Credits Received', 'Allow Email Change', 'Hide Nights Error',
        'Hide header announcement', 'ID documents submitted?', 'Lead Info Captured',
        'Mobile Notifications On', 'SMS Lock', 'Toggle - Is Admin',
        'Toggle - Is Corporate User', 'Verify - Phone', 'agreed to term and conditions?',
        'has logged in through mobile app', 'is email confirmed', 'is usability tester',
        'override tester?', 'reminder after 15 days sent?', 'show selector popups?',
        'user verified?', 'user_signed_up', 'usernotifyseton'
    ]),

    JSONB_FIELDS: new Set([
        'AI Suggestions List', 'Clickers', 'Dates - Blocked',
        'Days Available (List of Days)', 'Days Not Available', 'Errors',
        'Features - Amenities In-Building', 'Features - Amenities In-Unit',
        'Features - House Rules', 'Features - Photos', 'Features - Safety',
        'Listing Curation', 'Location - Address', 'Location - Hoods (new)',
        'Location - slightly different address', 'Nights Available (List of Nights) ',
        'Nights Available (numbers)', 'Nights Not Available', 'Reviews',
        'Users that favorite', 'Viewers', 'users with permission'
    ]),

    DAY_FIELDS: new Set([
        'Days Available (List of Days)', 'Days Not Available',
        'Nights Available (List of Nights) ', 'Nights Not Available'
    ])
};
```

---

## Component 5: bubble_sync Edge Function

### Actions

| Action | Description |
|--------|-------------|
| `process_queue` | Process pending items in the queue |
| `sync_single` | Manually sync a single record |
| `retry_failed` | Retry failed items |
| `get_status` | Get queue status/statistics |

### Implementation Structure

```
supabase/functions/bubble_sync/
├── index.ts              # Main router
├── deno.json             # Import map
├── handlers/
│   ├── processQueue.ts   # Main queue processor
│   ├── syncSingle.ts     # Single record sync
│   ├── retryFailed.ts    # Retry logic
│   └── getStatus.ts      # Status endpoint
└── lib/
    ├── transformer.ts    # Field transformation
    ├── bubblePush.ts     # Bubble API caller
    └── queueManager.ts   # Queue operations
```

### Main Router (index.ts)

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();

        switch (action) {
            case 'process_queue':
                return await handleProcessQueue(payload);
            case 'sync_single':
                return await handleSyncSingle(payload);
            case 'retry_failed':
                return await handleRetryFailed(payload);
            case 'get_status':
                return await handleGetStatus(payload);
            default:
                return new Response(
                    JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
```

### Queue Processor Logic

```typescript
async function processQueue(batchSize: number = 10): Promise<ProcessResult> {
    const supabase = createClient(/* config */);

    // 1. Fetch pending items (oldest first, respect batch size)
    const { data: queueItems, error } = await supabase
        .from('sync_queue')
        .select('*, sync_config!inner(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize);

    if (error) throw error;
    if (!queueItems?.length) return { processed: 0, success: 0, failed: 0 };

    const results = { processed: 0, success: 0, failed: 0 };

    for (const item of queueItems) {
        // 2. Mark as processing
        await supabase
            .from('sync_queue')
            .update({ status: 'processing' })
            .eq('id', item.id);

        try {
            // 3. Transform data for Bubble
            const transformedPayload = transformForBubble(
                item.payload,
                item.table_name,
                item.sync_config.field_mapping
            );

            // 4. Call Bubble workflow
            const bubbleResponse = await callBubbleWorkflow(
                item.sync_config.bubble_workflow,
                {
                    _id: item.record_id,
                    operation: item.operation,
                    data: transformedPayload
                }
            );

            // 5. Mark as completed
            await supabase
                .from('sync_queue')
                .update({
                    status: 'completed',
                    processed_at: new Date().toISOString(),
                    bubble_response: bubbleResponse
                })
                .eq('id', item.id);

            results.success++;
        } catch (error) {
            // 6. Handle failure
            const newRetryCount = item.retry_count + 1;
            const status = newRetryCount >= item.max_retries ? 'failed' : 'pending';

            await supabase
                .from('sync_queue')
                .update({
                    status,
                    retry_count: newRetryCount,
                    error_message: error.message,
                    error_details: { stack: error.stack, name: error.name },
                    next_retry_at: status === 'pending'
                        ? calculateNextRetry(newRetryCount)
                        : null
                })
                .eq('id', item.id);

            results.failed++;
        }

        results.processed++;
    }

    return results;
}
```

### Bubble Workflow Caller

```typescript
async function callBubbleWorkflow(
    workflowName: string,
    payload: Record<string, any>
): Promise<any> {
    const bubbleBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
    const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

    const url = `${bubbleBaseUrl}/wf/${workflowName}`;

    console.log(`[BubblePush] Calling workflow: ${workflowName}`);
    console.log(`[BubblePush] URL: ${url}`);
    console.log(`[BubblePush] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${bubbleApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bubble workflow failed: ${response.status} - ${errorText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return { success: true };
    }

    return await response.json();
}
```

---

## Component 6: Bubble Workflow Endpoints (To Be Created)

You'll need to create these workflows in Bubble:

### Generic Pattern

Each workflow should:
1. Accept the payload with `_id`, `operation`, and `data`
2. Based on `operation`, perform INSERT/UPDATE/DELETE
3. Return success/failure

### Example: sync_user_from_supabase

```
Workflow API Endpoint: sync_user_from_supabase

Parameters:
- _id (text): The unique ID of the user
- operation (text): 'INSERT', 'UPDATE', or 'DELETE'
- data (text/JSON): The user data

Actions:
1. If operation = 'INSERT':
   - Create a new User
   - Set all fields from data

2. If operation = 'UPDATE':
   - Search for User where _id = _id
   - Make changes to User
   - Set all fields from data

3. If operation = 'DELETE':
   - Search for User where _id = _id
   - Delete User

Return:
- response: { success: true, _id: result's _id }
```

---

## Invocation Options

### Option 1: Scheduled (Cron)
Set up a pg_cron job to call the Edge Function periodically:

```sql
-- Run every minute
SELECT cron.schedule(
    'process-sync-queue',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/bubble_sync',
        body := '{"action": "process_queue", "payload": {"batch_size": 20}}'::jsonb,
        headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY", "Content-Type": "application/json"}'::jsonb
    );
    $$
);
```

### Option 2: On-Demand
Call the Edge Function manually or from application code:

```typescript
const { data, error } = await supabase.functions.invoke('bubble_sync', {
    body: { action: 'process_queue', payload: { batch_size: 20 } }
});
```

### Option 3: Realtime Trigger (Advanced)
Use Supabase Realtime to trigger processing when items are added to queue:

```typescript
const subscription = supabase
    .channel('sync_queue_changes')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sync_queue'
    }, () => {
        // Trigger processing
        supabase.functions.invoke('bubble_sync', {
            body: { action: 'process_queue', payload: { batch_size: 1 } }
        });
    })
    .subscribe();
```

---

## Error Handling Strategy

### Retry Logic
```typescript
function calculateNextRetry(retryCount: number): string {
    // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
    const delays = [60, 300, 900, 1800, 3600];
    const delay = delays[Math.min(retryCount, delays.length - 1)];
    return new Date(Date.now() + delay * 1000).toISOString();
}
```

### Failure Notifications
- Failed items after max retries can trigger a Slack/email notification
- Dashboard for monitoring queue health

---

## Security Considerations

1. **RLS Policies**: sync_queue and sync_config should be accessible only via service role
2. **Rate Limiting**: Bubble API has rate limits; respect them in batch processing
3. **Idempotency**: Use idempotency keys to prevent duplicate syncs
4. **Sensitive Data**: Exclude password hashes, tokens, etc. from sync

---

## Monitoring & Observability

### Status Endpoint Response
```json
{
    "success": true,
    "data": {
        "queue_stats": {
            "pending": 15,
            "processing": 2,
            "completed_last_hour": 150,
            "failed_last_hour": 3
        },
        "by_table": {
            "user": { "pending": 5, "failed": 0 },
            "listing": { "pending": 8, "failed": 2 },
            "proposal": { "pending": 2, "failed": 1 }
        },
        "oldest_pending": "2025-12-05T10:30:00Z",
        "last_processed": "2025-12-05T10:45:30Z"
    }
}
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `sync_queue` table
- [ ] Create `sync_config` table
- [ ] Deploy basic `bubble_sync` placeholder function

### Phase 2: Core Logic
- [ ] Implement queue processor
- [ ] Implement field transformer
- [ ] Implement Bubble workflow caller

### Phase 3: Triggers
- [ ] Create trigger function
- [ ] Apply to priority tables (user, listing, proposal)
- [ ] Test end-to-end flow

### Phase 4: Bubble Workflows
- [ ] Create `sync_user_from_supabase` workflow
- [ ] Create `sync_listing_from_supabase` workflow
- [ ] Create `sync_proposal_from_supabase` workflow

### Phase 5: Production
- [ ] Set up cron job for queue processing
- [ ] Add monitoring/alerting
- [ ] Add remaining tables

---

## Questions for Implementation

1. **Priority Tables**: Which tables should sync first?
2. **Sync Direction**: Should some tables sync only one direction?
3. **Conflict Resolution**: What happens if Bubble and Supabase have different data?
4. **Batch vs Real-time**: What's acceptable latency for sync?
5. **DELETE Handling**: Should deletes sync or just soft-delete?

---

**Document Version**: 1.0
**Author**: Claude
**Status**: Ready for Review
