import { isTerminalStatus, isCompletedStatus } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0

/**
 * Check if status allows cancellation (not terminal and not completed)
 * @pure
 */
const isCancellableStatus = (normalizedStatus) =>
  !isTerminalStatus(normalizedStatus) && !isCompletedStatus(normalizedStatus)

/**
 * Determine if a guest can cancel their proposal.
 *
 * @intent Enforce business rules for when proposal cancellation is allowed.
 * @rule Guest can cancel proposals in stages 1-4 (before completion).
 * @rule Once completed, proposals cannot be cancelled (only disputes apply).
 * @rule Already cancelled/rejected/expired proposals cannot be re-cancelled.
 * @rule Deleted proposals cannot be cancelled.
 * @pure Yes - deterministic, no side effects
 *
 * @param {object} params - Named parameters.
 * @param {string} params.proposalStatus - The "Proposal Status" field from Supabase.
 * @param {boolean} [params.deleted=false] - Whether proposal is soft-deleted.
 * @returns {boolean} True if guest can cancel this proposal.
 *
 * @example
 * canCancelProposal({ proposalStatus: 'Pending' })
 * // => true
 *
 * canCancelProposal({ proposalStatus: 'Completed' })
 * // => false
 *
 * canCancelProposal({ proposalStatus: 'Cancelled by Guest' })
 * // => false (already cancelled)
 */
export function canCancelProposal({ proposalStatus, deleted = false }) {
  // Guard: Deleted proposals cannot be cancelled
  if (deleted) {
    return false
  }

  // Guard: Invalid status means cannot cancel
  if (!isNonEmptyString(proposalStatus)) {
    return false
  }

  // Pure transformation and predicate composition
  const normalizedStatus = proposalStatus.trim()

  // Can cancel if in any active (non-terminal, non-completed) state
  return isCancellableStatus(normalizedStatus)
}
