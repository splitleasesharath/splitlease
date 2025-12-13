# Debug Analysis: Mobile Pricing Calculation Shows 0 on Proposal Creation

**Created**: 2025-12-13 18:00:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: ViewSplitLeasePage - Mobile Booking Widget

---

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components (though ViewSplitLeasePage has embedded logic, not using the hook)
- **Tech Stack**: React 18, Vite, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**:
  ```
  ViewSplitLeasePage
    -> ListingScheduleSelector (manages day selection)
    -> useScheduleSelector hook (calculates pricing via useMemo)
    -> onPriceChange callback
    -> setPriceBreakdown state
    -> pricingBreakdown displayed in UI
  ```

### 1.2 Domain Context
- **Feature Purpose**: Allow guests to select days, see pricing, and create proposals for rental listings
- **Related Documentation**:
  - `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\Pages\VIEW_SPLIT_LEASE_QUICK_REFERENCE.md`
  - `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\miniCLAUDE.md`
- **Data Model**:
  - `listing` table with pricing fields (`Nightly Host Rate for X nights`, `Weekly Host Rate`, `Monthly Host Rate`)
  - `zat_priceconfiguration` table for site-wide markup/discount configuration

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-6 (Sun=0) vs Bubble 1-7 (Sun=1) - conversion at API boundaries
- **Pricing Calculation**: Handled exclusively by `ListingScheduleSelector` -> `useScheduleSelector` -> `calculatePrice()`
- **Layer Boundaries**: Frontend calculates prices locally; Edge Functions only involved at proposal submission

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: `/view-split-lease.html?id={listing_id}&days-selected={1-based-days}`
- **Critical Path**:
  1. Page loads, fetches listing data
  2. `scheduleSelectorListing` memoized object created from listing
  3. `ListingScheduleSelector` receives listing data
  4. `useScheduleSelector` calculates `priceBreakdown` via `useMemo`
  5. `onPriceChange` callback updates parent's `priceBreakdown` state
  6. Mobile UI displays `pricingBreakdown.pricePerNight`, `pricingBreakdown.fourWeekRent`, etc.
- **Dependencies**:
  - `zatConfig` (fetched from `fetchZatPriceConfiguration()`)
  - `listing` pricing fields
  - `selectedDayObjects` (days selected by user)
  - `reservationSpan` (default: 13 weeks)

---

## 2. Problem Statement

**Symptom**: On mobile devices, final prices display as `0` or `"Select Days"` when creating a proposal, while desktop works correctly.

**Impact**: Mobile users cannot see accurate pricing before submitting proposals, leading to confusion and potential abandonment.

**Expected Behavior**: Mobile pricing should display identical values to desktop pricing for the same listing and schedule selection.

---

## 3. Reproduction Context

- **Environment**: Mobile browser (< 900px viewport width)
- **Steps to reproduce**:
  1. Navigate to `/view-split-lease/{listing_id}` on a mobile device
  2. Days should be pre-selected or select days in the schedule selector
  3. Observe the price display in the bottom booking bar
  4. Compare to same listing on desktop
- **Expected behavior**: `$XX/night`, `4-Week Rent: $XXXX`, `Total: $XXXX` with valid numbers
- **Actual behavior**: `$0/night` or `Select Days`, `--` for other values
- **Error messages/logs**: None visible (need to check console for `=== PRICE CHANGE CALLBACK ===` logs)

---

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Main page component with mobile booking widget |
| `app/src/islands/shared/ListingScheduleSelector.jsx` | Schedule selector component |
| `app/src/islands/shared/useScheduleSelector.js` | Hook managing pricing calculations |
| `app/src/lib/scheduleSelector/priceCalculations.js` | Core price calculation logic |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Proposal wizard (receives pricing) |

### 4.2 Execution Flow Trace

**Desktop Flow (Working)**:
```
1. Page loads, isMobile = false
2. Single ListingScheduleSelector renders in desktop booking widget
3. useScheduleSelector calculates priceBreakdown
4. onPriceChange fires, setPriceBreakdown updates
5. pricingBreakdown displays correctly
```

**Mobile Flow (Broken)**:
```
1. Page loads, isMobile = true
2. Desktop booking widget hidden (display: none)
3. Mobile bottom bar renders with ANOTHER ListingScheduleSelector
4. MULTIPLE ListingScheduleSelector instances exist:
   - Desktop widget (hidden but mounted): Line 2249
   - Mobile collapsed view: Line 2909
   - Mobile expanded view: Line 3064
5. Each instance calls onPriceChange, potentially causing race conditions
6. State may not sync properly between instances
```

### 4.3 Git History Analysis

**Relevant Commits**:
- `72ef8f7` (Dec 12, 2025): `feat(ViewSplitLeasePage): add mobile responsive layout with bottom booking bar` - Added mobile UI with multiple ListingScheduleSelector instances
- `c75f491`: `feat(ViewSplitLeasePage): make page mobile-friendly with responsive styling`
- `3823119`: `fix(schedule-selector): sync initialSelectedDays when prop changes`

The mobile responsive layout commit (`72ef8f7`) added **375 lines** and introduced multiple `ListingScheduleSelector` components for different mobile states.

---

## 5. Hypotheses

### Hypothesis 1: Multiple ListingScheduleSelector Instances with Shared State Conflict (Likelihood: 85%)

**Theory**: The page renders **three separate instances** of `ListingScheduleSelector`:
1. Desktop widget (line 2249) - hidden on mobile but still mounted
2. Mobile collapsed view (line 2909)
3. Mobile expanded view (line 3064)

All three call the same `handlePriceChange` callback, but they each have their own internal `useScheduleSelector` hook state. When isMobile is true:
- The desktop component is still mounted (just `display: none`)
- Its `useScheduleSelector` may fire `onPriceChange` with stale/empty data
- This could overwrite the pricing state from the mobile component

**Supporting Evidence**:
- Three `ListingScheduleSelector` components share the same `onPriceChange` callback
- `useScheduleSelector` uses `useEffect` to call `onPriceChange?.(priceBreakdown)` on line 162
- Multiple effects from multiple components could race

**Contradicting Evidence**:
- Desktop component uses same `scheduleSelectorListing` data
- Should theoretically calculate the same prices

**Verification Steps**:
1. Add unique identifiers to console logs in each `ListingScheduleSelector` instance
2. Check console for which component's `onPriceChange` fires last
3. Compare `priceBreakdown` values from each instance

**Potential Fix**:
- Conditionally render only the appropriate `ListingScheduleSelector` based on `isMobile`
- Use `display: none` only for container, unmount the component entirely on mobile
- Or: use a single shared state with conditional rendering of different UI layouts

**Convention Check**: Hollow Component pattern suggests centralizing logic, not duplicating components with shared callbacks.

---

### Hypothesis 2: zatConfig Not Loaded When Mobile Component Mounts (Likelihood: 60%)

**Theory**: The `zatConfig` is fetched asynchronously in the `initialize()` function. If the mobile component renders and calculates pricing before `zatConfig` is set, it would use the default config or null, potentially resulting in different calculations.

**Supporting Evidence**:
- `zatConfig` is passed to all `ListingScheduleSelector` components
- `calculatePrice()` uses `zatConfig || defaultConfig` fallback (line 46)
- Mobile bottom bar renders conditionally based on `isMobile`, which is set immediately on mount

**Contradicting Evidence**:
- Default `zatConfig` values exist in `calculatePrice()`:
  ```javascript
  const config = zatConfig || {
    overallSiteMarkup: 0.17,
    weeklyMarkup: 0,
    fullTimeDiscount: 0.13,
    unusedNightsDiscountMultiplier: 0.03,
    avgDaysPerMonth: 31
  };
  ```
- This should still produce valid prices, not 0

**Verification Steps**:
1. Log `zatConfig` value when mobile component renders
2. Compare timing of `zatConfig` state update vs mobile component mount

**Potential Fix**:
- Wait for `zatConfig` before rendering schedule selectors
- Or ensure all components share the same `zatConfig` reference

**Convention Check**: N/A - asynchronous data loading is standard.

---

### Hypothesis 3: scheduleSelectorListing is Null During Mobile Render (Likelihood: 70%)

**Theory**: The `scheduleSelectorListing` memoized object depends on `listing`, which is loaded asynchronously. If the mobile UI renders before `listing` is available, `scheduleSelectorListing` would be `null`, and the `ListingScheduleSelector` wouldn't render or would have no data.

**Supporting Evidence**:
- Line 989: `const scheduleSelectorListing = useMemo(() => listing ? {...} : null, [listing]);`
- Mobile rendering is conditional: Line 2907: `{scheduleSelectorListing && (...)}`
- If `scheduleSelectorListing` is null, no `ListingScheduleSelector` renders, no `onPriceChange` fires

**Contradicting Evidence**:
- The condition `{scheduleSelectorListing && (...)}` should prevent rendering until data is available
- Same condition is used on desktop and mobile

**Verification Steps**:
1. Add console log in mobile section to check `scheduleSelectorListing` value
2. Check if component renders at all on mobile

**Potential Fix**:
- Ensure `scheduleSelectorListing` is available before mobile UI relies on it
- Check for any additional mobile-specific conditions that might skip rendering

**Convention Check**: Standard React conditional rendering pattern.

---

### Hypothesis 4: initialSelectedDays Not Syncing on Mobile (Likelihood: 75%)

**Theory**: The `initialSelectedDays` prop is set from `selectedDayObjects` state. The `useScheduleSelector` hook has logic to sync when `initialSelectedDays` changes (line 44-49), but there might be a timing issue where mobile components receive stale/empty initial values.

**Supporting Evidence**:
- Line 662: `const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl());`
- If URL has no `days-selected` param, initial state is empty `[]`
- Line 1024-1030: Default days (Mon-Fri) are set in a `useEffect`, which runs after initial render
- Mobile component might mount before this effect runs

**Contradicting Evidence**:
- `useScheduleSelector` has sync logic: `useEffect` on line 44 checks `initialSelectedDays.length > 0`
- If initial is empty, should not trigger premature price calculation

**Verification Steps**:
1. Check if mobile renders before `selectedDayObjects` gets default values
2. Log `initialSelectedDays` received by mobile `ListingScheduleSelector`
3. Check if effect on line 1024-1030 runs before or after mobile component renders

**Potential Fix**:
- Initialize `selectedDayObjects` with default days synchronously instead of in useEffect
- Or ensure default days are set before any rendering that depends on them

**Convention Check**: React best practice is to set initial state synchronously if possible.

---

### Hypothesis 5: priceBreakdown State Never Updated on Mobile Due to Callback Memoization Issue (Likelihood: 40%)

**Theory**: The `handlePriceChange` callback is memoized with `useCallback` and an empty dependency array. If there's a closure issue, it might not be updating state correctly.

**Supporting Evidence**:
- Line 1083: `const handlePriceChange = useCallback((newPriceBreakdown) => {...}, []);`
- Empty dependency array means callback never re-creates
- `setPriceBreakdown` is a stable function, so this should be fine

**Contradicting Evidence**:
- `setPriceBreakdown` uses functional update form `(prev) => {...}`, which is the correct pattern
- Works on desktop, so the callback itself is fine

**Verification Steps**:
1. Add console log inside `handlePriceChange` to confirm it's being called
2. Check if `newPriceBreakdown` has valid data

**Potential Fix**: N/A - unlikely to be the issue.

**Convention Check**: Correct memoization pattern used.

---

## 6. Recommended Action Plan

### Priority 1 (Try First): Consolidate ListingScheduleSelector Instances

**Implementation**:
1. **Do NOT render multiple ListingScheduleSelector components**
2. Conditionally render different **UI wrappers** around a single `ListingScheduleSelector`
3. Or: Use CSS to show/hide, but **unmount** the desktop version on mobile

**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Specific Changes**:

**Option A (Recommended)**: Single component, different UI containers

```jsx
// Before: THREE separate ListingScheduleSelector instances

// After: ONE ListingScheduleSelector with conditionally rendered wrapper
{scheduleSelectorListing && (
  <ListingScheduleSelector
    listing={scheduleSelectorListing}
    initialSelectedDays={selectedDayObjects}
    limitToFiveNights={false}
    reservationSpan={reservationSpan}
    zatConfig={zatConfig}
    onSelectionChange={handleScheduleChange}
    onPriceChange={handlePriceChange}
    showPricing={false}
    key="unified-schedule-selector" // Single key, single instance
  />
)}
```

Then use the `selectedDays` and `priceBreakdown` state in mobile/desktop UI without re-rendering the selector.

**Option B (Simpler)**: Only render one based on isMobile

```jsx
// Desktop: only render if NOT mobile
{!isMobile && scheduleSelectorListing && (
  <ListingScheduleSelector ... />
)}

// Mobile collapsed: only render if IS mobile and NOT expanded
{isMobile && !mobileBookingExpanded && scheduleSelectorListing && (
  <ListingScheduleSelector ... />
)}

// Mobile expanded: only render if IS mobile and IS expanded
{isMobile && mobileBookingExpanded && scheduleSelectorListing && (
  <ListingScheduleSelector ... />
)}
```

This ensures only ONE instance exists at a time.

---

### Priority 2 (If Priority 1 Fails): Initialize selectedDayObjects Synchronously

**Implementation**:
1. Move default day initialization into `useState` initializer
2. Remove the `useEffect` that sets default days

**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Before** (lines 662, 1024-1030):
```javascript
const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl());

useEffect(() => {
  if (selectedDayObjects.length === 0) {
    const defaultDays = DEFAULTS.DEFAULT_SELECTED_DAYS.map(dayNum => createDay(dayNum, true));
    setSelectedDayObjects(defaultDays);
  }
}, []);
```

**After**:
```javascript
const [selectedDayObjects, setSelectedDayObjects] = useState(() => {
  const fromUrl = getInitialScheduleFromUrl();
  if (fromUrl.length > 0) return fromUrl;
  // Default to Mon-Fri if no URL param
  return DEFAULTS.DEFAULT_SELECTED_DAYS.map(dayNum => createDay(dayNum, true));
});

// Remove the useEffect that sets defaults
```

---

### Priority 3 (Deeper Investigation): Add Comprehensive Logging

**Implementation**: Add debug logging to trace exact data flow

**Files to modify**:
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/shared/useScheduleSelector.js`

**Logging Points**:
1. Log when `isMobile` changes
2. Log when each `ListingScheduleSelector` instance renders (add unique ID prop)
3. Log `handlePriceChange` with source identifier
4. Log `scheduleSelectorListing` when it's created

---

## 7. Prevention Recommendations

1. **Follow Hollow Component Pattern**: Extract all booking widget logic into `useViewSplitLeasePageLogic` hook, reducing duplication
2. **Single Source of Truth for UI Components**: Never render multiple instances of stateful components that share callbacks
3. **Avoid `display: none` for Stateful Components**: Prefer conditional rendering (`{condition && <Component />}`) over CSS hiding
4. **Initialize State Synchronously**: When default values are known, set them in `useState` initializer, not `useEffect`
5. **Add Mobile Testing to QA Checklist**: Explicitly test pricing display on mobile after any changes to ViewSplitLeasePage

---

## 8. Related Files Reference

### Primary Files (Need Modification)

| File | Lines | Action |
|------|-------|--------|
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` | 2249, 2909, 3064, 662, 1024-1030 | Consolidate ListingScheduleSelector instances, fix initialization |

### Secondary Files (Reference Only)

| File | Purpose |
|------|---------|
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\ListingScheduleSelector.jsx` | Schedule selector component |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\useScheduleSelector.js` | Hook with pricing calculation and callback effects |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\scheduleSelector\priceCalculations.js` | Core pricing logic (unlikely to need changes) |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\constants.js` | DEFAULTS.DEFAULT_SELECTED_DAYS |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\scheduleSelector\dayHelpers.js` | createDay() function |

---

## 9. Testing Verification

After implementing fixes, verify:

1. **Desktop**: Pricing displays correctly (regression check)
2. **Mobile Collapsed**: `/night` price shows correct value
3. **Mobile Collapsed**: `Total: $XXXX` shows correct value
4. **Mobile Expanded**: All pricing fields show correct values
5. **Mobile -> Expand -> Collapse**: Pricing persists correctly
6. **Desktop -> Resize to Mobile**: Pricing persists correctly
7. **URL with days-selected param**: Pricing calculates on initial load
8. **URL without days-selected param**: Default Mon-Fri selected, pricing calculates

---

**DOCUMENT_VERSION**: 1.0
**ANALYST**: Claude Opus 4.5 (Debug Analyst Mode)
**NEXT_STEPS**: Implement Priority 1 fix, test on mobile, iterate if needed
