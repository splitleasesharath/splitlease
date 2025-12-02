# Booking Workflows - Logic Layer 4

**GENERATED**: 2025-11-26
**LAYER**: Workflows (Orchestration)
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Multi-step booking process orchestration for proposal acceptance and cancellation
[LAYER]: Layer 4 - Workflows (orchestrate validation, API calls, state updates)
[PATTERN]: Coordinate booking lifecycle from proposal to confirmation

---

## ### FILE_INVENTORY ###

### acceptProposalWorkflow.js
[INTENT]: Multi-step workflow for accepting proposal including validation, payment initiation, and status update
[EXPORTS]: acceptProposalWorkflow
[IMPORTS]: ../../rules/proposals/canAcceptProposal, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/
[SIGNATURE]: (proposalId: string) => Promise<AcceptResult>
[ASYNC]: Yes

### cancelProposalWorkflow.js
[INTENT]: Workflow for proposal cancellation including policy check, refund calculation, and status update
[EXPORTS]: cancelProposalWorkflow
[IMPORTS]: ../../rules/proposals/canCancelProposal, lib/bubbleAPI
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>
[ASYNC]: Yes

### loadProposalDetailsWorkflow.js
[INTENT]: Load and transform complete proposal data including listing and host info
[EXPORTS]: loadProposalDetailsWorkflow
[IMPORTS]: lib/proposalDataFetcher, ../../processors/proposal/processProposalData
[SIGNATURE]: (proposalId: string) => Promise<ProcessedProposal>
[ASYNC]: Yes

---

## ### WORKFLOW_SEQUENCES ###

### acceptProposalWorkflow
```
1. Validate proposal ID
2. Check canAcceptProposal rule
3. If cannot accept → throw error with reason
4. Call Bubble API to accept proposal
5. Initiate payment flow
6. Return success result
```

### cancelProposalWorkflow
```
1. Validate proposal ID
2. Check canCancelProposal rule
3. If cannot cancel → throw error with reason
4. Calculate refund amount based on policy
5. Call Bubble API to cancel
6. Return cancellation result with refund info
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { acceptProposalWorkflow } from 'logic/workflows/booking/acceptProposalWorkflow'
[CONSUMED_BY]: ProposalDetailsModal, GuestProposalsPage
[PATTERN]: await acceptProposalWorkflow(proposalId); showSuccessToast()

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
