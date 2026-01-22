/**
 * Centralized Date Formatting Utilities
 *
 * Consolidates all date formatting logic to ensure consistency across the application.
 * All formatDate implementations throughout the codebase should delegate to these functions.
 *
 * @module lib/dateFormatters
 */

/**
 * Format a date for display with configurable format and fallback
 * @param {string|Date|null|undefined} dateValue - Date to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.format='medium'] - Format type: 'short' (M/D/YY), 'medium' (Jan 15, 2025), 'long' (January 15, 2025), 'iso' (2025-01-15)
 * @param {string} [options.fallback=''] - Value to return for invalid/null dates
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(dateValue, options = {}) {
  const { format = 'medium', fallback = '' } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  switch (format) {
    case 'short':
      // M/D/YY format
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;

    case 'medium':
      // Jan 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'long':
      // January 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'iso':
      // 2025-01-15 format
      return date.toISOString().split('T')[0];

    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }
}

/**
 * Format a datetime for display
 * @param {string|Date|null|undefined} dateValue - Datetime to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.fallback=''] - Value to return for invalid/null dates
 * @param {boolean} [options.includeTimezone=false] - Whether to include timezone
 * @returns {string} Formatted datetime string
 */
export function formatDateTimeDisplay(dateValue, options = {}) {
  const { fallback = '', includeTimezone = false } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  const formatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  };

  if (includeTimezone) {
    formatOptions.timeZoneName = 'short';
  }

  return date.toLocaleString('en-US', formatOptions);
}

/**
 * Format a date range for display
 * @param {string|Date} start - Start date
 * @param {string|Date} end - End date
 * @param {Object} [options] - Formatting options
 * @returns {string} Formatted date range (e.g., "1/15/25 - 2/28/25")
 */
export function formatDateRange(start, end, options = {}) {
  const { format = 'short' } = options;
  const startFormatted = formatDateDisplay(start, { format, fallback: '' });
  const endFormatted = formatDateDisplay(end, { format, fallback: '' });

  if (!startFormatted && !endFormatted) return '';
  if (!startFormatted) return endFormatted;
  if (!endFormatted) return startFormatted;

  return `${startFormatted} - ${endFormatted}`;
}
