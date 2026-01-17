/**
 * Reminder validation rules.
 * Boolean predicates for reminder form validation and permissions.
 */

/**
 * Check if a user can create reminders for a house manual.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.houseManualId - House manual ID.
 * @param {string} params.creatorId - ID of the user creating the reminder.
 * @returns {boolean} True if user can create reminders.
 */
export function canCreateReminder({ houseManualId, creatorId }) {
  // Must have both IDs
  if (!houseManualId || !creatorId) {
    return false;
  }

  return true;
}

/**
 * Check if a user can update a reminder.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.reminder - Reminder object.
 * @param {string} params.userId - ID of the user attempting to update.
 * @returns {boolean} True if user can update the reminder.
 */
export function canUpdateReminder({ reminder, userId }) {
  if (!reminder || !userId) {
    return false;
  }

  // Only the creator can update
  const creatorId = reminder['Created By'] || reminder.createdBy || reminder.creator_id;
  return creatorId === userId;
}

/**
 * Check if a user can delete (cancel) a reminder.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.reminder - Reminder object.
 * @param {string} params.userId - ID of the user attempting to delete.
 * @returns {boolean} True if user can delete the reminder.
 */
export function canDeleteReminder({ reminder, userId }) {
  if (!reminder || !userId) {
    return false;
  }

  // Can't delete already sent or cancelled reminders
  const status = reminder.status;
  if (status === 'sent' || status === 'cancelled') {
    return false;
  }

  // Only the creator can delete
  const creatorId = reminder['Created By'] || reminder.createdBy || reminder.creator_id;
  return creatorId === userId;
}

/**
 * Check if reminder form can be submitted.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.message - Reminder message.
 * @param {string} params.scheduledDateTime - Scheduled date/time.
 * @param {boolean} params.isEmailReminder - Email enabled flag.
 * @param {boolean} params.isSmsReminder - SMS enabled flag.
 * @param {boolean} [params.isSubmitting=false] - Whether submission is in progress.
 * @returns {boolean} True if form can be submitted.
 */
export function canSubmitReminder({
  message,
  scheduledDateTime,
  isEmailReminder,
  isSmsReminder,
  isSubmitting = false,
}) {
  if (isSubmitting) {
    return false;
  }

  // Message required
  if (!message || message.trim().length === 0) {
    return false;
  }

  // Scheduled time required
  if (!scheduledDateTime) {
    return false;
  }

  // At least one notification channel required
  if (!isEmailReminder && !isSmsReminder) {
    return false;
  }

  return true;
}

/**
 * Check if a reminder message is valid.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.message - The message to validate.
 * @param {number} [params.maxLength=1000] - Maximum message length.
 * @returns {boolean} True if message is valid.
 */
export function isValidReminderMessage({ message, maxLength = 1000 }) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

/**
 * Check if reminder status allows editing.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.status - Reminder status.
 * @returns {boolean} True if reminder can be edited.
 */
export function canEditReminder({ status }) {
  // Only pending reminders can be edited
  return status === 'pending';
}
