# Blocked Dates Bug Fix Plan

**Created**: 2026-01-06 14:30:00
**Listing ID**: 1766342812136x26268629342051432
**Priority**: HIGH

## Problem Summary

User selected blocked dates on the self-listing page, but:
1. Dashboard showed "Invalid Date" initially
2. Dashboard now shows nothing (no blocked dates)

## Root Cause Analysis

### Bug #1: Save Path Missing (CRITICAL)

**Location**: `supabase/functions/listing/handlers/submit.ts`

The `mapFieldsToSupabase` function is missing the mapping for blocked dates:
- Frontend sends: `'Blocked Dates': ['2025-12-24', '2025-12-25', ...]`
- Database column: `'Dates - Blocked'`
- **Current mapping**: NONE - data is silently dropped!

**Evidence**: The field is defined in the interface (line 83) but not in the mapping function (lines 120-238).

### Bug #2: Display Format Mismatch

**Location**: `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

Even when data exists in the database:
- Database format: `["2025-12-24T06:00:00.000Z", ...]` (ISO timestamps)
- Component expects: `["2025-12-24", ...]` (YYYY-MM-DD strings)
- Comparison in `isDateBlocked` (line 146) always fails due to format mismatch

## Database State (Actual)

The listing `1766342812136x26268629342051432` has this in `"Dates - Blocked"`:
```json
[
  "2025-12-24T06:00:00.000Z",
  "2025-12-25T06:00:00.000Z",
  "2025-12-26T06:00:00.000Z",
  "2025-12-27T06:00:00.000Z",
  "2025-12-28T06:00:00.000Z",
  "2025-12-29T06:00:00.000Z",
  "2025-12-30T06:00:00.000Z",
  "2025-12-31T06:00:00.000Z"
]
```

Note: These dates were likely saved through Bubble sync, not the self-listing page.

## Fix Plan

### Fix 1: Add Missing Mapping in Edge Function

**File**: `supabase/functions/listing/handlers/submit.ts`

Add to `mapFieldsToSupabase` function (around line 236):

```typescript
if (data['Blocked Dates'] !== undefined) {
  mapped['Dates - Blocked'] = data['Blocked Dates'];
}
```

### Fix 2: Normalize Date Format in Dashboard Logic

**File**: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`

In `transformListingData` function, normalize the blocked dates to YYYY-MM-DD format:

```javascript
// Line 328 - Update safeParseJsonArray call
blockedDates: safeParseJsonArray(dbListing['Dates - Blocked']).map(dateStr => {
  // Handle both ISO timestamps and YYYY-MM-DD formats
  if (typeof dateStr === 'string') {
    // Extract YYYY-MM-DD from ISO timestamp or return as-is if already YYYY-MM-DD
    return dateStr.split('T')[0];
  }
  return dateStr;
}),
```

### Fix 3: Ensure Dashboard Saves in Correct Format

**File**: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`

The `handleBlockedDatesChange` function (line 1436) already saves YYYY-MM-DD format correctly, but verify it doesn't JSON.stringify unnecessarily.

## Testing Checklist

- [ ] Self-listing page: Select blocked dates and submit
- [ ] Verify dates appear in `Dates - Blocked` column in Supabase
- [ ] Listing Dashboard: Blocked dates display correctly
- [ ] Listing Dashboard: Calendar shows blocked dates in red
- [ ] Listing Dashboard: Add/remove blocked dates works
- [ ] View listing page: Blocked dates prevent selection

## Files to Modify

1. `supabase/functions/listing/handlers/submit.ts` - Add mapping
2. `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` - Normalize format

## References

- Self-listing submission: `app/src/islands/pages/SelfListingPage/store/prepareListingSubmission.ts:134-141`
- Dashboard transform: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js:328`
- Availability calendar: `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx:143-147`
