import { getActionsForStatus } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const EDIT_ACTIONS = Object.freeze(['modify_proposal', 'edit_proposal'])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0

/**
 * Check if actions list includes any edit action
 * @pure
 */
const hasEditAction = (actions) =>
  EDIT_ACTIONS.some((editAction) => actions.includes(editAction))

/**
 * Determine if a guest can edit their proposal.
 *
 * @intent Enforce business rules for when proposal editing is allowed.
 * @rule Guest can only edit proposals in early stages (1-2).
 * @rule Once accepted, VM scheduled, or cancelled, editing is locked.
 * @rule Deleted proposals cannot be edited.
 * @pure Yes - deterministic, no side effects
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
  // Guard: Deleted proposals cannot be edited
  if (deleted) {
    return false
  }

  // Guard: Invalid status means cannot edit
  if (!isNonEmptyString(proposalStatus)) {
    return false
  }

  // Pure transformation pipeline
  const normalizedStatus = proposalStatus.trim()
  const allowedActions = getActionsForStatus(normalizedStatus)

  // Predicate application
  return hasEditAction(allowedActions)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { EDIT_ACTIONS }
