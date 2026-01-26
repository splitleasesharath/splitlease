# Fix Counteroffer HC Fields Population

## Problem Summary

When a host submits a counteroffer, several `hc_` (host counteroffer) fields are not being populated:
- `hc nightly price` → `null` (should contain either original or new price)
- `hc check out day` → `null` (sometimes not sent)
- `hc cleaning fee`, `hc damage deposit`, `hc total price`, `hc 4 week rent` → all `null`
- `counter offer happened` → `null` (should be `true` when counteroffer is submitted)

**Evidence from proposal `1768674109497x26858129648361608`:**
- Status: "Host Counteroffer Submitted / Awaiting Guest Review" ✓
- `hc days selected`: `[1, 2, 3, 4]` ✓
- `hc reservation span (weeks)`: `20` ✓
- `hc move in date`: `2026-02-02` ✓
- `counter offer happened`: `null` ✗ (should be `true`)
- `hc nightly price`: `null` ✗ (should have value)
- `hc check out day`: `null` ✗ (should have value)

---

## Root Cause Analysis

### Data Flow

```
HostEditingProposal.jsx                    useHostProposalsPageLogic.js                proposal/actions/update.ts
───────────────────────                    ─────────────────────────────                ────────────────────────────
onCounteroffer({                           handleCounteroffer(data) {                   handleUpdate(payload) {
  proposal,                                  // Only sends fields                         // Only updates if
  numberOfWeeks,                             // if !== undefined                          // field provided
  checkIn,                                   if (checkOut !== undefined)                  if (input.hc_nightly_price)
  checkOut,           ─────────────────►       payload.hc_check_out = ...   ──────────►     updates["hc nightly price"]
  nightsSelected,                            // Missing: nightlyPrice,                    // Never set if not provided
  daysSelected,                              // cleaningFee, totalPrice,
  moveInDate                                 // damageDeposit, 4WeekRent                 if (input.hc_check_out)
})                                         }                                               updates["hc check out day"]
                                                                                        }
```

### Issues Found

1. **HostEditingProposal.jsx** (line 399-409):
   - Sends: `numberOfWeeks`, `checkIn`, `checkOut`, `nightsSelected`, `daysSelected`, `moveInDate`
   - **Missing**: `nightlyPrice`, `cleaningFee`, `damageDeposit`, `totalPrice`, `fourWeekRent`

2. **useHostProposalsPageLogic.js** (line 857-892):
   - Only includes fields `if !== undefined`
   - **Does not populate HC fields with original values when unchanged**
   - `counter offer happened` flag is only set when `hc_nightly_price` is provided

3. **Business Logic Gap**:
   - When a counteroffer is submitted, ALL hc_ fields should be populated
   - If a value is unchanged, hc_ field should mirror the original value
   - This enables UI strikethrough comparison: `original !== hc_` shows change

---

## Solution Design

### Principle: "HC Fields Are a Complete Snapshot"

When a counteroffer is submitted, the `hc_` fields should represent the **complete counteroffer terms**, not just the changed fields. This means:

1. **Every HC field gets a value** - either the new value or the original value
2. **`counter offer happened` is always set to `true`** when status changes to counteroffer
3. **UI can compare** `original field` vs `hc_ field` to show strikethrough

### Implementation Approach

**Option A: Populate in Frontend** (useHostProposalsPageLogic.js)
- Frontend has access to the original proposal
- Frontend sends ALL HC fields with either new or original values

**Option B: Populate in Edge Function** (proposal/actions/update.ts)
- Edge Function fetches the original proposal
- When status changes to counteroffer, populate missing HC fields from original

**Recommended: Option A** - Simpler, keeps Edge Function thin, frontend already has context

---

## Implementation Plan

### Step 1: Update useHostProposalsPageLogic.js handleCounteroffer

Modify `handleCounteroffer` to always populate ALL hc_ fields:

```javascript
const handleCounteroffer = useCallback(async (counterofferData) => {
  const {
    proposal,  // Original proposal data
    numberOfWeeks,
    checkIn,
    checkOut,
    nightsSelected,
    daysSelected,
    moveInDate
  } = counterofferData;

  // Get original values from proposal for fields not being changed
  const originalNightlyPrice = proposal['proposal nightly price'] || proposal.nightly_rate;
  const originalWeeks = proposal['Reservation Span (Weeks)'] || proposal.duration_weeks;
  const originalCheckIn = proposal['check in day'] ?? proposal.check_in_day;
  const originalCheckOut = proposal['check out day'] ?? proposal.check_out_day;
  const originalNights = proposal['Nights Selected (Nights list)'] || proposal.nights_selected || [];
  const originalDays = proposal['Days Selected'] || proposal.days_selected || [];
  const originalMoveIn = proposal['Move in range start'] || proposal.move_in_range_start;
  const originalCleaningFee = proposal['cleaning fee'] || proposal.cleaning_fee || 0;
  const originalDamageDeposit = proposal['damage deposit'] || proposal.damage_deposit || 0;
  const originalTotalPrice = proposal['Total Price for Reservation (guest)'] || proposal.total_price || 0;
  const originalFourWeekRent = proposal['4 week rent'] || proposal.four_week_rent || 0;

  // Build payload with ALL hc_ fields (new value or original)
  const payload = {
    proposal_id: selectedProposal._id || selectedProposal.id,
    status: 'Host Counteroffer Submitted / Awaiting Guest Review',

    // Always include all HC fields
    hc_reservation_span_weeks: numberOfWeeks ?? originalWeeks,
    hc_check_in: convertCheckInToIndex(checkIn ?? originalCheckIn),
    hc_check_out: convertCheckOutToIndex(checkOut ?? originalCheckOut),
    hc_nights_selected: convertNightsToIndices(nightsSelected) ?? originalNights,
    hc_days_selected: convertDaysToIndices(daysSelected) ?? originalDays,
    hc_move_in_date: formatMoveInDate(moveInDate ?? originalMoveIn),
    hc_nightly_price: originalNightlyPrice, // Always include (may add editing later)
    hc_cleaning_fee: originalCleaningFee,
    hc_damage_deposit: originalDamageDeposit,
    hc_total_price: originalTotalPrice,  // May need recalculation
    hc_four_week_rent: originalFourWeekRent  // May need recalculation
  };
```

### Step 2: Update Edge Function to Set `counter offer happened`

In `proposal/actions/update.ts`, ensure `counter offer happened` is set when status changes to counteroffer:

```typescript
// After all HC field updates, if status is counteroffer, set the flag
if (input.status === 'Host Counteroffer Submitted / Awaiting Guest Review') {
  updates["counter offer happened"] = true;
}
```

### Step 3: Add Strikethrough Display Logic (UI)

On HostProposalsPage and GuestProposalsPage, compare original vs HC fields:

```javascript
// Example: Show strikethrough for weeks if changed
const originalWeeks = proposal['Reservation Span (Weeks)'];
const hcWeeks = proposal['hc reservation span (weeks)'];
const weeksChanged = hcWeeks !== null && hcWeeks !== originalWeeks;

// Render
{weeksChanged && <span className="strikethrough">{originalWeeks} weeks</span>}
<span>{hcWeeks ?? originalWeeks} weeks</span>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| [useHostProposalsPageLogic.js](../../../app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js) | Update `handleCounteroffer` to send all HC fields |
| [update.ts](../../../supabase/functions/proposal/actions/update.ts) | Set `counter offer happened = true` when status is counteroffer |
| Host/Guest Proposals Pages (future) | Add strikethrough display for changed values |

---

## Rollback Steps for Testing

To reset proposal `1768674109497x26858129648361608` for retesting:

```sql
UPDATE proposal
SET
  "Status" = 'Proposal Submitted by guest - Awaiting Host Review',
  "counter offer happened" = null,
  "hc nightly price" = null,
  "hc days selected" = null,
  "hc nights selected" = null,
  "hc move in date" = null,
  "hc reservation span (weeks)" = null,
  "hc check in day" = null,
  "hc check out day" = null,
  "hc cleaning fee" = null,
  "hc damage deposit" = null,
  "hc total price" = null,
  "hc 4 week rent" = null,
  "hc nights per week" = null,
  "Modified Date" = NOW()
WHERE _id = '1768674109497x26858129648361608';
```

---

## Test Plan

1. Reset proposal to clean state (use SQL above)
2. Login as host, navigate to HostProposalsPage
3. Select proposal, open editing view
4. Make changes (e.g., change weeks from 16 to 20)
5. Submit counteroffer
6. Verify in database:
   - All `hc_` fields have values
   - `counter offer happened` = `true`
   - Status = "Host Counteroffer Submitted / Awaiting Guest Review"
7. Verify on UI:
   - Changed values show strikethrough of original

---

## References

- [useHostProposalsPageLogic.js](../../../app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js) - Lines 834-951 (handleCounteroffer)
- [HostEditingProposal.jsx](../../../app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx) - Lines 398-410 (onCounteroffer call)
- [update.ts](../../../supabase/functions/proposal/actions/update.ts) - Lines 209-258 (HC field handling)
