/**
 * Date and Timezone Utility Functions
 * Handles EST timezone conversions and date formatting
 */

import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const EST_TIMEZONE = 'America/New_York';

/**
 * Convert a date to UTC from EST timezone
 * @param {Date} estDate - Date in EST
 * @returns {Date} - Date in UTC
 */
export const toUTC = (estDate) => {
  return fromZonedTime(estDate, EST_TIMEZONE);
};

/**
 * Convert a UTC date to EST timezone
 * @param {Date} utcDate - Date in UTC
 * @returns {Date} - Date in EST
 */
export const toEST = (utcDate) => {
  return toZonedTime(utcDate, EST_TIMEZONE);
};

/**
 * Format a date in EST timezone
 * @param {Date} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM d, yyyy h:mm a')
 * @returns {string} - Formatted date string with (EST) suffix
 */
export const formatTimeEST = (date, formatString = 'MMM d, yyyy h:mm a') => {
  const estDate = toEST(date);
  return format(estDate, formatString) + ' (EST)';
};

/**
 * Format time only in EST
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string with (EST) suffix
 */
export const formatTimeOnlyEST = (date) => {
  const estDate = toEST(date);
  return format(estDate, 'h:mm a') + ' (EST)';
};

/**
 * Format date only in EST
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDateOnlyEST = (date) => {
  const estDate = toEST(date);
  return format(estDate, 'MMM d, yyyy');
};

/**
 * Generate time slots for a given day
 * @param {Date} date - Base date for time slots
 * @param {number} startHour - Starting hour (24-hour format, default: 8)
 * @param {number} endHour - Ending hour (24-hour format, default: 20)
 * @param {number} interval - Interval in minutes (default: 30)
 * @returns {Date[]} - Array of Date objects representing time slots
 */
export const generateTimeSlots = (date, startHour = 8, endHour = 20, interval = 30) => {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute, 0, 0);
      slots.push(slotTime);
    }
  }

  return slots;
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
  return date < now;
};

/**
 * Check if two dates are the same (ignoring time)
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} - True if dates are the same day
 */
export const isSameDate = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Check if two dates and times are the same
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} - True if dates and times are the same
 */
export const isSameDateTime = (date1, date2) => {
  return date1.getTime() === date2.getTime();
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
 * Generate Google Calendar URL
 * @param {Object} meeting - Virtual meeting details
 * @param {Object} proposal - Proposal details
 * @returns {string} - Google Calendar URL
 */
export const generateGoogleCalendarUrl = (meeting, proposal) => {
  if (!meeting.bookedDate) return '';

  const startDate = toEST(new Date(meeting.bookedDate));
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1); // 1 hour meeting

  const formatForGoogle = (date) => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const title = encodeURIComponent(`Virtual Meeting - ${proposal.listing?.name || 'Split Lease Property'}`);
  const guestName = proposal.guest?.firstName || proposal.guest?.name || 'Guest';
  const details = encodeURIComponent(
    `Virtual meeting with ${guestName}\n${meeting.googleMeetLink || meeting.meetingLink || ''}`
  );
  const dates = `${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}&ctz=${EST_TIMEZONE}`;
};

/**
 * Get month names array
 * @returns {string[]} - Array of month names
 */
export const getMonthNames = () => {
  return Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMMM'));
};

/**
 * Get day names array
 * @returns {string[]} - Array of day names
 */
export const getDayNames = () => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};
