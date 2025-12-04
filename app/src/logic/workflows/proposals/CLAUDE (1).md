# Proposals Workflows Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Counteroffer, cancellation, and virtual meeting orchestration
[LAYER]: Layer 4 - Workflows (handle proposal modifications and comparisons)
[PATTERN]: Coordinate counteroffer logic, status updates, and meeting scheduling

---

## ### WORKFLOW_CONTRACTS ###

### acceptCounteroffer
[PATH]: ./counterofferWorkflow.js
[INTENT]: Accept host's counteroffer and prepare for lease creation
[SIGNATURE]: (proposalId: string) => Promise<ProposalData>
[INPUT]:
  - proposalId: string (req) - Proposal ID
[OUTPUT]: Updated proposal data from Supabase
[THROWS]:
  - Error when proposalId is missing
  - Error when proposal has no counteroffer to accept
  - Error on Supabase update failure
[WORKFLOW_STEPS]:
  1. Fetch proposal from Supabase
  2. Validate 'counter offer happened' is true
  3. Update status to "Proposal or Counteroffer Accepted / Drafting Lease Documents"
  4. Set 'Is Finalized' to true
  5. Return updated proposal
[STATUS_TRANSITION]: "Host Countered" → "Proposal or Counteroffer Accepted / Drafting Lease Documents"
[ASYNC]: Yes
[DEPENDS_ON]: lib/supabase

---

### declineCounteroffer
[PATH]: ./counterofferWorkflow.js
[INTENT]: Decline counteroffer (equivalent to cancellation)
[SIGNATURE]: (proposalId: string, reason?: string) => Promise<ProposalData>
[INPUT]:
  - proposalId: string (req) - Proposal ID
  - reason: string (opt) - Decline reason (default: 'Counteroffer declined by guest')
[OUTPUT]: Updated proposal data
[THROWS]: Error when proposalId missing or update fails
[WORKFLOW_STEPS]:
  1. Validate proposalId
  2. Update status to "Proposal Cancelled by Guest"
  3. Set 'Deleted' to true
  4. Log reason for cancellation
  5. Return updated proposal
[STATUS_TRANSITION]: "Host Countered" → "Proposal Cancelled by Guest"
[ASYNC]: Yes

---

### getTermsComparison
[PATH]: ./counterofferWorkflow.js
[INTENT]: Compare original terms vs counteroffer terms
[SIGNATURE]: (proposal: object) => TermsComparison
[INPUT]:
  - proposal: object (req) - Proposal object (raw or processed)
[OUTPUT]: { originalTerms, counterofferTerms, changes: Change[], hasChanges: boolean }
[THROWS]: Error when proposal is missing
[SYNC]: Yes (pure function)
[COMPARED_FIELDS]:
  - daysSelected / hcDaysSelected
  - nightsPerWeek / hcNightsPerWeek
  - reservationWeeks / hcReservationWeeks
  - checkInDay / hcCheckInDay
  - checkOutDay / hcCheckOutDay
  - totalPrice / hcTotalPrice
  - nightlyPrice / hcNightlyPrice
  - damageDeposit / hcDamageDeposit
  - cleaningFee / hcCleaningFee
[EXAMPLE]:
  ```javascript
  const comparison = getTermsComparison(proposal)
  // => {
  //   originalTerms: { totalPrice: 1000, ... },
  //   counterofferTerms: { totalPrice: 900, ... },
  //   changes: [{ field: 'totalPrice', label: 'Total Price', original: 1000, modified: 900 }],
  //   hasChanges: true
  // }
  ```

---

### cancelProposalWorkflow
[PATH]: ./cancelProposalWorkflow.js
[INTENT]: Cancel proposal with guest notification
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>
[NOTE]: May overlap with booking/cancelProposalWorkflow
[ASYNC]: Yes

---

### virtualMeetingWorkflow
[PATH]: ./virtualMeetingWorkflow.js
[INTENT]: Schedule virtual property tour
[SIGNATURE]: (proposalId: string, meetingDetails: object) => Promise<MeetingResult>
[TABLE]: virtualmeetingschedulesandlinks
[ASYNC]: Yes

---

### navigationWorkflow
[PATH]: ./navigationWorkflow.js
[INTENT]: Determine view/modal based on proposal state
[SIGNATURE]: (proposal: object) => NavigationState
[ASYNC]: No (synchronous decision tree)

---

## ### TERMS_COMPARISON_CHANGE_SHAPE ###

```javascript
{
  field: string,      // Field key (e.g., 'totalPrice')
  label: string,      // Display label (e.g., 'Total Price')
  original: any,      // Original value
  modified: any       // Counteroffer value
}
```

---

## ### STATUS_TRANSITIONS ###

| Action | From Status | To Status |
|--------|-------------|-----------|
| Accept Counteroffer | Host Countered | Proposal or Counteroffer Accepted / Drafting Lease Documents |
| Decline Counteroffer | Host Countered | Proposal Cancelled by Guest |
| Cancel Proposal | Any (except terminal) | Proposal Cancelled by Guest |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always verify 'counter offer happened' before accepting
[RULE_2]: Use getTermsComparison for Compare Terms modal
[RULE_3]: Log cancellation reasons for analytics
[RULE_4]: Check hasChanges before showing comparison UI

---

## ### COMMON_PATTERNS ###

### Compare Terms Modal
```javascript
import { getTermsComparison } from 'logic/workflows/proposals/counterofferWorkflow'

function CompareTermsModal({ proposal }) {
  const { originalTerms, counterofferTerms, changes, hasChanges } = getTermsComparison(proposal)

  if (!hasChanges) return <div>No changes in counteroffer</div>

  return (
    <table>
      {changes.map(change => (
        <tr key={change.field}>
          <td>{change.label}</td>
          <td className="original">{formatValue(change.original)}</td>
          <td className="modified">{formatValue(change.modified)}</td>
        </tr>
      ))}
    </table>
  )
}
```

### Accept Counteroffer
```javascript
import { acceptCounteroffer } from 'logic/workflows/proposals/counterofferWorkflow'

async function handleAcceptCounteroffer(proposalId) {
  try {
    const updated = await acceptCounteroffer(proposalId)
    showSuccess('Counteroffer accepted! Preparing lease documents...')
    refreshProposals()
  } catch (err) {
    showError(err.message)
  }
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: rules/proposals/hasReviewableCounteroffer
[EXTERNAL]: lib/supabase
[EXPORTS]: acceptCounteroffer, declineCounteroffer, getTermsComparison, cancelProposalWorkflow, virtualMeetingWorkflow, navigationWorkflow

---

## ### SHARED_CONVENTIONS ###

[LOGGING]: Console.log with [counterofferWorkflow] prefix
[TIMESTAMPS]: Use new Date().toISOString() for Modified Date
[NO_FALLBACK]: Throw on validation failures

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 6
