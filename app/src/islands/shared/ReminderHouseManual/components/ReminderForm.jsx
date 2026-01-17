/**
 * ReminderForm Component
 *
 * Form for creating or editing reminders.
 * Used in both 'create' and 'update' sections.
 */

import { formatReminderType } from '../../../../logic/processors/reminders/reminderFormatter.js';

const ReminderForm = ({
  formData,
  onFieldChange,
  onMessageChange,
  onScheduledDateTimeChange,
  onEmailToggle,
  onSmsToggle,
  onReminderTypeChange,
  onVisitChange,
  onSubmit,
  onCancel,
  reminderTypeOptions,
  visits = [],
  canSubmit,
  isSubmitting,
  isEdit = false,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  // Get minimum datetime (now + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <form className="rhm-form" onSubmit={handleSubmit}>
      {/* Reminder Type */}
      <div className="rhm-form__field">
        <label htmlFor="rhm-type" className="rhm-form__label">
          Reminder Type
        </label>
        <select
          id="rhm-type"
          className="rhm-form__select"
          value={formData.reminderType}
          onChange={onReminderTypeChange}
          disabled={isSubmitting}
        >
          {reminderTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="rhm-form__field">
        <label htmlFor="rhm-message" className="rhm-form__label">
          Message <span className="rhm-form__required">*</span>
        </label>
        <textarea
          id="rhm-message"
          className="rhm-form__textarea"
          value={formData.message}
          onChange={onMessageChange}
          placeholder="Enter your reminder message..."
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
        />
        <span className="rhm-form__hint">
          {formData.message.length}/1000 characters
        </span>
      </div>

      {/* Scheduled Date/Time */}
      <div className="rhm-form__field">
        <label htmlFor="rhm-scheduled" className="rhm-form__label">
          Scheduled Time <span className="rhm-form__required">*</span>
        </label>
        <input
          id="rhm-scheduled"
          type="datetime-local"
          className="rhm-form__input"
          value={formData.scheduledDateTime}
          onChange={onScheduledDateTimeChange}
          min={getMinDateTime()}
          disabled={isSubmitting}
        />
      </div>

      {/* Visit Selection (Optional) */}
      {visits.length > 0 && (
        <div className="rhm-form__field">
          <label htmlFor="rhm-visit" className="rhm-form__label">
            Link to Visit (Optional)
          </label>
          <select
            id="rhm-visit"
            className="rhm-form__select"
            value={formData.visitId}
            onChange={onVisitChange}
            disabled={isSubmitting}
          >
            <option value="">No specific visit</option>
            {visits.map(visit => (
              <option key={visit._id || visit.id} value={visit._id || visit.id}>
                {visit.guest?.firstName || visit.guest?.name || 'Guest'} - {visit.checkIn || 'Upcoming'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Notification Channels */}
      <div className="rhm-form__field">
        <label className="rhm-form__label">
          Notification Channels <span className="rhm-form__required">*</span>
        </label>
        <div className="rhm-form__checkboxes">
          <label className="rhm-form__checkbox-label">
            <input
              type="checkbox"
              className="rhm-form__checkbox"
              checked={formData.isEmailReminder}
              onChange={onEmailToggle}
              disabled={isSubmitting}
            />
            <span className="rhm-form__checkbox-text">Email</span>
          </label>
          <label className="rhm-form__checkbox-label">
            <input
              type="checkbox"
              className="rhm-form__checkbox"
              checked={formData.isSmsReminder}
              onChange={onSmsToggle}
              disabled={isSubmitting}
            />
            <span className="rhm-form__checkbox-text">SMS</span>
          </label>
        </div>
        {!formData.isEmailReminder && !formData.isSmsReminder && (
          <span className="rhm-form__error-text">
            Select at least one notification channel
          </span>
        )}
      </div>

      {/* Fallback Contact (when no visit/guest selected) */}
      {!formData.guestId && (
        <>
          {formData.isEmailReminder && (
            <div className="rhm-form__field">
              <label htmlFor="rhm-fallback-email" className="rhm-form__label">
                Recipient Email <span className="rhm-form__required">*</span>
              </label>
              <input
                id="rhm-fallback-email"
                type="email"
                className="rhm-form__input"
                value={formData.fallbackEmail}
                onChange={(e) => onFieldChange('fallbackEmail', e.target.value)}
                placeholder="recipient@email.com"
                disabled={isSubmitting}
              />
            </div>
          )}

          {formData.isSmsReminder && (
            <div className="rhm-form__field">
              <label htmlFor="rhm-fallback-phone" className="rhm-form__label">
                Recipient Phone <span className="rhm-form__required">*</span>
              </label>
              <input
                id="rhm-fallback-phone"
                type="tel"
                className="rhm-form__input"
                value={formData.fallbackPhone}
                onChange={(e) => onFieldChange('fallbackPhone', e.target.value)}
                placeholder="+15551234567"
                disabled={isSubmitting}
              />
              <span className="rhm-form__hint">
                Use E.164 format (e.g., +15551234567)
              </span>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="rhm-form__actions">
        <button
          type="button"
          className="rhm-button-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rhm-button-primary"
          disabled={!canSubmit}
        >
          {isSubmitting
            ? (isEdit ? 'Updating...' : 'Creating...')
            : (isEdit ? 'Update Reminder' : 'Create Reminder')
          }
        </button>
      </div>
    </form>
  );
};

export default ReminderForm;
