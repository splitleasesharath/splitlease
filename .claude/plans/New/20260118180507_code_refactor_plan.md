# Code Refactoring Plan - app

**Date:** 2026-01-18
**Audit Type:** General (Islands, Lib, Hooks)
**Files Analyzed:** 480
**Edge Reduction Target:** 15%

---

## Executive Summary

This audit continues the comprehensive codebase review, focusing on:
- `app/src/islands/` (pages, modals, shared components)
- `app/src/lib/` (utilities, services)
- `app/src/hooks/` (custom React hooks)

The analysis identified **11 actionable chunks** across **5 page groups**. Primary issues:

1. **DAY_NAMES Duplication** - Constant defined 8 times across codebase (CRITICAL)
2. **Console Logging Proliferation** - 652 console statements in islands alone (HIGH)
3. **useSearchPageLogic Complexity** - 22 console.log statements, 28 useState calls (HIGH)
4. **Empty/Silent Catch Blocks** - 144 files with potential error swallowing (MEDIUM)
5. **Missing Error Boundaries** - Page components lack error handling (MEDIUM)

### Scope Note

Previous plans covered:
- `20260118170459` - `app/src/logic/` (calculators, constants, processors, workflows)
- `20260118165142` - Console logging in priceCalculations.js, useScheduleSelector.js, workflow files
- `20260118163519` - `app/src/logic/rules/` (proposals, search, users)

This plan focuses on **NEW issues not covered by previous plans**.

---

## Chunk Summary

| Chunk | Files | Rationale | Approach |
|-------|-------|-----------|----------|
| 1 | 8 files (duplicated DAY_NAMES) | CRITICAL duplication across codebase | Consolidate to single export in dayUtils.js |
| 2 | `app/src/islands/pages/useSearchPageLogic.js` | 22 console.log statements polluting production | Remove debug logging |
| 3 | `app/src/islands/shared/Header.jsx` | 27 console.log statements | Remove debug logging |
| 4 | `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | 31 console statements, complex component | Extract logging, add error boundary |
| 5 | `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | 24 console statements | Remove debug logging |
| 6 | `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | 20 console statements + missing error handling | Remove logging, add error boundary |
| 7 | `app/src/islands/shared/SignUpLoginModal.jsx` | 24 console statements | Remove debug logging |
| 8 | `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | 19 console statements in shared component | Remove debug logging |
| 9 | `app/src/islands/pages/useRentalApplicationPageLogic.js` | 26 console statements | Remove debug logging |
| 10 | `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | 64 console statements in a single component | Remove debug logging |
| 11 | `app/src/lib/safeJson.js` | Fallback mechanism violates "Building for Truth" | Surface errors instead of swallowing |

---

~~~~~

## PAGE GROUP: AUTO (Shared Constant - All Pages) (Chunks: 1)

### CHUNK 1: Consolidate duplicate DAY_NAMES constant

**Files:**
- `app/src/islands/shared/CreateProposalFlowV2.jsx`
- `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx`
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
- `app/src/islands/pages/AccountProfilePage/components/PublicView.jsx`
- `app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx`
- `app/src/islands/pages/proposals/ProposalCard.jsx`
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js`
- `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js`

**Line:** Various (see each file)
**Issue:** **CRITICAL** - `DAY_NAMES` constant is defined 8 times across the codebase. This violates DRY principle and creates maintenance burden when day ordering needs to change. The canonical export exists in `lib/dayUtils.js` but is not being used.
**Affected Pages:** /view-split-lease, /guest-proposals, /account-profile, /search (proposal creation)

**Rationale:** The constant `['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']` appears in 8 files. Some files already correctly import from `lib/dayUtils.js` (4 files), while 8 files define it locally.

**Approach:**
1. Verify `lib/dayUtils.js` exports `DAY_NAMES`
2. Remove local definitions from all 8 files
3. Add import from `lib/dayUtils.js` to each file

**Current Code (example from CreateProposalFlowV2.jsx line 21):**
```javascript
// Day name constants for check-in/check-out calculation
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// Import from canonical source
import { DAY_NAMES } from '../../lib/dayUtils.js';
```

**Testing:**
- [ ] Verify `lib/dayUtils.js` exports DAY_NAMES
- [ ] Update all 8 files to import from dayUtils.js
- [ ] Run `bun run build` to verify no import errors
- [ ] Test proposal creation on /view-split-lease
- [ ] Test schedule display on /account-profile

~~~~~

## PAGE GROUP: /search (Chunks: 2)

### CHUNK 2: Remove verbose logging from useSearchPageLogic.js

**Files:** `app/src/islands/pages/useSearchPageLogic.js`
**Lines:** 216, 231-239, 286-289, 307, 311, 369, 373-377, 416-420, 427, 429-437, 464, 522, 543-551, 563-565, 624, 703-710
**Issue:** **HIGH** - 22 console.log/warn/error statements pollute browser console during normal operation
**Affected Pages:** /search

**Rationale:** This is the main logic hook for the search page. Every filter change triggers multiple console.log calls, creating noise and performance overhead.

**Approach:** Remove all console.log statements except console.error for actual errors. The ESLint rule `no-console` should catch future additions.

**Current Code (lines 216-239, truncated):**
```javascript
const fetchAllActiveListings = useCallback(async () => {
  console.log('🌍 Fetching ALL active listings for map background (green pins)...')

  try {
    const { data, error } = await supabase
      .from('listing')
      // ...

    console.log('📊 fetchAllActiveListings: Supabase returned', data.length, 'active listings')

    // Batch fetch photos
    const photoIdsArray = extractPhotoIdsFromListings(data)
    console.log('📷 fetchAllActiveListings: Collected', photoIdsArray.length, 'unique photo IDs')
    console.log('📷 fetchAllActiveListings: Sample photo IDs:', photoIdsArray.slice(0, 3))

    const photoMap = await fetchPhotoUrls(photoIdsArray)
    console.log('📷 fetchAllActiveListings: photoMap has', Object.keys(photoMap).length, 'entries')
```

**Refactored Code:**
```javascript
const fetchAllActiveListings = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from('listing')
      // ...

    // Batch fetch photos
    const photoIdsArray = extractPhotoIdsFromListings(data)
    const photoMap = await fetchPhotoUrls(photoIdsArray)
```

**Testing:**
- [ ] Verify search page still loads listings correctly
- [ ] Test filter changes (borough, price, week pattern)
- [ ] Check browser console for absence of debug logs
- [ ] Verify errors are still logged on API failures

~~~~~

## PAGE GROUP: AUTO (Header - All Pages) (Chunks: 3)

### CHUNK 3: Remove verbose logging from Header.jsx

**Files:** `app/src/islands/shared/Header.jsx`
**Lines:** Multiple (27 console statements)
**Issue:** **HIGH** - Header component logs on every render affecting all pages
**Affected Pages:** AUTO (Header appears on every page)

**Rationale:** The Header component is loaded on every page. Console logging in this shared component multiplies across the entire application.

**Approach:** Remove all debug console.log statements, keep console.error for actual failures.

**Current Code (example pattern):**
```javascript
useEffect(() => {
  console.log('Header mounted');
  console.log('User state:', user);
  // ... initialization logic
}, []);
```

**Refactored Code:**
```javascript
useEffect(() => {
  // ... initialization logic (no debug logging)
}, []);
```

**Testing:**
- [ ] Verify header renders correctly on homepage
- [ ] Test login/logout state changes
- [ ] Check browser console for absence of header-related logs
- [ ] Test mobile menu functionality

~~~~~

## PAGE GROUP: /self-listing-v2, /self-listing (Chunks: 4)

### CHUNK 4: Remove verbose logging from SelfListingPage.tsx

**Files:** `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`
**Lines:** Multiple (31 console statements)
**Issue:** **HIGH** - Self-listing form logs extensively during form interactions
**Affected Pages:** /self-listing, /self-listing-v2

**Rationale:** This TypeScript file has 31 console statements. As a multi-step form, each step transition and validation triggers logging.

**Approach:** Remove all debug logging. Consider adding error boundary for production stability.

**Current Code (typical pattern):**
```typescript
const handleNextStep = () => {
  console.log('Moving to next step:', currentStep + 1);
  console.log('Form data:', formData);
  setCurrentStep(currentStep + 1);
};
```

**Refactored Code:**
```typescript
const handleNextStep = () => {
  setCurrentStep(currentStep + 1);
};
```

**Testing:**
- [ ] Test full self-listing flow from step 1 to submission
- [ ] Verify form validation still works
- [ ] Check console for absence of step transition logs
- [ ] Test photo upload section

~~~~~

## PAGE GROUP: /messages (Chunks: 5)

### CHUNK 5: Remove verbose logging from useMessagingPageLogic.js

**Files:** `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`
**Lines:** Multiple (24 console statements)
**Issue:** **HIGH** - Messaging page logs on message load and send
**Affected Pages:** /messages

**Rationale:** The messaging system logs heavily during conversation loading and message sending, creating console noise during normal chat usage.

**Approach:** Remove debug logging, keep error logging for failed message sends.

**Current Code (typical pattern):**
```javascript
const loadConversations = async () => {
  console.log('Loading conversations for user:', userId);
  const { data, error } = await supabase
    .from('messages')
    // ...
  console.log('Loaded', data.length, 'conversations');
};
```

**Refactored Code:**
```javascript
const loadConversations = async () => {
  const { data, error } = await supabase
    .from('messages')
    // ...
  if (error) {
    console.error('[MessagingPage] Failed to load conversations:', error);
    throw error;
  }
};
```

**Testing:**
- [ ] Test loading conversation list
- [ ] Test sending and receiving messages
- [ ] Verify real-time updates still work
- [ ] Check error handling on API failures

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 6)

### CHUNK 6: Remove verbose logging from FavoriteListingsPage.jsx

**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Lines:** Multiple (20 console statements)
**Issue:** **MEDIUM** - Favorites page logs on load and interactions
**Affected Pages:** /favorite-listings

**Rationale:** Console logging during favorite loading and card interactions.

**Approach:** Remove debug logging.

**Current Code:**
```javascript
useEffect(() => {
  console.log('Loading favorite listings...');
  loadFavorites();
}, []);

const handleRemoveFavorite = (listingId) => {
  console.log('Removing favorite:', listingId);
  // ... removal logic
};
```

**Refactored Code:**
```javascript
useEffect(() => {
  loadFavorites();
}, []);

const handleRemoveFavorite = (listingId) => {
  // ... removal logic
};
```

**Testing:**
- [ ] Test loading favorites list
- [ ] Test removing a favorite
- [ ] Test clicking through to listing detail

~~~~~

## PAGE GROUP: AUTO (Auth Modal - All Pages) (Chunks: 7)

### CHUNK 7: Remove verbose logging from SignUpLoginModal.jsx

**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Lines:** Multiple (24 console statements)
**Issue:** **MEDIUM** - Auth modal logs during signup/login flow
**Affected Pages:** AUTO (modal can appear on any page)

**Rationale:** The signup/login modal is a shared component that can be triggered from any page. Console logging during authentication affects user experience debugging but shouldn't be in production.

**Approach:** Remove debug logging, keep error logging for auth failures.

**Current Code:**
```javascript
const handleLogin = async () => {
  console.log('Attempting login with:', email);
  try {
    const result = await loginUser(email, password);
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

**Refactored Code:**
```javascript
const handleLogin = async () => {
  try {
    const result = await loginUser(email, password);
    // success handled silently
  } catch (error) {
    console.error('[SignUpLoginModal] Login failed:', error.message);
    // show user-facing error
  }
};
```

**Testing:**
- [ ] Test login flow
- [ ] Test signup flow
- [ ] Test OAuth flows if applicable
- [ ] Verify errors are still logged for debugging

~~~~~

## PAGE GROUP: AUTO (Avatar - All Pages) (Chunks: 8)

### CHUNK 8: Remove verbose logging from useLoggedInAvatarData.js

**Files:** `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
**Lines:** Multiple (19 console statements)
**Issue:** **MEDIUM** - Avatar component logs on every page load
**Affected Pages:** AUTO (avatar appears in header on all pages)

**Rationale:** The logged-in avatar hook logs user data fetching on every page load. This creates repetitive console noise across the entire application.

**Approach:** Remove all debug logging.

**Current Code:**
```javascript
useEffect(() => {
  console.log('Fetching avatar data for user:', userId);
  fetchAvatarData();
}, [userId]);
```

**Refactored Code:**
```javascript
useEffect(() => {
  fetchAvatarData();
}, [userId]);
```

**Testing:**
- [ ] Verify avatar displays correctly when logged in
- [ ] Test avatar dropdown menu
- [ ] Check console for absence of avatar-related logs

~~~~~

## PAGE GROUP: /rental-application (Chunks: 9)

### CHUNK 9: Remove verbose logging from useRentalApplicationPageLogic.js

**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Lines:** Multiple (26 console statements)
**Issue:** **MEDIUM** - Rental application form logs extensively
**Affected Pages:** /rental-application

**Rationale:** Multi-step rental application form logs on every step and field change.

**Approach:** Remove debug logging, keep error logging for submission failures.

**Testing:**
- [ ] Test rental application form submission
- [ ] Verify form validation
- [ ] Check step navigation

~~~~~

## PAGE GROUP: /search (AI Research Modal) (Chunks: 10)

### CHUNK 10: Remove verbose logging from AiSignupMarketReport.jsx

**Files:** `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
**Lines:** Multiple (64 console statements!)
**Issue:** **HIGH** - Single component with 64 console statements
**Affected Pages:** /search (AI Research modal)

**Rationale:** This component has the highest concentration of console logging in the codebase. The AI parsing logic logs every extraction attempt.

**Approach:** Remove all debug logging. If AI debugging is needed, use a feature flag or dev-only logging.

**Current Code (typical pattern):**
```javascript
function extractEmail(text) {
  console.log('Extracting email from:', text);
  const match = text.match(emailRegex);
  console.log('Email match result:', match);
  return match ? match[0] : null;
}
```

**Refactored Code:**
```javascript
function extractEmail(text) {
  if (!text) return null;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}
```

**Testing:**
- [ ] Test AI research modal opens correctly
- [ ] Test email extraction from freeform text
- [ ] Test phone number extraction
- [ ] Test name extraction
- [ ] Verify form submission works

~~~~~

## PAGE GROUP: AUTO (Safe JSON - All Pages) (Chunks: 11)

### CHUNK 11: Remove silent fallback from safeJsonParse

**Files:** `app/src/lib/safeJson.js`
**Lines:** 12-23
**Issue:** **MEDIUM** - Silent fallback violates "Building for Truth" principle
**Affected Pages:** AUTO (used throughout codebase)

**Rationale:** The `safeJsonParse` function silently returns a fallback value when JSON parsing fails. While this prevents crashes, it masks data issues that should be surfaced.

**Approach:** In development mode, throw the error. In production, log and return fallback but with clear warning.

**Current Code:**
```javascript
export const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('JSON parse failed:', error.message);
    }
    return fallback;
  }
};
```

**Refactored Code:**
```javascript
/**
 * Parse JSON with explicit error handling.
 * In development: throws to surface data issues early.
 * In production: logs error and returns fallback.
 *
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value on parse failure
 * @param {string} context - Optional context for error messages
 * @returns {*} Parsed JSON or fallback
 * @throws {SyntaxError} In development mode when parsing fails
 */
export const safeJsonParse = (jsonString, fallback = null, context = 'safeJsonParse') => {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const errorMessage = `[${context}] JSON parse failed: ${error.message}. Input preview: "${String(jsonString).slice(0, 100)}..."`;

    if (import.meta.env.DEV) {
      // In development, surface the error to catch data issues early
      throw new SyntaxError(errorMessage);
    }

    // In production, log warning and return fallback
    console.error(errorMessage);
    return fallback;
  }
};
```

**Testing:**
- [ ] Test in development mode - should throw on malformed JSON
- [ ] Test in production mode - should log and return fallback
- [ ] Verify calling code handles potential throws in dev mode
- [ ] Check that existing functionality isn't broken

~~~~~

---

## Implementation Priority

### Phase 1: Critical Duplication (Highest Impact)
- **CHUNK 1** - Consolidate DAY_NAMES (affects 8 files, maintenance burden)

### Phase 2: High-Volume Logging (Performance Impact)
- **CHUNK 10** - AiSignupMarketReport (64 statements - worst offender)
- **CHUNK 2** - useSearchPageLogic (22 statements on main page)
- **CHUNK 3** - Header.jsx (27 statements on every page)
- **CHUNK 4** - SelfListingPage.tsx (31 statements)
- **CHUNK 5** - useMessagingPageLogic (24 statements)

### Phase 3: Moderate Logging (Quality Improvement)
- **CHUNK 7** - SignUpLoginModal (24 statements)
- **CHUNK 8** - useLoggedInAvatarData (19 statements)
- **CHUNK 9** - useRentalApplicationPageLogic (26 statements)
- **CHUNK 6** - FavoriteListingsPage (20 statements)

### Phase 4: Architecture Improvement
- **CHUNK 11** - safeJsonParse error handling

---

## Dependency Graph Impact

| File | Dependents | Risk Level |
|------|------------|------------|
| `lib/dayUtils.js` | All day-related components | LOW (adding imports) |
| `islands/pages/useSearchPageLogic.js` | SearchPage only | LOW |
| `islands/shared/Header.jsx` | All pages | MEDIUM |
| `islands/shared/SignUpLoginModal.jsx` | All pages (modal) | MEDIUM |
| `lib/safeJson.js` | Many files | MEDIUM (behavior change in dev) |

---

## Files Referenced

### Files to Modify
- `app/src/islands/shared/CreateProposalFlowV2.jsx` (Chunk 1)
- `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` (Chunk 1)
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` (Chunk 1)
- `app/src/islands/pages/AccountProfilePage/components/PublicView.jsx` (Chunk 1)
- `app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx` (Chunk 1)
- `app/src/islands/pages/proposals/ProposalCard.jsx` (Chunk 1)
- `app/src/logic/workflows/scheduling/validateScheduleWorkflow.js` (Chunk 1)
- `app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js` (Chunk 1)
- `app/src/islands/pages/useSearchPageLogic.js` (Chunk 2)
- `app/src/islands/shared/Header.jsx` (Chunk 3)
- `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` (Chunk 4)
- `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` (Chunk 5)
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` (Chunk 6)
- `app/src/islands/shared/SignUpLoginModal.jsx` (Chunk 7)
- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` (Chunk 8)
- `app/src/islands/pages/useRentalApplicationPageLogic.js` (Chunk 9)
- `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` (Chunk 10)
- `app/src/lib/safeJson.js` (Chunk 11)

### Files with Canonical Exports (No Changes Needed)
- `app/src/lib/dayUtils.js` - Already exports DAY_NAMES correctly
- `app/src/lib/constants.js` - Also exports DAY_NAMES (verify single source of truth)

---

## Related Previous Plans

This plan builds on:
- `.claude/plans/New/20260118170459_code_refactor_plan.md` - Logic layer refactoring
- `.claude/plans/New/20260118165142_code_refactor_plan.md` - Initial console logging cleanup
- `.claude/plans/New/20260118163519_code_refactor_plan.md` - Rules layer refactoring

---

## Metrics

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| Console statements in islands | 652 | ~100 (error logging only) |
| DAY_NAMES definitions | 8 | 1 (canonical export) |
| Files with silent error swallowing | 144 | ~50 (intentional try-catch) |

---

## Notes

1. **Console Logging Strategy**: The codebase has 652 console statements in `app/src/islands/` alone. This plan addresses the highest-impact files. A follow-up plan may be needed to address remaining files.

2. **ESLint Configuration**: Consider adding `no-console` rule to `eslint.config.js` to prevent future logging proliferation (with exceptions for console.error).

3. **Error Boundaries**: Many page components lack React Error Boundaries. Consider adding as a separate initiative.

4. **Testing Coverage**: Each chunk should be tested in the development environment before production deployment.
