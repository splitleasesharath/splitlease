/**
 * Reminder display formatters.
 * Format reminder data for UI display.
 */

/**
 * Reminder type labels and icons.
 */
const REMINDER_TYPE_CONFIG = {
  'check-in': { label: 'Check-in Reminder', icon: '🏠' },
  'check-out': { label: 'Check-out Reminder', icon: '🚪' },
  'maintenance': { label: 'Maintenance Alert', icon: '🔧' },
  'payment': { label: 'Payment Reminder', icon: '💳' },
  'emergency': { label: 'Emergency Info', icon: '🚨' },
  'amenity': { label: 'Amenity Instructions', icon: '✨' },
  'local-tip': { label: 'Local Tip', icon: '📍' },
  'custom': { label: 'Custom Message', icon: '💬' },
};

/**
 * Status labels and colors.
 */
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#eab308' },
  sent: { label: 'Sent', color: '#22c55e' },
  cancelled: { label: 'Cancelled', color: '#6b7280' },
};

/**
 * Delivery status labels and colors.
 */
const DELIVERY_STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#eab308' },
  sent: { label: 'Sent', color: '#3b82f6' },
  delivered: { label: 'Delivered', color: '#22c55e' },
  bounced: { label: 'Bounced', color: '#ef4444' },
  failed: { label: 'Failed', color: '#ef4444' },
};

/**
 * Format a scheduled datetime for display.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time.
 * @param {string} [params.locale='en-US'] - Locale for formatting.
 * @returns {string} Formatted date/time string.
 *
 * @example
 * formatScheduledTime({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => 'Jan 20, 2026 at 2:00 PM'
 */
export function formatScheduledTime({ scheduledDateTime, locale = 'en-US' }) {
  if (!scheduledDateTime) {
    return '';
  }

  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(date.getTime())) {
    return '';
  }

  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

  const dateStr = date.toLocaleDateString(locale, dateOptions);
  const timeStr = date.toLocaleTimeString(locale, timeOptions);

  return `${dateStr} at ${timeStr}`;
}

/**
 * Format relative time until reminder is sent.
 *
 * @param {object} params - Named parameters.
 * @param {string|Date} params.scheduledDateTime - The scheduled date/time.
 * @returns {string} Relative time string.
 *
 * @example
 * formatRelativeTime({ scheduledDateTime: '2026-01-20T14:00:00Z' })
 * // => 'in 2 days'
 */
export function formatRelativeTime({ scheduledDateTime }) {
  if (!scheduledDateTime) {
    return '';
  }

  const date = scheduledDateTime instanceof Date
    ? scheduledDateTime
    : new Date(scheduledDateTime);

  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'past due';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffMinutes > 0) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }

  return 'sending now';
}

/**
 * Format reminder type for display.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.reminderType - Type code.
 * @returns {object} { label: string, icon: string }
 */
export function formatReminderType({ reminderType }) {
  return REMINDER_TYPE_CONFIG[reminderType] || REMINDER_TYPE_CONFIG.custom;
}

/**
 * Get all reminder type options for dropdown.
 *
 * @returns {Array<{ value: string, label: string, icon: string }>}
 */
export function getReminderTypeOptions() {
  return Object.entries(REMINDER_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  }));
}

/**
 * Format reminder status for display.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.status - Status code.
 * @returns {object} { label: string, color: string }
 */
export function formatReminderStatus({ status }) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

/**
 * Format delivery status for display.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.deliveryStatus - Delivery status code.
 * @returns {object} { label: string, color: string }
 */
export function formatDeliveryStatus({ deliveryStatus }) {
  return DELIVERY_STATUS_CONFIG[deliveryStatus] || DELIVERY_STATUS_CONFIG.pending;
}

/**
 * Format notification channels for display.
 *
 * @param {object} params - Named parameters.
 * @param {boolean} params.isEmailReminder - Email enabled flag.
 * @param {boolean} params.isSmsReminder - SMS enabled flag.
 * @returns {string} Formatted channel string.
 *
 * @example
 * formatNotificationChannels({ isEmailReminder: true, isSmsReminder: true })
 * // => 'Email & SMS'
 */
export function formatNotificationChannels({ isEmailReminder, isSmsReminder }) {
  if (isEmailReminder && isSmsReminder) {
    return 'Email & SMS';
  }

  if (isEmailReminder) {
    return 'Email';
  }

  if (isSmsReminder) {
    return 'SMS';
  }

  return 'None';
}

/**
 * Truncate message for card preview.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.message - Full message.
 * @param {number} [params.maxLength=100] - Maximum length.
 * @returns {string} Truncated message.
 */
export function truncateMessage({ message, maxLength = 100 }) {
  if (!message) {
    return '';
  }

  if (message.length <= maxLength) {
    return message;
  }

  return message.substring(0, maxLength - 3) + '...';
}
