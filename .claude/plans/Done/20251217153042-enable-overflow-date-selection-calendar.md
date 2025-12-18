# Implementation Plan: Enable Overflow Date Selection in Listing Calendar

## Overview

This plan enables the selection of overflow dates (dates from adjacent months visible on the calendar grid) in the ListingDashboardPage availability calendar. Currently, dates from previous/next months are visible but non-interactive. After this change, hosts will be able to click on visible overflow dates to mark them as blocked without needing to manually switch months first.

## Success Criteria

- [ ] Overflow days from adjacent months (grayed out at start/end of calendar grid) are clickable
- [ ] Clicking an overflow day toggles its blocked status just like in-month dates
- [ ] Past dates remain non-clickable regardless of which month they belong to
- [ ] Range selection mode works across month boundaries for visible overflow dates
- [ ] Visual feedback (hover states, cursor) indicates clickability for selectable overflow dates
- [ ] Existing month navigation still required to see/select dates beyond the visible 42-day grid

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx` | Calendar component with blocked date management | Add `date` property to overflow days, modify click handler logic, update selectable calculation |
| `app/src/styles/components/listing-dashboard.css` | Calendar styling including overflow day appearance | Add selectable styling for overflow days, ensure cursor/hover states work |

### Related Documentation

- `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` - Component architecture and patterns
- `app/src/islands/pages/CLAUDE.md` - Page component conventions

### Existing Patterns to Follow

- **formatDateKey()**: Used consistently to create `YYYY-MM-DD` date strings (line 24-29)
- **isDateBlocked()**: Uses `useCallback` for memoized date checking (line 133-137)
- **toggleBlockedDate()**: Handles both add/remove with parent notification (line 140-153)
- **Day object structure**: `{ day, isCurrentMonth, isPast, date }` pattern for calendar days

## Implementation Steps

### Step 1: Add Date Objects to Overflow Days

**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

**Purpose:** Ensure overflow days have proper `Date` objects so they can be processed by the click handler and blocking logic.

**Details:**

1. **Modify previous month padding** (lines 88-95):
   - Calculate actual `Date` object for each overflow day from the previous month
   - Properly determine if each overflow day is in the past

   Current code:
   ```javascript
   // Previous month padding
   const prevMonth = new Date(year, month, 0);
   for (let i = startPadding - 1; i >= 0; i--) {
     days.push({
       day: prevMonth.getDate() - i,
       isCurrentMonth: false,
       isPast: true,  // PROBLEM: Always marked as past
     });
   }
   ```

   New code:
   ```javascript
   // Previous month padding
   const prevMonth = new Date(year, month, 0);
   const prevMonthYear = prevMonth.getFullYear();
   const prevMonthMonth = prevMonth.getMonth();
   for (let i = startPadding - 1; i >= 0; i--) {
     const dayNum = prevMonth.getDate() - i;
     const date = new Date(prevMonthYear, prevMonthMonth, dayNum);
     days.push({
       day: dayNum,
       isCurrentMonth: false,
       isPast: date < today,  // Properly check if past
       date: date,  // ADD: actual Date object
     });
   }
   ```

2. **Modify next month padding** (lines 112-119):
   - Calculate actual `Date` object for each overflow day from the next month
   - These will never be past dates (since they're in the future)

   Current code:
   ```javascript
   // Next month padding
   const remaining = 42 - days.length;
   for (let i = 1; i <= remaining; i++) {
     days.push({
       day: i,
       isCurrentMonth: false,
       isPast: false,
     });
   }
   ```

   New code:
   ```javascript
   // Next month padding
   const remaining = 42 - days.length;
   const nextMonthYear = month === 11 ? year + 1 : year;
   const nextMonthMonth = month === 11 ? 0 : month + 1;
   for (let i = 1; i <= remaining; i++) {
     const date = new Date(nextMonthYear, nextMonthMonth, i);
     days.push({
       day: i,
       isCurrentMonth: false,
       isPast: false,  // Next month dates are never past
       date: date,  // ADD: actual Date object
     });
   }
   ```

3. **Move `today` variable before previous month loop** so it's available for past-date comparison:
   - Currently defined at line 98, needs to move before the previous month padding loop (around line 87)

**Validation:**
- Console log `calendarDays` array and verify all 42 entries have valid `date` properties
- Verify previous month overflow days correctly identify past vs future dates

---

### Step 2: Update Click Handler to Allow Overflow Dates

**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

**Purpose:** Modify `handleDateClick` to allow clicking on overflow dates that are not in the past.

**Details:**

1. **Update the early return condition** (lines 175-179):

   Current code:
   ```javascript
   // Don't allow clicking on past dates or dates from other months
   if (dayInfo.isPast || !dayInfo.isCurrentMonth || !dayInfo.date) {
     console.log('Click ignored: past date or not current month');
     return;
   }
   ```

   New code:
   ```javascript
   // Don't allow clicking on past dates or dates without valid Date objects
   if (dayInfo.isPast || !dayInfo.date) {
     console.log('Click ignored: past date or missing date object');
     return;
   }
   ```

   **Rationale:** Remove the `!dayInfo.isCurrentMonth` check. The only restrictions should be:
   - No past dates (can't block dates that have already passed)
   - Must have a valid `date` object (safety check)

2. **Update the log message** to reflect the new behavior:
   ```javascript
   console.log('Date clicked:', dayInfo, 'isOverflow:', !dayInfo.isCurrentMonth);
   ```

**Validation:**
- Click on a visible next-month date and verify it gets blocked
- Click on a past overflow date (previous month) and verify it's ignored
- Verify in-month dates still work correctly

---

### Step 3: Update Selectable Calculation for UI Feedback

**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

**Purpose:** Update the `isSelectable` variable to include future overflow dates, enabling proper CSS styling and accessibility attributes.

**Details:**

1. **Update isSelectable calculation** (line 423):

   Current code:
   ```javascript
   const isSelectable = dayInfo.isCurrentMonth && !dayInfo.isPast;
   ```

   New code:
   ```javascript
   const isSelectable = !dayInfo.isPast && dayInfo.date;
   ```

   **Rationale:** A day is selectable if:
   - It's not in the past
   - It has a valid date object (defensive check)
   - Month doesn't matter anymore

**Validation:**
- Verify hover cursor appears on future overflow dates
- Verify hover background color change works on overflow dates
- Verify past overflow dates do NOT show selectable styling

---

### Step 4: Update CSS for Overflow Day Selectability

**Files:** `app/src/styles/components/listing-dashboard.css`

**Purpose:** Ensure overflow days that are selectable have appropriate visual feedback, while maintaining the grayed-out appearance that distinguishes them from current month dates.

**Details:**

1. **Add combined selector for selectable overflow days** (after line 1417):

   ```css
   /* Selectable overflow days (future dates from adjacent months) */
   .listing-dashboard-availability__calendar-day--other-month.listing-dashboard-availability__calendar-day--selectable {
     cursor: pointer;
   }

   .listing-dashboard-availability__calendar-day--other-month.listing-dashboard-availability__calendar-day--selectable:hover {
     background-color: #f3f4f6;
   }

   /* Blocked overflow days should still show blocked styling */
   .listing-dashboard-availability__calendar-day--other-month.listing-dashboard-availability__calendar-day--blocked {
     background-color: #fee2e2;
     color: #dc2626;
   }
   ```

2. **Ensure past overflow days are not clickable** (modify existing --past rule if needed):
   - The existing `.listing-dashboard-availability__calendar-day--past` rule already sets `cursor: not-allowed` (line 1419-1423)
   - This will apply regardless of month, which is correct

**Validation:**
- Hover over a future overflow date and see background change
- Hover over a past overflow date and see `not-allowed` cursor
- Verify blocked overflow dates show red styling

---

### Step 5: Test Range Selection Across Month Boundaries

**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

**Purpose:** Verify range selection works correctly when spanning from current month into overflow dates.

**Details:**

No code changes needed - the existing `getDatesBetween()` function (lines 32-51) works with any valid Date objects. However, verify these scenarios:

1. **Range start in current month, end in overflow (next month)**
   - Click a late December date as start
   - Click a January overflow date as end
   - Verify all dates in between are blocked

2. **Range start in overflow (previous month), end in current month**
   - When viewing January, click a December overflow date as start
   - Click a January date as end
   - Verify all dates in between are blocked

3. **Range entirely in overflow dates**
   - Click one overflow date as start
   - Click another overflow date as end
   - Verify the range is blocked correctly

**Validation:**
- All range selection scenarios work correctly
- `getDatesBetween()` correctly generates dates across month boundaries
- Blocked dates list shows correct dates after range selection

---

## Edge Cases & Error Handling

### Edge Case 1: Year Boundary (December -> January)
- When viewing December, January overflow dates should be in the next year
- The `nextMonthYear` calculation handles this: `month === 11 ? year + 1 : year`

### Edge Case 2: Year Boundary (January -> December)
- When viewing January, December overflow dates should be from the previous year
- The `prevMonthYear` calculation handles this via `new Date(year, month, 0)` which automatically gives the correct previous month/year

### Edge Case 3: Past Overflow Dates
- Some December dates visible when viewing January might still be in the past
- The `date < today` comparison handles this correctly

### Edge Case 4: Already Blocked Overflow Dates
- If an overflow date is already blocked, clicking it should unblock it
- The existing `toggleBlockedDate()` function handles this (add if not present, remove if present)

## Testing Considerations

1. **Manual Testing Scenarios:**
   - View December, click visible January dates to block
   - View January, click visible December dates (verify past dates can't be blocked)
   - Use range mode across month boundaries
   - Toggle individual overflow dates on/off
   - Verify blocked dates persist after month navigation

2. **Visual Verification:**
   - Overflow dates should remain grayed (lighter color) but show hover feedback
   - Blocked overflow dates should show red background
   - Past overflow dates should show `not-allowed` cursor

3. **Data Verification:**
   - After blocking overflow dates, check the `blockedDates` array
   - Verify dates are in correct `YYYY-MM-DD` format
   - Verify dates are saved to database via `onBlockedDatesChange`

## Rollback Strategy

If issues arise:
1. Revert changes to `AvailabilitySection.jsx` - specifically restore the `!dayInfo.isCurrentMonth` check in `handleDateClick`
2. Revert CSS changes if visual issues occur
3. The database schema is unchanged, so no data migration rollback needed

## Dependencies & Blockers

- None. This is a self-contained UI change within a single component.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Incorrect date calculation at year boundary | Low | Medium | Year boundary logic is straightforward; manual test December/January |
| Past dates accidentally becoming clickable | Low | Medium | Explicit `isPast` check remains in click handler |
| Visual confusion (overflow dates look same as current) | Low | Low | Overflow dates retain grayed color; only hover/click behavior changes |
| Range selection breaks across months | Very Low | Medium | `getDatesBetween()` uses Date objects, not month-aware logic |

---

## Files Referenced in This Plan

1. **Primary Change:**
   - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ListingDashboardPage\components\AvailabilitySection.jsx`

2. **CSS Update:**
   - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\listing-dashboard.css`

3. **Documentation Referenced:**
   - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ListingDashboardPage\CLAUDE.md`
   - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\CLAUDE.md`
   - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\CLAUDE.md`
