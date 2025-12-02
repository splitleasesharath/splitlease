# Search Page Console Logging Inventory

Generated: 2025-11-26

This document catalogs all console logging statements in the search page and related components. The logging has become noisy and this inventory helps identify candidates for removal or conditional logging.

---

## Summary

| Type | Count |
|------|-------|
| `console.log` | 145 |
| `console.error` | 34 |
| `console.warn` | 15 |
| `console.info` | 0 |
| `console.debug` | 0 |
| **Total** | **194** |

---

## Files Affected

| File | Path | Count |
|------|------|-------|
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | 65 |
| GoogleMap.jsx | `app/src/islands/shared/GoogleMap.jsx` | 57 |
| SearchPageTest.jsx | `app/src/islands/pages/SearchPageTest.jsx` | 55 |
| useSearchPageLogic.js | `app/src/islands/pages/useSearchPageLogic.js` | 17 |
| SearchScheduleSelector.jsx | `app/src/islands/shared/SearchScheduleSelector.jsx` | 8 |

---

## 1. SearchPage.jsx

**Path:** `app/src/islands/pages/SearchPage.jsx`

### Errors (console.error)

| Line | Statement | Context |
|------|-----------|---------|
| 46 | `console.error('Failed to fetch informational texts:', error);` | Catch block in fetchInformationalTexts() |
| 373 | `console.error('[PropertyCard] No listing ID found', { listing });` | PropertyCard onClick - missing listing ID |
| 727 | `console.error('[SearchPage] Auth check error:', error);` | Catch block in checkAuth useEffect |
| 820 | `console.error('❌ Failed to fetch all active listings:', error);` | Catch block in fetchAllActiveListings |
| 914 | `console.error('Failed to load boroughs:', err);` | Catch block in loadBoroughs |
| 991 | `console.error('Failed to load neighborhoods:', err);` | Catch block in loadNeighborhoods |
| 1099 | `console.error('❌ SearchPage: Listings WITHOUT coordinates:', ...);` | Listings with missing coordinates |
| 1206 | `console.error('Failed to fetch listings:', {...});` | Catch block in fetchListings |
| 1251 | `console.error('❌ SearchPage: Failed to parse Location - slightly different address:', {...});` | JSON parse error in transformListing |
| 1265 | `console.error('❌ SearchPage: Failed to parse Location - Address:', {...});` | JSON parse error in transformListing |
| 1304 | `console.error('❌ SearchPage: Missing coordinates for listing - will be filtered out:', {...});` | Missing coordinates error |
| 1448 | `console.error('[SearchPage] Logout error:', error);` | Logout handler error |
| 1464 | `console.error('SearchScheduleSelector error:', error);` | SearchScheduleSelector error handler |

### Warnings (console.warn)

| Line | Statement | Context |
|------|-----------|---------|
| 809 | `console.warn('⚠️ fetchAllActiveListings: Excluding listing without coordinates:', {...});` | Filtering listings without valid coordinates |
| 906 | `console.warn(\`Borough "${selectedBorough}" from URL not found, defaulting to Manhattan\`);` | Borough validation from URL |
| 933 | `console.warn('[DEBUG] Borough not found for value:', selectedBorough);` | Borough lookup failed |
| 974 | `console.warn('[DEBUG] No neighborhoods found! Comparing IDs:');` | No neighborhoods match warning |
| 1172 | `console.warn('⚠️ SearchPage: Excluding listing without valid coordinates:', {...});` | Coordinate validation warning |

### Logs (console.log)

| Line | Statement | Context |
|------|-----------|---------|
| 675 | `console.log('Initializing data lookups...');` | useEffect - data initialization |
| 739 | `console.log('🌍 Fetching ALL active listings for map background (green pins)...');` | fetchAllActiveListings start |
| 751 | `console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings');` | Supabase query result count |
| 817 | `console.log(\`✅ Fetched ${listingsWithCoordinates.length} active listings with coordinates for green markers\`);` | fetchAllActiveListings completion |
| 851 | `console.log('URL changed via browser navigation, updating filters:', newFilters);` | watchUrlChanges callback |
| 868 | `console.log('[DEBUG] Loading boroughs from zat_geo_borough_toplevel...');` | loadBoroughs start |
| 876 | `console.log('[DEBUG] Raw borough data from Supabase:', data);` | Borough data from database |
| 888 | `console.log('[DEBUG] Processed borough list:', boroughList.map(...));` | Processed borough data |
| 924 | `console.log('[DEBUG] loadNeighborhoods called - selectedBorough:', selectedBorough, 'boroughs.length:', boroughs.length);` | loadNeighborhoods entry point |
| 927 | `console.log('[DEBUG] Skipping neighborhood load - missing selectedBorough or boroughs');` | Early return condition |
| 934 | `console.log('[DEBUG] Available borough values:', boroughs.map(b => b.value));` | Debug: available boroughs |
| 938 | `console.log('[DEBUG] Loading neighborhoods for borough:', {...});` | loadNeighborhoods execution |
| 952 | `console.log('[DEBUG] Sample neighborhoods (first 5):', allNeighborhoods?.map(...));` | Sample data for debugging |
| 968 | `console.log(\`[DEBUG] Found ${data.length} neighborhoods for ${borough.name}:\`, ...);` | Neighborhoods query result |
| 975 | `console.log('[DEBUG] Looking for borough.id:', borough.id);` | Debug: borough ID lookup |
| 976 | `console.log('[DEBUG] Sample Geo-Borough values:', allNeighborhoods.map(n => n['Geo-Borough']));` | Debug: sample borough refs |
| 977 | `console.log('[DEBUG] ID match check:', allNeighborhoods.some(n => n['Geo-Borough'] === borough.id));` | Debug: ID matching |
| 1008 | `console.log('⏭️ Skipping duplicate fetch - already in progress');` | Dev-only duplicate fetch prevention |
| 1015 | `console.log('⏭️ Skipping duplicate fetch - same parameters as last fetch');` | Dev-only duplicate fetch prevention |
| 1024 | `console.log('🔍 Starting fetch:', fetchParams);` | Dev-only fetch start |
| 1077 | `console.log('📊 SearchPage: Supabase query returned', data.length, 'listings');` | Query result count |
| 1078 | `console.log('📍 SearchPage: First 3 raw listings from DB:', data.slice(0, 3).map(...));` | Sample listings for debugging |
| 1091 | `console.log('📍 SearchPage: Coordinate coverage:', {...});` | Coordinate availability stats |
| 1156 | `console.log('🔄 SearchPage: Starting transformation of', data.length, 'listings');` | Transformation start |
| 1160 | `console.log('✅ SearchPage: Transformation complete. Transformed', transformedListings.length, 'listings');` | Transformation completion |
| 1161 | `console.log('📍 SearchPage: First 3 transformed listings:', ...);` | Sample transformed listings |
| 1181 | `console.log('📍 SearchPage: Coordinate filter results:', {...});` | Coordinate filtering summary |
| 1190 | `console.log('📊 SearchPage: Final filtered listings being set to state:', {...});` | Final listings summary |
| 1203 | `console.log('✅ SearchPage: State updated with', filteredListings.length, 'filtered listings');` | State update confirmation |
| 1293 | `console.log('🔄 SearchPage: Transforming listing:', {...});` | Per-listing transformation log |
| 1311 | `console.log('✅ SearchPage: Valid coordinates found from', coordinateSource, ':', {...});` | Valid coordinates confirmation |
| 1319 | `console.log('📍 SearchPage: Final coordinates for listing:', {...});` | Final coordinate check |
| 1461 | `console.log('Schedule selector changed (display only, not used for filtering):', days);` | Schedule selector callback |
| 1725 | `console.log('Marker clicked:', listing.title);` | GoogleMap marker click |
| 1728 | `console.log('[SearchPage] Map card message clicked for:', listing?.id);` | GoogleMap card message |
| 1762 | `console.log('Auth successful from SearchPage');` | SignUpLoginModal onAuthSuccess |
| 1787 | `console.log('Marker clicked:', listing.title);` | Mobile map marker click |
| 1790 | `console.log('[SearchPage] Mobile map card message clicked for:', listing?.id);` | Mobile map card message |

---

## 2. GoogleMap.jsx

**Path:** `app/src/islands/shared/GoogleMap.jsx`

### Errors (console.error)

| Line | Statement | Context |
|------|-----------|---------|
| 154 | `console.error('Map not initialized yet');` | Map initialization check |
| 163 | `console.error('Listing not found:', listingId);` | zoomToListing - listing lookup |
| 169 | `console.error('Invalid coordinates for listing:', listingId);` | zoomToListing - coordinates validation |
| 251 | `console.error('❌ fetchDetailedListingData: Supabase error:', listingError);` | Supabase query error |
| 275 | `console.error('📸 fetchDetailedListingData: Failed to parse photos field:', e);` | Photo field parse error |
| 306 | `console.error('❌ fetchDetailedListingData: Failed to fetch listing details:', error);` | Fetch error |
| 327 | `console.error('❌ handlePinClick: Map container ref not available');` | Map ref check |
| 388 | `console.error('❌ handlePinClick: Failed to get listing details or no images available, not showing card');` | Card display failure |
| 543 | `console.error(\`❌ GoogleMap: Skipping filtered listing ${listing.id} - Missing or invalid coordinates:\`, {...});` | Coordinate validation |
| 636 | `console.error(\`❌ GoogleMap: Skipping all listing ${listing.id} - Missing or invalid coordinates:\`, {...});` | Coordinate validation for green marker |

### Warnings (console.warn)

| Line | Statement | Context |
|------|-----------|---------|
| 411 | `console.warn('⚠️ GoogleMap: Cannot initialize - missing mapRef or Google Maps API');` | Initialization check |
| 477 | `console.warn('⚠️ GoogleMap: Skipping marker update - map not ready');` | Map not ready |
| 721 | `console.warn('⚠️ GoogleMap: No valid markers to display');` | No markers warning |

### Logs (console.log)

| Line | Statement | Context |
|------|-----------|---------|
| 117 | `console.log('🗺️ GoogleMap: Component rendered with props:', {...});` | Component render |
| 239 | `console.log('🔍 fetchDetailedListingData: Starting fetch for listing:', listingId);` | Fetch start |
| 243 | `console.log('📊 fetchDetailedListingData: Querying Supabase...');` | Supabase query start |
| 255 | `console.log('✅ fetchDetailedListingData: Listing data received:', {...});` | Listing data success |
| 261 | `console.log('📸 fetchDetailedListingData: Fetching photos...');` | Photo fetch start |
| 279 | `console.log('📸 fetchDetailedListingData: Extracted photo IDs:', photoIds);` | Photo IDs extracted |
| 286 | `console.log('📸 fetchDetailedListingData: Photos received:', images.length, 'images');` | Photo fetch result |
| 303 | `console.log('✅ fetchDetailedListingData: Detailed listing built:', detailedListing);` | Detailed listing built |
| 310 | `console.log('🏁 fetchDetailedListingData: Loading state set to false');` | Loading state update |
| 319 | `console.log('🖱️ handlePinClick (React callback): Pin clicked:', {...});` | Pin click start |
| 360 | `console.log('📍 handlePinClick: Card position calculated:', { x: cardLeft, y: cardTop });` | Card position |
| 364 | `console.log('✅ handlePinClick: Card position state updated');` | Card position update |
| 368 | `console.log('✅ handlePinClick: Card visibility state set to true');` | Card visibility |
| 374 | `console.log('✅ handlePinClick: Listing already has images, using existing data:', {...});` | Image cache hit |
| 380 | `console.log('🔍 handlePinClick: Listing has no images, fetching from database...');` | Image fetch needed |
| 385 | `console.log('✅ handlePinClick: Setting detailed listing to card:', detailedListing);` | Setting card data |
| 391 | `console.log('✅ handlePinClick: Selected listing state updated');` | Selected listing update |
| 402 | `console.log('🗺️ GoogleMap: Initializing map...', {...});` | Map initialization |
| 425 | `console.log('🗺️ GoogleMap: Using listing coordinates for initial center:', initialCenter);` | Map center from listing |
| 434 | `console.log('🗺️ GoogleMap: Using default center');` | Map default center |
| 459 | `console.log('✅ GoogleMap: Map initialized successfully with zoom controls enabled');` | Map initialization success |
| 464 | `console.log('✅ GoogleMap: Google Maps API already loaded, initializing...');` | API already loaded |
| 467 | `console.log('⏳ GoogleMap: Waiting for Google Maps API to load...');` | API loading wait |
| 486 | `console.log('⏭️ GoogleMap: Skipping duplicate marker update - same listings');` | Duplicate marker prevention |
| 496 | `console.log('🗺️ GoogleMap: Markers update triggered', {...});` | Markers update start |
| 510 | `console.log('🗺️ GoogleMap: Cleared existing markers');` | Markers cleared |
| 518 | `console.log(\`🗺️ GoogleMap: Starting ${simpleMode ? 'simple' : 'purple'} marker creation for filtered listings:\`, filteredListings.length);` | Marker creation start |
| 519 | `console.log('🗺️ GoogleMap: First 3 filtered listings:', filteredListings.slice(0, 3).map(...));` | Sample filtered listings |
| 531 | `console.log(\`🗺️ GoogleMap: [${index + 1}/${filteredListings.length}] Processing filtered listing:\`, {...});` | Per-listing processing |
| 563 | `console.log(\`✅ GoogleMap: Creating ${simpleMode ? 'simple' : 'purple'} marker for listing ${listing.id}:\`, {...});` | Marker creation |
| 586 | `console.log(\`✅ GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}\`);` | Marker count |
| 589 | `console.log(\`📊 GoogleMap: ${simpleMode ? 'Simple' : 'Purple'} marker creation summary:\`, {...});` | Marker summary |
| 597 | `console.log('⚠️ GoogleMap: No filtered listings to create purple markers for');` | No listings warning |
| 602 | `console.log('🗺️ GoogleMap: Starting green marker creation for all listings (background layer):', listings.length);` | Green markers start |
| 603 | `console.log('🗺️ GoogleMap: First 3 all listings:', listings.slice(0, 3).map(...));` | Sample all listings |
| 619 | `console.log(\`⏭️ GoogleMap: [${index + 1}/${listings.length}] Skipping ${listing.id} - Already shown as purple marker\`);` | Duplicate skip |
| 624 | `console.log(\`🗺️ GoogleMap: [${index + 1}/${listings.length}] Processing all listing:\`, {...});` | Per-listing green marker |
| 656 | `console.log(\`✅ GoogleMap: Creating green marker for listing ${listing.id}:\`, {...});` | Green marker creation |
| 676 | `console.log(\`✅ GoogleMap: Green marker created successfully for ${listing.id}, total markers so far: ${markersRef.current.length}\`);` | Green marker count |
| 679 | `console.log('📊 GoogleMap: Green marker creation summary:', {...});` | Green marker summary |
| 688 | `console.log('⚠️ GoogleMap: No all listings to create green markers for (showAllListings:', showAllListings, ', listings.length:', listings?.length, ')');` | No all listings warning |
| 694 | `console.log('✅ GoogleMap: Fitting bounds to markers', {...});` | Bounds fitting |
| 706 | `console.log('🗺️ GoogleMap: Simple mode - Skipping auto-center, parent will call zoomToListing');` | Simple mode note |
| 733 | `console.log('🗺️ GoogleMap: Borough changed, recentering map:', selectedBorough);` | Borough change |
| 742 | `console.log(\`✅ GoogleMap: Map recentered to ${boroughConfig.name}\`);` | Map recenter success |
| 774 | `console.log('✅ GoogleMap: Simple marker created successfully for listing:', {...});` | Simple marker success |
| 868 | `console.log('🗺️ handleMapClick: Map clicked, closing card');` | Map click handler |
| 909 | `console.log('🎨 Rendering card overlay - State check:', {...});` | Card render check |
| 941 | `console.log('[GoogleMap] Rendering ListingCardForMap', {...});` | Card rendering |

---

## 3. SearchPageTest.jsx

**Path:** `app/src/islands/pages/SearchPageTest.jsx`

### Errors (console.error)

| Line | Statement | Context |
|------|-----------|---------|
| 501 | `console.error('[PropertyCard] No listing ID found', { listing });` | PropertyCard click |
| 893 | `console.error('❌ Failed to fetch all active listings:', error);` | Fetch error |
| 980 | `console.error('Failed to load boroughs:', err);` | Borough load error |
| 1015 | `console.error('Failed to load neighborhoods:', err);` | Neighborhood load error |
| 1255 | `console.error('❌ Failed to fetch listings:', err);` | Fetch error |
| 1285 | `console.error('❌ SearchPage: Failed to parse Location - Address:', {...});` | Location parse error |
| 1309 | `console.error('❌ SearchPage: Missing coordinates for listing - will be filtered out:', {...});` | Missing coordinates |
| 1465 | `console.error('SearchScheduleSelector error:', error);` | Scheduler error |

### Warnings (console.warn)

| Line | Statement | Context |
|------|-----------|---------|
| 882 | `console.warn('⚠️ fetchAllActiveListings: Excluding listing without coordinates:', {...});` | Coordinate filtering |
| 972 | `console.warn(\`Borough "${selectedBorough}" from URL not found, defaulting to Manhattan\`);` | Borough validation |

### Logs (console.log) - 4-Layer Cascade Debug

| Line | Statement | Context |
|------|-----------|---------|
| 802 | `console.log('Initializing data lookups...');` | Data initialization |
| 812 | `console.log('🌍 Fetching ALL active listings for map background (green pins)...');` | Active listings fetch |
| 824 | `console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings');` | Query result |
| 890 | `console.log(\`✅ Fetched ${listingsWithCoordinates.length} active listings with coordinates for green markers\`);` | Fetch completion |
| 925 | `console.log('URL changed via browser navigation, updating filters:', newFilters);` | URL change |
| 1033 | `console.log('\n🔍 ===== STARTING 4-LAYER CASCADE =====');` | Cascade start |
| 1034 | `console.log('Filters:', {...});` | Filter state |
| 1039 | `console.log('\n🔵 LAYER 1 (PRIMARY): Fetching listings with Borough + Week + Sort');` | Layer 1 start |
| 1054 | `console.log('   Applying week pattern:', weekPatternText);` | Week pattern |
| 1065 | `console.log('   Supabase returned:', data.length, 'raw listings');` | Layer 1 result |
| 1111 | `console.log('✅ LAYER 1 COMPLETE:', layer1Results.length, 'listings');` | Layer 1 complete |
| 1116 | `console.log('\n🟢 LAYER 2 (SECONDARY): Filtering by neighborhoods');` | Layer 2 start |
| 1123 | `console.log('   Filtered to', selectedNeighborhoods.length, 'neighborhoods');` | Layer 2 filter |
| 1125 | `console.log('   No neighborhood filter - passing through');` | Layer 2 no filter |
| 1129 | `console.log('✅ LAYER 2 COMPLETE:', layer2Results.length, 'listings');` | Layer 2 complete |
| 1134 | `console.log('\n🟡 LAYER 3 (TERTIARY): Filtering by price');` | Layer 3 start |
| 1144 | `console.log('   Filtered to price range:', \`$${priceRange.min}-$${priceRange.max}\`);` | Layer 3 filter |
| 1147 | `console.log('   No price filter - passing through');` | Layer 3 no filter |
| 1151 | `console.log('✅ LAYER 3 COMPLETE:', layer3Results.length, 'listings');` | Layer 3 complete |
| 1156 | `console.log('\n🟣 LAYER 4 (DISPLAY): Determining which layer to display');` | Layer 4 start |
| 1178 | `console.log('   Using:', displaySource, '→', displayListings.length, 'listings');` | Layer 4 source |
| 1185 | `console.log('\n📅 FINAL FILTER: Applying schedule/days filter');` | Days filter start |
| 1186 | `console.log('   Selected day indices:', selectedDays);` | Selected days |
| 1190 | `console.log('   Selected day names:', selectedDayNames);` | Day names |
| 1200 | `console.log(\`\n   📋 Listing: "${listing.title}"\`);` | Per-listing check |
| 1201 | `console.log(\`      Raw days_available:\`, listing.days_available);` | Raw days |
| 1202 | `console.log(\`      Is array:\`, Array.isArray(listing.days_available));` | Array check |
| 1203 | `console.log(\`      Parsed days:\`, listingDays);` | Parsed days |
| 1209 | `console.log(\`      ✅ PASS (empty = all days available)\`);` | Pass reason |
| 1218 | `console.log(\`      Normalized listing days:\`, normalizedListingDays);` | Normalized days |
| 1219 | `console.log(\`      Required days (lowercase):\`, selectedDayNames.map(d => d.toLowerCase()));` | Required days |
| 1230 | `console.log(\`      ${passes ? '✅ PASS' : '❌ FAIL'}\`);` | Pass/fail |
| 1238 | `console.log(\`   Filter results: ${passCount} passed, ${failCount} failed\`);` | Filter summary |
| 1239 | `console.log('   After days filter:', finalListings.length, 'listings');` | Final count |
| 1242 | `console.log('\n📊 ===== CASCADE SUMMARY =====');` | Summary start |
| 1243 | `console.log('🔵 Layer 1 (Primary):', layer1Results.length);` | Layer 1 summary |
| 1244 | `console.log('🟢 Layer 2 (Secondary):', layer2Results.length);` | Layer 2 summary |
| 1245 | `console.log('🟡 Layer 3 (Tertiary):', layer3Results.length);` | Layer 3 summary |
| 1246 | `console.log('🟣 Layer 4 (Display):', displayListings.length);` | Layer 4 summary |
| 1247 | `console.log('📅 Final (After days):', finalListings.length);` | Final summary |
| 1248 | `console.log('✅ Displaying source:', displaySource);` | Display source |
| 1249 | `console.log('================================\n');` | Summary end |
| 1298 | `console.log('🔄 SearchPage: Transforming listing:', {...});` | Transformation |
| 1315 | `console.log('✅ SearchPage: Valid coordinates found:', {...});` | Valid coordinates |
| 1325 | `console.log('📍 SearchPage: Final coordinates for listing:', {...});` | Final coordinates |
| 1413 | `console.log('[SearchPageTest] handleOpenContactModal called', {...});` | Contact modal |
| 1427 | `console.log('[SearchPageTest] Opening info modal for listing:', {...});` | Info modal |
| 1460 | `console.log('Selected days:', days);` | Day selection |
| 1691 | `console.log('Marker clicked:', listing.title);` | Marker click |
| 1695 | `console.log('[SearchPageTest] Map card message clicked for:', listing?.id);` | Map card message |

---

## 4. useSearchPageLogic.js

**Path:** `app/src/islands/pages/useSearchPageLogic.js`

### Errors (console.error)

| Line | Statement | Context |
|------|-----------|---------|
| 289 | `console.error('❌ Failed to fetch all active listings:', error);` | Fetch error |
| 438 | `console.error('Failed to fetch listings:', {...});` | Fetch error with details |
| 537 | `console.error('Failed to load boroughs:', err);` | Borough load error |
| 585 | `console.error('Failed to load neighborhoods:', err);` | Neighborhood load error |

### Warnings (console.warn)

| Line | Statement | Context |
|------|-----------|---------|
| 276 | `console.warn('⚠️ fetchAllActiveListings: Excluding listing without coordinates:', {...});` | Coordinate validation |
| 425 | `console.warn('⚠️ SearchPage: Excluding listing without valid coordinates:', {...});` | Coordinate validation |
| 529 | `console.warn(\`Borough "${selectedBorough}" from URL not found, defaulting to Manhattan\`);` | Borough validation |
| 551 | `console.warn('Borough not found for value:', selectedBorough);` | Borough lookup |

### Logs (console.log)

| Line | Statement | Context |
|------|-----------|---------|
| 203 | `console.log('🌍 Fetching ALL active listings for map background (green pins)...');` | Active listings fetch |
| 217 | `console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings');` | Query result |
| 284 | `console.log(\`✅ Fetched ${listingsWithCoordinates.length} active listings with coordinates for green markers\`);` | Fetch completion |
| 305 | `console.log('⏭️ Skipping duplicate fetch - already in progress');` | Duplicate prevention |
| 310 | `console.log('⏭️ Skipping duplicate fetch - same parameters');` | Duplicate prevention |
| 366 | `console.log('📊 SearchPage: Supabase query returned', data.length, 'listings');` | Query result |
| 436 | `console.log('✅ SearchPage: State updated with', listingsWithCoordinates.length, 'listings');` | State update |
| 473 | `console.log('Initializing data lookups...');` | Data initialization |
| 555 | `console.log('Loading neighborhoods for borough:', {...});` | Neighborhood load |
| 570 | `console.log(\`Found ${data.length} neighborhoods for ${borough.name}:\`, ...);` | Neighborhood result |
| 631 | `console.log('URL changed via browser navigation, updating filters:', newFilters);` | URL change |
| 710 | `console.log('🔍 [useSearchPageLogic] Neighborhood Filtering Debug:', {...});` | Neighborhood filter debug |

---

## 5. SearchScheduleSelector.jsx

**Path:** `app/src/islands/shared/SearchScheduleSelector.jsx`

### Warnings (console.warn)

| Line | Statement | Context |
|------|-----------|---------|
| 203 | `console.warn('⚠️ Failed to parse days-selected URL parameter:', e);` | URL parameter parse error |

### Logs (console.log)

| Line | Statement | Context |
|------|-----------|---------|
| 195 | `console.log('📅 SearchScheduleSelector: Loaded selection from URL:', {...});` | URL parameter parsing |
| 208 | `console.log('📅 SearchScheduleSelector: Using default Monday-Friday selection');` | Default selection |
| 573 | `console.log('📅 SearchScheduleSelector: URL updates disabled');` | Dev-only environment check |
| 589 | `console.log('📅 SearchScheduleSelector: Updated URL parameter:', {...});` | URL update |
| 600 | `console.log('📅 SearchScheduleSelector: Removed URL parameter (no days selected)');` | URL parameter removal |

---

## Patterns Observed

### Emoji Prefixes Used
- 🌍 - Global/world operations (fetching all listings)
- 📊 - Data/statistics (query results, summaries)
- ✅ - Success/completion
- ❌ - Error/failure
- ⚠️ - Warning
- 🔍 - Search/fetch operations
- 📍 - Location/coordinates
- 🗺️ - Map operations
- 📸 - Photo/image operations
- 🖱️ - User interactions (clicks)
- ⏭️ - Skip/bypass operations
- 🔄 - Transformation/processing
- 📅 - Schedule/date operations
- 🔵🟢🟡🟣 - Layer cascade colors (SearchPageTest)
- 🎨 - Rendering operations

### Debug Tag Prefixes
- `[DEBUG]` - General debugging
- `[SearchPage]` - Main search page context
- `[SearchPageTest]` - Test page context
- `[PropertyCard]` - Property card component
- `[GoogleMap]` - Map component
- `[useSearchPageLogic]` - Logic hook

### Categories of Logging

1. **Data Flow Logging** (High Volume)
   - Query results and counts
   - Data transformation steps
   - State updates

2. **Coordinate Validation** (Medium Volume)
   - Listings without coordinates
   - Coordinate parsing failures
   - Valid coordinate confirmations

3. **User Interaction Logging** (Low Volume)
   - Marker clicks
   - Modal interactions
   - Auth events

4. **Error Handling** (Essential - Keep)
   - Supabase query errors
   - Parse failures
   - Auth errors

---

## Recommendations

### Keep (Essential for Production Debugging)
- All `console.error` statements (error handling)
- Critical `console.warn` statements (data validation issues)

### Remove or Make Conditional (Noisy)
- Per-listing transformation logs
- Per-marker creation logs
- Sample data logs (first 3 listings)
- Success confirmation logs for normal operations
- Layer cascade detailed logging (SearchPageTest)
- URL change logging
- Coordinate coverage statistics

### Already Conditional (Dev-Only)
Some logs are already wrapped in `import.meta.env.DEV`:
- Duplicate fetch prevention logs in SearchPage.jsx (lines 1008, 1015, 1024)

### Suggested Approach
Create a debug utility that can be toggled:
```javascript
// utils/debug.js
export const searchDebug = {
  enabled: import.meta.env.DEV && localStorage.getItem('DEBUG_SEARCH') === 'true',
  log: (...args) => searchDebug.enabled && console.log(...args),
  warn: (...args) => searchDebug.enabled && console.warn(...args),
};
```
