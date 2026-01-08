/**
 * Virtual Meeting Business Rules
 *
 * PILLAR II: Rule Engines (The "Conditional" Layer)
 *
 * This module encapsulates the predicate functions for virtual meetings.
 * Based on Bubble.io's 5-state virtual meeting workflow.
 *
 * Virtual Meeting States:
 * 1. No VM exists -> Show "Request Virtual Meeting" button
 * 2. VM requested by host -> Show "Respond to Virtual Meeting"
 * 3. VM booked but not confirmed -> Show meeting details, await confirmation
 * 4. VM confirmed by Split Lease -> Show meeting link and join button
 * 5. VM declined -> Show "Request Alternative Meeting" button
 *
 * @pure Yes - All functions are deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants (Immutable)
// ─────────────────────────────────────────────────────────────

/**
 * Virtual Meeting State Enum
 *
 * IMPORTANT: State names are PERSPECTIVE-NEUTRAL
 * - REQUESTED_BY_ME: Current user requested, waiting for other party's response
 * - REQUESTED_BY_OTHER: Other party requested, current user should respond
 *
 * Legacy aliases are provided for backward compatibility with existing code.
 */
export const VM_STATES = Object.freeze({
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_ME: 'requested_by_me',           // Current user requested
  REQUESTED_BY_OTHER: 'requested_by_other',     // Other party requested
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  // Legacy aliases (for backward compatibility - will be removed in future)
  REQUESTED_BY_GUEST: 'requested_by_me',        // Alias → REQUESTED_BY_ME
  REQUESTED_BY_HOST: 'requested_by_other'       // Alias → REQUESTED_BY_OTHER
})

const BUTTON_TEXT = Object.freeze({
  REQUEST: 'Request Virtual Meeting',
  REQUEST_ALTERNATIVE: 'Request Alternative Meeting',
  MEETING_REQUESTED: 'Meeting Requested',
  RESPOND: 'Respond to Virtual Meeting',
  VIEW_DETAILS: 'View Meeting Details',
  JOIN: 'Join Virtual Meeting',
  DEFAULT: 'Virtual Meeting'
})

const BUTTON_STYLES = Object.freeze({
  PRIMARY: 'primary',
  WARNING: 'warning',
  SUCCESS: 'success',
  DISABLED: 'disabled',
  SECONDARY: 'secondary'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isNullish = (value) => value === null || value === undefined
const hasValidMeeting = (vm) => !isNullish(vm)

// ─────────────────────────────────────────────────────────────
// VM State Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────
const isDeclined = (vm) => Boolean(vm?.meetingDeclined)
const isBooked = (vm) => Boolean(vm?.bookedDate)
const isConfirmed = (vm) => Boolean(vm?.confirmedBySplitlease)
const hasBookedDate = (vm) => Boolean(vm?.bookedDate)
const hasMeetingLink = (vm) => Boolean(vm?.meetingLink)
const wasRequestedByUser = (vm, userId) => vm?.requestedBy === userId

// ─────────────────────────────────────────────────────────────
// State Determination (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Determine the current state of a virtual meeting
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} VM_STATES value
 */
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  // State 1: No VM exists
  if (!hasValidMeeting(virtualMeeting)) {
    return VM_STATES.NO_MEETING
  }

  // State 5: VM declined
  if (isDeclined(virtualMeeting)) {
    return VM_STATES.DECLINED
  }

  // State 4: VM confirmed by Split Lease
  if (isBooked(virtualMeeting) && isConfirmed(virtualMeeting)) {
    return VM_STATES.CONFIRMED
  }

  // State 3: VM booked but not confirmed
  if (isBooked(virtualMeeting) && !isConfirmed(virtualMeeting)) {
    return VM_STATES.BOOKED_AWAITING_CONFIRMATION
  }

  // State 2: VM requested but no booked date yet
  if (wasRequestedByUser(virtualMeeting, currentUserId)) {
    return VM_STATES.REQUESTED_BY_ME
  }

  // Other party requested, current user should respond
  return VM_STATES.REQUESTED_BY_OTHER
}

// ─────────────────────────────────────────────────────────────
// Request Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if a new VM can be requested
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object (or null)
 * @returns {boolean} True if new request can be made
 */
export function canRequestNewMeeting(virtualMeeting) {
  // No meeting exists - can request
  if (!hasValidMeeting(virtualMeeting)) {
    return true
  }

  // Can request new meeting if previous was declined
  return isDeclined(virtualMeeting)
}

/**
 * Check if guest can respond to a VM request
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if guest can respond
 */
export function canRespondToMeeting(virtualMeeting, currentUserId) {
  if (!hasValidMeeting(virtualMeeting)) {
    return false
  }

  // Can respond if host requested and no booked date yet
  return (
    !wasRequestedByUser(virtualMeeting, currentUserId) &&
    !hasBookedDate(virtualMeeting) &&
    !isDeclined(virtualMeeting)
  )
}

// ─────────────────────────────────────────────────────────────
// Button State Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if VM button should be disabled
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if button should be disabled
 */
export function isVMButtonDisabled(virtualMeeting, currentUserId) {
  // No meeting - can request new
  if (!hasValidMeeting(virtualMeeting)) {
    return false
  }

  // Disable if current user requested and waiting for response
  return (
    wasRequestedByUser(virtualMeeting, currentUserId) &&
    !hasBookedDate(virtualMeeting) &&
    !isDeclined(virtualMeeting)
  )
}

// ─────────────────────────────────────────────────────────────
// Meeting Action Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if meeting can be joined
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @returns {boolean} True if meeting can be joined
 */
export function canJoinMeeting(virtualMeeting) {
  if (!hasValidMeeting(virtualMeeting)) {
    return false
  }

  return (
    hasBookedDate(virtualMeeting) &&
    isConfirmed(virtualMeeting) &&
    hasMeetingLink(virtualMeeting)
  )
}

/**
 * Check if meeting details can be viewed
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @returns {boolean} True if meeting details can be viewed
 */
export function canViewMeetingDetails(virtualMeeting) {
  if (!hasValidMeeting(virtualMeeting)) {
    return false
  }

  return hasBookedDate(virtualMeeting)
}

/**
 * Check if guest can cancel their own VM request
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if request can be cancelled
 */
export function canCancelVMRequest(virtualMeeting, currentUserId) {
  if (!hasValidMeeting(virtualMeeting)) {
    return false
  }

  // Can only cancel if user initiated the request
  // and meeting hasn't been booked or confirmed yet
  return (
    wasRequestedByUser(virtualMeeting, currentUserId) &&
    !hasBookedDate(virtualMeeting) &&
    !isConfirmed(virtualMeeting) &&
    !isDeclined(virtualMeeting)
  )
}

// ─────────────────────────────────────────────────────────────
// UI Helper Rules (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Get the appropriate VM button text based on current state
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} Button text
 */
export function getVMButtonText(virtualMeeting, currentUserId) {
  // No meeting - request new
  if (!hasValidMeeting(virtualMeeting)) {
    return BUTTON_TEXT.REQUEST
  }

  // Declined - request alternative
  if (isDeclined(virtualMeeting)) {
    return BUTTON_TEXT.REQUEST_ALTERNATIVE
  }

  // Not booked yet
  if (!hasBookedDate(virtualMeeting)) {
    return wasRequestedByUser(virtualMeeting, currentUserId)
      ? BUTTON_TEXT.MEETING_REQUESTED
      : BUTTON_TEXT.RESPOND
  }

  // Booked but not confirmed
  if (hasBookedDate(virtualMeeting) && !isConfirmed(virtualMeeting)) {
    return BUTTON_TEXT.VIEW_DETAILS
  }

  // Booked and confirmed
  if (hasBookedDate(virtualMeeting) && isConfirmed(virtualMeeting)) {
    return BUTTON_TEXT.JOIN
  }

  return BUTTON_TEXT.DEFAULT
}

/**
 * Get button style class based on VM state
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} Button style class
 */
export function getVMButtonStyle(virtualMeeting, currentUserId) {
  // No meeting
  if (!hasValidMeeting(virtualMeeting)) {
    return BUTTON_STYLES.PRIMARY
  }

  // Declined
  if (isDeclined(virtualMeeting)) {
    return BUTTON_STYLES.WARNING
  }

  // Confirmed
  if (hasBookedDate(virtualMeeting) && isConfirmed(virtualMeeting)) {
    return BUTTON_STYLES.SUCCESS
  }

  // Waiting for response
  if (wasRequestedByUser(virtualMeeting, currentUserId) && !hasBookedDate(virtualMeeting)) {
    return BUTTON_STYLES.DISABLED
  }

  return BUTTON_STYLES.SECONDARY
}

/**
 * Get comprehensive VM state info for UI rendering
 * @pure
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {Object} State info object (frozen)
 */
export function getVMStateInfo(virtualMeeting, currentUserId) {
  const state = getVirtualMeetingState(virtualMeeting, currentUserId)

  return Object.freeze({
    state,
    showButton: true,
    buttonText: getVMButtonText(virtualMeeting, currentUserId),
    buttonStyle: getVMButtonStyle(virtualMeeting, currentUserId),
    buttonDisabled: isVMButtonDisabled(virtualMeeting, currentUserId),
    canRequest: canRequestNewMeeting(virtualMeeting),
    canRespond: canRespondToMeeting(virtualMeeting, currentUserId),
    canJoin: canJoinMeeting(virtualMeeting),
    canViewDetails: canViewMeetingDetails(virtualMeeting),
    canCancel: canCancelVMRequest(virtualMeeting, currentUserId)
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { BUTTON_TEXT, BUTTON_STYLES }
