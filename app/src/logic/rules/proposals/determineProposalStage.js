import { getStageFromStatus, isTerminalStatus } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const STAGE_CANCELLED = 6
const STAGE_DEFAULT = 1

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0

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
 * @pure Yes - deterministic, no side effects
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
  // Validation: Status is required
  if (!isNonEmptyString(proposalStatus)) {
    throw new Error('determineProposalStage: proposalStatus is required and must be a string')
  }

  // Guard: Deleted proposals are always stage 6 (Cancelled)
  if (deleted) {
    return STAGE_CANCELLED
  }

  // Pure transformation
  const normalizedStatus = proposalStatus.trim()

  // Guard: Terminal statuses are stage 6
  if (isTerminalStatus(normalizedStatus)) {
    return STAGE_CANCELLED
  }

  // Get stage from status lookup, default to stage 1
  const stage = getStageFromStatus(normalizedStatus)
  return stage ?? STAGE_DEFAULT
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { STAGE_CANCELLED, STAGE_DEFAULT }
