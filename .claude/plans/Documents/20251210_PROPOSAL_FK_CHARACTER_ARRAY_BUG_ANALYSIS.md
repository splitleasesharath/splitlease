# Proposal Edge Function - Foreign Key Character Array Bug Analysis

**Date**: 2025-12-10
**Status**: Analysis Complete - Bug Confirmed
**Severity**: Critical - Data Corruption

---

## Executive Summary

The `proposal` edge function's `create.ts` action contains a **critical bug** that corrupts the "Proposals List" foreign key field in the `user` table. When JSONB array fields are returned as stringified JSON (a known Supabase behavior), the spread operator `[...]` spreads the string into individual characters instead of array elements.

### Observed Data Corruption

**Expected Format:**
```json
["1751052696902x678531434391673800", "1751052988202x352910742709570800"]
```

**Actual Corrupted Format:**
```json
["[", "\"", "1", "7", "5", "1", "0", "5", "2", "6", "9", "6", "9", "0", "2", "x", "6", "7", "8", "5", "3", "1", "4", "3", "4", "3", "9", "1", "6", "7", "3", "8", "0", "0", "\"", ",", " ", "\"", "1", "7", "5", "1", "0", "5", "2", "9", "8", "8", "2", "0", "2", ...]
```

---

## Root Cause Analysis

### The Bug Location

**File**: `supabase/functions/proposal/actions/create.ts`

**Lines 171, 339, 343-345, 377, 382:**

```typescript
// Line 171 - Fetching existing proposals
const existingProposals = guestData["Proposals List"] || [];

// Line 339 - CRITICAL BUG: Spreading potentially stringified JSON
const updatedGuestProposals = [...existingProposals, proposalId];
guestUpdates["Proposals List"] = updatedGuestProposals;

// Line 343-345 - SAME BUG: Favorited Listings
const currentFavorites = guestData["Favorited Listings"] || [];
if (!currentFavorites.includes(input.listingId)) {
  guestUpdates["Favorited Listings"] = [...currentFavorites, input.listingId];
}

// Line 377, 382 - SAME BUG: Host proposals
const hostProposals = hostUserData["Proposals List"] || [];
// ...
"Proposals List": [...hostProposals, proposalId],
```

### Why This Happens

1. **Database Schema**: The `"Proposals List"` column is stored as `JSONB` in PostgreSQL
2. **Supabase Behavior**: JSONB fields can be returned as either:
   - Native JavaScript arrays: `["id1", "id2"]`
   - Stringified JSON strings: `'["id1", "id2"]'`
3. **JavaScript Spread Operator**: When you spread a string with `[...str]`, each character becomes an array element
4. **Missing Parser**: The frontend has `parseJsonArray()` utility (`app/src/lib/supabaseUtils.js:25`) but the **Edge Function does not use any JSON parsing**

### Reproduction Example

```javascript
// When JSONB returns as string:
const existingProposals = '["1751052696902x678531434391673800"]';

// Bug: Spreading a string
const result = [...existingProposals, "newId"];
// Result: ["[", "\"", "1", "7", "5", "1", ..., "newId"]

// Correct: Parse first, then spread
const parsed = JSON.parse(existingProposals);
const result = [...parsed, "newId"];
// Result: ["1751052696902x678531434391673800", "newId"]
```

---

## Affected Code Paths

### 1. Guest User Updates (CRITICAL)

| Field | Line | Status |
|-------|------|--------|
| `"Proposals List"` | 339-340 | **AFFECTED** |
| `"Favorited Listings"` | 343-345 | **AFFECTED** |
| `"Tasks Completed"` | 349 | Potentially affected (read-only in this context) |

### 2. Host User Updates (CRITICAL)

| Field | Line | Status |
|-------|------|--------|
| `"Proposals List"` | 377, 382 | **AFFECTED** |

---

## Evidence from Database

MCP Supabase query confirmed:
- Column type: `jsonb`
- Expected data format: `["1743793292650x494870697661962160", "1743203944289x556493214169890200"]`
- Corrupted data matches the character-array pattern when viewed in database

---

## Frontend Safeguard (Exists but Unused in Edge Function)

The frontend has proper handling in `app/src/lib/supabaseUtils.js`:

```javascript
export function parseJsonArray(value) {
  // Already a native array? Return as-is
  if (Array.isArray(value)) {
    return value;
  }

  // Stringified JSON? Try to parse
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse JSON array:', { value, error: error.message });
      return [];
    }
  }

  return [];
}
```

**This utility is NOT available in the Edge Function context and needs to be replicated there.**

---

## Fix Required

### Option A: Add JSONB Parser to Edge Function (Recommended)

Create a utility in `supabase/functions/_shared/jsonUtils.ts`:

```typescript
/**
 * Parse a value that may be a native array or stringified JSON array
 *
 * Supabase JSONB fields can be returned as either:
 * - Native JavaScript arrays: ["Monday", "Tuesday"]
 * - Stringified JSON arrays: '["Monday", "Tuesday"]'
 */
export function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn('[parseJsonArray] Failed to parse:', value);
      return [];
    }
  }

  return [];
}
```

Then use in `create.ts`:

```typescript
import { parseJsonArray } from '../../_shared/jsonUtils.ts';

// Line 171
const existingProposals = parseJsonArray(guestData["Proposals List"]);

// Line 343
const currentFavorites = parseJsonArray(guestData["Favorited Listings"]);

// Line 377
const hostProposals = parseJsonArray(hostUserData["Proposals List"]);
```

### Option B: Type-Safe Casting with Runtime Check

```typescript
function ensureArray(value: unknown, fieldName: string): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to error
    }
  }
  throw new Error(`${fieldName} is not a valid array: ${typeof value}`);
}
```

---

## Data Recovery

Affected user records need to be identified and fixed:

```sql
-- Find users with corrupted Proposals List (character array indicators)
SELECT _id, email, "Proposals List"
FROM "user"
WHERE "Proposals List"::text LIKE '%"["%'
   OR jsonb_array_length("Proposals List") > 100; -- Character arrays will be much larger

-- Manual fix required - reconstruct from proposal table
-- For each affected user, query proposals where Guest = user._id
-- Then update the user's Proposals List with the correct array
```

---

## Impact Assessment

### Data Already Corrupted
- Users who created proposals via the Edge Function may have corrupted `Proposals List`
- This affects: proposal order ranking calculation, proposals dashboard display, proposal count

### Cascade Effects
- `calculateOrderRanking(existingProposals.length)` returns incorrect values
- Frontend proposal lists may fail to render
- Data sync to Bubble may propagate corrupted data

---

## Files Referenced in This Analysis

| File | Purpose |
|------|---------|
| `supabase/functions/proposal/actions/create.ts` | Bug location - lines 171, 339-345, 377, 382 |
| `supabase/functions/proposal/lib/types.ts` | Type definitions showing expected `string[]` |
| `app/src/lib/supabaseUtils.js` | Frontend's `parseJsonArray` implementation |
| `app/src/logic/processors/listing/parseJsonArrayField.js` | Alternative frontend JSONB parser |

---

## Conclusion

**The Edge Function does NOT parse JSONB fields before spreading them.** This is the root cause of the proposal ID character array corruption.

**Immediate action required:**
1. Fix the Edge Function code
2. Identify and repair corrupted user records
3. Add defensive parsing for all JSONB array fields across all Edge Functions

---

**Analysis By**: Claude Code
**Investigation Context**: User-reported malformed foreign key data in user table
