/**
 * Virtual Meeting Admin Rules
 * Boolean predicates for admin operations on virtual meetings
 *
 * These are pure functions that return boolean values based on meeting state.
 * They are used to determine what actions an admin can take on a meeting.
 *
 * Naming Convention:
 * - can* = permission check (returns boolean)
 * - is* = state check (returns boolean)
 * - get* = derive value (returns non-boolean)
 */

/**
 * Check if a meeting can be confirmed by admin
 * A meeting can be confirmed if:
 * - It exists
 * - It has status 'new_request'
 * - It has no booked date yet
 * - It has at least one suggested date
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function canConfirmMeeting(meeting) {
  if (!meeting) return false;

  return (
    meeting.status === 'new_request' &&
    !meeting.booked_date &&
    Array.isArray(meeting.suggested_dates_and_times) &&
    meeting.suggested_dates_and_times.length > 0
  );
}

/**
 * Check if a meeting can be deleted by admin
 * A meeting can be deleted if:
 * - It exists
 * - It is not confirmed or completed
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function canDeleteMeeting(meeting) {
  if (!meeting) return false;

  // Can delete if not yet confirmed or if already cancelled
  return meeting.status !== 'confirmed' && meeting.status !== 'completed';
}

/**
 * Check if meeting dates can be edited by admin
 * Dates can be edited if:
 * - Meeting exists
 * - Meeting has not been confirmed yet
 * - Meeting status is 'new_request'
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function canEditMeetingDates(meeting) {
  if (!meeting) return false;

  return !meeting.booked_date && meeting.status === 'new_request';
}

/**
 * Check if a confirmed meeting can be rescheduled
 * A meeting can be rescheduled if:
 * - It exists
 * - It has a booked date
 * - It is not completed or cancelled
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function canRescheduleMeeting(meeting) {
  if (!meeting) return false;

  return (
    meeting.booked_date &&
    meeting.status === 'confirmed'
  );
}

/**
 * Check if a time slot can be blocked for a host
 * A slot can be blocked if:
 * - Slot has valid date, start, and end times
 * - Slot does not overlap with existing blocks
 *
 * @param {Object} slot - The time slot { date, startTime, endTime }
 * @param {Array} existingBlocks - Existing blocked slots for the host
 * @returns {boolean}
 */
export function canBlockTimeSlot(slot, existingBlocks = []) {
  if (!slot?.date || !slot?.startTime || !slot?.endTime) return false;

  // Check if slot overlaps with existing blocks
  const hasOverlap = existingBlocks.some(block => {
    // Skip if different date
    if (block.date !== slot.date) return false;

    // Check for full day block
    if (block.is_full_day_blocked) return true;

    // Check time overlap
    const slotStart = slot.startTime;
    const slotEnd = slot.endTime;
    const blockStart = block.start_time;
    const blockEnd = block.end_time;

    return (
      (slotStart >= blockStart && slotStart < blockEnd) ||
      (slotEnd > blockStart && slotEnd <= blockEnd) ||
      (slotStart <= blockStart && slotEnd >= blockEnd)
    );
  });

  return !hasOverlap;
}

/**
 * Check if a day can be fully blocked for a host
 * A day can be blocked if no individual slot blocks exist for that day
 *
 * @param {string} date - The date string (YYYY-MM-DD)
 * @param {Array} existingBlocks - Existing blocked slots for the host
 * @returns {boolean}
 */
export function canBlockFullDay(date, existingBlocks = []) {
  if (!date) return false;

  // Check if there are any partial blocks on this day
  const hasPartialBlocks = existingBlocks.some(
    block => block.date === date && !block.is_full_day_blocked
  );

  // Check if already fully blocked
  const isAlreadyBlocked = existingBlocks.some(
    block => block.date === date && block.is_full_day_blocked
  );

  return !hasPartialBlocks && !isAlreadyBlocked;
}

/**
 * Check if a meeting has passed (for cleanup purposes)
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function isMeetingInPast(meeting) {
  if (!meeting?.booked_date) return false;

  const bookedDate = new Date(meeting.booked_date);
  const now = new Date();

  return bookedDate < now;
}

/**
 * Check if a meeting is pending action (needs admin attention)
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {boolean}
 */
export function isPendingAdminAction(meeting) {
  if (!meeting) return false;

  return meeting.status === 'new_request' && !meeting.booked_date;
}

/**
 * Get meeting status information for display
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {Object} { status, label, color, icon }
 */
export function getMeetingStatusInfo(meeting) {
  const statusMap = {
    new_request: {
      label: 'Pending',
      color: 'warning',
      icon: 'clock'
    },
    confirmed: {
      label: 'Confirmed',
      color: 'success',
      icon: 'check-circle'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'error',
      icon: 'x-circle'
    },
    completed: {
      label: 'Completed',
      color: 'info',
      icon: 'check-double'
    },
    rescheduled: {
      label: 'Rescheduled',
      color: 'warning',
      icon: 'calendar-refresh'
    }
  };

  const status = meeting?.status || 'unknown';
  return statusMap[status] || {
    label: 'Unknown',
    color: 'default',
    icon: 'question'
  };
}

/**
 * Get urgency level for a pending meeting request
 * Based on how long the request has been waiting
 *
 * @param {Object|null} meeting - The meeting object
 * @returns {string} 'normal' | 'elevated' | 'urgent'
 */
export function getMeetingUrgency(meeting) {
  if (!meeting?.created_at) return 'normal';

  const createdAt = new Date(meeting.created_at);
  const now = new Date();
  const hoursWaiting = (now - createdAt) / (1000 * 60 * 60);

  if (hoursWaiting > 48) return 'urgent';
  if (hoursWaiting > 24) return 'elevated';
  return 'normal';
}
