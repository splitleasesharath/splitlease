# Code Refactoring Plan - app

Date: 2026-01-17
Audit Type: general

## Summary

This audit identified **16 issues** across the app codebase, grouped by affected page. Key patterns found:
- **Duplicate DAY_NAMES constant** defined 16+ times (most critical duplication)
- **Duplicate fetchInformationalTexts function** in ViewSplitLeasePage when canonical exists
- **Missing import for getStoredUserType** in SearchPage.jsx
- **Excessive console.log statements** (782 occurrences across 118 files)

~~~~~

## PAGE GROUP: SHARED/LIBRARY (Chunks: 1, 2)

### CHUNK 1: Consolidate DAY_NAMES constant to canonical location
**File:** app/src/lib/dayUtils.js
**Line:** 24
**Issue:** DAY_NAMES constant is duplicated 16+ times across the codebase. The canonical definition exists in dayUtils.js but many files define their own local copy instead of importing.
**Affected Pages:** /search, /view-split-lease, /guest-proposals, /host-proposals, /account-profile, /why-split-lease, /preview-split-lease (and all pages using day names)

**Current Code:**
```javascript
// In app/src/lib/dayUtils.js (CANONICAL - keep this)
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// In app/src/islands/pages/SearchPage.jsx:452 (DUPLICATE - remove)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// In app/src/islands/pages/proposals/ProposalCard.jsx:36 (DUPLICATE - remove)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// In app/src/islands/shared/CreateProposalFlowV2.jsx:21 (DUPLICATE - remove)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// And 13+ more locations...
```

**Refactored Code:**
```javascript
// In all files that need DAY_NAMES, add this import:
import { DAY_NAMES } from '../../lib/dayUtils.js';

// Or for deeper paths:
import { DAY_NAMES } from '../../../lib/dayUtils.js';

// Then remove local const declarations
```

**Testing:**
- [ ] Search for all files with `DAY_NAMES` or `dayNames` array definitions
- [ ] Replace each with import from dayUtils.js
- [ ] Run build to ensure no import errors
- [ ] Verify day display works on /search, /guest-proposals, /host-proposals

~~~~~

### CHUNK 2: Remove duplicate DAY_LETTERS constant
**File:** app/src/lib/dayUtils.js
**Line:** 31
**Issue:** DAY_LETTERS constant is also duplicated in several locations when canonical exists
**Affected Pages:** /search, /view-split-lease, /guest-proposals, /host-proposals

**Current Code:**
```javascript
// In app/src/lib/dayUtils.js (CANONICAL - keep this)
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// In app/src/islands/pages/proposals/ProposalCard.jsx:35 (DUPLICATE - remove)
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
```

**Refactored Code:**
```javascript
// In files that need DAY_LETTERS:
import { DAY_LETTERS } from '../../../lib/dayUtils.js';
```

**Testing:**
- [ ] Search for all files with `DAY_LETTERS` array definitions
- [ ] Replace each with import from dayUtils.js
- [ ] Verify day letter badges display correctly on proposal cards

~~~~~

## PAGE GROUP: /search (Chunks: 3, 4)

### CHUNK 3: Fix missing getStoredUserType import
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** 379
**Issue:** SearchPage.jsx uses `getStoredUserType()` on line 379 but doesn't import it. The function is imported in Header.jsx but not in SearchPage.jsx, potentially causing a runtime error.
**Affected Pages:** /search

**Current Code:**
```javascript
// Line 18 - existing imports
import { checkAuthStatus, getUserId, getSessionId, logoutUser } from '../../lib/auth.js';
// ...
// Line 379 - usage without import
const cachedUserType = getStoredUserType();
```

**Refactored Code:**
```javascript
// Line 4 - add import from secureStorage (matching Header.jsx pattern)
import { getUserType as getStoredUserType, getAuthState, getUserId as getPublicUserId } from '../../lib/secureStorage.js';

// Line 18 - keep existing auth imports but remove getUserId if duplicated
import { checkAuthStatus, getSessionId, logoutUser } from '../../lib/auth.js';
```

**Testing:**
- [ ] Run build and check for no compilation errors
- [ ] Test /search page loads without JS console errors
- [ ] Verify user type detection works for host vs guest UI differences

~~~~~

### CHUNK 4: Replace local dayNames with import in SearchPage
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** 452
**Issue:** Local dayNames array duplicates the canonical DAY_NAMES from dayUtils.js
**Affected Pages:** /search

**Current Code:**
```javascript
// Line 452 inside useMemo
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const result = calculateCheckInOutFromDays(selectedDaysForDisplay);
if (!result) return { checkIn: '', checkOut: '' };
return {
  checkIn: dayNames[result.checkIn],
  checkOut: dayNames[result.checkOut]
};
```

**Refactored Code:**
```javascript
// At top of file, add to imports:
import { DAY_NAMES } from '../../lib/dayUtils.js';

// Line 452 inside useMemo - use imported constant
const result = calculateCheckInOutFromDays(selectedDaysForDisplay);
if (!result) return { checkIn: '', checkOut: '' };
return {
  checkIn: DAY_NAMES[result.checkIn],
  checkOut: DAY_NAMES[result.checkOut]
};
```

**Testing:**
- [ ] Verify check-in/check-out day names display correctly on /search

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 5, 6)

### CHUNK 5: Remove duplicate fetchInformationalTexts function
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx
**Line:** 127-200
**Issue:** ViewSplitLeasePage defines its own `fetchInformationalTexts` function (~70 lines) when a canonical version exists in `lib/informationalTextsFetcher.js`. This is code duplication and maintenance burden.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Line 127-200: Local implementation (DUPLICATE - remove entire function)
async function fetchInformationalTexts() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // ... 70+ lines of duplicate logic
}
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { fetchInformationalTexts } from '../../lib/informationalTextsFetcher.js';

// Remove the local fetchInformationalTexts function (lines 127-200)
```

**Testing:**
- [ ] Verify informational text tooltips/modals work on /view-split-lease page
- [ ] Check browser console for no fetch errors

~~~~~

### CHUNK 6: Clean up excessive debug logging in ViewSplitLeasePage
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx
**Line:** Multiple (58, 70-74, 78, 97, 138-163, 182-199)
**Issue:** Excessive debug logging with emojis clutters console output. Should use conditional logging or remove.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Line 58
logger.debug('📅 ViewSplitLeasePage: No days-selected URL param, using empty initial selection');
// Line 70-74
logger.debug('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
  urlParam: daysParam,
  dayIndices: validDays,
  dayObjects: dayObjects.map(d => d.name)
});
// ... many more debug statements
```

**Refactored Code:**
```javascript
// Option A: Remove verbose debug logs entirely
// (Recommended for production cleanliness)

// Option B: Gate behind development mode
if (import.meta.env.DEV) {
  logger.debug('📅 ViewSplitLeasePage: Loaded schedule from URL:', {...});
}
```

**Testing:**
- [ ] Verify /view-split-lease page functions correctly
- [ ] Check browser console is cleaner without verbose debug output

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 7, 8)

### CHUNK 7: Replace local DAY_NAMES/DAY_LETTERS with imports in ProposalCard
**File:** app/src/islands/pages/proposals/ProposalCard.jsx
**Line:** 35-36
**Issue:** Local DAY_LETTERS and DAY_NAMES constants duplicate canonical definitions
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Lines 35-36
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES, DAY_LETTERS } from '../../../lib/dayUtils.js';

// Remove lines 35-36 (local constant definitions)
```

**Testing:**
- [ ] Verify proposal cards display day schedules correctly on /guest-proposals

~~~~~

### CHUNK 8: Clean up excessive console.log in ProposalCard
**File:** app/src/islands/pages/proposals/ProposalCard.jsx
**Line:** Multiple (grep shows 4 occurrences)
**Issue:** Production code contains debug console.log statements
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Various locations with console.log statements
console.log('...');
```

**Refactored Code:**
```javascript
// Replace with logger utility or remove entirely
import { logger } from '../../../lib/logger.js';
logger.debug('...'); // If debug output is needed
// Or remove console.log entirely for production cleanliness
```

**Testing:**
- [ ] Verify /guest-proposals page works correctly
- [ ] Browser console is cleaner

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 9, 10)

### CHUNK 9: Consolidate DAY_NAMES duplicates in HostProposalsPage/types.js
**File:** app/src/islands/pages/HostProposalsPage/types.js
**Line:** 243, 269, 308, 391
**Issue:** DAY_NAMES array is defined 4 times within the same file in different functions
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// Line 243
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Line 269
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Line 308
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Line 391
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES } from '../../../lib/dayUtils.js';

// Replace all 4 occurrences of local dayNames with imported DAY_NAMES
// Line 243: DAY_NAMES[dayIndex] instead of dayNames[dayIndex]
// Line 269: DAY_NAMES[dayIndex] instead of dayNames[dayIndex]
// Line 308: DAY_NAMES[dayIndex] instead of dayNames[dayIndex]
// Line 391: DAY_NAMES[dayIndex] instead of dayNames[dayIndex]
```

**Testing:**
- [ ] Verify /host-proposals page displays day names correctly in all proposal cards
- [ ] Check schedule display in proposal details modal

~~~~~

### CHUNK 10: Clean excessive console.log in useHostProposalsPageLogic
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** Multiple (grep shows 16 occurrences)
**Issue:** 16 console.log statements in a single logic file creates excessive debug output
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// Multiple console.log statements throughout the file
console.log('Fetching proposals...');
console.log('Proposals loaded:', proposals);
// etc.
```

**Refactored Code:**
```javascript
// Replace with logger utility with appropriate levels
import { logger } from '../../../lib/logger.js';
logger.debug('Fetching proposals...');
logger.debug('Proposals loaded:', proposals.length);
```

**Testing:**
- [ ] Verify /host-proposals page loads and functions correctly
- [ ] Browser console is cleaner

~~~~~

## PAGE GROUP: /account-profile (Chunks: 11, 12)

### CHUNK 11: Replace local DAY_NAMES with import in useAccountProfilePageLogic
**File:** app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
**Line:** 23
**Issue:** Local DAY_NAMES constant duplicates canonical definition
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// Line 23
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES } from '../../../lib/dayUtils.js';

// Remove line 23 (local constant definition)
```

**Testing:**
- [ ] Verify /account-profile page displays schedule preferences correctly

~~~~~

### CHUNK 12: Replace local DAY_NAMES in PublicView and ScheduleCommuteCard
**File:** app/src/islands/pages/AccountProfilePage/components/PublicView.jsx
**Line:** 20
**File:** app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx
**Line:** 15
**Issue:** Local DAY_NAMES constants duplicate canonical definition
**Affected Pages:** /account-profile (public view)

**Current Code:**
```javascript
// PublicView.jsx Line 20
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ScheduleCommuteCard.jsx Line 15
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// In both files, add import:
import { DAY_NAMES } from '../../../../lib/dayUtils.js';  // For PublicView
import { DAY_NAMES } from '../../../../../lib/dayUtils.js';  // For ScheduleCommuteCard

// Remove local constant definitions
```

**Testing:**
- [ ] Verify public profile view displays schedule correctly
- [ ] Verify schedule/commute card displays day names correctly

~~~~~

## PAGE GROUP: /why-split-lease (Chunks: 13)

### CHUNK 13: Replace inline dayNames with import in WhySplitLeasePage
**File:** app/src/islands/pages/WhySplitLeasePage.jsx
**Line:** 506
**Issue:** Local dayNames array defined inside component render logic
**Affected Pages:** /why-split-lease

**Current Code:**
```javascript
// Line 506 (inside component)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES } from '../../lib/dayUtils.js';

// Replace usage on line 506+ with DAY_NAMES
```

**Testing:**
- [ ] Verify /why-split-lease page displays correctly

~~~~~

## PAGE GROUP: SHARED COMPONENTS (Chunks: 14, 15)

### CHUNK 14: Replace local DAY_NAMES in CreateProposalFlowV2
**File:** app/src/islands/shared/CreateProposalFlowV2.jsx
**Line:** 21
**Issue:** Local DAY_NAMES constant duplicates canonical definition
**Affected Pages:** /search, /view-split-lease (any page with create proposal modal)

**Current Code:**
```javascript
// Line 21
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES } from '../../lib/dayUtils.js';

// Remove line 21 (local constant definition)
```

**Testing:**
- [ ] Open create proposal modal on /search page
- [ ] Verify day selection displays correct day names

~~~~~

### CHUNK 15: Replace local DAY_NAMES in DaysSelectionSection
**File:** app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx
**Line:** 10
**Issue:** Local DAY_NAMES constant duplicates canonical definition
**Affected Pages:** /search, /view-split-lease (any page with create proposal modal)

**Current Code:**
```javascript
// Line 10
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

**Refactored Code:**
```javascript
// At top of file, add import:
import { DAY_NAMES } from '../../../lib/dayUtils.js';

// Remove line 10 (local constant definition)
```

**Testing:**
- [ ] Verify day selection section in proposal flow shows correct day names

~~~~~

## PAGE GROUP: LOGIC LAYER (Chunks: 16)

### CHUNK 16: Replace local DAY_NAMES in workflow files
**File:** app/src/logic/workflows/scheduling/validateScheduleWorkflow.js
**Line:** 99
**File:** app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js
**Line:** 105
**Issue:** Local DAY_NAMES arrays inside workflow functions duplicate canonical definition
**Affected Pages:** AUTO (affects all scheduling workflows)

**Current Code:**
```javascript
// validateScheduleWorkflow.js Line 99
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// validateMoveInDateWorkflow.js Line 105
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// In both workflow files, add import at top:
import { DAY_NAMES } from '../../lib/dayUtils.js';

// Remove local constant definitions and use imported DAY_NAMES
```

**Testing:**
- [ ] Run any existing tests for scheduling workflows
- [ ] Verify schedule validation works correctly when creating/editing proposals

~~~~~

## Execution Priority

1. **HIGH PRIORITY** (Chunks 1-2, 3): Fix missing imports and consolidate DAY_NAMES - these affect multiple pages and chunk 3 is a potential runtime error
2. **MEDIUM PRIORITY** (Chunks 4-16): Complete DAY_NAMES consolidation across all files
3. **LOW PRIORITY**: Console.log cleanup (Chunks 6, 8, 10) - these are quality improvements but not functional bugs

## File Dependencies

The canonical source for day constants is:
- `app/src/lib/dayUtils.js` - exports DAY_NAMES, DAY_LETTERS, DAY_ABBREV

All files should import from this single source rather than defining local copies.

## Post-Refactoring Verification

After completing all chunks:
1. Run `bun run build` to verify no import errors
2. Run `bun run lint` to check for any issues
3. Test each affected page manually:
   - /search - Check day selector, filter display
   - /view-split-lease - Check schedule display
   - /guest-proposals - Check proposal card day badges
   - /host-proposals - Check proposal cards
   - /account-profile - Check schedule preferences
   - /why-split-lease - Check day display
4. Verify create proposal modal works from both /search and /view-split-lease
