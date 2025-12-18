# Design Implementation Plan: Fullscreen Map Popup for Guest Proposals Page

## 1. Overview

- **Description**: Implement a fullscreen map popup modal on the guest proposals page that displays all of the current user's proposal locations with pricing information. The map should highlight the currently selected proposal's pin distinctly from other proposals.
- **User's Vision**: A "View Map" button (already exists in ProposalCard) triggers a nearly fullscreen map modal showing all user proposals as pins with prices. The current proposal is visually emphasized while other proposals are de-emphasized but still visible.
- **Scope Boundaries**:
  - **IN SCOPE**: New fullscreen map modal component, fetching all user proposals for map display, differentiated pin styling (highlighted vs. normal), price display on pins
  - **NOT IN SCOPE**: Modifying the existing MapModal component (will be replaced by the new fullscreen modal), editing proposal data, navigation to proposals from map clicks

---

## 2. Reference Analysis

### Key Visual Characteristics Identified

[FROM CODEBASE] The project uses `@react-google-maps/api` for Google Maps integration (confirmed in `miniCLAUDE.md` and `package.json`).

[FROM CODEBASE] Existing `GoogleMap.jsx` component (`app/src/islands/shared/GoogleMap.jsx`) has:
- Price marker overlay implementation using `google.maps.OverlayView`
- Custom price pill styling (rounded, colored background with price text)
- Support for multiple marker types (green for all listings, purple for filtered/selected)
- Marker click handling with listing cards

[FROM CODEBASE] Existing colors from `constants.js`:
- PRIMARY: `#31135d` (Deep purple) - use for highlighted/current proposal
- SECONDARY: `#5B21B6` (Purple) - alternative purple
- SUCCESS: `#00C851` (Green) - for secondary/other proposals

[FROM CODEBASE] The existing `MapModal.jsx` is a placeholder without actual Google Maps integration - shows a decorative placeholder instead.

[FROM CODEBASE] `FavoriteListingsPage/MapView.jsx` uses Leaflet (different approach) with price pins - provides reference for price pin styling patterns.

### Design System Alignment

[FROM CODEBASE] Font: 'Lato', 'Inter' (from existing components)
[FROM CODEBASE] Border radius: 12px-20px for cards/modals, 20px for pill shapes
[FROM CODEBASE] Box shadows: `0 2px 6px rgba(0,0,0,0.2)` for markers, `0 4px 20px rgba(0,0,0,0.15)` for modals

---

## 3. Existing Codebase Integration

### Relevant Existing Components to Reuse/Extend

| Component | Location | Usage |
|-----------|----------|-------|
| `GoogleMap.jsx` | `app/src/islands/shared/GoogleMap.jsx` | Reference for Google Maps integration pattern, price marker overlay implementation |
| `ProposalCard.jsx` | `app/src/islands/pages/proposals/ProposalCard.jsx` | Contains "View Map" button (line 956-958) that triggers the modal |
| `useGuestProposalsPageLogic.js` | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Provides `proposals` array and `selectedProposal` for map data |
| `MapModal.jsx` | `app/src/islands/modals/MapModal.jsx` | Will be replaced/enhanced with new fullscreen implementation |

### Existing Styling Patterns to Follow

[FROM CODEBASE] Modal pattern from `MapModal.jsx`:
```jsx
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="flex items-center justify-center min-h-screen">
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75" /> // Backdrop
    <div className="... rounded-lg shadow-xl"> // Modal content
```

[FROM CODEBASE] Price marker pattern from `GoogleMap.jsx` (lines 855-967):
- Uses `google.maps.OverlayView` for custom DOM markers
- Pill-shaped background with centered price text
- CSS transitions for hover effects
- Z-index layering for marker priority

### Files That Will Be Affected

| File | Change Type | Description |
|------|-------------|-------------|
| `app/src/islands/modals/FullscreenProposalMapModal.jsx` | NEW | New fullscreen map modal component |
| `app/src/islands/modals/FullscreenProposalMapModal.css` | NEW | Styles for the fullscreen map modal |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | MODIFY | Update to use new modal, pass all proposals |
| `app/src/islands/pages/GuestProposalsPage.jsx` | MODIFY | Pass proposals array to ProposalCard for map context |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | MODIFY (minor) | May need to expose proposal coordinates extraction |

### Utilities and Helpers Available

[FROM CODEBASE] `app/src/lib/mapUtils.js`:
- `fitBoundsToMarkers(map, markers)` - Fit map to show all markers
- `calculateMapCenter(listings)` - Calculate center from coordinates
- `isValidCoordinates(coordinates)` - Validate lat/lng
- `waitForGoogleMaps(timeout)` - Wait for API to load

[FROM CODEBASE] `app/src/lib/constants.js`:
- `COLORS.PRIMARY` (`#31135d`) - Current proposal pin
- `COLORS.SUCCESS` (`#00C851`) - Other proposals pins
- `getBoroughMapConfig(borough)` - Get map center/zoom for NYC boroughs

---

## 4. Component Specifications

### 4.1 FullscreenProposalMapModal (NEW)

**Purpose**: Display all user proposals on a fullscreen Google Map with differentiated pricing pins

**Props**:
```typescript
interface FullscreenProposalMapModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;                // Close handler
  proposals: Proposal[];              // All user proposals for map display
  currentProposalId: string;          // ID of currently selected proposal (highlighted)
}
```

**Visual Specifications**:

| Property | Value | Source |
|----------|-------|--------|
| Modal backdrop | `rgba(0, 0, 0, 0.75)` | [FROM CODEBASE] Matches existing modals |
| Modal position | Fixed, full viewport | [FROM REFERENCE] User requested "nearly fullscreen" |
| Modal padding | 20px from viewport edges | [SUGGESTED] Provides visual breathing room |
| Modal content background | `#FFFFFF` | [FROM CODEBASE] |
| Border radius | 12px | [FROM CODEBASE] Modal pattern |
| Z-index | 1000 | [FROM CODEBASE] Modal layer |
| Close button position | Top-right, 16px from edges | [FROM CODEBASE] MapModal pattern |
| Close button size | 40px x 40px | [FROM CODEBASE] |
| Close button style | Circle, white bg, gray icon, hover: gray bg | [FROM CODEBASE] |

**Map Container Specifications**:

| Property | Value |
|----------|-------|
| Width | calc(100vw - 40px) |
| Height | calc(100vh - 140px) - accounts for header |
| Border radius | 12px |
| Min height | 400px |

**Header Specifications**:

| Property | Value |
|----------|-------|
| Height | 60px |
| Background | `#FFFFFF` |
| Border bottom | 1px solid `#E5E7EB` |
| Title font | Lato, 18px, weight 600, color `#1a1a1a` |
| Title text | "Your Proposals" |
| Subtitle font | Lato, 14px, weight 400, color `#6b7280` |
| Subtitle text | "{count} proposals" |
| Padding | 16px 20px |

**States**:
- **Loading**: Show centered spinner while map initializes
- **Empty**: If no proposals have valid coordinates, show message "No proposal locations available"
- **Loaded**: Display map with all proposal pins

### 4.2 ProposalPriceMarker (Custom Overlay)

**Purpose**: Display proposal price as a styled pin on the map

**Visual Specifications - Highlighted Pin (Current Proposal)**:

| Property | Value | Source |
|----------|-------|--------|
| Background color | `#31135d` (PRIMARY) | [FROM CODEBASE] Brand purple |
| Text color | `#FFFFFF` | [FROM CODEBASE] White on purple |
| Font family | 'Inter', sans-serif | [FROM CODEBASE] |
| Font size | 14px | [FROM CODEBASE] GoogleMap.jsx |
| Font weight | 700 (bold) | [FROM CODEBASE] |
| Padding | 8px 14px | [SUGGESTED] Slightly larger for emphasis |
| Border radius | 20px (pill shape) | [FROM CODEBASE] |
| Box shadow | 0 4px 12px rgba(49, 19, 93, 0.4) | [SUGGESTED] Purple-tinted shadow |
| Border | 3px solid `#FFFFFF` | [SUGGESTED] White border for contrast |
| Transform | scale(1.1) | [SUGGESTED] Slightly larger |
| Z-index | 1002 | Higher than other markers |
| Animation | Gentle pulse (optional) | [SUGGESTED] Draw attention |

**Visual Specifications - Normal Pin (Other Proposals)**:

| Property | Value | Source |
|----------|-------|--------|
| Background color | `#FFFFFF` | [FROM CODEBASE] FavoriteListingsPage pattern |
| Text color | `#31135d` (PRIMARY) | [FROM CODEBASE] |
| Font family | 'Inter', sans-serif | [FROM CODEBASE] |
| Font size | 12px | [FROM CODEBASE] Smaller than highlighted |
| Font weight | 600 | [FROM CODEBASE] |
| Padding | 6px 10px | [FROM CODEBASE] |
| Border radius | 16px (pill shape) | [FROM CODEBASE] |
| Box shadow | 0 2px 6px rgba(0, 0, 0, 0.15) | [FROM CODEBASE] |
| Border | 2px solid `#E5E7EB` | [SUGGESTED] Subtle gray border |
| Opacity | 0.85 | [SUGGESTED] Slightly faded |
| Z-index | 1001 | Below highlighted marker |

**Hover State (Both Types)**:

| Property | Value |
|----------|-------|
| Transform | scale(1.05) |
| Box shadow | 0 4px 12px rgba(0, 0, 0, 0.2) |
| Transition | all 0.2s ease |
| Cursor | pointer |

**Click Behavior**:
- On click, navigate to that proposal (update URL and selectedProposal)
- Close the map modal after navigation

**Price Display Format**:
- Format: `$XXX` or `$X,XXX` (no cents for whole numbers)
- Use `formatPrice` utility from `dataTransformers.js`

### 4.3 ProposalCard Modifications

**Current State** (line 956-958):
```jsx
<button
  className="btn-action btn-map"
  onClick={() => setShowMapModal(true)}
>
  View Map
</button>
```

**Required Changes**:
- Pass `allProposals` prop to ProposalCard
- Update modal to use new FullscreenProposalMapModal
- Pass `currentProposalId` (current proposal._id)

---

## 5. Layout & Composition

### Modal Structure

```
+---------------------------------------------------------------+
|  [X]                                                          |
+---------------------------------------------------------------+
|  Header: "Your Proposals" (subtitle: "5 proposals")           |
+---------------------------------------------------------------+
|                                                               |
|                                                               |
|                      GOOGLE MAP                               |
|                                                               |
|     [Other Pin: $150]                                         |
|                          [HIGHLIGHTED PIN: $200]              |
|                                                               |
|              [Other Pin: $175]                                |
|                                                               |
|                                     [Other Pin: $225]         |
|                                                               |
+---------------------------------------------------------------+
```

### Z-Index Layering

| Element | Z-Index |
|---------|---------|
| Modal backdrop | 999 |
| Modal content | 1000 |
| Normal proposal pins | 1001 |
| Highlighted proposal pin | 1002 |
| Close button | 1003 |

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (>1024px) | Full viewport - 40px padding |
| Tablet (768-1024px) | Full viewport - 24px padding |
| Mobile (<768px) | Full viewport - 16px padding, header height reduced to 50px |

---

## 6. Interactions & Animations

### Modal Open/Close

| Animation | Property | Duration | Easing |
|-----------|----------|----------|--------|
| Backdrop fade in | opacity 0 -> 0.75 | 200ms | ease-out |
| Modal scale in | transform: scale(0.95) -> scale(1) | 200ms | ease-out |
| Modal fade in | opacity 0 -> 1 | 200ms | ease-out |
| Backdrop fade out | opacity 0.75 -> 0 | 150ms | ease-in |
| Modal scale out | transform: scale(1) -> scale(0.95) | 150ms | ease-in |
| Modal fade out | opacity 1 -> 0 | 150ms | ease-in |

### Pin Animations

| Animation | Trigger | Property | Duration |
|-----------|---------|----------|----------|
| Pin appear | Map load | opacity 0 -> 1, translateY(10px) -> 0 | 300ms staggered |
| Highlighted pulse | Continuous (optional) | box-shadow pulse | 2s infinite |
| Hover scale | Mouse enter | scale(1) -> scale(1.05) | 150ms |
| Click feedback | Click | scale(0.95) -> scale(1) | 100ms |

### Map Interactions

| Interaction | Behavior |
|-------------|----------|
| Initial load | Auto-fit bounds to show all proposal pins with padding |
| Pin click | Navigate to that proposal, close modal |
| Map drag/zoom | Standard Google Maps behavior |
| ESC key | Close modal |
| Backdrop click | Close modal |

---

## 7. Assets Required

### Icons (Existing in Codebase)

| Icon | Source | Usage |
|------|--------|-------|
| X (Close) | Inline SVG (MapModal pattern) | Close button |
| Map Pin | lucide-react `MapPin` (available) | Header decoration (optional) |

### Fonts (Existing)

- Lato (primary)
- Inter (alternative)

### Images

None required - all visual elements are CSS/SVG-based.

---

## 8. Data Flow

### Fetching All User Proposals

The `useGuestProposalsPageLogic` hook already fetches all proposals for the current user in `initializePage()`:

```javascript
// Line 151 in useGuestProposalsPageLogic.js
const proposalsData = await fetchProposalsByGuest(userId);
setProposals(proposalsData);
```

### Extracting Proposal Coordinates

Each proposal has a linked listing with location data. The coordinate extraction pattern (from ProposalCard):

```javascript
// Priority: 'Location - slightly different address' (privacy) -> 'Location - Address'
const getListingAddress = (listing) => {
  let locationData = listing['Location - slightly different address'];
  if (!locationData) {
    locationData = listing['Location - Address'];
  }
  // Parse JSONB if string
  if (typeof locationData === 'string') {
    locationData = JSON.parse(locationData);
  }
  return {
    lat: locationData?.lat,
    lng: locationData?.lng,
    address: locationData?.address
  };
};
```

### Data Transformation for Map

```javascript
const mapProposals = proposals
  .filter(proposal => {
    const location = getListingAddress(proposal.listing);
    return location?.lat && location?.lng;
  })
  .map(proposal => ({
    id: proposal._id,
    coordinates: {
      lat: getListingAddress(proposal.listing).lat,
      lng: getListingAddress(proposal.listing).lng
    },
    price: proposal['hc nightly price'] || proposal['proposal nightly price'] || 0,
    listingName: proposal.listing?.Name || 'Listing',
    isHighlighted: proposal._id === currentProposalId
  }));
```

### Component Data Flow

```
GuestProposalsPage
    |
    +-- proposals (from useGuestProposalsPageLogic)
    +-- selectedProposal
    |
    v
ProposalCard
    |
    +-- proposal (current)
    +-- allProposals (NEW prop - all proposals for map)
    |
    v
FullscreenProposalMapModal
    |
    +-- proposals (all user proposals)
    +-- currentProposalId (highlighted)
    |
    v
ProposalPriceMarker (per proposal)
    |
    +-- price, coordinates, isHighlighted
```

---

## 9. Implementation Sequence

### Phase 1: Create FullscreenProposalMapModal Component

1. Create `app/src/islands/modals/FullscreenProposalMapModal.jsx`
2. Create `app/src/islands/modals/FullscreenProposalMapModal.css`
3. Implement modal structure (backdrop, content, header, close button)
4. Implement Google Maps initialization (reuse pattern from GoogleMap.jsx)
5. Add loading and empty states

### Phase 2: Implement Price Pin Markers

6. Create `createProposalPriceMarker` function using `google.maps.OverlayView`
7. Implement differentiated styling (highlighted vs. normal)
8. Add hover effects and click handlers
9. Implement auto-fit bounds to show all markers

### Phase 3: Integrate with GuestProposalsPage

10. Update `GuestProposalsPage.jsx` to pass `proposals` array to ProposalCard
11. Update `ProposalCard.jsx` to accept `allProposals` prop
12. Replace MapModal usage with FullscreenProposalMapModal
13. Wire up pin click to proposal navigation

### Phase 4: Polish and Testing

14. Add animations (modal open/close, pin appearance)
15. Test responsive behavior
16. Test with various proposal counts (1, 5, 20+)
17. Test with proposals missing coordinates

---

## 10. Assumptions & Clarifications Needed

### Assumptions Made

1. **[SUGGESTED]** Pin click should navigate to that proposal (close modal, update URL, load proposal details) - alternative could be to show a popup with info.

2. **[SUGGESTED]** The "View Map" button in ProposalCard should open this new fullscreen modal instead of the existing MapModal.

3. **[SUGGESTED]** All proposals for the current user should be shown, regardless of status (active, cancelled, etc.) - could filter to only active proposals.

4. **[SUGGESTED]** Price displayed is the nightly price (consistent with existing ProposalCard display).

5. **[SUGGESTED]** Pulse animation on highlighted pin is optional - can be omitted for cleaner look.

### Clarifications Needed

1. **[NEEDS CLARIFICATION]** Should clicking on a pin close the modal and navigate, or should it show a mini-popup with proposal details first?

2. **[NEEDS CLARIFICATION]** Should cancelled/rejected proposals be shown on the map or filtered out?

3. **[NEEDS CLARIFICATION]** Should the highlighted (current) proposal pin have a pulse animation to draw attention, or is size/color differentiation sufficient?

4. **[NEEDS CLARIFICATION]** Should the modal have a "Select Proposal" dropdown at the top to allow switching proposals while keeping map open?

---

## 11. File References

### Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/src/islands/modals/FullscreenProposalMapModal.jsx` | New modal component |
| `app/src/islands/modals/FullscreenProposalMapModal.css` | Modal styles |

### Files to Modify

| File Path | Purpose |
|-----------|---------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Add allProposals prop, use new modal |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Pass proposals to ProposalCard |

### Reference Files (Read-Only)

| File Path | Purpose |
|-----------|---------|
| `app/src/islands/shared/GoogleMap.jsx` | Reference for Google Maps integration, price marker pattern |
| `app/src/islands/modals/MapModal.jsx` | Reference for modal structure |
| `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Understand proposal data structure |
| `app/src/islands/pages/FavoriteListingsPage/components/MapView.jsx` | Reference for price pin styling |
| `app/src/islands/pages/FavoriteListingsPage/components/MapView.css` | Reference for price pin CSS |
| `app/src/lib/constants.js` | Color constants (COLORS.PRIMARY, COLORS.SUCCESS) |
| `app/src/lib/mapUtils.js` | Map utility functions |

---

## 12. Quality Checklist

- [x] Every visual property has a specific value
- [x] All interactive states documented (hover, click, focus)
- [x] Responsive behavior defined for all breakpoints
- [x] Existing components and patterns referenced
- [x] Assumptions clearly marked
- [x] Plan is implementable without additional context
- [x] Accessibility considerations included (keyboard nav: ESC to close, focusable close button)

---

**Plan Version**: 1.0
**Created**: 2025-12-17
**Author**: Design Implementation Planner
