/**
 * Determine the current stage (1-6) of a proposal in the guest journey.
 *
 * @intent Map proposal status to visual progress tracker stage.
 * @rule Implements the 6-stage proposal journey:
 *   Stage 1: Proposal Sent (Draft, Pending)
 *   Stage 2: Host Countered (Host Countered)
 *   Stage 3: Virtual Meeting Scheduled (VM Requested, VM Confirmed)
 *   Stage 4: Accepted (Accepted, Verified)
 *   Stage 5: Completed (Completed)
 *   Stage 6: Cancelled (Cancelled by Guest, Cancelled by Host, Rejected, Expired)
 *
 * @param {object} params - Named parameters.
 * @param {string} params.proposalStatus - The "Proposal Status" field from Supabase.
 * @param {boolean} [params.deleted=false] - Whether proposal is soft-deleted.
 * @returns {number} Stage number (1-6).
 *
 * @throws {Error} If proposalStatus is missing.
 *
 * @example
 * const stage = determineProposalStage({ proposalStatus: 'Host Countered' })
 * // => 2
 */
export function determineProposalStage({ proposalStatus, deleted = false }) {
  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    throw new Error('determineProposalStage: proposalStatus is required and must be a string')
  }

  // Deleted proposals are always stage 6 (Cancelled)
  if (deleted) {
    return 6
  }

  // Map status to stage
  const status = proposalStatus.trim()

  // Stage 6: Cancelled/Rejected/Expired (Terminal negative states)
  if (
    status === 'Cancelled by Guest' ||
    status === 'Cancelled by Host' ||
    status === 'Rejected' ||
    status === 'Expired'
  ) {
    return 6
  }

  // Stage 5: Completed (Terminal positive state)
  if (status === 'Completed') {
    return 5
  }

  // Stage 4: Accepted/Verified (Confirmed booking)
  if (status === 'Accepted' || status === 'Verified') {
    return 4
  }

  // Stage 3: Virtual Meeting (In progress)
  if (status === 'VM Requested' || status === 'VM Confirmed') {
    return 3
  }

  // Stage 2: Host Countered (Waiting for guest response)
  if (status === 'Host Countered') {
    return 2
  }

  // Stage 1: Proposal Sent (Initial state, waiting for host)
  // Includes: Draft, Pending, or any unrecognized status
  return 1
}
