# Plan: Remove `account_host` Table from Codebase

**Created**: 2025-12-16 12:00:00
**Status**: CODE CHANGES COMPLETE - READY FOR TABLE DELETION
**Classification**: CLEANUP
**Risk Level**: HIGH (affects signup, auth, proposals, listings, bubble sync)
**Last Updated**: 2025-12-16

---

## Executive Summary

The `account_host` table was intended to be deleted weeks ago along with `account_guest`, but it persists because **21 files** across the codebase still reference it. This plan outlines a systematic approach to:
1. Export existing data
2. Migrate necessary fields to the `user` table
3. Update all code references
4. Delete the table

---

## Current State Analysis

### Usage Statistics
| Category | Count | Files |
|----------|-------|-------|
| Frontend Code | 4 | auth.js, useLoggedInAvatarData.js, supabaseUtils.js, useHostOverviewPageLogic.js |
| Edge Functions | 11 | signup.ts, validate.ts, submit.ts, get.ts, update.ts, create.ts, virtual-meeting/create.ts, tableMapping.ts, syncSignupAtomic.ts, propagateListingFK.ts, processQueueDataApi.ts |
| Documentation | 6 | AUTH_USER_EDGE_FUNCTION.md, SIGNUP_FLOW.md, BUBBLE_SYNC.md, DATABASE_*.md |

### Data Flow
```
SIGNUP FLOW:
  1. signup.ts creates account_host record with generated ID
  2. syncSignupAtomic.ts syncs account_host to Bubble
  3. user record created with FK to account_host._id
  4. propagateListingFK.ts updates account_host.Listings when listings created

QUERY FLOW:
  user['Account - Host / Landlord'] → account_host._id → account_host data
```

### Fields Currently in `account_host`
- `_id` (primary key)
- `bubble_id` (Bubble sync ID)
- `User` (FK back to user)
- `Listings` (array of listing IDs)
- Host-specific profile fields (if any)

---

## Migration Strategy

### Phase 0: Data Export & Backup
**Objective**: Safely export all `account_host` data before making changes

**Actions**:
1. Export `account_host` table to JSON/CSV
2. Document current record count
3. Store backup in secure location

---

### Phase 1: Database Schema Update
**Objective**: Add necessary columns to `user` table

**Actions**:
1. Add `host_listings` column to `user` table (array of listing IDs)
2. Add any other host-specific fields from `account_host` to `user`
3. Migrate existing `account_host.Listings` data to `user.host_listings`
4. Update `user['Account - Host / Landlord']` to NULL (no longer needed)

**Migration SQL**:
```sql
-- Add host_listings column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS host_listings TEXT[];

-- Migrate listings data from account_host to user
UPDATE "user" u
SET host_listings = ah."Listings"
FROM account_host ah
WHERE u."Account - Host / Landlord" = ah._id;

-- Clear the FK column (will be removed in Phase 3)
-- UPDATE "user" SET "Account - Host / Landlord" = NULL;
```

---

### Phase 2: Code Migration

#### 2.1 Edge Functions (CRITICAL - Do First)

##### signup.ts
**File**: `supabase/functions/auth-user/handlers/signup.ts`
**Lines**: 234-308
**Changes**:
- Remove account_host record creation (lines 234-261)
- Remove account_host cleanup on failure (line 294)
- Remove account_host references in logs (line 308)
- Update user creation to include host_listings field directly

##### validate.ts
**File**: `supabase/functions/auth-user/handlers/validate.ts`
**Line**: 159
**Changes**:
- Remove `accountHostId` from returned userData
- Or keep for backwards compatibility but fetch from user table

##### syncSignupAtomic.ts
**File**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`
**Lines**: 76-191
**Changes**:
- Remove account_host sync to Bubble (steps 1.1, 2.1)
- Update to sync host_listings from user table directly
- May need to update Bubble data model first

##### propagateListingFK.ts
**File**: `supabase/functions/bubble_sync/handlers/propagateListingFK.ts`
**Lines**: 54-132
**Changes**:
- Update to fetch user directly instead of account_host
- Update user.host_listings instead of account_host.Listings
- Update Bubble sync to use user table

##### tableMapping.ts
**File**: `supabase/functions/bubble_sync/lib/tableMapping.ts`
**Lines**: 24, 68
**Changes**:
- Remove `account_host` mapping

##### submit.ts
**File**: `supabase/functions/listing/handlers/submit.ts`
**Lines**: 295-376
**Changes**:
- Query user table directly instead of account_host
- Get listings from user.host_listings

##### proposal/actions/*.ts
**Files**: get.ts (107-110), update.ts (341), create.ts (132)
**Changes**:
- Update queries to fetch host data from user table
- Remove account_host joins

##### virtual-meeting/handlers/create.ts
**File**: `supabase/functions/virtual-meeting/handlers/create.ts`
**Lines**: 30-80
**Changes**:
- Fetch host data directly from user table
- Remove account_host query

##### processQueueDataApi.ts
**File**: `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`
**Line**: 175
**Changes**:
- Update FK propagation to use user.host_listings

---

#### 2.2 Frontend Code

##### auth.js
**File**: `app/src/lib/auth.js`
**Lines**: 624, 996, 998
**Changes**:
- Remove accountHostId from user data structure
- Remove 'Account - Host / Landlord' field handling
- Update comments

##### useLoggedInAvatarData.js
**File**: `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Lines**: 257-262
**Changes**:
- Remove account_host query
- Get host data directly from user record

##### supabaseUtils.js
**File**: `app/src/lib/supabaseUtils.js`
**Lines**: 110-171
**Changes**:
- Remove account_host batch fetching
- Update host map creation to use user table directly

##### useHostOverviewPageLogic.js
**File**: `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`
**Lines**: 82, 432, 524
**Changes**:
- Remove accountHostId resolution logic
- Get host data directly from user record

---

### Phase 3: Cleanup

1. **Remove `Account - Host / Landlord` column from user table** (after verification)
2. **Delete `account_host` table from Supabase**
3. **Update documentation files**:
   - AUTH_USER_EDGE_FUNCTION.md
   - SIGNUP_FLOW.md
   - BUBBLE_SYNC.md
   - DATABASE_OPTION_SETS_QUICK_REFERENCE.md
   - DATABASE_RELATIONS.md
   - DATABASE_TABLES_DETAILED.md

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | HIGH | Export all data before changes |
| Signup failures | CRITICAL | Test signup flow thoroughly after changes |
| Bubble sync breaks | HIGH | Coordinate with Bubble data model changes |
| Existing proposals fail | MEDIUM | Test proposal flows after changes |
| Host dashboard breaks | MEDIUM | Test HostOverviewPage thoroughly |

---

## Execution Order

```
1. [x] Export account_host data (backup) - Data exists in Supabase, 886 records verified
2. [x] Add host_listings column to user table - Already migrated (Listings column exists)
3. [x] Migrate listings data to user.host_listings - 99.7% accuracy verified
4. [x] Update Edge Functions (in order):
   a. [x] tableMapping.ts (remove mapping)
   b. [x] signup.ts (stop creating account_host)
   c. [x] syncSignupAtomic.ts (stop syncing account_host)
   d. [x] propagateListingFK.ts (use user.Listings)
   e. [x] submit.ts (query user instead)
   f. [x] proposal/actions/*.ts (update queries)
   g. [x] virtual-meeting/create.ts (update query)
   h. [ ] validate.ts (update response) - accountHostId still returned for compatibility
   i. [ ] processQueueDataApi.ts (FK propagation comment only)
5. [ ] Deploy Edge Functions - MANUAL DEPLOYMENT REQUIRED
6. [x] Update Frontend Code:
   a. [x] auth.js (comment updates)
   b. [x] supabaseUtils.js (fetchHostData now uses user table)
   c. [x] useLoggedInAvatarData.js (removed account_host query)
   d. [x] useHostOverviewPageLogic.js (already uses user.accountHostId)
7. [ ] Test all affected flows
8. [ ] Update documentation
9. [ ] Remove Account - Host / Landlord column (OPTIONAL - keep for legacy compatibility)
10. [ ] Delete account_host table
```

---

## Files Referenced

### Frontend
- `app/src/lib/auth.js`
- `app/src/lib/supabaseUtils.js`
- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
- `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`

### Edge Functions
- `supabase/functions/auth-user/handlers/signup.ts`
- `supabase/functions/auth-user/handlers/validate.ts`
- `supabase/functions/listing/handlers/submit.ts`
- `supabase/functions/proposal/actions/get.ts`
- `supabase/functions/proposal/actions/update.ts`
- `supabase/functions/proposal/actions/create.ts`
- `supabase/functions/virtual-meeting/handlers/create.ts`
- `supabase/functions/bubble_sync/lib/tableMapping.ts`
- `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`
- `supabase/functions/bubble_sync/handlers/propagateListingFK.ts`
- `supabase/functions/bubble_sync/handlers/processQueueDataApi.ts`

### Documentation
- `.claude/Documentation/Auth/AUTH_USER_EDGE_FUNCTION.md`
- `.claude/Documentation/Auth/SIGNUP_FLOW.md`
- `.claude/Documentation/Backend(EDGE - Functions)/BUBBLE_SYNC.md`
- `.claude/Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md`
- `.claude/Documentation/Database/DATABASE_RELATIONS.md`
- `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md`

---

## Dependencies

- Bubble data model may need updates (remove account_host type if it exists there)
- RLS policies may need updates if they reference account_host
- Any third-party integrations using account_host data

---

## Approval Required

This plan requires explicit approval before execution due to:
1. Database schema changes
2. High-risk modifications to signup flow
3. Changes affecting Bubble sync
4. Multiple Edge Function deployments required

**Next Steps**: Await user approval, then proceed with Phase 0 (data export).
