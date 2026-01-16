# Code Refactoring Plan - app

Date: 2026-01-16
Audit Type: general

~~~~~

## PAGE GROUP: /search (Chunks: 1, 2, 3, 4, 5, 17)

### CHUNK 1: SearchPage violates Hollow Component pattern - has 56 useState calls
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 696-798
**Issue:** The SearchPage component has 56 useState calls and contains all business logic inline instead of using the existing `useSearchPageLogic.js` hook. This violates the project's Hollow Component architecture pattern and makes the component extremely difficult to maintain and test.
**Affected Pages:** /search

**Current Code:**
```javascript
// Lines 696-798 (excerpt showing state management)
export default function SearchPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allActiveListings, setAllActiveListings] = useState([]); // ALL active listings (green pins, no filters)
  const [allListings, setAllListings] = useState([]); // Filtered listings (purple pins)
  const [displayedListings, setDisplayedListings] = useState([]); // Lazy-loaded subset for cards
  const [loadedCount, setLoadedCount] = useState(0);
  const [fallbackListings, setFallbackListings] = useState([]); // All listings shown when filtered results are empty
  const [fallbackDisplayedListings, setFallbackDisplayedListings] = useState([]); // Lazy-loaded subset for fallback
  const [fallbackLoadedCount, setFallbackLoadedCount] = useState(0);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  // Modal state management
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // ... 42 more useState calls ...
```

**Refactored Code:**
```javascript
// SearchPage.jsx - Hollow Component Pattern
import { useSearchPageLogic } from './useSearchPageLogic.js';

export default function SearchPage() {
  const {
    // Loading & Error State
    isLoading,
    error,

    // Listings Data
    allActiveListings,
    allListings,
    displayedListings,
    hasMore,

    // Filter State & Handlers
    boroughs,
    neighborhoods,
    selectedBorough,
    setSelectedBorough,
    // ... rest of state from hook

    // Event Handlers
    handleLoadMore,
    handleResetFilters,
    handleOpenContactModal,
    handleCloseContactModal,
    // ... rest of handlers from hook
  } = useSearchPageLogic();

  // Component only handles rendering - NO business logic
  return (
    // ... JSX rendering using pre-calculated values
  );
}
```

**Testing:**
- [ ] Verify SearchPage renders correctly with useSearchPageLogic hook
- [ ] Test all filter interactions work as expected
- [ ] Test modal open/close functionality
- [ ] Verify URL parameter synchronization works
- [ ] Test lazy loading behavior

~~~~~

### CHUNK 2: Duplicate formatHostName function in PropertyCard
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 176-186
**Issue:** `formatHostName` is implemented inline in PropertyCard when a proper implementation exists in the logic layer at `app/src/logic/processors/display/formatHostName.js`. This is also duplicated in SearchPageTest.jsx:379 and FavoriteListingsPage.jsx:77.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// Lines 176-186 in SearchPage.jsx PropertyCard component
  // Format host name to show "FirstName L."
  const formatHostName = (fullName) => {
    if (!fullName || fullName === 'Host') return 'Host';

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) return nameParts[0];

    const firstName = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();

    return `${firstName} ${lastInitial}.`;
  };
```

**Refactored Code:**
```javascript
// Import from logic layer at top of file
import { formatHostName } from '../../logic/processors/display/formatHostName.js';

// In component, use with try/catch for graceful handling
const displayHostName = useMemo(() => {
  try {
    return formatHostName({ fullName: listing.host?.name });
  } catch {
    return 'Host'; // Fallback for invalid names
  }
}, [listing.host?.name]);

// Usage in JSX
<span className="host-name">
  Hosted by {displayHostName}
  {listing.host?.verified && <span className="verified-badge" title="Verified">✓</span>}
</span>
```

**Testing:**
- [ ] Verify host names display correctly with various name formats
- [ ] Test edge cases: empty name, single name, multiple names
- [ ] Verify "Host" fallback appears when name is invalid

~~~~~

### CHUNK 3: Duplicate image navigation handlers
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 188-204
**Issue:** `handlePrevImage` and `handleNextImage` are duplicated in SearchPage.jsx:188, SearchPageTest.jsx:391, and FavoriteListingsPage.jsx:89. These should be extracted to a shared hook or utility.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// Lines 188-204 in SearchPage.jsx
  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };
```

**Refactored Code:**
```javascript
// Create new file: app/src/hooks/useImageCarousel.js
import { useState, useCallback } from 'react';

/**
 * Hook for managing image carousel navigation
 * @param {string[]} images - Array of image URLs
 * @returns {object} Carousel state and handlers
 */
export function useImageCarousel(images) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const hasImages = images && images.length > 0;
  const hasMultipleImages = images && images.length > 1;

  const handlePrevImage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }, [hasMultipleImages, images?.length]);

  const handleNextImage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  }, [hasMultipleImages, images?.length]);

  return {
    currentImageIndex,
    hasImages,
    hasMultipleImages,
    handlePrevImage,
    handleNextImage,
    setCurrentImageIndex
  };
}

// Usage in PropertyCard:
const { currentImageIndex, hasImages, hasMultipleImages, handlePrevImage, handleNextImage } =
  useImageCarousel(listing.images);
```

**Testing:**
- [ ] Test image carousel navigation in SearchPage
- [ ] Test image carousel navigation in FavoriteListingsPage
- [ ] Verify circular navigation (first ↔ last)
- [ ] Test with single image (navigation should be disabled)

~~~~~

### CHUNK 4: Internal components should be extracted from SearchPage
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 43-690
**Issue:** SearchPage.jsx contains 6 internal components (FilterPanel, PropertyCard, ListingsGrid, LoadingState, ErrorState, EmptyState) that are defined inline, making the file 3,322 lines. These should be extracted to separate files in a SearchPage/ directory.
**Affected Pages:** /search

**Current Code:**
```javascript
// Lines 43-162 (FilterPanel), 167-538 (PropertyCard), 544-630 (ListingsGrid),
// 635-650 (LoadingState), 655-671 (ErrorState), 676-690 (EmptyState)

function FilterPanel({ ... }) { ... }  // 119 lines
function PropertyCard({ ... }) { ... } // 371 lines
function ListingsGrid({ ... }) { ... } // 86 lines
function LoadingState() { ... }         // 15 lines
function ErrorState({ ... }) { ... }    // 16 lines
function EmptyState({ ... }) { ... }    // 14 lines

export default function SearchPage() { ... } // 2,631 lines
```

**Refactored Code:**
```javascript
// Create directory: app/src/islands/pages/SearchPage/

// app/src/islands/pages/SearchPage/components/FilterPanel.jsx
export function FilterPanel({ ... }) { ... }

// app/src/islands/pages/SearchPage/components/PropertyCard.jsx
export function PropertyCard({ ... }) { ... }

// app/src/islands/pages/SearchPage/components/ListingsGrid.jsx
export function ListingsGrid({ ... }) { ... }

// app/src/islands/pages/SearchPage/components/LoadingState.jsx
export function LoadingState() { ... }

// app/src/islands/pages/SearchPage/components/ErrorState.jsx
export function ErrorState({ ... }) { ... }

// app/src/islands/pages/SearchPage/components/EmptyState.jsx
export function EmptyState({ ... }) { ... }

// app/src/islands/pages/SearchPage/components/index.js
export { FilterPanel } from './FilterPanel.jsx';
export { PropertyCard } from './PropertyCard.jsx';
export { ListingsGrid } from './ListingsGrid.jsx';
export { LoadingState } from './LoadingState.jsx';
export { ErrorState } from './ErrorState.jsx';
export { EmptyState } from './EmptyState.jsx';

// app/src/islands/pages/SearchPage/SearchPage.jsx
import { FilterPanel, PropertyCard, ListingsGrid, LoadingState, ErrorState, EmptyState }
  from './components';
import { useSearchPageLogic } from './useSearchPageLogic.js';

export default function SearchPage() {
  // Hollow component - uses hook for all logic
  const logic = useSearchPageLogic();

  // Only rendering logic here
  return ( ... );
}
```

**Testing:**
- [ ] Verify all components render correctly after extraction
- [ ] Test component interactions (filter changes, card clicks)
- [ ] Verify imports work correctly
- [ ] Check bundle size is not significantly increased

~~~~~

### CHUNK 5: useSearchPageLogic hook exists but is unused
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** 1-790
**Issue:** A well-structured useSearchPageLogic hook exists (790 lines) but SearchPage.jsx doesn't use it, instead duplicating all the logic inline. The hook should be imported and used to follow the Hollow Component pattern.
**Affected Pages:** /search

**Current Code:**
```javascript
// useSearchPageLogic.js exists with proper structure but SearchPage.jsx doesn't import it

// SearchPage.jsx currently:
export default function SearchPage() {
  // 56 useState calls duplicating what's in useSearchPageLogic
  const [isLoading, setIsLoading] = useState(true);
  // ... hundreds of lines of duplicated logic
}
```

**Refactored Code:**
```javascript
// SearchPage.jsx should import and use the existing hook
import { useSearchPageLogic } from './useSearchPageLogic.js';

export default function SearchPage() {
  const {
    isLoading,
    error,
    allActiveListings,
    allListings,
    displayedListings,
    hasMore,
    boroughs,
    neighborhoods,
    // ... all state and handlers from hook
  } = useSearchPageLogic();

  // Component only handles rendering
  return (...);
}
```

**Testing:**
- [ ] Verify SearchPage works correctly with useSearchPageLogic
- [ ] Test all filter functionality
- [ ] Test URL parameter sync
- [ ] Test modal interactions

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 6, 7)

### CHUNK 6: Duplicate useViewSplitLeasePageLogic files
**File:** `app/src/islands/pages/useViewSplitLeasePageLogic.js` AND `app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js`
**Line:** All
**Issue:** Two versions of the same file exist - one at the root pages level and one inside ViewSplitLeasePage directory. This creates confusion and potential for divergence.
**Affected Pages:** /view-split-lease, /preview-split-lease

**Current Code:**
```javascript
// Two files exist:
// 1. app/src/islands/pages/useViewSplitLeasePageLogic.js
// 2. app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js

// Need to determine which is authoritative and remove the other
```

**Refactored Code:**
```javascript
// Keep only: app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js
// Delete: app/src/islands/pages/useViewSplitLeasePageLogic.js

// Update imports in ViewSplitLeasePage.jsx:
import { useViewSplitLeasePageLogic } from './useViewSplitLeasePageLogic.js';

// If the root-level version is imported elsewhere, update those imports
```

**Testing:**
- [ ] Verify ViewSplitLeasePage works after consolidation
- [ ] Search for imports of the deleted file and update them
- [ ] Test listing detail view functionality
- [ ] Test proposal creation from listing page

~~~~~

### CHUNK 7: ViewSplitLeasePage.jsx file is too large
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 1-~2000
**Issue:** ViewSplitLeasePage.jsx exceeds 25,000 tokens (file too large to read fully). Similar to SearchPage, it likely violates the Hollow Component pattern and should be refactored to use its logic hook.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// File is too large to display - over 28,391 tokens
// Likely contains inline state management instead of using logic hook
```

**Refactored Code:**
```javascript
// ViewSplitLeasePage/ViewSplitLeasePage.jsx
import { useViewSplitLeasePageLogic } from './useViewSplitLeasePageLogic.js';
import { ListingHeader, ListingGallery, ListingDetails, ProposalSection } from './components';

export default function ViewSplitLeasePage() {
  const logic = useViewSplitLeasePageLogic();

  // Hollow component - only rendering
  return (
    <div className="view-split-lease-page">
      <ListingHeader {...logic.headerProps} />
      <ListingGallery {...logic.galleryProps} />
      <ListingDetails {...logic.detailProps} />
      <ProposalSection {...logic.proposalProps} />
    </div>
  );
}
```

**Testing:**
- [ ] Audit ViewSplitLeasePage.jsx for Hollow Component violations
- [ ] Extract internal components to separate files
- [ ] Ensure useViewSplitLeasePageLogic hook is properly used
- [ ] Test full listing page functionality

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 8)

### CHUNK 8: Duplicate useGuestProposalsPageLogic files
**File:** `app/src/islands/pages/useGuestProposalsPageLogic.js` AND `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`
**Line:** All
**Issue:** Two versions of useGuestProposalsPageLogic exist - creates maintenance burden and potential bugs from divergence.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Two files exist:
// 1. app/src/islands/pages/useGuestProposalsPageLogic.js
// 2. app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
```

**Refactored Code:**
```javascript
// Keep the one that is actually imported by GuestProposalsPage.jsx
// Delete the unused duplicate

// Consolidate to: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
// (or create GuestProposalsPage/ directory structure like other pages)
```

**Testing:**
- [ ] Determine which file is authoritative (check imports)
- [ ] Delete the unused duplicate
- [ ] Verify guest proposals page works correctly
- [ ] Test proposal viewing and actions

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 9, 10)

### CHUNK 9: FavoriteListingsPage has duplicate formatHostName
**File:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Line:** 77-87
**Issue:** formatHostName is duplicated inline instead of importing from logic layer.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// Line 77-87
  const formatHostName = (fullName) => {
    if (!fullName || fullName === 'Host') return 'Host';

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length === 1) return nameParts[0];

    const firstName = nameParts[0];
    const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();

    return `${firstName} ${lastInitial}.`;
  };
```

**Refactored Code:**
```javascript
// Import from logic layer
import { formatHostName } from '../../../logic/processors/display/formatHostName.js';

// Use with safe wrapper
const getDisplayHostName = (name) => {
  try {
    return formatHostName({ fullName: name });
  } catch {
    return 'Host';
  }
};
```

**Testing:**
- [ ] Verify host names display correctly on favorite listings
- [ ] Test edge cases

~~~~~

### CHUNK 10: FavoriteListingsPage has duplicate image carousel handlers
**File:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Line:** 89-107
**Issue:** handlePrevImage and handleNextImage are duplicated.
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
// Lines 89-107
  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };
```

**Refactored Code:**
```javascript
// Import shared hook (created in Chunk 3)
import { useImageCarousel } from '../../../hooks/useImageCarousel.js';

// In component:
const { currentImageIndex, hasImages, hasMultipleImages, handlePrevImage, handleNextImage } =
  useImageCarousel(listing.images);
```

**Testing:**
- [ ] Test image navigation in favorite listings
- [ ] Verify circular navigation works

~~~~~

## PAGE GROUP: AUTO / Shared Components (Chunks: 11, 12, 13)

### CHUNK 11: Duplicate backup files should be deleted
**File:** `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx` AND `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`
**Line:** All
**Issue:** Backup/duplicate files with spaces in names exist. These should be deleted - only `AuthAwareSearchScheduleSelector.jsx` should remain.
**Affected Pages:** AUTO (any page using schedule selector)

**Current Code:**
```javascript
// Three files exist:
// 1. AuthAwareSearchScheduleSelector.jsx (authoritative)
// 2. AuthAwareSearchScheduleSelector (1).jsx (backup - DELETE)
// 3. AuthAwareSearchScheduleSelector (1) (1).jsx (backup - DELETE)
```

**Refactored Code:**
```javascript
// Delete the backup files:
// rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx"
// rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx"

// Only keep: app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx
```

**Testing:**
- [ ] Delete backup files
- [ ] Verify no imports reference the deleted files
- [ ] Test schedule selector functionality

~~~~~

### CHUNK 12: Duplicate CreateDuplicateListingModal files
**File:** `app/src/islands/shared/CreateDuplicateListingModal.jsx` AND `app/src/islands/shared/CreateDuplicateListingModal (1).jsx`
**Line:** All
**Issue:** Backup/duplicate files exist for CreateDuplicateListingModal as well.
**Affected Pages:** AUTO (host listing management)

**Current Code:**
```javascript
// Multiple files exist:
// 1. CreateDuplicateListingModal.jsx
// 2. CreateDuplicateListingModal (1).jsx (backup - DELETE)
// 3. CreateDuplicateListingModal/ directory (may be new structure)
```

**Refactored Code:**
```javascript
// Consolidate to the directory structure if it's newer:
// Keep: app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx
// Delete: app/src/islands/shared/CreateDuplicateListingModal.jsx
// Delete: app/src/islands/shared/CreateDuplicateListingModal (1).jsx

// Verify imports use the directory version via index.js
```

**Testing:**
- [ ] Determine authoritative version
- [ ] Delete duplicates
- [ ] Update imports if needed
- [ ] Test duplicate listing creation

~~~~~

### CHUNK 13: parseJsonArray duplication
**File:** `app/src/lib/supabaseUtils.js`
**Line:** 26
**Issue:** parseJsonArray is implemented in supabaseUtils.js but should use the logic processor version at `app/src/logic/processors/listing/parseJsonArrayField.js`. The logic layer version has better error handling and documentation.
**Affected Pages:** AUTO (all pages using supabaseUtils)

**Current Code:**
```javascript
// app/src/lib/supabaseUtils.js line 26
export function parseJsonArray(value) {
  // Simple implementation
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
```

**Refactored Code:**
```javascript
// Option 1: Re-export from logic layer in supabaseUtils.js
export { parseJsonArrayFieldOptional as parseJsonArray } from '../logic/processors/listing/parseJsonArrayField.js';

// Option 2: Update all callers to use the logic layer directly
import { parseJsonArrayFieldOptional } from '../logic/processors/listing/parseJsonArrayField.js';

// Usage:
const parsed = parseJsonArrayFieldOptional({ field: value, fieldName: 'photos' });
```

**Testing:**
- [ ] Identify all usages of parseJsonArray
- [ ] Update to use logic layer version
- [ ] Test JSON parsing in affected features

~~~~~

## PAGE GROUP: AUTO / Cleanup (Chunks: 14, 15, 16)

### CHUNK 14: SearchPageTest.jsx should be removed or moved to tests
**File:** `app/src/islands/pages/SearchPageTest.jsx`
**Line:** All
**Issue:** SearchPageTest.jsx appears to be a test/development file but is in the production pages directory. It also duplicates code from SearchPage.jsx.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// File exists at: app/src/islands/pages/SearchPageTest.jsx
// Contains duplicate formatHostName at line 379
// Contains duplicate image handlers at lines 391, 400
```

**Refactored Code:**
```javascript
// Option 1: Delete if no longer needed
// rm app/src/islands/pages/SearchPageTest.jsx

// Option 2: Move to test directory if it's a test fixture
// mv app/src/islands/pages/SearchPageTest.jsx app/tests/fixtures/SearchPageTest.jsx

// Option 3: If it's a variant, consolidate with main SearchPage
```

**Testing:**
- [ ] Determine if SearchPageTest.jsx is still needed
- [ ] Delete or move appropriately
- [ ] Remove from routes.config.js if registered

~~~~~

### CHUNK 15: README and markdown files in component directories
**File:** Various locations
**Line:** N/A
**Issue:** Several README.md and CLAUDE.md files exist in component directories. While documentation is good, some may be outdated or redundant.
**Affected Pages:** AUTO

**Current Code:**
```
Files found:
- app/src/islands/shared/CreateDuplicateListingModal/README.md
- app/src/islands/shared/CreateDuplicateListingModal (1).README.md (DELETE - backup)
- app/src/islands/shared/CreateDuplicateListingModal.README.md (DELETE - wrong location)
- app/src/islands/shared/LoggedInAvatar/README.md
- app/src/islands/shared/SubmitListingPhotos/README.md
- app/src/islands/shared/NotificationSettingsIsland/CLAUDE.md
- app/src/islands/shared/VirtualMeetingManager/CLAUDE.md
- app/src/islands/shared/SuggestedProposals/CLAUDE.md
```

**Refactored Code:**
```bash
# Delete backup/misplaced README files:
rm "app/src/islands/shared/CreateDuplicateListingModal (1).README.md"
rm "app/src/islands/shared/CreateDuplicateListingModal.README.md"

# Keep proper documentation in directory structure:
# - CreateDuplicateListingModal/README.md
# - LoggedInAvatar/README.md
# etc.
```

**Testing:**
- [ ] Delete backup README files
- [ ] Review remaining READMEs for accuracy
- [ ] Update if content is outdated

~~~~~

### CHUNK 16: Unused logic hook at root level
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** All
**Issue:** After refactoring SearchPage to use this hook (Chunk 1), this file should be moved into a SearchPage/ directory structure for consistency with other pages.
**Affected Pages:** /search

**Current Code:**
```
Current structure:
app/src/islands/pages/
├── SearchPage.jsx
├── useSearchPageLogic.js  ← Should be in directory
├── ViewSplitLeasePage/
│   └── useViewSplitLeasePageLogic.js  ← Good structure
```

**Refactored Code:**
```
Target structure:
app/src/islands/pages/
├── SearchPage/
│   ├── SearchPage.jsx
│   ├── useSearchPageLogic.js
│   ├── components/
│   │   ├── FilterPanel.jsx
│   │   ├── PropertyCard.jsx
│   │   ├── ListingsGrid.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── EmptyState.jsx
│   │   └── index.js
│   └── index.js
├── ViewSplitLeasePage/
│   └── ...
```

**Testing:**
- [ ] Create SearchPage/ directory structure
- [ ] Move files to new locations
- [ ] Update entry point (app/src/search.jsx) import
- [ ] Verify app builds and runs correctly

~~~~~

## Summary

### Priority Order for Implementation:

**CRITICAL (Fix Immediately)**
0. **Chunk 17** - Fix pulseTimeoutRef scope bug (RUNTIME ERROR affecting /search)

**High Priority (Immediate)**
1. **Chunk 11, 12, 15** - Delete backup files (quick wins, reduces confusion)
2. **Chunk 6, 8** - Remove duplicate logic hook files
3. **Chunk 14** - Handle SearchPageTest.jsx

**Medium Priority (Architecture)**
4. **Chunk 1, 5** - Refactor SearchPage to use existing hook (biggest impact)
5. **Chunk 4, 16** - Extract components and create directory structure
6. **Chunk 7** - Audit and refactor ViewSplitLeasePage

**Lower Priority (Code Quality)**
7. **Chunk 2, 9** - Consolidate formatHostName usage
8. **Chunk 3, 10** - Extract image carousel hook
9. **Chunk 13** - Consolidate parseJsonArray

**Performance & Architecture (From Pages Audit)**
10. **Chunk 18** - Add memoization to calculateDynamicPrice (performance)
11. **Chunk 19** - Extract shared PropertyCard component (600+ lines duplication)
12. **Chunk 20** - Create useAuthenticatedUser hook (auth logic consolidation)
13. **Chunk 21** - ListingDashboardPage Context migration (prop drilling fix)

### Files to DELETE:
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`
- `app/src/islands/shared/CreateDuplicateListingModal (1).jsx`
- `app/src/islands/shared/CreateDuplicateListingModal (1).README.md`
- `app/src/islands/shared/CreateDuplicateListingModal.README.md`
- One of: `app/src/islands/pages/useViewSplitLeasePageLogic.js`
- One of: `app/src/islands/pages/useGuestProposalsPageLogic.js`
- Possibly: `app/src/islands/pages/SearchPageTest.jsx`

### Files to CREATE:
- `app/src/hooks/useImageCarousel.js`
- `app/src/hooks/useAuthenticatedUser.js`
- `app/src/islands/pages/SearchPage/` directory structure
- `app/src/islands/pages/SearchPage/components/` directory with extracted components
- `app/src/islands/shared/ListingCard/PropertyCard.jsx` (shared component)
- `app/src/islands/pages/ListingDashboardPage/context/ListingDashboardContext.jsx`

~~~~~

### CHUNK 17: CRITICAL BUG - pulseTimeoutRef scope error in ListingsGrid
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 595-602
**Issue:** **RUNTIME BUG** - `pulseTimeoutRef` is defined in the parent SearchPage component (line 728) but is referenced inside the ListingsGrid component's `onCardLeave` callback (lines 595-602). Since ListingsGrid is a separate function component, `pulseTimeoutRef` is NOT in scope and will cause a `ReferenceError` when users hover over listing cards.
**Affected Pages:** /search

**Current Code:**
```javascript
// Line 544 - ListingsGrid is a separate component
function ListingsGrid({ listings, onLoadMore, hasMore, isLoading, ... }) {
  // ...

  // Lines 593-604 - pulseTimeoutRef is NOT in scope here!
  onCardLeave={() => {
    // Delay stopPulse to allow hovering to map without losing pulse
    if (pulseTimeoutRef.current) {        // ❌ ReferenceError!
      clearTimeout(pulseTimeoutRef.current);
    }
    pulseTimeoutRef.current = setTimeout(() => {  // ❌ ReferenceError!
      if (mapRef.current) {
        mapRef.current.stopPulse();
      }
      pulseTimeoutRef.current = null;
    }, 150);
  }}
}

// Line 728 - pulseTimeoutRef defined in SearchPage, not ListingsGrid
export default function SearchPage() {
  const pulseTimeoutRef = useRef(null);
  // ...
}
```

**Refactored Code:**
```javascript
// Option 1: Pass pulseTimeoutRef as a prop to ListingsGrid
function ListingsGrid({
  listings,
  onLoadMore,
  hasMore,
  isLoading,
  pulseTimeoutRef,  // ✅ Add as prop
  mapRef,           // ✅ Also pass mapRef
  ...rest
}) {
  // Now pulseTimeoutRef is in scope
  onCardLeave={() => {
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
    pulseTimeoutRef.current = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.stopPulse();
      }
      pulseTimeoutRef.current = null;
    }, 150);
  }}
}

// In SearchPage, pass the ref:
<ListingsGrid
  listings={displayedListings}
  pulseTimeoutRef={pulseTimeoutRef}
  mapRef={mapRef}
  // ... other props
/>

// Option 2 (Better): Move the callback logic to SearchPage and pass a handler
function ListingsGrid({ onCardLeave, ... }) {
  // Just call the handler
  onCardLeave={() => onCardLeave()}
}

// In SearchPage:
const handleCardLeave = useCallback(() => {
  if (pulseTimeoutRef.current) {
    clearTimeout(pulseTimeoutRef.current);
  }
  pulseTimeoutRef.current = setTimeout(() => {
    if (mapRef.current) {
      mapRef.current.stopPulse();
    }
    pulseTimeoutRef.current = null;
  }, 150);
}, []);

<ListingsGrid onCardLeave={handleCardLeave} ... />
```

**Testing:**
- [ ] Verify no ReferenceError when hovering over listing cards
- [ ] Test pulse animation stops correctly when leaving card
- [ ] Test pulse persists when transitioning to map
- [ ] Console should be free of errors during card interactions

~~~~~

### CHUNK 18: Missing memoization for calculateDynamicPrice
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 230-261
**Issue:** **PERFORMANCE** - `calculateDynamicPrice()` is called on every render of PropertyCard without memoization. For 20 listings, this causes 20 unnecessary recalculations per keystroke/filter change.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// Lines 230-261 inside PropertyCard (recalculated on EVERY render)
const calculateDynamicPrice = () => {
  const nightsCount = selectedNightsCount;
  if (nightsCount < 1) {
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
  try {
    const mockNightsArray = Array(nightsCount).fill({ nightNumber: 0 });
    const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);
    return priceBreakdown.pricePerNight || listing['Starting nightly price'] || 0;
  } catch (error) {
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
};

const dynamicPrice = calculateDynamicPrice(); // ❌ No memoization!
```

**Refactored Code:**
```javascript
// ✅ Memoize expensive calculation
const dynamicPrice = useMemo(() => {
  const nightsCount = selectedNightsCount;
  if (nightsCount < 1) {
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
  try {
    const mockNightsArray = Array(nightsCount).fill({ nightNumber: 0 });
    const priceBreakdown = calculatePrice(mockNightsArray, listing, 13, null);
    return priceBreakdown.pricePerNight || listing['Starting nightly price'] || 0;
  } catch (error) {
    return listing['Starting nightly price'] || listing.price?.starting || 0;
  }
}, [selectedNightsCount, listing._id, listing['Starting nightly price']]);
```

**Testing:**
- [ ] Verify pricing still displays correctly
- [ ] Profile render performance improvement with React DevTools
- [ ] Test with filter changes to confirm memoization works

~~~~~

### CHUNK 19: Duplicate PropertyCard component (600+ lines)
**File:** `app/src/islands/pages/SearchPage.jsx` AND `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Line:** SearchPage:167-500+, FavoriteListingsPage:66-369
**Issue:** **DUPLICATION** - PropertyCard is completely duplicated between SearchPage (300+ lines) and FavoriteListingsPage (300+ lines) with 95% identical code. This is 600+ lines of duplicated code.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// SearchPage.jsx - Line 167
function PropertyCard({ listing, onLocationClick, onCardHover, ... }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const formatHostName = (fullName) => { /* ... */ };
  const calculateDynamicPrice = () => { /* 50+ lines */ };
  // ... 300+ more lines
}

// FavoriteListingsPage.jsx - Line 66 (IDENTICAL!)
function PropertyCard({ listing, onLocationClick, ... }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const formatHostName = (fullName) => { /* SAME CODE */ };
  const calculateDynamicPrice = () => { /* SAME 50+ lines */ };
  // ... 300+ more lines
}
```

**Refactored Code:**
```javascript
// CREATE: app/src/islands/shared/ListingCard/PropertyCard.jsx
import { useImageCarousel } from '../../../hooks/useImageCarousel.js';
import { formatHostName } from '../../../logic/processors/display/formatHostName.js';

export default function PropertyCard({
  listing,
  onLocationClick,
  onCardHover,
  onCardLeave,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  isFavorited,
  userId,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  proposalForListing,
  selectedNightsCount
}) {
  const { currentImageIndex, handlePrevImage, handleNextImage, hasMultipleImages } =
    useImageCarousel(listing.images);

  // Single source of truth for listing card rendering
  // ... component implementation
}

// SearchPage.jsx & FavoriteListingsPage.jsx - IMPORT
import PropertyCard from '../../shared/ListingCard/PropertyCard.jsx';
```

**Testing:**
- [ ] Verify PropertyCard renders correctly in SearchPage
- [ ] Verify PropertyCard renders correctly in FavoriteListingsPage
- [ ] Test all interactions (hover, click, favorite, proposal)
- [ ] Compare visual appearance before/after

~~~~~

### CHUNK 20: Create useAuthenticatedUser hook for auth logic consolidation
**File:** Multiple pages have duplicated auth logic
**Line:** FavoriteListingsPage:652-888, SearchPage:similar
**Issue:** **DUPLICATION** - Complex "Gold Standard Auth Pattern" (3-step fallback with 80+ lines) is duplicated across multiple pages. Should be a single shared hook.
**Affected Pages:** /search, /favorite-listings, /guest-proposals, /host-proposals, /account-profile

**Current Code:**
```javascript
// FavoriteListingsPage.jsx - Lines 668-744 (80 lines of auth logic)
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
let sessionId = getSessionId();
let finalUserId = sessionId;

if (userData) {
  finalUserId = sessionId || userData.userId || userData._id;
  setUserId(finalUserId);
  // ... 20 more lines
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // ... another 20 lines
  } else {
    // ... 10 more lines
  }
}
```

**Refactored Code:**
```javascript
// CREATE: app/src/hooks/useAuthenticatedUser.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { validateTokenAndFetchUser, getSessionId } from '../lib/auth.js';

/**
 * Gold Standard Auth Pattern - consolidated hook
 * 3-step fallback: Token → Session → Guest fallback
 */
export function useAuthenticatedUser({ requireGuest = false, requireHost = false } = {}) {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authenticate = async () => {
      try {
        // Step 1: Try token validation
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
        const sessionId = getSessionId();

        if (userData) {
          setUser(userData);
          setUserId(sessionId || userData.userId || userData._id);
          setLoading(false);
          return;
        }

        // Step 2: Fall back to Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const bubbleUserId = session.user.user_metadata?.bubble_user_id;
          setUser({ ...session.user, bubbleUserId });
          setUserId(bubbleUserId || session.user.id);
          setLoading(false);
          return;
        }

        // Step 3: No auth found
        setUser(null);
        setUserId(null);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    authenticate();
  }, []);

  return { user, userId, loading, error, isAuthenticated: !!user };
}

// FavoriteListingsPage.jsx - USE HOOK (3 lines instead of 80)
const { user, userId, loading, error, isAuthenticated } = useAuthenticatedUser();
```

**Testing:**
- [ ] Test auth flow on FavoriteListingsPage
- [ ] Test auth flow on SearchPage
- [ ] Test auth flow on GuestProposalsPage
- [ ] Verify 3-step fallback works correctly
- [ ] Test logout/login transitions

~~~~~

### CHUNK 21: ListingDashboardPage prop drilling - migrate to Context
**File:** `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx`
**Line:** 40-86, 145-360
**Issue:** **ANTI-PATTERN** - The hook returns 40+ values that are passed down through 15+ section components. This creates fragile coupling and makes refactoring difficult.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// ListingDashboardPage.jsx - Lines 40-86 (40+ destructured values)
const {
  activeTab,
  listing,
  counts,
  isLoading,
  error,
  editSection,
  showScheduleCohost,
  showImportReviews,
  currentUser,
  handleTabChange,
  handleCardClick,
  handleBackClick,
  handleDescriptionChange,
  // ... 20+ more handlers
} = useListingDashboardPageLogic();

// Then passed to 15+ section components via props
<PropertyInfoSection
  listing={listing}
  onImportReviews={handleImportReviews}
  onEdit={() => handleEditSection('name')}
  reviewCount={counts.reviews}
/>
```

**Refactored Code:**
```javascript
// CREATE: ListingDashboardPage/context/ListingDashboardContext.jsx
import { createContext, useContext } from 'react';
import { useListingDashboardPageLogic } from '../useListingDashboardPageLogic.js';

const ListingDashboardContext = createContext(null);

export function ListingDashboardProvider({ children, listingId }) {
  const logic = useListingDashboardPageLogic(listingId);
  return (
    <ListingDashboardContext.Provider value={logic}>
      {children}
    </ListingDashboardContext.Provider>
  );
}

export function useListingDashboard() {
  const context = useContext(ListingDashboardContext);
  if (!context) {
    throw new Error('useListingDashboard must be used within ListingDashboardProvider');
  }
  return context;
}

// ListingDashboardPage.jsx - CLEANER (no prop drilling)
export default function ListingDashboardPage() {
  return (
    <ListingDashboardProvider listingId={listingId}>
      <PropertyInfoSection />  {/* No props! */}
      <DescriptionSection />
      <AmenitiesSection />
    </ListingDashboardProvider>
  );
}

// PropertyInfoSection.jsx - ACCESS VIA HOOK
function PropertyInfoSection() {
  const { listing, counts, handleImportReviews, handleEditSection } = useListingDashboard();
  // ... render with values from context
}
```

**Testing:**
- [ ] Verify all sections render correctly after migration
- [ ] Test edit functionality in each section
- [ ] Test tab switching
- [ ] Profile for performance impact (should be minimal)

~~~~~

### Key Metrics:
- **Total chunks:** 21
- **Files affected:** ~20+ files
- **Lines of duplicated code to remove:** ~1000+
- **Estimated complexity reduction:** SearchPage from 3,322 lines to ~300 lines (render only)
