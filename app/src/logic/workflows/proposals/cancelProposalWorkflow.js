/**
 * Cancel Proposal Workflow
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Implements the 7 variations of the cancel proposal workflow from Bubble.io:
 * - crkec5: Cancel Proposal (Condition 1) - Basic cancellation
 * - crswt2: Cancel Proposal (Condition 2) - Usual Order > 5 and House manual not empty
 * - crtCg2: Cancel Proposal (Condition 3) - Status is Cancelled or Rejected
 * - curuC4: Cancel Proposal (Condition 4) - Additional variation
 * - curuK4: Cancel Proposal (Condition 5) - Same as condition 2
 * - curua4: Cancel Proposal (Condition 6) - Same as condition 3
 * - crkZs5: Cancel Proposal in Compare Terms popup
 *
 * All cancellations result in:
 * - Status: 'Proposal Cancelled by Guest'
 * - Modified Date: current timestamp
 * - Optional: reason for cancellation
 */

import { supabase } from '../../../lib/supabase.js';
import { canCancelProposal, requiresSpecialCancellationConfirmation } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CANCELLATION_CONDITIONS = Object.freeze({
  INVALID: 'invalid',
  ALREADY_CANCELLED: 'already_cancelled',
  NOT_CANCELLABLE: 'not_cancellable',
  HIGH_ORDER_WITH_MANUAL: 'high_order_with_manual',
  STANDARD: 'standard'
})

const BUBBLE_WORKFLOWS = Object.freeze({
  BASIC_CANCEL: 'crkec5',
  HIGH_ORDER_CANCEL: 'crswt2',
  ALREADY_CANCELLED: 'crtCg2',
  COMPARE_TERMS_CANCEL: 'crkZs5'
})

const RESULT_MESSAGES = Object.freeze({
  INVALID_PROPOSAL: 'Invalid proposal data',
  ALREADY_CANCELLED: 'This proposal is already cancelled or rejected',
  NOT_CANCELLABLE: 'This proposal cannot be cancelled at this stage',
  HIGH_ORDER_CONFIRMATION: 'You have an active rental history. Are you sure you want to cancel? This may affect your standing with the host and future rental opportunities.',
  STANDARD_CONFIRMATION: 'Are you sure you want to cancel this proposal? This action cannot be undone.'
})

const DB_FIELD_NAMES = Object.freeze({
  STATUS: 'Status',
  MODIFIED_DATE: 'Modified Date',
  REASON: 'reason for cancellation',
  ID: '_id'
})

const CANCELLATION_REASONS = Object.freeze({
  COUNTEROFFER_DECLINED: 'Counteroffer declined'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Extract status from proposal (handles both formats)
 * @pure
 */
const extractStatus = (proposal) =>
  proposal.status || proposal.Status

/**
 * Check if status is already cancelled or rejected
 * @pure
 */
const isAlreadyCancelledStatus = (status) =>
  status === PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key ||
  status === PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key ||
  status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build invalid proposal result
 * @pure
 */
const buildInvalidResult = () =>
  Object.freeze({
    condition: CANCELLATION_CONDITIONS.INVALID,
    workflow: null,
    allowCancel: false,
    message: RESULT_MESSAGES.INVALID_PROPOSAL
  })

/**
 * Build already cancelled result
 * @pure
 */
const buildAlreadyCancelledResult = () =>
  Object.freeze({
    condition: CANCELLATION_CONDITIONS.ALREADY_CANCELLED,
    workflow: BUBBLE_WORKFLOWS.ALREADY_CANCELLED,
    allowCancel: false,
    message: RESULT_MESSAGES.ALREADY_CANCELLED
  })

/**
 * Build not cancellable result
 * @pure
 */
const buildNotCancellableResult = () =>
  Object.freeze({
    condition: CANCELLATION_CONDITIONS.NOT_CANCELLABLE,
    workflow: null,
    allowCancel: false,
    message: RESULT_MESSAGES.NOT_CANCELLABLE
  })

/**
 * Build high order with manual result
 * @pure
 */
const buildHighOrderResult = () =>
  Object.freeze({
    condition: CANCELLATION_CONDITIONS.HIGH_ORDER_WITH_MANUAL,
    workflow: BUBBLE_WORKFLOWS.HIGH_ORDER_CANCEL,
    allowCancel: true,
    requiresConfirmation: true,
    confirmationMessage: RESULT_MESSAGES.HIGH_ORDER_CONFIRMATION
  })

/**
 * Build standard cancellation result
 * @pure
 */
const buildStandardResult = () =>
  Object.freeze({
    condition: CANCELLATION_CONDITIONS.STANDARD,
    workflow: BUBBLE_WORKFLOWS.BASIC_CANCEL,
    allowCancel: true,
    requiresConfirmation: true,
    confirmationMessage: RESULT_MESSAGES.STANDARD_CONFIRMATION
  })

// ─────────────────────────────────────────────────────────────
// Condition Evaluation
// ─────────────────────────────────────────────────────────────

/**
 * Evaluate which cancellation workflow condition applies
 * @pure
 *
 * @param {Object} proposal - Full proposal object
 * @returns {Object} Condition details with workflow info (frozen)
 */
export function determineCancellationCondition(proposal) {
  if (!isTruthy(proposal)) {
    return buildInvalidResult()
  }

  const status = extractStatus(proposal)

  // Condition 3 & 6: Already cancelled or rejected
  if (isAlreadyCancelledStatus(status)) {
    return buildAlreadyCancelledResult()
  }

  // Check if can cancel based on rules
  if (!canCancelProposal(proposal)) {
    return buildNotCancellableResult()
  }

  // Condition 2 & 5: Usual Order > 5 AND House manual not empty
  if (requiresSpecialCancellationConfirmation(proposal)) {
    return buildHighOrderResult()
  }

  // Condition 1, 4, and default: Standard cancellation
  return buildStandardResult()
}

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build cancellation update payload
 * @pure
 */
const buildCancelUpdatePayload = (timestamp, reason) => {
  const payload = {
    [DB_FIELD_NAMES.STATUS]: PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  }

  if (isNonEmptyString(reason)) {
    payload[DB_FIELD_NAMES.REASON] = reason
  }

  return Object.freeze(payload)
}

// ─────────────────────────────────────────────────────────────
// Execution Functions
// ─────────────────────────────────────────────────────────────

/**
 * Execute proposal cancellation in database
 *
 * @param {string} proposalId - Proposal ID to cancel
 * @param {string} reason - Optional reason for cancellation
 * @returns {Promise<Object>} Updated proposal data
 *
 * @throws {Error} If proposalId is not provided
 * @throws {Error} If database update fails
 */
export async function executeCancelProposal(proposalId, reason = null) {
  if (!isNonEmptyString(proposalId)) {
    throw new Error('Proposal ID is required')
  }

  const timestamp = new Date().toISOString()
  const updatePayload = buildCancelUpdatePayload(timestamp, reason)

  console.log('[cancelProposalWorkflow] Cancelling proposal:', proposalId)

  const { data, error } = await supabase
    .from('proposal')
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, proposalId)
    .select()
    .single()

  if (error) {
    console.error('[cancelProposalWorkflow] Error cancelling proposal:', error)
    throw new Error(`Failed to cancel proposal: ${error.message}`)
  }

  console.log('[cancelProposalWorkflow] Proposal cancelled successfully:', proposalId)
  return data
}

/**
 * Cancel proposal from Compare Terms modal (workflow crkZs5)
 * Same as regular cancellation but triggered from different UI location
 *
 * @param {string} proposalId - Proposal ID to cancel
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<Object>} Updated proposal data
 */
export async function cancelProposalFromCompareTerms(
  proposalId,
  reason = CANCELLATION_REASONS.COUNTEROFFER_DECLINED
) {
  console.log(`[cancelProposalWorkflow] Cancel triggered from Compare Terms modal (workflow ${BUBBLE_WORKFLOWS.COMPARE_TERMS_CANCEL})`)
  return executeCancelProposal(proposalId, reason)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  CANCELLATION_CONDITIONS,
  BUBBLE_WORKFLOWS,
  RESULT_MESSAGES,
  DB_FIELD_NAMES,
  CANCELLATION_REASONS
}
