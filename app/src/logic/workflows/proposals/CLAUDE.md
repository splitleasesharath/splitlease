# Proposals Workflows - Logic Layer 4

**GENERATED**: 2025-11-26
**LAYER**: Workflows (Orchestration)
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Proposal-specific workflows for counteroffers, navigation, and virtual meetings
[LAYER]: Layer 4 - Workflows (orchestrate complex proposal operations)
[PATTERN]: Handle proposal modifications and scheduling coordination

---

## ### FILE_INVENTORY ###

### cancelProposalWorkflow.js
[INTENT]: Proposal cancellation with guest notification and refund processing
[EXPORTS]: cancelProposalWorkflow
[IMPORTS]: ../../rules/proposals/canCancelProposal, lib/bubbleAPI
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>
[ASYNC]: Yes
[NOTE]: May overlap with booking/cancelProposalWorkflow

### counterofferWorkflow.js
[INTENT]: Create counteroffer with modified terms and host notification
[EXPORTS]: counterofferWorkflow
[IMPORTS]: ../../rules/proposals/canCounteroffer, lib/bubbleAPI, ../../processors/external/adaptDaysToBubble
[SIGNATURE]: (proposalId: string, newTerms: object) => Promise<CounterResult>
[ASYNC]: Yes

### navigationWorkflow.js
[INTENT]: Determine which view/modal to show based on proposal state
[EXPORTS]: navigationWorkflow
[IMPORTS]: ../../rules/proposals/determineProposalStage
[SIGNATURE]: (proposal: object) => NavigationState
[ASYNC]: No

### virtualMeetingWorkflow.js
[INTENT]: Schedule virtual property tours with calendar integration
[EXPORTS]: virtualMeetingWorkflow
[IMPORTS]: ../../rules/proposals/virtualMeetingRules, lib/supabase
[DEPENDENCIES]: Supabase table: virtualmeetingschedulesandlinks
[SIGNATURE]: (proposalId: string, meetingDetails: object) => Promise<MeetingResult>
[ASYNC]: Yes

---

## ### WORKFLOW_SEQUENCES ###

### counterofferWorkflow
```
1. Validate canCounteroffer rule
2. Convert selectedDays to Bubble format using adaptDaysToBubble
3. Build counteroffer payload
4. Submit to Bubble API
5. Notify host of counteroffer
6. Return new proposal state
```

### virtualMeetingWorkflow
```
1. Check virtualMeetingRules for eligibility
2. Validate meeting time slot availability
3. Create meeting record in Supabase
4. Generate video call link
5. Send notifications to guest and host
6. Return meeting details
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { counterofferWorkflow } from 'logic/workflows/proposals/counterofferWorkflow'
[CONSUMED_BY]: EditProposalModal, CompareTermsModal
[PATTERN]: await counterofferWorkflow(proposalId, modifiedTerms)

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
