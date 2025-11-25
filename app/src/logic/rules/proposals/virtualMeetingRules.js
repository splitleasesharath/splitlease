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
 */

/**
 * Virtual Meeting State Enum
 */
export const VM_STATES = {
  NO_MEETING: 'no_meeting',
  REQUESTED_BY_GUEST: 'requested_by_guest',
  REQUESTED_BY_HOST: 'requested_by_host',
  BOOKED_AWAITING_CONFIRMATION: 'booked_awaiting_confirmation',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined'
};

/**
 * Determine the current state of a virtual meeting
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} VM_STATES value
 */
export function getVirtualMeetingState(virtualMeeting, currentUserId) {
  // State 1: No VM exists
  if (!virtualMeeting) {
    return VM_STATES.NO_MEETING;
  }

  // State 5: VM declined
  if (virtualMeeting.meetingDeclined) {
    return VM_STATES.DECLINED;
  }

  // State 4: VM confirmed by Split Lease
  if (virtualMeeting.bookedDate && virtualMeeting.confirmedBySplitlease) {
    return VM_STATES.CONFIRMED;
  }

  // State 3: VM booked but not confirmed
  if (virtualMeeting.bookedDate && !virtualMeeting.confirmedBySplitlease) {
    return VM_STATES.BOOKED_AWAITING_CONFIRMATION;
  }

  // State 2: VM requested but no booked date yet
  if (virtualMeeting.requestedBy === currentUserId) {
    return VM_STATES.REQUESTED_BY_GUEST;
  }

  // Requested by host, guest needs to respond
  return VM_STATES.REQUESTED_BY_HOST;
}

/**
 * Check if a new VM can be requested
 *
 * @param {Object} virtualMeeting - Virtual meeting object (or null)
 * @returns {boolean} True if new request can be made
 */
export function canRequestNewMeeting(virtualMeeting) {
  if (!virtualMeeting) {
    return true;
  }

  // Can request new meeting if previous was declined
  if (virtualMeeting.meetingDeclined) {
    return true;
  }

  return false;
}

/**
 * Check if guest can respond to a VM request
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if guest can respond
 */
export function canRespondToMeeting(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return false;
  }

  // Can respond if host requested and no booked date yet
  return (
    virtualMeeting.requestedBy !== currentUserId &&
    !virtualMeeting.bookedDate &&
    !virtualMeeting.meetingDeclined
  );
}

/**
 * Check if VM button should be disabled
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if button should be disabled
 */
export function isVMButtonDisabled(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return false; // Can request new meeting
  }

  // Disable if guest requested and waiting for host response
  if (
    virtualMeeting.requestedBy === currentUserId &&
    !virtualMeeting.bookedDate &&
    !virtualMeeting.meetingDeclined
  ) {
    return true;
  }

  return false;
}

/**
 * Check if meeting can be joined
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @returns {boolean} True if meeting can be joined
 */
export function canJoinMeeting(virtualMeeting) {
  if (!virtualMeeting) {
    return false;
  }

  return (
    virtualMeeting.bookedDate &&
    virtualMeeting.confirmedBySplitlease &&
    virtualMeeting.meetingLink
  );
}

/**
 * Check if meeting details can be viewed
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @returns {boolean} True if meeting details can be viewed
 */
export function canViewMeetingDetails(virtualMeeting) {
  if (!virtualMeeting) {
    return false;
  }

  return virtualMeeting.bookedDate !== null;
}

/**
 * Check if guest can cancel their own VM request
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if request can be cancelled
 */
export function canCancelVMRequest(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return false;
  }

  // Can only cancel if guest initiated the request
  // and meeting hasn't been booked or confirmed yet
  return (
    virtualMeeting.requestedBy === currentUserId &&
    !virtualMeeting.bookedDate &&
    !virtualMeeting.confirmedBySplitlease &&
    !virtualMeeting.meetingDeclined
  );
}

/**
 * Get the appropriate VM button text based on current state
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} Button text
 */
export function getVMButtonText(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return 'Request Virtual Meeting';
  }

  if (virtualMeeting.meetingDeclined) {
    return 'Request Alternative Meeting';
  }

  if (!virtualMeeting.bookedDate) {
    if (virtualMeeting.requestedBy === currentUserId) {
      return 'Meeting Requested';
    } else {
      return 'Respond to Virtual Meeting';
    }
  }

  if (virtualMeeting.bookedDate && !virtualMeeting.confirmedBySplitlease) {
    return 'View Meeting Details';
  }

  if (virtualMeeting.bookedDate && virtualMeeting.confirmedBySplitlease) {
    return 'Join Virtual Meeting';
  }

  return 'Virtual Meeting';
}

/**
 * Get button style class based on VM state
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {string} Button style class
 */
export function getVMButtonStyle(virtualMeeting, currentUserId) {
  if (!virtualMeeting) {
    return 'primary';
  }

  if (virtualMeeting.meetingDeclined) {
    return 'warning';
  }

  if (virtualMeeting.bookedDate && virtualMeeting.confirmedBySplitlease) {
    return 'success';
  }

  if (virtualMeeting.requestedBy === currentUserId && !virtualMeeting.bookedDate) {
    return 'disabled';
  }

  return 'secondary';
}

/**
 * Get comprehensive VM state info for UI rendering
 *
 * @param {Object} virtualMeeting - Virtual meeting object
 * @param {string} currentUserId - Current user's ID
 * @returns {Object} State info object
 */
export function getVMStateInfo(virtualMeeting, currentUserId) {
  const state = getVirtualMeetingState(virtualMeeting, currentUserId);

  return {
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
  };
}
