# Debug Analysis: Delete Listing Handler Invokes Non-Existent bubble-proxy Function

**Created**: 2025-12-17T14:35:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: HostOverviewPage - Delete Listing Handler

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions (Deno), Cloudflare Pages
- **Data Flow**: Frontend -> Supabase Edge Functions -> Supabase DB (+ Bubble sync queue)

### 1.2 Domain Context
- **Feature Purpose**: Allow hosts to delete their listings from the Host Overview page
- **Related Documentation**:
  - `.claude/Documentation/Pages/HOST_OVERVIEW_QUICK_REFERENCE.md`
  - `.claude/plans/New/listing-migration-to-native-supabase.md`
- **Data Model**:
  - `listing` table contains all listing data
  - Deletion should be soft-delete (set `Active=false`) or hard delete depending on business rules
  - Queue-based sync to Bubble via `sync_queue` table

### 1.3 Relevant Conventions
- **Action-Based Edge Functions**: All Edge Functions use `{ action, payload }` request pattern
- **Queue-Based Sync**: Supabase -> Bubble sync via `sync_queue` table
- **ID Patterns**: Listings use `_id` (Bubble-compatible 17-char alphanumeric)
- **Layer Boundaries**: Frontend calls Edge Functions only, never external APIs directly

### 1.4 Entry Points & Dependencies
- **User Entry Point**: Host Overview Page -> Delete button on listing card -> Confirmation modal -> `handleConfirmDelete`
- **Critical Path**:
  1. User clicks delete
  2. `handleDeleteClick()` opens confirmation modal
  3. User confirms
  4. `handleConfirmDelete()` executes deletion
  5. UI updates to remove listing from list
- **Dependencies**: Supabase client (`lib/supabase.js`), `listing` edge function

## 2. Problem Statement

The delete listing handler in `useHostOverviewPageLogic.js` invokes a non-existent `bubble-proxy` edge function instead of using the existing `listing` edge function. This causes the delete operation to fail silently or with an error when a host attempts to delete a listing.

**Symptoms**:
- Delete confirmation modal works correctly (UI functional)
- After confirming deletion, the operation fails
- Listing remains in the UI (may be removed optimistically but not persisted)
- Console likely shows error about function not found or 404

**Impact**:
- Hosts cannot delete their listings
- Poor user experience with broken functionality
- Data inconsistency if UI shows removal but backend fails

## 3. Reproduction Context

- **Environment**: Production (Cloudflare Pages + Supabase)
- **Steps to reproduce**:
  1. Log in as a host
  2. Navigate to Host Overview page (`/host-overview`)
  3. Find a listing in "Your Listings" section
  4. Click the delete (trash) icon on a listing card
  5. Confirm deletion in the modal
  6. Observe error (listing not deleted)
- **Expected behavior**: Listing is deleted from database and removed from UI
- **Actual behavior**: Error occurs, listing remains

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Contains broken delete handler (lines 602-654) |
| `supabase/functions/listing/index.ts` | Target edge function - currently supports: create, get, submit, createMockupProposal |
| `supabase/functions/listing/handlers/create.ts` | Reference for handler pattern |
| `supabase/functions/listing/handlers/get.ts` | Reference for handler pattern |
| `supabase/functions/virtual-meeting/handlers/delete.ts` | Reference pattern for delete implementation |
| `.claude/plans/New/listing-migration-to-native-supabase.md` | Documents planned `delete` action (not yet implemented) |

### 4.2 Execution Flow Trace

**Current (Broken) Flow**:
```
1. User clicks delete on listing card
2. handleDeleteClick(listing, 'listing') called
3. Modal opens with item and type stored in state
4. User clicks confirm
5. handleConfirmDelete() executes
6. If deleteType === 'listing':
   -> supabase.functions.invoke('bubble-proxy', { body: { endpoint: 'listing/{id}', method: 'DELETE' } })
   -> FAILS: bubble-proxy function does not exist
7. Error caught, toast shown "Failed to delete item"
```

**Correct Flow Should Be**:
```
1-5. Same as above
6. If deleteType === 'listing':
   -> supabase.functions.invoke('listing', { body: { action: 'delete', payload: { listing_id: itemId } } })
   -> Edge function deletes from Supabase
   -> Enqueues DELETE to Bubble sync queue
   -> Returns success
7. UI updates, toast shows success
```

### 4.3 Git History Analysis

- `bubble-proxy` edge function directory does **not exist** in `supabase/functions/`
- The handler references a legacy architecture that has been removed
- No recent commits to `useHostOverviewPageLogic.js` related to deletion
- The `listing` edge function exists but lacks a `delete` action

### 4.4 Edge Function Inventory

Existing edge functions in `supabase/functions/`:
- `_shared/`
- `ai-gateway/`
- `ai-parse-profile/`
- `ai-signup-guest/`
- `auth-user/`
- `bubble_sync/`
- `bubble-auth-proxy/`
- `communications/`
- `listing/` (target for fix)
- `messages/`
- `pricing/`
- `proposal/`
- `proposal-communications/`
- `proposal-suggestions/`
- `rental-application/`
- `send-email/`
- `send-sms/`
- `slack/`
- `virtual-meeting/`
- `workflow-enqueue/`
- `workflow-orchestrator/`

**Note**: `bubble-proxy/` does NOT exist

## 5. Hypotheses

### Hypothesis 1: Missing Delete Action in Listing Edge Function (Likelihood: 95%)

**Theory**: The `listing` edge function was created with only `create`, `get`, `submit`, and `createMockupProposal` actions. The `delete` action was planned (documented in migration plan) but never implemented. The frontend code references the old `bubble-proxy` pattern from before the migration.

**Supporting Evidence**:
- `listing/index.ts` line 34: `const ALLOWED_ACTIONS = ["create", "get", "submit", "createMockupProposal"] as const;`
- No `delete.ts` handler in `supabase/functions/listing/handlers/`
- Migration plan explicitly lists `delete` action as planned but unchecked
- Frontend code uses old `bubble-proxy` invocation pattern

**Contradicting Evidence**: None

**Verification Steps**:
1. Confirm `bubble-proxy` function does not exist
2. Confirm `delete` action not in `ALLOWED_ACTIONS`
3. Test frontend delete to observe actual error

**Potential Fix**:
1. Create `supabase/functions/listing/handlers/delete.ts`
2. Add `delete` to `ALLOWED_ACTIONS` in `listing/index.ts`
3. Update frontend to use `listing` function with `delete` action

**Convention Check**: Aligns with action-based edge function pattern used throughout codebase

### Hypothesis 2: Incomplete Migration from Bubble-Proxy (Likelihood: 90%)

**Theory**: The codebase underwent a migration from `bubble-proxy` to dedicated edge functions (`listing`, `proposal`, etc.). The delete handler was never updated during this migration, leaving orphaned code.

**Supporting Evidence**:
- Old `bubble-proxy` pattern visible in handler: `{ endpoint: 'listing/${itemId}', method: 'DELETE' }`
- Other operations (create) were migrated to new pattern
- Documentation mentions migration in progress

**Contradicting Evidence**: None - this is likely the root cause

**Verification Steps**:
1. Search for other `bubble-proxy` references in codebase
2. Check if any `bubble-proxy` calls remain

**Potential Fix**: Same as Hypothesis 1 - implement delete action in listing edge function

**Convention Check**: Migration to dedicated edge functions is the documented pattern

### Hypothesis 3: Frontend Using Wrong Function Name (Likelihood: 80%)

**Theory**: The frontend handler simply has the wrong function name and payload structure. The correct infrastructure may already exist or be partially implemented.

**Supporting Evidence**:
- Other handlers in same file may use correct patterns
- `listing` edge function exists and is functional for other operations

**Contradicting Evidence**:
- The `delete` action doesn't exist in `listing` function yet, so even with correct invocation it would fail

**Verification Steps**:
1. Check if any `delete` action exists in `listing/index.ts` switch statement
2. Check for `delete.ts` handler file

**Potential Fix**:
1. If delete action exists: Update frontend only
2. If delete action missing: Implement backend + update frontend

**Convention Check**: Correct function naming matches project conventions

## 6. Recommended Action Plan

### Priority 1 (Implementation Required): Create Delete Action in Listing Edge Function

This is a two-part fix:

#### Part A: Backend - Create Delete Handler

**File**: `supabase/functions/listing/handlers/delete.ts` (NEW)

```typescript
/**
 * Delete Listing Handler
 *
 * PATTERN: Soft delete (set Active=false) with queue-based Bubble sync
 * Following virtual-meeting/handlers/delete.ts pattern
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueBubbleSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

interface DeleteListingPayload {
  listing_id: string;
  user_email?: string; // Optional: for ownership verification
}

interface DeleteListingResult {
  deleted: true;
  listing_id: string;
  deletedAt: string;
}

export async function handleDelete(
  payload: Record<string, unknown>
): Promise<DeleteListingResult> {
  console.log('[listing:delete] ========== DELETE LISTING ==========');

  // Validate required fields
  validateRequiredFields(payload, ['listing_id']);

  const { listing_id, user_email } = payload as DeleteListingPayload;

  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('[listing:delete] Deleting listing ID:', listing_id);

  // Step 1: Verify listing exists
  const { data: existingListing, error: fetchError } = await supabase
    .from('listing')
    .select('_id, Name, "Host User"')
    .eq('_id', listing_id)
    .single();

  if (fetchError || !existingListing) {
    console.error('[listing:delete] Listing not found:', fetchError);
    throw new ValidationError(`Listing not found: ${listing_id}`);
  }

  console.log('[listing:delete] Found listing:', existingListing.Name);

  // Step 2: Soft delete (set Active=false)
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('listing')
    .update({
      Active: false,
      'Modified Date': now,
    })
    .eq('_id', listing_id);

  if (updateError) {
    console.error('[listing:delete] Update failed:', updateError);
    throw new SupabaseSyncError(`Failed to delete listing: ${updateError.message}`);
  }

  console.log('[listing:delete] Listing soft-deleted successfully');

  // Step 3: Queue Bubble sync (UPDATE operation to set Active=false)
  try {
    await enqueueBubbleSync(supabase, {
      correlationId: `listing_delete:${listing_id}`,
      items: [{
        sequence: 1,
        table: 'listing',
        recordId: listing_id,
        operation: 'UPDATE',
        bubbleId: listing_id,
        payload: { Active: false, 'Modified Date': now },
      }]
    });

    console.log('[listing:delete] Bubble sync enqueued');
    triggerQueueProcessing();
  } catch (syncError) {
    console.error('[listing:delete] Queue error (non-blocking):', syncError);
  }

  return {
    deleted: true,
    listing_id: listing_id,
    deletedAt: now,
  };
}
```

**File**: `supabase/functions/listing/index.ts` (MODIFY)

1. Add `'delete'` to `ALLOWED_ACTIONS` (line 34)
2. Add `'delete'` to `PUBLIC_ACTIONS` if desired, or keep protected
3. Import `handleDelete` from `./handlers/delete.ts`
4. Add case in switch statement

#### Part B: Frontend - Update Handler

**File**: `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`

**Lines 609-616**: Replace the broken `bubble-proxy` call with correct `listing` call

**Before (Broken)**:
```javascript
if (deleteType === 'listing') {
  // Delete listing via Bubble API
  await supabase.functions.invoke('bubble-proxy', {
    body: {
      endpoint: `listing/${itemId}`,
      method: 'DELETE'
    }
  });
  // ...
}
```

**After (Fixed)**:
```javascript
if (deleteType === 'listing') {
  // Delete listing via listing edge function
  const { data, error } = await supabase.functions.invoke('listing', {
    body: {
      action: 'delete',
      payload: {
        listing_id: itemId,
        user_email: user?.email, // Optional: for ownership verification
      }
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to delete listing');
  }
  // ...
}
```

### Priority 2 (If Priority 1 Fails): Check for Alternative Delete Mechanisms

If the listing edge function approach encounters issues:
1. Check if there's a direct Supabase RPC for deletion
2. Verify RLS policies allow deletion
3. Consider using direct Supabase client delete (though edge function is preferred)

### Priority 3 (Deeper Investigation): Review Other Delete Types

The same handler also handles `claim` and `manual` deletions using `bubble-proxy`:
- Lines 621-630: Delete claim (PATCH to clear Claimable By)
- Lines 634-641: Delete house manual

These may need similar fixes if `bubble-proxy` doesn't exist.

## 7. Prevention Recommendations

1. **Remove Dead Code References**: Audit codebase for other `bubble-proxy` references and update them
2. **Add Deprecation Warnings**: If `bubble-proxy` pattern is deprecated, add comments/warnings
3. **Integration Tests**: Add tests for delete operations to catch regressions
4. **Documentation**: Update architecture docs to reflect current edge function structure
5. **Migration Checklist**: Complete the listing migration plan's delete action checkbox

## 8. Related Files Reference

### Files to Create
| File | Line Numbers | Change Type |
|------|--------------|-------------|
| `supabase/functions/listing/handlers/delete.ts` | All (new file) | CREATE |

### Files to Modify
| File | Line Numbers | Change Type |
|------|--------------|-------------|
| `supabase/functions/listing/index.ts` | 24, 34, 36, 130-145 | MODIFY - Add delete action |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | 609-616 | MODIFY - Fix handler invocation |

### Reference Files (Do Not Modify - For Pattern Reference Only)
| File | Purpose |
|------|---------|
| `supabase/functions/virtual-meeting/handlers/delete.ts` | Delete handler pattern |
| `supabase/functions/listing/handlers/create.ts` | Create handler pattern |
| `supabase/functions/_shared/queueSync.ts` | Queue sync utilities |
| `supabase/functions/_shared/errors.ts` | Error classes |

---

**Analysis Version**: 1.0
**Analyst**: Claude (debug-analyst)
**Next Steps**: Execute implementation following Priority 1 plan, then deploy edge function and test
