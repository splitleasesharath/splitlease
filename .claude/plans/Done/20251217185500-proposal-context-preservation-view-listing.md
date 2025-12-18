# Implementation Plan: Proposal Context Preservation for View Listing Navigation

## Overview

When a guest navigates from their proposals page to view a listing, the page should display the same scheduling context (selected days and reservation span) that was part of their proposal. This maintains continuity and helps the user understand the exact schedule they proposed.

## Success Criteria

- [ ] "View Listing" link on ProposalCard passes proposal context via URL parameters
- [ ] ViewSplitLeasePage parses and applies reservation span from URL
- [ ] ViewSplitLeasePage parses and applies check-in/check-out dates from URL (for display context)
- [ ] Day selection on View Listing page matches proposal's days selected
- [ ] Reservation span dropdown shows the same value as the proposal
- [ ] Move-in date is pre-populated based on proposal data if available
- [ ] No regressions to existing functionality

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Displays proposal with "View Listing" link (line 944-951) | Update href to include days, span, and dates as URL params |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Listing detail page with schedule selector | Add parsing for `reservation-span`, `check-in`, `check-out`, and `move-in` URL params |
| `app/src/lib/navigation.js` | Navigation utility functions | Add new `goToListingWithProposalContext()` function |

### Related Documentation

- `app/src/CLAUDE.md` - Frontend architecture details, day indexing (0-based)
- `app/src/islands/pages/CLAUDE.md` - Page component patterns
- `app/src/lib/dayUtils.js` - Day indexing utilities (0-based)

### Existing Patterns to Follow

**URL Parameter Pattern (ViewSplitLeasePage lines 50-82):**
The page already has `getInitialScheduleFromUrl()` which reads `days-selected` parameter. The URL uses 1-based indexing (`1,2,3,4` for Sun-Wed) which gets converted to 0-based internally.

**Day Object Creation Pattern:**
```javascript
const dayObjects = zeroBased.map(dayIndex => createDay(dayIndex, true));
```

**State Initialization Pattern (ViewSplitLeasePage line 662-663):**
```javascript
const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl());
const [reservationSpan, setReservationSpan] = useState(13); // 13 weeks default
```

### Proposal Data Structure

From `userProposalQueries.js` (lines 96-101), the proposal object contains:
- `"Days Selected"` - Array of day indices (0-indexed: 0=Sunday through 6=Saturday)
- `"Reservation Span (Weeks)"` - Number (e.g., 13, 20, etc.)
- `"check in day"` - Number (0-indexed day of week)
- `"check out day"` - Number (0-indexed day of week)
- `"Move in range start"` - Date string (YYYY-MM-DD format)
- `"Move in range end"` - Date string (YYYY-MM-DD format)

## Implementation Steps

### Step 1: Add URL Parameter Builder Function to navigation.js

**Files:** `app/src/lib/navigation.js`
**Purpose:** Create a dedicated function for building listing URLs with proposal context

**Details:**
- Add new function `getListingUrlWithProposalContext(listingId, proposalContext)`
- The function should accept:
  - `listingId` - The listing's `_id`
  - `proposalContext` - Object containing:
    - `daysSelected` - Array of 0-indexed day numbers
    - `reservationSpan` - Number of weeks
    - `moveInDate` - Optional move-in date (YYYY-MM-DD)
- Convert 0-indexed days to 1-indexed for URL (matching existing pattern)
- Return URL string with query parameters

**Code Pattern:**
```javascript
/**
 * Get the URL for a listing with proposal context preserved
 * @param {string} listingId - The listing ID
 * @param {Object} proposalContext - Proposal scheduling context
 * @param {number[]} proposalContext.daysSelected - Selected days (0-indexed, 0=Sunday)
 * @param {number} proposalContext.reservationSpan - Reservation span in weeks
 * @param {string} [proposalContext.moveInDate] - Move-in date (YYYY-MM-DD)
 * @returns {string} The listing URL with context parameters
 */
export function getListingUrlWithProposalContext(listingId, proposalContext = {}) {
  if (!listingId) return '/view-split-lease';

  const params = new URLSearchParams();

  // Days selected: convert from 0-indexed to 1-indexed for URL
  if (proposalContext.daysSelected && proposalContext.daysSelected.length > 0) {
    const oneBasedDays = proposalContext.daysSelected.map(d => d + 1);
    params.set('days-selected', oneBasedDays.join(','));
  }

  // Reservation span
  if (proposalContext.reservationSpan) {
    params.set('reservation-span', proposalContext.reservationSpan.toString());
  }

  // Move-in date
  if (proposalContext.moveInDate) {
    params.set('move-in', proposalContext.moveInDate);
  }

  const queryString = params.toString();
  return `/view-split-lease/${listingId}${queryString ? '?' + queryString : ''}`;
}
```

**Validation:** Function should be importable and return correctly formatted URLs

---

### Step 2: Update ProposalCard "View Listing" Link

**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Pass proposal context when navigating to listing view

**Details:**
- Import the new `getListingUrlWithProposalContext` function
- Replace the hardcoded href at lines 944-951 with a dynamically generated URL
- Extract context from proposal object:
  - `proposal['Days Selected']` - Parse as array (handle JSON string)
  - `proposal['Reservation Span (Weeks)']` or `proposal['hc reservation span (weeks)']` for counteroffer
  - `proposal['Move in range start']` for move-in date

**Current Code (lines 944-951):**
```jsx
<a
  href={`/view-split-lease/${listing?._id}`}
  className="btn-action btn-primary-v2"
  target="_blank"
  rel="noopener noreferrer"
>
  View Listing
</a>
```

**Updated Code:**
```jsx
<a
  href={getListingUrlWithProposalContext(listing?._id, {
    daysSelected: parseDaysSelected(proposal),
    reservationSpan: getEffectiveReservationSpan(proposal),
    moveInDate: proposal['Move in range start']
  })}
  className="btn-action btn-primary-v2"
  target="_blank"
  rel="noopener noreferrer"
>
  View Listing
</a>
```

**Helper Functions to Add (within ProposalCard.jsx):**
```javascript
/**
 * Parse days selected from proposal, handling both array and JSON string formats
 * Returns 0-indexed day numbers
 */
function parseDaysSelected(proposal) {
  let days = proposal['Days Selected'] || proposal.hcDaysSelected || [];

  // Parse if JSON string
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch (e) {
      return [];
    }
  }

  if (!Array.isArray(days) || days.length === 0) return [];

  // Convert to numbers if needed (days stored as 0-indexed)
  return days.map(d => {
    if (typeof d === 'number') return d;
    if (typeof d === 'string') {
      const num = parseInt(d.trim(), 10);
      return isNaN(num) ? -1 : num;
    }
    return -1;
  }).filter(d => d >= 0 && d <= 6);
}

/**
 * Get effective reservation span, accounting for counteroffers
 */
function getEffectiveReservationSpan(proposal) {
  const isCounteroffer = proposal['counter offer happened'];
  return isCounteroffer
    ? proposal['hc reservation span (weeks)']
    : proposal['Reservation Span (Weeks)'];
}
```

**Validation:** Click "View Listing" and verify URL contains correct parameters

---

### Step 3: Extend ViewSplitLeasePage URL Parsing

**Files:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Purpose:** Parse additional URL parameters for reservation span and move-in date

**Details:**
- Modify the existing `getInitialScheduleFromUrl()` function to return an object with both days and other context
- Alternatively, create separate parsing functions for each parameter type
- Initialize `reservationSpan` state from URL if present
- Initialize `moveInDate` state from URL if present

**Option A: Extend existing function (recommended for consistency):**

Replace the function at lines 50-82 with:

```javascript
/**
 * Get initial booking context from URL parameters
 * URL format:
 *   - days-selected=1,2,3,4 (1-based, where 1=Sunday)
 *   - reservation-span=13 (weeks)
 *   - move-in=2025-02-15 (YYYY-MM-DD)
 *
 * Returns: Object with days (Day objects), reservationSpan (number), moveInDate (string)
 */
function getInitialContextFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);

  // Parse days selected
  let dayObjects = [];
  const daysParam = urlParams.get('days-selected');
  if (daysParam) {
    try {
      const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
      const zeroBased = oneBased
        .filter(d => d >= 1 && d <= 7)
        .map(d => d - 1);

      if (zeroBased.length > 0) {
        dayObjects = zeroBased.map(dayIndex => createDay(dayIndex, true));
        console.log('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
          urlParam: daysParam,
          oneBased,
          zeroBased,
          dayObjects: dayObjects.map(d => d.name)
        });
      }
    } catch (e) {
      console.warn('⚠️ ViewSplitLeasePage: Failed to parse days-selected:', e);
    }
  }

  // Parse reservation span
  let reservationSpan = null;
  const spanParam = urlParams.get('reservation-span');
  if (spanParam) {
    const parsed = parseInt(spanParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      reservationSpan = parsed;
      console.log('📅 ViewSplitLeasePage: Loaded reservation span from URL:', reservationSpan);
    }
  }

  // Parse move-in date
  let moveInDate = null;
  const moveInParam = urlParams.get('move-in');
  if (moveInParam) {
    // Basic validation: YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(moveInParam)) {
      moveInDate = moveInParam;
      console.log('📅 ViewSplitLeasePage: Loaded move-in date from URL:', moveInDate);
    }
  }

  return {
    dayObjects,
    reservationSpan,
    moveInDate
  };
}
```

**Option B: Create separate parsing functions (simpler, less refactoring):**

Add after the existing `getInitialScheduleFromUrl()` function:

```javascript
/**
 * Get initial reservation span from URL parameter
 * @returns {number|null} Reservation span in weeks or null if not provided
 */
function getInitialReservationSpanFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const spanParam = urlParams.get('reservation-span');

  if (!spanParam) return null;

  const parsed = parseInt(spanParam, 10);
  if (!isNaN(parsed) && parsed > 0) {
    console.log('📅 ViewSplitLeasePage: Loaded reservation span from URL:', parsed);
    return parsed;
  }

  return null;
}

/**
 * Get initial move-in date from URL parameter
 * @returns {string|null} Move-in date (YYYY-MM-DD) or null if not provided
 */
function getInitialMoveInFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const moveInParam = urlParams.get('move-in');

  if (!moveInParam) return null;

  // Basic validation: YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(moveInParam)) {
    console.log('📅 ViewSplitLeasePage: Loaded move-in date from URL:', moveInParam);
    return moveInParam;
  }

  return null;
}
```

**Validation:** Console logs should show parsed values when navigating with URL params

---

### Step 4: Update State Initialization

**Files:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Purpose:** Initialize state from URL parameters

**Details:**
Update the state declarations at lines 660-664 to use URL values as defaults:

**If using Option A (extended function):**
```javascript
// Get initial context from URL
const initialContext = useMemo(() => getInitialContextFromUrl(), []);

// Booking widget state
const [moveInDate, setMoveInDate] = useState(initialContext.moveInDate);
const [strictMode, setStrictMode] = useState(false);
const [selectedDayObjects, setSelectedDayObjects] = useState(initialContext.dayObjects);
const [reservationSpan, setReservationSpan] = useState(initialContext.reservationSpan || 13);
```

**If using Option B (separate functions):**
```javascript
// Booking widget state
const [moveInDate, setMoveInDate] = useState(() => getInitialMoveInFromUrl());
const [strictMode, setStrictMode] = useState(false);
const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl());
const [reservationSpan, setReservationSpan] = useState(() => getInitialReservationSpanFromUrl() || 13);
```

**Validation:** Verify state initializes correctly from URL on page load

---

### Step 5: Ensure Move-in Date Validation

**Files:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Purpose:** Validate move-in date from URL is not in the past or before minimum date

**Details:**
Update the useEffect at lines 727-734 to handle URL-provided move-in dates:

```javascript
// Set initial move-in date if days were loaded from URL
// Also validate URL-provided move-in date is not before minimum
useEffect(() => {
  if (selectedDayObjects.length > 0) {
    // If move-in date was provided via URL, validate it's not before minimum
    if (moveInDate) {
      const providedDate = new Date(moveInDate);
      const minDate = new Date(minMoveInDate);

      if (providedDate < minDate) {
        // URL date is in the past, use smart calculation instead
        const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
        const smartDate = calculateSmartMoveInDate(dayNumbers);
        setMoveInDate(smartDate);
        console.log('📅 ViewSplitLeasePage: URL move-in date was before minimum, using smart date:', smartDate);
      }
    } else {
      // No URL date provided, calculate smart default
      const dayNumbers = selectedDayObjects.map(day => day.dayOfWeek);
      const smartDate = calculateSmartMoveInDate(dayNumbers);
      setMoveInDate(smartDate);
      console.log('📅 ViewSplitLeasePage: Set initial move-in date from URL selection:', smartDate);
    }
  }
}, []);  // Run only once on mount
```

**Note:** Changed dependency array to empty `[]` to prevent recalculation on every state change. The original code had `[selectedDayObjects, moveInDate, calculateSmartMoveInDate]` which could cause issues with URL-provided values.

**Validation:** Navigate with an old date in URL and verify it gets corrected

---

### Step 6: Add Import Statement

**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Import the new navigation utility

**Details:**
Add at the top of the file with other imports:

```javascript
import { getListingUrlWithProposalContext } from '../../../lib/navigation.js';
```

**Validation:** No import errors

## Edge Cases & Error Handling

1. **Missing or Invalid Days Parameter**
   - If `days-selected` is missing or malformed, fall back to empty selection (existing behavior)
   - Log warning to console but don't throw error

2. **Invalid Reservation Span**
   - If `reservation-span` is non-numeric or negative, use default (13 weeks)
   - Validate against listing's allowed spans if applicable

3. **Past Move-in Date**
   - If URL provides a date before minimum (2 weeks from today), calculate smart default
   - Log adjustment to console

4. **Proposal Data Missing Fields**
   - Handle null/undefined for `Days Selected`, `Reservation Span (Weeks)`, etc.
   - Fall back gracefully to defaults

5. **JSON Parsing Errors**
   - `Days Selected` may be stored as JSON string; handle parse failures
   - Already handled by existing `parseDaysSelected` logic in ProposalCard

## Testing Considerations

### Manual Testing
1. Navigate to Guest Proposals page with active proposals
2. Click "View Listing" on a proposal
3. Verify new tab opens with URL containing:
   - `days-selected=` with correct 1-indexed days
   - `reservation-span=` with correct weeks
   - `move-in=` with correct date (if available)
4. Verify View Split Lease page shows:
   - Same days selected as the proposal
   - Same reservation span in dropdown
   - Correct move-in date (or smart default)

### Key Scenarios to Verify
- Proposal with all fields populated
- Proposal with counteroffer (should use `hc` fields)
- Proposal with missing move-in date
- Old proposal with dates in the past
- Multi-day selection with wrap-around (e.g., Thu-Sun)
- Single day selection

### Browser Testing
- Chrome, Firefox, Safari, Edge
- Mobile Safari (iOS)
- Mobile Chrome (Android)

## Rollback Strategy

If issues arise:
1. Revert ProposalCard.jsx to use original static href
2. Keep URL parsing code in ViewSplitLeasePage but unused (harmless)
3. Remove `getListingUrlWithProposalContext` from navigation.js or leave as dead code

## Dependencies & Blockers

- No external dependencies
- No database changes required
- No Edge Function changes required
- Relies on existing URL parameter pattern already in ViewSplitLeasePage

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| URL encoding issues with special characters | Low | Low | Days are integers, dates are ISO format - safe characters |
| Move-in date validation too strict | Medium | Low | Allow any future date, calculate smart default if past |
| State initialization race condition | Low | Medium | Use useMemo for initial context parsing |
| Browser caching stale page with old URL handling | Low | Low | URL params are processed on page load, not cached |

---

## Referenced Files Summary

| File | Path | Lines of Interest |
|------|------|-------------------|
| ProposalCard.jsx | `app/src/islands/pages/proposals/ProposalCard.jsx` | 944-951 (View Listing link), 687-695 (Days Selected parsing) |
| ViewSplitLeasePage.jsx | `app/src/islands/pages/ViewSplitLeasePage.jsx` | 50-82 (URL parsing), 660-664 (state init), 727-734 (move-in effect) |
| navigation.js | `app/src/lib/navigation.js` | 17-31 (goToListing pattern), 86-98 (getSearchUrl pattern) |
| dayUtils.js | `app/src/lib/dayUtils.js` | 1-55 (day indexing reference) |
| userProposalQueries.js | `app/src/lib/proposals/userProposalQueries.js` | 96-101 (proposal fields) |
| useGuestProposalsPageLogic.js | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Full file (page logic hook) |

---

**Plan Version:** 1.0
**Created:** 2025-12-17T18:55:00
**Author:** Claude Code (Implementation Planning Architect)
