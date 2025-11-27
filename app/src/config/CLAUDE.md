# Config - Application Configuration

**GENERATED**: 2025-11-27
**PARENT**: app/src/

---

## DIRECTORY_INTENT

[PURPOSE]: Configuration mappings and constants for the application
[PATTERN]: Export const objects and helper functions
[SOURCE_OF_TRUTH]: Maps Bubble.io option sets to React

---

## FILE_INVENTORY

### proposalStatusConfig.js
[INTENT]: Maps Bubble.io proposal status option set to React configuration
[EXPORTS]: PROPOSAL_STATUS, STATUS_CONFIG, getStatusConfig()

---

## PROPOSAL_STATUS_ENUM

```javascript
PROPOSAL_STATUS = {
  PENDING: 'Pending',
  HOST_REVIEW: 'Host Review',
  PROPOSAL_SUBMITTED_AWAITING_APPLICATION: 'Proposal Submitted by guest - Awaiting Rental Application',
  PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION: 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION: 'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  HOST_COUNTEROFFER: 'Host Counteroffer Submitted / Awaiting Guest Review',
  PROPOSAL_ACCEPTED_DRAFTING: 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
  LEASE_DOCUMENTS_SENT: 'Lease Documents Sent for Review',
  INITIAL_PAYMENT_LEASE_ACTIVATED: 'Initial Payment Submitted / Lease activated',
  CANCELLED_BY_GUEST: 'Proposal Cancelled by Guest',
  CANCELLED_BY_SPLITLEASE: 'Proposal Cancelled by Split Lease',
  REJECTED_BY_HOST: 'Proposal Rejected by Host',
}
```

---

## STATUS_CONFIG_STRUCTURE

Each status maps to:
- `usualOrder`: Sort order (1-99, 99 = terminal states)
- `guestAction1`: Primary action button text
- `guestAction2`: Secondary action button text ('Invisible' = hidden)

---

## USAGE

```javascript
import { PROPOSAL_STATUS, getStatusConfig } from 'src/config/proposalStatusConfig';

const status = proposal.status;
const config = getStatusConfig(status);

if (status === PROPOSAL_STATUS.HOST_COUNTEROFFER) {
  // Show counteroffer UI
}
```

---

## TECH_DEBT

See `tech-debt/STATUS_CONFIG_TECH_DEBT.md` for future migration considerations.

---

**FILE_COUNT**: 1
