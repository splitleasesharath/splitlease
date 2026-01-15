# Code Refactoring Plan - app

Date: 2026-01-15
Audit Type: general

---

## PAGE GROUP: GLOBAL (All Pages) (Chunks: 1, 2, 3)

### CHUNK 1: Remove backup files with (1) suffix
**File:** Multiple files (see list below)
**Line:** N/A (entire files)
**Issue:** Backup files with `(1)` suffix exist that duplicate production code. These can cause confusion and may be accidentally imported.
**Affected Pages:** All pages that could potentially import these files

**Files to Delete:**
```
app/src/lib/SECURE_AUTH_README (1).md
app/src/lib/secureStorage (1).js
app/src/lib/proposalDataFetcher (1).js
app/src/styles/components/create-listing-modal (1).css
app/src/styles/components/create-listing-modal (1) (1).css
app/src/styles/components/create-listing-modal (2).css
app/src/islands/modals/EditPhoneNumberModal (1).jsx
app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
app/src/islands/modals/NotificationSettingsModal (1).jsx
app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
```

**Current Code:**
```javascript
// Files exist with duplicate content
// Example: app/src/lib/secureStorage (1).js
// This is an exact copy or near-copy of secureStorage.js
```

**Refactored Code:**
```javascript
// Delete all files with (1) or (2) suffix
// No code - files should be removed entirely
```

**Testing:**
- [ ] Verify no imports reference these backup files
- [ ] Run `bun run build` to ensure no broken imports
- [ ] Search codebase for any import paths containing parentheses

~~~~~

### CHUNK 2: Remove deprecated ViewSplitLeasePage-old.jsx
**File:** app/src/islands/pages/ViewSplitLeasePage-old.jsx
**Line:** 1-end (entire file)
**Issue:** Deprecated file marked with `-old` suffix still present in codebase
**Affected Pages:** /view-split-lease (confusion risk)

**Current Code:**
```javascript
// File: app/src/islands/pages/ViewSplitLeasePage-old.jsx
// Entire deprecated component file that may cause confusion
```

**Refactored Code:**
```javascript
// Delete the entire file
// No code - file should be removed entirely
```

**Testing:**
- [ ] Verify ViewSplitLeasePage.jsx is the active file
- [ ] Confirm no imports reference the -old file
- [ ] Run `bun run build` to ensure no broken imports

~~~~~

### CHUNK 3: Remove SearchPageTest.jsx test file from production code
**File:** app/src/islands/pages/SearchPageTest.jsx
**Line:** 1-1728 (entire file)
**Issue:** Test file with 1728 lines duplicates SearchPage.jsx with minor test modifications. Contains extensive debug logging unsuitable for production.
**Affected Pages:** /search-test

**Current Code:**
```javascript
// File: app/src/islands/pages/SearchPageTest.jsx (1728 lines)
// Near-complete copy of SearchPage.jsx with test modifications
import { useState, useEffect, useRef, useCallback } from 'react';
// ... 1728 lines of duplicate code with console.log statements
```

**Refactored Code:**
```javascript
// Option A: Delete file entirely if /search-test route is not needed
// Option B: If testing is needed, create a proper test file in __tests__/
// No production code should duplicate an entire page component
```

**Testing:**
- [ ] Determine if /search-test route is needed in production
- [ ] If needed, extract test-specific logic into a wrapper/HOC pattern
- [ ] If not needed, remove the route from routes.config.js and delete the file
- [ ] Run `bun run build` to verify

~~~~~

## PAGE GROUP: /guest-proposals, /host-proposals (Chunks: 4, 5, 6)

### CHUNK 4: Consolidate duplicate processProposalData implementations
**File:** app/src/logic/processors/proposal/processProposalData.js AND app/src/logic/processors/proposals/processProposalData.js
**Line:** Both files entirely
**Issue:** Two completely different implementations of `processProposalData` exist with different signatures and behaviors. This violates DRY and can cause bugs.
**Affected Pages:** /guest-proposals, /host-proposals, all proposal-related pages

**Current Code:**
```javascript
// File 1: app/src/logic/processors/proposal/processProposalData.js (148 lines)
// Signature: processProposalData({ rawProposal, listing, guest, host })
// Returns: { id, listingId, guestId, status, currentTerms, originalTerms, hasCounteroffer, ... }

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }
  // ... 148 lines with currentTerms/originalTerms merge logic
}

// File 2: app/src/logic/processors/proposals/processProposalData.js (209 lines)
// Signature: processProposalData(rawProposal)
// Returns: { id, _id, status, daysSelected, nightsSelected, totalPrice, listing, host, virtualMeeting, ... }

export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }
  // ... 209 lines with nested transforms (processListingData, processHostData)
}
```

**Refactored Code:**
```javascript
// Consolidate into single file: app/src/logic/processors/proposals/processProposalData.js
// Keep the richer implementation from proposals/ (has processListingData, processHostData, etc.)
// Add the currentTerms/originalTerms merge logic from proposal/ version

/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 * Combines best features from both previous implementations.
 */
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }

  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal ID (_id) is required');
  }

  // Extract and transform nested data (from proposals/ version)
  const resolvedListing = listing || processListingData(rawProposal.listing);
  const resolvedHost = host || processHostData(rawProposal.listing?.host);
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);

  // Determine current terms (from proposal/ version)
  const status = rawProposal.Status || rawProposal.status || 'Unknown';
  const hasHostCounteroffer = status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key;

  // Merge terms logic (from proposal/ version)
  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],
    daysOfWeek: hasHostCounteroffer && rawProposal['hc Days of Week']
      ? rawProposal['hc Days of Week']
      : rawProposal['Days of Week'],
    // ... other merged fields
  };

  return {
    // Identity
    id: rawProposal._id,
    _id: rawProposal._id, // Keep for compatibility
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,

    // Status
    status,
    deleted: rawProposal.Deleted || false,
    hasCounteroffer: hasHostCounteroffer,

    // Terms
    currentTerms,
    originalTerms: { /* ... */ },

    // Nested data
    listing: resolvedListing,
    host: resolvedHost,
    virtualMeeting,

    // ... rest of fields from both implementations
  };
}

// Delete: app/src/logic/processors/proposal/ directory entirely
```

**Testing:**
- [ ] Update imports in loadProposalDetailsWorkflow.js to use consolidated path
- [ ] Update imports in app/src/logic/processors/index.js
- [ ] Run all proposal-related tests
- [ ] Test /guest-proposals page loads correctly
- [ ] Test /host-proposals page loads correctly
- [ ] Verify proposal status transitions work correctly

~~~~~

### CHUNK 5: Consolidate duplicate cancelProposalWorkflow implementations
**File:** app/src/logic/workflows/booking/cancelProposalWorkflow.js AND app/src/logic/workflows/proposals/cancelProposalWorkflow.js
**Line:** Both files entirely
**Issue:** Two separate cancel proposal workflow implementations exist with different architectures and export patterns.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// File 1: app/src/logic/workflows/booking/cancelProposalWorkflow.js (143 lines)
// Single export: cancelProposalWorkflow({ supabase, proposal, source, canCancelProposal })
// Requires canCancelProposal to be passed as parameter

export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validation requires canCancelProposal rule function
  if (!canCancelProposal) {
    throw new Error('cancelProposalWorkflow: canCancelProposal rule function is required')
  }
  // ... decision tree logic
}

// File 2: app/src/logic/workflows/proposals/cancelProposalWorkflow.js (175 lines)
// Multiple exports: determineCancellationCondition, executeCancelProposal,
//                   cancelProposalFromCompareTerms, executeDeleteProposal
// Imports supabase and canCancelProposal internally

import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal } from '../../rules/proposals/proposalRules.js';

export function determineCancellationCondition(proposal) { /* ... */ }
export async function executeCancelProposal(proposalId, reason = null) { /* ... */ }
export async function cancelProposalFromCompareTerms(proposalId, reason) { /* ... */ }
export async function executeDeleteProposal(proposalId) { /* ... */ }
```

**Refactored Code:**
```javascript
// Consolidate into: app/src/logic/workflows/proposals/cancelProposalWorkflow.js
// Keep the modular approach from proposals/ version (better separation of concerns)
// Add the decision tree logic from booking/ version

import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Evaluate which cancellation workflow condition applies
 * Combines logic from both implementations
 */
export function determineCancellationCondition(proposal, source = 'main') {
  if (!proposal) {
    return { condition: 'invalid', allowCancel: false, message: 'Invalid proposal data' };
  }

  const status = proposal.status || proposal.Status;
  const usualOrder = proposal.usualOrder || 0;
  const hasAccessedHouseManual = proposal.houseManualAccessed === true;
  const isFromCompareModal = source === 'compare-modal';

  // Already cancelled/rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return { condition: 'already_cancelled', allowCancel: false, message: 'Already cancelled' };
  }

  // Not cancellable
  if (!canCancelProposal({ proposalStatus: status, deleted: proposal.deleted })) {
    return { condition: 'not_cancellable', allowCancel: false, message: 'Cannot be cancelled' };
  }

  // Decision tree from booking/ version
  if (isFromCompareModal) {
    return usualOrder <= 5
      ? { condition: 'standard', allowCancel: true, shouldUpdateDatabase: true }
      : { condition: 'requires_call', allowCancel: false, requiresPhoneCall: true };
  }

  // Main page logic
  if (hasAccessedHouseManual || usualOrder > 5) {
    return { condition: 'requires_call', allowCancel: false, requiresPhoneCall: true };
  }

  return { condition: 'standard', allowCancel: true, shouldUpdateDatabase: true };
}

export async function executeCancelProposal(proposalId, reason = null) { /* ... keep existing */ }
export async function cancelProposalFromCompareTerms(proposalId, reason) { /* ... keep existing */ }
export async function executeDeleteProposal(proposalId) { /* ... keep existing */ }

// Delete: app/src/logic/workflows/booking/cancelProposalWorkflow.js
```

**Testing:**
- [ ] Update imports in ProposalCard.jsx
- [ ] Update imports in GuestEditingProposalModal.jsx
- [ ] Update app/src/logic/workflows/index.js
- [ ] Test cancel flow from main proposal page
- [ ] Test cancel flow from Compare Terms modal
- [ ] Test soft-delete functionality
- [ ] Verify decision tree variations 1-7 work correctly

~~~~~

### CHUNK 6: Remove duplicate useGuestProposalsPageLogic hook
**File:** app/src/islands/pages/useGuestProposalsPageLogic.js AND app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
**Line:** Both files entirely
**Issue:** Two separate guest proposals page logic hooks exist in different locations.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// File 1: app/src/islands/pages/useGuestProposalsPageLogic.js
// Standalone hook file in pages/ root

// File 2: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
// Hook file in proposals/ subdirectory
```

**Refactored Code:**
```javascript
// Keep: app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
// (follows the subdirectory pattern used elsewhere)

// Delete: app/src/islands/pages/useGuestProposalsPageLogic.js

// Update imports in GuestProposalsPage.jsx to point to proposals/ directory:
import { useGuestProposalsPageLogic } from './proposals/useGuestProposalsPageLogic.js';
```

**Testing:**
- [ ] Determine which file is actively used
- [ ] Update GuestProposalsPage.jsx import to use correct path
- [ ] Delete the unused duplicate
- [ ] Test /guest-proposals page loads correctly
- [ ] Verify all proposal operations work

~~~~~

## PAGE GROUP: /search (Chunks: 7, 8)

### CHUNK 7: Extract magic numbers to constants in price calculation
**File:** app/src/islands/pages/SearchPageTest.jsx (and SearchPage.jsx if similar)
**Line:** 444-451
**Issue:** Magic numbers (0.13, 0.17) used directly in price calculations. These represent business-critical values (full-time discount, site markup) that should be centralized constants.
**Affected Pages:** /search, /search-test

**Current Code:**
```javascript
// app/src/islands/pages/SearchPageTest.jsx:444-451
const calculateDynamicPrice = () => {
  const nightsCount = Math.max(selectedDaysCount - 1, 1);
  // ... field mapping ...

  // Step 2: Apply full-time discount (only for 7 nights, 13% discount)
  const fullTimeDiscount = nightsCount === 7 ? basePrice * 0.13 : 0;

  // Step 4: Apply site markup (17%)
  const siteMarkup = priceAfterDiscounts * 0.17;

  // ... rest of calculation
};
```

**Refactored Code:**
```javascript
// Option 1: Add to app/src/lib/constants.js
export const PRICING_CONFIG = {
  FULL_TIME_NIGHTS_THRESHOLD: 7,
  FULL_TIME_DISCOUNT_RATE: 0.13,  // 13% discount for 7 nights
  SITE_MARKUP_RATE: 0.17,          // 17% platform markup
};

// Option 2 (BETTER): Use existing logic from app/src/logic/calculators/pricing/
// The calculateDynamicPrice function duplicates logic that likely exists in:
// - calculateFourWeekRent.js
// - or other pricing calculators

// In SearchPage.jsx/SearchPageTest.jsx, import and use:
import { PRICING_CONFIG } from '../../lib/constants.js';
// OR
import { calculateGuestFacingPrice } from '../../logic/calculators/pricing/index.js';

const calculateDynamicPrice = () => {
  const nightsCount = Math.max(selectedDaysCount - 1, 1);
  // ... field mapping ...

  const fullTimeDiscount = nightsCount === PRICING_CONFIG.FULL_TIME_NIGHTS_THRESHOLD
    ? basePrice * PRICING_CONFIG.FULL_TIME_DISCOUNT_RATE
    : 0;

  const siteMarkup = priceAfterDiscounts * PRICING_CONFIG.SITE_MARKUP_RATE;

  // ... rest of calculation
};
```

**Testing:**
- [ ] Add PRICING_CONFIG to constants.js
- [ ] Update SearchPage.jsx and SearchPageTest.jsx to use constants
- [ ] Verify price calculations produce same results
- [ ] Compare with existing pricing calculators in logic/calculators/pricing/

~~~~~

### CHUNK 8: Memoize heavy calculations in listing transform
**File:** app/src/islands/pages/SearchPageTest.jsx
**Line:** 1265-1350
**Issue:** `transformListing` function is recreated on every fetch and contains heavy operations (JSON parsing, coordinate extraction, name lookups) without memoization.
**Affected Pages:** /search, /search-test

**Current Code:**
```javascript
// app/src/islands/pages/SearchPageTest.jsx:1265-1350
// Inside useCallback for fetchListings:
const transformListing = (dbListing, images, hostData) => {
  // Resolve human-readable names from database IDs
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood']);
  const boroughName = getBoroughName(dbListing['Location - Borough']);
  const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space']);

  // Parse JSONB (potentially expensive)
  let locationAddress = dbListing['Location - Address'];
  if (typeof locationAddress === 'string') {
    try {
      locationAddress = JSON.parse(locationAddress);
    } catch (error) {
      console.error('❌ SearchPage: Failed to parse Location - Address:', { /* verbose logging */ });
      locationAddress = null;
    }
  }

  // Multiple console.log statements (lines 1300-1331)
  console.log('🔄 SearchPage: Transforming listing:', { /* extensive data */ });
  // ... more logging

  return { /* ... transformed listing object */ };
};
```

**Refactored Code:**
```javascript
// Move transformListing outside useCallback and memoize with useCallback:
const transformListing = useCallback((dbListing, images, hostData) => {
  // Resolve names (these use cached lookups, should be fast)
  const neighborhoodName = getNeighborhoodName(dbListing['Location - Hood']);
  const boroughName = getBoroughName(dbListing['Location - Borough']);
  const propertyType = getPropertyTypeLabel(dbListing['Features - Type of Space']);

  // Parse JSONB with minimal logging
  let locationAddress = dbListing['Location - Address'];
  if (typeof locationAddress === 'string') {
    try {
      locationAddress = JSON.parse(locationAddress);
    } catch {
      locationAddress = null;
    }
  }

  const coordinates = locationAddress?.lat && locationAddress?.lng
    ? { lat: locationAddress.lat, lng: locationAddress.lng }
    : null;

  return {
    id: dbListing._id,
    title: dbListing.Name || 'Unnamed Listing',
    location: [neighborhoodName, boroughName].filter(Boolean).join(', ') || 'New York, NY',
    coordinates,
    // ... rest of fields
  };
}, []); // Empty deps since it uses no component state

// In fetchListings, use the memoized function:
const finalListings = rawListings
  .map(dbListing => transformListing(dbListing, images[dbListing._id], hostData[dbListing._id]))
  .filter(listing => listing.coordinates !== null);
```

**Testing:**
- [ ] Extract transformListing to module level or memoize with useCallback
- [ ] Remove excessive console.log statements (or gate behind isDev check)
- [ ] Verify listings still transform correctly
- [ ] Check React DevTools profiler for render performance improvement

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 9)

### CHUNK 9: Standardize directory structure for logic layer
**File:** app/src/logic/processors/ and app/src/logic/workflows/
**Line:** N/A (directory structure)
**Issue:** Inconsistent directory naming: `proposal/` (singular) vs `proposals/` (plural), `booking/` vs `proposals/`. Both contain similar functionality.
**Affected Pages:** /view-split-lease, /guest-proposals, /host-proposals

**Current Code:**
```
app/src/logic/
├── processors/
│   ├── proposal/          # SINGULAR
│   │   └── processProposalData.js
│   └── proposals/         # PLURAL
│       └── processProposalData.js  # DUPLICATE!
└── workflows/
    ├── booking/           # Different naming
    │   └── cancelProposalWorkflow.js
    └── proposals/         # PLURAL
        └── cancelProposalWorkflow.js  # DUPLICATE!
```

**Refactored Code:**
```
app/src/logic/
├── processors/
│   └── proposals/         # PLURAL (consistent)
│       ├── processProposalData.js    # Consolidated
│       ├── processUserData.js
│       ├── processListingData.js
│       └── index.js
└── workflows/
    └── proposals/         # PLURAL (consistent)
        ├── cancelProposalWorkflow.js  # Consolidated
        ├── loadProposalDetailsWorkflow.js
        └── index.js

# Delete:
# - app/src/logic/processors/proposal/  (entire directory)
# - app/src/logic/workflows/booking/    (entire directory)
```

**Testing:**
- [ ] After consolidating files in Chunks 4 & 5, delete empty directories
- [ ] Update all import paths in processors/index.js and workflows/index.js
- [ ] Run `bun run build` to verify no broken imports
- [ ] Grep for old paths and update any remaining references

~~~~~

## PAGE GROUP: All Authenticated Pages (Chunks: 10, 11)

### CHUNK 10: Gate console.log behind development mode
**File:** Multiple files (1783 occurrences across 150 files)
**Line:** Various
**Issue:** Excessive console.log statements in production code impact performance and leak implementation details.
**Affected Pages:** All pages

**Current Code:**
```javascript
// Example from app/src/lib/auth.js (20+ console calls)
console.log('[Auth] Checking session...');
console.log('[Auth] Session found:', session);
console.error('[Auth] Error:', error);

// Example from app/src/islands/pages/SearchPageTest.jsx
console.log('🔄 SearchPage: Transforming listing:', { /* extensive data */ });
console.log('✅ Displaying source:', displaySource);
console.error('❌ SearchPage: Failed to parse Location - Address:', { /* details */ });
```

**Refactored Code:**
```javascript
// Option 1: Create a logging utility
// app/src/lib/logger.js
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => isDev && console.log(...args),
  warn: (...args) => isDev && console.warn(...args),
  error: (...args) => console.error(...args), // Keep errors in production
  debug: (...args) => isDev && console.debug(...args),
};

// Usage in files:
import { logger } from '../../lib/logger.js';

logger.log('[Auth] Checking session...');  // Only logs in dev
logger.error('[Auth] Critical error:', error);  // Always logs

// Option 2: Use existing pattern with inline check
if (import.meta.env.DEV) {
  console.log('[Auth] Checking session...');
}
```

**Testing:**
- [ ] Create logger.js utility
- [ ] Update highest-impact files first (auth.js, SearchPage.jsx)
- [ ] Run production build and verify no debug logs appear
- [ ] Verify error logs still appear in production

~~~~~

### CHUNK 11: Split auth.js into focused modules
**File:** app/src/lib/auth.js
**Line:** 1-1668 (entire file)
**Issue:** auth.js at 1668 lines contains too many responsibilities violating Single Responsibility Principle.
**Affected Pages:** All authenticated pages

**Current Code:**
```javascript
// app/src/lib/auth.js (1668 lines)
// Contains ALL of:
// - Login (email/password, OAuth)
// - Signup (with validation)
// - Logout
// - Password reset
// - Token validation
// - Session management
// - Token refresh
// - User profile fetching
// - Cookie management
```

**Refactored Code:**
```javascript
// Split into focused modules:
// app/src/lib/auth/
// ├── index.js           # Re-exports for backward compatibility
// ├── session.js         # Session management, token refresh
// ├── login.js           # Login methods (email, OAuth)
// ├── signup.js          # Signup with validation
// ├── logout.js          # Logout and cleanup
// ├── passwordReset.js   # Password reset flow
// ├── tokenValidation.js # Token validation utilities
// └── cookies.js         # Cookie management

// app/src/lib/auth/index.js
export { login, loginWithOAuth } from './login.js';
export { signup } from './signup.js';
export { logout } from './logout.js';
export { resetPassword, updatePassword } from './passwordReset.js';
export { validateToken, checkAuthStatus, validateTokenAndFetchUser } from './tokenValidation.js';
export { getSession, refreshSession } from './session.js';

// Existing imports remain unchanged:
// import { login, logout, checkAuthStatus } from '../lib/auth.js';
// OR
// import { login, logout, checkAuthStatus } from '../lib/auth/index.js';
```

**Testing:**
- [ ] Create auth/ directory structure
- [ ] Extract functions into focused modules
- [ ] Create index.js with re-exports
- [ ] Verify all imports still work (no breaking changes)
- [ ] Test login, logout, signup, password reset flows
- [ ] Test OAuth login flow

~~~~~

## Summary

| Page Group | Chunks | Priority |
|------------|--------|----------|
| GLOBAL (All Pages) | 1, 2, 3 | HIGH - Remove duplicates |
| /guest-proposals, /host-proposals | 4, 5, 6 | HIGH - Consolidate code |
| /search | 7, 8 | MEDIUM - Performance |
| /view-split-lease | 9 | LOW - Directory cleanup |
| All Authenticated Pages | 10, 11 | MEDIUM - Maintainability |

**Recommended Execution Order:**
1. Chunk 1 (backup files) - Quick win, no code changes
2. Chunk 2 (deprecated file) - Quick win
3. Chunk 6 (duplicate hook) - Simple consolidation
4. Chunk 4 (processProposalData) - Critical consolidation
5. Chunk 5 (cancelProposalWorkflow) - Critical consolidation
6. Chunk 9 (directory cleanup) - After 4 & 5
7. Chunk 3 (SearchPageTest) - Evaluate necessity
8. Chunk 7 (magic numbers) - Extract constants
9. Chunk 8 (memoization) - Performance optimization
10. Chunk 10 (logging) - Create utility
11. Chunk 11 (auth split) - Largest refactor, do last

---

## Files Referenced

**Duplicate Files to Delete:**
- `app/src/lib/SECURE_AUTH_README (1).md`
- `app/src/lib/secureStorage (1).js`
- `app/src/lib/proposalDataFetcher (1).js`
- `app/src/styles/components/create-listing-modal (1).css`
- `app/src/styles/components/create-listing-modal (1) (1).css`
- `app/src/styles/components/create-listing-modal (2).css`
- `app/src/islands/modals/EditPhoneNumberModal (1).jsx`
- `app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx`
- `app/src/islands/modals/NotificationSettingsModal (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`

**Files to Consolidate:**
- `app/src/logic/processors/proposal/processProposalData.js` → merge into proposals/
- `app/src/logic/processors/proposals/processProposalData.js` → keep as consolidated version
- `app/src/logic/workflows/booking/cancelProposalWorkflow.js` → merge into proposals/
- `app/src/logic/workflows/proposals/cancelProposalWorkflow.js` → keep as consolidated version
- `app/src/islands/pages/useGuestProposalsPageLogic.js` → delete, use proposals/ version

**Files to Update:**
- `app/src/lib/constants.js` (add PRICING_CONFIG)
- `app/src/islands/pages/SearchPage.jsx` (use constants, memoization)
- `app/src/islands/pages/SearchPageTest.jsx` (evaluate deletion or major refactor)
- `app/src/lib/auth.js` (split into modules)

**Files to Create:**
- `app/src/lib/logger.js` (logging utility)
- `app/src/lib/auth/index.js` (auth module re-exports)
- `app/src/lib/auth/session.js`
- `app/src/lib/auth/login.js`
- `app/src/lib/auth/signup.js`
- `app/src/lib/auth/logout.js`
- `app/src/lib/auth/passwordReset.js`
- `app/src/lib/auth/tokenValidation.js`
- `app/src/lib/auth/cookies.js`
