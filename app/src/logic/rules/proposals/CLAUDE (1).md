# Proposal Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### LOGIC_CONTRACTS ###

### canCancelProposal
[PATH]: ./canCancelProposal.js
[INTENT]: Determine if guest can cancel their proposal
[SIGNATURE]: ({ proposalStatus: string, deleted?: boolean }) => boolean
[INPUT]:
  - proposalStatus: string (req) - The "Proposal Status" field
  - deleted: boolean (opt) - Whether proposal is soft-deleted, default: false
[OUTPUT]: boolean - true if cancellation allowed
[RULES]:
  - Returns false if deleted
  - Returns false for terminal statuses: 'Cancelled by Guest', 'Cancelled by Host', 'Rejected', 'Expired', 'Completed'
  - Returns true for all active states (Draft, Pending, Host Countered, VM Requested, etc.)
[TRUTH_SOURCE]: Internal `terminalStatuses` array:
  ```
  ['Cancelled by Guest', 'Cancelled by Host', 'Rejected', 'Expired', 'Completed']
  ```
[DEPENDS_ON]: None
[USED_BY]: GuestProposalsPage, CancelProposalModal

### canAcceptProposal
[PATH]: ./canAcceptProposal.js
[INTENT]: Determine if guest can accept (after host counteroffer)
[SIGNATURE]: ({ proposalStatus: string, deleted?: boolean }) => boolean
[INPUT]:
  - proposalStatus: string (req) - The "Proposal Status" field
  - deleted: boolean (opt) - default: false
[OUTPUT]: boolean - true if acceptance allowed
[RULE]: Only returns true when status === 'Host Countered'
[DEPENDS_ON]: None
[USED_BY]: ProposalDetailsModal, Accept button visibility

### canEditProposal
[PATH]: ./canEditProposal.js
[INTENT]: Determine if guest can edit their proposal terms
[SIGNATURE]: ({ proposalStatus: string, deleted?: boolean }) => boolean
[INPUT]:
  - proposalStatus: string (req) - The "Proposal Status" field
  - deleted: boolean (opt) - default: false
[OUTPUT]: boolean - true if editing allowed
[TRUTH_SOURCE]: Internal `editableStatuses` array:
  ```
  ['Draft', 'Pending', 'Host Countered']
  ```
[DEPENDS_ON]: None
[USED_BY]: EditProposalModal, Edit button visibility

### determineProposalStage
[PATH]: ./determineProposalStage.js
[INTENT]: Map proposal status to visual progress tracker stage (1-6)
[SIGNATURE]: ({ proposalStatus: string, deleted?: boolean }) => number
[INPUT]:
  - proposalStatus: string (req) - The "Proposal Status" field
  - deleted: boolean (opt) - default: false
[OUTPUT]: number - Stage 1-6
[THROWS]:
  - Error: "proposalStatus is required and must be a string" - When missing
[TRUTH_SOURCE]: Stage mapping:
  ```
  Stage 1: 'Draft', 'Pending' (Proposal Sent)
  Stage 2: 'Host Countered' (Awaiting guest response)
  Stage 3: 'VM Requested', 'VM Confirmed' (Virtual Meeting)
  Stage 4: 'Accepted', 'Verified' (Confirmed booking)
  Stage 5: 'Completed' (Terminal positive)
  Stage 6: 'Cancelled by Guest', 'Cancelled by Host', 'Rejected', 'Expired', deleted (Terminal negative)
  ```
[DEPENDS_ON]: None
[USED_BY]: ProgressTracker component

### proposalRules.js (Master Module)
[PATH]: ./proposalRules.js
[INTENT]: Consolidated proposal business rules with all predicates
[EXPORTS]:
  - canCancelProposal(proposal) - Uses proposal.status || proposal.Status
  - canModifyProposal(proposal) - Only PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP
  - hasReviewableCounteroffer(proposal) - COUNTEROFFER + counterOfferHappened
  - canAcceptCounteroffer(proposal) - Alias for hasReviewableCounteroffer
  - canDeclineCounteroffer(proposal) - Alias for hasReviewableCounteroffer
  - canSubmitRentalApplication(proposal) - PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP
  - canReviewDocuments(proposal) - Uses getActionsForStatus
  - canRequestVirtualMeeting(proposal) - Non-terminal + has 'request_vm' action
  - canSendMessage(proposal) - Uses getActionsForStatus
  - isProposalActive(proposal) - !isTerminalStatus
  - isProposalCancelled(proposal) - CANCELLED_BY_GUEST or CANCELLED_BY_SPLITLEASE
  - isProposalRejected(proposal) - REJECTED_BY_HOST
  - isLeaseActivated(proposal) - INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED
  - requiresSpecialCancellationConfirmation(proposal) - usualOrder > 5 && houseManual
  - getCancelButtonText(proposal) - 'Cancel Proposal' or 'Decline Counteroffer'
  - getCancellationReasonOptions() - Returns reason array
[DEPENDS_ON]: lib/constants/proposalStatuses.js (PROPOSAL_STATUSES, isTerminalStatus, getActionsForStatus)

### virtualMeetingRules.js
[PATH]: ./virtualMeetingRules.js
[INTENT]: Virtual meeting scheduling eligibility rules
[EXPORTS]: canScheduleVirtualMeeting, isWithinMeetingWindow
[DEPENDS_ON]: lib/constants/proposalStatuses.js

### useProposalButtonStates.js
[PATH]: ./useProposalButtonStates.js
[INTENT]: React hook combining rules for button visibility states
[EXPORTS]: useProposalButtonStates
[PATTERN]: Hook that returns computed button states based on proposal

---

## ### PROPOSAL_STATUS_CONSTANTS ###

[SOURCE]: lib/constants/proposalStatuses.js
[STATUSES]:
  ```
  PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP: Stage 1
  RENTAL_APP_SUBMITTED_AWAITING_HOST_REVIEW: Stage 1
  COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW: Stage 2
  PROPOSAL_APPROVED_BY_HOST: Stage 4
  AWAITING_DOCUMENTS_AND_INITIAL_PAYMENT: Stage 4
  INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED: Stage 5 (terminal)
  REJECTED_BY_HOST: Stage 6 (terminal)
  CANCELLED_BY_GUEST: Stage 6 (terminal)
  CANCELLED_BY_SPLITLEASE: Stage 6 (terminal)
  EXPIRED: Stage 6 (terminal)
  ```

---

## ### CANCELLATION_REASONS ###

[SOURCE]: proposalRules.js getCancellationReasonOptions()
[OPTIONS]:
  ```
  ['Found another property', 'Changed move-in dates', 'Changed budget',
   'Changed location preference', 'No longer need housing', 'Host not responsive',
   'Terms not acceptable', 'Other']
  ```

---

## ### DEPENDENCIES ###

[LOCAL]: ./index.js (barrel export)
[EXTERNAL]: lib/constants/proposalStatuses.js
[EXPORTS]: canCancelProposal, canAcceptProposal, canEditProposal, determineProposalStage, proposalRules (all exports), virtualMeetingRules, useProposalButtonStates

---

## ### USAGE_PATTERN ###

```javascript
// Individual rule imports (recommended)
import { canCancelProposal } from 'logic/rules/proposals/canCancelProposal'
import { determineProposalStage } from 'logic/rules/proposals/determineProposalStage'

// Master module import
import { canCancelProposal, canModifyProposal, isProposalActive } from 'logic/rules/proposals/proposalRules'

// Button visibility pattern
if (canCancelProposal({ proposalStatus })) {
  showCancelButton()
}
```

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Return false for invalid input, throw only for critical errors
[STATUS_FIELD]: Handle both `proposal.status` and `proposal.Status` (Bubble inconsistency)
[LAYER]: Layer 2 - Rules (boolean predicates only)
[NAMING]: can* for permissions, is* for state checks, has* for property checks

---

**FILE_COUNT**: 7
**EXPORTS_COUNT**: 20+
