/**
 * Availability Slot Calculator
 * Pure functions for calculating time slot availability
 *
 * These functions handle:
 * - Generating time slots for a day
 * - Checking availability against blocked slots
 * - Building calendar grid data
 *
 * All functions are pure - no side effects, same input always produces same output.
 */

import { format, addDays, startOfWeek, addWeeks as dateFnsAddWeeks, parseISO } from 'date-fns';

/**
 * Get the start of the week (Sunday) for a given date
 *
 * @param {Date} date - The reference date
 * @returns {Date} The Sunday of that week
 */
export function getStartOfWeek(date) {
  return startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
}

/**
 * Add weeks to a date
 *
 * @param {Date} date - The starting date
 * @param {number} weeks - Number of weeks to add (can be negative)
 * @returns {Date} The resulting date
 */
export function addWeeks(date, weeks) {
  return dateFnsAddWeeks(date, weeks);
}

/**
 * Generate hourly time slots for a day
 *
 * @param {number} startHour - Start hour (24h format, default 8 AM)
 * @param {number} endHour - End hour (24h format, default 6 PM)
 * @returns {Array<{hour: number, label: string, startTime: string, endTime: string}>}
 */
export function getTimeSlots(startHour = 8, endHour = 18) {
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    slots.push({
      hour,
      label: formatTimeSlot(hour),
      startTime: `${String(hour).padStart(2, '0')}:00:00`,
      endTime: `${String(hour + 1).padStart(2, '0')}:00:00`
    });
  }

  return slots;
}

/**
 * Format hour to 12h display format
 *
 * @param {number} hour - 24h hour
 * @returns {string} Formatted time (e.g., "9:00 AM")
 */
export function formatTimeSlot(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

/**
 * Format a date string for display
 *
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - date-fns format string (default 'MMM d')
 * @returns {string}
 */
export function formatDate(date, formatStr = 'MMM d') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to YYYY-MM-DD string
 *
 * @param {Date} date - Date to format
 * @returns {string}
 */
export function formatDateString(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if a specific time slot is blocked
 *
 * @param {string} dateStr - The date (YYYY-MM-DD)
 * @param {string} startTime - Slot start time (HH:mm:ss)
 * @param {Array} blockedSlots - Array of blocked slot objects
 * @returns {boolean}
 */
export function isSlotBlocked(dateStr, startTime, blockedSlots) {
  return blockedSlots.some(block => {
    // Different date - not blocked
    if (block.date !== dateStr) return false;

    // Full day blocked
    if (block.is_full_day_blocked) return true;

    // Check time overlap
    return block.start_time <= startTime && block.end_time > startTime;
  });
}

/**
 * Check if a full day is blocked
 *
 * @param {string} dateStr - The date (YYYY-MM-DD)
 * @param {Array} blockedSlots - Array of blocked slot objects
 * @returns {boolean}
 */
export function isFullDayBlocked(dateStr, blockedSlots) {
  return blockedSlots.some(
    block => block.date === dateStr && block.is_full_day_blocked
  );
}

/**
 * Get available slots for a host on a specific date
 *
 * @param {Date|string} date - The date to check
 * @param {Array} blockedSlots - Host's blocked slots
 * @param {number} startHour - Day start hour (default 8)
 * @param {number} endHour - Day end hour (default 18)
 * @returns {Array<{hour: number, label: string, startTime: string, endTime: string, available: boolean}>}
 */
export function getAvailableSlotsForDate(date, blockedSlots = [], startHour = 8, endHour = 18) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const dateStr = formatDateString(dateObj);
  const slots = getTimeSlots(startHour, endHour);

  // Check if full day is blocked
  if (isFullDayBlocked(dateStr, blockedSlots)) {
    return slots.map(slot => ({ ...slot, available: false, isFullDayBlocked: true }));
  }

  // Check individual slots
  return slots.map(slot => ({
    ...slot,
    available: !isSlotBlocked(dateStr, slot.startTime, blockedSlots),
    isFullDayBlocked: false
  }));
}

/**
 * Calculate calendar grid data for a week
 * Returns an array of 7 days with their availability information
 *
 * @param {Date} weekStart - Start of the week (Sunday)
 * @param {Array} blockedSlots - Host's blocked slots
 * @param {number} startHour - Day start hour (default 8)
 * @param {number} endHour - Day end hour (default 18)
 * @returns {Array<{date: Date, dateStr: string, dayName: string, displayDate: string, slots: Array, isFullDayBlocked: boolean}>}
 */
export function calculateWeeklyCalendarGrid(weekStart, blockedSlots = [], startHour = 8, endHour = 18) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = formatDateString(date);
    const slots = getAvailableSlotsForDate(date, blockedSlots, startHour, endHour);

    days.push({
      date,
      dateStr,
      dayName: dayNames[i],
      displayDate: formatDate(date),
      isFullDayBlocked: isFullDayBlocked(dateStr, blockedSlots),
      slots,
      availableCount: slots.filter(s => s.available).length,
      totalSlots: slots.length
    });
  }

  return days;
}

/**
 * Get the blocked slot ID for a specific date/time
 * Used when unblocking a slot
 *
 * @param {string} dateStr - The date (YYYY-MM-DD)
 * @param {string|null} startTime - Slot start time (null for full day)
 * @param {Array} blockedSlots - Array of blocked slot objects
 * @returns {string|null} The slot ID or null if not found
 */
export function findBlockedSlotId(dateStr, startTime, blockedSlots) {
  const block = blockedSlots.find(b => {
    if (b.date !== dateStr) return false;

    if (startTime === null) {
      return b.is_full_day_blocked;
    }

    return b.start_time === startTime;
  });

  return block?.id || null;
}

/**
 * Calculate availability summary for a week
 *
 * @param {Array} calendarDays - Output from calculateWeeklyCalendarGrid
 * @returns {Object} { totalSlots, availableSlots, blockedSlots, percentageAvailable }
 */
export function calculateWeeklyAvailabilitySummary(calendarDays) {
  const totalSlots = calendarDays.reduce((sum, day) => sum + day.totalSlots, 0);
  const availableSlots = calendarDays.reduce((sum, day) => sum + day.availableCount, 0);
  const blockedSlots = totalSlots - availableSlots;
  const percentageAvailable = totalSlots > 0
    ? Math.round((availableSlots / totalSlots) * 100)
    : 100;

  return {
    totalSlots,
    availableSlots,
    blockedSlots,
    percentageAvailable
  };
}

/**
 * Get blocked slots for a specific date range
 *
 * @param {Array} blockedSlots - All blocked slots
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered blocked slots
 */
export function getBlockedSlotsInRange(blockedSlots, startDate, endDate) {
  return blockedSlots.filter(
    slot => slot.date >= startDate && slot.date <= endDate
  );
}
