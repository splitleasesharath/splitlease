/**
 * Determine if a guest can accept a proposal (or host counteroffer).
 *
 * @intent Enforce business rules for when proposal acceptance is allowed.
 * @rule Guest can only accept when host has countered (Stage 2).
 * @rule Original proposals don't need acceptance (they're sent to host).
 * @rule Once accepted, VM scheduled, or cancelled, acceptance is not applicable.
 * @rule Deleted proposals cannot be accepted.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.proposalStatus - The "Proposal Status" field from Supabase.
 * @param {boolean} [params.deleted=false] - Whether proposal is soft-deleted.
 * @returns {boolean} True if guest can accept this proposal.
 *
 * @example
 * canAcceptProposal({ proposalStatus: 'Host Countered' })
 * // => true
 *
 * canAcceptProposal({ proposalStatus: 'Pending' })
 * // => false (waiting for host, not guest)
 *
 * canAcceptProposal({ proposalStatus: 'Accepted' })
 * // => false (already accepted)
 */
export function canAcceptProposal({ proposalStatus, deleted = false }) {
  // Deleted proposals cannot be accepted
  if (deleted) {
    return false
  }

  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()

  // Can only accept when host has countered
  // This is the only status where guest needs to make an "accept" decision
  return status === 'Host Countered'
}
