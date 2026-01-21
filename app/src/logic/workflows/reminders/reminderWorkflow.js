/**
 * Reminder workflows.
 * Orchestrate reminder CRUD operations with validation.
 */

import { canCreateReminder, canUpdateReminder, canDeleteReminder } from '../../rules/reminders/reminderValidation.js';
import { canScheduleReminder } from '../../rules/reminders/reminderScheduling.js';
import { adaptReminderForSubmission, adaptReminderUpdateForSubmission } from '../../processors/reminders/reminderAdapter.js';

/**
 * Create reminder workflow.
 * Validates inputs and prepares payload for API submission.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.formData - Form data from UI.
 * @param {string} params.houseManualId - House manual ID.
 * @param {string} params.creatorId - Creator user ID.
 * @returns {object} { canProceed: boolean, payload?: object, error?: string }
 */
export function createReminderWorkflow({ formData, houseManualId, creatorId }) {
  // Check if user can create reminders
  if (!canCreateReminder({ houseManualId, creatorId })) {
    return {
      canProceed: false,
      error: 'You do not have permission to create reminders for this house manual.',
    };
  }

  // Check if reminder can be scheduled
  const canSchedule = canScheduleReminder({
    scheduledDateTime: formData.scheduledDateTime,
    isEmailReminder: formData.isEmailReminder,
    isSmsReminder: formData.isSmsReminder,
    guestId: formData.guestId,
    fallbackEmail: formData.fallbackEmail,
    fallbackPhone: formData.fallbackPhone,
  });

  if (!canSchedule) {
    // Determine specific error
    if (!formData.scheduledDateTime) {
      return { canProceed: false, error: 'Please select a scheduled time.' };
    }

    const scheduledDate = new Date(formData.scheduledDateTime);
    if (scheduledDate <= new Date()) {
      return { canProceed: false, error: 'Scheduled time must be in the future.' };
    }

    if (!formData.isEmailReminder && !formData.isSmsReminder) {
      return { canProceed: false, error: 'Please enable at least one notification channel.' };
    }

    if (formData.isEmailReminder && !formData.guestId && !formData.fallbackEmail) {
      return { canProceed: false, error: 'Please provide a fallback email address.' };
    }

    if (formData.isSmsReminder && !formData.guestId && !formData.fallbackPhone) {
      return { canProceed: false, error: 'Please provide a fallback phone number.' };
    }

    return { canProceed: false, error: 'Invalid reminder configuration.' };
  }

  // Adapt form data for API
  const payload = adaptReminderForSubmission({ formData, houseManualId, creatorId });

  return {
    canProceed: true,
    payload,
  };
}

/**
 * Update reminder workflow.
 * Validates inputs and prepares payload for API submission.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.reminder - Existing reminder object.
 * @param {object} params.updates - Fields to update.
 * @param {string} params.userId - Current user ID.
 * @returns {object} { canProceed: boolean, payload?: object, error?: string }
 */
export function updateReminderWorkflow({ reminder, updates, userId }) {
  // Check if user can update
  if (!canUpdateReminder({ reminder, userId })) {
    return {
      canProceed: false,
      error: 'You do not have permission to update this reminder.',
    };
  }

  // Check if reminder is still editable
  if (reminder.status !== 'pending') {
    return {
      canProceed: false,
      error: 'This reminder has already been sent or cancelled.',
    };
  }

  // If updating scheduled time, validate it's in the future
  if (updates.scheduledDateTime) {
    const scheduledDate = new Date(updates.scheduledDateTime);
    if (scheduledDate <= new Date()) {
      return {
        canProceed: false,
        error: 'Scheduled time must be in the future.',
      };
    }
  }

  // Adapt updates for API
  const payload = adaptReminderUpdateForSubmission({
    reminderId: reminder.id || reminder._id,
    updates,
  });

  return {
    canProceed: true,
    payload,
  };
}

/**
 * Delete reminder workflow.
 * Validates permissions before allowing deletion.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.reminder - Reminder to delete.
 * @param {string} params.userId - Current user ID.
 * @returns {object} { canProceed: boolean, reminderId?: string, error?: string }
 */
export function deleteReminderWorkflow({ reminder, userId }) {
  // Check if user can delete
  if (!canDeleteReminder({ reminder, userId })) {
    if (reminder.status === 'sent') {
      return {
        canProceed: false,
        error: 'This reminder has already been sent.',
      };
    }

    if (reminder.status === 'cancelled') {
      return {
        canProceed: false,
        error: 'This reminder has already been cancelled.',
      };
    }

    return {
      canProceed: false,
      error: 'You do not have permission to cancel this reminder.',
    };
  }

  return {
    canProceed: true,
    reminderId: reminder.id || reminder._id,
  };
}
