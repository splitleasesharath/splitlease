/**
 * Proposal Business Rules
 *
 * PILLAR II: Rule Engines (The "Conditional" Layer)
 *
 * This module encapsulates the "Predicate Functions" of the proposal domain.
 * These are functions that return a strict boolean (true or false) indicating
 * whether a specific condition is met. They represent business rules, permissions,
 * and validity checks.
 *
 * Conventions:
 * - Function names begin with predicate verbs: should, can, is, has, allows
 * - Rules never perform actions - they only provide verdicts
 */

import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../constants/proposalStatuses.js';
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';

/**
 * Check if a proposal can be cancelled by the guest
 * Based on Bubble.io workflows crkec5, crswt2, crtCg2, curuC4, curuK4, curua4
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be cancelled
 */
export function canCancelProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't cancel if already cancelled or rejected
  if (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
    status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  ) {
    return false;
  }

  // Can't cancel if lease is already activated
  if (isCompletedStatus(status)) {
    return false;
  }

  // Can't cancel if expired
  if (status === PROPOSAL_STATUSES.EXPIRED.key) {
    return false;
  }

  // Otherwise, can cancel
  return true;
}

/**
 * Check if a proposal can be modified/edited by the guest
 * Only allowed in early stages before rental application submission
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be modified
 */
export function canModifyProposal(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can only modify if in initial submission stage
  return status === PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key;
}

/**
 * Check if a proposal has a counteroffer that can be reviewed
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal has reviewable counteroffer
 */
export function hasReviewableCounteroffer(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return (
    status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key &&
    proposal.counterOfferHappened === true
  );
}

/**
 * Check if guest can accept a counteroffer
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if counteroffer can be accepted
 */
export function canAcceptCounteroffer(proposal) {
  return hasReviewableCounteroffer(proposal);
}

/**
 * Check if guest can decline a counteroffer
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if counteroffer can be declined
 */
export function canDeclineCounteroffer(proposal) {
  return hasReviewableCounteroffer(proposal);
}

/**
 * Check if guest can submit rental application
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if rental application can be submitted
 */
export function canSubmitRentalApplication(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return status === PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key;
}

/**
 * Check if guest can review documents
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if documents can be reviewed
 */
export function canReviewDocuments(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;
  const actions = getActionsForStatus(status);

  return actions.includes('review_documents');
}

/**
 * Check if guest can request a virtual meeting
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if VM can be requested
 */
export function canRequestVirtualMeeting(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  // Can't request VM if proposal is terminal
  if (isTerminalStatus(status)) {
    return false;
  }

  const actions = getActionsForStatus(status);
  return actions.includes('request_vm');
}

/**
 * Check if guest can send a message to host
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if message can be sent
 */
export function canSendMessage(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;
  const actions = getActionsForStatus(status);

  return actions.includes('send_message');
}

/**
 * Check if proposal is in an active/pending state
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is active
 */
export function isProposalActive(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return !isTerminalStatus(status);
}

/**
 * Check if proposal is cancelled
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is cancelled
 */
export function isProposalCancelled(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return (
    status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
    status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key
  );
}

/**
 * Check if proposal is rejected
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is rejected
 */
export function isProposalRejected(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key;
}

/**
 * Check if proposal has lease activated
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if lease is activated
 */
export function isLeaseActivated(proposal) {
  if (!proposal) {
    return false;
  }

  const status = proposal.status || proposal.Status;

  return isCompletedStatus(status);
}

/**
 * Check if cancellation requires special confirmation
 * Based on "Usual Order > 5 and House manual not empty" condition
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if special confirmation is needed
 */
export function requiresSpecialCancellationConfirmation(proposal) {
  if (!proposal) {
    return false;
  }

  const usualOrder = proposal['Usual Order'] || 0;
  const houseManualNotEmpty = proposal.listing?.['House Manual'] || false;

  return usualOrder > 5 && houseManualNotEmpty;
}

/**
 * Get the appropriate cancel button text based on proposal status
 *
 * @param {Object} proposal - Proposal object
 * @returns {string} Button text
 */
export function getCancelButtonText(proposal) {
  if (!proposal) {
    return 'Cancel Proposal';
  }

  const status = proposal.status || proposal.Status;

  // Special text for counteroffer scenario
  if (status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key) {
    return 'Decline Counteroffer';
  }

  return 'Cancel Proposal';
}

/**
 * Get available cancellation reason options for guests
 * Fetches from cached reference data (initialized via dataLookups.js)
 * Falls back to hardcoded values if cache is empty (for resilience during initialization)
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  console.warn('[getCancellationReasonOptions] Cache empty, using fallback values');
  return [
    'Found another property',
    'Changed move-in dates',
    'Changed budget',
    'Changed location preference',
    'No longer need housing',
    'Host not responsive',
    'Terms not acceptable',
    'Other'
  ];
}

// ============================================================================
// SPLIT LEASE SUGGESTED PROPOSAL RULES
// ============================================================================

/**
 * Check if proposal needs rental application submission
 * Used to determine if "Submit Rental App" CTA should be shown
 *
 * @param {Object} proposal - Proposal with rentalApplication data joined
 * @returns {boolean} True if rental app is missing or not submitted
 */
export function needsRentalApplicationSubmission(proposal) {
  if (!proposal) return false;

  // No rental application linked at all
  if (!proposal['rental application'] && !proposal.rentalApplication) {
    return true;
  }

  // Has rental application reference but no data joined (shouldn't happen, but handle it)
  if (proposal['rental application'] && !proposal.rentalApplication) {
    return true;
  }

  // Has rental application but not submitted
  if (proposal.rentalApplication && !proposal.rentalApplication.submitted) {
    return true;
  }

  return false;
}

/**
 * Check if this is a Split Lease suggested proposal
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if suggested by Split Lease
 */
export function isSLSuggestedProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;
  return status?.includes('Submitted for guest by Split Lease');
}

/**
 * Check if guest can confirm a Split Lease suggested proposal
 * Guest can confirm if in "Pending Confirmation" status
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if can confirm
 */
export function canConfirmSuggestedProposal(proposal) {
  if (!proposal) return false;
  const status = proposal.status || proposal.Status;

  // Can confirm if in "Pending Confirmation" status
  return status === PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key;
}

/**
 * Determine next status when guest confirms an SL-suggested proposal
 * @param {Object} proposal - Proposal with rentalApplication data
 * @returns {string} Next status key
 */
export function getNextStatusAfterConfirmation(proposal) {
  if (needsRentalApplicationSubmission(proposal)) {
    // Guest confirmed but rental app not done → intermediate status
    return PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key;
  }
  // Rental app already done → go straight to Host Review
  return PROPOSAL_STATUSES.HOST_REVIEW.key;
}
