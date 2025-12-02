# Proposal Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Specialized components for proposal display and management
[PATTERN]: Presentational components for GuestProposalsPage
[CONTEXT]: Used within guest dashboard for viewing and managing booking proposals

---

## ### FILE_INVENTORY ###

### EmptyState.jsx
[INTENT]: Display when guest has no proposals with CTA to browse listings
[IMPORTS]: react, shared/Button
[PROPS]: onBrowseListings

### ErrorState.jsx
[INTENT]: Display error message when proposal loading fails with retry option
[IMPORTS]: react, shared/Button
[PROPS]: error, onRetry

### LoadingState.jsx
[INTENT]: Loading skeleton UI while proposals are being fetched
[IMPORTS]: react
[PROPS]: none

### ProgressTracker.jsx
[INTENT]: Visual progress indicator showing proposal stage (1-5) with step labels
[IMPORTS]: react
[DEPENDENCIES]: logic/rules/proposals/determineProposalStage
[PROPS]: currentStage, totalStages

### ProposalCard.jsx
[INTENT]: Individual proposal card displaying listing thumbnail, dates, price, and status
[IMPORTS]: react, shared/PriceDisplay
[PROPS]: proposal, onViewDetails, onCancel

### ProposalSelector.jsx
[INTENT]: Dropdown/list for selecting between multiple active proposals
[IMPORTS]: react
[DEPENDENCIES]: logic/rules/proposals/determineProposalStage
[PROPS]: proposals, selectedId, onSelect

### VirtualMeetingsSection.jsx
[INTENT]: Display scheduled virtual meetings with join button and calendar links
[IMPORTS]: react
[PROPS]: meetings, onJoinMeeting

---

## ### USAGE_CONTEXT ###

[PARENT_PAGE]: GuestProposalsPage
[DATA_SOURCE]: useGuestProposalsPageLogic hook
[PATTERN]: Stateless components receiving processed data from parent

---

## ### PROPOSAL_STAGES ###

[STAGE_1]: Submitted
[STAGE_2]: Host Approved
[STAGE_3]: Payment Pending
[STAGE_4]: Confirmed
[STAGE_5]: Completed

---

**FILE_COUNT**: 7
**EXPORTS_COUNT**: 7
