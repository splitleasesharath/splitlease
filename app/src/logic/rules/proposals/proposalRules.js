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
 * @pure Yes - All functions are deterministic, no side effects
 */

import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../../lib/constants/proposalStatuses.js'
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const USUAL_ORDER_THRESHOLD = 5
const DEFAULT_CANCEL_TEXT = 'Cancel Proposal'
const COUNTEROFFER_CANCEL_TEXT = 'Decline Counteroffer'

const FALLBACK_CANCELLATION_REASONS = Object.freeze([
  'Found another property',
  'Changed move-in dates',
  'Changed budget',
  'Changed location preference',
  'No longer need housing',
  'Host not responsive',
  'Terms not acceptable',
  'Other'
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNullish = (value) => value === null || value === undefined
const isValidProposal = (proposal) => !isNullish(proposal)

/**
 * Extract status from proposal object (handles different field names)
 * @pure
 */
const extractStatus = (proposal) => proposal?.status || proposal?.Status || null

/**
 * Check if status matches a specific PROPOSAL_STATUSES key
 * @pure
 */
const statusEquals = (status, proposalStatusKey) =>
  status === proposalStatusKey

/**
 * Check if actions list includes a specific action
 * @pure
 */
const hasAction = (actions, action) => actions.includes(action)

// ─────────────────────────────────────────────────────────────
// Cancellation Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if status is a cancelled status
 * @pure
 */
const isCancelledStatus = (status) =>
  statusEquals(status, PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key) ||
  statusEquals(status, PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key)

/**
 * Check if status is rejected status
 * @pure
 */
const isRejectedStatus = (status) =>
  statusEquals(status, PROPOSAL_STATUSES.REJECTED_BY_HOST.key)

/**
 * Check if status is expired status
 * @pure
 */
const isExpiredStatus = (status) =>
  statusEquals(status, PROPOSAL_STATUSES.EXPIRED.key)

/**
 * Check if a proposal can be cancelled by the guest
 * Based on Bubble.io workflows crkec5, crswt2, crtCg2, curuC4, curuK4, curua4
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be cancelled
 */
export function canCancelProposal(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  // Can't cancel if already cancelled or rejected
  if (isCancelledStatus(status) || isRejectedStatus(status)) {
    return false
  }

  // Can't cancel if lease is already activated
  if (isCompletedStatus(status)) {
    return false
  }

  // Can't cancel if expired
  if (isExpiredStatus(status)) {
    return false
  }

  // Otherwise, can cancel
  return true
}

// ─────────────────────────────────────────────────────────────
// Modification Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if a proposal can be modified/edited by the guest
 * Only allowed in early stages before rental application submission
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal can be modified
 */
export function canModifyProposal(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  // Can only modify if in initial submission stage
  return statusEquals(status, PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key)
}

// ─────────────────────────────────────────────────────────────
// Counteroffer Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if a proposal has a counteroffer that can be reviewed
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal has reviewable counteroffer
 */
export function hasReviewableCounteroffer(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)
  const hasCounterOffer = proposal.counterOfferHappened === true

  return statusEquals(status, PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key) &&
    hasCounterOffer
}

/**
 * Check if guest can accept a counteroffer
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if counteroffer can be accepted
 */
export function canAcceptCounteroffer(proposal) {
  return hasReviewableCounteroffer(proposal)
}

/**
 * Check if guest can decline a counteroffer
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if counteroffer can be declined
 */
export function canDeclineCounteroffer(proposal) {
  return hasReviewableCounteroffer(proposal)
}

// ─────────────────────────────────────────────────────────────
// Application Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if guest can submit rental application
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if rental application can be submitted
 */
export function canSubmitRentalApplication(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  return statusEquals(status, PROPOSAL_STATUSES.PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP.key)
}

/**
 * Check if guest can review documents
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if documents can be reviewed
 */
export function canReviewDocuments(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)
  const actions = getActionsForStatus(status)

  return hasAction(actions, 'review_documents')
}

// ─────────────────────────────────────────────────────────────
// Communication Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if guest can request a virtual meeting
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if VM can be requested
 */
export function canRequestVirtualMeeting(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  // Can't request VM if proposal is terminal
  if (isTerminalStatus(status)) {
    return false
  }

  const actions = getActionsForStatus(status)
  return hasAction(actions, 'request_vm')
}

/**
 * Check if guest can send a message to host
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if message can be sent
 */
export function canSendMessage(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)
  const actions = getActionsForStatus(status)

  return hasAction(actions, 'send_message')
}

// ─────────────────────────────────────────────────────────────
// Status Check Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if proposal is in an active/pending state
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is active
 */
export function isProposalActive(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  return !isTerminalStatus(status)
}

/**
 * Check if proposal is cancelled
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is cancelled
 */
export function isProposalCancelled(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  return isCancelledStatus(status)
}

/**
 * Check if proposal is rejected
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if proposal is rejected
 */
export function isProposalRejected(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  return isRejectedStatus(status)
}

/**
 * Check if proposal has lease activated
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if lease is activated
 */
export function isLeaseActivated(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const status = extractStatus(proposal)

  return isCompletedStatus(status)
}

// ─────────────────────────────────────────────────────────────
// Special Confirmation Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if cancellation requires special confirmation
 * Based on "Usual Order > 5 and House manual not empty" condition
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {boolean} True if special confirmation is needed
 */
export function requiresSpecialCancellationConfirmation(proposal) {
  if (!isValidProposal(proposal)) {
    return false
  }

  const usualOrder = proposal['Usual Order'] ?? 0
  const hasHouseManual = Boolean(proposal.listing?.['House Manual'])

  return usualOrder > USUAL_ORDER_THRESHOLD && hasHouseManual
}

// ─────────────────────────────────────────────────────────────
// UI Helper Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Get the appropriate cancel button text based on proposal status
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {string} Button text
 */
export function getCancelButtonText(proposal) {
  if (!isValidProposal(proposal)) {
    return DEFAULT_CANCEL_TEXT
  }

  const status = extractStatus(proposal)

  // Special text for counteroffer scenario
  if (statusEquals(status, PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key)) {
    return COUNTEROFFER_CANCEL_TEXT
  }

  return DEFAULT_CANCEL_TEXT
}

/**
 * Get available cancellation reason options for guests
 * Fetches from cached reference data (initialized via dataLookups.js)
 * Falls back to hardcoded values if cache is empty (for resilience during initialization)
 * @pure (depends on external cache but returns deterministic fallback)
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons()

  if (cachedReasons.length > 0) {
    // Pure transformation: extract reason strings
    return cachedReasons.map((r) => r.reason)
  }

  // Fallback for initial render before cache is populated
  console.warn('[getCancellationReasonOptions] Cache empty, using fallback values')
  return [...FALLBACK_CANCELLATION_REASONS]
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  USUAL_ORDER_THRESHOLD,
  DEFAULT_CANCEL_TEXT,
  COUNTEROFFER_CANCEL_TEXT,
  FALLBACK_CANCELLATION_REASONS
}
