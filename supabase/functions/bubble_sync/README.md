# bubble_sync Edge Function

Pushes data FROM Supabase TO Bubble via queue processing and API integration.

## Quick Start

### Deploy
```bash
supabase functions deploy bubble_sync
```

### Test
```bash
curl -X POST "https://your-supabase-url/functions/v1/bubble_sync" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_status","payload":{}}'
```

## Overview

This Edge Function processes items from the `sync_queue` table and pushes them to Bubble using either:

1. **Data API mode** (Recommended) - Direct CRUD via `/obj/{table}` endpoints
2. **Workflow API mode** - Complex logic via `/wf/{workflow}` endpoints

## Supported Actions

| Action | Purpose | Mode |
|--------|---------|------|
| `process_queue` | Batch process pending items | Workflow API |
| `process_queue_data_api` | Batch process pending items | Data API |
| `sync_single` | Manually sync one record | Either |
| `retry_failed` | Retry items with exponential backoff | Either |
| `get_status` | Get queue statistics | Read-only |
| `cleanup` | Remove old completed items | Maintenance |
| `build_request` | Preview API request | Debug |

## Architecture

### Components

**Handlers** - Action handlers for each operation
- `processQueue.ts` - Workflow API batch processing
- `processQueueDataApi.ts` - Data API batch processing
- `syncSingle.ts` - Manual record sync
- `retryFailed.ts` - Retry failed queue items
- `getStatus.ts` - Status/diagnostics
- `cleanup.ts` - Queue maintenance
- `buildRequest.ts` - Request preview

**Libraries** - Core functionality
- `bubblePush.ts` - Workflow API client
- `bubbleDataApi.ts` - Data API client
- `transformer.ts` - Field type conversion
- `queueManager.ts` - Queue operations
- `tableMapping.ts` - Table name translation
- `fieldMapping.ts` - Field transformations

### Data Flow

```
Supabase Table (Data Change)
         |
    Trigger Event
         |
Add to sync_queue
         |
    Call bubble_sync
         |
   Transform Data
   - Day conversion (0-6 to 1-7)
   - Field mapping
   - Read-only filtering
         |
   Push to Bubble
   - Via Data API or Workflow API
         |
  Mark Completed/Failed
   - Store response
   - Track errors
   - Exponential backoff retry
         |
 Update Supabase _id
   - Link Supabase to Bubble records
```

## Configuration

### Required Secrets (Supabase Dashboard)

```bash
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=your-secret-key-here
```

### Required Database Tables

**sync_queue** - Queue items to process
- id: uuid
- table_name: string
- record_id: string
- operation: INSERT | UPDATE | DELETE
- payload: jsonb
- status: pending | processing | completed | failed | skipped
- error_message: string
- retry_count: integer
- max_retries: integer
- created_at: timestamp
- processed_at: timestamp
- next_retry_at: timestamp
- bubble_response: jsonb

**sync_config** - Configuration for each table
- id: uuid
- supabase_table: string
- bubble_workflow: string
- enabled: boolean
- sync_on_insert: boolean
- sync_on_update: boolean
- sync_on_delete: boolean
- field_mapping: jsonb
- excluded_fields: array

## Features

### Smart Retry Logic
- Exponential backoff: 1m, 5m, 15m, 30m, 1hr
- Max 3 retries before permanent failure
- Respects retry_count and next_retry_at

### Field Transformations
- Day index: JavaScript 0-6 to Bubble 1-7
- Boolean conversion
- Integer rounding
- Decimal number handling
- JSONB parsing
- Timestamp ISO 8601 strings
- Read-only field exclusion

### Table Name Mapping
- `bookings_stays` to `bookings-stays`
- `listing_photo` to `listing-photo`
- Custom mappings supported

### Security
- NO fallback mechanisms - errors propagate
- Excludes: passwords, tokens, API keys
- Respects sync_on_* flags
- Validates configurations

## Monitoring

### View Logs
```bash
supabase functions logs bubble_sync --tail
```

### Query Queue Status
```sql
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest
FROM sync_queue
GROUP BY status;
```

## File Structure
```
bubble_sync/
├── index.ts                 # Main entry and routing
├── deno.json               # Config
├── DEPLOYMENT.md           # Detailed guide
├── README.md               # This file
├── handlers/               # Action handlers
│   ├── processQueue.ts
│   ├── processQueueDataApi.ts
│   ├── syncSingle.ts
│   ├── retryFailed.ts
│   ├── getStatus.ts
│   ├── cleanup.ts
│   └── buildRequest.ts
└── lib/                    # Core libraries
    ├── bubblePush.ts
    ├── bubbleDataApi.ts
    ├── transformer.ts
    ├── queueManager.ts
    ├── tableMapping.ts
    └── fieldMapping.ts
```

## Dependencies

### Internal
- `_shared/cors.ts` - CORS configuration
- `_shared/errors.ts` - Error classes

### External
- `@supabase/supabase-js@2` - Supabase client

## Deployment

See DEPLOYMENT.md for detailed deployment guide.

Quick deploy:
```bash
supabase functions deploy bubble_sync
```

## Support

For issues:
1. Check logs: `supabase functions logs bubble_sync`
2. Review DEPLOYMENT.md for detailed documentation
3. Test with `action: "build_request"` to preview
4. Check sync_config and sync_queue tables
