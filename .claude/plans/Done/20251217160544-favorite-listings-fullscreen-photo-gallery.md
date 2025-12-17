# Implementation Plan: Add Fullscreen Photo Gallery to Favorites Page

## Overview

This plan adds fullscreen photo gallery functionality to the FavoriteListingsPage so that when users click on listing photos, a fullscreen modal opens (replicating the ViewSplitLeasePage behavior) instead of navigating away to the listing detail page. Non-photo areas of the card should continue to navigate to the listing detail page as before.

## Success Criteria

- [ ] Photo clicks on listing cards open fullscreen gallery modal
- [ ] Fullscreen gallery shows current photo with Previous/Next navigation and counter
- [ ] Gallery can be closed via X button, backdrop click, or Close button
- [ ] Other card areas (title, location, content, etc.) still navigate to view-split-lease page
- [ ] Existing button functionality (Message, Create/View Proposal, Favorite) unchanged
- [ ] Navigation arrow buttons on photo carousel still work without opening gallery
- [ ] Mobile responsive behavior matches ViewSplitLeasePage gallery modal
- [ ] ESC key closes the gallery modal

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Main favorites page component with PropertyCard | Add photo modal state, handler, modal JSX; modify PropertyCard to separate photo/card clicks |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Reference implementation | SOURCE - Extract photo modal pattern (lines 764-765 state, 1124-1127 handler, 2730-2862 JSX) |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | Page styles | Add z-index style for photo modal overlay if needed |
| `app/src/lib/constants.js` | Color constants | Reference for COLORS.TEXT_DARK in modal styling |

### Related Documentation

- `app/src/islands/pages/CLAUDE.md` - Page component patterns
- `app/CLAUDE.md` - Frontend architecture guide
- `.claude/CLAUDE.md` - Project conventions (Hollow Components, no fallbacks)

### Existing Patterns to Follow

1. **Photo Modal Pattern from ViewSplitLeasePage** (lines 2730-2862):
   - Fixed position overlay with `background: rgba(0,0,0,0.9)`
   - Click on backdrop closes modal
   - X button in top-right corner
   - Previous/Next navigation buttons with counter
   - Close button at bottom center
   - Image displayed with `maxWidth: 90vw, maxHeight: 80vh, objectFit: contain`
   - `zIndex: 1000` for modal overlay

2. **Click Stop Propagation Pattern**:
   - Image navigation buttons use `e.stopPropagation()` to prevent card navigation
   - Buttons use `e.preventDefault()` and `e.stopPropagation()`
   - FavoriteButton already handles its own click isolation

3. **State Management Pattern**:
   - `useState` for modal visibility: `showPhotoModal`
   - `useState` for current photo index: `currentPhotoIndex`
   - Handler function: `handlePhotoClick(index)` sets both states

## Implementation Steps

### Step 1: Add Photo Modal State Variables to FavoriteListingsPage

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Add state management for the fullscreen photo gallery
**Details:**
- Add `showPhotoModal` state (boolean, default false)
- Add `currentPhotoIndex` state (number, default 0)
- Add `selectedListingPhotos` state (array, stores photos of selected listing for gallery)
- Add `selectedListingName` state (string, for alt text)

**Location:** After line 461 (after `showAuthModal` state declaration)

```javascript
// Photo gallery modal state
const [showPhotoModal, setShowPhotoModal] = useState(false);
const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
const [selectedListingPhotos, setSelectedListingPhotos] = useState([]);
const [selectedListingName, setSelectedListingName] = useState('');
```

**Validation:** State variables can be logged to console to verify initialization

### Step 2: Add handlePhotoClick Handler Function

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Create handler that opens photo modal with correct listing's photos
**Details:**
- Function accepts listing object and photo index
- Sets the photos array from the clicked listing
- Sets the listing name for alt text
- Sets the current photo index
- Opens the modal

**Location:** After `handleOpenProposalModal` function (around line 897)

```javascript
// Handler to open fullscreen photo gallery
const handlePhotoGalleryOpen = (listing, photoIndex = 0) => {
  if (!listing.images || listing.images.length === 0) return;
  setSelectedListingPhotos(listing.images);
  setSelectedListingName(listing.title || 'Listing');
  setCurrentPhotoIndex(photoIndex);
  setShowPhotoModal(true);
};
```

**Validation:** Add console.log inside handler to verify it fires correctly

### Step 3: Modify PropertyCard Component to Support Photo Click Separation

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Pass photo click handler to PropertyCard and separate photo clicks from card navigation
**Details:**
- Add `onPhotoClick` prop to PropertyCard signature
- Modify image wrapper to intercept clicks BEFORE card click handler
- Photo area (img and listing-images container) clicks should call onPhotoClick
- Keep the <a> wrapper for card navigation on non-photo areas

**Changes to PropertyCard function signature (line 65):**
```javascript
function PropertyCard({
  listing,
  onLocationClick,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  isFavorited,
  onToggleFavorite,
  userId,
  proposalForListing,
  onCreateProposal,
  onPhotoClick  // NEW PROP
}) {
```

**Changes to image section (lines 193-226):**
The img element and its container need click handlers that stop propagation and call onPhotoClick.

Current structure:
```jsx
{hasImages && (
  <div className="listing-images">
    <img src={...} alt={...} />
    {/* nav buttons, counter, FavoriteButton */}
  </div>
)}
```

New structure:
```jsx
{hasImages && (
  <div className="listing-images">
    {/* Clickable image area - separate from navigation */}
    <img
      src={listing.images[currentImageIndex]}
      alt={listing.title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onPhotoClick) {
          onPhotoClick(listing, currentImageIndex);
        }
      }}
      style={{ cursor: 'pointer' }}
    />
    {/* Navigation buttons remain unchanged - they already stopPropagation */}
    {hasMultipleImages && (
      <>
        <button className="image-nav prev-btn" onClick={handlePrevImage}>‹</button>
        <button className="image-nav next-btn" onClick={handleNextImage}>›</button>
        <div className="image-counter">...</div>
      </>
    )}
    <FavoriteButton ... />
    {listing.isNew && <span className="new-badge">New Listing</span>}
  </div>
)}
```

**Validation:** Click on photo should NOT navigate to listing page, should log to console

### Step 4: Pass onPhotoClick Prop Through ListingsGrid

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Thread the photo click handler from FavoriteListingsPage through ListingsGrid to PropertyCard
**Details:**
- Add `onPhotoClick` prop to ListingsGrid signature
- Pass it through to PropertyCard

**Changes to ListingsGrid function signature (line 357):**
```javascript
function ListingsGrid({
  listings,
  onOpenContactModal,
  onOpenInfoModal,
  mapRef,
  isLoggedIn,
  onToggleFavorite,
  userId,
  proposalsByListingId,
  onCreateProposal,
  onPhotoClick  // NEW PROP
}) {
```

**Changes to PropertyCard instantiation in ListingsGrid (lines 362-379):**
```javascript
<PropertyCard
  key={listing.id}
  listing={listing}
  // ... existing props ...
  onPhotoClick={onPhotoClick}  // NEW PROP
/>
```

**Changes to ListingsGrid usage in render (lines 1261-1271):**
```javascript
<ListingsGrid
  listings={listings}
  onOpenContactModal={handleOpenContactModal}
  onOpenInfoModal={handleOpenInfoModal}
  mapRef={mapRef}
  isLoggedIn={isLoggedIn}
  onToggleFavorite={handleToggleFavorite}
  userId={userId}
  proposalsByListingId={proposalsByListingId}
  onCreateProposal={handleOpenProposalModal}
  onPhotoClick={handlePhotoGalleryOpen}  // NEW PROP
/>
```

**Validation:** Click on any listing photo should trigger handlePhotoGalleryOpen

### Step 5: Add Photo Gallery Modal JSX

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Add the fullscreen photo gallery modal UI
**Details:**
- Add modal JSX after existing modals (after ProposalSuccessModal, around line 1470)
- Mirror ViewSplitLeasePage implementation but adapt for favorites page context
- Use selectedListingPhotos array instead of listing.photos
- Use selectedListingName for alt text

**Location:** After line 1470 (before closing `</div>` of favorites-page)

```jsx
{/* Fullscreen Photo Gallery Modal */}
{showPhotoModal && selectedListingPhotos.length > 0 && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}
    onClick={() => setShowPhotoModal(false)}
  >
    {/* Close X Button - Top Right */}
    <button
      onClick={() => setShowPhotoModal(false)}
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: 'white',
        fontSize: '2rem',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002
      }}
    >
      ×
    </button>

    {/* Main Image */}
    <img
      src={selectedListingPhotos[currentPhotoIndex]}
      alt={`${selectedListingName} - photo ${currentPhotoIndex + 1}`}
      style={{
        maxWidth: '95vw',
        maxHeight: '75vh',
        objectFit: 'contain',
        marginBottom: '5rem'
      }}
      onClick={(e) => e.stopPropagation()}
    />

    {/* Navigation Controls */}
    <div style={{
      position: 'absolute',
      bottom: '4rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center',
      zIndex: 1001
    }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : selectedListingPhotos.length - 1));
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}
      >
        ← Previous
      </button>

      <span style={{
        color: 'white',
        fontSize: '0.75rem',
        minWidth: '60px',
        textAlign: 'center'
      }}>
        {currentPhotoIndex + 1} / {selectedListingPhotos.length}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setCurrentPhotoIndex(prev => (prev < selectedListingPhotos.length - 1 ? prev + 1 : 0));
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}
      >
        Next →
      </button>
    </div>

    {/* Close Button - Bottom Center */}
    <button
      onClick={() => setShowPhotoModal(false)}
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        border: 'none',
        color: '#1f2937',
        padding: '0.5rem 2rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.875rem',
        zIndex: 1001
      }}
    >
      Close
    </button>
  </div>
)}
```

**Validation:** Clicking photo should open fullscreen modal with correct image

### Step 6: Add Keyboard Support for ESC Key

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Allow users to close photo modal with ESC key
**Details:**
- Add useEffect that listens for keydown events when modal is open
- Clean up listener when modal closes or component unmounts

**Location:** After the photo modal state declarations (Step 1), add useEffect:

```javascript
// Close photo modal on ESC key press
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showPhotoModal) {
      setShowPhotoModal(false);
    }
  };

  if (showPhotoModal) {
    document.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [showPhotoModal]);
```

**Validation:** Press ESC while modal is open should close it

### Step 7: Ensure Proper Z-Index Stacking

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css`
**Purpose:** Ensure photo modal appears above all other elements
**Details:**
- The modal already uses `zIndex: 1000` inline
- Verify toast notifications (z-index: 4000) still appear above modal if needed
- No CSS changes needed if inline z-index is sufficient

**Validation:** Modal should appear above map, header, and other elements

### Step 8: Test All Click Scenarios

**Files:** N/A - Manual testing
**Purpose:** Verify all click behaviors work as expected
**Details:**
- Click on photo image: Opens fullscreen gallery (NOT navigate to listing)
- Click on Previous/Next carousel buttons: Changes photo in card (NOT open gallery)
- Click on listing title/content area: Navigates to listing page
- Click on Message button: Opens contact modal
- Click on Create/View Proposal button: Opens proposal modal or navigates
- Click on Favorite button: Toggles favorite state
- Click on location: Zooms map to listing
- Click on modal backdrop: Closes gallery
- Click on X button: Closes gallery
- Click on Close button: Closes gallery
- Press ESC key: Closes gallery

**Validation:** Each click behavior matches expected outcome

## Edge Cases & Error Handling

- **Listing with no photos**: `hasImages` check prevents rendering of photo section entirely
- **Single photo listing**: Gallery still works, Previous/Next buttons wrap around
- **Modal already open**: State prevents duplicate modals
- **Rapid clicking**: React state batching handles rapid state updates
- **Mobile viewport**: Modal uses responsive styles (padding, button sizes)

## Testing Considerations

- Test with listings that have 1, 2, 3, 5+ photos
- Test Previous/Next navigation wrapping (first→last, last→first)
- Test on mobile viewport (responsive layout)
- Test keyboard navigation (ESC key)
- Test that card navigation still works for non-photo areas
- Test that all existing buttons still function correctly

## Rollback Strategy

If issues arise, the changes are isolated to `FavoriteListingsPage.jsx`:
1. Remove the photo modal state variables (Step 1)
2. Remove the `handlePhotoGalleryOpen` handler (Step 2)
3. Remove `onPhotoClick` prop from PropertyCard, ListingsGrid, and their usages (Steps 3-4)
4. Remove the photo modal JSX (Step 5)
5. Remove the ESC key useEffect (Step 6)

All changes are additive and do not modify core functionality.

## Dependencies & Blockers

- None - All dependencies (React, useState, useEffect) are already imported
- No external components needed - modal is self-contained
- No database changes required
- No API changes required

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Photo click interferes with card navigation | Low | Medium | Use e.stopPropagation() on photo click |
| Z-index conflicts with other modals | Low | Low | Use consistent z-index values (1000 for modal) |
| Performance with many photos | Low | Low | Photos are already loaded in card carousel |
| Mobile touch issues | Medium | Low | Test on mobile, use standard touch handlers |

---

## File References Summary

### Files to Modify
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx`
   - Lines 461+: Add photo modal state variables
   - Lines 897+: Add handlePhotoGalleryOpen handler
   - Lines 65+: Modify PropertyCard function signature
   - Lines 193-226: Modify image section click handling
   - Lines 357+: Modify ListingsGrid function signature
   - Lines 362-379: Pass onPhotoClick to PropertyCard
   - Lines 1261-1271: Pass onPhotoClick to ListingsGrid
   - Lines 1470+: Add photo gallery modal JSX

### Files for Reference Only (Do Not Modify)
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx`
   - Lines 764-765: Photo modal state pattern
   - Lines 1124-1127: handlePhotoClick handler pattern
   - Lines 2730-2862: Full photo modal JSX implementation

### CSS Files (Optional Modification)
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.css`
   - May need z-index adjustments if inline styles insufficient

---

**Plan Version:** 1.0
**Created:** 2025-12-17T16:05:44
**Author:** Claude Code (Implementation Planning Architect)
