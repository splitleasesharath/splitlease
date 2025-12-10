# Implementation Guide: Bubble Sync Field Filtering Fix

**Date**: 2025-12-09
**Status**: READY TO DEPLOY
**Commit**: `16e541b` (fix: filter out Bubble-incompatible fields from sync queue payloads)

---

## Quick Summary

Fixed "400 Bad Request: Unrecognized field: pending" error when syncing proposals/listings from Supabase to Bubble API.

**Root Cause**: Database triggers were including ALL columns when converting rows to JSON, including internal Supabase fields that Bubble doesn't recognize.

**Solution**: Two-layer filtering approach:
1. Database triggers filter out incompatible fields when queuing
2. Edge Function adds defensive filtering before queueing

---

## What Changed

### 1. New Migration
**File**: `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql`

- Updated `trigger_listing_sync_queue()` to exclude internal fields
- Updated `trigger_sync_queue()` to exclude internal fields
- Added detailed comments explaining why fields are filtered

**Fields Being Filtered**:
```
- bubble_id          (Supabase tracking)
- created_at         (Supabase timestamp)
- updated_at         (Supabase timestamp)
- sync_status        (Internal flag)
- bubble_sync_error  (Internal error tracking)
- pending            (CRITICAL - was causing 400 errors)
- _internal          (Internal markers)
- sync_at            (Internal sync timestamp)
- last_synced        (Internal sync tracking)
```

### 2. Updated Edge Function
**File**: `supabase/functions/proposal/lib/bubbleSyncQueue.ts`

- Added `filterBubbleIncompatibleFields()` helper function
- Updated `enqueueBubbleSync()` to use defensive filtering
- Prevents sending incompatible fields to Bubble API

---

## Deployment Steps

### Step 1: Apply Database Migration

```bash
# From project root
supabase db push

# Or manually:
supabase db execute -f supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql
```

This will:
- Update the `trigger_listing_sync_queue()` function
- Update the `trigger_sync_queue()` function
- Both changes are idempotent (safe to run multiple times)

### Step 2: Verify Edge Function Changes

The Edge Function changes are already committed:
```bash
git show 16e541b supabase/functions/proposal/lib/bubbleSyncQueue.ts
```

No additional deployment needed - changes are in TypeScript and will be included in next deployment.

### Step 3: Clear Stuck Queue Items (Optional)

If there are failed items in the sync_queue from before the fix:

```sql
-- Check for failed items
SELECT id, table_name, record_id, error_message, created_at
FROM sync_queue
WHERE status = 'failed'
  AND error_message ILIKE '%pending%'
  AND created_at > now() - interval '1 day'
ORDER BY created_at DESC;

-- Delete old failed items (after verifying)
DELETE FROM sync_queue
WHERE status = 'failed'
  AND error_message ILIKE '%pending%'
  AND created_at < now() - interval '1 hour';

-- Or reset specific items to retry
UPDATE sync_queue
SET status = 'pending', retry_count = 0, error_message = NULL
WHERE status = 'failed'
  AND error_message ILIKE '%pending%'
  AND created_at > now() - interval '1 day';
```

### Step 4: Test the Fix

#### Test 1: Create New Proposal
```bash
curl -X POST $SUPABASE_URL/functions/v1/proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "action": "create",
    "payload": {
      "listingId": "...",
      "guestId": "...",
      "nightsSelected": [1,2,3,4,5],
      "proposalPrice": 150,
      ...
    }
  }'
```

Expected: 200 OK response with proposal created in both Supabase and queued for Bubble

#### Test 2: Check Sync Queue
```sql
-- View recent queue items
SELECT
  id,
  table_name,
  record_id,
  operation,
  status,
  created_at,
  processed_at
FROM sync_queue
ORDER BY created_at DESC
LIMIT 10;

-- All should have status = 'completed' with no errors
-- Check payload to confirm no incompatible fields
SELECT id, payload
FROM sync_queue
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;
```

#### Test 3: Verify in Bubble
```bash
# Check if proposal/listing was created in Bubble
# Navigate to Bubble app and verify data appears
```

---

## Verification Checklist

- [ ] Migration applied successfully (`supabase db push`)
- [ ] New proposal can be created
- [ ] No "Unrecognized field: pending" errors
- [ ] sync_queue items have status = 'completed'
- [ ] Data appears in Bubble
- [ ] Payload doesn't contain filtered fields

---

## Rollback Plan

If issues occur:

### Option 1: Disable Auto-Sync (Quick Rollback)
```sql
-- Disable listing sync trigger
DROP TRIGGER IF EXISTS listing_bubble_sync_trigger ON listing;

-- Or disable via sync_config
UPDATE sync_config
SET enabled = FALSE
WHERE supabase_table = 'listing';
```

### Option 2: Revert Code
```bash
# Revert specific files
git revert 16e541b

# Or cherry-pick the revert
git revert -n 16e541b
git commit -m "revert: bubble sync field filtering (if needed)"
```

---

## Post-Deployment

### Monitor Logs
```bash
# Check Edge Function logs for proposal creation
supabase functions logs proposal

# Check bubble_sync logs for queue processing
supabase functions logs bubble_sync
```

### Update Documentation
The analysis is documented in:
- `.claude/plans/New/20251209120000_ANALYSIS_BUBBLE_PENDING_FIELD_ERROR.md`

After confirming the fix works, move this to:
- `.claude/plans/Done/20251209120000_ANALYSIS_BUBBLE_PENDING_FIELD_ERROR.md`

---

## Key Files

### Source Code
- `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql` - Database trigger fixes
- `supabase/functions/proposal/lib/bubbleSyncQueue.ts` - Edge Function filtering

### Documentation
- `.claude/plans/New/20251209120000_ANALYSIS_BUBBLE_PENDING_FIELD_ERROR.md` - Root cause analysis
- This file (implementation guide)

### Related Files
- `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` - Queue processor
- `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` - Bubble API client
- `supabase/functions/bubble_sync/lib/fieldMapping.ts` - Field mapping registry

---

## Prevention for Future

### Architecture Decision
**All sync payloads sent to external systems must be filtered** to exclude:
- Internal tracking fields (`bubble_id`, `sync_status`)
- System timestamps (`created_at`, `updated_at`)
- Internal flags (`pending`, `_internal`)

### Implementation Pattern
```typescript
// ALWAYS filter before sending to external APIs
const cleanData = filterInternalFields(data, [
  'bubble_id',
  'created_at',
  'updated_at',
  ...
]);

// Send to external system
await externalApi.post(cleanData);
```

### Testing
- Unit test field filtering functions
- Integration test verifies payloads don't contain filtered fields
- Contract test verifies Bubble API accepts filtered payload

---

## Questions & Support

If you encounter issues:

1. Check `.claude/plans/New/20251209120000_ANALYSIS_BUBBLE_PENDING_FIELD_ERROR.md` for detailed analysis
2. Review `supabase/functions/proposal/lib/bubbleSyncQueue.ts` for filtering logic
3. Check `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql` for database changes
4. Run manual tests from Step 4 above

---

**Status**: Ready for production deployment
**Risk Level**: LOW (filtering only removes incompatible fields, doesn't affect valid data)
**Rollback Path**: Clear and documented above
