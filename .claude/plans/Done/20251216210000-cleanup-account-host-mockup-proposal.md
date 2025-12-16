# Cleanup Plan: Remove account-host Dependencies from Mockup Proposal Flow

**Created**: 2025-12-16 21:00:00
**Type**: CLEANUP
**Status**: Ready for Execution
**Scope**: Mockup proposal creation workflow

---

## Executive Summary

### What is being cleaned up
The mockup proposal creation flow currently requires the `account-host` table as an intermediary between users and proposals. This creates unnecessary complexity because:

1. `listingService.js` fetches `Account - Host / Landlord` from the user table to get `hostAccountId`
2. The Edge Function `createMockupProposal.ts` receives and uses `hostAccountId`
3. The proposal is created with `Host - Account` field set to `hostAccountId`

### Why this cleanup is needed
- The `account-host` table is being deprecated
- New listings created through self-listing already use `user._id` directly for `Host / Landlord` (NOT `account_host._id`)
- The mockup proposal can link directly to the user, simplifying the data model

### Expected outcomes
- Remove `Account - Host / Landlord` lookup from `listingService.js`
- Remove `hostAccountId` parameter from Edge Function payload
- Update Edge Function to derive host information directly from listing's `Host / Landlord` field (which is now `user._id`)
- Proposal's `Host - Account` field will store `user._id` instead of `account_host._id`

---

## Current State Analysis

### Data Model Discovery

**Key Finding**: The `listing.Host / Landlord` field has TWO different meanings depending on when the listing was created:

| Listing Source | `Host / Landlord` Contains |
|----------------|---------------------------|
| Legacy (Bubble-created) | `account_host._id` |
| New (self-listing flow) | `user._id` |

This means the cleanup must handle BOTH cases:
- For new listings: `Host / Landlord` = `user._id` (direct link)
- For legacy listings: `Host / Landlord` = `account_host._id` (need to lookup `account_host.User`)

### Affected Files

| File | Current State | Lines Affected |
|------|--------------|----------------|
| `app/src/lib/listingService.js` | Fetches `Account - Host / Landlord` from user table | 192-216 |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Receives and uses `hostAccountId` | 27-32, 320-326, 489 |
| `supabase/functions/listing/index.ts` | Passes `hostAccountId` to handler | 143-152 |

### Current Flow

```
listingService.js                          Edge Function
       |                                        |
1. Fetch user with "Account - Host / Landlord"  |
2. Extract hostAccountId                        |
3. Call Edge Function with:                     |
   - listingId                                  |
   - hostAccountId  <-- UNNECESSARY             |
   - hostUserId                                 |
   - hostEmail                                  |
                                               4. Receive payload
                                               5. Use hostAccountId for proposal
                                               6. Insert proposal with Host - Account = hostAccountId
```

### Code Snippets - Current State

**listingService.js (lines 188-246)**
```javascript
async function triggerMockupProposalIfFirstListing(userId, listingId) {
  console.log('[ListingService] Step 6: Checking if first listing for mockup proposal...');

  // Fetch user data to check listing count and get required fields
  const { data: userData, error: fetchError } = await supabase
    .from('user')
    .select('_id, email, Listings, "Account - Host / Landlord"')  // <-- FETCHES account-host reference
    .eq('_id', userId)
    .maybeSingle();

  // ... error handling ...

  const listings = userData.Listings || [];
  const hostAccountId = userData['Account - Host / Landlord'];  // <-- EXTRACTS account-host ID
  const userEmail = userData.email;

  // Only create mockup proposal for first listing
  if (listings.length !== 1) {
    console.log(`[ListingService] Skipping mockup proposal - not first listing (count: ${listings.length})`);
    return;
  }

  if (!hostAccountId || !userEmail) {  // <-- REQUIRES hostAccountId
    console.warn('[ListingService] Missing hostAccountId or email for mockup proposal');
    return;
  }

  // ... fetch call with hostAccountId in payload ...
  body: JSON.stringify({
    action: 'createMockupProposal',
    payload: {
      listingId: listingId,
      hostAccountId: hostAccountId,  // <-- PASSES account-host ID
      hostUserId: userId,
      hostEmail: userEmail,
    },
  }),
```

**createMockupProposal.ts (lines 27-32)**
```typescript
export interface CreateMockupProposalPayload {
  listingId: string;
  hostAccountId: string;  // <-- REQUIRES account-host ID
  hostUserId: string;
  hostEmail: string;
}
```

**createMockupProposal.ts (lines 483-489)**
```typescript
const proposalData: Record<string, unknown> = {
  _id: proposalId,

  // Core relationships
  Listing: listingId,
  Guest: guestData._id,
  'Host - Account': hostAccountId,  // <-- USES account-host ID
  'Created By': guestData._id,
```

---

## Target State Definition

### New Flow

```
listingService.js                          Edge Function
       |                                        |
1. Fetch user with email only                   |
2. Call Edge Function with:                     |
   - listingId                                  |
   - hostUserId                                 |
   - hostEmail                                  |
                                               3. Receive payload
                                               4. Fetch listing.Host / Landlord
                                               5. Determine if it's user._id or account_host._id
                                               6. Resolve to user._id if needed
                                               7. Insert proposal with Host - Account = user._id
```

### Success Criteria

1. `listingService.js` no longer queries `Account - Host / Landlord`
2. `hostAccountId` parameter removed from Edge Function payload interface
3. Edge Function derives host user ID from listing data
4. Mockup proposals created with `Host - Account` = `user._id` (not `account_host._id`)
5. All existing tests pass
6. New mockup proposals work for both legacy and new listings

---

## File-by-File Action Plan

### File 1: `app/src/lib/listingService.js`

**Full Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingService.js`

**Current State**:
- Lines 192-194: Fetches `Account - Host / Landlord` from user table
- Lines 204: Extracts `hostAccountId`
- Lines 213-216: Checks `hostAccountId` is present
- Lines 231-236: Includes `hostAccountId` in Edge Function payload

**Required Changes**:

1. **Remove `Account - Host / Landlord` from SELECT query** (line 194)

   BEFORE:
   ```javascript
   .select('_id, email, Listings, "Account - Host / Landlord"')
   ```

   AFTER:
   ```javascript
   .select('_id, email, Listings')
   ```

2. **Remove `hostAccountId` extraction** (line 204)

   BEFORE:
   ```javascript
   const hostAccountId = userData['Account - Host / Landlord'];
   ```

   AFTER:
   ```javascript
   // Line removed entirely
   ```

3. **Update validation check** (lines 213-216)

   BEFORE:
   ```javascript
   if (!hostAccountId || !userEmail) {
     console.warn('[ListingService] Missing hostAccountId or email for mockup proposal');
     return;
   }
   ```

   AFTER:
   ```javascript
   if (!userEmail) {
     console.warn('[ListingService] Missing email for mockup proposal');
     return;
   }
   ```

4. **Remove `hostAccountId` from payload** (lines 231-236)

   BEFORE:
   ```javascript
   payload: {
     listingId: listingId,
     hostAccountId: hostAccountId,
     hostUserId: userId,
     hostEmail: userEmail,
   },
   ```

   AFTER:
   ```javascript
   payload: {
     listingId: listingId,
     hostUserId: userId,
     hostEmail: userEmail,
   },
   ```

**Dependencies**: Edge Function must be updated FIRST to handle missing `hostAccountId`

**Verification**:
- Create a new listing through self-listing flow
- Verify mockup proposal is created
- Verify no errors in console about missing `hostAccountId`

---

### File 2: `supabase/functions/listing/handlers/createMockupProposal.ts`

**Full Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\handlers\createMockupProposal.ts`

**Current State**:
- Lines 27-32: Interface requires `hostAccountId`
- Lines 320-326: Destructures `hostAccountId` from payload
- Line 489: Uses `hostAccountId` for `Host - Account` field

**Required Changes**:

1. **Update payload interface** (lines 27-32)

   BEFORE:
   ```typescript
   export interface CreateMockupProposalPayload {
     listingId: string;
     hostAccountId: string;
     hostUserId: string;
     hostEmail: string;
   }
   ```

   AFTER:
   ```typescript
   export interface CreateMockupProposalPayload {
     listingId: string;
     hostUserId: string;
     hostEmail: string;
   }
   ```

2. **Update destructuring** (lines 320-326)

   BEFORE:
   ```typescript
   const { listingId, hostAccountId, hostUserId, hostEmail } = payload;

   console.log('[createMockupProposal] ========== START ==========');
   console.log('[createMockupProposal] Listing:', listingId);
   console.log('[createMockupProposal] Host Account:', hostAccountId);
   console.log('[createMockupProposal] Host User:', hostUserId);
   ```

   AFTER:
   ```typescript
   const { listingId, hostUserId, hostEmail } = payload;

   console.log('[createMockupProposal] ========== START ==========');
   console.log('[createMockupProposal] Listing:', listingId);
   console.log('[createMockupProposal] Host User:', hostUserId);
   ```

3. **Add logic to resolve host user ID from listing** (after Step 2, around line 395)

   Add new Step 2.5 after fetching listing data:
   ```typescript
   // ─────────────────────────────────────────────────────────────
   // Step 2.5: Resolve host user ID from listing
   // ─────────────────────────────────────────────────────────────
   console.log('[createMockupProposal] Step 2.5: Resolving host user ID...');

   // For new listings, Host / Landlord is user._id
   // For legacy listings, Host / Landlord is account_host._id
   // We need to determine which case we're dealing with

   let resolvedHostUserId = hostUserId; // Default to passed value
   const hostLandlordId = listingData['Host / Landlord'] as string | undefined;

   if (hostLandlordId) {
     // Check if this ID exists in user table (new listing pattern)
     const { data: userCheck } = await supabase
       .from('user')
       .select('_id')
       .eq('_id', hostLandlordId)
       .maybeSingle();

     if (userCheck) {
       // Host / Landlord is already a user._id
       resolvedHostUserId = hostLandlordId;
       console.log('[createMockupProposal] Host / Landlord is user._id:', resolvedHostUserId);
     } else {
       // Host / Landlord might be account_host._id (legacy)
       const { data: accountHost } = await supabase
         .from('account_host')
         .select('User')
         .eq('_id', hostLandlordId)
         .maybeSingle();

       if (accountHost?.User) {
         resolvedHostUserId = accountHost.User;
         console.log('[createMockupProposal] Resolved from account_host:', resolvedHostUserId);
       }
     }
   }
   ```

4. **Update proposal data to use resolved host user ID** (line 489)

   BEFORE:
   ```typescript
   'Host - Account': hostAccountId,
   ```

   AFTER:
   ```typescript
   'Host - Account': resolvedHostUserId,
   ```

5. **Update Step 9 reference** (line 577-607)

   The host user lookup now uses `resolvedHostUserId` instead of `hostUserId`:

   BEFORE:
   ```typescript
   const { data: hostUser, error: hostUserError } = await supabase
     .from('user')
     .select('_id, "Proposals List"')
     .eq('_id', hostUserId)
     .single();
   ```

   AFTER:
   ```typescript
   const { data: hostUser, error: hostUserError } = await supabase
     .from('user')
     .select('_id, "Proposals List"')
     .eq('_id', resolvedHostUserId)
     .single();
   ```

   And update the junction table call:

   BEFORE:
   ```typescript
   await addUserProposal(supabase, hostUserId, proposalId, 'host');
   ```

   AFTER:
   ```typescript
   await addUserProposal(supabase, resolvedHostUserId, proposalId, 'host');
   ```

**Dependencies**: None - this is the first file to update

**Verification**:
- Deploy Edge Function
- Test with both new listing (user._id in Host / Landlord) and legacy listing (account_host._id)
- Verify proposal created with correct Host - Account value

---

### File 3: `supabase/functions/listing/index.ts`

**Full Path**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\index.ts`

**Current State**:
- Lines 143-152: Type assertion includes `hostAccountId`

**Required Changes**:

1. **Update type assertion** (lines 146-151)

   BEFORE:
   ```typescript
   await handleCreateMockupProposal(supabase, body.payload as {
     listingId: string;
     hostAccountId: string;
     hostUserId: string;
     hostEmail: string;
   });
   ```

   AFTER:
   ```typescript
   await handleCreateMockupProposal(supabase, body.payload as {
     listingId: string;
     hostUserId: string;
     hostEmail: string;
   });
   ```

**Dependencies**: `createMockupProposal.ts` must be updated first

**Verification**: TypeScript compilation passes

---

## Execution Order

### Phase 1: Edge Function Updates (MUST deploy before frontend changes)

| Step | File | Change | Risk |
|------|------|--------|------|
| 1 | `createMockupProposal.ts` | Add backward-compatible handling for missing `hostAccountId` | Low |
| 2 | `createMockupProposal.ts` | Add host resolution logic | Low |
| 3 | `createMockupProposal.ts` | Update interface (make `hostAccountId` optional first) | Low |
| 4 | `index.ts` | Update type assertion | Low |
| 5 | **DEPLOY Edge Function** | Manual deployment required | Medium |

### Phase 2: Frontend Updates (after Edge Function is live)

| Step | File | Change | Risk |
|------|------|--------|------|
| 6 | `listingService.js` | Remove `Account - Host / Landlord` from query | Low |
| 7 | `listingService.js` | Remove `hostAccountId` from validation | Low |
| 8 | `listingService.js` | Remove `hostAccountId` from payload | Low |

### Phase 3: Cleanup (after verification)

| Step | File | Change | Risk |
|------|------|--------|------|
| 9 | `createMockupProposal.ts` | Remove `hostAccountId` from interface entirely | Low |
| 10 | **DEPLOY Edge Function** | Final cleanup deployment | Low |

### Safe Stopping Points
- After Step 5: Edge Function handles both old and new payload formats
- After Step 8: Frontend no longer sends `hostAccountId`
- After Step 10: Complete cleanup

---

## Risk Assessment

### Potential Breaking Changes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edge Function deployed before frontend | Low | Medium | Deploy Edge Function first with backward compatibility |
| Legacy listings have different Host / Landlord format | Confirmed | Low | Added resolution logic to handle both cases |
| Bubble sync may expect account_host._id | Medium | Low | Sync will send whatever is in proposal; Bubble may need adjustment |

### Edge Cases

1. **Listings with NULL Host / Landlord**: Use the `hostUserId` passed in payload as fallback
2. **Legacy listings where account_host doesn't exist**: Fall back to passed `hostUserId`
3. **Race condition during deployment**: Make `hostAccountId` optional in interface during transition

### Rollback Considerations

- If Edge Function fails: Revert to previous version via Supabase dashboard
- If frontend breaks: Revert `listingService.js` to include `hostAccountId` again
- Database changes: None required, no schema modifications

---

## Verification Checklist

### Pre-Deployment
- [ ] All TypeScript files compile without errors
- [ ] Edge Function interface is backward compatible (optional `hostAccountId`)

### Post-Deployment (Edge Function)
- [ ] Edge Function health check passes
- [ ] Test with payload INCLUDING `hostAccountId` (backward compat)
- [ ] Test with payload EXCLUDING `hostAccountId` (new format)

### Post-Deployment (Frontend)
- [ ] Create new listing through self-listing flow
- [ ] Verify mockup proposal is created
- [ ] Check proposal's `Host - Account` value is a `user._id`
- [ ] No console errors about missing fields

### Final Verification
- [ ] Test with legacy listing (if accessible in test environment)
- [ ] Verify Bubble sync queue has correct data
- [ ] Monitor Slack for any error reports

---

## Reference Appendix

### All File Paths

```
c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingService.js
c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\handlers\createMockupProposal.ts
c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\listing\index.ts
```

### Key Database Tables

| Table | Relevant Fields |
|-------|-----------------|
| `listing` | `_id`, `Host / Landlord`, `Created By` |
| `user` | `_id`, `email`, `Account - Host / Landlord`, `Proposals List` |
| `account_host` | `_id`, `User` |
| `proposal` | `_id`, `Host - Account`, `Guest`, `Listing` |

### Key Patterns

**New Listings (self-listing)**:
- `listing.Host / Landlord` = `user._id`
- `listing.Created By` = `user._id`

**Legacy Listings (Bubble-created)**:
- `listing.Host / Landlord` = `account_host._id`
- `account_host.User` = `user._id`

**Proposal Host - Account field**:
- Currently stores `account_host._id`
- After cleanup: Will store `user._id`

### Related Documentation

- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\Database\DATABASE_RELATIONS.md`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\CLAUDE.md`

---

## Reminder

After Edge Function changes are complete, **manual deployment is required**:

```bash
supabase functions deploy listing
```

---

**Plan Version**: 1.0
**Author**: Claude Code (Cleanup Planner)
**Ready for Execution**: Yes
