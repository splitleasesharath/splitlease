# Implementation Plan: Auto-Prefill Proposal Form from Guest's Previous Proposals

## Overview

Implement auto-prefill functionality for the CreateSuggestedProposalPage that automatically populates form fields (reservation span, selected days, and move-in date) when a guest with existing proposals is selected. When multiple proposals exist, the most recent one (by `Created Date`) is used as the source.

## Success Criteria

- [ ] `getUserProposalsForListing()` fetches required prefill fields along with count
- [ ] Most recent proposal is automatically identified when multiple exist
- [ ] Form fields populate automatically when guest with previous proposal(s) is selected
- [ ] User can still modify all prefilled values
- [ ] No changes to new guest flow (no proposals = no prefill)
- [ ] Day indexing remains 0-based throughout (no conversion needed)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/CreateSuggestedProposalPage/suggestedProposalService.js` | API service layer | Expand `getUserProposalsForListing()` to fetch prefill fields |
| `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js` | Business logic hook | Add prefill logic in `handleGuestSelect`, add helper to determine reservation span option |
| `app/src/islands/pages/CreateSuggestedProposalPage/components/ProposalConfig.jsx` | Form UI | No changes (already accepts values as props) |

### Related Documentation

- `supabase/functions/proposal/lib/types.ts` - ProposalData interface confirms field names
- `app/src/islands/pages/CreateSuggestedProposalPage/CreateSuggestedProposalPage.jsx` - Page component (hollow, no changes needed)

### Existing Patterns to Follow

1. **Service Layer Pattern**: `suggestedProposalService.js` uses async functions returning `{ data, error }` objects
2. **Hollow Component Pattern**: Logic hook handles all state and side effects
3. **Day Indexing**: Uses 0-based (0=Sunday through 6=Saturday) - matches database storage
4. **Reservation Span Mapping**: Standard values are [6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26, 52], non-standard uses "custom"

### Database Field Reference (from proposal table)

| Database Field | Type | Maps To |
|----------------|------|---------|
| `"Days Selected"` | number[] | `selectedDays` state |
| `"Reservation Span (Weeks)"` | number | `reservationSpan` / `customWeeks` state |
| `"Move in range start"` | ISO date string | `moveInDate` state |
| `"Created Date"` | ISO date string | Used for sorting (most recent) |

## Implementation Steps

### Step 1: Expand `getUserProposalsForListing()` in Service Layer

**Files:** `app/src/islands/pages/CreateSuggestedProposalPage/suggestedProposalService.js`

**Purpose:** Fetch all fields needed for prefill along with existing count check

**Details:**

1. Update the Supabase select query to include:
   - `_id`
   - `Status`
   - `"Days Selected"` (number array)
   - `"Reservation Span (Weeks)"` (number)
   - `"Move in range start"` (ISO date string)
   - `"Created Date"` (ISO date string for sorting)

2. Add order by `"Created Date"` descending to get most recent first

**Code Change:**

```javascript
// In suggestedProposalService.js, update getUserProposalsForListing

/**
 * Get existing proposals for a user on a specific listing
 * Returns proposals with prefill fields, ordered by most recent first
 */
export async function getUserProposalsForListing(userId, listingId) {
  try {
    const { data, error } = await supabase
      .from('proposal')
      .select(`
        _id,
        Status,
        "Days Selected",
        "Reservation Span (Weeks)",
        "Move in range start",
        "Created Date"
      `)
      .eq('Guest', userId)
      .eq('Listing', listingId)
      .neq('Deleted', true)
      .order('"Created Date"', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('[suggestedProposalService] getUserProposalsForListing error:', error);
    return { data: [], error: error.message };
  }
}
```

**Validation:**
- Call `getUserProposalsForListing` with a known guest/listing pair that has proposals
- Verify response includes all new fields
- Verify ordering (most recent first)

---

### Step 2: Add Reservation Span Mapping Helper

**Files:** `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`

**Purpose:** Convert numeric weeks to the correct reservationSpan dropdown value

**Details:**

1. Add a helper function that maps a numeric weeks value to either:
   - The string version of a standard week option (e.g., 12 -> "12")
   - "custom" if the value is not in the standard options list

2. The standard reservation span weeks are: [6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26, 52]

**Code Change:**

```javascript
// Add after existing constants section in useCreateSuggestedProposalLogic.js

// Standard reservation span weeks that map directly to dropdown options
const STANDARD_RESERVATION_SPANS = [6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26, 52];

/**
 * Map numeric weeks to reservation span dropdown value
 * @param {number} weeks - Number of weeks from proposal
 * @returns {{ reservationSpan: string, customWeeks: number|null }}
 */
function mapWeeksToReservationSpan(weeks) {
  if (!weeks || weeks <= 0) {
    return { reservationSpan: '', customWeeks: null };
  }

  if (STANDARD_RESERVATION_SPANS.includes(weeks)) {
    return { reservationSpan: String(weeks), customWeeks: null };
  }

  // Non-standard value: use custom option
  return { reservationSpan: 'custom', customWeeks: weeks };
}
```

**Validation:** Unit test the helper with various inputs:
- Standard value (12) -> `{ reservationSpan: "12", customWeeks: null }`
- Non-standard value (15) -> `{ reservationSpan: "custom", customWeeks: 15 }`
- Zero/null -> `{ reservationSpan: "", customWeeks: null }`

---

### Step 3: Add Prefill Logic to `handleGuestSelect`

**Files:** `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`

**Purpose:** Automatically populate form fields when a guest with previous proposals is selected

**Details:**

1. In `handleGuestSelect`, after fetching proposals, check if any proposals exist
2. If proposals exist, the first one (already sorted by most recent) has prefill data
3. Extract and apply:
   - `"Days Selected"` -> `setSelectedDays()`
   - `"Reservation Span (Weeks)"` -> use helper to get `reservationSpan` and `customWeeks`
   - `"Move in range start"` -> extract date portion for `setMoveInDate()`
4. Only apply prefill if the field has a value (don't overwrite defaults with null/undefined)
5. Ensure move-in date is not in the past (use tomorrow if past date)

**Code Change:**

```javascript
// Update handleGuestSelect in useCreateSuggestedProposalLogic.js

const handleGuestSelect = useCallback(async (guest) => {
  setSelectedGuest(guest);
  setGuestSearchTerm('');
  setGuestSearchResults([]);
  setIsGuestConfirmed(false);

  // Check for existing proposals
  if (selectedListing) {
    const { data: proposals } = await getUserProposalsForListing(guest._id, selectedListing._id);
    setExistingProposalsCount(proposals?.length || 0);

    // Prefill from most recent proposal if exists
    if (proposals && proposals.length > 0) {
      const mostRecentProposal = proposals[0]; // Already sorted by Created Date desc

      // Prefill days selected (0-indexed, no conversion needed)
      const daysSelected = mostRecentProposal['Days Selected'];
      if (Array.isArray(daysSelected) && daysSelected.length > 0) {
        setSelectedDays(daysSelected);
      }

      // Prefill reservation span
      const weeksValue = mostRecentProposal['Reservation Span (Weeks)'];
      if (weeksValue && weeksValue > 0) {
        const { reservationSpan: spanValue, customWeeks: customValue } = mapWeeksToReservationSpan(weeksValue);
        setReservationSpan(spanValue);
        if (customValue !== null) {
          setCustomWeeks(customValue);
        }
      }

      // Prefill move-in date (ensure not in the past)
      const moveInStart = mostRecentProposal['Move in range start'];
      if (moveInStart) {
        const proposalDate = new Date(moveInStart);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Use proposal date if in future, otherwise use tomorrow
        if (proposalDate >= tomorrow) {
          setMoveInDate(proposalDate.toISOString().split('T')[0]);
        }
        // If past date, leave default (tomorrow) in place
      }
    }
  }

  // Pre-fill guest profile fields if available (existing logic)
  if (guest['About Me / Bio']) {
    setAboutMe(guest['About Me / Bio']);
  }
  if (guest['need for Space']) {
    setNeedForSpace(guest['need for Space']);
  }
  if (guest['special needs']) {
    setSpecialNeeds(guest['special needs']);
  }
}, [selectedListing]);
```

**Validation:**
1. Select a listing, then select a guest with no proposals - fields should remain at defaults
2. Select a listing, then select a guest with one proposal - fields should prefill
3. Select a listing, then select a guest with multiple proposals - most recent proposal should be used
4. Verify all prefilled values can be modified by user
5. Test edge cases:
   - Proposal with null/empty `Days Selected` - should not crash, no days selected
   - Proposal with past move-in date - should use tomorrow instead
   - Proposal with non-standard week value (e.g., 15) - should show "custom" with value 15

---

### Step 4: Add STANDARD_RESERVATION_SPANS Export (Optional Enhancement)

**Files:** `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`

**Purpose:** Ensure consistency between ProposalConfig.jsx and the logic hook

**Details:**

The `RESERVATION_SPAN_WEEKS` constant in `ProposalConfig.jsx` matches our new `STANDARD_RESERVATION_SPANS`. To ensure they stay in sync, consider:

Option A (Recommended): Keep them separate but document the relationship
Option B: Move to a shared constants file

For this implementation, we'll use Option A as it's simpler and the two arrays serve different purposes (one for dropdown options, one for mapping logic).

**No code change needed** - the values already match.

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Guest has no proposals | No prefill, existing new guest flow unchanged |
| Proposal has null `Days Selected` | Skip prefill for this field, leave at default `[]` |
| Proposal has null `Reservation Span (Weeks)` | Skip prefill for this field, leave at default `''` |
| Proposal move-in date is in the past | Use tomorrow's date instead |
| `getUserProposalsForListing` returns error | Log error, treat as 0 proposals (graceful degradation) |
| Guest changes selection after prefill | User can freely modify all fields - no locking |
| Proposal has non-standard weeks value | Map to "custom" option with customWeeks populated |

## Testing Considerations

### Manual Test Scenarios

1. **New Guest Flow (No Proposals)**
   - Select listing
   - Select guest with no existing proposals for that listing
   - Verify: Form fields at defaults, no prefill occurs

2. **Single Proposal Prefill**
   - Select listing
   - Select guest with exactly 1 proposal for that listing
   - Verify: Days, reservation span, and move-in date populate from that proposal

3. **Multiple Proposals (Most Recent)**
   - Select listing
   - Select guest with 3+ proposals for that listing
   - Verify: Form prefills from the most recent proposal (check `Created Date`)

4. **Standard Week Values**
   - Test with proposals having weeks: 6, 12, 26, 52
   - Verify: Dropdown shows correct standard option

5. **Custom Week Values**
   - Test with proposal having weeks: 11, 15, 25
   - Verify: Dropdown shows "Other (specify weeks)" with correct value

6. **Past Date Handling**
   - Find/create proposal with move-in date in the past
   - Verify: Tomorrow's date is used instead

7. **Modify After Prefill**
   - Allow form to prefill
   - Change all fields manually
   - Verify: All fields accept user changes

## Rollback Strategy

Changes are isolated to two files. To rollback:

1. Revert `suggestedProposalService.js` to original `getUserProposalsForListing()` query
2. Remove `STANDARD_RESERVATION_SPANS` constant and `mapWeeksToReservationSpan()` helper from hook
3. Revert `handleGuestSelect` to original version (remove prefill logic block)

No database changes, no edge function changes, no schema changes required.

## Dependencies & Blockers

- None. All required data fields already exist in the `proposal` table.
- No new dependencies needed.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Query performance with large proposal history | Low | Low | Query already filtered by guest+listing, only fetches needed fields |
| Data type mismatch in `Days Selected` | Low | Low | Defensive check `Array.isArray()` before using |
| Move-in date timezone issues | Medium | Low | Using `.toISOString().split('T')[0]` extracts date portion cleanly |
| User confusion about prefilled values | Low | Low | Values are clearly editable, validation already in place |

---

## Summary of File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `app/src/islands/pages/CreateSuggestedProposalPage/suggestedProposalService.js` | Modify | Expand `getUserProposalsForListing()` select fields, add order by |
| `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js` | Modify | Add `STANDARD_RESERVATION_SPANS`, `mapWeeksToReservationSpan()`, update `handleGuestSelect` |

---

## File References (Absolute Paths)

- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CreateSuggestedProposalPage\suggestedProposalService.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CreateSuggestedProposalPage\useCreateSuggestedProposalLogic.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CreateSuggestedProposalPage\components\ProposalConfig.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\CreateSuggestedProposalPage\CreateSuggestedProposalPage.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\proposal\lib\types.ts`
