# Code Refactoring Plan - app

Date: 2026-01-15
Audit Type: general

~~~~~

## PAGE GROUP: AUTO (Duplicate/Stale Files - All Pages)

### CHUNK 1: Remove duplicate EditPhoneNumberModal (1) files
**File:** `app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx`
**Line:** ALL
**Issue:** Duplicate file with (1) (1) suffix indicates accidental file copy. These duplicate files create maintenance burden, potential import confusion, and codebase bloat.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Files to delete:
// app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
// app/src/islands/modals/EditPhoneNumberModal (1).jsx
```

**Refactored Code:**
```javascript
// Delete both files. Keep only:
// app/src/islands/modals/EditPhoneNumberModal.jsx
```

**Testing:**
- [ ] Search codebase for imports of these duplicate files
- [ ] Verify no runtime errors after deletion
- [ ] Run `bun run build` to confirm no broken imports

~~~~~

### CHUNK 2: Remove duplicate NotificationSettingsModal (1) file
**File:** `app/src/islands/modals/NotificationSettingsModal (1).jsx`
**Line:** ALL
**Issue:** Duplicate file with (1) suffix. Contains TODO comments and console.log that won't be maintained.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// File to delete:
// app/src/islands/modals/NotificationSettingsModal (1).jsx
```

**Refactored Code:**
```javascript
// Delete file. Keep only:
// app/src/islands/modals/NotificationSettingsModal.jsx (if exists)
// Or rename if this is the only version
```

**Testing:**
- [ ] Search for imports of this duplicate
- [ ] Verify modal functionality after cleanup
- [ ] Run build validation

~~~~~

### CHUNK 3: Remove duplicate AuthAwareSearchScheduleSelector files
**File:** `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
**Line:** ALL
**Issue:** Two duplicate files with (1) and (1) (1) suffixes exist alongside the main file. This creates import confusion and maintenance overhead.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Files to delete:
// app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
// app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
```

**Refactored Code:**
```javascript
// Delete both duplicate files. Keep only:
// app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx
```

**Testing:**
- [ ] Verify AuthAwareSearchScheduleSelector.jsx is the canonical version
- [ ] Search for any imports of duplicate files
- [ ] Test search page schedule selector functionality

~~~~~

### CHUNK 4: Remove duplicate lib files
**File:** `app/src/lib/proposalDataFetcher (1).js`
**Line:** ALL
**Issue:** Multiple duplicate lib files with (1) suffix exist, causing potential import issues.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Files to delete:
// app/src/lib/proposalDataFetcher (1).js
// app/src/lib/secureStorage (1).js
// app/src/lib/SECURE_AUTH_README (1).md
```

**Refactored Code:**
```javascript
// Delete all (1) suffix files. Canonical files:
// app/src/lib/proposalDataFetcher.js
// app/src/lib/secureStorage.js
// app/src/lib/SECURE_AUTH_README.md
```

**Testing:**
- [ ] Verify no imports reference the (1) files
- [ ] Test proposal and auth flows
- [ ] Run full build

~~~~~

### CHUNK 5: Remove duplicate CSS files
**File:** `app/src/styles/components/create-listing-modal (1).css`
**Line:** ALL
**Issue:** Duplicate CSS files with (1) suffix create style inconsistency risks.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Files to delete:
// app/src/styles/components/create-listing-modal (1) (1).css
// app/src/styles/components/create-listing-modal (1).css
```

**Refactored Code:**
```javascript
// Delete both. Keep only:
// app/src/styles/components/create-listing-modal.css
```

**Testing:**
- [ ] Check CSS imports in create listing modal component
- [ ] Visual regression test create listing modal
- [ ] Run build

~~~~~

### CHUNK 6: Remove deprecated ViewSplitLeasePage-old.jsx
**File:** `app/src/islands/pages/ViewSplitLeasePage-old.jsx`
**Line:** ALL (1396 lines)
**Issue:** Old version of ViewSplitLeasePage kept alongside current version. Contains stale TODOs and outdated implementation. Should be removed after verifying current page works.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// File to delete:
// app/src/islands/pages/ViewSplitLeasePage-old.jsx (1396 lines of dead code)
```

**Refactored Code:**
```javascript
// Delete the file. Current implementation is:
// app/src/islands/pages/ViewSplitLeasePage.jsx
```

**Testing:**
- [ ] Verify ViewSplitLeasePage.jsx is functioning correctly
- [ ] Search for any imports of the old file
- [ ] Test view-split-lease page end-to-end

~~~~~

### CHUNK 7: Remove deprecated search-page-old.css
**File:** `app/src/styles/components/search-page-old.css`
**Line:** ALL
**Issue:** Old CSS file kept alongside current version, creating potential style conflicts.
**Affected Pages:** /search

**Current Code:**
```javascript
// File to delete:
// app/src/styles/components/search-page-old.css
```

**Refactored Code:**
```javascript
// Delete the file. Current implementation uses:
// app/src/styles/components/search-page.css (or equivalent)
```

**Testing:**
- [ ] Verify search page styling is correct
- [ ] Check for any imports of old CSS
- [ ] Visual regression test search page

~~~~~

## PAGE GROUP: /view-split-lease, /search (Price Calculation Duplication)

### CHUNK 8: Consolidate duplicate price calculation functions - priceCalculations.js vs Logic Core
**File:** `app/src/lib/priceCalculations.js`
**Line:** 16-31
**Issue:** Duplicate pricing logic exists in `app/src/lib/priceCalculations.js` (legacy) and `app/src/logic/calculators/pricing/` (Logic Core). The legacy file uses relaxed validation while Logic Core uses strict validation. This creates inconsistency in price calculation behavior.
**Affected Pages:** /view-split-lease, /search

**Current Code:**
```javascript
// app/src/lib/priceCalculations.js - Legacy (relaxed validation)
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) {
  if (!nightlyPrice || !nightsPerWeek) return 0;
  return nightlyPrice * nightsPerWeek * 4;
}

export function calculateReservationTotal(fourWeekRent, totalWeeks) {
  if (!fourWeekRent || !totalWeeks) return 0;
  return fourWeekRent * (totalWeeks / 4);
}
```

**Refactored Code:**
```javascript
// DEPRECATE app/src/lib/priceCalculations.js
// Use Logic Core instead:
// app/src/logic/calculators/pricing/calculateFourWeekRent.js
// app/src/logic/calculators/pricing/calculateReservationTotal.js
// app/src/logic/calculators/pricing/calculatePricingBreakdown.js

// Update imports in consuming files from:
import { calculate4WeekRent } from '../../lib/priceCalculations.js';
// To:
import { calculateFourWeekRent } from '../../logic/calculators/pricing/calculateFourWeekRent.js';
```

**Testing:**
- [ ] Find all imports of lib/priceCalculations.js
- [ ] Update to use Logic Core functions
- [ ] Verify price calculations remain consistent
- [ ] Test pricing on view-split-lease page

~~~~~

### CHUNK 9: Consolidate scheduleSelector/priceCalculations.js with Logic Core
**File:** `app/src/lib/scheduleSelector/priceCalculations.js`
**Line:** 33-112
**Issue:** Third copy of price calculation logic with 411 lines including console.log statements. This is the most complete implementation but should be migrated to Logic Core architecture. The TODO at line 18 of `useScheduleSelectorLogicCore.js` already notes this needs migration.
**Affected Pages:** /view-split-lease, /search

**Current Code:**
```javascript
// app/src/lib/scheduleSelector/priceCalculations.js
export const calculatePrice = (selectedNights, listing, reservationSpan = 13, zatConfig = null) => {
  const nightsCount = selectedNights.length;

  console.log('=== CALCULATE PRICE ===');  // Debug logging in production
  console.log('nightsCount:', nightsCount);
  // ... 400+ lines of logic
}
```

**Refactored Code:**
```javascript
// Migrate logic to app/src/logic/calculators/pricing/
// Remove console.log statements
// Use strict validation pattern from Logic Core
// Export from app/src/logic/index.js

// Example structure:
// calculateMonthlyPrice.js
// calculateWeeklyPrice.js
// calculateNightlyPrice.js
// calculateTotalReservationPrice.js
```

**Testing:**
- [ ] Create comprehensive test suite for all rental types
- [ ] Verify Monthly, Weekly, and Nightly calculations
- [ ] Test edge cases (missing rates, unusual reservation spans)
- [ ] Remove debug console.log statements

~~~~~

## PAGE GROUP: /search (Code Quality)

### CHUNK 10: Extract duplicate photo/host fetching logic in useSearchPageLogic.js
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** 221-263, 376-425
**Issue:** Photo ID collection and batch fetching logic is duplicated in `fetchAllActiveListings` (lines 221-263) and `fetchListings` (lines 376-425). This violates DRY principle and creates maintenance burden.
**Affected Pages:** /search

**Current Code:**
```javascript
// Lines 221-240 in fetchAllActiveListings:
const allPhotoIds = new Set()
data.forEach((listing) => {
  const photosField = listing['Features - Photos']
  if (Array.isArray(photosField)) {
    photosField.forEach((id) => allPhotoIds.add(id))
  } else if (typeof photosField === 'string') {
    try {
      const parsed = JSON.parse(photosField)
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => allPhotoIds.add(id))
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
})

// EXACT SAME CODE at lines 376-395 in fetchListings
```

**Refactored Code:**
```javascript
// Extract to app/src/lib/supabaseUtils.js or dedicated utility:
/**
 * Collects all photo IDs from an array of listings
 * @param {Array} listings - Array of listing objects
 * @returns {Set} Set of unique photo IDs
 */
export function collectPhotoIds(listings) {
  const photoIds = new Set()
  listings.forEach((listing) => {
    const photosField = listing['Features - Photos']
    if (Array.isArray(photosField)) {
      photosField.forEach((id) => photoIds.add(id))
    } else if (typeof photosField === 'string') {
      try {
        const parsed = JSON.parse(photosField)
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => photoIds.add(id))
        }
      } catch {
        // Silently ignore parse errors for robustness
      }
    }
  })
  return photoIds
}

// Usage in useSearchPageLogic.js:
const photoIds = collectPhotoIds(data)
const photoMap = await fetchPhotoUrls(Array.from(photoIds))
```

**Testing:**
- [ ] Unit test collectPhotoIds with various input formats
- [ ] Verify search page photos load correctly
- [ ] Test with malformed photo field data

~~~~~

### CHUNK 11: Remove excessive debug logging in useSearchPageLogic.js
**File:** `app/src/islands/pages/useSearchPageLogic.js`
**Line:** 218, 238, 239, 243, 282, 373, 394, 395, 398, 448, 584, 724-731
**Issue:** Extensive console.log statements throughout production code (325 total across codebase). These statements clutter console output, leak implementation details, and slightly impact performance.
**Affected Pages:** /search

**Current Code:**
```javascript
// Multiple instances like:
console.log('🌍 Fetching ALL active listings for map background (green pins)...')
console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings')
console.log('📷 fetchAllActiveListings: Collected', allPhotoIds.size, 'unique photo IDs')
console.log('📷 fetchAllActiveListings: Sample photo IDs:', photoIdsArray.slice(0, 3))
// ... and many more
```

**Refactored Code:**
```javascript
// Option 1: Remove all debug logs for production
// Option 2: Create debug utility that respects environment

// app/src/lib/debug.js
const DEBUG = import.meta.env.DEV

export const debugLog = (category, message, data) => {
  if (DEBUG) {
    console.log(`[${category}]`, message, data)
  }
}

// Usage:
debugLog('SearchPage', 'Fetched listings', { count: data.length })
```

**Testing:**
- [ ] Create debug utility module
- [ ] Replace all console.log with conditional debug logging
- [ ] Verify no console output in production mode
- [ ] Ensure debug mode still shows logs in development

~~~~~

## PAGE GROUP: /view-split-lease (Code Quality)

### CHUNK 12: Address unimplemented TODO in validateMoveInDateWorkflow
**File:** `app/src/islands/pages/useViewSplitLeasePageLogic.js`
**Line:** 119-131
**Issue:** The `validateMoveInDateWorkflow` is called but error handling catches and logs errors without providing user feedback. The `VALIDATION_ERROR` errorCode is returned but not handled by the UI.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Lines 117-132
try {
  const moveInDateObj = new Date(moveInDate)
  return validateMoveInDateWorkflow({
    moveInDate: moveInDateObj,
    listing: {
      firstAvailable: listing['First Available'] || listing[' First Available'],
      lastAvailable: listing['Last Available'],
      blockedDates: listing['Dates - Blocked'] || []
    },
    selectedDayIndices
  })
} catch (err) {
  console.error('Error validating move-in date:', err)
  return { valid: false, errorCode: 'VALIDATION_ERROR' }
}
```

**Refactored Code:**
```javascript
// Lines 117-135 - Improved error handling
try {
  const moveInDateObj = new Date(moveInDate)
  return validateMoveInDateWorkflow({
    moveInDate: moveInDateObj,
    listing: {
      firstAvailable: listing['First Available'] || listing[' First Available'],
      lastAvailable: listing['Last Available'],
      blockedDates: listing['Dates - Blocked'] || []
    },
    selectedDayIndices
  })
} catch (err) {
  // Log with structured error for debugging
  console.error('[ViewSplitLease] Move-in date validation failed:', {
    error: err.message,
    moveInDate,
    selectedDayIndices
  })
  // Return user-friendly error code
  return {
    valid: false,
    errorCode: 'VALIDATION_ERROR',
    errorMessage: 'Unable to validate the selected move-in date. Please try a different date.'
  }
}
```

**Testing:**
- [ ] Verify error message displays in UI
- [ ] Test with invalid date inputs
- [ ] Test with edge case dates (past, far future)

~~~~~

## PAGE GROUP: /host-proposals (Incomplete Implementation)

### CHUNK 13: Address unimplemented TODO placeholders in useHostProposalsPageLogic.js
**File:** `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Line:** 706, 797
**Issue:** Multiple TODO comments indicating incomplete functionality that should either be implemented or removed.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// Line 706
// TODO: Navigate to messaging or open message modal

// Line 797
// TODO: Call API to send rental app request notification to guest
```

**Refactored Code:**
```javascript
// Line 706 - Implement messaging navigation
const handleOpenMessage = useCallback((proposalId, guestId) => {
  // Navigate to messaging page with proposal context
  window.location.href = `/messaging?thread=${proposalId}&recipient=${guestId}`
}, [])

// Line 797 - Implement rental app request
const handleRequestRentalApp = useCallback(async (proposalId, guestId) => {
  try {
    await supabase.functions.invoke('notification', {
      body: {
        action: 'rental_app_request',
        proposalId,
        guestId
      }
    })
    // Show success toast
  } catch (error) {
    console.error('Failed to send rental app request:', error)
    // Show error toast
  }
}, [])
```

**Testing:**
- [ ] Test message button navigates correctly
- [ ] Test rental app request sends notification
- [ ] Verify toast feedback to user

~~~~~

## PAGE GROUP: /listing-dashboard (Incomplete Implementation)

### CHUNK 14: Address unimplemented TODO placeholders in useListingDashboardPageLogic.js
**File:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Line:** 621, 628, 647
**Issue:** Multiple TODO comments for navigation and data persistence that are incomplete.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// Line 621
// TODO: Navigate to meetings or scroll to section

// Line 628
// TODO: Navigate to leases or scroll to section

// Line 647
// TODO: Debounce and save to backend
```

**Refactored Code:**
```javascript
// Line 621 - Implement meetings navigation
const handleViewMeetings = useCallback((listingId) => {
  const meetingsSection = document.getElementById('meetings-section')
  if (meetingsSection) {
    meetingsSection.scrollIntoView({ behavior: 'smooth' })
  }
}, [])

// Line 628 - Implement leases navigation
const handleViewLeases = useCallback((listingId) => {
  const leasesSection = document.getElementById('leases-section')
  if (leasesSection) {
    leasesSection.scrollIntoView({ behavior: 'smooth' })
  }
}, [])

// Line 647 - Implement debounced save
import { useDebouncedCallback } from 'use-debounce'

const debouncedSave = useDebouncedCallback(async (field, value) => {
  await updateListing(listingId, { [field]: value })
}, 500)
```

**Testing:**
- [ ] Test smooth scroll navigation to sections
- [ ] Test debounced auto-save functionality
- [ ] Verify no data loss during rapid edits

~~~~~

## PAGE GROUP: /proposals (Incomplete Implementation)

### CHUNK 15: Address multiple unimplemented TODOs in ProposalCard.jsx
**File:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Line:** 983, 1267, 1292, 1315
**Issue:** Large component (1409 lines) with multiple TODO placeholders for critical functionality like cancel API, action handlers, and navigation.
**Affected Pages:** /proposals

**Current Code:**
```javascript
// Line 983
// TODO: Implement actual cancel API call here

// Line 1267
// TODO: Add handlers for other actions (remind_sl, accept_counteroffer, etc.)

// Line 1292
// TODO: Add handlers for other actions (reject_suggestion, review_counteroffer, verify_identity)

// Line 1315
// TODO: Implement house manual navigation
```

**Refactored Code:**
```javascript
// These should be implemented using existing workflow functions:
import { cancelProposalWorkflow } from '../../../logic/workflows/proposals/cancelProposalWorkflow.js'

// Line 983 - Implement cancel
const handleCancel = async (proposalId) => {
  try {
    await cancelProposalWorkflow({ proposalId, userId })
    // Refresh proposal list
    onRefresh?.()
  } catch (error) {
    setError(error.message)
  }
}

// Line 1315 - House manual navigation
const handleViewHouseManual = (listingId) => {
  window.location.href = `/listing/${listingId}/house-manual`
}
```

**Testing:**
- [ ] Test cancel proposal flow
- [ ] Test all action button handlers
- [ ] Test house manual navigation
- [ ] Verify proper error handling

~~~~~

## PAGE GROUP: AUTO (Code Quality - Large File Warning)

### CHUNK 16: Refactor oversized ViewSplitLeasePage.jsx (3624 lines)
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** ALL
**Issue:** File has 3624 lines which far exceeds recommended component size (~300-500 lines). This makes the file hard to navigate, test, and maintain.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Single 3624-line file containing:
// - Page layout
// - Photo gallery
// - Booking widget
// - Amenities display
// - Host info
// - Location map
// - Reviews
// - Contact modal
// - Proposal modal
// - etc.
```

**Refactored Code:**
```javascript
// Split into focused components:
// app/src/islands/pages/ViewSplitLeasePage/
// ├── ViewSplitLeasePage.jsx (main orchestrator, ~200 lines)
// ├── components/
// │   ├── PhotoGallery.jsx
// │   ├── BookingWidget.jsx
// │   ├── AmenitiesList.jsx
// │   ├── HostInfo.jsx
// │   ├── LocationSection.jsx
// │   ├── ReviewsSection.jsx
// │   └── PropertyDetails.jsx
// └── useViewSplitLeasePageLogic.js (existing)
```

**Testing:**
- [ ] Identify logical component boundaries
- [ ] Extract components one at a time
- [ ] Maintain existing functionality
- [ ] Update imports in main page
- [ ] Visual regression testing

~~~~~

### CHUNK 17: Refactor oversized SearchPage.jsx (3145 lines)
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** ALL
**Issue:** File has 3145 lines which far exceeds recommended component size. Contains tightly coupled UI logic.
**Affected Pages:** /search

**Current Code:**
```javascript
// Single 3145-line file containing mixed concerns
```

**Refactored Code:**
```javascript
// Split into focused components:
// app/src/islands/pages/SearchPage/
// ├── SearchPage.jsx (main orchestrator, ~200 lines)
// ├── components/
// │   ├── SearchFilters.jsx
// │   ├── ListingGrid.jsx
// │   ├── MapView.jsx
// │   ├── MobileFilterPanel.jsx
// │   └── SortDropdown.jsx
// └── useSearchPageLogic.js (existing)
```

**Testing:**
- [ ] Plan component extraction strategy
- [ ] Extract one component at a time
- [ ] Verify filter/map interactions work
- [ ] Test mobile and desktop views

~~~~~

### CHUNK 18: Refactor oversized SignUpLoginModal.jsx (2452 lines)
**File:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Line:** ALL
**Issue:** Authentication modal has grown to 2452 lines. Contains inline styles object (~500+ lines), multiple view states, and complex flow logic.
**Affected Pages:** AUTO (All pages with auth)

**Current Code:**
```javascript
// Single file with:
// - ~500 lines of inline style objects
// - 8+ different view states
// - OAuth handling
// - Form validation
// - Multi-step signup flow
```

**Refactored Code:**
```javascript
// Split into modular structure:
// app/src/islands/shared/SignUpLoginModal/
// ├── SignUpLoginModal.jsx (orchestrator, ~300 lines)
// ├── styles.js (extracted style objects)
// ├── views/
// │   ├── EntryView.jsx
// │   ├── LoginView.jsx
// │   ├── UserTypeView.jsx
// │   ├── IdentityView.jsx
// │   ├── PasswordView.jsx
// │   ├── PasswordResetView.jsx
// │   └── MagicLinkView.jsx
// └── useSignUpLoginLogic.js (state management)
```

**Testing:**
- [ ] Extract styles first (lowest risk)
- [ ] Extract view components one at a time
- [ ] Test all authentication flows
- [ ] Test OAuth (LinkedIn, Google)
- [ ] Test password reset flow

~~~~~

## PAGE GROUP: AUTO (Performance)

### CHUNK 19: Remove production console.log statements across codebase
**File:** Multiple files
**Line:** Various (325 occurrences)
**Issue:** 325 console.log statements found across the codebase. These impact performance, clutter developer console, and may leak sensitive debug information.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Top offenders by count:
// app/src/lib/auth.js - 93 occurrences
// app/src/lib/listingService.js - 48 occurrences
// app/src/lib/listingDataFetcher.js - 24 occurrences
// app/src/lib/proposals/userProposalQueries.js - 23 occurrences
// app/src/lib/bubbleAPI.js - 17 occurrences
```

**Refactored Code:**
```javascript
// Create centralized logger utility:
// app/src/lib/logger.js
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR

export const logger = {
  error: (msg, data) => currentLevel >= LOG_LEVELS.ERROR && console.error(`[ERROR] ${msg}`, data),
  warn: (msg, data) => currentLevel >= LOG_LEVELS.WARN && console.warn(`[WARN] ${msg}`, data),
  info: (msg, data) => currentLevel >= LOG_LEVELS.INFO && console.log(`[INFO] ${msg}`, data),
  debug: (msg, data) => currentLevel >= LOG_LEVELS.DEBUG && console.log(`[DEBUG] ${msg}`, data)
}

// Usage:
import { logger } from './lib/logger.js'
logger.debug('Auth state changed', { user })
```

**Testing:**
- [ ] Create logger module
- [ ] Create lint rule to prevent raw console.log
- [ ] Gradually migrate files
- [ ] Verify no logs in production build

~~~~~

## PAGE GROUP: /account-profile (TODO Placeholder)

### CHUNK 20: Implement cover photo upload TODO
**File:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Line:** 928
**Issue:** Cover photo upload functionality is marked as TODO but the UI may already expect this feature.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// Line 928
// TODO: Implement cover photo upload
```

**Refactored Code:**
```javascript
// Implement cover photo upload handler
const handleCoverPhotoUpload = useCallback(async (file) => {
  if (!file) return

  try {
    setUploadingCoverPhoto(true)

    // Upload to Supabase storage
    const fileName = `cover-photos/${user.id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file)

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)

    // Update user profile
    await updateUserProfile({ coverPhotoUrl: publicUrl })

  } catch (error) {
    setError('Failed to upload cover photo')
    console.error('Cover photo upload error:', error)
  } finally {
    setUploadingCoverPhoto(false)
  }
}, [user?.id])
```

**Testing:**
- [ ] Test file upload with various image formats
- [ ] Test upload progress indicator
- [ ] Test error handling for large files
- [ ] Verify image displays correctly after upload

~~~~~

## PAGE GROUP: /search (TODO Placeholder)

### CHUNK 21: Implement Google Map hover effects TODO
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 890
**Issue:** Map marker hover effects are disabled with a TODO noting a positioning bug needs fixing.
**Affected Pages:** /search

**Current Code:**
```javascript
// Line 890
// TODO: Re-implement hover effects after fixing positioning bug
```

**Refactored Code:**
```javascript
// Investigate and fix positioning bug, then implement:
const handleMarkerHover = useCallback((markerId, isHovering) => {
  const marker = markersRef.current.find(m => m.id === markerId)
  if (!marker) return

  if (isHovering) {
    // Elevate marker z-index
    marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1)
    // Show price tooltip
    marker.setIcon({
      ...marker.getIcon(),
      scale: 1.2 // Slight scale increase
    })
  } else {
    // Reset to normal state
    marker.setZIndex(null)
    marker.setIcon({
      ...marker.getIcon(),
      scale: 1.0
    })
  }
}, [])
```

**Testing:**
- [ ] Identify the positioning bug cause
- [ ] Fix marker positioning
- [ ] Implement hover effects
- [ ] Test on both desktop and mobile

~~~~~

## PAGE GROUP: AUTO (Learning - TODO(human) Placeholders)

### CHUNK 22: Implement TODO(human) in AiSignupMarketReport.jsx
**File:** `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
**Line:** 672
**Issue:** Human learning placeholder for topic detection logic that was never implemented.
**Affected Pages:** AUTO (AI signup flow)

**Current Code:**
```javascript
// Line 672
// TODO(human): Implement the topic detection logic
```

**Refactored Code:**
```javascript
// Implement topic detection for market report customization
const detectTopics = (userInput) => {
  const topics = []
  const lowerInput = userInput.toLowerCase()

  // Detect location interests
  if (/manhattan|brooklyn|queens|bronx|staten/i.test(lowerInput)) {
    topics.push('location')
  }

  // Detect price sensitivity
  if (/budget|cheap|affordable|expensive|price/i.test(lowerInput)) {
    topics.push('pricing')
  }

  // Detect amenity preferences
  if (/gym|pool|laundry|parking|pet/i.test(lowerInput)) {
    topics.push('amenities')
  }

  // Detect timing preferences
  if (/weekend|weekday|flexible|specific days/i.test(lowerInput)) {
    topics.push('schedule')
  }

  return topics
}
```

**Testing:**
- [ ] Test topic detection with various inputs
- [ ] Verify detected topics influence report content
- [ ] Test edge cases (no topics, multiple topics)

~~~~~

### CHUNK 23: Implement TODO(human) in ReferralBanner.jsx
**File:** `app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx`
**Line:** 38
**Issue:** Referral invite flow is marked as TODO(human) placeholder.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// Line 38
// TODO(human): Implement referral invite flow
```

**Refactored Code:**
```javascript
// Implement referral invite functionality
const handleInviteFriend = useCallback(async () => {
  try {
    // Generate unique referral code if not exists
    let referralCode = user.referralCode
    if (!referralCode) {
      referralCode = await generateReferralCode(user.id)
    }

    // Open share dialog
    const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`

    if (navigator.share) {
      await navigator.share({
        title: 'Join Split Lease',
        text: 'Get $50 off your first booking!',
        url: shareUrl
      })
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      showToast('Referral link copied!')
    }
  } catch (error) {
    console.error('Share failed:', error)
  }
}, [user])
```

**Testing:**
- [ ] Test referral code generation
- [ ] Test native share dialog on mobile
- [ ] Test clipboard fallback on desktop
- [ ] Verify referral tracking works

~~~~~

### CHUNK 24: Implement TODO(human) in WhyThisProposal.jsx
**File:** `app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx`
**Line:** 13
**Issue:** Summary display logic marked as TODO(human) placeholder.
**Affected Pages:** AUTO (Suggested proposals component)

**Current Code:**
```javascript
// Line 13
// TODO(human): Implement the summary display logic
```

**Refactored Code:**
```javascript
// Implement summary display for why a proposal is suggested
const WhyThisProposal = ({ proposal, userPreferences }) => {
  const reasons = useMemo(() => {
    const matchReasons = []

    // Check price match
    if (proposal.nightlyRate <= userPreferences.maxBudget) {
      matchReasons.push({
        icon: '💰',
        text: 'Within your budget'
      })
    }

    // Check location match
    if (userPreferences.preferredNeighborhoods?.includes(proposal.neighborhood)) {
      matchReasons.push({
        icon: '📍',
        text: `In your preferred area: ${proposal.neighborhood}`
      })
    }

    // Check schedule match
    if (proposal.daysAvailable.some(d => userPreferences.preferredDays?.includes(d))) {
      matchReasons.push({
        icon: '📅',
        text: 'Matches your preferred days'
      })
    }

    return matchReasons
  }, [proposal, userPreferences])

  return (
    <div className="why-this-proposal">
      {reasons.map((reason, i) => (
        <div key={i} className="reason-item">
          <span className="reason-icon">{reason.icon}</span>
          <span className="reason-text">{reason.text}</span>
        </div>
      ))}
    </div>
  )
}
```

**Testing:**
- [ ] Test with various proposal/preference combinations
- [ ] Verify reasons display correctly
- [ ] Test empty state (no matching reasons)

~~~~~

## SUMMARY

| Priority | Chunks | Description |
|----------|--------|-------------|
| HIGH | 1-7 | Remove duplicate/stale files (immediate disk cleanup) |
| HIGH | 8-9 | Consolidate duplicate price calculation logic |
| MEDIUM | 10-15 | Address TODO placeholders and incomplete implementations |
| MEDIUM | 16-18 | Break up oversized components |
| LOW | 19-24 | Performance optimization and minor enhancements |

**Total Files Affected:** ~50+
**Estimated LOC to Remove:** ~5,000+ (duplicates + dead code)
**Estimated LOC to Refactor:** ~10,000+

**Referenced Files:**
- `app/src/islands/modals/EditPhoneNumberModal*.jsx`
- `app/src/islands/modals/NotificationSettingsModal*.jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector*.jsx`
- `app/src/lib/proposalDataFetcher*.js`
- `app/src/lib/secureStorage*.js`
- `app/src/styles/components/create-listing-modal*.css`
- `app/src/islands/pages/ViewSplitLeasePage-old.jsx`
- `app/src/styles/components/search-page-old.css`
- `app/src/lib/priceCalculations.js`
- `app/src/lib/scheduleSelector/priceCalculations.js`
- `app/src/logic/calculators/pricing/*.js`
- `app/src/islands/pages/useSearchPageLogic.js`
- `app/src/islands/pages/useViewSplitLeasePageLogic.js`
- `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
- `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/pages/SearchPage.jsx`
- `app/src/islands/shared/SignUpLoginModal.jsx`
- `app/src/islands/shared/GoogleMap.jsx`
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
- `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
- `app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx`
- `app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx`
