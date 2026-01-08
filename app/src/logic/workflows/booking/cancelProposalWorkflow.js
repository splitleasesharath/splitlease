/**
 * Workflow: Cancel a proposal with complex decision tree.
 *
 * @intent Orchestrate proposal cancellation following business rules.
 * @rule Implements complete cancellation decision tree (7 variations).
 * @rule Different actions based on: source, current status, usual order, house manual access.
 * @rule Updates Supabase with appropriate status and cancellation reason.
 *
 * Decision Tree (from WORKFLOW-PASS2-ASSIMILATION.md):
 * 1. Already cancelled → Show alert, no action
 * 2. Compare modal source + Usual Order ≤5 → Status: "Cancelled by Guest"
 * 3. Compare modal source + Usual Order >5 → Alert to call, no DB update
 * 4. Main page + Usual Order ≤5 + No house manual → Status: "Cancelled by Guest"
 * 5. Main page + Usual Order >5 + No house manual → Alert to call, no DB update
 * 6. Main page + Usual Order ≤5 + Has house manual → Alert to call, no DB update
 * 7. Main page + Usual Order >5 + Has house manual → Alert to call, no DB update
 *
 * This is an orchestration workflow that coordinates:
 * - Rule validation (canCancelProposal) - pure
 * - Decision tree evaluation - pure
 * - Database update (Supabase) - effectful
 * - Result building - pure
 */
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = Object.freeze({
  MISSING_SUPABASE: 'cancelProposalWorkflow: supabase client is required',
  MISSING_PROPOSAL: 'cancelProposalWorkflow: proposal with id is required',
  MISSING_RULE_FN: 'cancelProposalWorkflow: canCancelProposal rule function is required'
})

const RESULT_MESSAGES = Object.freeze({
  CANNOT_CANCEL: 'This proposal cannot be cancelled (already in terminal state)',
  SUCCESS: 'Proposal cancelled successfully',
  CALL_USUAL_ORDER: 'Please call Split Lease to cancel this proposal (Usual Order > 5)',
  CALL_HOUSE_MANUAL: 'Please call Split Lease to cancel this proposal (House Manual accessed)'
})

const CANCELLATION_REASONS = Object.freeze({
  GUEST_INITIATED: 'Guest initiated cancellation'
})

const SOURCE_TYPES = Object.freeze({
  COMPARE_MODAL: 'compare-modal',
  MAIN: 'main'
})

const DB_FIELD_NAMES = Object.freeze({
  STATUS: 'Status',
  REASON: 'reason for cancellation',
  MODIFIED_DATE: 'Modified Date',
  ID: '_id'
})

const USUAL_ORDER_THRESHOLD = 5

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = (value) => Boolean(value)

/**
 * Check if value is a function
 * @pure
 */
const isFunction = (value) => typeof value === 'function'

/**
 * Check if proposal has required id
 * @pure
 */
const hasProposalId = (proposal) =>
  isTruthy(proposal) && isTruthy(proposal.id)

/**
 * Check if source is compare modal
 * @pure
 */
const isFromCompareModal = (source) =>
  source === SOURCE_TYPES.COMPARE_MODAL

/**
 * Check if usual order is below or equal to threshold
 * @pure
 */
const isLowUsualOrder = (usualOrder) =>
  usualOrder <= USUAL_ORDER_THRESHOLD

/**
 * Check if house manual was accessed
 * @pure
 */
const hasAccessedManual = (proposal) =>
  proposal.houseManualAccessed === true

// ─────────────────────────────────────────────────────────────
// Decision Tree Evaluation (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Extract decision factors from proposal
 * @pure
 */
const extractDecisionFactors = (proposal, source) =>
  Object.freeze({
    usualOrder: proposal.usualOrder || 0,
    hasAccessedHouseManual: hasAccessedManual(proposal),
    isCompareModal: isFromCompareModal(source)
  })

/**
 * Evaluate decision tree to determine action
 * @pure
 * @returns {{ shouldUpdate: boolean, alertMessage: string | null }}
 */
const evaluateDecisionTree = (factors) => {
  const { usualOrder, hasAccessedHouseManual, isCompareModal } = factors

  if (isCompareModal) {
    // Compare Modal Source: Variations 2 & 3
    return isLowUsualOrder(usualOrder)
      ? { shouldUpdate: true, alertMessage: null }
      : { shouldUpdate: false, alertMessage: RESULT_MESSAGES.CALL_USUAL_ORDER }
  }

  // Main Page Source: Variations 4, 5, 6, 7
  if (hasAccessedHouseManual) {
    // Variations 6 & 7: Always require phone call
    return { shouldUpdate: false, alertMessage: RESULT_MESSAGES.CALL_HOUSE_MANUAL }
  }

  // No house manual accessed
  return isLowUsualOrder(usualOrder)
    ? { shouldUpdate: true, alertMessage: null }
    : { shouldUpdate: false, alertMessage: RESULT_MESSAGES.CALL_USUAL_ORDER }
}

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build cannot cancel result
 * @pure
 */
const buildCannotCancelResult = () =>
  Object.freeze({
    success: false,
    message: RESULT_MESSAGES.CANNOT_CANCEL,
    updated: false
  })

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = () =>
  Object.freeze({
    success: true,
    message: RESULT_MESSAGES.SUCCESS,
    updated: true
  })

/**
 * Build phone call required result
 * @pure
 */
const buildPhoneCallResult = (alertMessage) =>
  Object.freeze({
    success: true,
    message: alertMessage,
    updated: false,
    requiresPhoneCall: true
  })

/**
 * Build error result
 * @pure
 */
const buildErrorResult = (err) =>
  Object.freeze({
    success: false,
    message: `Failed to cancel proposal: ${err.message}`,
    updated: false,
    error: err
  })

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build cancellation update payload
 * @pure
 */
const buildCancelUpdatePayload = (timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.STATUS]: PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
    [DB_FIELD_NAMES.REASON]: CANCELLATION_REASONS.GUEST_INITIATED,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Cancel a proposal following the decision tree
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client instance.
 * @param {object} params.proposal - Processed proposal object.
 * @param {string} params.source - 'main' | 'compare-modal' | 'other'.
 * @param {function} params.canCancelProposal - Rule function to check if cancellable.
 * @returns {Promise<object>} Result object with success status and message (frozen).
 *
 * @throws {Error} If supabase client is not provided.
 * @throws {Error} If proposal with id is not provided.
 * @throws {Error} If canCancelProposal function is not provided.
 *
 * @example
 * const result = await cancelProposalWorkflow({
 *   supabase,
 *   proposal: processedProposal,
 *   source: 'main',
 *   canCancelProposal
 * })
 * // => { success: true, message: 'Proposal cancelled...', updated: true }
 */
export async function cancelProposalWorkflow({
  supabase,
  proposal,
  source = SOURCE_TYPES.MAIN,
  canCancelProposal
}) {
  // Validation
  if (!isTruthy(supabase)) {
    throw new Error(ERROR_MESSAGES.MISSING_SUPABASE)
  }

  if (!hasProposalId(proposal)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL)
  }

  if (!isFunction(canCancelProposal)) {
    throw new Error(ERROR_MESSAGES.MISSING_RULE_FN)
  }

  // Step 1: Check if cancellation is allowed (pure rule check)
  const canCancel = canCancelProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  if (!canCancel) {
    return buildCannotCancelResult()
  }

  // Step 2: Extract decision factors and evaluate tree (pure)
  const factors = extractDecisionFactors(proposal, source)
  const { shouldUpdate, alertMessage } = evaluateDecisionTree(factors)

  // Step 3: Execute action based on decision
  if (!shouldUpdate) {
    return buildPhoneCallResult(alertMessage)
  }

  // Step 4: Update database (effectful)
  try {
    const updatePayload = buildCancelUpdatePayload(new Date().toISOString())

    const { error } = await supabase
      .from('proposal')
      .update(updatePayload)
      .eq(DB_FIELD_NAMES.ID, proposal.id)

    if (error) {
      throw error
    }

    return buildSuccessResult()
  } catch (err) {
    return buildErrorResult(err)
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  ERROR_MESSAGES,
  RESULT_MESSAGES,
  CANCELLATION_REASONS,
  SOURCE_TYPES,
  DB_FIELD_NAMES,
  USUAL_ORDER_THRESHOLD
}
