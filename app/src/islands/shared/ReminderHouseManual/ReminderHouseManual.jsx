/**
 * ReminderHouseManual Component
 *
 * Modal for managing house manual reminders.
 * Follows the Hollow Component Pattern - delegates all logic to useReminderHouseManualLogic.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {function} props.onClose - Close handler
 * @param {string} props.houseManualId - House manual ID
 * @param {string} props.creatorId - Current user ID
 * @param {Array} [props.visits] - Available visits for dropdown
 * @param {string} [props.initialSection] - Starting section (list, create, update, delete)
 * @param {object} [props.selectedReminder] - Pre-selected reminder for edit/delete
 * @param {boolean} [props.isGuestView] - Whether this is guest read-only view
 * @param {string} [props.visitId] - Visit ID for guest view
 */

import useReminderHouseManualLogic from './useReminderHouseManualLogic.js';
import ReminderList from './components/ReminderList.jsx';
import ReminderForm from './components/ReminderForm.jsx';
import DeleteConfirmation from './components/DeleteConfirmation.jsx';
import './ReminderHouseManual.css';

const ReminderHouseManual = ({
  isOpen,
  onClose,
  houseManualId,
  creatorId,
  visits = [],
  initialSection = 'list',
  selectedReminder = null,
  isGuestView = false,
  visitId = null,
}) => {
  const logic = useReminderHouseManualLogic({
    houseManualId,
    creatorId,
    visits,
    isVisible: isOpen,
    initialSection,
    selectedReminder,
    isGuestView,
    visitId,
  });

  if (!isOpen) {
    return null;
  }

  const renderContent = () => {
    switch (logic.section) {
      case 'create':
        return (
          <ReminderForm
            formData={logic.formData}
            onFieldChange={logic.handleFieldChange}
            onMessageChange={logic.handleMessageChange}
            onScheduledDateTimeChange={logic.handleScheduledDateTimeChange}
            onEmailToggle={logic.handleEmailToggle}
            onSmsToggle={logic.handleSmsToggle}
            onReminderTypeChange={logic.handleReminderTypeChange}
            onVisitChange={logic.handleVisitChange}
            onSubmit={logic.handleCreate}
            onCancel={logic.handleCancelEdit}
            reminderTypeOptions={logic.reminderTypeOptions}
            visits={visits}
            canSubmit={logic.canSubmit}
            isSubmitting={logic.isSubmitting}
            isEdit={false}
          />
        );

      case 'update':
        return (
          <ReminderForm
            formData={logic.formData}
            onFieldChange={logic.handleFieldChange}
            onMessageChange={logic.handleMessageChange}
            onScheduledDateTimeChange={logic.handleScheduledDateTimeChange}
            onEmailToggle={logic.handleEmailToggle}
            onSmsToggle={logic.handleSmsToggle}
            onReminderTypeChange={logic.handleReminderTypeChange}
            onVisitChange={logic.handleVisitChange}
            onSubmit={logic.handleUpdate}
            onCancel={logic.handleCancelEdit}
            reminderTypeOptions={logic.reminderTypeOptions}
            visits={visits}
            canSubmit={logic.canSubmit}
            isSubmitting={logic.isSubmitting}
            isEdit={true}
          />
        );

      case 'delete':
        return (
          <DeleteConfirmation
            reminder={logic.editingReminder}
            onConfirm={logic.handleDelete}
            onCancel={logic.handleCancelEdit}
            isSubmitting={logic.isSubmitting}
          />
        );

      case 'list':
      default:
        return (
          <ReminderList
            reminders={logic.reminders}
            pendingReminders={logic.pendingReminders}
            sentReminders={logic.sentReminders}
            cancelledReminders={logic.cancelledReminders}
            onEdit={logic.handleEditReminder}
            onDelete={logic.handleDeleteConfirm}
            canEditReminder={logic.canEditReminder}
            canDeleteReminder={logic.canDeleteReminder}
            onNewReminder={logic.handleNewReminder}
            isGuestView={logic.isGuestView}
            isLoading={logic.isLoading}
          />
        );
    }
  };

  const getTitle = () => {
    switch (logic.section) {
      case 'create':
        return 'Create Reminder';
      case 'update':
        return 'Edit Reminder';
      case 'delete':
        return 'Cancel Reminder';
      case 'list':
      default:
        return logic.isGuestView ? 'Your Reminders' : 'House Manual Reminders';
    }
  };

  return (
    <div className="rhm-modal-overlay" onClick={onClose}>
      <div className="rhm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rhm-modal__header">
          <h2 className="rhm-modal__title">{getTitle()}</h2>
          <button
            type="button"
            className="rhm-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Messages */}
        {logic.error && (
          <div className="rhm-message rhm-message--error">
            {logic.error}
          </div>
        )}

        {logic.successMessage && (
          <div className="rhm-message rhm-message--success">
            {logic.successMessage}
          </div>
        )}

        {/* Content */}
        <div className="rhm-modal__content">
          {renderContent()}
        </div>

        {/* Footer Navigation (only for list view, non-guest) */}
        {logic.section === 'list' && !logic.isGuestView && logic.reminders.length > 0 && (
          <div className="rhm-modal__footer">
            <button
              type="button"
              className="rhm-button-primary"
              onClick={logic.handleNewReminder}
            >
              + New Reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderHouseManual;
