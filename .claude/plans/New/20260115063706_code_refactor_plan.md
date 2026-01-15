# Code Refactoring Plan - app

**Date:** 2026-01-15
**Audit Type:** general
**Directory:** `app/src`

---

## EXECUTIVE SUMMARY

This audit identified **15 critical issues** across the Split Lease frontend codebase, grouped into 21 actionable refactoring chunks. The issues span:
- **Code duplication** (duplicate files, duplicate logic)
- **Performance concerns** (excessive console.log statements, missing dependency arrays)
- **Maintainability** (orphaned files, constants duplication, pattern inconsistency)
- **Architecture violations** (logic not in Logic Core layer)

---

## PAGE GROUP: GLOBAL (Chunks: 1, 2, 3, 4, 5)

These chunks affect multiple pages across the application.

~~~~~

### CHUNK 1: Remove duplicate files with numeric suffixes
**File:** Multiple files in `app/src/`
**Line:** N/A (entire files)
**Issue:** 10 duplicate files exist with ` (1)` or ` (1) (1)` suffixes. These indicate copy-paste versioning instead of git branching, causing maintenance confusion and potential sync issues.
**Affected Pages:** GLOBAL (all pages potentially import from these)

**Current Code:**
```plaintext
Files to DELETE:
- app/src/lib/SECURE_AUTH_README (1).md
- app/src/lib/secureStorage (1).js
- app/src/lib/proposalDataFetcher (1).js
- app/src/styles/components/create-listing-modal (1).css
- app/src/styles/components/create-listing-modal (1) (1).css
- app/src/islands/modals/EditPhoneNumberModal (1).jsx
- app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
- app/src/islands/modals/NotificationSettingsModal (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
```

**Refactored Code:**
```bash
# Delete all duplicate files (keep originals without suffix)
git rm "app/src/lib/SECURE_AUTH_README (1).md"
git rm "app/src/lib/secureStorage (1).js"
git rm "app/src/lib/proposalDataFetcher (1).js"
git rm "app/src/styles/components/create-listing-modal (1).css"
git rm "app/src/styles/components/create-listing-modal (1) (1).css"
git rm "app/src/islands/modals/EditPhoneNumberModal (1).jsx"
git rm "app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx"
git rm "app/src/islands/modals/NotificationSettingsModal (1).jsx"
git rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx"
git rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx"
```

**Testing:**
- [ ] Verify no imports reference the deleted files
- [ ] Run `bun run build` to ensure no missing module errors
- [ ] Test all affected pages load correctly

~~~~~

### CHUNK 2: Remove orphaned/deprecated page file
**File:** `app/src/islands/pages/ViewSplitLeasePage-old.jsx`
**Line:** 1-1300+ (entire file)
**Issue:** Deprecated page file kept alongside the active version. Creates confusion about which file is canonical and increases bundle size if accidentally imported.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// File: app/src/islands/pages/ViewSplitLeasePage-old.jsx
import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateProposalFlow from '../shared/CreateProposalFlow.jsx';
// ... (1300+ lines of deprecated code)
```

**Refactored Code:**
```bash
# Delete the deprecated file
git rm "app/src/islands/pages/ViewSplitLeasePage-old.jsx"
```

**Testing:**
- [ ] Verify no imports reference `ViewSplitLeasePage-old`
- [ ] Confirm `ViewSplitLeasePage.jsx` is the canonical version
- [ ] Test /view-split-lease page loads correctly

~~~~~

### CHUNK 3: Consolidate duplicate proposalStages constants
**File:** `app/src/lib/constants/proposalStages.js` and `app/src/logic/constants/proposalStages.js`
**Line:** 1-161 (lib) and 1-244 (logic)
**Issue:** Two identical files define the same `PROPOSAL_STAGES` array and helper functions. The `logic/constants` version has additional functions (`getStageProgress`, `getCompletedStages`, `getRemainingStages`, `isStagePending`, `getPreviousStage`, `getNextStage`). Single source of truth violation.
**Affected Pages:** /guest-proposals, /host-proposals, all proposal-related pages

**Current Code:**
```javascript
// File: app/src/lib/constants/proposalStages.js (161 lines)
export const PROPOSAL_STAGES = [
  { id: 1, name: 'Proposal Submitted', ... },
  // ...
];
export function getStageById(stageId) { ... }
export function getStageByName(stageName) { ... }
export function isStageCompleted(stageId, currentStage) { ... }
export function isCurrentStage(stageId, currentStage) { ... }
export function formatStageDisplay(stageId, currentStage) { ... }
export function getAllStagesFormatted(currentStage) { ... }

// File: app/src/logic/constants/proposalStages.js (244 lines)
// Same as above PLUS these additional functions:
export function getStageProgress(currentStage, completedStages = []) { ... }
export function getCompletedStages(currentStage) { ... }
export function getRemainingStages(currentStage) { ... }
export function isStagePending(stageId, currentStage) { ... }
export function getPreviousStage(stageId) { ... }
export function getNextStage(stageId) { ... }
```

**Refactored Code:**
```javascript
// DELETE: app/src/lib/constants/proposalStages.js
// KEEP: app/src/logic/constants/proposalStages.js (canonical, has all functions)

// Update any imports from lib/constants/proposalStages to logic/constants/proposalStages:
// Before:
import { PROPOSAL_STAGES } from '../../lib/constants/proposalStages.js';
// After:
import { PROPOSAL_STAGES } from '../../logic/constants/proposalStages.js';
```

**Testing:**
- [ ] Search for all imports of `lib/constants/proposalStages` and update
- [ ] Run `bun run build` to verify no broken imports
- [ ] Test guest-proposals and host-proposals pages

~~~~~

### CHUNK 4: Consolidate duplicate DAY_NAMES constant
**File:** `app/src/lib/constants.js:63-71` and `app/src/lib/dayUtils.js:24-32`
**Line:** 63-71 (constants.js), 24-32 (dayUtils.js)
**Issue:** `DAY_NAMES` array is defined identically in two files. Violates DRY principle and single source of truth.
**Affected Pages:** /search, /view-split-lease, all schedule-related pages

**Current Code:**
```javascript
// File: app/src/lib/constants.js (lines 63-71)
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// File: app/src/lib/dayUtils.js (lines 24-32)
export const DAY_NAMES = [
  'Sunday',   // 0
  'Monday',   // 1
  'Tuesday',  // 2
  'Wednesday',// 3
  'Thursday', // 4
  'Friday',   // 5
  'Saturday'  // 6
];
```

**Refactored Code:**
```javascript
// File: app/src/lib/dayUtils.js (lines 24-32)
// REMOVE the local definition and import from constants.js
import { DAY_NAMES } from './constants.js';

// Re-export for backward compatibility if needed
export { DAY_NAMES };

// Keep the getDayName and getShortDayName functions as-is
export function getDayName(dayIndex) {
  if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
    return 'Unknown';
  }
  return DAY_NAMES[dayIndex];
}
```

**Testing:**
- [ ] Verify all imports of `DAY_NAMES` still work
- [ ] Test schedule selectors display correct day names
- [ ] Run `bun run build`

~~~~~

### CHUNK 5: Remove excessive console.log statements from lib/auth.js
**File:** `app/src/lib/auth.js`
**Line:** Multiple (93+ occurrences across file)
**Issue:** 93 console.log statements in auth.js create verbose production logs, potential performance impact, and security concerns (logging sensitive auth state). Total of 302 console.log calls across lib/ directory.
**Affected Pages:** GLOBAL (auth used on all authenticated pages)

**Current Code:**
```javascript
// File: app/src/lib/auth.js (examples from lines 99-102, 125-126, etc.)
export function checkSplitLeaseCookies() {
  // ...
  console.log('🔐 Split Lease Cookie Auth Check:');
  console.log('   Logged In:', isLoggedIn);
  console.log('   Username:', username || 'not set');
  console.log('   Raw Cookies:', { loggedInCookie, usernameCookie });
  // ...
}

export async function checkAuthStatus() {
  console.log('🔍 Checking authentication status...');
  // ... many more console.log statements throughout
}
```

**Refactored Code:**
```javascript
// File: app/src/lib/auth.js
// Option 1: Use conditional logging based on environment
const DEBUG = import.meta.env.DEV;

export function checkSplitLeaseCookies() {
  // ...
  if (DEBUG) {
    console.log('🔐 Split Lease Cookie Auth Check:');
    console.log('   Logged In:', isLoggedIn);
    console.log('   Username:', username || 'not set');
    console.log('   Raw Cookies:', { loggedInCookie, usernameCookie });
  }
  // ...
}

// Option 2: Use the existing logger.js utility (better)
import { logger } from './logger.js';

export function checkSplitLeaseCookies() {
  // ...
  logger.debug('Split Lease Cookie Auth Check:', { isLoggedIn, username });
  // ...
}
```

**Testing:**
- [ ] Verify auth flows still work in development
- [ ] Confirm no sensitive data logged in production
- [ ] Check browser console in production build is clean

~~~~~

## PAGE GROUP: /search (Chunks: 6, 7, 8)

~~~~~

### CHUNK 6: Extract fetchInformationalTexts to dedicated fetcher
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 37-61
**Issue:** Data fetching function defined inline in component file. Violates hollow component pattern - logic should be in lib/ or logic/ layer. Also duplicates similar fetching logic likely used elsewhere.
**Affected Pages:** /search

**Current Code:**
```javascript
// File: app/src/islands/pages/SearchPage.jsx (lines 37-61)
async function fetchInformationalTexts() {
  try {
    const { data, error } = await supabase
      .from('informationaltexts')
      .select('_id, "Information Tag-Title", "Desktop copy", "Mobile copy", "Desktop+ copy", "show more available?"');

    if (error) throw error;

    // Transform data into a map keyed by tag title
    const textsMap = {};
    data.forEach(item => {
      textsMap[item['Information Tag-Title']] = {
        desktop: item['Desktop copy'],
        mobile: item['Mobile copy'],
        desktopPlus: item['Desktop+ copy'],
        showMore: item['show more available?']
      };
    });

    return textsMap;
  } catch (error) {
    console.error('Failed to fetch informational texts:', error);
    return {};
  }
}
```

**Refactored Code:**
```javascript
// File: app/src/lib/informationalTextsFetcher.js (already exists - use it!)
// SearchPage should import from lib instead of defining inline

// File: app/src/islands/pages/SearchPage.jsx (line 37)
// REMOVE the inline function definition
// ADD import at top:
import { fetchInformationalTexts } from '../../lib/informationalTextsFetcher.js';
```

**Testing:**
- [ ] Verify informational texts still load on /search
- [ ] Confirm tooltip/modal content displays correctly
- [ ] Check console for any fetch errors

~~~~~

### CHUNK 7: Extract CompactScheduleIndicator component to shared
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 71-144
**Issue:** Internal component defined inside page file that could be reused. Contains hardcoded day calculation logic that should use existing Logic Core calculators.
**Affected Pages:** /search

**Current Code:**
```javascript
// File: app/src/islands/pages/SearchPage.jsx (lines 71-144)
function CompactScheduleIndicator({ isVisible }) {
  // Get selected days from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const daysSelected = urlParams.get('days-selected') || '';

  // Parse days-selected (format: "1,2,3,4,5" where 0=Sun, 1=Mon, etc.)
  const selectedDaysArray = daysSelected
    ? daysSelected.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d))
    : [];

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate check-in and check-out days (inline logic - 30+ lines)
  // ...
}
```

**Refactored Code:**
```javascript
// File: app/src/islands/shared/CompactScheduleIndicator.jsx (NEW FILE)
import { DAY_NAMES } from '../../lib/constants.js';
import { calculateCheckInOutDays } from '../../logic/calculators/scheduling/calculateCheckInOutDays.js';

export function CompactScheduleIndicator({ isVisible, selectedDays = [] }) {
  // Use Logic Core calculator instead of inline logic
  const { checkInName, checkOutName } = selectedDays.length >= 2
    ? calculateCheckInOutDays({ selectedDays })
    : { checkInName: null, checkOutName: null };

  return (
    <div className={`compact-schedule-indicator ${isVisible ? 'compact-schedule-indicator--visible' : ''}`}>
      <span className="compact-schedule-text">
        {selectedDays.length >= 2 ? (
          <>
            <span className="compact-label">Check-in:</span> {checkInName} •{' '}
            <span className="compact-label">Check-out:</span> {checkOutName}
          </>
        ) : (
          'Select days'
        )}
      </span>
      <div className="compact-schedule-dots">
        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
          <div
            key={dayIndex}
            className={`compact-day-dot ${selectedDays.includes(dayIndex) ? 'selected' : ''}`}
            title={DAY_NAMES[dayIndex]}
          />
        ))}
      </div>
    </div>
  );
}
```

**Testing:**
- [ ] Verify compact indicator displays correctly on mobile scroll
- [ ] Check check-in/check-out calculation matches original
- [ ] Test with various day selections including wrap-around

~~~~~

### CHUNK 8: Fix eslint-disable comments in SearchScheduleSelector
**File:** `app/src/islands/shared/SearchScheduleSelector.jsx`
**Line:** 693
**Issue:** eslint-disable-next-line comment suppresses react-hooks/exhaustive-deps warning, indicating potential missing dependencies in useEffect that could cause stale closures or missed updates.
**Affected Pages:** /search

**Current Code:**
```javascript
// File: app/src/islands/shared/SearchScheduleSelector.jsx (line 693)
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Refactored Code:**
```javascript
// Need to examine the actual useEffect and add missing dependencies
// or use useCallback/useMemo to stabilize callback references

// Example pattern:
useEffect(() => {
  onSelectionChange?.(selectedDays);
}, [selectedDays, onSelectionChange]); // Include ALL dependencies
```

**Testing:**
- [ ] Verify schedule selection still triggers callbacks correctly
- [ ] Check for infinite render loops (if any)
- [ ] Test schedule selector behavior on /search

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 9, 10)

~~~~~

### CHUNK 9: Migrate price calculations to Logic Core layer
**File:** `app/src/lib/scheduleSelector/priceCalculations.js`
**Line:** 1-411
**Issue:** Complex price calculation logic (411 lines) resides in lib/ instead of logic/calculators/pricing/. This violates the four-layer Logic Core architecture. There's also duplication with `lib/priceCalculations.js` (146 lines) which has simpler versions of the same functions.
**Affected Pages:** /view-split-lease, /search, /guest-proposals

**Current Code:**
```javascript
// File: app/src/lib/scheduleSelector/priceCalculations.js (411 lines)
export const calculatePrice = (selectedNights, listing, reservationSpan, zatConfig) => {
  // Complex pricing with Monthly/Weekly/Nightly logic
  // console.log statements throughout
  // ...
};

// File: app/src/lib/priceCalculations.js (146 lines - DUPLICATE SIMPLER VERSION)
export function calculate4WeekRent(nightlyPrice, nightsPerWeek) { ... }
export function calculateReservationTotal(fourWeekRent, totalWeeks) { ... }
export function getNightlyPriceForNights(listing, nightsSelected) { ... }
export function calculatePricingBreakdown(listing, nightsPerWeek, reservationWeeks) { ... }

// File: app/src/logic/calculators/pricing/ (partial implementation exists)
// - calculateFourWeekRent.js
// - calculatePricingBreakdown.js (different signature!)
// - calculateReservationTotal.js
// - getNightlyRateByFrequency.js
```

**Refactored Code:**
```javascript
// CONSOLIDATION PLAN:
// 1. Delete app/src/lib/priceCalculations.js (simpler duplicate)
// 2. Move app/src/lib/scheduleSelector/priceCalculations.js content to:
//    app/src/logic/calculators/pricing/calculatePrice.js
// 3. Update all imports to use logic/calculators/pricing/

// File: app/src/logic/calculators/pricing/calculatePrice.js (NEW - migrated)
import { calculateFourWeekRent } from './calculateFourWeekRent.js';
import { calculateReservationTotal } from './calculateReservationTotal.js';
import { getNightlyRateByFrequency } from './getNightlyRateByFrequency.js';

/**
 * Main price calculation function - consolidated from lib/scheduleSelector/priceCalculations.js
 */
export function calculatePrice({ selectedNights, listing, reservationSpan = 13, zatConfig = null }) {
  // Migrated logic without console.log statements
  // ...
}
```

**Testing:**
- [ ] Verify price calculations match exactly on /view-split-lease
- [ ] Test all rental types: Monthly, Weekly, Nightly
- [ ] Compare 4-week rent and reservation totals
- [ ] Check proposal creation with calculated prices

~~~~~

### CHUNK 10: Remove TODO comment and migrate pricing in useScheduleSelectorLogicCore
**File:** `app/src/islands/shared/useScheduleSelectorLogicCore.js`
**Line:** 18, 108
**Issue:** TODO comments indicate incomplete migration to Logic Core architecture. The hook still imports from lib/scheduleSelector/priceCalculations.js instead of logic/calculators/.
**Affected Pages:** /view-split-lease, /search (uses schedule selector)

**Current Code:**
```javascript
// File: app/src/islands/shared/useScheduleSelectorLogicCore.js (lines 18, 108)
import { calculatePrice } from '../../lib/scheduleSelector/priceCalculations.js' // TODO: Migrate to Logic Core

// ...

// Calculate pricing (TODO: Migrate pricing to Logic Core)
const selectedNights = useMemo(() => {
  return createNightsFromDays(selectedDays)
}, [selectedDays])
```

**Refactored Code:**
```javascript
// File: app/src/islands/shared/useScheduleSelectorLogicCore.js
// After CHUNK 9 is complete, update import:
import { calculatePrice } from '../../logic/calculators/pricing/calculatePrice.js';

// Remove TODO comments
// Calculate pricing
const selectedNights = useMemo(() => {
  return createNightsFromDays(selectedDays)
}, [selectedDays])
```

**Testing:**
- [ ] Depends on CHUNK 9 completion
- [ ] Verify schedule selector price display works
- [ ] Test price updates when changing day selection

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 11, 12)

~~~~~

### CHUNK 11: Implement TODO(human) placeholder in ReferralBanner
**File:** `app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx`
**Line:** 38
**Issue:** Unimplemented TODO(human) placeholder for referral invite flow. Missing functionality affects user experience.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// File: app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx (line 38)
// TODO(human): Implement referral invite flow
```

**Refactored Code:**
```javascript
// File: app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx
// Implementation depends on referral system design - placeholder for now
const handleInviteClick = async () => {
  // Navigate to referral invite page or open modal
  window.location.href = '/referral-invite';
};
```

**Testing:**
- [ ] Verify referral banner displays correctly
- [ ] Test invite button navigation
- [ ] Check referral page loads

~~~~~

### CHUNK 12: Address unimplemented TODO handlers in ProposalCard
**File:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Line:** 983, 1267, 1292, 1315
**Issue:** Multiple TODO comments for unimplemented action handlers. These indicate incomplete feature implementation that should either be completed or clearly documented as intentionally deferred.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// File: app/src/islands/pages/proposals/ProposalCard.jsx
// Line 983:
// TODO: Implement actual cancel API call here

// Line 1267:
// TODO: Add handlers for other actions (remind_sl, accept_counteroffer, etc.)

// Line 1292:
// TODO: Add handlers for other actions (reject_suggestion, review_counteroffer, verify_identity)

// Line 1315:
// TODO: Implement house manual navigation
```

**Refactored Code:**
```javascript
// These TODOs need to be triaged:
// 1. If feature is needed now - implement it
// 2. If feature is deferred - convert to FIXME with ticket/issue reference
// 3. If feature is cancelled - remove the TODO and dead code

// Example for line 983 (cancel API):
const handleCancelProposal = async (proposalId) => {
  try {
    const result = await supabase.functions.invoke('proposal', {
      body: { action: 'cancel', payload: { proposalId } }
    });
    if (!result.data?.success) throw new Error(result.data?.error);
    // Refresh proposal list
    onRefresh?.();
  } catch (error) {
    console.error('Failed to cancel proposal:', error);
    setError('Failed to cancel proposal. Please try again.');
  }
};
```

**Testing:**
- [ ] Test each implemented action handler
- [ ] Verify cancel proposal flow works end-to-end
- [ ] Check error handling displays correctly

~~~~~

## PAGE GROUP: /host-overview, /listing-dashboard (Chunks: 13, 14)

~~~~~

### CHUNK 13: Implement TODO handlers in HostOverviewPageLogic
**File:** `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`
**Line:** 751, 756
**Issue:** TODO comments for unimplemented navigation handlers (visits modal, virtual meeting page).
**Affected Pages:** /host-overview

**Current Code:**
```javascript
// File: app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js
// Line 751:
// TODO: Open visits modal or navigate to visits page

// Line 756:
// TODO: Navigate to virtual meeting page or open modal
```

**Refactored Code:**
```javascript
// Line 751 - Visits handler
const handleViewVisits = useCallback((listingId) => {
  // Navigate to listing dashboard with visits section
  window.location.href = `/listing-dashboard?listing_id=${listingId}&section=visits`;
}, []);

// Line 756 - Virtual meeting handler
const handleOpenVirtualMeeting = useCallback((meetingId) => {
  // Open virtual meeting modal or navigate
  setSelectedMeetingId(meetingId);
  setIsVirtualMeetingModalOpen(true);
}, []);
```

**Testing:**
- [ ] Test visits button navigation
- [ ] Verify virtual meeting modal opens
- [ ] Check listing dashboard displays visits section

~~~~~

### CHUNK 14: Implement TODO handlers in ListingDashboardPageLogic
**File:** `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`
**Line:** 621, 628, 647
**Issue:** TODO comments for navigation and debounced save functionality.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// File: app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js
// Line 621:
// TODO: Navigate to meetings or scroll to section

// Line 628:
// TODO: Navigate to leases or scroll to section

// Line 647:
// TODO: Debounce and save to backend
```

**Refactored Code:**
```javascript
// Line 621 - Meetings navigation
const handleViewMeetings = useCallback(() => {
  const meetingsSection = document.getElementById('meetings-section');
  if (meetingsSection) {
    meetingsSection.scrollIntoView({ behavior: 'smooth' });
  }
}, []);

// Line 628 - Leases navigation
const handleViewLeases = useCallback(() => {
  const leasesSection = document.getElementById('leases-section');
  if (leasesSection) {
    leasesSection.scrollIntoView({ behavior: 'smooth' });
  }
}, []);

// Line 647 - Debounced save (use existing pattern)
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSave = useMemo(
  () => debounce(async (fieldName, value) => {
    await updateListing(listingId, { [fieldName]: value });
  }, 500),
  [listingId]
);
```

**Testing:**
- [ ] Test section scroll navigation
- [ ] Verify debounced save triggers correctly
- [ ] Check listing updates persist

~~~~~

## PAGE GROUP: /messages (Chunks: 15)

~~~~~

### CHUNK 15: Address TODO in MessagingPageLogic
**File:** `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`
**Line:** 444
**Issue:** TODO for unread count implementation that may affect notification display.
**Affected Pages:** /messages

**Current Code:**
```javascript
// File: app/src/islands/pages/MessagingPage/useMessagingPageLogic.js (line 444)
unread_count: 0, // TODO: Implement unread count if needed
```

**Refactored Code:**
```javascript
// If unread count feature is needed:
unread_count: thread.messages?.filter(m => !m.read && m.sender_id !== currentUserId).length || 0,

// If feature is intentionally deferred, document it:
unread_count: 0, // DEFERRED: Unread count not required for MVP - see ticket #XXX
```

**Testing:**
- [ ] Verify thread list displays correctly
- [ ] If implemented, test unread badge updates

~~~~~

## PAGE GROUP: /self-listing, /self-listing-v2 (Chunks: 16, 17)

~~~~~

### CHUNK 16: Implement TODO in SelfListingPageV2
**File:** `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Line:** 2089
**Issue:** TODO for SMS sending functionality during phone verification flow.
**Affected Pages:** /self-listing-v2

**Current Code:**
```typescript
// File: app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx (line 2089)
// TODO: Call edge function to send SMS with continueOnPhoneLink
```

**Refactored Code:**
```typescript
// Implement SMS sending via edge function
const sendContinueOnPhoneSMS = async (phoneNumber: string, continueLink: string) => {
  const { data, error } = await supabase.functions.invoke('messaging', {
    body: {
      action: 'send_sms',
      payload: {
        to: phoneNumber,
        message: `Continue your Split Lease listing on your phone: ${continueLink}`
      }
    }
  });

  if (error) throw error;
  return data;
};
```

**Testing:**
- [ ] Test SMS sending in development (may need test phone)
- [ ] Verify continue link works
- [ ] Check error handling for invalid phone numbers

~~~~~

### CHUNK 17: Clarify page version strategy (V1 vs V2)
**File:** `app/src/routes.config.js`
**Line:** 239-255
**Issue:** Both `/self-listing` and `/self-listing-v2` routes exist with different protection levels (V1 is protected, V2 is not). No clear deprecation strategy documented.
**Affected Pages:** /self-listing, /self-listing-v2

**Current Code:**
```javascript
// File: app/src/routes.config.js (lines 239-255)
{
  path: '/self-listing',
  file: 'self-listing.html',
  protected: true,  // V1 requires auth
  // ...
},
{
  path: '/self-listing-v2',
  file: 'self-listing-v2.html',
  protected: false,  // V2 does NOT require auth (different behavior!)
  // ...
},
```

**Refactored Code:**
```javascript
// Option 1: Deprecate V1 and make V2 canonical
{
  path: '/self-listing',
  file: 'self-listing-v2.html',  // Redirect to V2
  protected: false,
  // ...
  deprecated: false,  // Now canonical
},
// Remove /self-listing-v2 route (use /self-listing)

// Option 2: Document the difference and keep both
// Add comments explaining why both exist
{
  path: '/self-listing',
  file: 'self-listing.html',
  protected: true,  // V1: Full listing flow for authenticated hosts
  description: 'Complete listing wizard for logged-in hosts',
},
{
  path: '/self-listing-v2',
  file: 'self-listing-v2.html',
  protected: false,  // V2: Simplified flow allowing unauthenticated start
  description: 'Lead capture flow - auth required before final submission',
},
```

**Testing:**
- [ ] Determine business decision on which version to keep
- [ ] Update routes accordingly
- [ ] Test both flows if keeping both

~~~~~

## PAGE GROUP: AI Components (Chunks: 18)

~~~~~

### CHUNK 18: Implement TODO(human) in AiSignupMarketReport
**File:** `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
**Line:** 672
**Issue:** Unimplemented TODO(human) for topic detection logic in AI signup flow.
**Affected Pages:** /search (AI signup modal), homepage

**Current Code:**
```javascript
// File: app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx (line 672)
// TODO(human): Implement the topic detection logic
```

**Refactored Code:**
```javascript
// Implement topic detection based on user responses
const detectTopics = (userMessage, conversationHistory) => {
  const topics = [];
  const lowerMessage = userMessage.toLowerCase();

  // Detect location interest
  if (lowerMessage.includes('neighborhood') || lowerMessage.includes('area')) {
    topics.push('location');
  }

  // Detect price sensitivity
  if (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('afford')) {
    topics.push('pricing');
  }

  // Detect schedule preferences
  if (lowerMessage.includes('weekend') || lowerMessage.includes('weeknight') || lowerMessage.includes('schedule')) {
    topics.push('schedule');
  }

  return topics;
};
```

**Testing:**
- [ ] Test AI signup flow with various user inputs
- [ ] Verify topic detection influences conversation
- [ ] Check market report generation

~~~~~

## PAGE GROUP: Shared Components (Chunks: 19, 20, 21)

~~~~~

### CHUNK 19: Implement TODO in WhyThisProposal component
**File:** `app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx`
**Line:** 13
**Issue:** Unimplemented TODO(human) for summary display logic in suggested proposals.
**Affected Pages:** /search, /view-split-lease (suggested proposals section)

**Current Code:**
```javascript
// File: app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx (line 13)
// TODO(human): Implement the summary display logic
```

**Refactored Code:**
```javascript
// Implement summary display based on match criteria
const WhyThisProposal = ({ proposal, userPreferences }) => {
  const matchReasons = [];

  // Schedule match
  if (proposal.scheduleMatch > 0.8) {
    matchReasons.push('Schedule aligns with your availability');
  }

  // Price match
  if (proposal.priceMatch > 0.7) {
    matchReasons.push('Within your budget range');
  }

  // Location match
  if (proposal.locationMatch > 0.6) {
    matchReasons.push('Close to your preferred neighborhoods');
  }

  return (
    <div className="why-this-proposal">
      <h4>Why this listing?</h4>
      <ul>
        {matchReasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    </div>
  );
};
```

**Testing:**
- [ ] Verify suggested proposals display match reasons
- [ ] Test with various user preference combinations
- [ ] Check empty state handling

~~~~~

### CHUNK 20: Address TODO in GoogleMap hover effects
**File:** `app/src/islands/shared/GoogleMap.jsx`
**Line:** 890
**Issue:** TODO comment indicates disabled hover effects due to positioning bug. This affects user experience on map interactions.
**Affected Pages:** /search, /favorite-listings

**Current Code:**
```javascript
// File: app/src/islands/shared/GoogleMap.jsx (line 890)
// TODO: Re-implement hover effects after fixing positioning bug
```

**Refactored Code:**
```javascript
// Investigate and fix the positioning bug, then re-enable hover effects
// The bug is likely related to InfoWindow positioning or marker z-index

// After fixing:
const handleMarkerMouseOver = (marker, listing) => {
  setHoveredListing(listing);
  setInfoWindowPosition(marker.getPosition());
  setIsInfoWindowOpen(true);
};

const handleMarkerMouseOut = () => {
  setIsInfoWindowOpen(false);
  setHoveredListing(null);
};
```

**Testing:**
- [ ] Investigate the positioning bug first
- [ ] Test hover effects on various screen sizes
- [ ] Verify InfoWindow displays correctly

~~~~~

### CHUNK 21: Fix eslint-disable patterns in useScheduleSelector hooks
**File:** `app/src/islands/shared/useScheduleSelectorLogicCore.js` and `app/src/islands/shared/useScheduleSelector.js`
**Line:** 173, 178, 183 (LogicCore), 156, 163, 168 (original)
**Issue:** Multiple eslint-disable-next-line comments suppressing react-hooks/exhaustive-deps warnings. These indicate potential stale closure bugs where callbacks don't see updated values.
**Affected Pages:** /search, /view-split-lease, all pages with schedule selectors

**Current Code:**
```javascript
// File: app/src/islands/shared/useScheduleSelectorLogicCore.js
useEffect(() => {
  onSelectionChange?.(selectedDays)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDays])

useEffect(() => {
  onPriceChange?.(priceBreakdown)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [priceBreakdown])

useEffect(() => {
  onScheduleChange?.(scheduleState)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [scheduleState])
```

**Refactored Code:**
```javascript
// File: app/src/islands/shared/useScheduleSelectorLogicCore.js
// Use useCallback to stabilize callback references OR use refs

// Option 1: Use refs to avoid re-renders (preferred for callbacks from props)
const onSelectionChangeRef = useRef(onSelectionChange);
const onPriceChangeRef = useRef(onPriceChange);
const onScheduleChangeRef = useRef(onScheduleChange);

// Update refs when props change
useEffect(() => {
  onSelectionChangeRef.current = onSelectionChange;
}, [onSelectionChange]);

// Use refs in effects (no dependency on callback)
useEffect(() => {
  onSelectionChangeRef.current?.(selectedDays);
}, [selectedDays]);

useEffect(() => {
  onPriceChangeRef.current?.(priceBreakdown);
}, [priceBreakdown]);

useEffect(() => {
  onScheduleChangeRef.current?.(scheduleState);
}, [scheduleState]);
```

**Testing:**
- [ ] Verify callbacks fire correctly when data changes
- [ ] Test that parent components receive updates
- [ ] Check for any infinite render loops
- [ ] Ensure no stale data in callbacks

~~~~~

---

## SUMMARY BY PRIORITY

### HIGH PRIORITY (Do First)
| Chunk | Issue | Impact |
|-------|-------|--------|
| 1 | Remove duplicate files | Maintenance, confusion |
| 2 | Remove orphaned ViewSplitLeasePage-old | Dead code, bundle size |
| 3 | Consolidate proposalStages constants | Single source of truth |
| 9 | Migrate price calculations to Logic Core | Architecture compliance |
| 21 | Fix eslint-disable patterns | Potential bugs |

### MEDIUM PRIORITY
| Chunk | Issue | Impact |
|-------|-------|--------|
| 4 | Consolidate DAY_NAMES | DRY principle |
| 5 | Remove console.log in auth.js | Performance, security |
| 6 | Extract fetchInformationalTexts | Hollow component pattern |
| 7 | Extract CompactScheduleIndicator | Reusability |
| 10 | Update useScheduleSelectorLogicCore imports | After CHUNK 9 |
| 17 | Clarify V1/V2 page strategy | User experience |

### LOW PRIORITY (Technical Debt)
| Chunk | Issue | Impact |
|-------|-------|--------|
| 8 | Fix SearchScheduleSelector eslint | Code quality |
| 11-16 | Implement various TODOs | Feature completeness |
| 18-20 | Implement TODO(human) placeholders | Feature completeness |

---

## REFERENCED FILES

### Files to Delete
- `app/src/lib/SECURE_AUTH_README (1).md`
- `app/src/lib/secureStorage (1).js`
- `app/src/lib/proposalDataFetcher (1).js`
- `app/src/lib/priceCalculations.js` (duplicate)
- `app/src/lib/constants/proposalStages.js` (duplicate)
- `app/src/styles/components/create-listing-modal (1).css`
- `app/src/styles/components/create-listing-modal (1) (1).css`
- `app/src/islands/modals/EditPhoneNumberModal (1).jsx`
- `app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx`
- `app/src/islands/modals/NotificationSettingsModal (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`
- `app/src/islands/pages/ViewSplitLeasePage-old.jsx`

### Files to Modify
- `app/src/lib/auth.js` - Remove/conditionalize console.log
- `app/src/lib/dayUtils.js` - Import DAY_NAMES from constants
- `app/src/lib/scheduleSelector/priceCalculations.js` - Migrate to Logic Core
- `app/src/islands/shared/useScheduleSelectorLogicCore.js` - Fix eslint, update imports
- `app/src/islands/shared/useScheduleSelector.js` - Fix eslint
- `app/src/islands/shared/SearchScheduleSelector.jsx` - Fix eslint
- `app/src/islands/pages/SearchPage.jsx` - Extract inline functions
- `app/src/routes.config.js` - Clarify V1/V2 strategy

### Files to Create
- `app/src/logic/calculators/pricing/calculatePrice.js` - Migrated from lib/
- `app/src/islands/shared/CompactScheduleIndicator.jsx` - Extracted from SearchPage

### Canonical Files (Keep)
- `app/src/lib/constants.js` - Single source for DAY_NAMES
- `app/src/logic/constants/proposalStages.js` - Single source for PROPOSAL_STAGES
- `app/src/lib/secureStorage.js` - Original (no suffix)
- `app/src/lib/proposalDataFetcher.js` - Original (no suffix)
- `app/src/islands/modals/EditPhoneNumberModal.jsx` - Original
- `app/src/islands/modals/NotificationSettingsModal.jsx` - Original
- `app/src/islands/shared/AuthAwareSearchScheduleSelector.jsx` - Original
