import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0

/**
 * Get the acceptability status key (cached for performance)
 * @pure
 */
const getAcceptableStatusKey = () =>
  PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()

/**
 * Check if status matches the acceptable status for acceptance
 * @pure
 */
const isAcceptableStatus = (normalizedStatus) =>
  normalizedStatus === getAcceptableStatusKey()

/**
 * Determine if a guest can accept a proposal (or host counteroffer).
 *
 * @intent Enforce business rules for when proposal acceptance is allowed.
 * @rule Guest can only accept when host has countered (Stage 2).
 * @rule Original proposals don't need acceptance (they're sent to host).
 * @rule Once accepted, VM scheduled, or cancelled, acceptance is not applicable.
 * @rule Deleted proposals cannot be accepted.
 * @pure Yes - deterministic, no side effects
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
  // Guard: Deleted proposals cannot be accepted
  if (deleted) {
    return false
  }

  // Guard: Invalid status means cannot accept
  if (!isNonEmptyString(proposalStatus)) {
    return false
  }

  // Pure transformation and predicate application
  const normalizedStatus = proposalStatus.trim()

  return isAcceptableStatus(normalizedStatus)
}
