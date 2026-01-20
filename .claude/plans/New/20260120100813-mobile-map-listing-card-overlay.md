# Implementation Plan: Mobile Map Listing Card Overlay

## Overview

This plan implements a listing card overlay on the mobile map view for the search page. Currently, when a user clicks a marker on the mobile map, the map closes and scrolls to the listing card in the list view. The desired behavior is to display the listing card overlay directly on the map (matching the existing desktop behavior) without navigating away from the map view.

## Success Criteria

- [ ] Clicking a marker on mobile map displays the `ListingCardForMap` component as an overlay on the map
- [ ] User remains in the mobile map view after clicking a marker (no navigation/closing)
- [ ] Card overlay displays with proper positioning (above the marker with arrow pointing down)
- [ ] Card overlay includes all functionality: photo gallery, View Details, Message button, Favorite button
- [ ] Card overlay can be dismissed by clicking the X button or tapping elsewhere on the map
- [ ] Behavior matches the existing desktop map implementation
- [ ] Card is properly styled for mobile viewport (uses existing responsive CSS in ListingCardForMap.css)

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component containing mobile map modal | Modify `onMarkerClick` handler for mobile map to show overlay instead of closing |
| `app/src/islands/shared/GoogleMap.jsx` | Google Map component with marker click handling and card overlay logic | No changes needed - already renders ListingCardForMap overlay |
| `app/src/islands/shared/ListingCard/ListingCardForMap.jsx` | Listing card overlay component | No changes needed - already has mobile-responsive styles |
| `app/src/islands/shared/ListingCard/ListingCardForMap.css` | Styling for the listing card overlay | No changes needed - already has responsive breakpoints for 768px and 480px |
| `app/src/styles/components/search-page.css` | Search page CSS including mobile map modal styles | May need minor adjustments to ensure overlay renders above other elements |

### Related Documentation

- [SEARCH_QUICK_REFERENCE.md](.claude/Documentation/Pages/SEARCH_QUICK_REFERENCE.md) - Comprehensive search page documentation
- [miniCLAUDE.md](.claude/Documentation/miniCLAUDE.md) - Project patterns and architecture

### Existing Patterns to Follow

1. **Desktop Map Card Overlay Pattern**: The `GoogleMap.jsx` component already implements the full card overlay logic:
   - State: `selectedListingForCard`, `cardVisible`, `cardPosition`, `isLoadingListingDetails`
   - Click handler: `handlePinClick` calculates position, fetches listing details, and shows card
   - Render: `ListingCardForMap` rendered conditionally when `cardVisible && !simpleMode`

2. **Mobile Map Current Behavior** (lines 2962-2967 in SearchPage.jsx):
   ```javascript
   onMarkerClick={(listing) => {
     logger.debug('Marker clicked:', listing.title);
     // Close mobile map and scroll to listing
     setMobileMapVisible(false);
     setTimeout(() => scrollToListingCard(listing), 300);
   }}
   ```

3. **Desktop Map Behavior** (lines 2834-2837 in SearchPage.jsx):
   ```javascript
   onMarkerClick={(listing) => {
     logger.debug('Marker clicked:', listing.title);
     scrollToListingCard(listing);
   }}
   ```

## Implementation Steps

### Step 1: Update Mobile Map onMarkerClick Handler

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Remove the behavior that closes the mobile map when a marker is clicked. The GoogleMap component already handles showing the listing card overlay internally - we just need to stop preventing it.

**Details:**
- Locate the mobile map modal section (around line 2941-2985)
- Modify the `onMarkerClick` handler to NOT close the mobile map (`setMobileMapVisible(false)`)
- Optionally keep a console log for debugging
- The GoogleMap component's internal `handlePinClick` will handle displaying the card overlay

**Current Code (lines 2962-2967):**
```javascript
onMarkerClick={(listing) => {
  logger.debug('Marker clicked:', listing.title);
  // Close mobile map and scroll to listing
  setMobileMapVisible(false);
  setTimeout(() => scrollToListingCard(listing), 300);
}}
```

**New Code:**
```javascript
onMarkerClick={(listing) => {
  logger.debug('[Mobile Map] Marker clicked:', listing.title);
  // Let GoogleMap component handle showing the listing card overlay
  // Do NOT close the mobile map - user stays in map view
}}
```

**Validation:**
- Open search page on mobile viewport (or device)
- Open mobile map view
- Click a marker
- Verify the listing card overlay appears on the map
- Verify the mobile map modal stays open

### Step 2: Verify CSS z-index Hierarchy

**Files:** `app/src/styles/components/search-page.css`
**Purpose:** Ensure the listing card overlay renders above the mobile map modal header but below any close buttons

**Details:**
- Review current z-index values:
  - `.mobile-map-modal`: z-index 3000
  - `.mobile-map-header`: z-index 3001
  - `.mobile-map-close-btn`: z-index 3002
- The `ListingCardForMap` renders at z-index 1000 (from component inline styles)
- Since the card is rendered INSIDE the GoogleMap component which is inside `.mobile-map-content`, the z-index should work correctly within the stacking context
- Verify that the card appears correctly positioned above the map

**Validation:**
- Test that the card overlay is visible above the map tiles
- Test that the mobile map header (with close button) remains accessible
- Test that clicking the close button on the header still closes the mobile map modal

### Step 3: Test Card Interaction Flows

**Files:** No code changes - testing only
**Purpose:** Verify all card interactions work correctly in mobile map view

**Test Cases:**
1. **Card Display**: Click marker, verify card appears with correct listing data
2. **Photo Gallery**: Navigate through photos using arrow buttons
3. **View Details**: Click "View Details" - should open listing in new tab
4. **Message Button**: Click "Message" - should open contact modal
5. **Favorite Button**: Toggle favorite (if logged in) - should update state
6. **Close Card**: Click X button - should dismiss card
7. **Click Elsewhere**: Click on map (not on card) - should dismiss card
8. **Multiple Markers**: Click different marker - should show new listing's card
9. **Card Positioning**: Verify card appears above marker with arrow pointing down
10. **Map Panning**: If marker is near top of viewport, verify map pans to make room for card

**Validation:** All test cases pass without errors

## Edge Cases & Error Handling

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Marker clicked when another card is open | Previous card closes, new card opens |
| Listing has no photos | Card should not display (existing behavior in GoogleMap.jsx) |
| Marker near top edge of map | Map should pan down to create space for card (existing behavior) |
| Marker near left/right edge | Card position should be adjusted to stay within bounds (existing behavior) |
| Slow network - photo fetch | Loading spinner shown in card position (existing behavior) |
| User logs out while card is open | Card stays visible but favorite button updates state |

## Testing Considerations

### Manual Testing Checklist

1. **Mobile Browser Testing** (Chrome DevTools Mobile Simulation):
   - [ ] iPhone SE (375x667)
   - [ ] iPhone 12 Pro (390x844)
   - [ ] Pixel 5 (393x851)
   - [ ] iPad (768x1024)

2. **Functional Tests**:
   - [ ] Card appears on marker click
   - [ ] Card displays correct listing information
   - [ ] Photo navigation works
   - [ ] View Details opens correct listing
   - [ ] Message button opens contact modal
   - [ ] Favorite toggle works (when logged in)
   - [ ] Card dismisses on X click
   - [ ] Card dismisses on map click
   - [ ] Map remains open after card interaction

3. **Visual Tests**:
   - [ ] Card is properly sized for mobile viewport
   - [ ] Arrow points to marker
   - [ ] Card does not overflow viewport edges
   - [ ] Loading state displays correctly

### Regression Testing

- [ ] Desktop map behavior unchanged
- [ ] Mobile map close button still works
- [ ] Mobile filter bar still works
- [ ] Listing cards in list view still scrollable

## Rollback Strategy

If issues arise:
1. Revert the `onMarkerClick` handler change in SearchPage.jsx
2. Restore original behavior: `setMobileMapVisible(false)` followed by scroll

## Dependencies & Blockers

- **No blockers identified**: All required components and infrastructure already exist
- **Dependencies**:
  - GoogleMap.jsx must have working `handlePinClick` and card overlay logic (verified - it does)
  - ListingCardForMap.jsx must have responsive CSS (verified - it does)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Card renders off-screen on small viewports | Low | Medium | Existing position calculation handles edge cases; test on various devices |
| Performance impact from card rendering | Low | Low | Card is lightweight; already works on desktop |
| Z-index conflicts with mobile modal | Low | Medium | Verify stacking context; adjust if needed |
| Touch interaction issues | Low | Medium | Test on actual devices; card is already touch-friendly |

## Implementation Notes

### Why This Approach Works

The GoogleMap component is designed to be self-contained - it already manages:
1. Marker click detection via `createPriceMarker` event listeners
2. Card position calculation via `handlePinClick`
3. Card state management (`selectedListingForCard`, `cardVisible`, `cardPosition`)
4. Card rendering via `ListingCardForMap` component

The current mobile implementation bypasses this by having SearchPage close the modal and scroll to listing cards instead. By simply removing that bypass behavior, the existing card overlay logic in GoogleMap will work automatically.

### Alternative Considered (Not Recommended)

An alternative would be to implement separate card state and rendering in SearchPage for the mobile map modal. This was rejected because:
1. Duplicates existing logic in GoogleMap
2. More code to maintain
3. Higher risk of behavior divergence between desktop and mobile
4. The existing GoogleMap implementation is already mobile-responsive

## Files Summary

| File Path | Action |
|-----------|--------|
| `app/src/islands/pages/SearchPage.jsx` | MODIFY - Update mobile map `onMarkerClick` handler (2 lines) |
| `app/src/islands/shared/GoogleMap.jsx` | NO CHANGE - Already implements card overlay |
| `app/src/islands/shared/ListingCard/ListingCardForMap.jsx` | NO CHANGE - Already has mobile styles |
| `app/src/islands/shared/ListingCard/ListingCardForMap.css` | NO CHANGE - Already has responsive breakpoints |
| `app/src/styles/components/search-page.css` | VERIFY - Check z-index if issues arise |

---

**Plan Version**: 1.0
**Created**: 2026-01-20
**Author**: Claude (Implementation Planner)
**Estimated Implementation Time**: 15-30 minutes
**Complexity**: Low - single handler modification leveraging existing infrastructure
