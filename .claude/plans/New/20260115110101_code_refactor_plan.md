# Code Refactoring Plan - app

**Date:** 2026-01-15
**Audit Type:** general
**Total Chunks:** 15
**Priority Areas:** Duplicate Files, Empty Catch Blocks, Alert() Usage, Inline Styles, Console Logs

---

## PAGE GROUP: GLOBAL / Multiple Pages (Chunks: 1, 2, 3)

These issues affect multiple pages across the application and should be addressed first for maximum impact.

~~~~~

### CHUNK 1: Remove Duplicate Files with (1) Suffix
**Files:**
- `app/src/islands/modals/EditPhoneNumberModal (1).jsx`
- `app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx`
- `app/src/islands/modals/NotificationSettingsModal (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx`
- `app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx`
- `app/src/islands/shared/CreateDuplicateListingModal (1).jsx`
- `app/src/lib/proposalDataFetcher (1).js`
- `app/src/lib/secureStorage (1).js`

**Line:** N/A (entire files)
**Issue:** Duplicate files with (1) suffix indicate copy-paste versioning instead of proper git branching. These files are identical or near-identical to their originals and create confusion, increase bundle size if accidentally imported, and make maintenance difficult.
**Affected Pages:** AUTO (potentially all pages if imported)

**Current Code:**
```javascript
// File: EditPhoneNumberModal (1).jsx - ENTIRE FILE IS DUPLICATE
// 235 lines identical to EditPhoneNumberModal.jsx
```

**Refactored Code:**
```javascript
// DELETE THESE FILES ENTIRELY:
// - EditPhoneNumberModal (1).jsx
// - EditPhoneNumberModal (1) (1).jsx
// - NotificationSettingsModal (1).jsx
// - AuthAwareSearchScheduleSelector (1).jsx
// - AuthAwareSearchScheduleSelector (1) (1).jsx
// - CreateDuplicateListingModal (1).jsx
// - proposalDataFetcher (1).js
// - secureStorage (1).js

// Keep only the original files without the (1) suffix
```

**Testing:**
- [ ] Search codebase for imports of (1) files
- [ ] Verify no components import the duplicate files
- [ ] Run `bun run build` to confirm no broken imports
- [ ] Delete duplicate files

~~~~~

### CHUNK 2: Create Toast Notification Service to Replace alert()
**File:** `app/src/lib/toastService.js` (NEW)
**Line:** N/A (new file)
**Issue:** 40+ instances of `alert()` across the codebase create poor UX (modal blocking, no styling, inconsistent) and are inaccessible. A centralized toast service already exists (`Toast.jsx`) but isn't consistently used.
**Affected Pages:** /search, /view-split-lease, /guest-proposals, /account-profile, /why-split-lease, modals

**Current Code:**
```javascript
// In multiple files:
alert('Please select at least one night per week');
alert('Proposal deleted successfully');
alert('Error saving phone number: ' + error.message);
```

**Refactored Code:**
```javascript
// app/src/lib/toastService.js (NEW FILE)
/**
 * Global Toast Service
 * Provides a centralized way to show toast notifications without prop drilling.
 * Uses a pub/sub pattern for decoupled notification dispatch.
 */

const listeners = new Set();

export const ToastType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - One of ToastType values
 * @param {number} duration - Duration in ms (default 4000)
 */
export function showToast(message, type = ToastType.INFO, duration = 4000) {
  listeners.forEach(listener => listener({ message, type, duration }));
}

/**
 * Subscribe to toast events (used by Toast component)
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeToToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Convenience methods
export const toast = {
  success: (msg, duration) => showToast(msg, ToastType.SUCCESS, duration),
  error: (msg, duration) => showToast(msg, ToastType.ERROR, duration),
  warning: (msg, duration) => showToast(msg, ToastType.WARNING, duration),
  info: (msg, duration) => showToast(msg, ToastType.INFO, duration)
};
```

**Testing:**
- [ ] Create `app/src/lib/toastService.js` with the above code
- [ ] Update `Toast.jsx` to use `subscribeToToasts`
- [ ] Replace one `alert()` call as proof of concept
- [ ] Verify toast appears with correct styling

~~~~~

### CHUNK 3: Reduce Excessive Console Logging (2090 occurrences)
**File:** Multiple files across `app/src/`
**Line:** Various
**Issue:** 2090 console.log/warn/error statements across 168 files. While some are necessary for debugging, many are development artifacts that impact performance, expose internal information, and clutter the console. Should use a logger service with log levels.
**Affected Pages:** ALL

**Current Code:**
```javascript
// app/src/islands/pages/ViewSplitLeasePage.jsx:55
console.log('📅 ViewSplitLeasePage: No days-selected URL param, using empty initial selection');

// app/src/islands/pages/ViewSplitLeasePage.jsx:67
console.log('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
  urlParam: daysParam,
  dayIndices: validDays,
  dayObjects: dayObjects.map(d => d.name)
});
```

**Refactored Code:**
```javascript
// app/src/lib/logger.js - Enhanced version
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Set via environment or config
const currentLevel = import.meta.env.PROD ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG;

export const logger = {
  debug: (...args) => currentLevel <= LOG_LEVEL.DEBUG && console.log('[DEBUG]', ...args),
  info: (...args) => currentLevel <= LOG_LEVEL.INFO && console.log('[INFO]', ...args),
  warn: (...args) => currentLevel <= LOG_LEVEL.WARN && console.warn('[WARN]', ...args),
  error: (...args) => currentLevel <= LOG_LEVEL.ERROR && console.error('[ERROR]', ...args)
};

// Usage in ViewSplitLeasePage.jsx:
import { logger } from '../../lib/logger.js';
logger.debug('📅 ViewSplitLeasePage: No days-selected URL param');
```

**Testing:**
- [ ] Update `app/src/lib/logger.js` with log levels
- [ ] Replace console.log in one file as proof of concept
- [ ] Verify production build suppresses debug logs
- [ ] Run build and check console output

~~~~~

## PAGE GROUP: /search, /search-test (Chunks: 4, 5, 6)

~~~~~

### CHUNK 4: Fix Empty Catch Block in SearchPageTest
**File:** `app/src/islands/pages/SearchPageTest.jsx`
**Line:** 1079
**Issue:** Empty catch block silently swallows JSON parsing errors, making debugging impossible. If photo data is malformed, the error is hidden and photos may silently fail to load.
**Affected Pages:** /search-test

**Current Code:**
```javascript
// app/src/islands/pages/SearchPageTest.jsx:1076-1080
} else if (typeof photosField === 'string') {
  try {
    const parsed = JSON.parse(photosField);
    if (Array.isArray(parsed)) parsed.forEach(id => allPhotoIds.add(id));
  } catch (e) {}
}
```

**Refactored Code:**
```javascript
// app/src/islands/pages/SearchPageTest.jsx:1076-1082
} else if (typeof photosField === 'string') {
  try {
    const parsed = JSON.parse(photosField);
    if (Array.isArray(parsed)) parsed.forEach(id => allPhotoIds.add(id));
  } catch (e) {
    logger.warn('Failed to parse photo IDs from listing:', listing._id, e.message);
  }
}
```

**Testing:**
- [ ] Locate line 1079 in SearchPageTest.jsx
- [ ] Add logging to catch block
- [ ] Test with malformed photo data to verify logging works
- [ ] Verify photos still load correctly for valid data

~~~~~

### CHUNK 5: Extract Inline Check-in/Check-out Logic to Calculator
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 71-120 (CompactScheduleIndicator), 1157-1195 (checkInOutDays useMemo)
**Issue:** Check-in/check-out day calculation logic is duplicated in both `CompactScheduleIndicator` component (lines 71-120) and `checkInOutDays` useMemo (lines 1157-1195). This violates DRY principle and the codebase's four-layer logic architecture.
**Affected Pages:** /search

**Current Code:**
```javascript
// app/src/islands/pages/SearchPage.jsx:88-120 (in CompactScheduleIndicator)
if (selectedDaysArray.length >= 2) {
  const sortedDays = [...selectedDaysArray].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  let checkInDay, checkOutDay;

  if (isWrapAround) {
    // Find the gap in the sequence to determine actual check-in/check-out
    let gapIndex = -1;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }
    // ... more logic
  }
  // ...
}

// DUPLICATED at lines 1157-1195 in same file
```

**Refactored Code:**
```javascript
// app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js (NEW)
/**
 * Calculate check-in and check-out days from selected day indices
 * Handles wrap-around scenarios (e.g., Fri-Mon selection)
 *
 * @param {number[]} selectedDays - Array of day indices (0=Sun, 6=Sat)
 * @returns {{ checkIn: number, checkOut: number } | null}
 */
export function calculateCheckInOutFromDays(selectedDays) {
  if (!selectedDays || selectedDays.length < 2) {
    return null;
  }

  const sortedDays = [...selectedDays].sort((a, b) => a - b);
  const hasSaturday = sortedDays.includes(6);
  const hasSunday = sortedDays.includes(0);
  const isWrapAround = hasSaturday && hasSunday && sortedDays.length < 7;

  if (isWrapAround) {
    // Find the gap to determine actual boundaries
    let gapIndex = -1;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] > 1) {
        gapIndex = i;
        break;
      }
    }

    if (gapIndex !== -1) {
      return {
        checkIn: sortedDays[gapIndex],
        checkOut: sortedDays[gapIndex - 1]
      };
    }
  }

  return {
    checkIn: sortedDays[0],
    checkOut: sortedDays[sortedDays.length - 1]
  };
}

// In SearchPage.jsx, replace both implementations:
import { calculateCheckInOutFromDays } from '../../logic/calculators/scheduling/calculateCheckInOutFromDays.js';

// CompactScheduleIndicator:
const checkInOut = calculateCheckInOutFromDays(selectedDaysArray);
const checkInText = checkInOut ? dayNames[checkInOut.checkIn] : '';
const checkOutText = checkInOut ? dayNames[checkInOut.checkOut] : '';

// checkInOutDays useMemo:
const checkInOutDays = useMemo(() => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result = calculateCheckInOutFromDays(selectedDaysForDisplay);
  if (!result) return { checkIn: '', checkOut: '' };
  return {
    checkIn: dayNames[result.checkIn],
    checkOut: dayNames[result.checkOut]
  };
}, [selectedDaysForDisplay]);
```

**Testing:**
- [ ] Create `calculateCheckInOutFromDays.js` in logic/calculators/scheduling/
- [ ] Add unit tests for wrap-around and normal scenarios
- [ ] Replace logic in CompactScheduleIndicator
- [ ] Replace logic in checkInOutDays useMemo
- [ ] Verify search page displays correct check-in/check-out

~~~~~

### CHUNK 6: Large Component File - SearchPage.jsx (2000+ lines)
**File:** `app/src/islands/pages/SearchPage.jsx`
**Line:** 1-2000+
**Issue:** SearchPage.jsx is over 2000 lines, violating the hollow component pattern. It contains inline components (CompactScheduleIndicator, MobileFilterBar), utility functions (fetchInformationalTexts), and extensive state management. Should delegate to useSearchPageLogic.js hook.
**Affected Pages:** /search

**Current Code:**
```javascript
// app/src/islands/pages/SearchPage.jsx:71-144
function CompactScheduleIndicator({ isVisible }) {
  // 73 lines of component logic defined INSIDE the main component file
  // This creates new function references on every render
}

// Lines 150-300+: MobileFilterBar component inline
// Lines 37-61: fetchInformationalTexts utility function inline
// Lines 1070-1200: Multiple state variables in main component
```

**Refactored Code:**
```javascript
// 1. Extract CompactScheduleIndicator to separate file:
// app/src/islands/pages/SearchPage/components/CompactScheduleIndicator.jsx

// 2. Extract MobileFilterBar:
// app/src/islands/pages/SearchPage/components/MobileFilterBar.jsx

// 3. Move fetchInformationalTexts to:
// app/src/lib/informationalTextsFetcher.js (already exists, just import it)

// 4. In SearchPage.jsx, use the existing useSearchPageLogic hook:
import { useSearchPageLogic } from './useSearchPageLogic.js';
import CompactScheduleIndicator from './components/CompactScheduleIndicator.jsx';
import MobileFilterBar from './components/MobileFilterBar.jsx';

function SearchPage() {
  const logic = useSearchPageLogic();

  return (
    <div className="search-page">
      <CompactScheduleIndicator isVisible={logic.showCompactIndicator} />
      <MobileFilterBar
        onFilterClick={logic.handleFilterClick}
        onMapClick={logic.handleMapClick}
      />
      {/* ... rest of component using logic.* */}
    </div>
  );
}
```

**Testing:**
- [ ] Create `app/src/islands/pages/SearchPage/` directory structure
- [ ] Extract `CompactScheduleIndicator.jsx` as separate component
- [ ] Extract `MobileFilterBar.jsx` as separate component
- [ ] Update imports in SearchPage.jsx
- [ ] Verify search page functionality unchanged
- [ ] Run build to confirm no regressions

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7, 8)

~~~~~

### CHUNK 7: Replace alert() with Toast in ViewSplitLeasePage
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** 1171, 1176
**Issue:** Using `alert()` for validation feedback creates poor UX. These should use toast notifications for non-blocking feedback.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// app/src/islands/pages/ViewSplitLeasePage.jsx:1171
alert('Please select a valid contiguous schedule');

// app/src/islands/pages/ViewSplitLeasePage.jsx:1176
alert('Please select a move-in date');
```

**Refactored Code:**
```javascript
// app/src/islands/pages/ViewSplitLeasePage.jsx
import { toast } from '../../lib/toastService.js';

// Line 1171:
toast.warning('Please select a valid contiguous schedule');

// Line 1176:
toast.warning('Please select a move-in date');
```

**Testing:**
- [ ] Import toast service at top of file
- [ ] Replace alert() calls with toast.warning()
- [ ] Ensure Toast component is rendered in page layout
- [ ] Test validation flow to verify toast appears

~~~~~

### CHUNK 8: Excessive Inline Styles in ViewSplitLeasePage (244 occurrences)
**File:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Line:** Multiple (244 style={} occurrences)
**Issue:** 244 inline style objects create new references on every render, hurting performance and making styling inconsistent. Should extract to CSS modules or styled-components.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Multiple instances like:
<div style={{
  position: 'fixed',
  inset: 0,
  zIndex: 2002,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '100px',
  paddingBottom: '50px',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}} />
```

**Refactored Code:**
```javascript
// Option 1: CSS Module (preferred)
// app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.module.css
.modalOverlay {
  position: fixed;
  inset: 0;
  z-index: 2002;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  padding-bottom: 50px;
  background-color: rgba(0, 0, 0, 0.5);
}

// In component:
import styles from './ViewSplitLeasePage.module.css';
<div className={styles.modalOverlay} />

// Option 2: Move static styles outside component
const STYLES = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2002,
    // ... etc
  }
};
// Use: <div style={STYLES.modalOverlay} />
```

**Testing:**
- [ ] Create ViewSplitLeasePage.module.css
- [ ] Extract 5-10 most repeated styles as proof of concept
- [ ] Replace inline styles with className references
- [ ] Verify visual appearance unchanged
- [ ] Check bundle size reduction

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 9, 10)

~~~~~

### CHUNK 9: Replace alert() with Toast in useGuestProposalsPageLogic
**File:** `app/src/islands/pages/useGuestProposalsPageLogic.js`
**Line:** 284, 290, 344, 350, 353, 357, 390, 394, 398
**Issue:** 9 instances of `alert()` in guest proposals logic. These interrupt the user flow and should be non-blocking toasts.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// app/src/islands/pages/useGuestProposalsPageLogic.js:284
alert('Proposal deleted successfully')

// Line 290:
alert('Failed to delete proposal. Please try again.')

// Line 357:
alert('Failed to cancel proposal. Please try again.')

// Line 398:
alert('Failed to accept proposal. Please try again.')
```

**Refactored Code:**
```javascript
// app/src/islands/pages/useGuestProposalsPageLogic.js
import { toast } from '../../lib/toastService.js';

// Line 284:
toast.success('Proposal deleted successfully');

// Line 290:
toast.error('Failed to delete proposal. Please try again.');

// Line 357:
toast.error('Failed to cancel proposal. Please try again.');

// Line 398:
toast.error('Failed to accept proposal. Please try again.');
```

**Testing:**
- [ ] Import toast service
- [ ] Replace all 9 alert() calls with appropriate toast type
- [ ] Test delete, cancel, and accept flows
- [ ] Verify toast messages display correctly

~~~~~

### CHUNK 10: Inconsistent Error Handling Pattern
**File:** `app/src/islands/pages/useGuestProposalsPageLogic.js`
**Line:** 280-400
**Issue:** Error handling is inconsistent - some errors show `result.message`, others show hardcoded strings. Should normalize to a consistent pattern.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Line 344: Uses dynamic message
alert(result.message)

// Line 357: Uses hardcoded message
alert('Failed to cancel proposal. Please try again.')

// Inconsistent pattern
```

**Refactored Code:**
```javascript
// Create error message helper
const getErrorMessage = (result, fallback) => {
  return result?.message || fallback;
};

// Line 344:
toast.error(getErrorMessage(result, 'Action failed. Please try again.'));

// Line 357:
toast.error(getErrorMessage(result, 'Failed to cancel proposal. Please try again.'));

// Or use result.message consistently when available:
toast.error(result?.message || 'Failed to cancel proposal. Please try again.');
```

**Testing:**
- [ ] Audit all error handling in file
- [ ] Standardize pattern across all catch blocks
- [ ] Ensure error messages are user-friendly
- [ ] Test error scenarios

~~~~~

## PAGE GROUP: Modals (Chunks: 11, 12)

~~~~~

### CHUNK 11: Replace alert() in VirtualMeetingModal (7 instances)
**File:** `app/src/islands/modals/VirtualMeetingModal.jsx`
**Line:** 35, 86, 91, 112, 117, 137, 142, 171, 176
**Issue:** 9 alert() calls in a single modal component. Critical UX issue as modals on top of modals (alert) is confusing.
**Affected Pages:** /guest-proposals, /host-proposals, /view-split-lease (wherever modal is used)

**Current Code:**
```javascript
// app/src/islands/modals/VirtualMeetingModal.jsx:35
alert('Please select a date and time');

// Line 86:
alert('Virtual meeting request sent!');

// Line 91:
alert('Failed to submit request. Please try again.');

// Line 171:
alert('Virtual meeting cancelled.');
```

**Refactored Code:**
```javascript
// app/src/islands/modals/VirtualMeetingModal.jsx
import { toast } from '../../lib/toastService.js';

// Line 35:
toast.warning('Please select a date and time');

// Line 86:
toast.success('Virtual meeting request sent!');

// Line 91:
toast.error('Failed to submit request. Please try again.');

// Line 171:
toast.success('Virtual meeting cancelled.');
```

**Testing:**
- [ ] Import toast service
- [ ] Replace all 9 alert() calls
- [ ] Test meeting scheduling flow
- [ ] Test meeting cancellation flow
- [ ] Verify toasts appear correctly even with modal open

~~~~~

### CHUNK 12: Remove Duplicate EditPhoneNumberModal Logic
**File:** `app/src/islands/modals/EditPhoneNumberModal.jsx`
**Line:** 22-37
**Issue:** The EditPhoneNumberModal has identical duplicates (1).jsx and (1)(1).jsx. After deleting duplicates (Chunk 1), the original should also be updated to use toast service.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// app/src/islands/modals/EditPhoneNumberModal.jsx:24
alert('Please enter a new phone number');

// Line 33:
alert('Error saving phone number: ' + error.message);
```

**Refactored Code:**
```javascript
// app/src/islands/modals/EditPhoneNumberModal.jsx
import { toast } from '../../lib/toastService.js';

// Line 24:
toast.warning('Please enter a new phone number');

// Line 33:
toast.error(`Error saving phone number: ${error.message}`);
```

**Testing:**
- [ ] Delete duplicate files first (Chunk 1)
- [ ] Update original EditPhoneNumberModal.jsx
- [ ] Test phone number edit flow
- [ ] Verify validation toast appears
- [ ] Verify error toast appears on failure

~~~~~

## PAGE GROUP: /why-split-lease (Chunks: 13)

~~~~~

### CHUNK 13: Replace alert() in WhySplitLeasePage
**File:** `app/src/islands/pages/WhySplitLeasePage.jsx`
**Line:** 216
**Issue:** alert() used for form validation on public marketing page. Poor UX for potential customers.
**Affected Pages:** /why-split-lease

**Current Code:**
```javascript
// app/src/islands/pages/WhySplitLeasePage.jsx:216
alert('Please select at least one night per week');
```

**Refactored Code:**
```javascript
// app/src/islands/pages/WhySplitLeasePage.jsx
import { toast } from '../../lib/toastService.js';

// Line 216:
toast.warning('Please select at least one night per week');
```

**Testing:**
- [ ] Import toast service
- [ ] Replace alert() with toast.warning()
- [ ] Test schedule selection validation
- [ ] Verify toast styling matches page design

~~~~~

## PAGE GROUP: Account/Profile (Chunks: 14)

~~~~~

### CHUNK 14: Excessive Inline Styles in SignUpLoginModal (202 occurrences)
**File:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Line:** 1-500+
**Issue:** 202 inline style objects in a single component file. This modal is used across many pages and the styles should be extracted for maintainability and performance.
**Affected Pages:** ALL (modal used everywhere)

**Current Code:**
```javascript
// app/src/islands/shared/SignUpLoginModal.jsx
// Hundreds of style objects like:
const styles = {
  overlay: { /* 10 properties */ },
  modal: { /* 15 properties */ },
  // ... 50+ more style objects
};

// And inline styles:
<div style={{
  flex: 1,
  padding: '12px 16px',
  border: '1px solid #0a66c2',
  // ... etc
}}>
```

**Refactored Code:**
```javascript
// Option 1: Extract to CSS module
// app/src/islands/shared/SignUpLoginModal/SignUpLoginModal.module.css
.overlay { /* styles */ }
.modal { /* styles */ }
.linkedinBtn { /* styles */ }

// app/src/islands/shared/SignUpLoginModal/SignUpLoginModal.jsx
import styles from './SignUpLoginModal.module.css';

<div className={styles.overlay}>
  <div className={styles.modal}>
    <button className={styles.linkedinBtn}>

// Option 2: Move styles object outside component and memoize
// At module level (not inside component):
const MODAL_STYLES = Object.freeze({
  overlay: { /* ... */ },
  modal: { /* ... */ },
});
```

**Testing:**
- [ ] Create SignUpLoginModal directory structure
- [ ] Extract styles to CSS module
- [ ] Update imports
- [ ] Verify modal appearance unchanged
- [ ] Test on mobile and desktop
- [ ] Verify login/signup flows work

~~~~~

## PAGE GROUP: Legacy/Cleanup (Chunks: 15)

~~~~~

### CHUNK 15: Remove ViewSplitLeasePage-old.jsx Legacy File
**File:** `app/src/islands/pages/ViewSplitLeasePage-old.jsx`
**Line:** N/A (entire file)
**Issue:** Legacy file contains outdated implementations including placeholder alerts like "Messaging functionality will be implemented soon!" (line 1229). This file should be reviewed and deleted if no longer needed.
**Affected Pages:** None (not imported)

**Current Code:**
```javascript
// app/src/islands/pages/ViewSplitLeasePage-old.jsx:1220
alert('Proposal submitted successfully! (Backend integration pending)');

// Line 1229:
alert('Messaging functionality will be implemented soon!');

// Line 1234:
alert('Call functionality will be implemented soon!');
```

**Refactored Code:**
```javascript
// DELETE FILE: ViewSplitLeasePage-old.jsx
//
// Before deletion, verify:
// 1. No imports reference this file
// 2. ViewSplitLeasePage.jsx has all necessary functionality
// 3. No unique code exists only in the -old version
```

**Testing:**
- [ ] Search codebase for imports of ViewSplitLeasePage-old
- [ ] Compare with ViewSplitLeasePage.jsx for any missing features
- [ ] If safe, delete the file
- [ ] Run build to confirm no broken imports

~~~~~

---

## Summary Statistics

| Category | Count | Priority |
|----------|-------|----------|
| Duplicate Files | 8 files | HIGH - Delete immediately |
| alert() Usage | 40+ instances | HIGH - Poor UX |
| Empty Catch Blocks | 1 confirmed | MEDIUM - Hidden errors |
| Excessive Console Logs | 2090 | LOW - Performance |
| Inline Styles | 1443 | LOW - Gradual migration |
| Large Components | 5+ files >500 lines | MEDIUM - Maintainability |

## Recommended Execution Order

1. **Chunk 1** - Delete duplicate files (immediate, no code changes)
2. **Chunk 2** - Create toast service (foundation for other chunks)
3. **Chunks 7, 9, 11, 12, 13** - Replace alert() calls (use new toast service)
4. **Chunk 4** - Fix empty catch block
5. **Chunks 5, 6** - SearchPage refactoring
6. **Chunk 15** - Delete legacy file
7. **Chunks 3, 8, 14** - Style and logging improvements (gradual)

## File References

| File | Issues |
|------|--------|
| `app/src/islands/pages/SearchPage.jsx` | Chunks 5, 6 |
| `app/src/islands/pages/SearchPageTest.jsx` | Chunk 4 |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Chunks 7, 8 |
| `app/src/islands/pages/useGuestProposalsPageLogic.js` | Chunks 9, 10 |
| `app/src/islands/modals/VirtualMeetingModal.jsx` | Chunk 11 |
| `app/src/islands/modals/EditPhoneNumberModal.jsx` | Chunk 12 |
| `app/src/islands/pages/WhySplitLeasePage.jsx` | Chunk 13 |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Chunk 14 |
| `app/src/islands/pages/ViewSplitLeasePage-old.jsx` | Chunk 15 |
| `app/src/lib/toastService.js` (NEW) | Chunk 2 |
| `app/src/lib/logger.js` | Chunk 3 |
| `app/src/logic/calculators/scheduling/calculateCheckInOutFromDays.js` (NEW) | Chunk 5 |
