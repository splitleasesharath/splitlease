/**
 * ReminderHouseManual Module Exports
 *
 * Exports all public components and utilities for the reminder house manual feature.
 */

// Main component
export { default as ReminderHouseManual } from './ReminderHouseManual.jsx';
export { default } from './ReminderHouseManual.jsx';

// Business logic hook
export { default as useReminderHouseManualLogic } from './useReminderHouseManualLogic.js';

// Service layer
export {
  reminderHouseManualService,
  fetchReminders,
  fetchRemindersByVisit,
  createReminder,
  updateReminder,
  deleteReminder,
} from './reminderHouseManualService.js';

// Child components (for advanced customization)
export { default as ReminderList } from './components/ReminderList.jsx';
export { default as ReminderCard } from './components/ReminderCard.jsx';
export { default as ReminderForm } from './components/ReminderForm.jsx';
export { default as DeleteConfirmation } from './components/DeleteConfirmation.jsx';
