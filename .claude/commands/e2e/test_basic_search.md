# E2E Test: Basic Property Search

## Test ID
`test_basic_search`

## User Story
As a user searching for a split lease property, I want to view available listings on the search page so that I can browse properties that match my needs.

## Prerequisites
- Application server running on http://localhost:8000
- Supabase database connection configured with valid API keys
- At least 1 listing available in the database
- React components built (`npm run build:components`)

## Test Steps

### Step 1: Navigate to Search Page
**Action**: Open browser and navigate to http://localhost:8000
**Verify**:
- Page loads without errors
- No console errors appear
- Page title is "Search | Split Lease"

### Step 2: Verify Header Elements
**Action**: Check that the header is visible and contains all expected elements
**Verify**:
- Split Lease logo is visible
- "Host with Us" navigation link is present
- "Stay with Us" navigation link is present
- "Explore Rentals" button is present
- "Sign In" button is present
**Screenshot**: Capture full page view as `01_page_loaded.png`

### Step 3: Wait for Data to Load
**Action**: Wait for listings to populate (up to 10 seconds)
**Verify**:
- Loading skeleton disappears
- At least 1 listing card appears in the listings container
- Listing count text updates (e.g., "10 listings found")
**Screenshot**: Capture listings section as `02_listings_loaded.png`

### Step 4: Verify Listing Card Structure
**Action**: Inspect the first listing card
**Verify**:
- Card has property photo(s)
- Card displays property title/location
- Card shows price information
- Card has "Contact Host" button
- Card has basic property details (space type, bedrooms, etc.)
**Screenshot**: Capture first listing card as `03_listing_card_detail.png`

### Step 5: Verify Filter Panel
**Action**: Check that filter controls are visible
**Verify**:
- Schedule selector (7-day picker) is visible
- Borough select dropdown is populated with options (not just "Loading...")
- Week Pattern dropdown is visible
- Price Tier dropdown is visible
- Sort By dropdown is visible
- Neighborhood search input is visible
**Screenshot**: Capture filter panel as `04_filter_panel.png`

### Step 6: Verify Map Section
**Action**: Check that the map section loads
**Verify**:
- Google Maps container is visible
- Map renders without errors
- "Generate Market Report" floating button is visible
- Map legend is present (Available Now, Selected Property)
**Screenshot**: Capture map section as `05_map_loaded.png`

### Step 7: Scroll to Load More Listings
**Action**: Scroll down to the bottom of the listings section
**Verify**:
- Additional listings load (lazy loading working)
- Listing count remains accurate
- No JavaScript errors in console
**Screenshot**: Capture after lazy load as `06_lazy_load_complete.png`

## Success Criteria
- ✅ Page loads without errors within 5 seconds
- ✅ At least 1 listing card is displayed
- ✅ All filter controls are visible and populated
- ✅ Google Maps renders successfully
- ✅ Lazy loading works when scrolling
- ✅ No console errors during the entire test flow

## Expected Results
All verification steps pass without errors, screenshots show properly rendered UI elements, and the application displays property listings correctly.

## Test Data Requirements
- Database must contain at least 1 approved listing with:
  - Valid photo URLs
  - Price information (💰Nightly Host Rate fields)
  - Location data (neighborhood, borough)
  - Basic property details

## Failure Scenarios
- **No listings appear**: Check Supabase connection and `Approved` filter in `supabase-api.js:64`
- **Map doesn't load**: Verify Google Maps API key in `config.local.js`
- **Filters show "Loading..."**: Check FilterConfig initialization in app.js
- **React components missing**: Verify `dist/schedule-selector.js` exists

## Notes
This is the most basic test that validates the core functionality of the search page. All other features depend on this working correctly.
