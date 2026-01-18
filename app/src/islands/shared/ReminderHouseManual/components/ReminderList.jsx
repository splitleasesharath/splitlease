/**
 * ReminderList Component
 *
 * Displays a list of reminders organized by status.
 */

import ReminderCard from './ReminderCard.jsx';

const ReminderList = ({
  reminders,
  pendingReminders,
  sentReminders,
  cancelledReminders,
  onEdit,
  onDelete,
  canEditReminder,
  canDeleteReminder,
  onNewReminder,
  isGuestView = false,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="rhm-list rhm-list--loading">
        <div className="rhm-list__spinner" />
        <p className="rhm-list__loading-text">Loading reminders...</p>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="rhm-list rhm-list--empty">
        <div className="rhm-list__empty-icon">📭</div>
        <h3 className="rhm-list__empty-title">No reminders yet</h3>
        <p className="rhm-list__empty-text">
          {isGuestView
            ? 'No reminders have been scheduled for your visit.'
            : 'Create your first reminder to keep guests informed.'}
        </p>
        {!isGuestView && (
          <button
            type="button"
            className="rhm-button-primary"
            onClick={onNewReminder}
          >
            Create Reminder
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rhm-list">
      {/* Pending Reminders */}
      {pendingReminders.length > 0 && (
        <div className="rhm-list__section">
          <h3 className="rhm-list__section-title">
            Pending ({pendingReminders.length})
          </h3>
          <div className="rhm-list__cards">
            {pendingReminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEditReminder(reminder)}
                canDelete={canDeleteReminder(reminder)}
                isGuestView={isGuestView}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sent Reminders */}
      {sentReminders.length > 0 && (
        <div className="rhm-list__section">
          <h3 className="rhm-list__section-title">
            Sent ({sentReminders.length})
          </h3>
          <div className="rhm-list__cards">
            {sentReminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={false}
                canDelete={false}
                isGuestView={isGuestView}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cancelled Reminders (only show to host) */}
      {!isGuestView && cancelledReminders.length > 0 && (
        <div className="rhm-list__section rhm-list__section--collapsed">
          <h3 className="rhm-list__section-title">
            Cancelled ({cancelledReminders.length})
          </h3>
          <div className="rhm-list__cards">
            {cancelledReminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={false}
                canDelete={false}
                isGuestView={isGuestView}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderList;
