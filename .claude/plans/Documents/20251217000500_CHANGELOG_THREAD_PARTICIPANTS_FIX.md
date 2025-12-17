# Implementation Changelog

**Plan Executed**: 20251216235500-debug-thread-participants-double-encoding.md
**Execution Date**: 2025-12-17
**Status**: Complete

## Summary

Fixed double-encoded JSON strings in the `public.thread.Participants` column by applying a data migration to convert existing 795 records from strings to native JSONB arrays, and updating the source code in `messagingHelpers.ts` to prevent future double-encoding.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/functions/_shared/messagingHelpers.ts` | Modified | Removed `JSON.stringify()` from Participants field insertion |

## Detailed Changes

### Code Fix - messagingHelpers.ts

- **File**: `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\messagingHelpers.ts`
  - **Line**: 125
  - **Change**: Removed `JSON.stringify()` wrapper from Participants array
  - **Before**: `"Participants": JSON.stringify([params.hostUserId, params.guestUserId]),`
  - **After**: `"Participants": [params.hostUserId, params.guestUserId],`
  - **Reason**: Supabase JSONB columns accept native JavaScript arrays directly; `JSON.stringify()` causes double-encoding
  - **Impact**: New threads will now have correctly formatted JSONB arrays in the Participants column

## Database Changes

### Migration: fix_thread_participants_double_encoding

**Applied via Supabase MCP `apply_migration`**

```sql
UPDATE public.thread
SET "Participants" = ("Participants" #>> '{}')::jsonb
WHERE "Participants" IS NOT NULL
  AND jsonb_typeof("Participants") = 'string'
  AND ("Participants" #>> '{}') IS NOT NULL;
```

**Purpose**: Convert double-encoded JSON strings to native JSONB arrays

**Records Affected**: 795 threads (out of 803 total)

**How it works**:
- `"Participants" #>> '{}'` extracts the string content from the JSONB (unwraps the outer quotes)
- `::jsonb` casts the unwrapped JSON string back to native JSONB
- The WHERE clause ensures only double-encoded records are updated

## Edge Function Changes

- **messages** Edge Function: Uses `messagingHelpers.ts` for thread creation
  - **Reminder**: Manual deployment required after code changes
  - **Command**: `supabase functions deploy messages`

## Git Commits

1. `560bb10` - fix(messagingHelpers): Remove JSON.stringify for Participants JSONB column

## Verification Steps Completed

- [x] Data migration applied successfully
- [x] Code fix applied to messagingHelpers.ts line 125
- [x] Verification query confirmed:
  - `still_double_encoded: 0` (was 795)
  - `correctly_formatted: 795` (was 0)
  - `null_values: 8` (unchanged)
  - `total_threads: 803` (unchanged)
- [x] Changes committed to git
- [x] Plan file moved to Done directory

## Notes & Observations

### Root Cause Confirmed
The double-encoding was caused by two factors:
1. **Historical data import**: Data migrated from Bubble.io where arrays were stored as JSON strings
2. **Code bug**: `messagingHelpers.ts` line 125 used `JSON.stringify()` when inserting into JSONB column

### Prevention
The code fix ensures new threads will have properly formatted Participants arrays. For reference, the correct pattern for JSONB insertion in Supabase is:
```typescript
// CORRECT - Supabase handles JavaScript arrays natively
"Participants": [params.hostUserId, params.guestUserId],

// WRONG - causes double-encoding
"Participants": JSON.stringify([params.hostUserId, params.guestUserId]),
```

### Junction Table Note
The `junctions.thread_participant` table already exists with correctly normalized data (1566 rows). Consider deprecating the JSONB `Participants` column in favor of the junction table for better query performance and referential integrity.

### Deployment Reminder
**IMPORTANT**: The Edge Function `messages` requires manual deployment to apply the code fix:
```bash
supabase functions deploy messages
```

---

**Changelog Version**: 1.0
**Created**: 2025-12-17
