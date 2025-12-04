# Constants - Proposal Definitions

**GENERATED**: 2025-11-26
**PARENT**: app/src/lib/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Constant definitions for proposal statuses and stages
[PATTERN]: Immutable constant objects and enums

---

## ### FILE_INVENTORY ###

### proposalStages.js
[INTENT]: Proposal stage constant definitions mapping status codes to display info
[EXPORTS]: PROPOSAL_STAGES, getStageLabel, getStageColor

### proposalStatuses.js
[INTENT]: Proposal status value constants defining all possible states
[EXPORTS]: PROPOSAL_STATUSES, STATUS_TRANSITIONS, isTerminalStatus

---

## ### PROPOSAL_STAGES ###

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

## ### PROPOSAL_STATUSES ###

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

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { PROPOSAL_STAGES } from 'lib/constants/proposalStages'
[CONSUMED_BY]: Proposal rules, processors, UI components

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 5
