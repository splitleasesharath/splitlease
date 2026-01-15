# Fix Split Lease Suggested Proposal Status Flow

**Created**: 2026-01-15 14:35:00
**Type**: FEATURE / REFACTOR
**Priority**: High
**Ready for Execution**: Yes

---

## Problem Statement

Currently, there are **two statuses** for proposals created by Split Lease:

| ID | Key | Display |
|----|-----|---------|
| 1 | `sl_submitted_awaiting_rental_app` | Proposal Submitted for guest by Split Lease - Awaiting Rental Application |
| 3 | `sl_submitted_pending_confirmation` | Proposal Submitted for guest by Split Lease - Pending Confirmation |

The current flow forces a linear path where rental application state determines which status to use at creation time. This is inflexible.

---

## Solution

**Keep BOTH statuses** but give them clear, distinct meanings:

| Status ID | New Meaning | When Used |
|-----------|-------------|-----------|
| **3** (Pending Confirmation) | Initial state - guest hasn't confirmed yet | SL creates proposal → starts here |
| **1** (Awaiting Rental App) | Guest confirmed but rental app not submitted | Guest clicks "Confirm" without rental app |

**Key UX Change**: Always show "Confirm Proposal" as primary CTA, regardless of rental app status. Show "Submit Rental App" as secondary CTA only if rental app is not yet submitted.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SL creates suggested proposal                                  │
│  Status: "SL - Pending Confirmation" (ID: 3)                    │
│                                                                 │
│  UI shows: [Confirm Proposal] + [Submit Rental App]*            │
│           *only if rental app not submitted                     │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         │ Guest clicks                 │ Guest submits
         │ "Confirm Proposal"           │ rental app FIRST
         ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│  Check: Is rental app   │    │  Status STAYS:          │
│  submitted?             │    │  "SL - Pending          │
│                         │    │   Confirmation" (ID: 3) │
│  NO → Status changes to:│    │                         │
│  "SL - Awaiting Rental  │    │  UI now shows ONLY:     │
│   Application" (ID: 1)  │    │  [Confirm Proposal]     │
│                         │    │                         │
│  YES → Status changes   │    │                         │
│  to: "Host Review"      │    │                         │
└─────────────────────────┘    └─────────────────────────┘
         │                              │
         │ Guest submits rental app     │ Guest clicks "Confirm"
         ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Status: "Host Review" (ID: 4)                                  │
│  Both conditions met: confirmed ✓ + rental app submitted ✓     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Asymmetric state machine**: Confirming first changes status, submitting rental app first does NOT change status
2. **Rental app tracked separately**: The `rentalapplication.submitted` boolean is the source of truth for rental app state
3. **Status tracks proposal workflow**: Status only changes based on proposal actions (confirm), not rental app actions

---

## Database Schema (Already Exists - No Migration Needed)

```sql
-- proposal table has:
"rental application" TEXT  -- FK to rentalapplication._id
"rental app requested" BOOLEAN

-- rentalapplication table has:
"submitted" BOOLEAN  -- THE KEY FIELD
"percentage % done" INTEGER  -- Progress indicator
```

---

## Implementation Steps

### Step 1: Update Frontend Queries to Join Rental Application Data

**File**: `app/src/lib/proposals/userProposalQueries.js`

**Location**: After line 388 (after fetching guests), add a new step to fetch rental application data.

**Add this code block** (insert after the guests fetch section, before Step 6 which fetches virtual meetings):

```javascript
// Step 5.6: Fetch rental application submitted status for proposals
const rentalAppIds = [...new Set(
  validProposals
    .map(p => p['rental application'])
    .filter(Boolean)
)];

console.log(`fetchProposalsByIds: Fetching ${rentalAppIds.length} rental applications`);

let rentalApps = [];
if (rentalAppIds.length > 0) {
  const { data: rentalAppsData, error: rentalAppError } = await supabase
    .from('rentalapplication')
    .select('_id, submitted, "percentage % done"')
    .in('_id', rentalAppIds);

  if (rentalAppError) {
    console.error('fetchProposalsByIds: Error fetching rental applications:', rentalAppError);
  } else {
    rentalApps = rentalAppsData || [];
    console.log(`fetchProposalsByIds: Fetched ${rentalApps.length} rental applications`);
  }
}

// Create rental application lookup map
const rentalAppMap = new Map(rentalApps.map(ra => [ra._id, ra]));
```

**Then update the enrichment step** (around line 442-489) to include rental application data:

In the `enrichedProposals` mapping, add this line after `virtualMeeting`:

```javascript
// Lookup rental application
const rentalApplication = rentalAppMap.get(proposal['rental application']) || null;
```

And add `rentalApplication` to the return object:

```javascript
return {
  ...proposal,
  listing: listing ? { /* existing code */ } : null,
  guest: guest || null,
  virtualMeeting,
  rentalApplication,  // ADD THIS LINE
  houseRules: houseRulesResolved
};
```

---

### Step 2: Update Proposal Rules

**File**: `app/src/logic/rules/proposals/proposalRules.js`

**Add these new functions at the end of the file** (after line 318):

```javascript
/**
 * Check if proposal needs rental application submission
 * Used to determine if "Submit Rental App" CTA should be shown
 *
 * @param {Object} proposal - Proposal with rentalApplication data joined
 * @returns {boolean} True if rental app is missing or not submitted
 */
export function needsRentalApplicationSubmission(proposal) {
  if (!proposal) return false;

  // No rental application linked at all
  if (!proposal['rental application'] && !proposal.rentalApplication) {
    return true;
  }

  // Has rental application reference but no data joined (shouldn't happen, but handle it)
  if (proposal['rental application'] && !proposal.rentalApplication) {
    return true;
  }

  // Has rental application but not submitted
  if (proposal.rentalApplication && !proposal.rentalApplication.submitted) {
    return true;
  }

  return false;
}

/**
 * Check if this is a Split Lease suggested proposal
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if suggested by Split Lease
 */
export function isSLSuggestedProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  return status?.includes('Submitted for guest by Split Lease');
}

/**
 * Check if guest can confirm a Split Lease suggested proposal
 * Guest can confirm if in "Pending Confirmation" status
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if can confirm
 */
export function canConfirmSuggestedProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;

  // Can confirm if in "Pending Confirmation" status
  return status === PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key;
}

/**
 * Determine next status when guest confirms an SL-suggested proposal
 * @param {Object} proposal - Proposal with rentalApplication data
 * @returns {string} Next status key
 */
export function getNextStatusAfterConfirmation(proposal) {
  if (needsRentalApplicationSubmission(proposal)) {
    // Guest confirmed but rental app not done → intermediate status
    return PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key;
  }
  // Rental app already done → go straight to Host Review
  return PROPOSAL_STATUSES.HOST_REVIEW.key;
}
```

**Also update the exports** in `app/src/logic/index.js` to include these new functions.

---

### Step 3: Update Status Constants

**File**: `app/src/logic/constants/proposalStatuses.js`

**Modify lines 59-79** to add the `guestConfirmed` flag:

```javascript
// Suggested proposal by Split Lease agent - awaiting rental application (sort_order 0)
// NEW MEANING: Guest has CONFIRMED but rental app not yet submitted
SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP: {
  key: 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  color: 'purple',
  label: 'Suggested Proposal - Awaiting Rental App',
  stage: 1,
  usualOrder: 0,
  isSuggestedBySL: true,
  guestConfirmed: true,  // NEW: Guest has confirmed the suggestion
  actions: ['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message']
},

// Suggested proposal by Split Lease agent - pending confirmation (sort_order 0)
// NEW MEANING: Initial state - guest hasn't confirmed yet
SUGGESTED_PROPOSAL_PENDING_CONFIRMATION: {
  key: 'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  color: 'purple',
  label: 'Suggested Proposal - Pending Confirmation',
  stage: 1,
  usualOrder: 0,
  isSuggestedBySL: true,
  guestConfirmed: false,  // NEW: Guest has NOT confirmed yet
  actions: ['confirm_proposal', 'submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message']
},
```

---

### Step 4: Update UI Button Config

**File**: `app/src/lib/proposals/statusButtonConfig.js`

**First, add import** at the top (around line 17):

```javascript
import { PROPOSAL_STATUSES, getStatusConfig } from '../constants/proposalStatuses.js';
```

**Replace lines 362-366** (the current SL-suggested handling) with this expanded logic:

```javascript
} else if (isSLSuggested) {
  // SL-suggested proposals: Dynamic button logic based on confirmation state
  const statusConfig = getStatusConfig(status);

  if (statusConfig?.guestConfirmed) {
    // Already confirmed, just waiting for rental app
    // Primary action: Submit Rental Application
    // Cancel button: "Reject Proposal" (already set above)
    // guestAction1 should show "Submit Rental App" from database config
  } else {
    // Not yet confirmed - need to handle both CTAs
    // Primary: "Confirm Proposal"
    // Secondary: "Submit Rental App" (only if rental app not submitted)

    // Override guestAction1 to show "Confirm Proposal" as primary
    guestAction1.visible = true;
    guestAction1.label = 'Confirm Proposal';
    guestAction1.action = 'confirm_proposal';

    // guestAction2: Show "Submit Rental App" only if needed
    // This requires the proposal to have rentalApplication data joined
    // The actual check happens in the component that calls this function
    // We'll set up the structure here, visibility determined by caller
    guestAction2.visible = true;
    guestAction2.label = 'Submit Rental Application';
    guestAction2.action = 'submit_rental_app';
  }

  // Cancel button for SL-suggested: "Reject Proposal"
  cancelButton.visible = true;
  cancelButton.label = 'Reject Proposal';
  cancelButton.action = 'reject_proposal';
}
```

**Add a new function** to check rental app status (add after line 176):

```javascript
/**
 * Check if proposal needs rental application submission
 * Used to determine if "Submit Rental App" button should show
 *
 * @param {Object} proposal - Proposal with rentalApplication data joined
 * @returns {boolean} True if rental app is missing or not submitted
 */
export function needsRentalAppFromConfig(proposal) {
  if (!proposal) return true;

  // No rental application linked
  if (!proposal['rental application'] && !proposal.rentalApplication) {
    return true;
  }

  // Has rental application but not submitted
  if (proposal.rentalApplication && !proposal.rentalApplication.submitted) {
    return true;
  }

  return false;
}
```

---

### Step 5: Update CreateSuggestedProposalPage Default Status

**File**: `app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js`

**Change line 28** from:

```javascript
const DEFAULT_STATUS = PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key;
```

**To**:

```javascript
const DEFAULT_STATUS = PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key;
```

**Also remove or simplify the status dropdown** if there's UI for selecting between the two statuses (search for `proposalStatus` state usage and simplify).

---

### Step 6: Update Confirm Action Handler

**File**: Find the guest proposals page that handles the "Confirm Proposal" action.

**Search for**: `confirm_proposal` action handler in:
- `app/src/islands/pages/useGuestProposalsPageLogic.js`
- Or the component that handles proposal card actions

**Add/update the confirm handler**:

```javascript
import { getNextStatusAfterConfirmation } from '../../logic/rules/proposals/proposalRules.js';

// In the action handler:
case 'confirm_proposal':
  const nextStatus = getNextStatusAfterConfirmation(proposal);

  // Update proposal status via API/Supabase
  const { error } = await supabase
    .from('proposal')
    .update({ Status: nextStatus })
    .eq('_id', proposal._id);

  if (!error) {
    if (nextStatus === PROPOSAL_STATUSES.HOST_REVIEW.key) {
      // Both confirmed + rental app done
      showSuccessToast('Proposal confirmed and sent to host for review!');
    } else {
      // Confirmed but rental app pending
      showInfoToast('Proposal confirmed! Please complete your rental application to proceed.');
    }
    // Refresh proposal data
    await refetchProposals();
  }
  break;
```

---

### Step 7: Handle Rental App Submission from "Awaiting" Status

When a guest submits their rental application while in the "Awaiting Rental App" status, the status should transition to "Host Review".

**File**: Find the rental application submission handler (likely in `RentalApplicationWizardModal` or similar)

**Add logic after successful rental app submission**:

```javascript
// After rental application is successfully submitted...
// Check if any proposals are in "Awaiting Rental App" status
const { data: awaitingProposals } = await supabase
  .from('proposal')
  .select('_id, Status')
  .eq('Guest', userId)
  .eq('Status', PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key);

// Transition them to Host Review
if (awaitingProposals?.length > 0) {
  await supabase
    .from('proposal')
    .update({ Status: PROPOSAL_STATUSES.HOST_REVIEW.key })
    .in('_id', awaitingProposals.map(p => p._id));

  console.log(`Transitioned ${awaitingProposals.length} proposals to Host Review after rental app submission`);
}
```

---

## Files to Modify (Summary)

| File | Change | Lines |
|------|--------|-------|
| [app/src/lib/proposals/userProposalQueries.js](app/src/lib/proposals/userProposalQueries.js) | Add rental application join | After ~388 |
| [app/src/logic/rules/proposals/proposalRules.js](app/src/logic/rules/proposals/proposalRules.js) | Add 4 new rule functions | After 318 |
| [app/src/logic/constants/proposalStatuses.js](app/src/logic/constants/proposalStatuses.js) | Add `guestConfirmed` flag | 59-79 |
| [app/src/lib/proposals/statusButtonConfig.js](app/src/lib/proposals/statusButtonConfig.js) | Update SL button logic | 362-366 |
| [app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js](app/src/islands/pages/CreateSuggestedProposalPage/useCreateSuggestedProposalLogic.js) | Change default status | 28 |
| Guest proposals page | Add confirm handler logic | TBD |
| Rental app wizard | Add status transition on submit | TBD |
| [app/src/logic/index.js](app/src/logic/index.js) | Export new rule functions | TBD |

---

## Backward Compatibility

- Both SL statuses continue to work
- Existing proposals in "Awaiting Rental App" status will show rental app CTA (as before)
- No data migration required
- Old proposals created with "Awaiting Rental App" as initial status will continue functioning

---

## Testing Checklist

- [ ] SL agent creates proposal → Status = "Pending Confirmation"
- [ ] Guest views proposal → Sees [Confirm Proposal] + [Submit Rental App] CTAs
- [ ] Guest with rental app already submitted → Sees only [Confirm Proposal]
- [ ] Guest clicks Confirm (no rental app) → Status = "Awaiting Rental App"
- [ ] Guest clicks Confirm (with rental app) → Status = "Host Review"
- [ ] Guest in "Awaiting Rental App" status → Sees [Submit Rental App] only
- [ ] Guest submits rental app from "Awaiting Rental App" → Status = "Host Review"
- [ ] Old proposals in "Awaiting Rental App" status still display correctly

---

## Execution Command

To implement this plan in another session, use:

```
Implement the plan at .claude/plans/New/20260115143500-consolidate-sl-proposal-status.md
```
