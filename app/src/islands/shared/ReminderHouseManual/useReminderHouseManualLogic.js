/**
 * useReminderHouseManualLogic Hook
 *
 * Business logic hook for the ReminderHouseManual component.
 * Follows the Hollow Component Pattern - all state and logic lives here.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import reminderHouseManualService from './reminderHouseManualService.js';
import { adaptReminderFromDatabase, adaptRemindersFromDatabase } from '../../../logic/processors/reminders/reminderAdapter.js';
import { canSubmitReminder, canDeleteReminder, canEditReminder } from '../../../logic/rules/reminders/reminderValidation.js';
import { createReminderWorkflow, updateReminderWorkflow, deleteReminderWorkflow } from '../../../logic/workflows/reminders/reminderWorkflow.js';
import { getReminderTypeOptions } from '../../../logic/processors/reminders/reminderFormatter.js';

/**
 * Initial form state
 */
const createInitialFormData = () => ({
  message: '',
  scheduledDateTime: '',
  isEmailReminder: true,
  isSmsReminder: false,
  guestId: '',
  visitId: '',
  fallbackPhone: '',
  fallbackEmail: '',
  reminderType: 'custom',
});

/**
 * @param {object} props
 * @param {string} props.houseManualId - House manual ID
 * @param {string} props.creatorId - Current user ID
 * @param {Array} [props.visits] - Available visits for dropdown
 * @param {boolean} [props.isVisible] - Modal visibility
 * @param {string} [props.initialSection] - Starting section
 * @param {object} [props.selectedReminder] - Pre-selected reminder for edit/delete
 * @param {boolean} [props.isGuestView] - Whether this is guest read-only view
 * @param {string} [props.visitId] - Visit ID for guest view
 */
export default function useReminderHouseManualLogic({
  houseManualId,
  creatorId,
  visits = [],
  isVisible = false,
  initialSection = 'list',
  selectedReminder = null,
  isGuestView = false,
  visitId = null,
}) {
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────

  const [reminders, setReminders] = useState([]);
  const [formData, setFormData] = useState(createInitialFormData);
  const [section, setSection] = useState(initialSection);
  const [editingReminder, setEditingReminder] = useState(selectedReminder);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  // Load reminders when visible
  useEffect(() => {
    if (isVisible) {
      loadReminders();
      setSection(initialSection);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isVisible, houseManualId, visitId]);

  // Reset form when section changes
  useEffect(() => {
    if (section === 'create') {
      setFormData(createInitialFormData());
      setEditingReminder(null);
    }
  }, [section]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  // ─────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (isGuestView && visitId) {
        result = await reminderHouseManualService.fetchRemindersByVisit(visitId);
      } else if (houseManualId) {
        result = await reminderHouseManualService.fetchReminders(houseManualId);
      } else {
        throw new Error('Missing houseManualId or visitId');
      }

      if (result.status === 'success') {
        const adapted = adaptRemindersFromDatabase({ dbRows: result.data });
        setReminders(adapted);
      } else {
        throw new Error(result.message || 'Failed to load reminders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setIsLoading(false);
    }
  }, [houseManualId, visitId, isGuestView]);

  // ─────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────

  const canSubmit = useMemo(() => {
    return canSubmitReminder({
      message: formData.message,
      scheduledDateTime: formData.scheduledDateTime,
      isEmailReminder: formData.isEmailReminder,
      isSmsReminder: formData.isSmsReminder,
      isSubmitting,
    });
  }, [formData, isSubmitting]);

  const reminderTypeOptions = useMemo(() => getReminderTypeOptions(), []);

  const pendingReminders = useMemo(() =>
    reminders.filter(r => r.status === 'pending'),
    [reminders]
  );

  const sentReminders = useMemo(() =>
    reminders.filter(r => r.status === 'sent'),
    [reminders]
  );

  const cancelledReminders = useMemo(() =>
    reminders.filter(r => r.status === 'cancelled'),
    [reminders]
  );

  // ─────────────────────────────────────────────────────────────
  // Form Handlers
  // ─────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const handleMessageChange = useCallback((e) => {
    handleFieldChange('message', e.target.value);
  }, [handleFieldChange]);

  const handleScheduledDateTimeChange = useCallback((e) => {
    handleFieldChange('scheduledDateTime', e.target.value);
  }, [handleFieldChange]);

  const handleEmailToggle = useCallback(() => {
    setFormData(prev => ({ ...prev, isEmailReminder: !prev.isEmailReminder }));
  }, []);

  const handleSmsToggle = useCallback(() => {
    setFormData(prev => ({ ...prev, isSmsReminder: !prev.isSmsReminder }));
  }, []);

  const handleReminderTypeChange = useCallback((e) => {
    handleFieldChange('reminderType', e.target.value);
  }, [handleFieldChange]);

  const handleVisitChange = useCallback((e) => {
    const selectedVisitId = e.target.value;
    handleFieldChange('visitId', selectedVisitId);

    // If visit selected, find guest ID
    if (selectedVisitId) {
      const visit = visits.find(v => (v._id || v.id) === selectedVisitId);
      if (visit?.guest) {
        handleFieldChange('guestId', visit.guest._id || visit.guest.id || visit.guest);
      }
    } else {
      handleFieldChange('guestId', '');
    }
  }, [handleFieldChange, visits]);

  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const workflow = createReminderWorkflow({
        formData,
        houseManualId,
        creatorId,
      });

      if (!workflow.canProceed) {
        throw new Error(workflow.error);
      }

      const result = await reminderHouseManualService.createReminder(workflow.payload);

      if (result.status === 'success') {
        setSuccessMessage('Reminder created successfully!');
        setFormData(createInitialFormData());
        await loadReminders();
        setSection('list');
      } else {
        throw new Error(result.message || 'Failed to create reminder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, houseManualId, creatorId, loadReminders]);

  const handleUpdate = useCallback(async () => {
    if (!editingReminder) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const workflow = updateReminderWorkflow({
        reminder: editingReminder,
        updates: formData,
        userId: creatorId,
      });

      if (!workflow.canProceed) {
        throw new Error(workflow.error);
      }

      const result = await reminderHouseManualService.updateReminder(workflow.payload);

      if (result.status === 'success') {
        setSuccessMessage('Reminder updated successfully!');
        setEditingReminder(null);
        await loadReminders();
        setSection('list');
      } else {
        throw new Error(result.message || 'Failed to update reminder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reminder');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingReminder, formData, creatorId, loadReminders]);

  const handleDelete = useCallback(async (reminder) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const workflow = deleteReminderWorkflow({
        reminder,
        userId: creatorId,
      });

      if (!workflow.canProceed) {
        throw new Error(workflow.error);
      }

      const result = await reminderHouseManualService.deleteReminder(workflow.reminderId);

      if (result.status === 'success') {
        setSuccessMessage('Reminder cancelled successfully!');
        await loadReminders();
        setSection('list');
      } else {
        throw new Error(result.message || 'Failed to cancel reminder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reminder');
    } finally {
      setIsSubmitting(false);
    }
  }, [creatorId, loadReminders]);

  // ─────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────

  const handleEditReminder = useCallback((reminder) => {
    setEditingReminder(reminder);
    setFormData({
      message: reminder.message || '',
      scheduledDateTime: reminder.scheduledDateTime
        ? new Date(reminder.scheduledDateTime).toISOString().slice(0, 16)
        : '',
      isEmailReminder: reminder.isEmailReminder || false,
      isSmsReminder: reminder.isSmsReminder || false,
      guestId: reminder.guestId || '',
      visitId: reminder.visitId || '',
      fallbackPhone: reminder.fallbackPhone || '',
      fallbackEmail: reminder.fallbackEmail || '',
      reminderType: reminder.reminderType || 'custom',
    });
    setSection('update');
  }, []);

  const handleDeleteConfirm = useCallback((reminder) => {
    setEditingReminder(reminder);
    setSection('delete');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingReminder(null);
    setFormData(createInitialFormData());
    setSection('list');
  }, []);

  const handleNewReminder = useCallback(() => {
    setFormData(createInitialFormData());
    setEditingReminder(null);
    setSection('create');
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────

  return {
    // State
    reminders,
    formData,
    section,
    editingReminder,
    isSubmitting,
    isLoading,
    error,
    successMessage,

    // Computed
    canSubmit,
    reminderTypeOptions,
    pendingReminders,
    sentReminders,
    cancelledReminders,
    isGuestView,

    // Form handlers
    handleFieldChange,
    handleMessageChange,
    handleScheduledDateTimeChange,
    handleEmailToggle,
    handleSmsToggle,
    handleReminderTypeChange,
    handleVisitChange,

    // CRUD
    handleCreate,
    handleUpdate,
    handleDelete,

    // Navigation
    handleEditReminder,
    handleDeleteConfirm,
    handleCancelEdit,
    handleNewReminder,
    setSection,

    // Utils
    loadReminders,
    canEditReminder: (reminder) => canEditReminder({ status: reminder.status }),
    canDeleteReminder: (reminder) => canDeleteReminder({ reminder, userId: creatorId }),
  };
}
