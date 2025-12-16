/**
 * Determine if a guest can edit their proposal.
 *
 * @intent Enforce business rules for when proposal editing is allowed.
 * @rule Guest can only edit proposals in early stages (1-2).
 * @rule Once accepted, VM scheduled, or cancelled, editing is locked.
 * @rule Deleted proposals cannot be edited.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.proposalStatus - The "Proposal Status" field from Supabase.
 * @param {boolean} [params.deleted=false] - Whether proposal is soft-deleted.
 * @returns {boolean} True if guest can edit this proposal.
 *
 * @example
 * canEditProposal({ proposalStatus: 'Pending' })
 * // => true
 *
 * canEditProposal({ proposalStatus: 'Accepted' })
 * // => false
 */
import { getActionsForStatus } from '../../constants/proposalStatuses.js'

export function canEditProposal({ proposalStatus, deleted = false }) {
  // Deleted proposals cannot be edited
  if (deleted) {
    return false
  }

  // Validation
  if (!proposalStatus || typeof proposalStatus !== 'string') {
    return false
  }

  const status = proposalStatus.trim()
  const actions = getActionsForStatus(status)

  return actions.includes('modify_proposal') || actions.includes('edit_proposal')
}
