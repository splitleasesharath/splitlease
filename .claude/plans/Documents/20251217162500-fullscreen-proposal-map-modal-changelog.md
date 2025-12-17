# Implementation Changelog

**Plan Executed**: 20251217150000-design-fullscreen-map-popup-guest-proposals.md
**Execution Date**: 2025-12-17
**Status**: Complete

## Summary

Implemented a fullscreen map modal for the Guest Proposals page that displays all active user proposals with price pin markers on Google Maps. The current proposal is highlighted with a purple pulsing pin, while other proposals appear as smaller white pins. Users can switch highlighted proposals via a dropdown and click pins to navigate to that proposal.

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| app/src/islands/modals/FullscreenProposalMapModal.jsx | Created | New fullscreen map modal component |
| app/src/islands/modals/FullscreenProposalMapModal.css | Created | Styles for the fullscreen map modal |
| app/src/islands/pages/proposals/ProposalCard.jsx | Modified | Updated to use new modal and accept allProposals prop |
| app/src/islands/pages/GuestProposalsPage.jsx | Modified | Pass proposals array and handler to ProposalCard |

## Detailed Changes

### FullscreenProposalMapModal.jsx (NEW)

- **File**: `app/src/islands/modals/FullscreenProposalMapModal.jsx`
- **Purpose**: Display all user proposals on a fullscreen Google Map with differentiated pricing pins
- **Features Implemented**:
  - Google Maps integration using `google.maps.OverlayView` pattern from GoogleMap.jsx
  - Custom price pin markers with two styles (highlighted vs normal)
  - Proposal filtering to only show ACTIVE proposals (filters out cancelled/rejected/expired)
  - Coordinate extraction from proposal listings (privacy-adjusted or main address)
  - Proposal selector dropdown in header to switch highlighted proposal
  - Pin click handler that closes modal and navigates to selected proposal
  - Auto-fit bounds to show all proposal markers
  - ESC key and backdrop click to close modal
  - Loading and empty states

### FullscreenProposalMapModal.css (NEW)

- **File**: `app/src/islands/modals/FullscreenProposalMapModal.css`
- **Purpose**: All styles for the fullscreen map modal
- **Visual Specifications**:
  - Modal: Fullscreen with 20px padding, white background, 12px border radius
  - Header: 60px height, title "Your Proposals", proposal count subtitle, dropdown selector
  - Highlighted pin: Purple (#31135d), white text, 14px bold, 8px 14px padding, 20px border radius, pulse animation
  - Normal pin: White background, purple text, 12px semibold, 6px 10px padding, 16px border radius, 0.85 opacity
  - Pulse animation: 2s infinite animation with expanding box-shadow
  - Responsive breakpoints: tablet (1024px), mobile (768px), small mobile (480px)

### ProposalCard.jsx (MODIFIED)

- **Change**: Import FullscreenProposalMapModal instead of MapModal
- **Change**: Accept new props `allProposals` and `onProposalSelect`
- **Change**: Replace MapModal usage with FullscreenProposalMapModal
- **Impact**: The "View Map" button now opens the fullscreen modal with all proposals displayed

### GuestProposalsPage.jsx (MODIFIED)

- **Change**: Pass `allProposals={proposals}` to ProposalCard
- **Change**: Pass `onProposalSelect={handleProposalSelect}` to ProposalCard
- **Impact**: ProposalCard now has access to all proposals for map display and can navigate between them

## User's Design Decisions Applied

1. **Pin click behavior**: Close modal and navigate to selected proposal - IMPLEMENTED
2. **Proposal filtering**: Only show ACTIVE proposals (filter out cancelled/rejected) - IMPLEMENTED
3. **Pulse animation**: YES - subtle pulse animation on highlighted pin - IMPLEMENTED
4. **Proposal selector dropdown**: YES - dropdown in header to switch proposals - IMPLEMENTED

## Technical Details

### Pin Styling

| Property | Highlighted Pin | Normal Pin |
|----------|-----------------|------------|
| Background | #31135d (purple) | #ffffff (white) |
| Text color | #ffffff (white) | #31135d (purple) |
| Font size | 14px | 12px |
| Font weight | 700 (bold) | 600 |
| Padding | 8px 14px | 6px 10px |
| Border radius | 20px | 16px |
| Border | 3px solid white | 2px solid #e5e7eb |
| Box shadow | 0 4px 12px rgba(49,19,93,0.4) | 0 2px 6px rgba(0,0,0,0.15) |
| Opacity | 1 | 0.85 |
| Z-index | 1002 | 1001 |
| Animation | pulse 2s infinite | none |

### Proposal Filtering Logic

```javascript
// Filter out terminal statuses using isTerminalStatus from proposalStatuses.js
function filterActiveProposals(proposals) {
  return proposals.filter(proposal => {
    const status = proposal.Status;
    return !isTerminalStatus(status);
  });
}
```

### Coordinate Extraction Priority

1. `listing['Location - slightly different address']` (privacy-adjusted)
2. `listing['Location - Address']` (fallback)
3. Parse JSON if string, extract lat/lng

## Git Commits

1. `18ecc412` - feat(proposals): Add fullscreen map modal showing all proposal locations

## Verification Steps Completed

- [x] FullscreenProposalMapModal.jsx created with Google Maps integration
- [x] FullscreenProposalMapModal.css created with all specified styles
- [x] ProposalCard.jsx updated to use new modal
- [x] GuestProposalsPage.jsx updated to pass proposals array
- [x] Highlighted pin has pulse animation
- [x] Normal pins are smaller and faded
- [x] Proposal selector dropdown in header
- [x] Only active proposals shown (terminal statuses filtered)
- [x] Pin click closes modal and navigates to proposal
- [x] Responsive styles for tablet and mobile

## Notes & Observations

1. **Coordinate Extraction**: Reused the existing pattern from ProposalCard for extracting coordinates with privacy preference
2. **Status Filtering**: Leveraged existing `isTerminalStatus` function from proposalStatuses.js for filtering
3. **Price Formatting**: Uses the existing `getProposalPrice` pattern that handles counteroffers
4. **Google Maps Pattern**: Followed the OverlayView pattern from GoogleMap.jsx for custom markers
5. **Modal Pattern**: Followed existing modal patterns (MapModal, HostProfileModal) for structure

## Dependencies

- Google Maps JavaScript API (already loaded in app)
- `app/src/lib/mapUtils.js` - waitForGoogleMaps, isValidCoordinates
- `app/src/lib/constants.js` - COLORS, getBoroughMapConfig
- `app/src/logic/constants/proposalStatuses.js` - isTerminalStatus
- `app/src/lib/proposals/dataTransformers.js` - formatPrice
