# Proposal Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for proposal state management and action eligibility
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions evaluate proposal state to determine allowed actions

---

## ### FILE_INVENTORY ###

### canAcceptProposal.js
[INTENT]: Determine if guest can accept proposal based on current status and payment readiness
[EXPORTS]: canAcceptProposal
[IMPORTS]: ./proposalRules
[SIGNATURE]: (proposal: object) => boolean
[RETURNS]: true if proposal can be accepted

### canCancelProposal.js
[INTENT]: Determine if proposal can be cancelled based on status and cancellation policy
[EXPORTS]: canCancelProposal
[IMPORTS]: ./proposalRules
[SIGNATURE]: (proposal: object) => boolean
[RETURNS]: true if cancellation is allowed

### canEditProposal.js
[INTENT]: Determine if proposal can be modified based on status (only SUBMITTED allows edits)
[EXPORTS]: canEditProposal
[IMPORTS]: ./proposalRules
[SIGNATURE]: (proposal: object) => boolean
[RETURNS]: true if proposal is editable

### determineProposalStage.js
[INTENT]: Calculate current proposal stage (1-5) from status code for progress display
[EXPORTS]: determineProposalStage
[IMPORTS]: lib/constants/proposalStages
[SIGNATURE]: (status: string) => number
[RETURNS]: Stage number 1-5

### proposalRules.js
[INTENT]: Consolidated proposal business rules module containing all proposal-related predicates
[EXPORTS]: canAcceptProposal, canCancelProposal, canEditProposal, canCounteroffer, isTerminalStatus
[IMPORTS]: lib/constants/proposalStatuses
[NOTE]: Master file importing from others for convenience

### virtualMeetingRules.js
[INTENT]: Virtual meeting availability rules determining if/when virtual tour can be scheduled
[EXPORTS]: canScheduleVirtualMeeting, isWithinMeetingWindow
[SIGNATURE]: (proposal: object, hostAvailability: object) => boolean

---

## ### PROPOSAL_STAGES ###

[STAGE_1]: SUBMITTED - Guest submitted, awaiting host response
[STAGE_2]: HOST_APPROVED - Host approved, awaiting guest payment
[STAGE_3]: PAYMENT_PENDING - Payment initiated
[STAGE_4]: CONFIRMED - Booking confirmed
[STAGE_5]: COMPLETED - Stay completed

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { canAcceptProposal } from 'logic/rules/proposals/canAcceptProposal'
[CONSUMED_BY]: GuestProposalsPage, ProposalDetailsModal, booking workflows
[PATTERN]: if (canAcceptProposal(proposal)) showAcceptButton()

---

**FILE_COUNT**: 6
**EXPORTS_COUNT**: 10+
