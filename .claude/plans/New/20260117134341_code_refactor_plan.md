# Code Refactoring Plan - app

**Date:** 2026-01-17
**Audit Type:** General (Performance, Maintainability, Duplication, Anti-patterns)
**Total Chunks:** 14

---

## Executive Summary

This audit identified 14 refactoring opportunities across the `app/` codebase, organized by affected page groups. Key findings include:

1. **Code Duplication**: DAYS_OF_WEEK constants and isContiguous logic duplicated in 4+ files
2. **Performance**: Missing React.memo (0 usages), excessive console.log statements (762 occurrences in 116 files)
3. **Incomplete Migration**: Pricing calculations exist in both `lib/scheduleSelector/` and `logic/calculators/`
4. **Technical Debt**: 18 TODO/FIXME comments awaiting resolution
5. **Anti-patterns**: 40+ inline arrow functions in onClick handlers

---

## PAGE GROUP: /search (Chunks: 1, 2, 3)

### CHUNK 1: Extract DAYS_OF_WEEK constant to shared location
**File:** `app/src/islands/shared/SearchScheduleSelector.jsx`
**Line:** 218-226
**Issue:** DAYS_OF_WEEK constant is duplicated in 4+ files with slight variations (different property names like `fullName` vs `name`, `singleLetter` vs `shortName`)
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /host-proposals

**Current Code:**
```javascript
const DAYS_OF_WEEK = [
  { id: '0', singleLetter: 'S', fullName: 'Sunday', index: 0 },
  { id: '1', singleLetter: 'M', fullName: 'Monday', index: 1 },
  { id: '2', singleLetter: 'T', fullName: 'Tuesday', index: 2 },
  { id: '3', singleLetter: 'W', fullName: 'Wednesday', index: 3 },
  { id: '4', singleLetter: 'T', fullName: 'Thursday', index: 4 },
  { id: '5', singleLetter: 'F', fullName: 'Friday', index: 5 },
  { id: '6', singleLetter: 'S', fullName: 'Saturday', index: 6 },
];
```

**Refactored Code:**
```javascript
// In app/src/lib/dayUtils.js (extend existing file)
export const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 },
];

// In SearchScheduleSelector.jsx
import { DAYS_OF_WEEK } from '../../lib/dayUtils.js';
```

**Testing:**
- [ ] Verify SearchScheduleSelector renders days correctly
- [ ] Verify day selection works as expected
- [ ] Run existing tests if available

~~~~~

### CHUNK 2: Extract isContiguous logic to shared location
**File:** `app/src/islands/shared/SearchScheduleSelector.jsx`
**Line:** 337-384
**Issue:** isContiguous logic is duplicated in SearchScheduleSelector.jsx (45 lines) and logic/calculators/scheduling/isContiguousSelection.js (23 lines) with identical algorithms
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /preview-split-lease

**Current Code:**
```javascript
// In SearchScheduleSelector.jsx - 45 lines of duplicated logic
const isContiguous = useCallback((days) => {
  const daysArray = Array.from(days);
  if (daysArray.length <= 1) return true;
  if (daysArray.length >= 6) return true;

  const sortedDays = [...daysArray].sort((a, b) => a - b);

  // STEP 1: Check if selected days are continuous (regular check)
  let isRegularContinuous = true;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] !== sortedDays[i - 1] + 1) {
      isRegularContinuous = false;
      break;
    }
  }
  if (isRegularContinuous) return true;

  // STEP 2: Check if UNSELECTED days are continuous (implies wrap-around)
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const unselectedDays = allDays.filter(day => !sortedDays.includes(day));
  if (unselectedDays.length === 0) return true;

  const sortedUnselected = [...unselectedDays].sort((a, b) => a - b);
  for (let i = 1; i < sortedUnselected.length; i++) {
    if (sortedUnselected[i] !== sortedUnselected[i - 1] + 1) {
      return false;
    }
  }
  return true;
}, []);
```

**Refactored Code:**
```javascript
// Use the existing logic layer implementation
import { isContiguousSelection } from '../../logic/calculators/scheduling/isContiguousSelection.js';

// Replace the useCallback with direct import
// In SearchScheduleSelector.jsx
const checkContiguous = useCallback((days) => {
  return isContiguousSelection(Array.from(days));
}, []);
```

**Testing:**
- [ ] Verify wrap-around selection works (Fri-Sat-Sun-Mon)
- [ ] Verify standard contiguous selection works (Mon-Tue-Wed)
- [ ] Verify non-contiguous detection works (Mon-Wed-Fri shows error)

~~~~~

### CHUNK 3: Remove excessive console.log from SearchScheduleSelector
**File:** `app/src/islands/shared/SearchScheduleSelector.jsx`
**Line:** 264-277, 643-672
**Issue:** 6 console.log statements in production code. Total codebase has 762 console.log statements across 116 files.
**Affected Pages:** /search

**Current Code:**
```javascript
if (validDays.length > 0) {
  console.log('📅 SearchScheduleSelector: Loaded selection from URL:', {
    urlParam: daysParam,
    dayIndices: validDays
  });
  return validDays;
}
// ... more console.logs at lines 264-277, 643-672
```

**Refactored Code:**
```javascript
// Option 1: Use conditional logging with environment check
const DEBUG = import.meta.env.DEV;

if (validDays.length > 0) {
  DEBUG && console.log('📅 SearchScheduleSelector: Loaded selection from URL:', {
    urlParam: daysParam,
    dayIndices: validDays
  });
  return validDays;
}

// Option 2: Use the existing logger utility
import { log } from '../../lib/logger.js';

if (validDays.length > 0) {
  log.debug('SearchScheduleSelector: Loaded selection from URL', { urlParam: daysParam, dayIndices: validDays });
  return validDays;
}
```

**Testing:**
- [ ] Verify no console.log in production build
- [ ] Verify debug logging still works in development

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 4, 5)

### CHUNK 4: Complete pricing migration from lib/scheduleSelector to logic/calculators
**File:** `app/src/lib/scheduleSelector/priceCalculations.js`
**Line:** 1-380 (entire file)
**Issue:** TODO at useScheduleSelectorLogicCore.js:18 says "Migrate to Logic Core". Pricing calculations exist in both `lib/scheduleSelector/priceCalculations.js` (380 lines) and `logic/calculators/pricing/` (5 files, ~300 lines). CreateProposalFlowV2 imports from the old location.
**Affected Pages:** /view-split-lease, /preview-split-lease, /favorite-listings

**Current Code:**
```javascript
// In app/src/islands/shared/CreateProposalFlowV2.jsx (line 15)
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js';

// In app/src/islands/shared/useScheduleSelectorLogicCore.js (line 18)
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js' // TODO: Migrate to Logic Core
```

**Refactored Code:**
```javascript
// Step 1: Create adapter in logic/calculators/pricing/index.js
export { calculatePricingBreakdown } from './calculatePricingBreakdown.js';

// Step 2: Update imports in CreateProposalFlowV2.jsx
import { calculatePricingBreakdown } from '../../logic/calculators/pricing/calculatePricingBreakdown.js';

// Step 3: Deprecate lib/scheduleSelector/priceCalculations.js with warning
/**
 * @deprecated Use logic/calculators/pricing/calculatePricingBreakdown instead
 * This file will be removed in a future version.
 */
export const calculatePrice = (...args) => {
  console.warn('calculatePrice is deprecated. Use calculatePricingBreakdown from logic/calculators/pricing');
  // Forward to new implementation
  return calculatePricingBreakdown(...args);
};
```

**Testing:**
- [ ] Verify pricing calculations match for Monthly, Weekly, Nightly rental types
- [ ] Verify 4-week rent, reservation total, initial payment calculations
- [ ] Compare outputs between old and new implementations

~~~~~

### CHUNK 5: Remove DAYS_OF_WEEK duplication from GuestEditingProposalModal
**File:** `app/src/islands/modals/GuestEditingProposalModal.jsx`
**Line:** 40-48
**Issue:** Duplicated DAYS_OF_WEEK constant (same as Chunk 1)
**Affected Pages:** /view-split-lease, /guest-proposals

**Current Code:**
```javascript
const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 },
];
```

**Refactored Code:**
```javascript
import { DAYS_OF_WEEK } from '../../lib/dayUtils.js';
// Remove the local constant definition
```

**Testing:**
- [ ] Verify day display in modal works correctly
- [ ] Verify day selection/editing functionality

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 6, 7)

### CHUNK 6: Remove DAYS_OF_WEEK duplication from HostEditingProposal
**File:** `app/src/islands/shared/HostEditingProposal/types.js`
**Line:** 12-20
**Issue:** Duplicated DAYS_OF_WEEK constant
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
export const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', shortName: 'Sun', singleLetter: 'S', dayIndex: 0 },
  { id: 1, name: 'Monday', shortName: 'Mon', singleLetter: 'M', dayIndex: 1 },
  { id: 2, name: 'Tuesday', shortName: 'Tue', singleLetter: 'T', dayIndex: 2 },
  { id: 3, name: 'Wednesday', shortName: 'Wed', singleLetter: 'W', dayIndex: 3 },
  { id: 4, name: 'Thursday', shortName: 'Thu', singleLetter: 'T', dayIndex: 4 },
  { id: 5, name: 'Friday', shortName: 'Fri', singleLetter: 'F', dayIndex: 5 },
  { id: 6, name: 'Saturday', shortName: 'Sat', singleLetter: 'S', dayIndex: 6 },
];
```

**Refactored Code:**
```javascript
// Re-export from central location for backwards compatibility
export { DAYS_OF_WEEK } from '../../../lib/dayUtils.js';
```

**Testing:**
- [ ] Verify HostEditingProposal component still works
- [ ] Verify imports in dependent files still resolve

~~~~~

### CHUNK 7: Resolve TODO - Implement proper reminder system
**File:** `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 687-692
**Issue:** TODO comment for implementing reminder system - incomplete feature
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
const handleMessage = (proposal) => {
  // TODO: Navigate to messaging or open message modal
  console.log('Message clicked for proposal:', proposal._id);
};

/**
 * TODO: Implement proper reminder system (email/notification)
 * For now, shows a toast with a placeholder message
 */
```

**Refactored Code:**
```javascript
const handleMessage = (proposal) => {
  // Navigate to messaging with pre-filled context
  const guestUserId = proposal['Guest User']?._id || proposal.guestUserId;
  const listingId = proposal['Split Lease']?._id || proposal.listingId;

  if (guestUserId && listingId) {
    window.location.href = `/messages?guest=${guestUserId}&listing=${listingId}&proposalId=${proposal._id}`;
  } else {
    showToast('Unable to open messaging - missing user or listing information', 'error');
  }
};

// For reminder system - mark as planned, not TODO
// PLANNED: Phase 2 - Email/notification reminder system
// See: .claude/plans/Documents/reminder-system-spec.md
```

**Testing:**
- [ ] Verify messaging link opens with correct parameters
- [ ] Verify error handling for missing data

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 8)

### CHUNK 8: Remove excessive console.log from FavoriteListingsPage
**File:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Line:** Multiple (15 occurrences)
**Issue:** 15 console.log statements in production code
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
console.log('📱 FavoriteListingsPage: Rendering with', {
  favoritesCount: favorites.length,
  isLoading,
  error
});
// ... 14 more console.log statements
```

**Refactored Code:**
```javascript
import { log } from '../../../lib/logger.js';

// Replace console.log with structured logging
log.debug('FavoriteListingsPage: Rendering', { favoritesCount: favorites.length, isLoading, error });
```

**Testing:**
- [ ] Verify page loads correctly
- [ ] Verify no console.log in production

~~~~~

## PAGE GROUP: /account-profile (Chunks: 9, 10)

### CHUNK 9: Resolve TODO - Implement cover photo upload
**File:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Line:** 905
**Issue:** TODO for cover photo upload feature
**Affected Pages:** /account-profile

**Current Code:**
```javascript
const handleCoverPhotoUpload = async (file) => {
  // TODO: Implement cover photo upload
  console.log('Cover photo upload not yet implemented');
};
```

**Refactored Code:**
```javascript
const handleCoverPhotoUpload = async (file) => {
  if (!file) return;

  try {
    setIsUploadingCover(true);

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a JPEG, PNG, or WebP image', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showToast('Image must be under 5MB', 'error');
      return;
    }

    const { photoUrl, error } = await uploadPhoto(file, {
      bucket: 'user-cover-photos',
      userId: userId,
      resize: { width: 1200, height: 400 }
    });

    if (error) throw error;

    // Update user profile with new cover photo URL
    await updateUserProfile({ coverPhotoUrl: photoUrl });
    showToast('Cover photo updated successfully', 'success');

  } catch (err) {
    log.error('Cover photo upload failed', err);
    showToast('Failed to upload cover photo', 'error');
  } finally {
    setIsUploadingCover(false);
  }
};
```

**Testing:**
- [ ] Verify file type validation
- [ ] Verify size limit enforcement
- [ ] Verify successful upload updates profile

~~~~~

### CHUNK 10: Resolve TODO - Implement referral invite flow
**File:** `app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx`
**Line:** 38
**Issue:** TODO for referral invite flow
**Affected Pages:** /account-profile

**Current Code:**
```javascript
const handleInviteFriends = () => {
  // TODO(human): Implement referral invite flow
  console.log('Invite friends clicked');
};
```

**Refactored Code:**
```javascript
const handleInviteFriends = () => {
  // Open share modal or native share API
  if (navigator.share) {
    navigator.share({
      title: 'Join Split Lease',
      text: 'I found a great way to save on NYC rentals. Use my referral code!',
      url: `${window.location.origin}/referral?ref=${userId}`
    }).catch(err => {
      // User cancelled or share failed - fallback to copy
      copyReferralLink();
    });
  } else {
    copyReferralLink();
  }
};

const copyReferralLink = () => {
  const link = `${window.location.origin}/referral?ref=${userId}`;
  navigator.clipboard.writeText(link);
  showToast('Referral link copied to clipboard!', 'success');
};
```

**Testing:**
- [ ] Verify native share works on mobile
- [ ] Verify fallback copy works on desktop
- [ ] Verify referral link format is correct

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 11, 12)

### CHUNK 11: Resolve TODO - Handle photo type change
**File:** `app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx`
**Line:** 244
**Issue:** TODO for photo type change functionality
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
<select
  value={photo.type || 'general'}
  onChange={(e) => {
    // TODO: Handle photo type change
  }}
>
```

**Refactored Code:**
```javascript
<select
  value={photo.type || 'general'}
  onChange={(e) => handlePhotoTypeChange(photo.id, e.target.value)}
>

// Add handler function
const handlePhotoTypeChange = async (photoId, newType) => {
  try {
    await updatePhotoMetadata(photoId, { type: newType });

    // Update local state
    setPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, type: newType } : p
    ));

    showToast('Photo type updated', 'success');
  } catch (err) {
    log.error('Failed to update photo type', err);
    showToast('Failed to update photo type', 'error');
  }
};
```

**Testing:**
- [ ] Verify dropdown selection works
- [ ] Verify type persists after page reload

~~~~~

### CHUNK 12: Remove console.log from PricingEditSection
**File:** `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`
**Line:** Multiple (3 occurrences)
**Issue:** console.log statements in production
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
console.log('PricingEditSection: Saving pricing data', formData);
```

**Refactored Code:**
```javascript
import { log } from '../../../../lib/logger.js';

log.debug('PricingEditSection: Saving pricing data', formData);
```

**Testing:**
- [ ] Verify pricing save works correctly
- [ ] Verify no console output in production

~~~~~

## PAGE GROUP: SHARED COMPONENTS (Chunks: 13, 14)

### CHUNK 13: Add React.memo to frequently re-rendered components
**File:** `app/src/islands/shared/ListingCard/PropertyCard.jsx`
**Line:** Entire component
**Issue:** No React.memo usage in entire codebase (0 files). ListingCard renders in search results (20+ cards), causing unnecessary re-renders.
**Affected Pages:** /search, /favorite-listings, /view-split-lease (suggested listings)

**Current Code:**
```javascript
export default function PropertyCard({ listing, onFavoriteToggle, isFavorited }) {
  // Component implementation
  return (
    <div className="property-card">
      {/* ... */}
    </div>
  );
}
```

**Refactored Code:**
```javascript
import { memo } from 'react';

function PropertyCard({ listing, onFavoriteToggle, isFavorited }) {
  // Component implementation
  return (
    <div className="property-card">
      {/* ... */}
    </div>
  );
}

// Memoize to prevent re-renders when props haven't changed
export default memo(PropertyCard, (prevProps, nextProps) => {
  return (
    prevProps.listing._id === nextProps.listing._id &&
    prevProps.isFavorited === nextProps.isFavorited
  );
});
```

**Testing:**
- [ ] Verify card renders correctly
- [ ] Use React DevTools to verify reduced re-renders
- [ ] Performance test with 20+ cards

~~~~~

### CHUNK 14: Replace inline onClick handlers with useCallback
**File:** `app/src/islands/shared/EditListingDetails/EditListingDetails.jsx`
**Line:** 108, 258, 303, 352, 397, 448, 503, 575, 649, 700, 801, 881
**Issue:** 12 inline arrow functions in onClick handlers create new function references on every render
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
<div className="eld-collapsible-header" onClick={() => toggleSection('name')}>
<div className="eld-collapsible-header" onClick={() => toggleSection('title')}>
<div className="eld-collapsible-header" onClick={() => toggleSection('description')}>
// ... 9 more similar patterns
```

**Refactored Code:**
```javascript
import { useCallback } from 'react';

// Create stable handler references
const handleToggleName = useCallback(() => toggleSection('name'), [toggleSection]);
const handleToggleTitle = useCallback(() => toggleSection('title'), [toggleSection]);
const handleToggleDescription = useCallback(() => toggleSection('description'), [toggleSection]);
// ... or use a single handler with data attributes

// Better approach - use data attributes
const handleToggleSection = useCallback((e) => {
  const section = e.currentTarget.dataset.section;
  toggleSection(section);
}, [toggleSection]);

<div
  className="eld-collapsible-header"
  data-section="name"
  onClick={handleToggleSection}
>
<div
  className="eld-collapsible-header"
  data-section="title"
  onClick={handleToggleSection}
>
```

**Testing:**
- [ ] Verify all collapsible sections expand/collapse
- [ ] Verify keyboard accessibility still works
- [ ] Use React DevTools to confirm stable references

~~~~~

## Implementation Priority

| Priority | Chunk(s) | Impact | Effort |
|----------|----------|--------|--------|
| 1 - High | 1, 5, 6 | Code deduplication - single source of truth for DAYS_OF_WEEK | Low |
| 2 - High | 2 | Code deduplication - isContiguous logic | Low |
| 3 - High | 4 | Complete pricing migration (resolves tech debt) | Medium |
| 4 - Medium | 3, 8, 12 | Remove console.log (762 statements total) | Low |
| 5 - Medium | 13, 14 | Performance optimization (React.memo, useCallback) | Medium |
| 6 - Low | 7, 9, 10, 11 | Resolve TODO comments (feature completeness) | High |

---

## Files Referenced

### Files to Modify
- `app/src/lib/dayUtils.js` - Add DAYS_OF_WEEK export
- `app/src/islands/shared/SearchScheduleSelector.jsx` - Import from dayUtils, remove duplication
- `app/src/islands/modals/GuestEditingProposalModal.jsx` - Import from dayUtils
- `app/src/islands/shared/HostEditingProposal/types.js` - Re-export from dayUtils
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Update pricing import
- `app/src/islands/shared/useScheduleSelectorLogicCore.js` - Update pricing import
- `app/src/lib/scheduleSelector/priceCalculations.js` - Add deprecation warning
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` - Replace console.log
- `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` - Replace console.log
- `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` - Implement messaging
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` - Implement cover photo
- `app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx` - Implement referral
- `app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx` - Implement photo type
- `app/src/islands/shared/ListingCard/PropertyCard.jsx` - Add React.memo
- `app/src/islands/shared/EditListingDetails/EditListingDetails.jsx` - Add useCallback

### Files to Reference
- `app/src/logic/calculators/scheduling/isContiguousSelection.js` - Existing implementation
- `app/src/logic/calculators/pricing/calculatePricingBreakdown.js` - Target pricing implementation
- `app/src/lib/logger.js` - Logging utility for console.log replacement
- `app/src/routes.config.js` - Page-to-route mapping

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking pricing calculations | Run side-by-side comparison tests for all rental types |
| Breaking day selection | Unit test isContiguous with edge cases (wrap-around) |
| Import path errors | Use IDE refactoring tools, verify with build |
| React.memo over-optimization | Only memoize components with expensive renders |
