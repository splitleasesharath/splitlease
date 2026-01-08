/**
 * Workflow: Accept a host's counteroffer proposal.
 *
 * @intent Orchestrate acceptance of host counteroffer following business rules.
 * @rule Only applicable when proposal status is "Host Countered".
 * @rule Updates status to "Accepted" and sets acceptance timestamp.
 * @rule Validates proposal can be accepted before attempting update.
 *
 * This is an orchestration workflow that coordinates:
 * - Rule validation (canAcceptProposal) - pure
 * - Database update (Supabase) - effectful
 * - Result building - pure
 */
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = Object.freeze({
  MISSING_SUPABASE: 'acceptProposalWorkflow: supabase client is required',
  MISSING_PROPOSAL: 'acceptProposalWorkflow: proposal with id is required',
  MISSING_RULE_FN: 'acceptProposalWorkflow: canAcceptProposal rule function is required'
})

const RESULT_MESSAGES = Object.freeze({
  CANNOT_ACCEPT: 'This proposal cannot be accepted (not in "Host Countered" status)',
  SUCCESS: 'Proposal accepted successfully! The host will be notified.'
})

const DB_FIELD_NAMES = Object.freeze({
  STATUS: 'Status',
  MODIFIED_DATE: 'Modified Date',
  ID: '_id'
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

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build successful result
 * @pure
 */
const buildSuccessResult = () =>
  Object.freeze({
    success: true,
    message: RESULT_MESSAGES.SUCCESS,
    updated: true
  })

/**
 * Build cannot accept result
 * @pure
 */
const buildCannotAcceptResult = () =>
  Object.freeze({
    success: false,
    message: RESULT_MESSAGES.CANNOT_ACCEPT,
    updated: false
  })

/**
 * Build error result
 * @pure
 */
const buildErrorResult = (err) =>
  Object.freeze({
    success: false,
    message: `Failed to accept proposal: ${err.message}`,
    updated: false,
    error: err
  })

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build update payload for acceptance
 * @pure
 */
const buildAcceptUpdatePayload = (timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.STATUS]: PROPOSAL_STATUSES.PROPOSAL_OR_COUNTEROFFER_ACCEPTED.key,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Accept a host's counteroffer proposal
 *
 * @param {object} params - Named parameters.
 * @param {object} params.supabase - Supabase client instance.
 * @param {object} params.proposal - Processed proposal object.
 * @param {function} params.canAcceptProposal - Rule function to check if acceptable.
 * @returns {Promise<object>} Result object with success status and message (frozen).
 *
 * @throws {Error} If supabase client is not provided.
 * @throws {Error} If proposal with id is not provided.
 * @throws {Error} If canAcceptProposal function is not provided.
 *
 * @example
 * const result = await acceptProposalWorkflow({
 *   supabase,
 *   proposal: processedProposal,
 *   canAcceptProposal
 * })
 * // => { success: true, message: 'Proposal accepted...', updated: true }
 */
export async function acceptProposalWorkflow({
  supabase,
  proposal,
  canAcceptProposal
}) {
  // Validation
  if (!isTruthy(supabase)) {
    throw new Error(ERROR_MESSAGES.MISSING_SUPABASE)
  }

  if (!hasProposalId(proposal)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL)
  }

  if (!isFunction(canAcceptProposal)) {
    throw new Error(ERROR_MESSAGES.MISSING_RULE_FN)
  }

  // Step 1: Check if acceptance is allowed (pure rule check)
  const canAccept = canAcceptProposal({
    proposalStatus: proposal.status,
    deleted: proposal.deleted
  })

  if (!canAccept) {
    return buildCannotAcceptResult()
  }

  // Step 2: Update proposal status (effectful)
  try {
    const updatePayload = buildAcceptUpdatePayload(new Date().toISOString())

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
export { ERROR_MESSAGES, RESULT_MESSAGES, DB_FIELD_NAMES }
