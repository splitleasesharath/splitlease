/**
 * Proposal Status Configuration System
 *
 * Centralized configuration for all proposal statuses,
 * replacing hardcoded status mappings throughout the application.
 *
 * Each status includes:
 * - key: The exact status string from the database
 * - color: UI color theme for the status
 * - label: User-friendly display text
 * - stage: The progress stage number (1-6) or null if not in active flow
 * - actions: Available actions for this status
 */

export const PROPOSAL_STATUSES = {
  // ===== CANCELLED STATES =====
  CANCELLED_BY_GUEST: {
    key: 'Proposal Cancelled by Guest',
    color: 'red',
    label: 'Cancelled by You',
    stage: null,
    usualOrder: 99,
    actions: ['view_listing', 'explore_rentals']
  },

  CANCELLED_BY_SPLITLEASE: {
    key: 'Proposal Cancelled by Split Lease',
    color: 'red',
    label: 'Proposal Cancelled',
    stage: null,
    usualOrder: 99,
    actions: ['view_listing', 'explore_rentals']
  },

  // ===== REJECTED STATES =====
  REJECTED_BY_HOST: {
    key: 'Proposal Rejected by Host',
    color: 'red',
    label: 'Rejected by Host',
    stage: null,
    usualOrder: 99,
    actions: ['view_listing', 'explore_rentals']
  },

  // ===== ACTIVE PROPOSAL FLOW =====

  // usualOrder 1: Pending
  PENDING: {
    key: 'Pending',
    color: 'blue',
    label: 'Pending',
    stage: 1,
    usualOrder: 1,
    actions: ['cancel_proposal', 'request_vm', 'send_message']
  },

  // usualOrder 2: Host Review
  HOST_REVIEW: {
    key: 'Host Review',
    color: 'blue',
    label: 'Under Host Review',
    stage: 3,
    usualOrder: 2,
    actions: ['request_vm', 'cancel_proposal', 'send_message']
  },

  // usualOrder 3: Proposal Submitted, Awaiting Rental Application
  PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP: {
    key: 'Proposal Submitted by guest - Awaiting Rental Application',
    color: 'blue',
    label: 'Submit Rental Application',
    stage: 1,
    usualOrder: 3,
    actions: ['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message']
  },

  PENDING_CONFIRMATION: {
    key: 'Pending Confirmation',
    color: 'blue',
    label: 'Awaiting Confirmation',
    stage: 1,
    usualOrder: 3,
    actions: ['cancel_proposal', 'request_vm', 'send_message']
  },

  // usualOrder 3 (variant): Rental Application Submitted
  RENTAL_APP_SUBMITTED: {
    key: 'Rental Application Submitted',
    color: 'blue',
    label: 'Application Under Review',
    stage: 2,
    usualOrder: 3,
    actions: ['request_vm', 'cancel_proposal', 'send_message']
  },

  // usualOrder 4: Host Counteroffer
  COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW: {
    key: 'Host Counteroffer Submitted / Awaiting Guest Review',
    color: 'yellow',
    label: 'Review Host Counteroffer',
    stage: 3,
    usualOrder: 4,
    actions: ['review_counteroffer', 'compare_terms', 'accept_counteroffer', 'decline_counteroffer', 'request_vm', 'send_message']
  },

  // usualOrder 5: Accepted / Drafting
  PROPOSAL_OR_COUNTEROFFER_ACCEPTED: {
    key: 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
    color: 'green',
    label: 'Accepted - Drafting Lease',
    stage: 4,
    usualOrder: 5,
    actions: ['request_vm', 'send_message']
  },

  // usualOrder 5 (variant): Review Documents
  REVIEWING_DOCUMENTS: {
    key: 'Reviewing Documents',
    color: 'blue',
    label: 'Reviewing Documents',
    stage: 4,
    usualOrder: 5,
    actions: ['review_documents', 'request_vm', 'send_message']
  },

  // usualOrder 6: Lease Documents
  LEASE_DOCUMENTS_SENT_FOR_REVIEW: {
    key: 'Lease Documents Sent for Review',
    color: 'blue',
    label: 'Review Lease Documents',
    stage: 5,
    usualOrder: 6,
    actions: ['review_documents', 'request_vm', 'send_message']
  },

  LEASE_SIGNED_AWAITING_INITIAL_PAYMENT: {
    key: 'Lease Signed / Awaiting Initial Payment',
    color: 'green',
    label: 'Submit Initial Payment',
    stage: 5,
    usualOrder: 6,
    actions: ['submit_payment', 'request_vm', 'send_message']
  },

  // usualOrder 7: Initial Payment / Lease Activated
  INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED: {
    key: 'Initial Payment Submitted / Lease activated',
    color: 'green',
    label: 'Lease Activated',
    stage: 6,
    usualOrder: 7,
    actions: ['view_lease', 'view_house_manual', 'send_message']
  },

  // ===== SPECIAL STATES =====

  DRAFT: {
    key: 'Draft',
    color: 'gray',
    label: 'Draft',
    stage: null,
    usualOrder: 0,
    actions: ['edit_proposal', 'submit_proposal', 'delete_proposal']
  },

  EXPIRED: {
    key: 'Expired',
    color: 'gray',
    label: 'Expired',
    stage: null,
    usualOrder: 99,
    actions: ['view_listing', 'explore_rentals']
  }
};

/**
 * Get status configuration by status key
 * @param {string} statusKey - The status string from the database
 * @returns {Object} Status configuration object with color, label, stage, actions
 */
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      color: 'gray',
      label: 'Unknown Status',
      stage: null,
      usualOrder: 0,
      actions: []
    };
  }

  const config = Object.values(PROPOSAL_STATUSES).find(
    s => s.key === statusKey
  );

  return config || {
    key: statusKey,
    color: 'gray',
    label: statusKey,
    stage: null,
    usualOrder: 0,
    actions: []
  };
}

/**
 * Get the progress stage number from a status key
 * @param {string} statusKey - The status string from the database
 * @returns {number|null} Stage number (1-6) or null if not in active flow
 */
export function getStageFromStatus(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.stage;
}

/**
 * Get the usual order number from a status key (Bubble ordering)
 * @param {string} statusKey - The status string from the database
 * @returns {number} Usual order number (1-7 for active, 99 for terminal, 0 for unknown)
 */
export function getUsualOrder(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.usualOrder ?? 0;
}

/**
 * Check if status banner should be visible
 * Banner shows when usualOrder >= 3 OR status is "Proposal Submitted by guest - Awaiting Rental Application"
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if banner should be shown
 */
export function shouldShowStatusBanner(statusKey) {
  if (!statusKey) return false;

  const usualOrder = getUsualOrder(statusKey);
  const isProposalSubmitted = statusKey === PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key;

  return usualOrder >= 3 || isProposalSubmitted;
}

/**
 * Get available actions for a status
 * @param {string} statusKey - The status string from the database
 * @returns {Array<string>} Array of action identifiers
 */
export function getActionsForStatus(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.actions || [];
}

/**
 * Check if a status is in an active proposal flow
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if status has a stage number (active flow)
 */
export function isActiveStatus(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.stage !== null;
}

/**
 * Check if a status is cancelled or rejected
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if status is cancelled or rejected
 */
export function isTerminalStatus(statusKey) {
  const config = getStatusConfig(statusKey);
  return config.color === 'red' || statusKey.includes('Cancelled') || statusKey.includes('Rejected');
}

/**
 * Check if a status is completed (lease activated)
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if lease is activated
 */
export function isCompletedStatus(statusKey) {
  return statusKey === PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key;
}

/**
 * Get all statuses by color category
 * @param {string} color - Color category ('red', 'yellow', 'blue', 'green', 'gray')
 * @returns {Array<Object>} Array of status configurations
 */
export function getStatusesByColor(color) {
  return Object.values(PROPOSAL_STATUSES).filter(s => s.color === color);
}

/**
 * Get all statuses for a specific stage
 * @param {number} stageNumber - Stage number (1-6)
 * @returns {Array<Object>} Array of status configurations
 */
export function getStatusesByStage(stageNumber) {
  return Object.values(PROPOSAL_STATUSES).filter(s => s.stage === stageNumber);
}
