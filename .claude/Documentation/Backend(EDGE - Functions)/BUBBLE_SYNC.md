# bubble_sync Edge Function

**ENDPOINT**: `POST /functions/v1/bubble_sync`
**AUTH_REQUIRED**: No (internal service)
**SOURCE**: `supabase/functions/bubble_sync/`

---

## Purpose

Processes the `sync_queue` table and pushes data FROM Supabase TO Bubble. This is the reverse direction sync (Supabase → Bubble), complementing the Bubble → Supabase sync.

Supports two modes:
1. **Workflow API** (`/wf/`) - For complex operations requiring Bubble-side logic
2. **Data API** (`/obj/`) - For direct CRUD operations (recommended)

---

## Actions

| Action | Handler | Description |
|--------|---------|-------------|
| `process_queue` | `handlers/processQueue.ts` | Process pending items (Workflow API) |
| `process_queue_data_api` | `handlers/processQueueDataApi.ts` | Process pending items (Data API) |
| `sync_single` | `handlers/syncSingle.ts` | Manually sync single record |
| `retry_failed` | `handlers/retryFailed.ts` | Retry failed items |
| `get_status` | `handlers/getStatus.ts` | Get queue statistics |
| `cleanup` | `handlers/cleanup.ts` | Clean up old completed items |
| `build_request` | `handlers/buildRequest.ts` | Preview API request (debugging) |
| `sync_signup_atomic` | `handlers/syncSignupAtomic.ts` | Atomic signup sync |

---

## Action Details

### process_queue_data_api (Recommended)

Process pending sync queue items using Bubble Data API.

**Request:**
```json
{
  "action": "process_queue_data_api",
  "payload": {
    "batch_size": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 8,
    "succeeded": 7,
    "failed": 1,
    "remaining": 42
  }
}
```

---

### process_queue

Process pending sync queue items using Bubble Workflow API.

**Request:**
```json
{
  "action": "process_queue",
  "payload": {
    "batch_size": 10
  }
}
```

---

### sync_single

Manually sync a single record for testing/debugging.

**Request:**
```json
{
  "action": "sync_single",
  "payload": {
    "table": "proposal",
    "record_id": "proposal-uuid"
  }
}
```

---

### retry_failed

Retry all failed sync items by resetting status to pending.

**Request:**
```json
{
  "action": "retry_failed",
  "payload": {}
}
```

---

### get_status

Get sync queue statistics.

**Request:**
```json
{
  "action": "get_status",
  "payload": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 15,
    "processing": 2,
    "completed": 1250,
    "failed": 5
  }
}
```

---

### cleanup

Clean up old completed sync items.

**Request:**
```json
{
  "action": "cleanup",
  "payload": {
    "retention_days": 7
  }
}
```

---

### build_request

Preview Bubble API request without executing (debugging).

**Request:**
```json
{
  "action": "build_request",
  "payload": {
    "table": "proposal",
    "record_id": "proposal-uuid",
    "operation": "INSERT"
  }
}
```

---

### sync_signup_atomic

Handle atomic signup sync (user + host_account + guest_account).

**Request:**
```json
{
  "action": "sync_signup_atomic",
  "payload": {
    "user_id": "user-uuid",
    "correlation_id": "signup:user-uuid"
  }
}
```

Creates 3 Bubble objects in sequence with correlation.

---

## File Structure

```
bubble_sync/
├── index.ts                    # Main router
├── handlers/
│   ├── processQueue.ts        # Workflow API processing
│   ├── processQueueDataApi.ts # Data API processing (recommended)
│   ├── syncSingle.ts          # Single record sync
│   ├── retryFailed.ts         # Retry failed items
│   ├── getStatus.ts           # Queue statistics
│   ├── cleanup.ts             # Cleanup old items
│   ├── buildRequest.ts        # Debug request preview
│   ├── syncSignupAtomic.ts    # Atomic signup sync
│   └── propagateListingFK.ts  # Propagate listing FKs
├── lib/
│   ├── bubblePush.ts          # Workflow API client
│   ├── bubbleDataApi.ts       # Data API client
│   ├── queueManager.ts        # Queue operations
│   ├── tableMapping.ts        # Table name mapping
│   ├── fieldMapping.ts        # Field name mapping
│   └── transformer.ts         # Data transformation
└── deno.json                  # Import map
```

---

## sync_queue Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `table` | TEXT | Supabase table name |
| `record_id` | TEXT | Record ID to sync |
| `operation` | ENUM | INSERT, UPDATE, DELETE, SIGNUP_ATOMIC |
| `payload` | JSONB | Data to sync |
| `status` | ENUM | pending, processing, completed, failed |
| `error` | TEXT | Error message if failed |
| `correlation_id` | TEXT | Idempotency key |
| `sequence` | INT | Order within correlation |
| `created_at` | TIMESTAMP | Queue time |
| `processed_at` | TIMESTAMP | Processing time |

---

## Queue Processing Flow

```
1. Fetch pending items (batch_size)
2. Update status: pending → processing
3. For each item:
   a. Transform data (Supabase → Bubble format)
   b. Call Bubble API (Data API or Workflow)
   c. Update status: processing → completed/failed
4. Return processing results
```

---

## Cron Job

Runs every 5 minutes via `pg_cron`:

```sql
SELECT cron.schedule(
  'process-bubble-sync-queue',
  '*/5 * * * *',
  $$SELECT net.http_post(
    'https://[project].supabase.co/functions/v1/bubble_sync',
    '{"action": "process_queue_data_api", "payload": {"batch_size": 50}}'
  )$$
);
```

---

## Table Mapping

`lib/tableMapping.ts` maps Supabase tables to Bubble object types:

| Supabase Table | Bubble Object Type |
|----------------|-------------------|
| `listing` | `zat_listings` |
| `user` | `user` |
| `proposal` | `proposal` |
| `host_account` | `account_host` |
| `guest_account` | `account_guest` |

---

## Field Mapping

`lib/fieldMapping.ts` handles field name transformations:

| Supabase Field | Bubble Field |
|----------------|--------------|
| `_id` | `_id` |
| `created_at` | `Created Date` |
| `updated_at` | `Modified Date` |
| Custom fields | Mapped per table |

---

## Data Transformation

`lib/transformer.ts` handles:
- Date format conversion
- Boolean conversions
- Null handling
- JSONB array handling

---

## Dependencies

- Supabase client (service role)
- Bubble API (Data API + Workflow API)
- `_shared/cors.ts`
- `_shared/slack.ts`

---

## Error Handling

- Failed items: Status set to `failed` with error message
- Retryable: Use `retry_failed` action
- Reporting: Errors logged to Slack

---

**LAST_UPDATED**: 2025-12-11
