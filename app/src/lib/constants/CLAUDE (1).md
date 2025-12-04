# Constants - Proposal Definitions Context

**TYPE**: LEAF NODE
**PARENT**: app/src/lib/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Constant definitions for proposal statuses and stages
[PATTERN]: Immutable constant objects and enums
[USAGE]: Import constants rather than hardcoding status strings

---

## ### MODULE_CONTRACTS ###

### proposalStages.js
[PATH]: ./proposalStages.js
[INTENT]: Proposal stage constant definitions mapping status codes to display info
[EXPORTS]:
  - PROPOSAL_STAGES: object - Stage definitions with number, label, color
  - getStageLabel: (stage: number) => string - Get display label for stage
  - getStageColor: (stage: number) => string - Get color for stage indicator

---

### proposalStatuses.js
[PATH]: ./proposalStatuses.js
[INTENT]: Proposal status value constants defining all possible states
[EXPORTS]:
  - PROPOSAL_STATUSES: object - All status string constants
  - STATUS_TRANSITIONS: object - Valid transitions between statuses
  - isTerminalStatus: (status: string) => boolean - Check if status is final

---

## ### PROPOSAL_STAGES_SHAPE ###

```javascript
PROPOSAL_STAGES = {
  SUBMITTED: { stage: 1, label: 'Submitted', color: '#blue' },
  HOST_APPROVED: { stage: 2, label: 'Host Approved', color: '#green' },
  PAYMENT_PENDING: { stage: 3, label: 'Payment Pending', color: '#orange' },
  CONFIRMED: { stage: 4, label: 'Confirmed', color: '#purple' },
  COMPLETED: { stage: 5, label: 'Completed', color: '#gray' }
}
```

---

## ### PROPOSAL_STATUSES_SHAPE ###

```javascript
PROPOSAL_STATUSES = {
  SUBMITTED: 'submitted',
  HOST_APPROVED: 'host_approved',
  PAYMENT_PENDING: 'payment_pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  COMPLETED: 'completed'
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always import status constants - never hardcode status strings
[RULE_2]: Use isTerminalStatus() to check if proposal can still be modified
[RULE_3]: Use STATUS_TRANSITIONS for validation

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 5
