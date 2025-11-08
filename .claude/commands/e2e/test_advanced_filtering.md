# E2E Test: Advanced Filtering

## Test ID
`test_advanced_filtering`

## User Story
As a user searching for split lease properties, I want to apply multiple filters (borough, neighborhood, price tier, week pattern) so that I can narrow down results to properties that match my specific requirements.

## Prerequisites
- Application server running on http://localhost:8000
- Supabase database connection configured
- At least 10 listings available across different boroughs and neighborhoods
- FilterConfig initialized with database data

## Test Steps

### Step 1: Load Page and Wait for Initialization
**Action**: Navigate to http://localhost:8000
**Verify**:
- Page loads successfully
- Listings appear (baseline state)
- Borough dropdown is populated (not "Loading boroughs...")
**Screenshot**: Capture initial state as `01_initial_load.png`

### Step 2: Apply Borough Filter
**Action**:
1. Click the "Select Borough" dropdown
2. Select "Manhattan" from the dropdown
3. Wait for listings to update
**Verify**:
- Dropdown shows selected value "Manhattan"
- Listings container updates to show only Manhattan properties
- Listing count updates (e.g., "X listings found")
- Location tag shows "in Manhattan"
- Map markers update to show only Manhattan properties
**Screenshot**: Capture after borough filter as `02_borough_filter_applied.png`

### Step 3: Apply Neighborhood Filter
**Action**:
1. Click into the "Refine Neighborhood(s)" search input
2. Type "East Village" in the search box
3. Wait for neighborhood list to filter
4. Click the "East Village" checkbox in the filtered list
**Verify**:
- "East Village" appears as a chip above the search input
- Listings update to show only East Village properties
- Listing count decreases
- Location tag shows "in Manhattan → East Village" or similar
**Screenshot**: Capture after neighborhood filter as `03_neighborhood_filter_applied.png`

### Step 4: Apply Price Tier Filter
**Action**:
1. Click the "Select Price Tier" dropdown
2. Select "$200-$350/night"
**Verify**:
- Dropdown shows selected value
- Listings update to show only properties in that price range
- All visible listing cards show prices between $200-$350
- Listing count updates accordingly
**Screenshot**: Capture after price filter as `04_price_filter_applied.png`

### Step 5: Apply Week Pattern Filter
**Action**:
1. Click the "Select Week Pattern" dropdown
2. Select "One week on, one week off"
**Verify**:
- Dropdown shows selected value
- Listings update to show only properties with that rental pattern
- Listing count may decrease further
**Screenshot**: Capture after week pattern filter as `05_week_pattern_filter_applied.png`

### Step 6: Verify Filter Combination Works
**Action**: Review all active filters
**Verify**:
- Borough: Manhattan
- Neighborhood: East Village
- Price Tier: $200-$350/night
- Week Pattern: One week on, one week off
- All visible listings match ALL selected criteria
- No listings appear that violate any filter
**Screenshot**: Capture combined filters state as `06_all_filters_combined.png`

### Step 7: Remove Neighborhood Filter
**Action**: Click the "X" button on the "East Village" chip
**Verify**:
- Chip disappears
- Listings expand to show all Manhattan properties (not just East Village)
- Listing count increases
- Other filters remain active (borough, price, week pattern)
**Screenshot**: Capture after removing neighborhood as `07_neighborhood_removed.png`

### Step 8: Change Sort Order
**Action**:
1. Click the "Sort By" dropdown
2. Select "Price-Lowest to Highest"
**Verify**:
- Listings re-order with cheapest at the top
- First listing has lower price than last listing
- Filter criteria still applied
**Screenshot**: Capture sorted results as `08_sorted_by_price.png`

### Step 9: Clear All Filters
**Action**:
1. Change borough to "All Boroughs" (or empty value)
2. Reset price tier to "All Prices"
3. Reset week pattern to "Every week"
**Verify**:
- Listings expand to show all available properties
- Listing count returns to maximum (e.g., "50 listings found")
- Map shows all property markers
**Screenshot**: Capture cleared state as `09_filters_cleared.png`

## Success Criteria
- ✅ Borough filter correctly filters listings by selected borough
- ✅ Neighborhood filter works within selected borough
- ✅ Multiple neighborhoods can be selected simultaneously
- ✅ Price tier filter shows only properties in selected range
- ✅ Week pattern filter correctly filters rental patterns
- ✅ All filters work in combination (AND logic)
- ✅ Removing individual filters updates results correctly
- ✅ Sort order changes without breaking filters
- ✅ Map markers update to reflect filtered results
- ✅ Listing count accurately reflects filtered results
- ✅ No console errors during filter operations

## Expected Results
All filter combinations work correctly, listings update in real-time as filters are applied/removed, and the UI accurately reflects the current filter state.

## Test Data Requirements
Database must contain:
- At least 10 listings across multiple boroughs
- Multiple listings in Manhattan
- At least 2 listings in East Village neighborhood
- Listings with various price points ($200-$500+)
- Listings with different week patterns

## Failure Scenarios
- **Filters don't update listings**: Check `applyFilters()` function in app.js:534
- **Borough/neighborhood dropdowns empty**: Verify FilterConfig initialization
- **Incorrect filter logic**: Check `SupabaseAPI.getListings()` query building
- **Map doesn't update**: Verify `updateMapMarkers()` is called after filter changes

## Performance Expectations
- Filter application should complete within 1 second
- Listing updates should be smooth without flickering
- No loading states needed for filter changes (fast enough)

## Notes
This test validates the core filtering logic which is critical to user experience. The filter system uses dynamic database-driven values loaded from Supabase, so proper initialization is essential.
