/**
 * Date Utility Functions for Date Change Requests
 * Handles date formatting, calendar generation, and date comparisons
 */

import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from 'date-fns';

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM d, yyyy')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, formatString = 'MMM d, yyyy') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString);
};

/**
 * Format month and year for calendar header
 * @param {Date} date - Date to format
 * @returns {string} - Formatted month year string
 */
export const formatMonthYear = (date) => {
  return format(date, 'MMMM yyyy');
};

/**
 * Generate calendar days for a month
 * @param {Date} currentMonth - The month to generate days for
 * @returns {(Date|null)[]} - Array of Date objects (or null for empty cells)
 */
export const generateCalendarDays = (currentMonth) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = getDay(firstDayOfMonth);

  const days = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  return days;
};

/**
 * Navigate to previous month
 * @param {Date} currentMonth - Current month
 * @returns {Date} - Previous month
 */
export const getPreviousMonth = (currentMonth) => {
  return subMonths(currentMonth, 1);
};

/**
 * Navigate to next month
 * @param {Date} currentMonth - Current month
 * @returns {Date} - Next month
 */
export const getNextMonth = (currentMonth) => {
  return addMonths(currentMonth, 1);
};

/**
 * Check if a date is in the past
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export const isPastDate = (date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < now;
};

/**
 * Check if two dates are the same (ignoring time)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} - True if dates are the same day
 */
export const isSameDate = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Check if a date is within a date range (inclusive)
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Range start
 * @param {Date|string} endDate - Range end
 * @returns {boolean} - True if date is within range
 */
export const isDateInRange = (date, startDate, endDate) => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return d >= start && d <= end;
};

/**
 * Check if a date is in a list of dates
 * @param {Date|string} date - Date to check
 * @param {(Date|string)[]} dateList - List of dates
 * @returns {boolean} - True if date is in list
 */
export const isDateInList = (date, dateList) => {
  if (!dateList || !Array.isArray(dateList)) return false;
  return dateList.some(d => isSameDate(date, d));
};

/**
 * Convert Date to ISO string for API requests
 * @param {Date} date - Date to convert
 * @returns {string} - ISO string
 */
export const toISOString = (date) => {
  return date.toISOString();
};

/**
 * Parse ISO string to Date
 * @param {string} isoString - ISO string to parse
 * @returns {Date} - Parsed Date object
 */
export const fromISOString = (isoString) => {
  return new Date(isoString);
};

/**
 * Get expiration date (48 hours from now by default)
 * @param {number} hoursFromNow - Hours until expiration (default: 48)
 * @returns {Date} - Expiration date
 */
export const getExpirationDate = (hoursFromNow = 48) => {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
};

/**
 * Check if a date is expiring soon (within threshold hours)
 * @param {Date|string} expirationDate - Expiration date
 * @param {number} hoursThreshold - Hours threshold (default: 6)
 * @returns {boolean} - True if expiring soon
 */
export const isExpiringSoon = (expirationDate, hoursThreshold = 6) => {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= hoursThreshold;
};

/**
 * Check if a date has expired
 * @param {Date|string} expirationDate - Expiration date
 * @returns {boolean} - True if expired
 */
export const hasExpired = (expirationDate) => {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  return expDate < new Date();
};

/**
 * Calculate time remaining until expiration
 * @param {Date|string} expirationDate - Expiration date
 * @returns {{hours: number, minutes: number, isExpired: boolean}} - Time remaining
 */
export const getTimeRemaining = (expirationDate) => {
  const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, isExpired: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, isExpired: false };
};

/**
 * Get month names array
 * @returns {string[]} - Array of month names
 */
export const getMonthNames = () => {
  return Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMMM'));
};

/**
 * Get day names array (0-indexed, Sunday first)
 * @returns {string[]} - Array of day names
 */
export const getDayNames = () => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};
