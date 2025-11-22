/**
 * Determine if a guest can cancel their proposal.
 *
 * @intent Enforce business rules for when proposal cancellation is allowed.
 * @rule Guest can cancel proposals in stages 1-4 (before completion).
 * @rule Once completed, proposals cannot be cancelled (only disputes apply).
 * @rule Already cancelled/rejected/expired proposals cannot be re-cancelled.
 * @rule Deleted proposals cannot be cancelled.
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
  // Deleted proposals cannot be cancelled
  if (deleted) {
    return false
  }

  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()

  // Cannot cancel if already in terminal state
  const terminalStatuses = [
    'Cancelled by Guest',
    'Cancelled by Host',
    'Rejected',
    'Expired',
    'Completed'
  ]

  if (terminalStatuses.includes(status)) {
    return false
  }

  // Can cancel if in any active state
  // Includes: Draft, Pending, Host Countered, VM Requested, VM Confirmed, Accepted, Verified
  return true
}
