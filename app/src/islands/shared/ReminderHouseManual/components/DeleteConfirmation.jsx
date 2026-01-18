/**
 * DeleteConfirmation Component
 *
 * Confirmation dialog for cancelling a reminder.
 */

import {
  formatScheduledTime,
  formatReminderType,
  truncateMessage,
} from '../../../../logic/processors/reminders/reminderFormatter.js';

const DeleteConfirmation = ({
  reminder,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!reminder) {
    return null;
  }

  const typeConfig = formatReminderType({ reminderType: reminder.reminderType });
  const scheduledTime = formatScheduledTime({ scheduledDateTime: reminder.scheduledDateTime });

  return (
    <div className="rhm-delete">
      <div className="rhm-delete__icon">
        <span role="img" aria-label="Warning">&#x26A0;&#xFE0F;</span>
      </div>

      <h3 className="rhm-delete__title">Cancel Reminder?</h3>

      <p className="rhm-delete__description">
        Are you sure you want to cancel this reminder? This action cannot be undone.
      </p>

      {/* Reminder Summary */}
      <div className="rhm-delete__summary">
        <div className="rhm-delete__summary-row">
          <span className="rhm-delete__summary-label">Type:</span>
          <span className="rhm-delete__summary-value">
            {typeConfig.icon} {typeConfig.label}
          </span>
        </div>

        <div className="rhm-delete__summary-row">
          <span className="rhm-delete__summary-label">Scheduled:</span>
          <span className="rhm-delete__summary-value">{scheduledTime}</span>
        </div>

        <div className="rhm-delete__summary-row">
          <span className="rhm-delete__summary-label">Message:</span>
          <span className="rhm-delete__summary-value">
            {truncateMessage({ message: reminder.message, maxLength: 100 })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="rhm-delete__actions">
        <button
          type="button"
          className="rhm-button-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Keep Reminder
        </button>
        <button
          type="button"
          className="rhm-button-danger"
          onClick={() => onConfirm(reminder)}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Cancelling...' : 'Cancel Reminder'}
        </button>
      </div>
    </div>
  );
};

export default DeleteConfirmation;
