# Implementation Plan: Enable Editing for Listing Availability Fields

## Overview
Enable editing functionality for listing availability fields (check-in time, check-out time, earliest date available, and ideal lease terms) in the AvailabilitySection component on the listing dashboard page. Currently these fields are displayed as read-only. Upon successful save, a toast notification will be shown.

## Success Criteria
- [ ] Check-in time dropdown is editable (interactive, not disabled)
- [ ] Check-out time dropdown is editable (interactive, not disabled)
- [ ] Earliest date available field is editable (date picker)
- [ ] Lease term min/max inputs are editable (number inputs)
- [ ] Changes are persisted to the database via the existing updateListing function
- [ ] Success toast notification appears after changes are saved
- [ ] Error toast notification appears if save fails
- [ ] UI remains responsive during save operations

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx` | Renders availability fields | Convert read-only fields to interactive, add save handlers |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Business logic hook | Add handler for availability field updates |
| `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx` | Main page component | Pass new handler prop to AvailabilitySection |
| `app/src/styles/components/listing-dashboard.css` | Styling | Minor styling adjustments for interactive states |
| `app/src/islands/shared/Toast.jsx` | Toast notification system | No changes (already available via `window.showToast`) |

### Related Documentation
- [miniCLAUDE.md](../../Documentation/miniCLAUDE.md) - Project architecture reference
- [ListingDashboardPage CLAUDE.md](../../Documentation/Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) - Page context

### Existing Patterns to Follow
1. **Toast Pattern**: The listing dashboard already uses `window.showToast` for notifications (see `handleCopyLink` in useListingDashboardPageLogic.js, line 547-577)
2. **Update Pattern**: Use the existing `updateListing` function which handles field mapping to database columns (lines 896-948)
3. **Database Field Names**:
   - Check-in time: `NEW Date Check-in Time`
   - Check-out time: `NEW Date Check-out Time`
   - Earliest available: ` First Available` (note leading space)
   - Min weeks: `Minimum Weeks`
   - Max weeks: `Maximum Weeks`
4. **Changed Fields Only**: Per project rules, only send changed fields to avoid FK constraint violations

## Implementation Steps

### Step 1: Add Availability Update Handler to Logic Hook
**Files:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Purpose:** Create a handler function that saves availability field changes
**Details:**
- Add new callback function `handleAvailabilityChange` that accepts field name and new value
- Use existing `updateListing` function to persist changes
- Show success/error toast after save completes
- Update local listing state to reflect changes immediately

**Code Pattern:**
```javascript
const handleAvailabilityChange = useCallback(async (fieldName, value) => {
  const listingId = getListingIdFromUrl();
  if (!listingId) {
    window.showToast?.({
      title: 'Error',
      content: 'No listing ID available',
      type: 'error'
    });
    return;
  }

  try {
    // Map UI field names to database column names
    const fieldMapping = {
      'checkInTime': 'NEW Date Check-in Time',
      'checkOutTime': 'NEW Date Check-out Time',
      'earliestAvailableDate': ' First Available', // DB column has leading space
      'leaseTermMin': 'Minimum Weeks',
      'leaseTermMax': 'Maximum Weeks'
    };

    const dbFieldName = fieldMapping[fieldName];
    if (!dbFieldName) {
      console.error('Unknown availability field:', fieldName);
      return;
    }

    await updateListing(listingId, { [dbFieldName]: value });

    // Update local state
    setListing((prev) => ({
      ...prev,
      [fieldName]: value
    }));

    window.showToast?.({
      title: 'Changes Saved',
      content: 'Availability settings updated successfully',
      type: 'success'
    });
  } catch (error) {
    console.error('Failed to save availability field:', error);
    window.showToast?.({
      title: 'Save Failed',
      content: 'Could not save changes. Please try again.',
      type: 'error'
    });
  }
}, [getListingIdFromUrl, updateListing]);
```

**Validation:** Console log should show update calls; toast should appear

### Step 2: Export Handler from Logic Hook
**Files:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Purpose:** Make the new handler available to the page component
**Details:**
- Add `handleAvailabilityChange` to the return object at the end of the hook (around line 1470)

**Validation:** Verify export compiles without errors

### Step 3: Pass Handler to AvailabilitySection
**Files:** `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx`
**Purpose:** Wire up the handler to the AvailabilitySection component
**Details:**
- Destructure `handleAvailabilityChange` from `useListingDashboardPageLogic()` (line 83)
- Pass `onAvailabilityChange={handleAvailabilityChange}` to `<AvailabilitySection>` (around line 229)

**Validation:** Props are passed to child component

### Step 4: Update AvailabilitySection to Accept New Prop
**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`
**Purpose:** Add the new prop to the component signature
**Details:**
- Add `onAvailabilityChange` to the destructured props (line 53)

**Validation:** Component accepts new prop without errors

### Step 5: Make Lease Term Inputs Editable
**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`
**Purpose:** Convert read-only lease term inputs to interactive
**Details:**
- Remove `readOnly` attribute from min/max lease term inputs (lines 284-295)
- Add `onChange` handlers that call `onAvailabilityChange`
- Add validation to ensure values stay within 6-52 range

**Code Change (lines 280-296):**
```jsx
{/* Lease Term */}
<div className="listing-dashboard-availability__field">
  <label>What is the ideal Lease Term? (Enter between 6 and 52 weeks.)</label>
  <div className="listing-dashboard-availability__range-inputs">
    <input
      type="number"
      value={listing?.leaseTermMin || 6}
      min={6}
      max={52}
      onChange={(e) => {
        const val = Math.min(52, Math.max(6, parseInt(e.target.value) || 6));
        onAvailabilityChange('leaseTermMin', val);
      }}
    />
    <span>-</span>
    <input
      type="number"
      value={listing?.leaseTermMax || 52}
      min={6}
      max={52}
      onChange={(e) => {
        const val = Math.min(52, Math.max(6, parseInt(e.target.value) || 52));
        onAvailabilityChange('leaseTermMax', val);
      }}
    />
  </div>
</div>
```

**Validation:** Inputs accept keyboard/mouse changes; value stays in range

### Step 6: Make Earliest Available Date Editable
**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`
**Purpose:** Convert read-only date input to interactive date picker
**Details:**
- Change input type from `text` to `date`
- Remove `readOnly` attribute
- Add `onChange` handler
- Format initial value as YYYY-MM-DD for date input

**Code Change (lines 299-307):**
```jsx
{/* Earliest Available Date */}
<div className="listing-dashboard-availability__field">
  <label>What is the earliest date someone could rent from you?</label>
  <input
    type="date"
    value={formatDateForInput(listing?.earliestAvailableDate)}
    className="listing-dashboard-availability__date-input"
    onChange={(e) => onAvailabilityChange('earliestAvailableDate', e.target.value)}
  />
</div>
```

Add helper function at top of component:
```javascript
// Format date for date input (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};
```

**Validation:** Date picker works; selecting date triggers save

### Step 7: Make Check-in/Check-out Time Dropdowns Editable
**Files:** `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`
**Purpose:** Convert disabled dropdowns to interactive
**Details:**
- Remove `disabled` attribute from check-in select (line 313)
- Remove `disabled` attribute from check-out select (line 322)
- Add `onChange` handlers that call `onAvailabilityChange`
- Expand time options to provide more choices

**Code Change (lines 310-329):**
```jsx
{/* Check In/Out Times */}
<div className="listing-dashboard-availability__times">
  <div className="listing-dashboard-availability__time-field">
    <label>Check In Time</label>
    <select
      value={listing?.checkInTime || '1:00 pm'}
      onChange={(e) => onAvailabilityChange('checkInTime', e.target.value)}
    >
      <option value="12:00 pm">12:00 pm</option>
      <option value="1:00 pm">1:00 pm</option>
      <option value="2:00 pm">2:00 pm</option>
      <option value="3:00 pm">3:00 pm</option>
      <option value="4:00 pm">4:00 pm</option>
      <option value="5:00 pm">5:00 pm</option>
    </select>
  </div>
  <div className="listing-dashboard-availability__time-field">
    <label>Check Out Time</label>
    <select
      value={listing?.checkOutTime || '11:00 am'}
      onChange={(e) => onAvailabilityChange('checkOutTime', e.target.value)}
    >
      <option value="9:00 am">9:00 am</option>
      <option value="10:00 am">10:00 am</option>
      <option value="11:00 am">11:00 am</option>
      <option value="12:00 pm">12:00 pm</option>
      <option value="1:00 pm">1:00 pm</option>
    </select>
  </div>
</div>
```

**Validation:** Dropdowns are clickable; selection triggers save

### Step 8: Update CSS for Interactive States
**Files:** `app/src/styles/components/listing-dashboard.css`
**Purpose:** Ensure interactive inputs have appropriate styling
**Details:**
- Remove any background styling that makes inputs look disabled
- Add hover/focus states for better UX

**Code Addition (after line 1410):**
```css
/* Enable interactive states for availability inputs */
.listing-dashboard-availability__time-field select:not([disabled]) {
  cursor: pointer;
}

.listing-dashboard-availability__time-field select:not([disabled]):hover {
  border-color: var(--ld-accent);
}

.listing-dashboard-availability__time-field select:not([disabled]):focus {
  border-color: var(--ld-accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 79, 187, 0.1);
}

.listing-dashboard-availability__range-inputs input:not([readonly]) {
  background-color: white;
  cursor: text;
}

.listing-dashboard-availability__range-inputs input:not([readonly]):hover {
  border-color: var(--ld-accent);
}

.listing-dashboard-availability__range-inputs input:not([readonly]):focus {
  border-color: var(--ld-accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 79, 187, 0.1);
}

.listing-dashboard-availability__date-input:not([readonly]) {
  background-color: white;
  cursor: pointer;
}

.listing-dashboard-availability__date-input:not([readonly]):hover {
  border-color: var(--ld-accent);
}

.listing-dashboard-availability__date-input:not([readonly]):focus {
  border-color: var(--ld-accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 79, 187, 0.1);
}
```

**Validation:** Inputs have visual feedback on hover/focus

## Edge Cases & Error Handling
- **Empty values**: Lease terms should default to min=6, max=52 if empty
- **Invalid date**: If user clears date, don't save empty string (keep previous value)
- **Network failure**: Show error toast and don't update local state
- **Concurrent saves**: Each field saves independently, no queueing needed
- **Range validation**: Lease term min cannot exceed max; if min > max, adjust max

## Testing Considerations
- Test all four field types (number, date, select)
- Test with slow network to verify toast timing
- Test error scenario by temporarily blocking network
- Test that changes persist across page refresh
- Test with listings that have null/undefined values for these fields

## Rollback Strategy
- All changes are in frontend code only (no database schema changes)
- Revert the three file changes (AvailabilitySection.jsx, useListingDashboardPageLogic.js, ListingDashboardPage.jsx)
- CSS changes are additive and safe

## Dependencies & Blockers
- None - all required infrastructure (updateListing, Toast system) already exists

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Save fails silently | Low | Medium | Error toast displays failure |
| Invalid data persisted | Low | Medium | Client-side validation before save |
| UI flicker during save | Low | Low | Optimistic UI update |

---

## Files Referenced Summary

1. **app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx** - Main component to modify
2. **app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js** - Add handler function
3. **app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx** - Wire up props
4. **app/src/styles/components/listing-dashboard.css** - Add interactive styles
5. **app/src/islands/shared/Toast.jsx** - Reference only (no changes)
6. **app/src/listing-dashboard.jsx** - Reference only (ToastProvider already configured)
