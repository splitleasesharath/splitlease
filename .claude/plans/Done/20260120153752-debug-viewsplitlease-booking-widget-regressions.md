# Debug Analysis: View Split Lease Booking Widget UI Regressions

**Created**: 2026-01-20 15:37:52
**Status**: Analysis Complete - Pending Implementation
**Severity**: Medium
**Affected Area**: ViewSplitLeasePage booking widget UI

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18 + Vite, CSS Modules for styling
- **Data Flow**: ViewSplitLeasePage.jsx renders booking widget with ListingScheduleSelector component

### 1.2 Domain Context
- **Feature Purpose**: The booking widget allows guests to select their weekly schedule, move-in date, and create a proposal for a listing
- **Related Documentation**: `.claude/Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md`
- **Data Model**: Listing data fetched from Supabase, schedule selection stored in component state

### 1.3 Relevant Conventions
- **Key Patterns**: CSS Modules (`.module.css`), CSS custom properties via `styles/variables.css`
- **Layer Boundaries**: Page component (ViewSplitLeasePage.jsx) uses shared component (ListingScheduleSelector.jsx)
- **Shared Utilities**: Styling via `ViewSplitLeasePage.module.css` and `listing-schedule-selector.css`

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: `/view-split-lease.html?id={listing_id}`
- **Critical Path**: ViewSplitLeasePage.jsx -> ListingScheduleSelector.jsx -> booking widget UI
- **Dependencies**:
  - `app/src/islands/pages/ViewSplitLeasePage.jsx` (main component)
  - `app/src/islands/pages/ViewSplitLeasePage.module.css` (styles)
  - `app/src/islands/shared/ListingScheduleSelector.jsx` (schedule selector)
  - `app/src/styles/listing-schedule-selector.css` (schedule selector styles)
  - `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` (favorite button)

## 2. Problem Statement

Five UI regressions have been identified on the View Split Lease booking widget:

1. **Heart Icon Present** - A heart/favorite icon appears in the price header area that should be removed
2. **Section Header Incorrect** - "SCHEDULE" should be "WEEKLY SCHEDULE"
3. **Missing Strict Checkbox Container** - The light-purple container box wrapping the "Strict" checkbox is missing
4. **Unwanted Recurrent Schedule Box** - A gray box with "This listing is Every week. Click here if you want to specify another recurrent schedule" should be removed
5. **CTA Button Styling Wrong** - "Create Proposal" button should be full-width with solid purple (#4C2C73) background and white text

## 3. Reproduction Context

- **Environment**: Development (localhost:8000) and Production
- **Steps to reproduce**: Navigate to any listing view page (`/view-split-lease?id={any_listing_id}`)
- **Expected behavior**:
  1. No heart icon in price header
  2. Header reads "WEEKLY SCHEDULE"
  3. Strict checkbox has light-purple background container
  4. No recurrent schedule info box
  5. CTA button is full-width solid purple (#4C2C73)
- **Actual behavior**: All five regressions present as described above

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Main component - Contains heart icon (line 1949-1965), strict mode (line 2010-2042), recurrent schedule box (line 2058-2086), and CTA button (line 2162-2181) |
| `app/src/islands/pages/ViewSplitLeasePage.module.css` | Styles - Missing CSS classes for button states (`bookingCreateButton`, `bookingCreateButtonEnabled`, `bookingCreateButtonDisabled`, `bookingStrictMode`) |
| `app/src/islands/shared/ListingScheduleSelector.jsx` | Schedule component - Header text "Schedule" on line 57 |
| `app/src/styles/listing-schedule-selector.css` | Schedule styles - Header styling defined but text comes from JSX |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | Favorite button component |

### 4.2 Execution Flow Trace

1. User visits `/view-split-lease?id=...`
2. `ViewSplitLeasePage.jsx` renders main layout with two columns
3. Right column contains booking widget (line 1939-2192 for desktop)
4. Price display section (line 1941-1966) includes `FavoriteButton` component
5. Strict mode section (line 2010-2042) uses `styles.bookingStrictMode` class (not defined in CSS)
6. Schedule wrapper (line 2044-2088) includes `ListingScheduleSelector` and recurrent schedule info box
7. CTA button (line 2162-2181) uses `styles.bookingCreateButton` class variants (not defined in CSS)

### 4.3 Git History Analysis

Recent commits affecting ViewSplitLeasePage:
- `3cf16b1d feat(view-split-lease): Add custom schedule description feature` - Added the recurrent schedule box
- `d64965ef Merge branch 'main' into development-sl9` - Recent merge
- Multiple refactoring commits in `tac2` branch

Recent commits affecting ListingScheduleSelector:
- `3cf16b1d feat(view-split-lease): Add custom schedule description feature`
- `5c5ff6cb fix(schedule-selector): show only 'Full-time stay' when all 7 days selected`
- Earlier commits modified styling and functionality

## 5. Hypotheses

### Hypothesis 1: FavoriteButton was intentionally added but should be removed (Likelihood: 95%)
**Theory**: The FavoriteButton component was added to the price header section as a feature but is now considered UI clutter for this context.
**Supporting Evidence**:
- Line 1949-1965 in ViewSplitLeasePage.jsx explicitly renders `<FavoriteButton>` with size="large" and variant="inline"
- The component is imported at line 19
**Contradicting Evidence**: None - this is clearly intentional code
**Verification Steps**: Remove the FavoriteButton from the price display section
**Potential Fix**: Delete lines 1949-1965 (FavoriteButton render) from ViewSplitLeasePage.jsx
**Convention Check**: Aligns with "Building for Truth" - removing unnecessary UI complexity

### Hypothesis 2: ListingScheduleSelector header text was simplified (Likelihood: 95%)
**Theory**: The header was changed from "WEEKLY SCHEDULE" to "Schedule" during refactoring.
**Supporting Evidence**:
- Line 57 in ListingScheduleSelector.jsx shows `<h3>Schedule</h3>`
- CSS in listing-schedule-selector.css applies uppercase transform but doesn't change content
**Contradicting Evidence**: None
**Verification Steps**: Change the h3 text from "Schedule" to "Weekly Schedule"
**Potential Fix**: Edit line 57 in ListingScheduleSelector.jsx
**Convention Check**: Header text is a simple content change

### Hypothesis 3: Strict checkbox wrapper class not implemented in CSS Module (Likelihood: 95%)
**Theory**: The JSX uses `styles.bookingStrictMode` class but this class is not defined in the CSS module file.
**Supporting Evidence**:
- Line 2011 uses `className={styles.bookingStrictMode}`
- Grep for `bookingStrictMode` in ViewSplitLeasePage.module.css returns no matches
- CSS module file has `bookingCheckboxWrapper` class (lines 1018-1033) with the desired light-purple styling
**Contradicting Evidence**: None
**Verification Steps**: Either add the missing CSS class or change the JSX to use the existing `bookingCheckboxWrapper` class
**Potential Fix**:
- Option A: Add `bookingStrictMode` class to CSS module with same styles as `bookingCheckboxWrapper`
- Option B: Change JSX line 2011 from `styles.bookingStrictMode` to `styles.bookingCheckboxWrapper`
**Convention Check**: Option B is simpler and uses existing code

### Hypothesis 4: Recurrent schedule box was intentionally added as a feature (Likelihood: 95%)
**Theory**: The "custom schedule description" feature was added in commit `3cf16b1d` but is now considered intrusive UI.
**Supporting Evidence**:
- Lines 2058-2086 in ViewSplitLeasePage.jsx contain the recurrent schedule info box
- State variables `customScheduleDescription` and `showCustomScheduleInput` exist (lines 551-552)
- Git history shows `feat(view-split-lease): Add custom schedule description feature`
**Contradicting Evidence**: None - this is intentional code
**Verification Steps**: Remove the entire recurrent schedule info box div
**Potential Fix**: Delete lines 2058-2086 from ViewSplitLeasePage.jsx
**Convention Check**: Aligns with "Match Solution to Scale" - removing over-engineering

### Hypothesis 5: CTA button classes not defined in CSS Module (Likelihood: 95%)
**Theory**: The JSX references button classes that don't exist in the CSS module.
**Supporting Evidence**:
- Line 2170-2174 references `styles.bookingCreateButton`, `styles.bookingCreateButtonEnabled`, `styles.bookingCreateButtonDisabled`
- Grep for these classes in ViewSplitLeasePage.module.css returns no matches
- CSS module has `bookingSubmitButton` class (lines 1223-1248) with purple styling
**Contradicting Evidence**: None
**Verification Steps**: Either add the missing CSS classes or change JSX to use existing class
**Potential Fix**:
- Option A: Add missing CSS classes with required styling (solid #4C2C73 background, full width, white text)
- Option B: Change JSX to use `styles.bookingSubmitButton` and modify that class if needed
**Convention Check**: Need to ensure button has correct #4C2C73 purple (not #31135d gradient)

## 6. Recommended Action Plan

### Priority 1 (All fixes - single implementation pass)

#### Fix 1: Remove Heart Icon from Price Header
**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Action**: Delete FavoriteButton from price display section

**Current Code (lines 1942-1966)**:
```jsx
<div className={styles.bookingPriceDisplay} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div className={styles.bookingPriceAmount}>
    {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
      ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
      : 'Select Days'}
    <span className={styles.bookingPriceUnit}>/night</span>
  </div>
  <FavoriteButton
    listingId={listing?._id}
    userId={loggedInUserData?.userId}
    initialFavorited={isFavorited}
    onToggle={(newState) => {
      setIsFavorited(newState);
      const displayName = listing?.name || 'Listing';
      if (newState) {
        showToast(`${displayName} added to favorites`, 'success');
      } else {
        showToast(`${displayName} removed from favorites`, 'info');
      }
    }}
    onRequireAuth={() => setShowAuthModal(true)}
    size="large"
    variant="inline"
  />
</div>
```

**Target Code**:
```jsx
<div className={styles.bookingPriceDisplay}>
  <div className={styles.bookingPriceAmount}>
    {pricingBreakdown?.valid && pricingBreakdown?.pricePerNight
      ? `$${Number.isInteger(pricingBreakdown.pricePerNight) ? pricingBreakdown.pricePerNight : pricingBreakdown.pricePerNight.toFixed(2)}`
      : 'Select Days'}
    <span className={styles.bookingPriceUnit}>/night</span>
  </div>
</div>
```

Also remove the inline style on the parent div since it was only needed for flexbox layout with the FavoriteButton.

---

#### Fix 2: Change Section Header to "WEEKLY SCHEDULE"
**File**: `app/src/islands/shared/ListingScheduleSelector.jsx`
**Action**: Update h3 text content

**Current Code (line 57)**:
```jsx
<h3>Schedule</h3>
```

**Target Code**:
```jsx
<h3>Weekly Schedule</h3>
```

Note: The CSS already applies `text-transform: uppercase` so it will display as "WEEKLY SCHEDULE".

---

#### Fix 3: Restore Light-Purple Container for Strict Checkbox
**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Action**: Change class name from `bookingStrictMode` to `bookingCheckboxWrapper`

**Current Code (line 2011)**:
```jsx
<div className={styles.bookingStrictMode}>
```

**Target Code**:
```jsx
<div className={styles.bookingCheckboxWrapper}>
```

The `bookingCheckboxWrapper` class already exists in the CSS module with the desired light-purple styling:
```css
.bookingCheckboxWrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%);
  border-radius: 10px;
  border: 1px solid #e9d5ff;
  transition: all 0.2s ease;
}
```

---

#### Fix 4: Remove Recurrent Schedule Box
**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Action**: Remove the "This listing is Every week. Click here if you want to specify another recurrent schedule" info box and associated custom schedule textarea

**Current Code (lines 2057-2086)**: Remove this entire section:
```jsx
{/* Listing's weekly pattern info + custom schedule option */}
<div className={styles.bookingScheduleInfo}>
  <span>This listing is </span>
  <strong className={styles.bookingScheduleHighlight}>
    {listing?.['Weeks offered'] || 'Every week'}
  </strong>
  <span>. </span>
  <button
    onClick={() => setShowCustomScheduleInput(!showCustomScheduleInput)}
    className={styles.bookingCustomScheduleToggle}
  >
    {showCustomScheduleInput ? 'Hide custom schedule' : 'Click here if you want to specify another recurrent schedule'}
  </button>
</div>

{/* Custom schedule freeform input */}
{showCustomScheduleInput && (
  <div className={styles.bookingCustomScheduleInput}>
    <textarea
      value={customScheduleDescription}
      onChange={(e) => setCustomScheduleDescription(e.target.value)}
      placeholder="Describe your preferred schedule pattern in detail (e.g., 'I need the space every other week starting January 15th' or 'Weekdays only for the first month, then full weeks')"
      className={styles.bookingTextarea}
    />
    <p className={styles.bookingCustomScheduleHelp}>
      The host will review your custom schedule request and may adjust the proposal accordingly.
    </p>
  </div>
)}
```

Also remove the same section from mobile view (lines 2574-2602).

**Note**: The state variables `customScheduleDescription` and `showCustomScheduleInput` (lines 551-552) can optionally be removed if no longer used elsewhere.

---

#### Fix 5: Fix CTA Button Styling
**File**: `app/src/islands/pages/ViewSplitLeasePage.module.css`
**Action**: Add missing CSS classes for the Create Proposal button with correct styling

Add the following CSS classes after line 1248 (after `.bookingSubmitButton:disabled`):

```css
/* Create Proposal Button - Specific styling */
.bookingCreateButton {
  width: 100%;
  padding: 14px;
  background: #4C2C73;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px rgba(76, 44, 115, 0.4);
}

.bookingCreateButtonEnabled {
  background: #4C2C73;
}

.bookingCreateButtonEnabled:hover {
  background: #3D2259;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(76, 44, 115, 0.5);
}

.bookingCreateButtonDisabled {
  background: #D1D5DB;
  cursor: not-allowed;
  box-shadow: none;
}
```

Also add mobile equivalents after line 1781 (after `.mobileBookingSubmitButton:disabled`):

```css
/* Mobile Create Proposal Button */
.mobileBookingCreateButton {
  width: 100%;
  padding: 16px;
  background: #4C2C73;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.mobileBookingCreateButtonEnabled {
  background: #4C2C73;
}

.mobileBookingCreateButtonEnabled:hover {
  background: #3D2259;
}

.mobileBookingCreateButtonDisabled {
  background: #D1D5DB;
  cursor: not-allowed;
}
```

## 7. Prevention Recommendations

1. **CSS Module Validation**: Consider adding a build-time or lint-time check that warns when JSX references CSS module classes that don't exist in the corresponding `.module.css` file.

2. **Design System Documentation**: Document the specific color codes for different button types (e.g., CTA buttons use `#4C2C73`, secondary buttons use `#31135d`).

3. **Feature Flag Consideration**: When adding experimental features like the "custom schedule description", consider using feature flags that can be easily toggled instead of committing directly to main.

4. **Component Prop Consistency**: The FavoriteButton's placement in the booking widget should be a documented design decision - if it's meant to be elsewhere, document where favorites should appear.

## 8. Related Files Reference

### Files Requiring Modification

| File | Line Numbers | Change Type |
|------|--------------|-------------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 1942-1966 | Remove FavoriteButton from price display |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 2011 | Change `bookingStrictMode` to `bookingCheckboxWrapper` |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 2057-2086 | Remove recurrent schedule info box (desktop) |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 2574-2602 | Remove recurrent schedule info box (mobile) |
| `app/src/islands/shared/ListingScheduleSelector.jsx` | 57 | Change "Schedule" to "Weekly Schedule" |
| `app/src/islands/pages/ViewSplitLeasePage.module.css` | After 1248 | Add `bookingCreateButton*` classes |
| `app/src/islands/pages/ViewSplitLeasePage.module.css` | After 1781 | Add `mobileBookingCreateButton*` classes |

### Files for Reference Only (No Changes Needed)

| File | Purpose |
|------|---------|
| `app/src/styles/listing-schedule-selector.css` | Existing schedule selector styles |
| `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` | Favorite button component (to be removed from this context) |
| `.claude/Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md` | Page documentation |

---

**Analysis Complete**
**Next Steps**: Execute the plan by modifying the 3 files identified above (ViewSplitLeasePage.jsx, ListingScheduleSelector.jsx, ViewSplitLeasePage.module.css)
