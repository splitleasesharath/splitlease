/**
 * Reminder scheduling rules.
 * Boolean predicates for scheduling validation.
 */

/**
 * Check if a scheduled time is valid (in the future).
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time.
 * @param {Date} [params.now=new Date()] - Current time for comparison.
 * @returns {boolean} True if the time is in the future.
 *
 * @example
 * isValidScheduleTime({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => true (assuming current date is before Jan 20, 2026)
 */
export function isValidScheduleTime({ scheduledDateTime, now = new Date() }) {
  if (!scheduledDateTime) {
    return false;
  }

  const scheduledDate = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(scheduledDate.getTime())) {
    return false;
  }

  return scheduledDate > now;
}

/**
 * Check if a reminder can be scheduled with the given parameters.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.scheduledDateTime - Scheduled date/time.
 * @param {boolean} params.isEmailReminder - Email notification flag.
 * @param {boolean} params.isSmsReminder - SMS notification flag.
 * @param {string} [params.guestId] - Guest ID if attached.
 * @param {string} [params.fallbackEmail] - Fallback email if no guest.
 * @param {string} [params.fallbackPhone] - Fallback phone if no guest.
 * @returns {boolean} True if reminder can be scheduled.
 */
export function canScheduleReminder({
  scheduledDateTime,
  isEmailReminder,
  isSmsReminder,
  guestId,
  fallbackEmail,
  fallbackPhone,
}) {
  // Must have valid future time
  if (!isValidScheduleTime({ scheduledDateTime })) {
    return false;
  }

  // Must have at least one notification channel
  if (!isEmailReminder && !isSmsReminder) {
    return false;
  }

  // If email is enabled, must have email contact
  if (isEmailReminder && !guestId && !fallbackEmail) {
    return false;
  }

  // If SMS is enabled, must have phone contact
  if (isSmsReminder && !guestId && !fallbackPhone) {
    return false;
  }

  return true;
}

/**
 * Check if fallback contact info is required.
 *
 * @param {object} params - Named parameters.
 * @param {string} [params.guestId] - Guest ID if attached.
 * @param {boolean} params.isEmailReminder - Email notification flag.
 * @param {boolean} params.isSmsReminder - SMS notification flag.
 * @returns {object} { requiresEmail: boolean, requiresPhone: boolean }
 */
export function requiresFallbackContact({ guestId, isEmailReminder, isSmsReminder }) {
  // If guest is attached, no fallback required (contact comes from user record)
  if (guestId) {
    return {
      requiresEmail: false,
      requiresPhone: false,
    };
  }

  return {
    requiresEmail: isEmailReminder,
    requiresPhone: isSmsReminder,
  };
}

/**
 * Check if a reminder is due to be sent.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time.
 * @param {string} params.status - Current reminder status.
 * @param {Date} [params.now=new Date()] - Current time for comparison.
 * @returns {boolean} True if reminder is due and should be sent.
 */
export function isReminderDue({ scheduledDateTime, status, now = new Date() }) {
  // Must be pending
  if (status !== 'pending') {
    return false;
  }

  if (!scheduledDateTime) {
    return false;
  }

  const scheduledDate = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(scheduledDate.getTime())) {
    return false;
  }

  return scheduledDate <= now;
}

/**
 * Check if a reminder was delivered successfully.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.deliveryStatus - Delivery status.
 * @returns {boolean} True if delivered.
 */
export function isDelivered({ deliveryStatus }) {
  return deliveryStatus === 'delivered';
}

/**
 * Check if a reminder delivery failed.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.deliveryStatus - Delivery status.
 * @returns {boolean} True if failed.
 */
export function hasDeliveryFailed({ deliveryStatus }) {
  return deliveryStatus === 'bounced' || deliveryStatus === 'failed';
}
