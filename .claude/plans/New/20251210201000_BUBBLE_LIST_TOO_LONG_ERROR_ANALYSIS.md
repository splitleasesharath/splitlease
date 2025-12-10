# Bubble LIST_TOO_LONG Error Analysis

**GENERATED**: 2025-12-10
**ERROR**: `LIST_TOO_LONG - Invalid data for field Proposals List: array length exceeds the limit of 200 entries`
**AFFECTED**: bubble_sync Edge Function → processQueueDataApi.ts
**STATUS**: FIXED

---

## Problem Summary

When the `proposal` Edge Function creates a new proposal, it was incorrectly enqueuing sync items to UPDATE the Guest and Host users' `Proposals List` field in Bubble by sending the **entire array**. This violates the Bubble Data API principle:

**ONE API CALL = ONE TABLE ROW = ONE DATA TYPE**

When a user accumulated more than 200 proposals, Bubble's Data API rejected the update with `LIST_TOO_LONG` error.

### Error Stack Trace
```
[processQueueDataApi] Item 9a62862c-4d61-42a5-9a89-2b19b7bd7855 failed:
BubbleApiError: Bubble Data API error: 400 Bad Request -
{"statusCode":400,"body":{"status":"LIST_TOO_LONG","message":"Invalid data for field Proposals List: array length exceeds the limit of 200 entries."}}
```

---

## Root Cause Analysis

### File: `supabase/functions/proposal/actions/create.ts` (Lines 436-461) - BEFORE FIX

```typescript
// WRONG: Trying to UPDATE user records with Proposals List arrays
items: [
  // Item 1: CREATE proposal - CORRECT
  { sequence: 1, table: 'proposal', ... },

  // Item 2: UPDATE guest user - WRONG (sending entire Proposals List)
  {
    sequence: 2,
    table: 'user',
    payload: {
      'Proposals List': updatedGuestProposals,  // ← ENTIRE ARRAY
    }
  },

  // Item 3: UPDATE host user - WRONG (sending entire Proposals List)
  {
    sequence: 3,
    table: 'user',
    payload: {
      'Proposals List': [...hostProposals, proposalId],  // ← ENTIRE ARRAY
    }
  }
]
```

### The Fundamental Misunderstanding

The code was trying to **manually manage the `Proposals List` relationship** on user records. This is incorrect because:

1. **The proposal record already contains the FK relationships:**
   - `Guest: input.guestId` → Links proposal to guest user
   - `"Host - Account": listingData["Host / Landlord"]` → Links proposal to host account
   - `Listing: input.listingId` → Links proposal to listing

2. **Bubble Data API principle:** ONE call handles ONE record in ONE table
   - POST `/obj/proposal` creates ONE proposal
   - PATCH `/obj/user/{id}` updates ONE user
   - We should NOT be sending list fields with 200+ items

3. **Relationships are established by FK fields**, not by manually populating list fields

---

## The Fix

### File: `supabase/functions/proposal/actions/create.ts` - AFTER FIX

```typescript
// CORRECT: Only create the proposal - FK fields establish relationships
items: [
  {
    sequence: 1,
    table: 'proposal',
    recordId: proposalId,
    operation: 'INSERT',
    payload: proposalData,  // Contains Guest, Host - Account, Listing FKs
  },
]
// Items 2 and 3 REMOVED - no user updates needed for Bubble sync
```

### Why This Works

1. **The proposal record is self-contained** with all necessary FK relationships
2. **Bubble can query proposals by FK fields** - e.g., "Get all proposals where Guest = user_id"
3. **No list limits apply** because we're not sending list fields
4. **Supabase still maintains `Proposals List`** on user records for local queries (lines 361-392 in create.ts)

---

## Important Distinction

| Location | `Proposals List` Management | Reason |
|----------|----------------------------|--------|
| **Supabase** | Still updated on user records (lines 361-392) | Local queries, no 200 limit |
| **Bubble Sync** | NOT synced | FK fields on proposal are sufficient |

The Supabase user records still get their `Proposals List` updated - this is fine because PostgreSQL has no 200-item limit. We simply don't sync this field TO Bubble.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/proposal/actions/create.ts` | Removed Items 2 and 3 from enqueueBubbleSync - only sync proposal creation |

---

## Testing Checklist

- [ ] Create proposal for user with < 200 proposals (should work)
- [ ] Create proposal for user with > 200 proposals (should work now)
- [ ] Verify proposal is created in Bubble with correct FK fields
- [ ] Verify Supabase user records still have updated Proposals List
- [ ] Verify no `LIST_TOO_LONG` errors in bubble_sync logs

---

**DOCUMENT_VERSION**: 2.0
**STATUS**: FIXED
**FIX DATE**: 2025-12-10
