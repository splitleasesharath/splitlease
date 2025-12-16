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
import { getStageFromStatus, isTerminalStatus } from '../../constants/proposalStatuses.js'

export function determineProposalStage({ proposalStatus, deleted = false }) {
  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    throw new Error('determineProposalStage: proposalStatus is required and must be a string')
  }

  // Deleted proposals are always stage 6 (Cancelled)
  if (deleted) {
    return 6
  }

  const status = proposalStatus.trim()

  if (isTerminalStatus(status)) {
    return 6
  }

  const stage = getStageFromStatus(status)
  return stage ?? 1
}
