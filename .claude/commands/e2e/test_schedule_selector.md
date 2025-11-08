# E2E Test: Schedule Selector & Dynamic Pricing

## Test ID
`test_schedule_selector`

## User Story
As a user searching for split lease properties, I want to select which days of the week I need accommodation so that I can see accurate per-night pricing based on my specific schedule (2-5 contiguous days required).

## Prerequisites
- Application server running on http://localhost:8000
- React Schedule Selector component built and loaded (`dist/schedule-selector.js`)
- At least 3 listings with price data for multiple night counts
- Listings must have fields: `💰Nightly Host Rate for 2 nights`, `💰Nightly Host Rate for 3 nights`, etc.

## Test Steps

### Step 1: Load Page and Locate Schedule Selector
**Action**: Navigate to http://localhost:8000
**Verify**:
- Page loads successfully
- Schedule selector React component is visible at top of filter panel
- 7 day buttons are displayed (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- All days are initially unselected (no active state)
**Screenshot**: Capture schedule selector initial state as `01_schedule_selector_initial.png`

### Step 2: Verify Validation - Cannot Select Non-Contiguous Days
**Action**:
1. Click on "Mon" button (should select Monday)
2. Attempt to click on "Wed" button (should be disabled or rejected)
**Verify**:
- Monday is selected (active/highlighted state)
- Wednesday cannot be selected (non-contiguous)
- Error message or visual feedback indicates contiguous days are required
- No price updates occur yet (need 2+ days)
**Screenshot**: Capture validation state as `02_non_contiguous_blocked.png`

### Step 3: Select 2 Contiguous Days
**Action**:
1. Click "Mon" button (if not already selected)
2. Click "Tue" button to select Tuesday
**Verify**:
- Both Monday and Tuesday show selected state
- All listing cards update to show "2-night pricing"
- Prices change from default to 2-night rates
- Selected days counter/indicator updates (e.g., "2 days selected")
**Screenshot**: Capture 2-day selection with updated prices as `03_two_days_selected.png`

### Step 4: Extend to 3 Contiguous Days
**Action**: Click "Wed" button to add Wednesday
**Verify**:
- Mon, Tue, Wed all show selected state
- All listing prices update to 3-night rates
- Price values are different from 2-night rates (verify actual rate change)
- Selected days counter shows "3 days selected"
**Screenshot**: Capture 3-day selection as `04_three_days_selected.png`

### Step 5: Extend to 4 Contiguous Days
**Action**: Click "Thu" button to add Thursday
**Verify**:
- Mon, Tue, Wed, Thu all show selected state
- All listing prices update to 4-night rates
- Prices continue to adjust appropriately
**Screenshot**: Capture 4-day selection as `05_four_days_selected.png`

### Step 6: Extend to Maximum (5 Contiguous Days)
**Action**: Click "Fri" button to add Friday
**Verify**:
- Mon, Tue, Wed, Thu, Fri all show selected state (5 days)
- All listing prices update to 5-night rates (or 7-night if 5 not available)
- Selected days counter shows "5 days selected"
**Screenshot**: Capture 5-day selection as `06_five_days_selected.png`

### Step 7: Verify Maximum Limit (5 Days)
**Action**: Attempt to click "Sat" button to add Saturday (6th day)
**Verify**:
- Saturday cannot be selected OR
- Selecting Saturday deselects Monday (sliding window behavior)
- Maximum of 5 contiguous days enforced
- Error message or tooltip explains the 5-day maximum
**Screenshot**: Capture maximum limit enforcement as `07_max_limit_enforced.png`

### Step 8: Deselect Days
**Action**:
1. Click "Mon" button to deselect Monday
2. Observe behavior
**Verify**:
- Monday becomes unselected
- Remaining days (Tue, Wed, Thu, Fri) stay selected
- Prices update to 4-night rates
- UI remains stable
**Screenshot**: Capture after deselection as `08_day_deselected.png`

### Step 9: Clear All Selections
**Action**: Click remaining selected days one by one or use "Clear" button (if exists)
**Verify**:
- All days return to unselected state
- Prices revert to default pricing (typically 7-night or base rate)
- No selected days indicator visible
**Screenshot**: Capture cleared state as `09_schedule_cleared.png`

### Step 10: Test Different Day Range (Wed-Fri)
**Action**:
1. Click "Wed" button
2. Click "Thu" button
3. Click "Fri" button
**Verify**:
- Wed, Thu, Fri are selected (3 contiguous days)
- Mon, Tue, Sat, Sun remain unselected
- Prices show 3-night rates
- Works correctly with mid-week selection
**Screenshot**: Capture mid-week selection as `10_midweek_selection.png`

### Step 11: Verify Price Differences Across Listings
**Action**: Compare prices on multiple listing cards
**Verify**:
- Different listings show different prices (not all the same)
- Each listing's price correctly reflects its 3-night rate from database
- Price format is correct (e.g., "$XXX/night")
**Screenshot**: Capture price comparison as `11_price_comparison.png`

### Step 12: Test With Filters Active
**Action**:
1. Keep Wed-Fri selected (3 nights)
2. Apply a borough filter (e.g., "Brooklyn")
**Verify**:
- Schedule selection persists through filter changes
- Filtered listings still show 3-night pricing
- Schedule selector state doesn't reset
**Screenshot**: Capture schedule with filters as `12_schedule_with_filters.png`

## Success Criteria
- ✅ Schedule selector component renders correctly
- ✅ Can select 2-5 contiguous days only
- ✅ Cannot select non-contiguous days
- ✅ Cannot select more than 5 days
- ✅ Prices update dynamically based on selected day count
- ✅ Price updates are immediate (no delay/loading)
- ✅ Different listings show different prices (data-driven)
- ✅ Selection persists through filter changes
- ✅ Can deselect days individually
- ✅ Can clear entire selection
- ✅ No console errors during interaction
- ✅ React component animations work smoothly (if animated)

## Expected Results
Schedule selector provides intuitive day selection with proper validation, and listing prices dynamically update to reflect the selected number of nights accurately.

## Test Data Requirements
Database listings must have price fields populated:
- `💰Nightly Host Rate for 2 nights`
- `💰Nightly Host Rate for 3 nights`
- `💰Nightly Host Rate for 4 nights`
- `💰Nightly Host Rate for 5 nights`
- `💰Nightly Host Rate for 7 nights` (default/fallback)

At least 3 listings should have different price points to verify dynamic calculation.

## Failure Scenarios
- **Component doesn't render**: Check `dist/schedule-selector.js` exists and loads
- **Days select but prices don't update**: Verify `onSelectionChange` callback in `schedule-selector-integration.js`
- **Non-contiguous days allowed**: Check validation logic in `SearchScheduleSelector.tsx`
- **Wrong prices displayed**: Verify `calculateDynamicPrice()` in app.js:16

## Performance Expectations
- Day selection should be instant (< 100ms)
- Price updates should complete within 200ms
- Smooth animations (if implemented)
- No visual flickering during updates

## Notes
This is a critical feature that differentiates Split Lease from traditional rental searches. The dynamic pricing based on selected days is a core value proposition, so this test is high priority.

The Schedule Selector is a React Island component, so proper integration with the vanilla JS app is essential.
