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

  // Editable statuses: Draft, Pending, Host Countered
  // Guest can edit when:
  // - Initial proposal not yet reviewed (Draft, Pending)
  // - Host has countered and guest needs to respond (Host Countered)
  const editableStatuses = ['Draft', 'Pending', 'Host Countered']

  return editableStatuses.includes(status)
}
