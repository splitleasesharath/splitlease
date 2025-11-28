/**
 * Proposal Status Configuration
 *
 * Maps Bubble.io option set values to React configuration.
 * See tech-debt/STATUS_CONFIG_TECH_DEBT.md for future migration considerations.
 */

export const PROPOSAL_STATUS = {
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
};

export const STATUS_CONFIG = {
  [PROPOSAL_STATUS.PENDING]: {
    usualOrder: 1,
    guestAction1: 'View Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.HOST_REVIEW]: {
    usualOrder: 2,
    guestAction1: 'Remind Split Lease',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_AWAITING_APPLICATION]: {
    usualOrder: 3,
    guestAction1: 'Complete Application',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION]: {
    usualOrder: 3,
    guestAction1: 'Complete Application',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION]: {
    usualOrder: 3,
    guestAction1: 'Confirm Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.HOST_COUNTEROFFER]: {
    usualOrder: 4,
    guestAction1: 'Review Counteroffer',
    guestAction2: 'Accept Modified Terms',
  },
  [PROPOSAL_STATUS.PROPOSAL_ACCEPTED_DRAFTING]: {
    usualOrder: 5,
    guestAction1: 'Remind Split Lease',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT]: {
    usualOrder: 6,
    guestAction1: 'Review Documents',
    guestAction2: 'Submit ID Documents',
  },
  [PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED]: {
    usualOrder: 7,
    guestAction1: 'Go to Leases',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.CANCELLED_BY_GUEST]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
  [PROPOSAL_STATUS.REJECTED_BY_HOST]: {
    usualOrder: 99,
    guestAction1: 'Delete Proposal',
    guestAction2: 'Invisible',
  },
};

export function getStatusConfig(statusText) {
  return STATUS_CONFIG[statusText] || {
    usualOrder: 0,
    guestAction1: 'Invisible',
    guestAction2: 'Invisible',
  };
}
