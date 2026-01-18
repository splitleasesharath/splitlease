/**
 * ReminderCard Component
 *
 * Displays a single reminder with status, schedule, and actions.
 */

import {
  formatScheduledTime,
  formatRelativeTime,
  formatReminderType,
  formatReminderStatus,
  formatDeliveryStatus,
  formatNotificationChannels,
  truncateMessage,
} from '../../../../logic/processors/reminders/reminderFormatter.js';

const ReminderCard = ({
  reminder,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  isGuestView = false,
}) => {
  const typeConfig = formatReminderType({ reminderType: reminder.reminderType });
  const statusConfig = formatReminderStatus({ status: reminder.status });
  const deliveryConfig = formatDeliveryStatus({ deliveryStatus: reminder.deliveryStatus });

  const scheduledTime = formatScheduledTime({ scheduledDateTime: reminder.scheduledDateTime });
  const relativeTime = formatRelativeTime({ scheduledDateTime: reminder.scheduledDateTime });
  const channels = formatNotificationChannels({
    isEmailReminder: reminder.isEmailReminder,
    isSmsReminder: reminder.isSmsReminder,
  });

  return (
    <div className={`rhm-card rhm-card--${reminder.status}`}>
      {/* Header */}
      <div className="rhm-card__header">
        <div className="rhm-card__type">
          <span className="rhm-card__type-icon">{typeConfig.icon}</span>
          <span className="rhm-card__type-label">{typeConfig.label}</span>
        </div>
        <div
          className="rhm-card__status"
          style={{ backgroundColor: statusConfig.color }}
        >
          {statusConfig.label}
        </div>
      </div>

      {/* Message */}
      <div className="rhm-card__message">
        {truncateMessage({ message: reminder.message, maxLength: 150 })}
      </div>

      {/* Details */}
      <div className="rhm-card__details">
        <div className="rhm-card__detail">
          <span className="rhm-card__detail-icon">🕐</span>
          <span className="rhm-card__detail-text">{scheduledTime}</span>
          {reminder.status === 'pending' && (
            <span className="rhm-card__detail-relative">({relativeTime})</span>
          )}
        </div>

        <div className="rhm-card__detail">
          <span className="rhm-card__detail-icon">📬</span>
          <span className="rhm-card__detail-text">{channels}</span>
        </div>

        {/* Show delivery status for sent reminders */}
        {reminder.status === 'sent' && (
          <div className="rhm-card__detail">
            <span className="rhm-card__detail-icon">✓</span>
            <span
              className="rhm-card__delivery-status"
              style={{ color: deliveryConfig.color }}
            >
              {deliveryConfig.label}
            </span>
            {reminder.deliveredAt && (
              <span className="rhm-card__detail-time">
                at {formatScheduledTime({ scheduledDateTime: reminder.deliveredAt })}
              </span>
            )}
          </div>
        )}

        {/* Show open tracking for emails */}
        {reminder.openedAt && (
          <div className="rhm-card__detail">
            <span className="rhm-card__detail-icon">👁️</span>
            <span className="rhm-card__detail-text">
              Opened {formatScheduledTime({ scheduledDateTime: reminder.openedAt })}
            </span>
          </div>
        )}
      </div>

      {/* Actions (hidden for guest view) */}
      {!isGuestView && (canEdit || canDelete) && (
        <div className="rhm-card__actions">
          {canEdit && (
            <button
              type="button"
              className="rhm-card__action rhm-card__action--edit"
              onClick={() => onEdit(reminder)}
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="rhm-card__action rhm-card__action--delete"
              onClick={() => onDelete(reminder)}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReminderCard;
