# bubble_sync Edge Function - Deployment Guide

## Overview
The `bubble_sync` Edge Function processes Supabase queue items and pushes data TO Bubble (reverse direction from pull sync).

## Quick Deploy
```bash
supabase functions deploy bubble_sync
```

## Function Details

### Endpoint
```
POST https://your-supabase-url/functions/v1/bubble_sync
```

### Request Format
```json
{
  "action": "process_queue",
  "payload": {
    "batch_size": 10,
    "table_filter": "listing"
  }
}
```

### Supported Actions

#### 1. process_queue
Process pending queue items using Bubble Workflow API (/wf/)
```json
{
  "action": "process_queue",
  "payload": {
    "batch_size": 10,
    "table_filter": "listing"
  }
}
```
Response: `{ processed, success, failed, skipped }`

#### 2. process_queue_data_api (RECOMMENDED)
Process pending queue items using Bubble Data API (/obj/)
```json
{
  "action": "process_queue_data_api",
  "payload": {
    "batch_size": 10
  }
}
```
Response: `{ processed, success, failed, skipped }`

#### 3. sync_single
Manually sync a single record
```json
{
  "action": "sync_single",
  "payload": {
    "table_name": "listing",
    "record_id": "123",
    "operation": "UPDATE",
    "use_queue": false
  }
}
```
Response: `{ synced, record_id, table_name, operation, bubble_response }`

#### 4. retry_failed
Retry failed items that are ready
```json
{
  "action": "retry_failed",
  "payload": {
    "batch_size": 10,
    "force": false
  }
}
```
Response: `{ processed, success, failed, skipped }`

#### 5. get_status
Get queue statistics
```json
{
  "action": "get_status",
  "payload": {
    "include_by_table": true,
    "include_recent_errors": true
  }
}
```
Response: Queue stats, errors, configurations

#### 6. cleanup
Clean up old items from queue
```json
{
  "action": "cleanup",
  "payload": {
    "completed_older_than_days": 7,
    "failed_older_than_days": 30
  }
}
```
Response: `{ completed_deleted, failed_deleted, skipped_deleted, total_deleted }`

#### 7. build_request
Preview API request without executing
```json
{
  "action": "build_request",
  "payload": {
    "operation": "UPDATE",
    "table_name": "listing",
    "bubble_id": "1234567890",
    "data": { "Active": true }
  }
}
```
Response: Request details, cURL command, preview

## Required Configuration

### Supabase Secrets
Set these in Supabase Dashboard > Settings > Secrets:

```bash
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=<your-bubble-api-key>
```

### Database Tables Required
- `sync_queue` - Queue items to process
- `sync_config` - Configuration for each table
- Source data tables (user, listing, proposal, etc.)

## Architecture

### Two Modes

#### Mode 1: Workflow API (process_queue)
Uses Bubble's /wf/ endpoint for complex operations
- Calls custom workflow: `POST /wf/sync_update`
- Good for: Complex business logic in Bubble
- Requires: Bubble workflow configured

#### Mode 2: Data API (process_queue_data_api) - RECOMMENDED
Uses Bubble's /obj/ endpoint for direct CRUD
- POST /obj/{table} - Create
- PATCH /obj/{table}/{id} - Update
- DELETE /obj/{table}/{id} - Delete
- GET /obj/{table}/{id} - Retrieve
- Good for: Direct data synchronization
- Simpler, more efficient

### Data Flow
```
Supabase sync_queue
    ↓
fetch_pending_items
    ↓
transform_record (day conversion, field mapping)
    ↓
push_to_bubble (via Data API or Workflow API)
    ↓
mark_as_completed (or mark_as_failed)
    ↓
update_bubble_id (after CREATE, link records)
```

## Key Features

### Exponential Backoff Retries
- Attempt 1: 1 minute delay
- Attempt 2: 5 minutes delay
- Attempt 3: 15 minutes delay
- Attempt 4: 30 minutes delay
- Attempt 5: 1 hour delay

### Field Type Handling
- **Day Conversion**: JavaScript 0-6 ↔ Bubble 1-7
- **Boolean**: true/false
- **Integer**: Rounded whole numbers
- **Numeric**: Decimal numbers
- **JSONB**: Parsed JSON objects/arrays
- **Timestamps**: ISO 8601 strings
- **Read-only**: _id, Created Date, Modified Date (excluded)

### Security
- No fallback mechanisms (real data or error)
- Excludes sensitive fields (passwords, tokens, keys)
- Respects field exclusion lists
- Respects operation flags (sync_on_insert/update/delete)

## Monitoring

### Status Endpoint
```json
{
  "action": "get_status",
  "payload": {}
}
```

Returns:
- Queue statistics (pending, processing, completed, failed)
- Items by table
- Recent errors with details
- Sync configurations
- Oldest pending item timestamp
- Last processed timestamp

## Common Use Cases

### Daily Queue Processing
Schedule daily at 2 AM:
```bash
curl -X POST "https://your-supabase-url/functions/v1/bubble_sync" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"process_queue","payload":{"batch_size":50}}'
```

### Monitor Queue Health
Check every 5 minutes:
```bash
curl -X POST "https://your-supabase-url/functions/v1/bubble_sync" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_status","payload":{}}'
```

### Manual Sync
Sync specific record immediately:
```bash
curl -X POST "https://your-supabase-url/functions/v1/bubble_sync" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"sync_single","payload":{"table_name":"listing","record_id":"abc123"}}'
```

### Retry Failures
Retry failed items:
```bash
curl -X POST "https://your-supabase-url/functions/v1/bubble_sync" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"retry_failed","payload":{"batch_size":10}}'
```

## Troubleshooting

### Module Not Found: _shared/errors.ts
Ensure `supabase/functions/_shared/` exists with:
- cors.ts
- errors.ts
- validation.ts (optional)

### Bubble API Errors
Check logs:
```bash
supabase functions logs bubble_sync
```

Look for:
- API key validity
- URL correctness
- Table name mapping (snake_case vs hyphenated)
- Field permissions in Bubble

### Queue Not Processing
1. Check sync_config table - ensure workflow is set
2. Check sync_queue table - ensure status is 'pending'
3. Check error_message column for details
4. Verify BUBBLE_API_KEY secret is set

## File Structure
```
supabase/functions/bubble_sync/
├── index.ts                              # Main entry point
├── deno.json                             # Config
├── handlers/
│   ├── processQueue.ts
│   ├── processQueueDataApi.ts
│   ├── syncSingle.ts
│   ├── retryFailed.ts
│   ├── getStatus.ts
│   ├── cleanup.ts
│   └── buildRequest.ts
└── lib/
    ├── bubblePush.ts
    ├── bubbleDataApi.ts
    ├── transformer.ts
    ├── queueManager.ts
    ├── tableMapping.ts
    └── fieldMapping.ts
```

## Logs
View deployment logs:
```bash
supabase functions logs bubble_sync --tail
```

Each action logs:
- Request received
- Action type
- Queue items fetched
- Item processing (per item)
- Success/failure details
- Final results

## Next Steps
1. Deploy: `supabase functions deploy bubble_sync`
2. Test: Call with `action: "get_status"` to verify
3. Configure: Set up sync_config for each table
4. Schedule: Add cron job for periodic processing
5. Monitor: Set up alerts on error count
