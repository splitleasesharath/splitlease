# Code Refactoring Plan - app/src/logic

Date: 2026-01-14
Audit Type: general

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 1, 2, 3, 4, 5, 6)

### CHUNK 1: Duplicate canCancelProposal implementations
**File:** app/src/logic/rules/proposals/canCancelProposal.js AND app/src/logic/rules/proposals/proposalRules.js
**Line:** 27 (canCancelProposal.js) AND 26 (proposalRules.js)
**Issue:** Two completely different `canCancelProposal` functions exist with conflicting signatures and implementations. One takes `{ proposalStatus, deleted }` parameters, the other takes a `proposal` object. This creates confusion and potential bugs when the wrong one is used.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// canCancelProposal.js (lines 27-47)
export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Deleted proposals cannot be cancelled
  if (deleted) {
    return false
  }

  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()

  if (isTerminalStatus(status) || isCompletedStatus(status)) {
    return false
  }

  // Can cancel if in any active state
  // Includes: Draft, Pending, Host Countered, VM Requested, VM Confirmed, Accepted, Verified
  return true
}

// proposalRules.js (lines 26-54)
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return false;
  }

  // Can't cancel if lease is already activated
  if (isCompletedStatus(status)) {
    return false;
  }

  // Can't cancel if expired
  if (status === PROPOSAL_STATUSES.EXPIRED.key) {
    return false;
  }

  // Otherwise, can cancel
  return true;
}
```

**Refactored Code:**
```javascript
// DELETE canCancelProposal.js entirely
// KEEP proposalRules.js as the single source of truth
// UPDATE index.js exports to only export from proposalRules.js

// In proposalRules.js - add overload support for both signatures:
/**
 * Check if a proposal can be cancelled by the guest
 * @param {Object|Object} proposalOrParams - Either a proposal object or { proposalStatus, deleted }
 * @returns {boolean} True if proposal can be cancelled
 */
export function canCancelProposal(proposalOrParams) {
  // Support named parameter signature for backward compatibility
  if ('proposalStatus' in proposalOrParams) {
    const { proposalStatus, deleted = false } = proposalOrParams;
    if (deleted) return false;
    if (!proposalStatus || typeof proposalStatus !== 'string') return false;
    const status = proposalStatus.trim();
    if (isTerminalStatus(status) || isCompletedStatus(status)) return false;
    return true;
  }

  // Original proposal object signature
  const proposal = proposalOrParams;
  if (!proposal) return false;

  const status = proposal.status || proposal.Status;

  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return false;
  }

  if (isCompletedStatus(status)) return false;
  if (status === PROPOSAL_STATUSES.EXPIRED.key) return false;

  return true;
}
```

**Testing:**
- [ ] Verify all callers of canCancelProposal work with unified implementation
- [ ] Test with both parameter styles: `{ proposalStatus, deleted }` and `proposal` object
- [ ] Run guest-proposals page and verify cancel button logic works correctly

~~~~~

### CHUNK 2: Duplicate cancelProposalWorkflow implementations
**File:** app/src/logic/workflows/booking/cancelProposalWorkflow.js AND app/src/logic/workflows/proposals/cancelProposalWorkflow.js
**Line:** 38 (booking) AND 95 (proposals)
**Issue:** Two completely different `cancelProposalWorkflow` files exist. The `booking/` version takes a supabase client as parameter and accepts a canCancelProposal rule function. The `proposals/` version imports supabase directly and has its own internal logic. This violates the Single Source of Truth principle.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// booking/cancelProposalWorkflow.js (lines 38-143)
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  canCancelProposal
}) {
  // Validation
  if (!supabase) {
    throw new Error('cancelProposalWorkflow: supabase client is required')
  }
  // ... dependency-injected implementation
}

// proposals/cancelProposalWorkflow.js (lines 95-128)
export async function executeCancelProposal(proposalId, reason = null) {
  if (!proposalId) {
    throw new Error('Proposal ID is required');
  }
  // ... imports supabase directly
  const { data, error } = await supabase
    .from('proposal')
    .update(updateData)
    // ...
}
```

**Refactored Code:**
```javascript
// CONSOLIDATE into proposals/cancelProposalWorkflow.js as the single implementation
// DELETE booking/cancelProposalWorkflow.js

// Keep the dependency-injection pattern from booking/ but merge all logic:
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Cancel a proposal with full decision tree logic
 * @param {Object} params - Named parameters
 * @param {Object} params.supabase - Supabase client (dependency injected)
 * @param {Object} params.proposal - Proposal object
 * @param {string} [params.source='main'] - Source of cancellation
 * @param {string} [params.reason] - Cancellation reason
 * @returns {Promise<Object>} Result with success status
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = 'main',
  reason = null
}) {
  if (!supabase) throw new Error('cancelProposalWorkflow: supabase client is required');
  if (!proposal?.id && !proposal?._id) throw new Error('cancelProposalWorkflow: proposal with id is required');

  const proposalId = proposal.id || proposal._id;
  const canCancel = canCancelProposal(proposal);

  if (!canCancel) {
    return { success: false, message: 'Cannot cancel this proposal', updated: false };
  }

  const condition = determineCancellationCondition(proposal);
  if (!condition.allowCancel) {
    return { success: false, message: condition.message, updated: false };
  }

  // Execute database update
  const { error } = await supabase
    .from('proposal')
    .update({
      'Status': PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
      'reason for cancellation': reason || 'Guest initiated cancellation',
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', proposalId);

  if (error) return { success: false, message: error.message, updated: false, error };
  return { success: true, message: 'Proposal cancelled', updated: true };
}

// Keep other exports: determineCancellationCondition, executeCancelProposal, etc.
```

**Testing:**
- [ ] Update imports in all files using booking/cancelProposalWorkflow
- [ ] Verify GuestEditingProposalModal works
- [ ] Test cancel flow from compare terms modal
- [ ] Test soft-delete flow

~~~~~

### CHUNK 3: Inconsistent proposalStatuses imports (3 different sources)
**File:** Multiple files in app/src/logic/rules/proposals/
**Line:** Various
**Issue:** Proposal status constants are imported from 3 different locations: `../../constants/proposalStatuses.js`, `../../../lib/constants/proposalStatuses.js`, and `../../../config/proposalStatusConfig.js`. This creates maintenance nightmares and potential sync issues.
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// proposalRules.js (line 16)
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../../lib/constants/proposalStatuses.js';

// useProposalButtonStates.js (line 12)
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

// canCancelProposal.js (line 25)
import { isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js'

// determineProposalStage.js (line 24)
import { getStageFromStatus, isTerminalStatus } from '../../constants/proposalStatuses.js'
```

**Refactored Code:**
```javascript
// STANDARDIZE: All logic/ files should import from ../../constants/proposalStatuses.js
// The logic/ folder has its own constants/ directory - use it consistently

// proposalRules.js - UPDATE import
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';

// useProposalButtonStates.js - UPDATE import
// Note: PROPOSAL_STATUS should be renamed to PROPOSAL_STATUSES for consistency
import { PROPOSAL_STATUSES, getStatusConfig } from '../../constants/proposalStatuses.js';

// Ensure logic/constants/proposalStatuses.js is the canonical source
// and re-exports everything needed (or copy missing functions)
```

**Testing:**
- [ ] Verify all status-related functions work after import changes
- [ ] Check that PROPOSAL_STATUS and PROPOSAL_STATUSES have same values
- [ ] Test proposal status display on both guest and host pages

~~~~~

### CHUNK 4: React hook in rules folder (architecture violation)
**File:** app/src/logic/rules/proposals/useProposalButtonStates.js
**Line:** 1-147
**Issue:** A React hook (`useProposalButtonStates`) is placed in the `rules/` folder which should contain only pure predicate functions. Hooks belong in `islands/shared/` or a dedicated hooks folder. This violates the four-layer architecture.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// app/src/logic/rules/proposals/useProposalButtonStates.js
import { useMemo } from 'react';
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(() => {
    // ... hook implementation
  }, [proposal, virtualMeeting, guest, listing, currentUserId]);
}
```

**Refactored Code:**
```javascript
// MOVE to: app/src/islands/shared/hooks/useProposalButtonStates.js

// AND extract pure logic to rules layer:
// app/src/logic/rules/proposals/computeProposalButtonStates.js
import { getStatusConfig, PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

/**
 * Compute button states for a proposal card (pure function)
 * @param {Object} params - Input parameters
 * @returns {Object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  if (!proposal) {
    return {
      virtualMeeting: { visible: false },
      guestAction1: { visible: false },
      guestAction2: { visible: false },
      cancelProposal: { visible: false },
    };
  }
  // ... rest of the logic (without useMemo wrapper)
}

// Then the hook simply wraps it:
// app/src/islands/shared/hooks/useProposalButtonStates.js
import { useMemo } from 'react';
import { computeProposalButtonStates } from '../../../logic/rules/proposals/computeProposalButtonStates.js';

export function useProposalButtonStates(params) {
  return useMemo(() => computeProposalButtonStates(params),
    [params.proposal, params.virtualMeeting, params.guest, params.listing, params.currentUserId]);
}
```

**Testing:**
- [ ] Move hook file to islands/shared/hooks/
- [ ] Update all imports
- [ ] Verify button states render correctly on proposal cards

~~~~~

### CHUNK 5: Hard-coded fallback values in proposalRules.js
**File:** app/src/logic/rules/proposals/proposalRules.js
**Line:** 307-316
**Issue:** `getCancellationReasonOptions()` has hardcoded fallback values that duplicate what should be fetched from reference tables. If the reference data changes, this fallback will be stale.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// proposalRules.js (lines 297-317)
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  return [
    'Found another property',
    'Changed move-in dates',
    'Changed budget',
    'Changed location preference',
    'No longer need housing',
    'Host not responsive',
    'Terms not acceptable',
    'Other'
  ];
}
```

**Refactored Code:**
```javascript
// proposalRules.js - Remove fallback, make the caller handle loading state

/**
 * Get available cancellation reason options for guests
 * Returns empty array if cache not populated yet (caller should show loading state)
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();
  return cachedReasons.map(r => r.reason);
}

// The calling UI component should handle the empty state:
// const reasons = getCancellationReasonOptions();
// if (reasons.length === 0) return <LoadingSpinner />;
```

**Testing:**
- [ ] Verify cancellation modal still loads reasons
- [ ] Test behavior when cache is not yet populated
- [ ] Ensure no UI breaks from empty array return

~~~~~

### CHUNK 6: Proposal data accessors using inconsistent field names
**File:** app/src/logic/workflows/proposals/counterofferWorkflow.js
**Line:** 123-148
**Issue:** `getTermsComparison()` uses both camelCase (`daysSelected`) and Bubble-style (`'Days Selected'`) field names with fallback chains. This creates fragile code that's hard to maintain.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// counterofferWorkflow.js (lines 129-148)
const originalTerms = {
  daysSelected: proposal.daysSelected || proposal['Days Selected'] || [],
  nightsPerWeek: proposal.nightsPerWeek || proposal['nights per week (num)'] || 0,
  reservationWeeks: proposal.reservationWeeks || proposal['Reservation Span (Weeks)'] || 0,
  checkInDay: proposal.checkInDay || proposal['check in day'] || null,
  checkOutDay: proposal.checkOutDay || proposal['check out day'] || null,
  totalPrice: proposal.totalPrice || proposal['Total Price for Reservation (guest)'] || 0,
  nightlyPrice: proposal.nightlyPrice || proposal['proposal nightly price'] || 0,
  damageDeposit: proposal.damageDeposit || proposal['damage deposit'] || 0,
  cleaningFee: proposal.cleaningFee || proposal['cleaning fee'] || 0
};
```

**Refactored Code:**
```javascript
// Create a processor function to normalize proposal data
// app/src/logic/processors/proposal/normalizeProposalFields.js

const FIELD_MAPPINGS = {
  daysSelected: ['daysSelected', 'Days Selected'],
  nightsPerWeek: ['nightsPerWeek', 'nights per week (num)'],
  reservationWeeks: ['reservationWeeks', 'Reservation Span (Weeks)'],
  checkInDay: ['checkInDay', 'check in day'],
  checkOutDay: ['checkOutDay', 'check out day'],
  totalPrice: ['totalPrice', 'Total Price for Reservation (guest)'],
  nightlyPrice: ['nightlyPrice', 'proposal nightly price'],
  damageDeposit: ['damageDeposit', 'damage deposit'],
  cleaningFee: ['cleaningFee', 'cleaning fee']
};

/**
 * Get a normalized field value from a proposal object
 * @param {Object} proposal - Proposal with mixed field naming
 * @param {string} fieldName - Normalized field name
 * @param {*} defaultValue - Default if not found
 * @returns {*} Field value or default
 */
export function getProposalField(proposal, fieldName, defaultValue = null) {
  const possibleKeys = FIELD_MAPPINGS[fieldName] || [fieldName];
  for (const key of possibleKeys) {
    if (proposal[key] !== undefined && proposal[key] !== null) {
      return proposal[key];
    }
  }
  return defaultValue;
}

// Then in counterofferWorkflow.js:
import { getProposalField } from '../../processors/proposal/normalizeProposalFields.js';

const originalTerms = {
  daysSelected: getProposalField(proposal, 'daysSelected', []),
  nightsPerWeek: getProposalField(proposal, 'nightsPerWeek', 0),
  // ... etc
};
```

**Testing:**
- [ ] Verify terms comparison modal shows correct values
- [ ] Test with proposals from both old and new data formats
- [ ] Check counteroffer accept/decline flows

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7, 8)

### CHUNK 7: DAY_NAMES constant duplicated across files
**File:** app/src/logic/workflows/scheduling/validateMoveInDateWorkflow.js AND validateScheduleWorkflow.js
**Line:** 105 (validateMoveInDate) AND 99 (validateSchedule)
**Issue:** The `DAY_NAMES` array is defined inline in multiple files. Should be a shared constant.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// validateMoveInDateWorkflow.js (line 105)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// validateScheduleWorkflow.js (line 99)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
```

**Refactored Code:**
```javascript
// Create shared constant in: app/src/logic/constants/dayNames.js
/**
 * Day names array indexed by JavaScript day index (0=Sunday)
 * @type {string[]}
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get day name from index
 * @param {number} index - Day index (0-6)
 * @returns {string} Day name or empty string if invalid
 */
export function getDayName(index) {
  return DAY_NAMES[index] ?? '';
}

// Then import in both workflow files:
import { DAY_NAMES } from '../../constants/dayNames.js';
```

**Testing:**
- [ ] Update imports in validateMoveInDateWorkflow.js
- [ ] Update imports in validateScheduleWorkflow.js
- [ ] Verify move-in date validation still shows correct day names
- [ ] Verify schedule validation errors display correctly

~~~~~

### CHUNK 8: Verbose null/undefined checks can use optional chaining
**File:** app/src/logic/rules/scheduling/isDateInRange.js
**Line:** 38-52
**Issue:** The function uses verbose null/undefined checks that can be simplified with optional chaining and nullish coalescing for better readability.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// isDateInRange.js (lines 37-63)
// Check first available bound
if (firstAvailable !== null && firstAvailable !== undefined) {
  const firstDate = new Date(firstAvailable)
  if (isNaN(firstDate.getTime())) {
    throw new Error(
      `isDateInRange: firstAvailable is not a valid date: ${firstAvailable}`
    )
  }
  firstDate.setHours(0, 0, 0, 0)
  if (checkDate < firstDate) {
    return false
  }
}

// Check last available bound
if (lastAvailable !== null && lastAvailable !== undefined) {
  const lastDate = new Date(lastAvailable)
  if (isNaN(lastDate.getTime())) {
    throw new Error(
      `isDateInRange: lastAvailable is not a valid date: ${lastAvailable}`
    )
  }
  lastDate.setHours(0, 0, 0, 0)
  if (checkDate > lastDate) {
    return false
  }
}
```

**Refactored Code:**
```javascript
// isDateInRange.js - Use helper function to reduce duplication

/**
 * Normalize a date boundary, returning null if not valid
 * @param {string|Date|null|undefined} dateInput
 * @param {string} paramName - For error messages
 * @returns {Date|null}
 */
function normalizeDateBound(dateInput, paramName) {
  if (dateInput == null) return null; // handles both null and undefined

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error(`isDateInRange: ${paramName} is not a valid date: ${dateInput}`);
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isDateInRange({ date, firstAvailable, lastAvailable }) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('isDateInRange: date must be a valid Date object');
  }

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const firstDate = normalizeDateBound(firstAvailable, 'firstAvailable');
  if (firstDate && checkDate < firstDate) return false;

  const lastDate = normalizeDateBound(lastAvailable, 'lastAvailable');
  if (lastDate && checkDate > lastDate) return false;

  return true;
}
```

**Testing:**
- [ ] Test with null firstAvailable
- [ ] Test with undefined lastAvailable
- [ ] Test with invalid date strings
- [ ] Verify move-in date picker respects date range

~~~~~

## PAGE GROUP: /search (Chunks: 9)

### CHUNK 9: Inefficient JSON parsing in hasListingPhotos rule
**File:** app/src/logic/rules/search/hasListingPhotos.js
**Line:** 34-40
**Issue:** Uses try/catch for JSON parsing which is expensive. Should check if string looks like JSON first.
**Affected Pages:** /search

**Current Code:**
```javascript
// hasListingPhotos.js (lines 33-41)
// Handle string representation (JSON array from database)
if (typeof photos === 'string') {
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}
```

**Refactored Code:**
```javascript
// hasListingPhotos.js - More efficient check

// Handle string representation (JSON array from database)
if (typeof photos === 'string') {
  // Quick check: JSON arrays start with '[' and end with ']'
  const trimmed = photos.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return false;
  }

  // Empty array check without parsing
  if (trimmed === '[]') {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
```

**Testing:**
- [ ] Verify search results still filter out photo-less listings
- [ ] Test with empty string photos field
- [ ] Test with malformed JSON strings
- [ ] Check search page performance with large result sets

~~~~~

## PAGE GROUP: /account-profile, /host-proposals (Chunks: 10, 11)

### CHUNK 10: Similar isHost and isGuest implementations
**File:** app/src/logic/rules/users/isHost.js AND isGuest.js
**Line:** Both files entirely
**Issue:** Both functions have nearly identical structure with only the keyword check differing ('Host' vs 'Guest'). Should be DRY with a shared helper.
**Affected Pages:** /account-profile, /host-proposals, /search, /self-listing

**Current Code:**
```javascript
// isHost.js (lines 24-39)
export function isHost({ userType }) {
  if (!userType || typeof userType !== 'string') {
    return false
  }
  const type = userType.trim()
  if (type === 'Split Lease') {
    return true
  }
  return type.includes('Host')
}

// isGuest.js (lines 23-38)
export function isGuest({ userType }) {
  if (!userType || typeof userType !== 'string') {
    return false
  }
  const type = userType.trim()
  if (type === 'Split Lease') {
    return true
  }
  return type.includes('Guest')
}
```

**Refactored Code:**
```javascript
// Create shared helper in: app/src/logic/rules/users/checkUserRole.js

/**
 * Check if user has a specific role
 * @param {string|null} userType - User type string
 * @param {string} roleKeyword - Role keyword to check for ('Host' or 'Guest')
 * @returns {boolean}
 */
function hasRole(userType, roleKeyword) {
  if (!userType || typeof userType !== 'string') {
    return false;
  }
  const type = userType.trim();
  // Split Lease internal users have all roles
  if (type === 'Split Lease') {
    return true;
  }
  return type.includes(roleKeyword);
}

export const isHost = ({ userType }) => hasRole(userType, 'Host');
export const isGuest = ({ userType }) => hasRole(userType, 'Guest');

// Re-export from index for backward compatibility
```

**Testing:**
- [ ] Verify account profile page shows correct role-based UI
- [ ] Test host dashboard access
- [ ] Test search page guest-specific features
- [ ] Verify self-listing page access control

~~~~~

### CHUNK 11: processUserData.js missing file
**File:** app/src/logic/processors/user/processUserData.js
**Line:** N/A
**Issue:** The file is referenced in imports but the read returned it's from a different location. The processors/user/ folder has individual functions but no unified processUserData processor. The workflow loadProposalDetailsWorkflow expects this processor.
**Affected Pages:** /guest-proposals (indirectly via loadProposalDetailsWorkflow)

**Current Code:**
```javascript
// loadProposalDetailsWorkflow.js (lines 104-109)
if (processUserData) {
  try {
    processedGuest = processUserData({ rawUser: guestData })
  } catch (err) {
    console.warn('Warning: Failed to process guest data:', err.message)
  }
}
// But processUserData is passed as a parameter, not imported
// This means callers need to provide their own implementation
```

**Refactored Code:**
```javascript
// Create: app/src/logic/processors/user/processUserData.js

import { processProfilePhotoUrl } from './processProfilePhotoUrl.js';
import { processUserDisplayName } from './processUserDisplayName.js';
import { processUserInitials } from './processUserInitials.js';

/**
 * Process raw user data into standardized format
 * @param {Object} params
 * @param {Object} params.rawUser - Raw user from database
 * @returns {Object} Processed user object
 */
export function processUserData({ rawUser }) {
  if (!rawUser) {
    throw new Error('processUserData: rawUser is required');
  }

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'] || null,
    fullName: rawUser['Name - Full'] || null,
    displayName: processUserDisplayName({
      firstName: rawUser['Name - First'],
      lastName: rawUser['Name - Last']
    }),
    initials: processUserInitials({
      firstName: rawUser['Name - First'],
      lastName: rawUser['Name - Last']
    }),
    profilePhoto: processProfilePhotoUrl({ url: rawUser['Profile Photo'] }),
    bio: rawUser['About Me / Bio'] || null,
    email: rawUser['email as text'] || null,
    phone: rawUser['Phone Number (as text)'] || null,
    isVerified: rawUser['user verified?'] || false,
    isEmailConfirmed: rawUser['is email confirmed'] || false,
    hasLinkedIn: !!rawUser['Verify - Linked In ID'],
    hasPhoneVerified: !!rawUser['Verify - Phone']
  };
}
```

**Testing:**
- [ ] Create the processUserData.js file
- [ ] Update processors/user/index.js to export it
- [ ] Verify proposal details workflow loads user data correctly
- [ ] Test user display in proposal cards

~~~~~

## PAGE GROUP: /favorites (Chunks: 12)

### CHUNK 12: shiftMoveInDateIfPast has unclear variable naming
**File:** app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js
**Line:** Full file
**Issue:** The function name and internal logic are confusing. It shifts a move-in date forward if it's in the past, but the naming doesn't clearly convey it finds the NEXT occurrence of a check-in day.
**Affected Pages:** /favorites, /search

**Current Code:**
```javascript
// Need to read the file to provide exact current code
// Referenced in FavoriteListingsPage.jsx and SearchPage.jsx
```

**Refactored Code:**
```javascript
// app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js
// Rename to: getNextValidMoveInDate.js

/**
 * Get the next valid move-in date for a given check-in day
 *
 * If the provided moveInDate is in the past, finds the next future date
 * that falls on the same day of the week as the check-in day.
 *
 * @param {Object} params
 * @param {Date} params.moveInDate - Original move-in date
 * @param {number} params.checkInDay - Day of week for check-in (0-6, Sunday=0)
 * @param {Date} [params.today] - Reference date (defaults to now, useful for testing)
 * @returns {Date} Valid move-in date (original if still valid, or next occurrence)
 */
export function getNextValidMoveInDate({ moveInDate, checkInDay, today = new Date() }) {
  // Implementation...
}

// Keep old export name for backward compatibility:
export { getNextValidMoveInDate as shiftMoveInDateIfPast };
```

**Testing:**
- [ ] Verify favorites page still calculates correct move-in dates
- [ ] Verify search results show valid move-in dates
- [ ] Test with past dates and future dates

~~~~~

## PAGE GROUP: AUTO (Cross-cutting concerns) (Chunks: 13, 14, 15)

### CHUNK 13: Missing barrel exports in processors/user/index.js
**File:** app/src/logic/processors/user/index.js
**Line:** N/A (file may not exist)
**Issue:** Individual processor files exist but may lack a proper index.js for clean imports.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// Need to verify if index.js exists and what it exports
// Individual files exist:
// - processProfilePhotoUrl.js
// - processUserDisplayName.js
// - processUserInitials.js
// - processUserData.js (if created per Chunk 11)
```

**Refactored Code:**
```javascript
// app/src/logic/processors/user/index.js

export { processProfilePhotoUrl } from './processProfilePhotoUrl.js';
export { processUserDisplayName } from './processUserDisplayName.js';
export { processUserInitials } from './processUserInitials.js';
export { processUserData } from './processUserData.js';
```

**Testing:**
- [ ] Verify all user processors can be imported from index
- [ ] Check no circular dependencies

~~~~~

### CHUNK 14: console.log statements in production workflow code
**File:** app/src/logic/workflows/proposals/cancelProposalWorkflow.js
**Line:** 112, 122, 126, 139, 159, 170, 174
**Issue:** Multiple `console.log` and `console.error` statements throughout the workflow code. These should use a logging utility that can be disabled in production.
**Affected Pages:** AUTO

**Current Code:**
```javascript
// cancelProposalWorkflow.js (various lines)
console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
console.error('[cancelProposalWorkflow] Error cancelling proposal:', error);
console.log('[cancelProposalWorkflow] Proposal cancelled successfully:', proposalId);
console.log('[cancelProposalWorkflow] Cancel triggered from Compare Terms modal (workflow crkZs5)');
console.log('[cancelProposalWorkflow] Soft-deleting proposal:', proposalId);
console.error('[cancelProposalWorkflow] Error deleting proposal:', error);
console.log('[cancelProposalWorkflow] Proposal deleted successfully:', proposalId);
```

**Refactored Code:**
```javascript
// Create: app/src/lib/logger.js
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args), // Always show warnings
  error: (...args) => console.error(...args), // Always show errors
};

// Then in cancelProposalWorkflow.js:
import { logger } from '../../../lib/logger.js';

logger.debug('[cancelProposalWorkflow] Cancelling proposal:', proposalId);
logger.error('[cancelProposalWorkflow] Error cancelling proposal:', error);
```

**Testing:**
- [ ] Verify logs appear in development mode
- [ ] Verify debug logs are suppressed in production build
- [ ] Check error logs still appear in production

~~~~~

### CHUNK 15: Proposal/proposals folder naming inconsistency
**File:** app/src/logic/processors/proposal/ AND app/src/logic/processors/proposals/
**Line:** N/A (directory level)
**Issue:** Both singular `proposal/` and plural `proposals/` directories exist in processors. Should use consistent naming (prefer singular for consistency with calculators/pricing, rules/auth, etc.).
**Affected Pages:** AUTO

**Current Code:**
```
app/src/logic/processors/
├── proposal/
│   └── processProposalData.js
├── proposals/
│   └── processProposalData.js  (likely duplicate!)
```

**Refactored Code:**
```
app/src/logic/processors/
├── proposal/  (KEEP - singular, consistent with other folders)
│   └── processProposalData.js
└── (DELETE proposals/ folder after migrating any unique content)
```

**Testing:**
- [ ] Check if both files have same content
- [ ] Migrate any unique code from proposals/ to proposal/
- [ ] Update all imports
- [ ] Delete proposals/ folder
- [ ] Run full build to verify no broken imports

~~~~~

## Summary

**Total Chunks:** 15
**Priority Chunks (Critical/High):**
- Chunk 1: Duplicate canCancelProposal (CRITICAL - affects proposal cancellation)
- Chunk 2: Duplicate cancelProposalWorkflow (CRITICAL - workflow confusion)
- Chunk 3: Inconsistent imports (HIGH - maintenance nightmare)
- Chunk 4: React hook in rules (HIGH - architecture violation)

**Affected Pages Summary:**
- /guest-proposals: 6 chunks
- /view-split-lease: 2 chunks
- /search: 1 chunk
- /account-profile, /host-proposals: 2 chunks
- /favorites: 1 chunk
- AUTO (cross-cutting): 3 chunks

**Dependencies:**
- Chunk 3 should be done before Chunk 4 (import paths)
- Chunk 1 should be done before Chunk 2 (function dependency)
- Chunk 11 should be done early (other chunks may reference it)
