/**
 * useProposalButtonStates Hook
 *
 * PILLAR II: Rule Engines (The "Conditional" Layer)
 *
 * Computes button visibility and styling for guest proposal cards.
 * Maps Bubble.io conditional logic to React state.
 *
 * @see docs/GUEST_PROPOSALS_BUTTON_CONDITIONALS.md for full specification
 * @see tech-debt/STATUS_CONFIG_TECH_DEBT.md for future migration considerations
 */

import { useMemo } from 'react'
import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js'

// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────

const REMINDER_LIMIT = 3
const USUAL_ORDER_THRESHOLD = 5
const INVISIBLE_ACTION = 'Invisible'
const REMIND_ACTION = 'Remind Split Lease'

const BUTTON_LABELS = Object.freeze({
  VM_DECLINED: 'Virtual Meeting Declined',
  VM_CONFIRMED: 'Meeting confirmed',
  VM_ACCEPTED: 'Virtual Meeting Accepted',
  VM_REQUESTED: 'Virtual Meeting Requested',
  VM_RESPOND: 'Respond to Virtual Meeting Request',
  VM_REQUEST: 'Request Virtual Meeting',
  DELETE_PROPOSAL: 'Delete Proposal',
  REJECT_TERMS: 'Reject Modified Terms',
  SEE_MANUAL: 'See House Manual',
  CANCEL_PROPOSAL: 'Cancel Proposal'
})

const BUTTON_COLORS = Object.freeze({
  ERROR_RED: '#DB2E2E',
  DELETE_RED: '#EF4444',
  MANUAL_PURPLE: '#6D31C2'
})

const DEFAULT_BUTTON_STATE = Object.freeze({
  virtualMeeting: { visible: false },
  guestAction1: { visible: false },
  guestAction2: { visible: false },
  cancelProposal: { visible: false }
})

/**
 * Status lists for visibility rules (immutable)
 */
const VM_HIDDEN_STATUSES = Object.freeze([
  PROPOSAL_STATUS.REJECTED_BY_HOST,
  PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
  PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED,
  PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
  PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION
])

const CANCEL_HIDDEN_STATUSES = Object.freeze([
  PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
  PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION
])

const TERMINAL_STATUSES = Object.freeze([
  PROPOSAL_STATUS.CANCELLED_BY_GUEST,
  PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
  PROPOSAL_STATUS.REJECTED_BY_HOST
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isNullish = (value) => value === null || value === undefined
const isString = (value) => typeof value === 'string'
const isValidProposal = (proposal) => !isNullish(proposal)

// ─────────────────────────────────────────────────────────────
// Status Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Normalize a status string for comparison
 * @pure
 */
const normalizeStatus = (rawStatus) =>
  isString(rawStatus) ? rawStatus.trim() : rawStatus

/**
 * Normalize status list for comparison
 * @pure
 */
const normalizeStatusList = (statusList) =>
  statusList.map(normalizeStatus)

/**
 * Extract raw status from proposal object
 * @pure
 */
const extractRawStatus = (proposal) =>
  proposal?.Status || proposal?.status

/**
 * Check if status is in a given list
 * @pure
 */
const isStatusInList = (status, statusList) =>
  normalizeStatusList(statusList).includes(status)

// ─────────────────────────────────────────────────────────────
// Virtual Meeting Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isMeetingDeclined = (vm) => Boolean(vm?.['meeting declined'])
const isMeetingBooked = (vm) => Boolean(vm?.['booked date'])
const isMeetingConfirmed = (vm) => Boolean(vm?.['confirmedBySplitLease'])
const getMeetingRequester = (vm) => vm?.['requested by']

const wasRequestedByCurrentUser = (vm, currentUserId) =>
  getMeetingRequester(vm) === currentUserId

const hasExistingRequest = (vm) => Boolean(getMeetingRequester(vm))

// ─────────────────────────────────────────────────────────────
// Proposal/Guest/Listing Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const getReminderCount = (proposal) =>
  proposal?.['remindersByGuest (number)'] || 0

const hasExceededReminderLimit = (proposal) =>
  getReminderCount(proposal) > REMINDER_LIMIT

const isDocumentsReviewFinalized = (proposal) =>
  Boolean(proposal?.['guest documents review finalized?'])

const hasIdDocumentsSubmitted = (guest) =>
  Boolean(guest?.['ID documents submitted?'])

const hasHouseManual = (listing) =>
  Boolean(listing?.['House manual'])

const isAboveUsualOrderThreshold = (config) =>
  (config?.usualOrder || 0) > USUAL_ORDER_THRESHOLD

// ─────────────────────────────────────────────────────────────
// Button State Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build virtual meeting button state
 * @pure
 */
const buildVMButtonState = (vm, currentUserId, isVisible) => {
  if (!isVisible) {
    return { visible: false }
  }

  // Priority-based state determination (order matters)
  if (isMeetingDeclined(vm)) {
    return {
      visible: true,
      label: BUTTON_LABELS.VM_DECLINED,
      fontColor: BUTTON_COLORS.ERROR_RED,
      bold: true,
      tooltip: 'click to request another one',
      disabled: false
    }
  }

  if (isMeetingBooked(vm) && isMeetingConfirmed(vm)) {
    return { visible: true, label: BUTTON_LABELS.VM_CONFIRMED, disabled: true }
  }

  if (isMeetingBooked(vm)) {
    return { visible: true, label: BUTTON_LABELS.VM_ACCEPTED, disabled: true }
  }

  if (wasRequestedByCurrentUser(vm, currentUserId)) {
    return { visible: true, label: BUTTON_LABELS.VM_REQUESTED, disabled: true }
  }

  if (hasExistingRequest(vm)) {
    return { visible: true, label: BUTTON_LABELS.VM_RESPOND, disabled: false }
  }

  return { visible: true, label: BUTTON_LABELS.VM_REQUEST, disabled: false }
}

/**
 * Determine if guest action 1 should be visible
 * @pure
 */
const isGuestAction1Visible = (status, config, proposal) => {
  // Base visibility check
  if (!status || config?.guestAction1 === INVISIBLE_ACTION) {
    return false
  }

  // Reminder limit check
  if (config?.guestAction1 === REMIND_ACTION && hasExceededReminderLimit(proposal)) {
    return false
  }

  // Lease docs finalized check
  if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !isDocumentsReviewFinalized(proposal)) {
    return false
  }

  return true
}

/**
 * Build guest action 1 button state
 * @pure
 */
const buildGA1ButtonState = (status, config, proposal) => {
  const visible = isGuestAction1Visible(status, config, proposal)

  if (!visible) {
    return { visible: false }
  }

  if (status === PROPOSAL_STATUS.REJECTED_BY_HOST) {
    return {
      visible: true,
      label: BUTTON_LABELS.DELETE_PROPOSAL,
      backgroundColor: BUTTON_COLORS.DELETE_RED
    }
  }

  return { visible: true, label: config?.guestAction1 }
}

/**
 * Determine if guest action 2 should be visible
 * @pure
 */
const isGuestAction2Visible = (status, config, guest) => {
  if (config?.guestAction2 === INVISIBLE_ACTION) {
    return false
  }

  // ID docs submitted check
  if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !hasIdDocumentsSubmitted(guest)) {
    return false
  }

  return true
}

/**
 * Build guest action 2 button state
 * @pure
 */
const buildGA2ButtonState = (status, config, guest) => {
  const visible = isGuestAction2Visible(status, config, guest)

  if (!visible) {
    return { visible: false }
  }

  return { visible: true, label: config?.guestAction2 }
}

/**
 * Determine cancel button label based on status and config
 * @pure
 */
const determineCancelLabel = (status, config, listing) => {
  if (isStatusInList(status, TERMINAL_STATUSES)) {
    return BUTTON_LABELS.DELETE_PROPOSAL
  }

  if (status === PROPOSAL_STATUS.HOST_COUNTEROFFER) {
    return BUTTON_LABELS.REJECT_TERMS
  }

  if (isAboveUsualOrderThreshold(config) && hasHouseManual(listing)) {
    return BUTTON_LABELS.SEE_MANUAL
  }

  return BUTTON_LABELS.CANCEL_PROPOSAL
}

/**
 * Determine cancel button background color
 * @pure
 */
const determineCancelBackgroundColor = (status, config, listing) => {
  if (isAboveUsualOrderThreshold(config) && hasHouseManual(listing)) {
    return BUTTON_COLORS.MANUAL_PURPLE
  }
  return undefined
}

/**
 * Build cancel proposal button state
 * @pure
 */
const buildCancelButtonState = (status, config, listing) => {
  const isHidden = isStatusInList(status, CANCEL_HIDDEN_STATUSES)

  if (isHidden) {
    return { visible: false }
  }

  const label = determineCancelLabel(status, config, listing)
  const backgroundColor = determineCancelBackgroundColor(status, config, listing)

  return backgroundColor
    ? { visible: true, label, backgroundColor }
    : { visible: true, label }
}

// ─────────────────────────────────────────────────────────────
// Main Computation (Pure Function)
// ─────────────────────────────────────────────────────────────

/**
 * Compute all button states for a proposal card
 * @pure
 *
 * @param {Object} params - Input parameters
 * @returns {Object} Button states (frozen)
 */
const computeButtonStates = ({ proposal, virtualMeeting, guest, listing, currentUserId }) => {
  if (!isValidProposal(proposal)) {
    return DEFAULT_BUTTON_STATE
  }

  const rawStatus = extractRawStatus(proposal)
  const status = normalizeStatus(rawStatus)
  const config = getStatusConfig(status)

  // Compute visibility for VM button
  const isVMVisible = !isStatusInList(status, VM_HIDDEN_STATUSES)

  return Object.freeze({
    virtualMeeting: buildVMButtonState(virtualMeeting, currentUserId, isVMVisible),
    guestAction1: buildGA1ButtonState(status, config, proposal),
    guestAction2: buildGA2ButtonState(status, config, guest),
    cancelProposal: buildCancelButtonState(status, config, listing)
  })
}

// ─────────────────────────────────────────────────────────────
// React Hook (Memoized Wrapper)
// ─────────────────────────────────────────────────────────────

/**
 * Compute button states for a proposal card.
 *
 * @param {object} params
 * @param {object} params.proposal - The proposal object
 * @param {object} params.virtualMeeting - Virtual meeting data
 * @param {object} params.guest - Guest user object
 * @param {object} params.listing - Listing object
 * @param {string} params.currentUserId - Current user's ID
 * @returns {object} Button states for virtualMeeting, guestAction1, guestAction2, cancelProposal
 */
export function useProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  return useMemo(
    () => computeButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }),
    [proposal, virtualMeeting, guest, listing, currentUserId]
  )
}

// ─────────────────────────────────────────────────────────────
// Exported Constants and Helpers (for testing)
// ─────────────────────────────────────────────────────────────
export {
  REMINDER_LIMIT,
  USUAL_ORDER_THRESHOLD,
  BUTTON_LABELS,
  BUTTON_COLORS,
  DEFAULT_BUTTON_STATE,
  VM_HIDDEN_STATUSES,
  CANCEL_HIDDEN_STATUSES,
  TERMINAL_STATUSES,
  // Pure computation function (for testing without React)
  computeButtonStates
}
