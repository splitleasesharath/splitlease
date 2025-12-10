# Bubble Sync "Days" Field Discrepancy Analysis

**Created**: 2025-12-10
**Status**: Analysis Complete - Fix Required
**Error**: `Invalid data for field check in day: could not parse this as a Days`

---

## Executive Summary

The `bubble_sync` Edge Function is failing because **Option Set fields** (like "check in day" and "check out day") are being sent to Bubble as **numeric values** when Bubble's Data API expects **string display values**.

---

## Root Cause Analysis

### The Data Flow

```
Frontend → proposal Edge Function → Supabase → bubble_sync → Bubble Data API
              ↓                        ↓              ↓
         checkIn: 2              "check in day": 2    REJECTS: expects "Monday"
```

### Evidence

| Layer | Field | Value Stored/Sent | Expected by Bubble |
|-------|-------|-------------------|-------------------|
| Frontend Input | `checkIn` | `2` (number, Bubble format) | N/A |
| Supabase Column | `check in day` | `2` (number) | N/A |
| Bubble Data API | `check in day` | `2` (number) | `"Monday"` (string) |

### Key Files Involved

| File | Line | Issue |
|------|------|-------|
| `supabase/functions/proposal/actions/create.ts` | 271-272 | Stores raw numbers |
| `supabase/functions/proposal/lib/types.ts` | 149-150 | Types as `number` |
| `supabase/functions/bubble_sync/lib/transformer.ts` | 64-68 | Missing from OPTION_SET conversion |

---

## Detailed Comparison: Pull vs Push

### bubble_to_supabase_sync.py (PULL - Bubble → Supabase)

When pulling data FROM Bubble, the script stores whatever Bubble returns. Looking at the Python code:

```python
# Lines 441-450: JSONB_FIELDS set
JSONB_FIELDS = {
    'AI Suggestions List', 'Clickers', 'Dates - Blocked',
    'Days Available (List of Days)', 'Days Not Available', ...
}
```

**Key observation**: The pull script does NOT have special handling for Option Set fields like "check in day". It stores whatever Bubble returns (likely the display string).

### bubble_sync Edge Function (PUSH - Supabase → Bubble)

The `transformer.ts` handles these field type categories:
- `INTEGER_FIELDS`
- `NUMERIC_FIELDS`
- `BOOLEAN_FIELDS`
- `JSONB_FIELDS`
- `TIMESTAMP_FIELDS`
- `DAY_INDEX_FIELDS` (only for arrays like "Days Available")

**MISSING**: No `OPTION_SET_FIELDS` category for single-value option set fields.

---

## The Discrepancy

### Fields That Need Option Set Conversion (proposal table)

| Supabase Field | Current Storage | Bubble Expects |
|----------------|-----------------|----------------|
| `check in day` | `2` (number) | `"Monday"` (string) |
| `check out day` | `3` (number) | `"Tuesday"` (string) |
| `hc check in day` | `2` (number) | `"Monday"` (string) |
| `hc check out day` | `3` (number) | `"Tuesday"` (string) |

### Reference Table: os_days

| bubble_number | display |
|---------------|---------|
| 1 | Sunday |
| 2 | Monday |
| 3 | Tuesday |
| 4 | Wednesday |
| 5 | Thursday |
| 6 | Friday |
| 7 | Saturday |

---

## Recommended Fix

### Option A: Transform in bubble_sync (Recommended)

Add Option Set field handling to `transformer.ts`:

```typescript
// Add to transformer.ts

/**
 * Fields that are Bubble Option Sets requiring display value conversion
 * Maps: Bubble day number (1-7) → Bubble day display name
 */
export const OPTION_SET_DAY_FIELDS = new Set([
    'check in day',
    'check out day',
    'hc check in day',
    'hc check out day',
]);

const BUBBLE_DAY_NAMES = [
    'Sunday',   // 1
    'Monday',   // 2
    'Tuesday',  // 3
    'Wednesday',// 4
    'Thursday', // 5
    'Friday',   // 6
    'Saturday', // 7
];

/**
 * Convert Bubble day number (1-7) to display name for Option Set fields
 */
export function convertDayNumberToDisplayName(dayNumber: number): string {
    if (dayNumber >= 1 && dayNumber <= 7) {
        return BUBBLE_DAY_NAMES[dayNumber - 1];
    }
    return String(dayNumber); // Fallback
}
```

Then in `transformFieldForBubble()`:

```typescript
// Handle Option Set day fields - convert number to display name
if (OPTION_SET_DAY_FIELDS.has(key)) {
    if (typeof value === 'number') {
        return { key: bubbleKey, value: convertDayNumberToDisplayName(value) };
    }
    // Already a string, pass through
    return { key: bubbleKey, value: value };
}
```

### Option B: Store Display Values in Supabase

Change the proposal Edge Function to store display values instead of numbers:

```typescript
// In create.ts, change:
"check in day": input.checkIn,  // Currently stores number

// To:
"check in day": getDayNameFromBubbleIndex(input.checkIn),  // Store "Monday"
```

**Pros**: Cleaner data model, no transformation needed during sync
**Cons**: Requires migration of existing data, breaks any code expecting numbers

---

## Impact Assessment

### Current State
- **Proposals cannot sync to Bubble** - All INSERT operations fail
- Error rate: 100% for proposal table syncs

### After Fix
- Proposal syncs will succeed
- No data loss (queue items can be retried)

---

## Files Requiring Changes

| File | Change |
|------|--------|
| `supabase/functions/bubble_sync/lib/transformer.ts` | Add OPTION_SET_DAY_FIELDS handling |
| `supabase/functions/bubble_sync/lib/fieldMapping.ts` | (Optional) Document option set fields |

---

## Testing Plan

1. **Unit Test**: Verify `convertDayNumberToDisplayName(2)` returns `"Monday"`
2. **Integration Test**: Create a test proposal and verify sync succeeds
3. **Retry Test**: Retry the failed queue item `1afaeb41-f98c-40eb-99ec-e32d6fdcc875`

---

## Related Documentation

- [PROPOSAL_TO_BUBBLE_SYNC_PLAN.md](./../Done/PROPOSAL_TO_BUBBLE_SYNC_PLAN.md)
- [BUBBLE_SYNC_SERVICE.md](./../../Documentation/EDGE-Functions/BUBBLE_SYNC_SERVICE.md)
- [Day Index Convention](./../../CLAUDE.md) - JavaScript 0-6 vs Bubble 1-7

---

## Appendix: Error Stack Trace

```
[processQueueDataApi] Item 1afaeb41-f98c-40eb-99ec-e32d6fdcc875 failed: BubbleApiError:
Bubble Data API error: 400 Bad Request -
{"statusCode":400,"body":{"status":"INVALID_DATA","message":"Invalid data for field check in day: could not parse this as a Days"}}
    at executeRequest (bubbleDataApi.ts:171:13)
    at createRecord (bubbleDataApi.ts:207:20)
    at processItemDataApi (processQueueDataApi.ts:103:31)
```
