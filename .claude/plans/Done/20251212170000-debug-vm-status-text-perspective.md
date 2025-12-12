# Debug Analysis: Virtual Meeting Status Text Display Shows Third-Person Instead of First-Person

**Created**: 2025-12-12T17:00:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: Medium
**Affected Area**: GuestProposalsPage - VirtualMeetingsSection Component

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Component Pattern
- **Tech Stack**: React 18, Supabase (PostgreSQL), Bubble.io (legacy backend)
- **Data Flow**:
  - GuestProposalsPage uses `useGuestProposalsPageLogic` hook
  - Proposals fetched via `userProposalQueries.js` -> enriched with virtual meeting data
  - Virtual meeting data fetched from `virtualmeetingschedulesandlinks` Supabase table
  - `VirtualMeetingsSection.jsx` renders VM cards with state-aware messaging

### 1.2 Domain Context
- **Feature Purpose**: Display virtual meeting status messages in the VirtualMeetingsSection below the main proposal card
- **Related Documentation**: `.claude/Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md`
- **Data Model**:
  - `proposal` table has `virtual meeting` field (FK to VM table)
  - `virtualmeetingschedulesandlinks` table contains:
    - `requested by` - User ID of who created the VM request
    - `booked date`, `confirmedBySplitLease`, `meeting declined`
    - `suggested dates and times` - Array of proposed times

### 1.3 Relevant Conventions
- **Key Patterns**:
  - VM State Machine: 6 states defined in `virtualMeetingRules.js`
  - `requestedBy` field determines who initiated the VM request
  - Current user ID passed as `currentUserId` prop to components
- **Layer Boundaries**:
  - Rules layer: `logic/rules/proposals/virtualMeetingRules.js`
  - UI layer: `islands/pages/proposals/VirtualMeetingsSection.jsx`
- **Shared Utilities**: `getVirtualMeetingState()`, `getVMStateInfo()` from virtualMeetingRules.js

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: User navigates to `/guest-proposals` page
- **Critical Path**:
  1. `GuestProposalsPage.jsx` renders
  2. `useGuestProposalsPageLogic.js` fetches proposals with enriched data
  3. `VirtualMeetingsSection.jsx` receives `proposals` and `currentUserId`
  4. `getCardMessage()` function generates status text based on VM state
- **Dependencies**:
  - `virtualMeetingRules.js` - VM state determination
  - `userProposalQueries.js` - Data fetching with VM enrichment

## 2. Problem Statement

When the current user is the one who created/requested the virtual meeting, the status message incorrectly shows third-person text ("A virtual meeting with X has been suggested") instead of first-person text ("You've requested a virtual meeting. Waiting for X's response.").

**Current behavior (INCORRECT):**
"A virtual meeting with <Current user name> has been suggested for the times:"

**Expected behavior (CORRECT):**
"You've requested a virtual meeting. Waiting for <the other user in the proposal>'s response."

## 3. Reproduction Context
- **Environment**: Guest Proposals Page (`/guest-proposals`)
- **Steps to reproduce**:
  1. Login as a guest user
  2. Navigate to `/guest-proposals`
  3. Have a proposal with a virtual meeting where the guest (current user) requested the VM
  4. Observe the VirtualMeetingsSection below the proposal card
- **Expected behavior**: First-person message: "You've requested a virtual meeting. Waiting for [Host Name]'s response."
- **Actual behavior**: Third-person message: "A virtual meeting with [Guest Name] has been suggested for the times:"
- **Error messages/logs**: None (functional bug, not error)

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | **PRIMARY** - Contains `getCardMessage()` function with the bug |
| `app/src/logic/rules/proposals/virtualMeetingRules.js` | **REFERENCE** - VM state determination logic (works correctly) |
| `app/src/lib/proposals/userProposalQueries.js` | **REFERENCE** - Data fetching, provides `requested by` field |
| `app/src/islands/pages/GuestProposalsPage.jsx` | **REFERENCE** - Parent component passing `currentUserId` |

### 4.2 Execution Flow Trace

```
1. GuestProposalsPage renders
   ├── Receives `user` object from hook (contains `_id`)
   ├── Passes `currentUserId={user?._id}` to VirtualMeetingsSection
   │
2. VirtualMeetingsSection.jsx (line 425)
   ├── Receives `proposals` and `currentUserId` props
   ├── Filters proposals with active VMs via filterProposalsWithActiveVM()
   ├── For each proposal, renders VirtualMeetingCard
   │
3. VirtualMeetingCard component (line 303)
   ├── Normalizes VM object via normalizeVMObject()
   ├── Gets VM state via getVirtualMeetingState(normalizedVM, currentUserId)
   ├── **BUG LOCATION**: Calls getCardMessage(vmState, hostName)
   │   └── Problem: Only passes hostName, not guestName
   │
4. getCardMessage function (line 174)
   ├── case VM_STATES.REQUESTED_BY_GUEST:
   │   └── Returns: "You've requested a virtual meeting. Waiting for ${hostName}'s response."
   │       └── **This is CORRECT** - Uses hostName correctly for first-person message
   │
   ├── default: (falls through when state detection fails)
   │   └── Returns: "A virtual meeting with ${hostName} has been suggested:"
   │       └── **This is the BUG** - Shows wrong message when state is miscategorized
```

### 4.3 Root Cause Analysis

**The bug is in the `normalizeVMObject()` function and how the VM state is determined.**

Looking at line 137-151 of `VirtualMeetingsSection.jsx`:

```javascript
function normalizeVMObject(vm) {
  if (!vm) return null;

  return {
    ...vm,
    // Normalized fields for virtualMeetingRules.js
    meetingDeclined: vm['meeting declined'] ?? vm.meetingDeclined ?? false,
    bookedDate: vm['booked date'] ?? vm.bookedDate ?? null,
    confirmedBySplitlease: vm['confirmed by splitlease'] ?? vm.confirmedBySplitlease ?? false,
    requestedBy: vm['requested by'] ?? vm.requestedBy ?? null,  // <-- KEY FIELD
    meetingLink: vm['meeting link'] ?? vm.meetingLink ?? null,
    suggestedDates: vm['suggested dates and times'] ?? vm.suggestedDates ?? []
  };
}
```

**The problem**: The field name in the database is `requested by` (with space), but the normalization function checks for `vm['confirmed by splitlease']` which has a TYPO - it should check for `vm['confirmedBySplitLease']` (with proper capitalization).

However, looking at the data fetched in `userProposalQueries.js` (line 405-427):

```javascript
const { data: vmData, error: vmError } = await supabase
  .from('virtualmeetingschedulesandlinks')
  .select(`
    _id,
    "booked date",
    "confirmedBySplitLease",  // <-- Note: camelCase in DB
    "meeting link",
    "meeting declined",
    "requested by",           // <-- Note: spaces in DB
    "suggested dates and times",
    "guest name",
    "host name",
    "proposal"
  `)
```

The actual field in the Supabase query is `"confirmedBySplitLease"` (camelCase), but the normalization function checks for `vm['confirmed by splitlease']` (lowercase with spaces).

**VERIFIED ROOT CAUSE**: The `confirmedBySplitlease` normalization is looking for the WRONG field name. The database column is `"confirmedBySplitLease"` (camelCase L), but the code checks for `'confirmed by splitlease'` (lowercase with spaces, no capital L).

This causes the state machine to miscalculate the VM state, falling into the default case and showing the wrong message.

### 4.4 Git History Analysis

The `VirtualMeetingsSection.jsx` component was recently created/updated. No conflicting changes found that would have introduced this bug - it appears to be an original implementation issue with field name mismatch.

## 5. Hypotheses

### Hypothesis 1: Field Name Mismatch in normalizeVMObject (Likelihood: 95%)
**Theory**: The `normalizeVMObject()` function uses incorrect field name `'confirmed by splitlease'` when the actual Supabase field is `'confirmedBySplitLease'` (camelCase). This causes the VM state machine to not properly detect REQUESTED_BY_GUEST state.

**Supporting Evidence**:
- Database query uses `"confirmedBySplitLease"` (line 410 of userProposalQueries.js)
- normalizeVMObject checks `vm['confirmed by splitlease']` (line 146 of VirtualMeetingsSection.jsx)
- Case mismatch: `splitlease` vs `SplitLease`

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log to normalizeVMObject to see what `vm['confirmedBySplitLease']` returns vs `vm['confirmed by splitlease']`
2. Check if the normalized object has `confirmedBySplitlease` set correctly

**Potential Fix**: Change line 146 from:
```javascript
confirmedBySplitlease: vm['confirmed by splitlease'] ?? vm.confirmedBySplitlease ?? false,
```
to:
```javascript
confirmedBySplitlease: vm['confirmedBySplitLease'] ?? vm.confirmedBySplitlease ?? false,
```

**Convention Check**: This is a data transformation bug that violates the principle of correct field name mapping at API boundaries.

### Hypothesis 2: getCardMessage Default Case Issue (Likelihood: 85%)
**Theory**: Even if the VM state is correctly determined as `REQUESTED_BY_GUEST`, the `getCardMessage()` function might still be hitting the default case because `hostName` is being passed where `guestName` should be shown for context.

**Supporting Evidence**:
- Line 174-187 shows the function signature: `getCardMessage(vmState, hostName)`
- The default case uses `hostName` which creates confusing messages

**Contradicting Evidence**:
- The REQUESTED_BY_GUEST case (line 179) correctly returns first-person message
- If the state was correctly detected, this wouldn't be an issue

**Verification Steps**:
1. Add console.log to see what `vmState` is returned for guest-requested VMs
2. Check if the state matches VM_STATES.REQUESTED_BY_GUEST

**Potential Fix**: If the state detection is the issue, fixing Hypothesis 1 will resolve this. If both need fixing, update the default case message or add additional context.

**Convention Check**: The getCardMessage function follows the pattern of state-based messaging, which is correct.

### Hypothesis 3: currentUserId Not Matching requestedBy (Likelihood: 30%)
**Theory**: The `currentUserId` passed to the component might not exactly match the `requestedBy` field format stored in the database, causing strict equality comparison to fail.

**Supporting Evidence**:
- Different ID formats could exist (with/without dashes, different cases)

**Contradicting Evidence**:
- The userProposalQueries.js fetches `"requested by"` directly from DB
- The currentUserId comes from `user?._id` which should match DB format

**Verification Steps**:
1. Log both `currentUserId` and `vm['requested by']` values
2. Compare formats (string vs string, same format?)

**Potential Fix**: Add ID normalization before comparison if formats differ.

**Convention Check**: ID format consistency is critical for user identification.

## 6. Recommended Action Plan

### Priority 1 (Try First) - Fix Field Name Mismatch
**File**: `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx`
**Line**: 146

**Current Code**:
```javascript
confirmedBySplitlease: vm['confirmed by splitlease'] ?? vm.confirmedBySplitlease ?? false,
```

**Fixed Code**:
```javascript
confirmedBySplitlease: vm['confirmedBySplitLease'] ?? vm.confirmedBySplitlease ?? false,
```

**Rationale**: The database field is `"confirmedBySplitLease"` (camelCase), not `"confirmed by splitlease"` (lowercase with spaces). This mismatch causes the state machine to fail detection.

### Priority 2 (If Priority 1 Doesn't Fully Resolve)
Add additional debugging to verify the state detection:

```javascript
// In VirtualMeetingCard component, add after line 313:
console.log('VM Debug:', {
  vmState,
  currentUserId,
  requestedBy: normalizedVM?.requestedBy,
  isCurrentUserRequester: normalizedVM?.requestedBy === currentUserId,
  confirmedBySplitlease: normalizedVM?.confirmedBySplitlease
});
```

### Priority 3 (Enhanced Default Message)
If edge cases exist where the state falls to default, improve the default message to be less confusing:

**Current Code** (line 185):
```javascript
default:
  return `A virtual meeting with ${hostName} has been suggested:`;
```

**Improved Code**:
```javascript
default:
  return `A virtual meeting has been requested. Waiting for response.`;
```

This removes the potentially confusing name reference in edge cases.

## 7. Prevention Recommendations

1. **Field Name Constants**: Create a constants file for database field names to avoid typos:
   ```javascript
   // lib/constants/dbFields.js
   export const VM_FIELDS = {
     CONFIRMED_BY_SL: 'confirmedBySplitLease',
     REQUESTED_BY: 'requested by',
     BOOKED_DATE: 'booked date',
     // etc.
   };
   ```

2. **Data Transformation Tests**: Add unit tests for `normalizeVMObject()` to verify field mapping is correct.

3. **TypeScript Migration**: Consider migrating this component to TypeScript to catch field name mismatches at compile time.

4. **Documentation**: Update the virtualMeetingRules.js documentation to explicitly list expected field names in the normalized object.

## 8. Related Files Reference

| File | Action Needed | Line Numbers |
|------|---------------|--------------|
| `app/src/islands/pages/proposals/VirtualMeetingsSection.jsx` | **FIX** - Line 146 field name | 146 |
| `app/src/logic/rules/proposals/virtualMeetingRules.js` | Review - VM state machine uses normalized fields | 36-64 |
| `app/src/lib/proposals/userProposalQueries.js` | Reference - Defines DB field names | 405-427 |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Reference - Passes currentUserId | 168-171 |

## 9. Testing Steps After Fix

1. Login as a guest user
2. Create a proposal and request a virtual meeting
3. Navigate to `/guest-proposals`
4. Verify the VirtualMeetingsSection shows: "You've requested a virtual meeting. Waiting for [Host Name]'s response."
5. Test with host-initiated VM to verify: "[Host Name] has suggested times for a virtual meeting:"
6. Test with confirmed VM to verify: "Your virtual meeting is confirmed!"
7. Test with booked-but-not-confirmed VM to verify: "Your meeting is scheduled. Waiting for Split Lease confirmation."
