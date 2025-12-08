# Bubble Sync Implementation Summary

**Created**: 2025-12-05
**Status**: Ready for Review
**Author**: Claude

---

## Executive Summary

This document summarizes the complete implementation of a **bidirectional sync system** between Supabase and Bubble.io for the Split Lease project.

### What Was Built

| Component | Description |
|-----------|-------------|
| **sync_queue table** | Queue for pending sync operations |
| **sync_config table** | Configuration mapping tables to workflows |
| **Database triggers** | Auto-add changes to queue on INSERT/UPDATE/DELETE |
| **bubble_sync Edge Function** | Processes queue and pushes to Bubble |
| **Data API Client** | Direct CRUD via `/obj/` endpoints |
| **Workflow API Client** | Trigger workflows via `/wf/` endpoints |
| **Field Transformer** | Type conversion (days, booleans, JSONB) |
| **Table/Field Mapping** | Name conversion between systems |

---

## Part 1: Queue-Based Sync System

### Architecture

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
│              │     sync_queue       │                                    │
│              │  (pending items)     │                                    │
│              └──────────┬──────────┘                                    │
│                         │                                                │
├─────────────────────────┼───────────────────────────────────────────────┤
│                         │                                                │
│              ┌──────────▼──────────┐                                    │
│              │   bubble_sync        │                                    │
│              │   Edge Function      │                                    │
│              └──────────┬──────────┘                                    │
│                         │                                                │
│         ┌───────────────┼───────────────┐                               │
│         │               │               │                               │
│         ▼               ▼               ▼                               │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐                           │
│    │  POST   │    │  PATCH  │    │ DELETE  │                           │
│    │ /obj/   │    │ /obj/id │    │ /obj/id │                           │
│    └─────────┘    └─────────┘    └─────────┘                           │
│                                                                          │
│                    BUBBLE.IO API                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Files Created

```
supabase/
├── migrations/
│   └── 20251205_create_sync_queue_tables.sql   # Queue + config tables
│
└── functions/
    └── bubble_sync/
        ├── index.ts                             # Main router
        ├── deno.json                            # Import map
        │
        ├── handlers/
        │   ├── processQueue.ts                  # Workflow API processor
        │   ├── processQueueDataApi.ts           # Data API processor
        │   ├── syncSingle.ts                    # Manual single sync
        │   ├── retryFailed.ts                   # Retry with backoff
        │   ├── getStatus.ts                     # Queue statistics
        │   ├── cleanup.ts                       # Remove old items
        │   └── buildRequest.ts                  # Preview requests
        │
        └── lib/
            ├── transformer.ts                   # Type conversion
            ├── bubblePush.ts                    # Workflow API client
            ├── bubbleDataApi.ts                 # Data API client
            ├── queueManager.ts                  # Queue CRUD
            ├── tableMapping.ts                  # Table name mapping
            └── fieldMapping.ts                  # Field name mapping
```

---

## Part 2: Database Schema

### sync_queue Table

```sql
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What to sync
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Data snapshot
    payload JSONB,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),

    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,

    -- Response
    bubble_response JSONB,

    -- Idempotency
    idempotency_key TEXT UNIQUE
);
```

### sync_config Table

```sql
CREATE TABLE sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mapping
    supabase_table TEXT NOT NULL UNIQUE,
    bubble_workflow TEXT NOT NULL,
    bubble_object_type TEXT,

    -- Behavior flags
    enabled BOOLEAN DEFAULT TRUE,
    sync_on_insert BOOLEAN DEFAULT TRUE,
    sync_on_update BOOLEAN DEFAULT TRUE,
    sync_on_delete BOOLEAN DEFAULT FALSE,

    -- Field mapping
    field_mapping JSONB,
    excluded_fields TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Trigger Function

```sql
CREATE OR REPLACE FUNCTION trigger_sync_queue()
RETURNS TRIGGER AS $$
-- Automatically adds INSERT/UPDATE/DELETE operations to sync_queue
-- Checks sync_config for enabled tables and operation flags
-- Removes excluded fields from payload
$$
```

---

## Part 3: Bubble API Integration

### Two API Modes

| Mode | Endpoint Pattern | Use Case |
|------|------------------|----------|
| **Data API** | `/obj/{table}` | Direct CRUD (recommended) |
| **Workflow API** | `/wf/{workflow}` | Complex Bubble-side logic |

### Data API Endpoints

| Operation | Method | Endpoint | Request Body | Response |
|-----------|--------|----------|--------------|----------|
| CREATE | POST | `/obj/{table}` | `{ field: value, ... }` | `{ status: "success", id: "bubble_id" }` |
| UPDATE | PATCH | `/obj/{table}/{bubble_id}` | `{ field: value, ... }` | `{ status: "success" }` |
| DELETE | DELETE | `/obj/{table}/{bubble_id}` | None | `{ status: "success" }` |
| GET | GET | `/obj/{table}/{bubble_id}` | None | `{ response: { ...fields } }` |

### Base URL

```
https://upgradefromstr.bubbleapps.io/api/1.1
```

### Authentication

```http
Authorization: Bearer <BUBBLE_API_KEY>
Content-Type: application/json
```

---

## Part 4: Edge Function Actions

### Available Actions

| Action | Description | Mode |
|--------|-------------|------|
| `process_queue_data_api` | Process queue using Data API | **Recommended** |
| `process_queue` | Process queue using Workflow API | Original |
| `sync_single` | Manually sync one record | Either |
| `retry_failed` | Retry failed items | Either |
| `get_status` | Get queue statistics | N/A |
| `cleanup` | Remove old completed items | N/A |
| `build_request` | Preview request without executing | Data API |

### Example Requests

#### Process Queue (Data API)
```json
{
    "action": "process_queue_data_api",
    "payload": {
        "batch_size": 20,
        "table_filter": "listing"
    }
}
```

#### Build Request (Preview)
```json
{
    "action": "build_request",
    "payload": {
        "operation": "CREATE",
        "table_name": "user",
        "data": {
            "Name": "John Doe",
            "Email": "john@example.com"
        },
        "include_curl": true
    }
}
```

#### Get Status
```json
{
    "action": "get_status",
    "payload": {
        "include_by_table": true,
        "include_recent_errors": true
    }
}
```

---

## Part 5: Field Transformation

### Day Index Conversion (CRITICAL)

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (Supabase) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

```typescript
// Supabase → Bubble (add 1)
function adaptDaysToBubble(days: number[]): number[] {
    return days.map(day => day + 1);
}

// Bubble → Supabase (subtract 1)
function adaptDaysFromBubble(days: number[]): number[] {
    return days.map(day => day - 1);
}
```

### Fields Requiring Day Conversion

- `Days Available (List of Days)`
- `Days Not Available`
- `Nights Available (List of Nights)`
- `Nights Not Available`
- `Nights Available (numbers)`

### Read-Only Fields (Never Send to Bubble)

- `_id`
- `Created Date`
- `Modified Date`
- `Created By`
- `Modified By`

### Excluded Fields (Security)

- `password_hash`
- `refresh_token`
- `access_token`
- `api_key`

---

## Part 6: Table Name Mapping

| Supabase | Bubble |
|----------|--------|
| `user` | `user` |
| `listing` | `listing` |
| `proposal` | `proposal` |
| `bookings_stays` | `bookings-stays` |
| `bookings_leases` | `bookings-leases` |
| `listing_photo` | `listing-photo` |
| `paymentrecords` | `paymentrecords` |
| `_message` | `_message` |

---

## Part 7: ID Tracking Strategy

### The `_id` Field

- **Source**: Bubble assigns this when a record is created
- **Format**: `"1734012345678x123456789"` (timestamp + random)
- **Usage**: Primary key in Supabase, conflict resolution key

### Sync Flow for New Records

```
1. Supabase creates record (no _id)
        ↓
2. sync_queue picks it up (operation: INSERT)
        ↓
3. POST /obj/{table} → Bubble creates record
        ↓
4. Response: { id: "1734..." }
        ↓
5. UPDATE Supabase SET _id = "1734..."
        ↓
6. Records now linked by _id
```

---

## Part 8: Retry Strategy

### Exponential Backoff

| Attempt | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 15 minutes |
| 4 | 30 minutes |
| 5+ | 1 hour |

### Status Flow

```
pending → processing → completed
              ↓
           failed → (retry) → processing → completed
              ↓                    ↓
         (max retries)         failed (permanent)
```

---

## Part 9: Configuration

### Required Secrets (Supabase Dashboard)

| Secret | Value |
|--------|-------|
| `BUBBLE_API_BASE_URL` | `https://upgradefromstr.bubbleapps.io/api/1.1` |
| `BUBBLE_API_KEY` | Your Bubble API key |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard |

### Initial sync_config Entries

```sql
INSERT INTO sync_config (supabase_table, bubble_workflow, enabled) VALUES
    ('user', 'sync_user_from_supabase', FALSE),
    ('listing', 'sync_listing_from_supabase', FALSE),
    ('proposal', 'sync_proposal_from_supabase', FALSE);
```

---

## Part 10: Deployment Steps

### Step 1: Apply Migration

```sql
-- Run the migration to create sync_queue and sync_config tables
-- File: supabase/migrations/20251205_create_sync_queue_tables.sql
```

### Step 2: Deploy Edge Function

The `bubble_sync` placeholder was already deployed. Update with full implementation:

```bash
supabase functions deploy bubble_sync
```

### Step 3: Enable Tables in sync_config

```sql
UPDATE sync_config SET enabled = TRUE WHERE supabase_table = 'listing';
```

### Step 4: Install Triggers

```sql
CREATE TRIGGER listing_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON listing
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_queue();
```

### Step 5: Set Up Cron (Optional)

```sql
SELECT cron.schedule(
    'process-sync-queue',
    '* * * * *',  -- Every minute
    $$
    SELECT net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/bubble_sync',
        body := '{"action": "process_queue_data_api", "payload": {"batch_size": 20}}'::jsonb,
        headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
    );
    $$
);
```

---

## Part 11: Documentation Files

| File | Description |
|------|-------------|
| `docs/SUPABASE_TO_BUBBLE_SYNC_DESIGN.md` | Original queue-based design |
| `docs/BUBBLE_DATA_API_SYNC_DESIGN.md` | Data API integration design |
| `docs/BUBBLE_SYNC_IMPLEMENTATION_SUMMARY.md` | This summary |

---

## Part 12: Open Questions

1. **Primary Key**: Continue using `_id` as sole identifier, or add separate `bubble_id` column?

2. **Preferred Mode**: Data API (simpler) or Workflow API (more flexible)?

3. **Priority Tables**: Which tables to enable first?

4. **Conflict Resolution**: If Supabase and Bubble diverge, which is authoritative?

5. **Rate Limiting**: Implement throttling for Bubble API limits?

6. **DELETE Handling**: Sync deletes or use soft-delete pattern?

---

## Git Commits

```
9065269 feat(sync): add Supabase → Bubble push sync system
88da374 feat(sync): add Bubble Data API integration for direct CRUD operations
```

---

## Quick Reference: API Call Examples

### CREATE (POST)

```bash
curl -X POST \
  "https://upgradefromstr.bubbleapps.io/api/1.1/obj/listing" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Cozy Brooklyn Apartment",
    "Features - Qty Bedrooms": 2,
    "Active": true
  }'
```

**Response:**
```json
{
    "status": "success",
    "id": "1734123456789x987654321"
}
```

### UPDATE (PATCH)

```bash
curl -X PATCH \
  "https://upgradefromstr.bubbleapps.io/api/1.1/obj/listing/1734123456789x987654321" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Active": false,
    "💰Monthly Host Rate": 3000
  }'
```

**Response:**
```json
{
    "status": "success"
}
```

### DELETE

```bash
curl -X DELETE \
  "https://upgradefromstr.bubbleapps.io/api/1.1/obj/listing/1734123456789x987654321" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
    "status": "success"
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-05
**Status**: Ready for Review
