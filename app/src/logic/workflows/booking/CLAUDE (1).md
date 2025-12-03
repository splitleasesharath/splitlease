# Booking Workflows Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Booking lifecycle orchestration for proposal acceptance and cancellation
[LAYER]: Layer 4 - Workflows (coordinate rules, API calls, state updates)
[PATTERN]: Validate with rules, execute with Supabase, return structured results

---

## ### WORKFLOW_CONTRACTS ###

### acceptProposalWorkflow
[PATH]: ./acceptProposalWorkflow.js
[INTENT]: Accept a host's counteroffer proposal
[SIGNATURE]: ({ supabase: SupabaseClient, proposal: ProcessedProposal, canAcceptProposal: function }) => Promise<AcceptResult>
[INPUT]:
  - supabase: SupabaseClient (req) - Supabase client instance
  - proposal: ProcessedProposal (req) - Processed proposal with id and status
  - canAcceptProposal: function (req) - Rule function to check acceptance eligibility
[OUTPUT]: { success: boolean, message: string, updated: boolean, error?: Error }
[THROWS]:
  - Error when supabase client is missing
  - Error when proposal or proposal.id is missing
  - Error when canAcceptProposal function is missing
[WORKFLOW_STEPS]:
  1. Validate inputs
  2. Check canAcceptProposal rule
  3. If not allowed → return { success: false, message: 'reason' }
  4. Update proposal status to "Accepted" via Supabase
  5. Return success/failure result
[ASYNC]: Yes
[EXAMPLE]:
  ```javascript
  const result = await acceptProposalWorkflow({
    supabase,
    proposal: processedProposal,
    canAcceptProposal
  })
  // => { success: true, message: 'Proposal accepted successfully!', updated: true }
  ```
[DEPENDS_ON]: rules/proposals/canAcceptProposal

---

### cancelProposalWorkflow
[PATH]: ./cancelProposalWorkflow.js
[INTENT]: Cancel proposal with validation and reason logging
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>
[INPUT]:
  - proposalId: string (req) - Proposal ID
  - reason: string (req) - Cancellation reason
[OUTPUT]: { success: boolean, message: string, updated: boolean }
[WORKFLOW_STEPS]:
  1. Validate proposal ID
  2. Check canCancelProposal rule
  3. Update status to "Cancelled"
  4. Log cancellation reason
  5. Return result
[ASYNC]: Yes
[DEPENDS_ON]: rules/proposals/canCancelProposal

---

### loadProposalDetailsWorkflow
[PATH]: ./loadProposalDetailsWorkflow.js
[INTENT]: Load and transform complete proposal data with related entities
[SIGNATURE]: (proposalId: string) => Promise<ProcessedProposal>
[INPUT]:
  - proposalId: string (req) - Proposal ID
[OUTPUT]: Fully processed proposal with listing and host info
[WORKFLOW_STEPS]:
  1. Fetch proposal from Supabase
  2. Fetch related listing
  3. Fetch related host
  4. Transform all data using processors
  5. Return enriched proposal
[ASYNC]: Yes
[DEPENDS_ON]: processors/proposal/processProposalData

---

## ### RESULT_SHAPES ###

### AcceptResult
```javascript
{
  success: boolean,
  message: string,      // Human-readable status
  updated: boolean,     // Whether DB was updated
  error?: Error         // Present only on failure
}
```

### CancelResult
```javascript
{
  success: boolean,
  message: string,
  updated: boolean,
  refundAmount?: number // If applicable
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always pass Supabase client as param (don't import globally)
[RULE_2]: Pass rule functions as params for testability
[RULE_3]: Never throw on rule violations - return { success: false }
[RULE_4]: Always include human-readable message in result

---

## ### COMMON_PATTERNS ###

### Accept Counteroffer Button
```javascript
import { acceptProposalWorkflow } from 'logic/workflows/booking/acceptProposalWorkflow'
import { canAcceptProposal } from 'logic/rules/proposals/canAcceptProposal'
import { supabase } from 'lib/supabase'

async function handleAccept(proposal) {
  const result = await acceptProposalWorkflow({
    supabase,
    proposal,
    canAcceptProposal
  })

  if (result.success) {
    showToast(result.message)
    refreshProposals()
  } else {
    showError(result.message)
  }
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: rules/proposals/canAcceptProposal, rules/proposals/canCancelProposal
[EXTERNAL]: lib/supabase
[EXPORTS]: acceptProposalWorkflow, cancelProposalWorkflow, loadProposalDetailsWorkflow

---

## ### SHARED_CONVENTIONS ###

[NO_THROW_ON_RULES]: Rule violations return { success: false }
[THROW_ON_VALIDATION]: Missing required params throw
[RESULT_SHAPE]: Always { success, message, updated }

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 3
