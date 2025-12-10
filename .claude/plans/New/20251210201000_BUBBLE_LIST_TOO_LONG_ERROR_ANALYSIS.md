# Bubble LIST_TOO_LONG Error Analysis

**GENERATED**: 2025-12-10
**ERROR**: `LIST_TOO_LONG - Invalid data for field Proposals List: array length exceeds the limit of 200 entries`
**AFFECTED**: bubble_sync Edge Function → processQueueDataApi.ts

---

## Problem Summary

When the `proposal` Edge Function creates a new proposal, it enqueues sync items to update the Guest and Host users' `Proposals List` field in Bubble. The current implementation sends the **entire array** of proposals as a PATCH update. When a user accumulates more than 200 proposals, Bubble's Data API rejects the update with `LIST_TOO_LONG` error.

### Error Stack Trace
```
[processQueueDataApi] Item 9a62862c-4d61-42a5-9a89-2b19b7bd7855 failed:
BubbleApiError: Bubble Data API error: 400 Bad Request -
{"statusCode":400,"body":{"status":"LIST_TOO_LONG","message":"Invalid data for field Proposals List: array length exceeds the limit of 200 entries."}}
    at executeRequest (file:///.../bubble_sync/lib/bubbleDataApi.ts:171:13)
    at updateRecord (file:///.../bubble_sync/lib/bubbleDataApi.ts:224:3)
    at processItemDataApi (file:///.../bubble_sync/handlers/processQueueDataApi.ts:139:13)
```

---

## Root Cause Analysis

### File: `supabase/functions/proposal/actions/create.ts` (Lines 436-461)

```typescript
// Item 2: UPDATE guest user in Bubble (processed second)
{
  sequence: 2,
  table: 'user',
  recordId: guestData._id,
  operation: 'UPDATE',
  bubbleId: guestData._id,
  payload: {
    'Proposals List': updatedGuestProposals,  // <-- ENTIRE ARRAY SENT
    'Favorited Listings': guestUpdates['Favorited Listings'] || currentFavorites,
    'flexibility (last known)': guestFlexibility,
    'Recent Days Selected': input.daysSelected,
  }
},

// Item 3: UPDATE host user in Bubble (processed third)
{
  sequence: 3,
  table: 'user',
  recordId: hostUserData._id,
  operation: 'UPDATE',
  bubbleId: hostUserData._id,
  payload: {
    'Proposals List': [...hostProposals, proposalId],  // <-- ENTIRE ARRAY SENT
  }
}
```

### The Problem

1. **`updatedGuestProposals`** = All existing proposals + new proposal ID
2. **`[...hostProposals, proposalId]`** = All existing proposals + new proposal ID
3. Bubble Data API PATCH replaces the entire field value
4. When array length > 200, Bubble rejects with `LIST_TOO_LONG`

---

## Bubble Data API List Modification

Bubble's Data API supports **partial list modifications** using special operators:

### List Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `_add` | Append items to list | `{"field": {"_add": ["item1", "item2"]}}` |
| `_remove` | Remove items from list | `{"field": {"_remove": ["item1"]}}` |

### Correct Pattern for Adding to List

```json
// PATCH /obj/user/{bubble_id}
{
  "Proposals List": {
    "_add": ["new_proposal_id"]
  }
}
```

This **appends** the new proposal ID without sending the entire list, thus avoiding the 200 limit.

---

## Affected Files

| File | Line(s) | Issue |
|------|---------|-------|
| `supabase/functions/proposal/actions/create.ts` | 436-461 | Sends entire Proposals List array |
| `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` | 132-168 | `buildUpdateRequest` doesn't handle list operators |
| `supabase/functions/bubble_sync/lib/transformer.ts` | 195-224 | `transformRecordForBubble` doesn't transform list operations |

---

## Proposed Solution

### Option A: Use Bubble's `_add` Operator (Recommended)

1. **Modify `enqueueBubbleSync` payload structure** in `create.ts`:
   - Instead of sending full array, send list operation instruction
   - Create a new field format: `{ "_listOp": "add", "values": ["proposal_id"] }`

2. **Modify `bubbleDataApi.ts` to detect and apply list operators**:
   - Check for `_listOp` in field values
   - Transform to Bubble's `{_add: [...]}` format

3. **Update `processQueueDataApi.ts`** to handle list operation payloads

### Implementation Example

**In `create.ts`:**
```typescript
{
  sequence: 2,
  table: 'user',
  recordId: guestData._id,
  operation: 'UPDATE',
  bubbleId: guestData._id,
  payload: {
    // Use special marker for list append operations
    'Proposals List': { _listOp: 'add', values: [proposalId] },
    'Favorited Listings': currentFavorites.includes(input.listingId)
      ? undefined
      : { _listOp: 'add', values: [input.listingId] },
    'flexibility (last known)': guestFlexibility,
    'Recent Days Selected': input.daysSelected,
  }
}
```

**In `bubbleDataApi.ts` - Add list operation handling:**
```typescript
function transformListOperations(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && '_listOp' in value) {
      const op = value as { _listOp: 'add' | 'remove'; values: unknown[] };
      if (op._listOp === 'add') {
        result[key] = { _add: op.values };
      } else if (op._listOp === 'remove') {
        result[key] = { _remove: op.values };
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

---

## Alternative Solutions

### Option B: Skip List Update if Count > 200

**Pros:** Quick fix, minimal code changes
**Cons:** Loses FK relationship in Bubble for high-volume users

```typescript
// In create.ts, check before adding to queue
if (existingProposals.length < 200) {
  // Add to queue
}
```

### Option C: Contact Bubble Support

**Pros:** No code changes
**Cons:** Manual process, may have cost implications, doesn't solve root issue

### Option D: Don't Sync Proposals List to Bubble

**Pros:** Eliminates the problem entirely
**Cons:** Bubble UI won't show user's proposals, breaks Bubble workflows that depend on this field

---

## Recommendation

**Implement Option A** - Use Bubble's native `_add` operator for list modifications.

This is the correct architectural solution that:
1. Follows Bubble's Data API best practices
2. Eliminates the 200-entry limit issue entirely
3. Reduces payload size (only sending new item, not entire list)
4. Is more efficient for network and database operations
5. Works regardless of list size

---

## Implementation Priority

**HIGH** - This is blocking production proposal creation for users with 200+ proposals.

---

## Files to Modify

1. `supabase/functions/proposal/actions/create.ts` - Change payload format
2. `supabase/functions/bubble_sync/lib/bubbleDataApi.ts` - Add list operation transformation
3. `supabase/functions/bubble_sync/lib/transformer.ts` - Handle list operations in transformation

---

## Testing Checklist

- [ ] Create proposal for user with < 200 proposals (should work)
- [ ] Create proposal for user with > 200 proposals (should work after fix)
- [ ] Verify proposal appears in guest's Proposals List in Bubble
- [ ] Verify proposal appears in host's Proposals List in Bubble
- [ ] Verify existing proposals aren't duplicated or lost
- [ ] Test `_add` operation with empty initial list

---

**DOCUMENT_VERSION**: 1.0
**STATUS**: Ready for Implementation
