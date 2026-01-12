# Bubble.io Legacy Integration Removal - Comprehensive Cleanup Plan

**Created**: 2026-01-11
**Status**: Ready for Execution
**Estimated Scope**: ~50 files to modify/delete
**Risk Level**: Medium-High (requires careful sequencing)

---

## 1. Executive Summary

### What is Being Cleaned Up
Remove all Bubble.io legacy integration code from the Split Lease codebase, including:
- The `bubble_sync` Edge Function and its entire directory
- The `bubble-proxy` Edge Function (confirmed does not exist - was already removed)
- Bubble sync queue system (`sync_queue` table, cron jobs, related functions)
- Shared Bubble utilities (`bubbleSync.ts`, `queueSync.ts`, Bubble config functions)
- Frontend `bubbleAPI.js` client
- Bubble-specific error classes and types
- Documentation references to Bubble workflows

### Why This Cleanup is Needed
- Supabase is now the source of truth for all data
- The bubble_sync queue system is legacy and no longer processes real data
- Removing this code reduces:
  - Technical debt and maintenance burden
  - Confusion about data flow architecture
  - Environment variable requirements (BUBBLE_API_BASE_URL, BUBBLE_API_KEY)

### Expected Outcomes
- Cleaner codebase with single data source (Supabase)
- Reduced Edge Function deployment footprint
- Simplified error handling (no BubbleApiError class needed)
- Fewer environment variables to manage

---

## 2. Current State Analysis

### 2.1 Backend Files (supabase/functions/)

#### Files to DELETE ENTIRELY:

| File/Directory | Lines | Purpose |
|----------------|-------|---------|
| `supabase/functions/bubble_sync/` | ~2000+ | Entire Edge Function directory for Bubble sync |
| `supabase/functions/bubble_sync/index.ts` | 295 | Main router for bubble_sync actions |
| `supabase/functions/bubble_sync/handlers/processQueue.ts` | ~150 | Workflow API queue processor |
| `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts` | ~200 | Data API queue processor |
| `supabase/functions/bubble_sync/handlers/syncSingle.ts` | ~100 | Single record sync |
| `supabase/functions/bubble_sync/handlers/retryFailed.ts` | ~80 | Failed item retry |
| `supabase/functions/bubble_sync/handlers/getStatus.ts` | ~60 | Queue status |
| `supabase/functions/bubble_sync/handlers/cleanup.ts` | ~80 | Queue cleanup |
| `supabase/functions/bubble_sync/handlers/buildRequest.ts` | ~60 | Debug request builder |
| `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` | ~150 | Atomic signup sync |
| `supabase/functions/bubble_sync/handlers/propagateListingFK.ts` | ~100 | FK propagation |
| `supabase/functions/bubble_sync/lib/bubblePush.ts` | ~100 | Workflow API client |
| `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` | ~200 | Data API client |
| `supabase/functions/bubble_sync/lib/queueManager.ts` | ~200 | Queue operations |
| `supabase/functions/bubble_sync/lib/tableMapping.ts` | ~150 | Table name mapping |
| `supabase/functions/bubble_sync/lib/fieldMapping.ts` | ~180 | Field name mapping |
| `supabase/functions/bubble_sync/lib/transformer.ts` | ~280 | Data transformation |
| `supabase/functions/bubble_sync/deno.json` | ~20 | Deno config |
| `supabase/functions/bubble_sync/README.md` | ~220 | Documentation |
| `supabase/functions/bubble_sync/DEPLOYMENT.md` | ~50 | Deployment docs |
| `supabase/functions/_shared/bubbleSync.ts` | 375 | BubbleSyncService class |
| `supabase/functions/_shared/queueSync.ts` | 314 | Queue sync utilities |

#### Files to MODIFY:

| File | Modification Type | Details |
|------|-------------------|---------|
| `supabase/functions/_shared/errors.ts` | Remove class | Remove `BubbleApiError` class (lines 8-17) |
| `supabase/functions/_shared/fp/orchestration.ts` | Remove function | Remove `getBubbleConfig()` and `BubbleConfig` interface (lines 180-200) |
| `supabase/functions/listing/index.ts` | Remove Bubble config | Remove `getBubbleConfig` import and Bubble-related config logic |
| `supabase/functions/listing/handlers/get.ts` | Rewrite entirely | Currently fetches from Bubble Data API - must fetch from Supabase |
| `supabase/functions/listing/handlers/create.ts` | Remove sync queue | Remove `enqueueBubbleSync` import and calls |
| `supabase/functions/listing/handlers/delete.ts` | Remove sync queue | Remove `enqueueBubbleSync` import and calls |
| `supabase/functions/auth-user/index.ts` | Remove Bubble config | Remove `getBubbleConfig` import and BUBBLE_REQUIRED_ACTIONS |
| `supabase/functions/auth-user/handlers/validate.ts` | Remove Bubble refs | Remove `BubbleApiError` usage, update comments |
| `supabase/functions/auth-user/handlers/signup.ts` | Remove sync queue | Remove `enqueueSignupSync` calls and imports |
| `supabase/functions/auth-user/handlers/oauthSignup.ts` | Remove sync queue | Remove `enqueueSignupSync` calls |
| `supabase/functions/auth-user/handlers/login.ts` | Update error class | Replace `BubbleApiError` with appropriate error class |
| `supabase/functions/auth-user/handlers/updatePassword.ts` | Update error class | Replace `BubbleApiError` with `ValidationError` |
| `supabase/functions/auth-user/handlers/resetPassword.ts` | Update error class | Replace `BubbleApiError` |
| `supabase/functions/auth-user/handlers/oauthLogin.ts` | Update error class | Replace `BubbleApiError` |
| `supabase/functions/proposal/actions/create.ts` | Remove sync queue | Remove `enqueueBubbleSync` and `triggerQueueProcessing` |
| `supabase/functions/proposal/lib/bubbleSyncQueue.ts` | DELETE | Entire file - proposal-specific queue helper |
| `supabase/functions/cohost-request/handlers/rate.ts` | Remove sync queue | Remove `enqueueBubbleSync` calls |

### 2.2 Frontend Files (app/src/)

#### Files to DELETE:

| File | Lines | Purpose |
|------|-------|---------|
| `app/src/lib/bubbleAPI.js` | 230 | Bubble API proxy client |

#### Files to MODIFY:

| File | Modification Type | Details |
|------|-------------------|---------|
| `app/src/lib/constants.js` | Remove constants | Remove `BUBBLE_API_URL`, `BUBBLE_MESSAGING_ENDPOINT`, Bubble CDN URLs |
| `app/src/lib/auth.js` | Update comments | Remove references to Bubble token validation, update architecture comments |
| `app/src/lib/secureStorage.js` | Update comments | Remove "Bubble API" references in JSDoc |
| `app/src/lib/SECURE_AUTH_README.md` | Update docs | Remove all Bubble token management references |
| `app/src/logic/workflows/auth/validateTokenWorkflow.js` | Update | Remove `bubbleValidateFn` parameter, update validation flow |
| `app/src/lib/proposals/dataTransformers.js` | Update comments | Change "Bubble.io format" to "database format" |
| `app/src/logic/processors/proposals/processProposalData.js` | Update comments | Change "Bubble.io format" references |
| `app/src/CLAUDE.md` | Update docs | Remove Bubble API proxy references |
| `app/src/islands/pages/CLAUDE.md` | Update docs | Remove bubble-proxy references |

### 2.3 Database (Migrations)

#### Tables/Objects to DROP:

| Object | Type | Migration File |
|--------|------|----------------|
| `sync_queue` | Table | `20251205_create_sync_queue_tables.sql` |
| `sync_config` | Table | `20251205_create_sync_queue_tables.sql` |
| `sync_queue_status` | View | `20251210_queue_processing_cron.sql` |
| `trigger_sync_queue()` | Function | `20251205_create_sync_queue_tables.sql` |
| `trigger_bubble_sync_queue()` | Function | `20251210_queue_processing_cron.sql` |
| `cleanup_old_queue_items()` | Function | `20251210_queue_processing_cron.sql` |
| `notify_new_queue_item()` | Function | `20251210_queue_processing_cron.sql` |
| `update_sync_config_timestamp()` | Function | `20251205_create_sync_queue_tables.sql` |
| `process-bubble-sync-queue` | Cron Job | `20251210_queue_processing_cron.sql` |
| `cleanup-sync-queue` | Cron Job | `20251210_queue_processing_cron.sql` |

#### Related Migration Files (for reference):
- `supabase/migrations/20251205_create_sync_queue_tables.sql`
- `supabase/migrations/20251209_listing_bubble_sync_backend.sql`
- `supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql`
- `supabase/migrations/20251209_extend_sync_queue_for_signup.sql`
- `supabase/migrations/20251210_queue_processing_cron.sql`
- `supabase/migrations/20260110_document_sync_queue_fk.sql`

### 2.4 Configuration/Environment

#### Environment Variables to Remove:
- `BUBBLE_API_BASE_URL`
- `BUBBLE_API_KEY`

#### Locations:
- Supabase Dashboard > Project Settings > Edge Functions Secrets
- `app/.env.example` (update to remove references)

### 2.5 Documentation Files

#### Files to UPDATE:
| File | Changes |
|------|---------|
| `.claude/CLAUDE.md` | Remove bubble_sync and bubble-proxy from architecture |
| `supabase/CLAUDE.md` | Remove bubble_sync section, update architecture diagram |
| `.claude/Documentation/Backend(EDGE - Functions)/README.md` | Remove Bubble references |
| `.claude/Documentation/Backend(EDGE - Functions)/BUBBLE_SYNC.md` | DELETE or mark deprecated |
| Various plan files in `.claude/plans/` | Leave as historical record |

---

## 3. Target State Definition

### 3.1 Architecture After Cleanup

```
Frontend (app/) ──→ Supabase Edge Functions ──→ Supabase Database
                          │
                          └── (NO Bubble.io integration)
```

### 3.2 Error Handling Pattern
Replace `BubbleApiError` with:
- `ValidationError` for input validation failures
- `AuthenticationError` for auth failures
- `SupabaseSyncError` for database operation failures
- Generic `Error` for other cases

### 3.3 Success Criteria
- [ ] All code referencing `bubble_sync` Edge Function removed
- [ ] All code referencing `bubble-proxy` Edge Function removed
- [ ] No imports of `bubbleSync.ts` or `queueSync.ts`
- [ ] No imports of `BubbleApiError`
- [ ] No references to `BUBBLE_API_BASE_URL` or `BUBBLE_API_KEY`
- [ ] `listing/handlers/get.ts` fetches from Supabase, not Bubble
- [ ] All Edge Functions deploy successfully
- [ ] Frontend builds without errors
- [ ] No Bubble-related cron jobs running

---

## 4. File-by-File Action Plan

### Phase 1: Delete Standalone Bubble Files (No Dependencies)

#### 4.1 Delete bubble_sync Edge Function Directory
```
DELETE: supabase/functions/bubble_sync/ (entire directory)
```
**Files to delete:**
- `index.ts`
- `deno.json`
- `README.md`
- `DEPLOYMENT.md`
- `handlers/processQueue.ts`
- `handlers/processQueueDataApi.ts`
- `handlers/syncSingle.ts`
- `handlers/retryFailed.ts`
- `handlers/getStatus.ts`
- `handlers/cleanup.ts`
- `handlers/buildRequest.ts`
- `handlers/syncSignupAtomic.ts`
- `handlers/propagateListingFK.ts`
- `lib/bubblePush.ts`
- `lib/bubbleDataApi.ts`
- `lib/queueManager.ts`
- `lib/tableMapping.ts`
- `lib/fieldMapping.ts`
- `lib/transformer.ts`

**Verification:** Directory no longer exists

#### 4.2 Delete Frontend Bubble API Client
```
DELETE: app/src/lib/bubbleAPI.js
```
**Verification:** File no longer exists, no imports of this file

#### 4.3 Delete Proposal Bubble Sync Queue Helper
```
DELETE: supabase/functions/proposal/lib/bubbleSyncQueue.ts
```
**Verification:** File no longer exists

### Phase 2: Remove Shared Utilities

#### 4.4 Delete _shared/bubbleSync.ts
```
DELETE: supabase/functions/_shared/bubbleSync.ts
```
**Before deleting, verify no active imports:**
- `listing/handlers/get.ts` - MUST BE UPDATED FIRST (see Phase 3)

**Verification:** No imports of `BubbleSyncService`

#### 4.5 Delete _shared/queueSync.ts
```
DELETE: supabase/functions/_shared/queueSync.ts
```
**Before deleting, verify no active imports:**
- All files using `enqueueBubbleSync` must be updated first

**Verification:** No imports of `enqueueBubbleSync` or `triggerQueueProcessing`

### Phase 3: Update Edge Functions (Critical Path)

#### 4.6 Update listing/handlers/get.ts
**Current State:** Fetches from Bubble Data API via `BubbleSyncService`
**Target State:** Fetch directly from Supabase `listing` table

```typescript
// BEFORE (lines 31-55):
const syncService = new BubbleSyncService(bubbleBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey);
const listingData = await syncService.fetchBubbleObject('Listing', listing_id);

// AFTER:
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const { data: listingData, error } = await supabase
  .from('listing')
  .select('*')
  .eq('_id', listing_id)
  .single();

if (error) {
  throw new SupabaseSyncError(`Failed to fetch listing: ${error.message}`);
}
```

**Required Changes:**
1. Remove `BubbleSyncService` import
2. Remove Bubble env var reads
3. Add Supabase client creation
4. Update fetch logic to use Supabase query
5. Update error handling

**Dependencies:** None (can be done immediately)

#### 4.7 Update listing/index.ts
**Remove:**
- Line 36: `getBubbleConfig` import
- Lines 78-85: `FullListingConfig` interface Bubble properties
- Lines 88-94: Comment about "no Bubble dependency"
- Lines 95-96: `SUPABASE_ONLY_ACTIONS` constant
- Lines 99-130: `getConfigForAction` function (simplify to only Supabase)

**Dependencies:** 4.6 (listing/handlers/get.ts)

#### 4.8 Update listing/handlers/create.ts
**Remove:**
- Line 18: `enqueueBubbleSync, triggerQueueProcessing` import
- Lines 117-141: Bubble sync enqueue block

**Dependencies:** None

#### 4.9 Update listing/handlers/delete.ts
**Remove:**
- Line 14: `enqueueBubbleSync, triggerQueueProcessing` import
- Lines 90-104: Bubble sync enqueue block

**Dependencies:** None

#### 4.10 Update proposal/actions/create.ts
**Remove:**
- Line 35: `enqueueBubbleSync, triggerQueueProcessing` import from `bubbleSyncQueue.ts`
- Lines 567-591: Bubble sync enqueue block

**Dependencies:** None

#### 4.11 Update auth-user/index.ts
**Remove:**
- Line 42: `getBubbleConfig` import
- Lines 80-81: `BUBBLE_REQUIRED_ACTIONS` constant
- Lines 102-131: Bubble config in `AuthUserConfig` interface and `getAuthUserConfig`
- Line 244: `bubbleBaseUrl, bubbleApiKey` destructure
- Line 261: Validate handler call with Bubble params

**Dependencies:** 4.12 (validate handler update)

#### 4.12 Update auth-user/handlers/validate.ts
**Current State:** Has Bubble API params in signature (unused)
**Target State:** Remove Bubble params, update function signature

**Remove:**
- Lines 17-18: JSDoc for bubbleAuthBaseUrl, bubbleApiKey
- Lines 30-31: `bubbleAuthBaseUrl: string, bubbleApiKey: string` params
- Lines 26, 67, 76, 204, 211: `BubbleApiError` references

**Change:** Replace `BubbleApiError` with `SupabaseSyncError` or `AuthenticationError`

**Dependencies:** None

#### 4.13 Update auth-user/handlers/signup.ts
**Remove:**
- Import of `enqueueSignupSync` from `queueSync.ts` (around line 19, currently not visible but likely exists)
- Lines 291-306: Bubble sync queue section

**Replace `BubbleApiError`:**
- Lines 98, 102, 108, 128-137, 153, 158-165, 197-199, 217, 277-280, 306, 321-328: Replace with `ValidationError` or `AuthenticationError`

**Dependencies:** None

#### 4.14 Update auth-user/handlers/oauthSignup.ts
**Remove:**
- Import of `enqueueSignupSync`
- Lines 192-200: Bubble sync queue section

**Replace `BubbleApiError`:** All occurrences with appropriate error class

**Dependencies:** None

#### 4.15 Update auth-user/handlers/login.ts
**Replace `BubbleApiError`:**
- Lines 59, 62, 65, 70, 123, 130: Replace with `AuthenticationError`

**Dependencies:** None

#### 4.16 Update auth-user/handlers/updatePassword.ts
**Replace `BubbleApiError`:**
- Lines 40, 62, 81, 92, 99, 112: Replace with `ValidationError` or `AuthenticationError`

**Dependencies:** None

#### 4.17 Update auth-user/handlers/resetPassword.ts
**Replace `BubbleApiError`:** All occurrences

**Dependencies:** None

#### 4.18 Update auth-user/handlers/oauthLogin.ts
**Replace `BubbleApiError`:**
- Lines 67, 132, 137: Replace with appropriate error class

**Dependencies:** None

#### 4.19 Update cohost-request/handlers/rate.ts
**Remove:**
- Line 13: `enqueueBubbleSync, triggerQueueProcessing` import
- Lines 115-142: Bubble sync enqueue block

**Dependencies:** None

### Phase 4: Update Shared Utilities

#### 4.20 Update _shared/errors.ts
**Remove:**
- Lines 8-17: `BubbleApiError` class definition
- Line 71-73: `BubbleApiError` status code handling in `getStatusCodeFromError`

**Dependencies:** All Phase 3 changes complete (no more BubbleApiError imports)

#### 4.21 Update _shared/fp/orchestration.ts
**Remove:**
- Lines 180-200: `BubbleConfig` interface and `getBubbleConfig` function

**Dependencies:** 4.7, 4.11 (listing and auth-user index.ts updates)

### Phase 5: Database Cleanup (New Migration)

#### 4.22 Create Cleanup Migration
Create new migration: `supabase/migrations/YYYYMMDD_remove_bubble_sync_infrastructure.sql`

```sql
-- ============================================================================
-- Migration: Remove Bubble Sync Infrastructure
-- Purpose: Clean up legacy Bubble.io sync queue system
-- ============================================================================

-- Remove cron jobs first
SELECT cron.unschedule('process-bubble-sync-queue');
SELECT cron.unschedule('cleanup-sync-queue');

-- Drop view
DROP VIEW IF EXISTS sync_queue_status;

-- Drop triggers
DROP TRIGGER IF EXISTS sync_queue_insert_trigger ON sync_queue;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_bubble_sync_queue();
DROP FUNCTION IF EXISTS cleanup_old_queue_items();
DROP FUNCTION IF EXISTS notify_new_queue_item();
DROP FUNCTION IF EXISTS trigger_sync_queue();
DROP FUNCTION IF EXISTS update_sync_config_timestamp();

-- Drop tables (sync_queue first due to potential FK)
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS sync_config CASCADE;

-- Log completion
DO $$ BEGIN RAISE LOG 'Bubble sync infrastructure removed'; END $$;
```

**Verification:** Tables and functions no longer exist

### Phase 6: Frontend Updates

#### 4.23 Update app/src/lib/constants.js
**Remove:**
- Line 14: `BUBBLE_API_URL`
- Line 26: `BUBBLE_MESSAGING_ENDPOINT`
- Lines 32-35: Comments about removed Bubble vars
- Lines 42-46: Bubble CDN Lottie URLs (move to local or keep if still used)

**Dependencies:** Verify Lottie URLs are not critical before removing

#### 4.24 Update app/src/lib/auth.js
**Update comments:**
- Lines 83, 117, 190, 216, 222, 455, 462, 629, 851, 854, 1076: Change Bubble references to Supabase Auth

**Dependencies:** None

#### 4.25 Update validateTokenWorkflow.js
**File:** `app/src/logic/workflows/auth/validateTokenWorkflow.js`
**Remove:**
- `bubbleValidateFn` parameter and related logic
- Update JSDoc to remove Bubble references

**Dependencies:** None

### Phase 7: Documentation Updates

#### 4.26 Update supabase/CLAUDE.md
**Remove:**
- `bubble_sync` Edge Function section
- `bubble-proxy` references
- `_shared/bubbleSync.ts` and `_shared/queueSync.ts` documentation
- Environment variables section for BUBBLE_*

#### 4.27 Update .claude/CLAUDE.md
**Remove:**
- Architecture diagram Bubble references
- "Queue-Based Sync" pattern description

#### 4.28 Update app/src/CLAUDE.md
**Remove:**
- bubbleAPI.js references
- Bubble API proxy pattern documentation

---

## 5. Execution Order

### Safe Execution Sequence:

```
Phase 1: Delete standalone files (no dependencies)
    1.1 Delete bubble_sync/ directory
    1.2 Delete app/src/lib/bubbleAPI.js
    1.3 Delete proposal/lib/bubbleSyncQueue.ts

Phase 2: Update Edge Functions (remove Bubble imports)
    2.1 Update listing/handlers/get.ts (CRITICAL - rewrite to use Supabase)
    2.2 Update listing/handlers/create.ts
    2.3 Update listing/handlers/delete.ts
    2.4 Update listing/index.ts
    2.5 Update proposal/actions/create.ts
    2.6 Update auth-user handlers (all 6 files)
    2.7 Update auth-user/index.ts
    2.8 Update cohost-request/handlers/rate.ts

Phase 3: Delete shared utilities (after all imports removed)
    3.1 Delete _shared/bubbleSync.ts
    3.2 Delete _shared/queueSync.ts

Phase 4: Update remaining shared utilities
    4.1 Update _shared/errors.ts (remove BubbleApiError)
    4.2 Update _shared/fp/orchestration.ts (remove getBubbleConfig)

Phase 5: Database cleanup
    5.1 Create and apply cleanup migration

Phase 6: Frontend updates
    6.1 Update constants.js
    6.2 Update auth.js comments
    6.3 Update validateTokenWorkflow.js

Phase 7: Documentation updates
    7.1 Update all CLAUDE.md files
```

### Safe Stopping Points:
- After Phase 1: Code still compiles, Bubble sync just won't work
- After Phase 2: Edge Functions work without Bubble
- After Phase 4: All code cleaned up, database still has tables
- After Phase 5: Complete cleanup

---

## 6. Risk Assessment

### High Risk Changes:
1. **listing/handlers/get.ts rewrite** - This changes data source from Bubble to Supabase
   - Mitigation: Test thoroughly, ensure listing table has all required fields

2. **Database migration** - Dropping tables is irreversible
   - Mitigation: Run on dev branch first, backup data if needed

### Medium Risk Changes:
1. **BubbleApiError replacement** - Many files use this error class
   - Mitigation: Search for all imports before removing class

2. **auth-user handler updates** - Authentication is critical
   - Mitigation: Test all auth flows after changes

### Low Risk Changes:
1. **Deleting unused files** - No runtime impact
2. **Documentation updates** - No code impact
3. **Comment updates** - No runtime impact

### Potential Breaking Changes:
- If any code path still calls `bubble-proxy` Edge Function (verify none exist)
- If `listing/get` action is used and Supabase table missing fields

---

## 7. Verification Checklist

### After Phase 1:
- [ ] `bubble_sync/` directory deleted
- [ ] `bubbleAPI.js` deleted
- [ ] `bubbleSyncQueue.ts` deleted
- [ ] No build errors

### After Phase 2:
- [ ] All Edge Functions deploy successfully
- [ ] `listing` Edge Function works with get action
- [ ] `auth-user` Edge Function works for login/signup
- [ ] `proposal` Edge Function works for create

### After Phase 3-4:
- [ ] No imports of `bubbleSync.ts`
- [ ] No imports of `queueSync.ts`
- [ ] No imports of `BubbleApiError`
- [ ] No references to `getBubbleConfig`

### After Phase 5:
- [ ] `sync_queue` table does not exist
- [ ] `sync_config` table does not exist
- [ ] Cron jobs removed
- [ ] No errors in database logs

### After Phase 6-7:
- [ ] Frontend builds without errors
- [ ] No console warnings about Bubble
- [ ] Documentation accurate

### Final Verification:
```bash
# Check for remaining Bubble references in code
grep -r "bubble" supabase/functions/ --include="*.ts" | grep -v "node_modules" | grep -v ".md"
grep -r "bubble" app/src/ --include="*.js" --include="*.jsx" | grep -v "node_modules" | grep -v "MessageBubble"
```

---

## 8. Reference Appendix

### All Files Mentioned in This Plan

#### Files to DELETE:
```
supabase/functions/bubble_sync/index.ts
supabase/functions/bubble_sync/deno.json
supabase/functions/bubble_sync/README.md
supabase/functions/bubble_sync/DEPLOYMENT.md
supabase/functions/bubble_sync/handlers/processQueue.ts
supabase/functions/bubble_sync/handlers/processQueueDataApi.ts
supabase/functions/bubble_sync/handlers/syncSingle.ts
supabase/functions/bubble_sync/handlers/retryFailed.ts
supabase/functions/bubble_sync/handlers/getStatus.ts
supabase/functions/bubble_sync/handlers/cleanup.ts
supabase/functions/bubble_sync/handlers/buildRequest.ts
supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts
supabase/functions/bubble_sync/handlers/propagateListingFK.ts
supabase/functions/bubble_sync/lib/bubblePush.ts
supabase/functions/bubble_sync/lib/bubbleDataApi.ts
supabase/functions/bubble_sync/lib/queueManager.ts
supabase/functions/bubble_sync/lib/tableMapping.ts
supabase/functions/bubble_sync/lib/fieldMapping.ts
supabase/functions/bubble_sync/lib/transformer.ts
supabase/functions/_shared/bubbleSync.ts
supabase/functions/_shared/queueSync.ts
supabase/functions/proposal/lib/bubbleSyncQueue.ts
app/src/lib/bubbleAPI.js
```

#### Files to MODIFY:
```
supabase/functions/_shared/errors.ts
supabase/functions/_shared/fp/orchestration.ts
supabase/functions/listing/index.ts
supabase/functions/listing/handlers/get.ts
supabase/functions/listing/handlers/create.ts
supabase/functions/listing/handlers/delete.ts
supabase/functions/auth-user/index.ts
supabase/functions/auth-user/handlers/validate.ts
supabase/functions/auth-user/handlers/signup.ts
supabase/functions/auth-user/handlers/oauthSignup.ts
supabase/functions/auth-user/handlers/login.ts
supabase/functions/auth-user/handlers/updatePassword.ts
supabase/functions/auth-user/handlers/resetPassword.ts
supabase/functions/auth-user/handlers/oauthLogin.ts
supabase/functions/proposal/actions/create.ts
supabase/functions/cohost-request/handlers/rate.ts
app/src/lib/constants.js
app/src/lib/auth.js
app/src/lib/secureStorage.js
app/src/logic/workflows/auth/validateTokenWorkflow.js
supabase/CLAUDE.md
.claude/CLAUDE.md
app/src/CLAUDE.md
app/src/islands/pages/CLAUDE.md
```

#### Migration Files (for reference):
```
supabase/migrations/20251205_create_sync_queue_tables.sql
supabase/migrations/20251209_listing_bubble_sync_backend.sql
supabase/migrations/20251209_fix_bubble_sync_payload_filtering.sql
supabase/migrations/20251209_extend_sync_queue_for_signup.sql
supabase/migrations/20251210_queue_processing_cron.sql
supabase/migrations/20260110_document_sync_queue_fk.sql
```

### Key Code Patterns

#### Before: Bubble Sync Queue
```typescript
import { enqueueBubbleSync, triggerQueueProcessing } from '../_shared/queueSync.ts';

await enqueueBubbleSync(supabase, {
  correlationId: proposalId,
  items: [{
    sequence: 1,
    table: 'proposal',
    recordId: proposalId,
    operation: 'INSERT',
    payload: proposalData,
  }]
});
triggerQueueProcessing();
```

#### After: No Sync Queue (Supabase is source of truth)
```typescript
// Direct Supabase insert - no sync needed
const { error: insertError } = await supabase
  .from('proposal')
  .insert(proposalData);

if (insertError) {
  throw new SupabaseSyncError(`Failed to create proposal: ${insertError.message}`);
}
// No Bubble sync - Supabase IS the source of truth
```

#### Before: BubbleApiError
```typescript
import { BubbleApiError } from '../../_shared/errors.ts';

throw new BubbleApiError('Invalid email or password.', 401);
```

#### After: Appropriate Error Class
```typescript
import { AuthenticationError } from '../../_shared/errors.ts';

throw new AuthenticationError('Invalid email or password.');
```

---

## 9. Notes for Executor

1. **Commit Strategy**: Make atomic commits after each phase for easy rollback
2. **Testing Priority**: Test `listing/get` and `auth-user/login` extensively
3. **Environment Variables**: Remember to remove from Supabase Dashboard after code cleanup
4. **Deployment**: Edge Functions must be manually deployed after changes
5. **Database Migration**: Run on dev environment first, verify, then production

---

**Document Version**: 1.0
**Created By**: Claude Opus 4.5 (Cleanup Planner)
**Review Status**: Ready for execution
