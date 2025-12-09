# Native Signup to Bubble Sync - Implementation Plan

**Date**: 2025-12-09 02:01:59
**Status**: Analysis Complete - Ready for Implementation
**Author**: Claude Sonnet 4.5
**Architecture**: Separation of Concerns (Post-Refactor)

---

## Executive Summary

This plan implements **bidirectional sync** between native Supabase signup and Bubble database using the Data API. The implementation follows the new **separation of concerns architecture** established in commit `9978710`.

**Scope**: Propagate 3 database tables (account_host, account_guest, user) from Supabase to Bubble after native signup, handling circular foreign key dependencies via a two-phase atomic operation.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Checklist](#deployment-checklist)
7. [File References](#file-references)

---

## Prerequisites

### ✅ Recently Completed (Commit 9978710)

- **Separation of Concerns Refactor**: Edge functions now follow domain-based organization
- **Architectural Pattern Established**:
  - `auth-user/` → Authentication
  - `proposal/` → Proposals
  - `listing/` → Listings
  - `bubble-proxy/` → Lightweight proxy (shrinking)

### ⚠️ CRITICAL: bubble_sync NOT YET DEPLOYED

**Current State**:
- `bubble_sync` edge function **exists in codebase** (`supabase/functions/bubble_sync/`)
- **NOT configured in `config.toml`** (not deployed)
- **Cannot be invoked** until deployed

**Required Before Implementation**:

1. Add to `supabase/config.toml`:
   ```toml
   [functions.bubble_sync]
   enabled = true
   verify_jwt = false
   entrypoint = "./functions/bubble_sync/index.ts"
   ```

2. Deploy function:
   ```bash
   supabase functions deploy bubble_sync
   ```

3. Verify deployment:
   ```bash
   supabase functions list | grep bubble_sync
   ```

---

## Problem Statement

### Native Signup Creates 3 Records (All with bubble_id = null)

After native Supabase signup (`auth-user/handlers/signup.ts`), we create:

```typescript
// 1. account_host
{
  _id: "1733752800456x123789",           // Supabase-generated ID
  bubble_id: null,                        // ← Must capture from Bubble
  User: "1733752800123x456789",          // FK → user._id (Supabase)
  // ...
}

// 2. account_guest
{
  _id: "1733752800789x987654",           // Supabase-generated ID
  bubble_id: null,                        // ← Must capture from Bubble
  User: "1733752800123x456789",          // FK → user._id (Supabase)
  // ...
}

// 3. user
{
  _id: "1733752800123x456789",           // Supabase-generated ID
  bubble_id: null,                        // ← Must capture from Bubble
  "Account - Host / Landlord": "1733752800456x123789",  // FK → account_host._id (Supabase)
  "Account - Guest": "1733752800789x987654",            // FK → account_guest._id (Supabase)
  // ...
}
```

### 🚨 Circular Dependency Problem

```
┌─────────────────────────────────────────────┐
│       CIRCULAR FOREIGN KEY DEPENDENCY        │
├─────────────────────────────────────────────┤
│                                             │
│         ┌──────────────┐                    │
│         │    user      │                    │
│         └──────────────┘                    │
│              ▲     │                        │
│              │     │                        │
│      User FK │     │ Account FK             │
│              │     │                        │
│              │     ▼                        │
│  ┌───────────────────────────┐             │
│  │   account_host            │             │
│  │   account_guest           │             │
│  └───────────────────────────┘             │
│                                             │
│ ❌ Cannot create user without host/guest    │
│ ❌ Cannot create host/guest without user    │
│                                             │
└─────────────────────────────────────────────┘
```

### ✅ Solution: Two-Phase Creation

```
PHASE 1: CREATE RECORDS (omit circular FKs)
├─ POST account_host (WITHOUT User field) → Get Bubble ID
├─ POST account_guest (WITHOUT User field) → Get Bubble ID
└─ POST user (WITH Bubble host/guest IDs) → Get Bubble ID

PHASE 2: UPDATE FOREIGN KEYS (using Bubble IDs)
├─ PATCH account_host (SET User = Bubble user ID)
└─ PATCH account_guest (SET User = Bubble user ID)
```

---

## Solution Architecture

### Follows New Separation of Concerns Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                   NATIVE SIGNUP FLOW                         │
│  (supabase/functions/auth-user/handlers/signup.ts)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Create auth.users                                       │
│  2. Create account_host (bubble_id = null)                  │
│  3. Create account_guest (bubble_id = null)                 │
│  4. Create user (bubble_id = null)                          │
│  5. Return session tokens → User immediately logged in      │
│                                                             │
│  6. ⚡ Trigger bubble_sync (ASYNC - non-blocking) ────────┐ │
│                                                            │ │
└────────────────────────────────────────────────────────────┼─┘
                                                             │
                                                             ▼
┌─────────────────────────────────────────────────────────────┐
│              bubble_sync EDGE FUNCTION                       │
│  (supabase/functions/bubble_sync/)                          │
│  Pattern: Dedicated function for Bubble sync (NEW!)        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Action: sync_signup_atomic                                 │
│  Handler: handlers/syncSignupAtomic.ts                      │
│                                                             │
│  ========== PHASE 1: CREATE ==========                      │
│  POST /obj/account_host                                     │
│  POST /obj/account_guest                                    │
│  POST /obj/user (with Bubble host/guest IDs)                │
│                                                             │
│  ========== PHASE 2: UPDATE ==========                      │
│  PATCH /obj/account_host (set User FK)                      │
│  PATCH /obj/account_guest (set User FK)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Call Sequence (5 Bubble API Calls)

```
Signup Completes → Returns Immediately to User
     ↓
Background Process Starts
     ↓
┌─────────────────────────────────────────────┐
│  POST /api/1.1/obj/account_host             │
│  Response: { id: "bubbleHostId" }           │
│  Update Supabase: bubble_id = "bubbleHostId"│
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  POST /api/1.1/obj/account_guest            │
│  Response: { id: "bubbleGuestId" }          │
│  Update Supabase: bubble_id = "bubbleGuestId"│
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  POST /api/1.1/obj/user                     │
│  Body: {                                    │
│    "Account - Host": "bubbleHostId",        │
│    "Account - Guest": "bubbleGuestId"       │
│  }                                          │
│  Response: { id: "bubbleUserId" }           │
│  Update Supabase: bubble_id = "bubbleUserId"│
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  PATCH /api/1.1/obj/account_host/{id}       │
│  Body: { "User": "bubbleUserId" }           │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│  PATCH /api/1.1/obj/account_guest/{id}      │
│  Body: { "User": "bubbleUserId" }           │
└─────────────────────────────────────────────┘
     ↓
✅ Sync Complete (all bubble_id fields populated)
```

---

## Implementation Steps

### Step 1: Deploy bubble_sync Edge Function

**⚠️ CRITICAL PREREQUISITE**

**File**: `supabase/config.toml`

**Add Configuration**:
```toml
[functions.bubble_sync]
enabled = true
verify_jwt = false
entrypoint = "./functions/bubble_sync/index.ts"
```

**Deploy**:
```bash
supabase functions deploy bubble_sync
```

**Verify**:
```bash
# Should show bubble_sync in list
supabase functions list

# Test invoke (should return error about unknown action)
curl -X POST https://{project-ref}.supabase.co/functions/v1/bubble_sync \
  -H "Authorization: Bearer {anon-key}" \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'

# Expected: {"success": false, "error": "Invalid action..."}
```

---

### Step 2: Add sync_signup_atomic Action to bubble_sync

**File**: `supabase/functions/bubble_sync/index.ts`

**Changes**:

```typescript
// Add import
import { handleSyncSignupAtomic } from './handlers/syncSignupAtomic.ts';

// Update ALLOWED_ACTIONS
const ALLOWED_ACTIONS = [
    'process_queue',
    'process_queue_data_api',
    'sync_single',
    'retry_failed',
    'get_status',
    'cleanup',
    'build_request',
    'sync_signup_atomic'  // ← NEW ACTION
];

// Add case in switch statement (around line 112)
switch (action) {
    // ... existing cases ...

    case 'sync_signup_atomic':
        // Atomic signup sync handler
        result = await handleSyncSignupAtomic(supabase, dataApiConfig, payload);
        break;

    // ... rest of cases ...
}
```

---

### Step 3: Create syncSignupAtomic Handler

**File**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` (**NEW FILE**)

**Implementation**:

```typescript
/**
 * Atomic Signup Sync Handler
 *
 * Synchronizes native Supabase signup data to Bubble using Data API.
 *
 * PHASE 1: Create account_host, account_guest, user (3 POSTs)
 * PHASE 2: Update foreign keys (2 PATCHes)
 *
 * Handles circular foreign key dependency by:
 * 1. Creating host/guest WITHOUT User field
 * 2. Creating user WITH Bubble host/guest IDs
 * 3. Updating host/guest WITH Bubble user ID
 *
 * NO FALLBACK PRINCIPLE:
 * - Real data or nothing
 * - Errors propagate (not hidden)
 * - Atomic operations (all-or-nothing per phase)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
    BubbleDataApiConfig,
    createRecord,
    updateRecord,
} from '../lib/bubbleDataApi.ts';

export interface SyncSignupAtomicPayload {
    user_id: string;                // Supabase user._id
    host_account_id: string;        // Supabase account_host._id
    guest_account_id: string;       // Supabase account_guest._id
}

export interface SyncSignupAtomicResult {
    success: boolean;
    phase1: {
        host_bubble_id: string;
        guest_bubble_id: string;
        user_bubble_id: string;
    };
    phase2: {
        host_updated: boolean;
        guest_updated: boolean;
    };
    supabase_updates: {
        host_updated: boolean;
        guest_updated: boolean;
        user_updated: boolean;
    };
}

export async function handleSyncSignupAtomic(
    supabase: SupabaseClient,
    bubbleConfig: BubbleDataApiConfig,
    payload: SyncSignupAtomicPayload
): Promise<SyncSignupAtomicResult> {
    console.log('[syncSignupAtomic] ========== ATOMIC SIGNUP SYNC START ==========');
    console.log('[syncSignupAtomic] User ID:', payload.user_id);
    console.log('[syncSignupAtomic] Host Account ID:', payload.host_account_id);
    console.log('[syncSignupAtomic] Guest Account ID:', payload.guest_account_id);

    const result: SyncSignupAtomicResult = {
        success: false,
        phase1: {
            host_bubble_id: '',
            guest_bubble_id: '',
            user_bubble_id: ''
        },
        phase2: {
            host_updated: false,
            guest_updated: false
        },
        supabase_updates: {
            host_updated: false,
            guest_updated: false,
            user_updated: false
        }
    };

    try {
        // ========== FETCH RECORDS FROM SUPABASE ==========
        console.log('[syncSignupAtomic] Fetching records from Supabase...');

        const { data: hostRecord, error: hostFetchError } = await supabase
            .from('account_host')
            .select('*')
            .eq('_id', payload.host_account_id)
            .single();

        if (hostFetchError || !hostRecord) {
            throw new Error(`Failed to fetch account_host: ${hostFetchError?.message}`);
        }

        const { data: guestRecord, error: guestFetchError } = await supabase
            .from('account_guest')
            .select('*')
            .eq('_id', payload.guest_account_id)
            .single();

        if (guestFetchError || !guestRecord) {
            throw new Error(`Failed to fetch account_guest: ${guestFetchError?.message}`);
        }

        const { data: userRecord, error: userFetchError } = await supabase
            .from('user')
            .select('*')
            .eq('_id', payload.user_id)
            .single();

        if (userFetchError || !userRecord) {
            throw new Error(`Failed to fetch user: ${userFetchError?.message}`);
        }

        console.log('[syncSignupAtomic] ✅ All records fetched from Supabase');

        // ========== PHASE 1: CREATE RECORDS IN BUBBLE ==========
        console.log('[syncSignupAtomic] ========== PHASE 1: CREATE RECORDS ==========');

        // Step 1.1: Create account_host (WITHOUT User field)
        console.log('[syncSignupAtomic] Step 1.1: Creating account_host in Bubble...');

        const hostData = {
            'HasClaimedListing': hostRecord['HasClaimedListing'] || false,
            'Receptivity': hostRecord['Receptivity'] || 0,
            'Created Date': hostRecord['Created Date'],
            'Modified Date': hostRecord['Modified Date']
            // ⚠️ OMIT 'User' field - will be set in Phase 2
        };

        const hostBubbleId = await createRecord(
            bubbleConfig,
            'account_host',
            hostData
        );

        result.phase1.host_bubble_id = hostBubbleId;
        console.log('[syncSignupAtomic] ✅ account_host created in Bubble:', hostBubbleId);

        // Update Supabase with Bubble ID
        const { error: hostUpdateError } = await supabase
            .from('account_host')
            .update({ bubble_id: hostBubbleId })
            .eq('_id', payload.host_account_id);

        if (hostUpdateError) {
            console.error('[syncSignupAtomic] Failed to update account_host.bubble_id:', hostUpdateError);
            throw new Error(`Supabase update failed: ${hostUpdateError.message}`);
        }

        result.supabase_updates.host_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase account_host.bubble_id updated');

        // Step 1.2: Create account_guest (WITHOUT User field)
        console.log('[syncSignupAtomic] Step 1.2: Creating account_guest in Bubble...');

        const guestData = {
            'Email': guestRecord['Email'],
            'Created Date': guestRecord['Created Date'],
            'Modified Date': guestRecord['Modified Date']
            // ⚠️ OMIT 'User' field - will be set in Phase 2
        };

        const guestBubbleId = await createRecord(
            bubbleConfig,
            'account_guest',
            guestData
        );

        result.phase1.guest_bubble_id = guestBubbleId;
        console.log('[syncSignupAtomic] ✅ account_guest created in Bubble:', guestBubbleId);

        // Update Supabase with Bubble ID
        const { error: guestUpdateError } = await supabase
            .from('account_guest')
            .update({ bubble_id: guestBubbleId })
            .eq('_id', payload.guest_account_id);

        if (guestUpdateError) {
            console.error('[syncSignupAtomic] Failed to update account_guest.bubble_id:', guestUpdateError);
            throw new Error(`Supabase update failed: ${guestUpdateError.message}`);
        }

        result.supabase_updates.guest_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase account_guest.bubble_id updated');

        // Step 1.3: Create user (WITH Bubble host/guest IDs)
        console.log('[syncSignupAtomic] Step 1.3: Creating user in Bubble...');

        const userData = {
            'email as text': userRecord['email as text'],
            'Name - First': userRecord['Name - First'],
            'Name - Last': userRecord['Name - Last'],
            'Name - Full': userRecord['Name - Full'],
            'Date of Birth': userRecord['Date of Birth'],
            'Phone Number (as text)': userRecord['Phone Number (as text)'],
            'Type - User Current': userRecord['Type - User Current'],
            'Type - User Signup': userRecord['Type - User Signup'],
            'Account - Host / Landlord': hostBubbleId,     // ✅ Use Bubble ID
            'Account - Guest': guestBubbleId,              // ✅ Use Bubble ID
            'Created Date': userRecord['Created Date'],
            'Modified Date': userRecord['Modified Date'],
            'authentication': userRecord['authentication'] || {},
            'user_signed_up': userRecord['user_signed_up'] || true
        };

        const userBubbleId = await createRecord(
            bubbleConfig,
            'user',
            userData
        );

        result.phase1.user_bubble_id = userBubbleId;
        console.log('[syncSignupAtomic] ✅ user created in Bubble:', userBubbleId);

        // Update Supabase with Bubble ID
        const { error: userUpdateError } = await supabase
            .from('user')
            .update({ bubble_id: userBubbleId })
            .eq('_id', payload.user_id);

        if (userUpdateError) {
            console.error('[syncSignupAtomic] Failed to update user.bubble_id:', userUpdateError);
            throw new Error(`Supabase update failed: ${userUpdateError.message}`);
        }

        result.supabase_updates.user_updated = true;
        console.log('[syncSignupAtomic] ✅ Supabase user.bubble_id updated');
        console.log('[syncSignupAtomic] ========== PHASE 1 COMPLETE ==========');

        // ========== PHASE 2: UPDATE FOREIGN KEYS ==========
        console.log('[syncSignupAtomic] ========== PHASE 2: UPDATE FOREIGN KEYS ==========');

        // Step 2.1: Update account_host.User → Bubble user ID
        console.log('[syncSignupAtomic] Step 2.1: Updating account_host.User in Bubble...');

        await updateRecord(
            bubbleConfig,
            'account_host',
            hostBubbleId,
            { 'User': userBubbleId }  // ✅ Set foreign key to Bubble user ID
        );

        result.phase2.host_updated = true;
        console.log('[syncSignupAtomic] ✅ account_host.User updated in Bubble');

        // Step 2.2: Update account_guest.User → Bubble user ID
        console.log('[syncSignupAtomic] Step 2.2: Updating account_guest.User in Bubble...');

        await updateRecord(
            bubbleConfig,
            'account_guest',
            guestBubbleId,
            { 'User': userBubbleId }  // ✅ Set foreign key to Bubble user ID
        );

        result.phase2.guest_updated = true;
        console.log('[syncSignupAtomic] ✅ account_guest.User updated in Bubble');
        console.log('[syncSignupAtomic] ========== PHASE 2 COMPLETE ==========');

        result.success = true;
        console.log('[syncSignupAtomic] ========== ATOMIC SIGNUP SYNC COMPLETE ==========');
        console.log('[syncSignupAtomic] Summary:');
        console.log('[syncSignupAtomic]   Host Bubble ID:', hostBubbleId);
        console.log('[syncSignupAtomic]   Guest Bubble ID:', guestBubbleId);
        console.log('[syncSignupAtomic]   User Bubble ID:', userBubbleId);
        console.log('[syncSignupAtomic]   All foreign keys updated: ✅');

        return result;

    } catch (error) {
        console.error('[syncSignupAtomic] ========== SYNC FAILED ==========');
        console.error('[syncSignupAtomic] Error:', error);
        console.error('[syncSignupAtomic] Partial results:', result);
        throw error;
    }
}
```

---

### Step 4: Trigger Sync from Signup Handler

**File**: `supabase/functions/auth-user/handlers/signup.ts`

**Add After Line 318** (after successful signup):

```typescript
    // Return session and user data
    return {
      access_token,
      refresh_token,
      expires_in,
      user_id: generatedUserId,
      host_account_id: generatedHostId,
      guest_account_id: generatedGuestId,
      supabase_user_id: supabaseUserId,
      user_type: userType
    };

  } catch (error) {
    // ... existing error handling ...
  }

  // ========== ADD THIS BLOCK AFTER THE TRY/CATCH ==========
  finally {
    // ========== TRIGGER BUBBLE SYNC (ASYNC - NON-BLOCKING) ==========
    // Only trigger if signup was successful and we have the IDs
    if (generatedUserId && generatedHostId && generatedGuestId) {
      console.log('[signup] Triggering async Bubble sync...');

      // Don't await - let it run in background
      supabaseAdmin.functions.invoke('bubble_sync', {
        body: {
          action: 'sync_signup_atomic',
          payload: {
            user_id: generatedUserId,
            host_account_id: generatedHostId,
            guest_account_id: generatedGuestId
          }
        }
      }).then((result) => {
        if (result.error) {
          console.error('[signup] Bubble sync failed:', result.error);
          // Log but don't fail signup - Bubble sync can be retried later
          // TODO: Add to retry queue if needed
        } else {
          console.log('[signup] Bubble sync completed:', result.data);
        }
      }).catch((err) => {
        console.error('[signup] Bubble sync error:', err);
        // TODO: Add to retry queue
      });

      console.log('[signup] Bubble sync triggered (running in background)');
    }
  }
```

**⚠️ Important**: The `finally` block ensures sync is triggered even if there are non-fatal errors, but only if the user was successfully created.

---

## Testing Strategy

### Unit Tests

**File**: `supabase/functions/bubble_sync/handlers/syncSignupAtomic.test.ts` (NEW)

```typescript
// Test cases:
- ✅ Successful complete sync (all 5 API calls)
- ✅ Phase 1.1 fails: account_host creation error
- ✅ Phase 1.2 fails: account_guest creation error
- ✅ Phase 1.3 fails: user creation error
- ✅ Phase 2.1 fails: host foreign key update error
- ✅ Phase 2.2 fails: guest foreign key update error
- ✅ Supabase update failures
- ✅ Missing required fields in payload
- ✅ Field transformations (dates, booleans, etc.)
```

### Integration Tests

**Test Sequence**:

```bash
# 1. Create test user via signup
POST /functions/v1/auth-user
{
  "action": "signup",
  "payload": {
    "email": "test-sync@example.com",
    "password": "test1234",
    "retype": "test1234",
    "additionalData": {
      "firstName": "Test",
      "lastName": "Sync",
      "userType": "Guest",
      "birthDate": "1990-01-01",
      "phoneNumber": "555-1234"
    }
  }
}

# Expected: Immediate response with session tokens

# 2. Verify Supabase records created
SELECT _id, bubble_id FROM "user" WHERE email = 'test-sync@example.com';
# Expected: bubble_id = null (initially)

# 3. Wait 30 seconds for background sync

# 4. Verify bubble_id populated
SELECT _id, bubble_id FROM "user" WHERE email = 'test-sync@example.com';
SELECT _id, bubble_id FROM account_host WHERE "User" = (SELECT _id FROM "user" WHERE email = 'test-sync@example.com');
SELECT _id, bubble_id FROM account_guest WHERE "User" = (SELECT _id FROM "user" WHERE email = 'test-sync@example.com');
# Expected: All bubble_id fields populated

# 5. Verify Bubble records via Data API
GET /api/1.1/obj/user/{bubble_id}
GET /api/1.1/obj/account_host/{host_bubble_id}
GET /api/1.1/obj/account_guest/{guest_bubble_id}
# Expected: Records exist with correct foreign keys
```

### Manual Testing Checklist

- [ ] Signup completes in <2 seconds
- [ ] Session tokens returned immediately
- [ ] User can log in immediately after signup
- [ ] Background sync completes within 30 seconds
- [ ] All 3 bubble_id fields populated in Supabase
- [ ] Bubble records created with correct data
- [ ] Bubble foreign keys link correctly
- [ ] Edge Function logs show no errors
- [ ] Failed sync doesn't break signup (error logged only)

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code review completed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] bubble_sync function deployed and verified

### Deployment Steps

1. **Deploy Updated bubble_sync Function**
   ```bash
   supabase functions deploy bubble_sync
   ```

2. **Deploy Updated auth-user Function**
   ```bash
   supabase functions deploy auth-user
   ```

3. **Verify Deployment**
   ```bash
   # Check function logs
   supabase functions logs bubble_sync --tail
   supabase functions logs auth-user --tail
   ```

4. **Test in Staging**
   - Create test account
   - Verify sync completes
   - Check Bubble records

5. **Monitor Production**
   - Watch function logs for errors
   - Monitor sync completion rate
   - Check for failed syncs

### Post-Deployment

- [ ] Monitor error rates (first 24 hours)
- [ ] Verify 95%+ sync success rate
- [ ] Document any issues encountered
- [ ] Update retry queue if needed

---

## File References

### Files to Create

```
supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts    NEW
```

### Files to Modify

```
supabase/config.toml                                           ADD bubble_sync config
supabase/functions/bubble_sync/index.ts                        ADD sync_signup_atomic action
supabase/functions/auth-user/handlers/signup.ts                ADD async sync trigger
```

### Files Referenced (No Changes)

```
supabase/functions/bubble_sync/lib/bubbleDataApi.ts            USED: createRecord(), updateRecord()
supabase/functions/bubble_sync/lib/tableMapping.ts             USED: getBubbleTableName()
supabase/functions/bubble_sync/lib/fieldMapping.ts             USED: applyFieldMappingToBubble()
supabase/functions/bubble_sync/lib/transformer.ts              USED: transformRecordForBubble()
supabase/functions/_shared/cors.ts                             USED: corsHeaders
supabase/functions/_shared/errors.ts                           USED: BubbleApiError
```

### Database Tables Affected

```
account_host                                                   READ (fetch), UPDATE (bubble_id)
account_guest                                                  READ (fetch), UPDATE (bubble_id)
user                                                           READ (fetch), UPDATE (bubble_id)
```

### Bubble API Endpoints Used

```
POST   /api/1.1/obj/account_host                              CREATE record
POST   /api/1.1/obj/account_guest                             CREATE record
POST   /api/1.1/obj/user                                      CREATE record
PATCH  /api/1.1/obj/account_host/{id}                         UPDATE foreign key
PATCH  /api/1.1/obj/account_guest/{id}                        UPDATE foreign key
```

---

## Expected Outcomes

### After Successful Implementation

✅ **User Experience**:
- Signup completes in <2 seconds (native Supabase)
- User receives session tokens immediately
- User can immediately log in and use app
- Background sync transparent to user

✅ **Supabase State**:
- 3 tables have bubble_id populated (account_host, account_guest, user)
- Foreign keys still reference Supabase IDs (for internal queries)
- Records unchanged otherwise

✅ **Bubble State**:
- 3 new records created with Bubble-generated IDs
- All foreign keys reference Bubble IDs
- Data matches Supabase (after field transformations)

✅ **Bidirectional Mapping**:
- account_host.bubble_id → Bubble account_host._id
- account_guest.bubble_id → Bubble account_guest._id
- user.bubble_id → Bubble user._id

---

## Error Handling & Recovery

### Retry Strategy

If sync fails:
1. **Log error** (don't fail signup)
2. **User still registered** in Supabase
3. **Retry options**:
   - Manual: Call `sync_signup_atomic` with same payload
   - Automated: Add to existing retry queue (future enhancement)
   - Last resort: Bubble records can be created manually via admin

### Monitoring

```bash
# Watch for sync failures
supabase functions logs bubble_sync --tail | grep "SYNC FAILED"

# Count sync success/failure
supabase functions logs bubble_sync --tail | grep "ATOMIC SIGNUP SYNC COMPLETE"
supabase functions logs bubble_sync --tail | grep "SYNC FAILED"
```

---

## Architecture Alignment

### ✅ Follows New Separation of Concerns Pattern

| Concern | Function | This Plan |
|---------|----------|-----------|
| Authentication | `auth-user/` | ✅ Trigger from signup |
| Proposals | `proposal/` | N/A |
| Listings | `listing/` | N/A |
| **Bubble Sync** | **`bubble_sync/`** | ✅ **New dedicated handler** |
| Proxy | `bubble-proxy/` | N/A (not used) |

### Pattern Consistency

- ✅ Dedicated edge function for domain (bubble_sync)
- ✅ Handler in handlers/ subdirectory (syncSignupAtomic.ts)
- ✅ Action-based routing (sync_signup_atomic)
- ✅ No business logic in bubble-proxy
- ✅ Clean separation of concerns

---

## Performance Metrics

### Expected Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Signup response time | <2s | Time to return session tokens |
| Background sync time | <30s | Time to complete 5 API calls |
| Sync success rate | >95% | Successful syncs / total signups |
| Bubble API latency | <1s per call | Average API response time |

### Monitoring

```bash
# Watch sync timing
supabase functions logs bubble_sync --tail | grep "ATOMIC SIGNUP SYNC START\|COMPLETE"

# Check for timeouts
supabase functions logs bubble_sync --tail | grep "timeout\|timed out"
```

---

## Rollback Plan

### If Issues Arise Post-Deployment

1. **Immediate**: Comment out sync trigger in signup.ts
2. **Redeploy**: `supabase functions deploy auth-user`
3. **Result**: Signups work, Bubble sync disabled
4. **Fix**: Debug sync issues offline
5. **Re-enable**: Uncomment trigger, redeploy

### Rollback Steps

```typescript
// In signup.ts, comment out:
/*
finally {
  // ========== TRIGGER BUBBLE SYNC ==========
  // ... entire finally block
}
*/
```

Then:
```bash
supabase functions deploy auth-user
```

---

## Success Criteria

Implementation is successful when:

- [x] User signup completes in <2 seconds
- [x] Session tokens returned immediately
- [x] User can log in right after signup
- [x] Background sync completes within 30 seconds
- [x] All bubble_id fields populated in Supabase
- [x] Bubble records created with correct foreign keys
- [x] No errors in Edge Function logs (95%+ success rate)
- [x] Failed syncs don't break signup flow
- [x] Architecture follows separation of concerns pattern

---

**END OF IMPLEMENTATION PLAN**

**Next Steps**:
1. Review plan with team
2. Deploy bubble_sync edge function (prerequisite)
3. Implement Step 2 (add action to index.ts)
4. Implement Step 3 (create handler)
5. Implement Step 4 (trigger from signup)
6. Test thoroughly
7. Deploy to production
8. Monitor for 24 hours

**Estimated Implementation Time**: 4-6 hours
**Estimated Testing Time**: 2-3 hours
**Total**: 1 working day
