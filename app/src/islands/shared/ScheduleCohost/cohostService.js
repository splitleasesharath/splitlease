/**
 * Co-Host Service
 * Handles API calls for co-host scheduling via Supabase Edge Functions
 * Includes calendar generation and time slot utilities
 */

import { supabase } from '../../../lib/supabase';

/**
 * Generate calendar days for a given month
 * Dynamically calculates the number of weeks needed (5 or 6)
 * Includes padding from previous and next months
 * @param {Date} month - Any date within the target month
 * @returns {Date[]} Array of dates for the calendar grid
 */
export function generateCalendarDays(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  // First day of the month
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  // Day of week for first day (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = firstDayOfMonth.getDay();

  // Last day of the month
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Calculate total cells needed (padding + days in month)
  const totalCells = startDayOfWeek + daysInMonth;
  // Round up to nearest week (multiple of 7)
  const weeksNeeded = Math.ceil(totalCells / 7);
  const totalDays = weeksNeeded * 7;

  // Calculate the first date to show (may be in previous month)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push(date);
  }

  return days;
}

/**
 * Generate available time slots for a given date
 * @param {Date} selectedDate - The selected date
 * @param {number} startHour - Start hour (default: 11 for 11 AM)
 * @param {number} endHour - End hour (default: 22 for 10 PM)
 * @param {number} intervalMinutes - Interval in minutes (default: 60)
 * @returns {Array<{id: string, dateTime: Date, formattedTime: string, displayTime: string}>}
 */
export function generateTimeSlots(selectedDate, startHour = 11, endHour = 22, intervalMinutes = 60) {
  const slots = [];
  const date = new Date(selectedDate);

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minutes = 0; minutes < 60; minutes += intervalMinutes) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, minutes, 0, 0);

      slots.push({
        id: `slot_${slotTime.getTime()}`,
        dateTime: slotTime,
        formattedTime: formatTimeOnly(slotTime),
        displayTime: formatDateTime(slotTime),
      });
    }
  }

  return slots;
}

/**
 * Format time only for display (e.g., "4:00 pm")
 * @param {Date} date
 * @returns {string}
 */
export function formatTimeOnly(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

/**
 * Format date/time for display (e.g., "Wed, Dec 25, 4:00 pm EST")
 * @param {Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' EST';
}

/**
 * Format date for display (e.g., "Wednesday, December 25, 2024")
 * @param {Date} date
 * @returns {string}
 */
export function formatDateForDisplay(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date for Bubble API (required format)
 * @param {Date} date
 * @returns {string}
 */
export function formatDateForBubble(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Create a co-host request
 * @param {Object} data
 * @param {string} data.userId - Current user's ID
 * @param {string} data.userEmail - Current user's email
 * @param {string} data.userName - Current user's name
 * @param {Array} data.selectedTimes - Array of selected time slot objects
 * @param {string} [data.subject] - What help is needed
 * @param {string} [data.details] - Additional details
 * @param {string} [data.listingId] - Associated listing ID
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
 */
export async function createCoHostRequest(data) {
  try {
    // Format times for Bubble API
    const formattedTimes = data.selectedTimes.map((slot) => {
      return formatDateForBubble(slot.dateTime);
    });

    const { data: response, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'cohost-request',
        method: 'create',
        payload: {
          'Subject': data.subject || '',
          'details submitted (optional)': data.details || '',
          'Co-Host User': data.userId,
          'Listing': data.listingId,
          'selected_times': formattedTimes,
          'suggested dates and times': formattedTimes,
          userEmail: data.userEmail,
          userName: data.userName,
          'Status - Co-Host Request': 'Co-Host Requested',
        },
      },
    });

    if (error) {
      console.error('[cohostService] Error creating request:', error);
      return { success: false, error: error.message || 'Failed to create request' };
    }

    return {
      success: true,
      requestId: response?.requestId || response?._id,
      virtualMeetingId: response?.virtualMeetingId,
    };
  } catch (err) {
    console.error('[cohostService] Exception creating request:', err);
    return { success: false, error: err.message || 'Failed to create request' };
  }
}

/**
 * Submit rating for a co-host session
 * @param {string} requestId
 * @param {number} rating - 1-5 stars
 * @param {string} [message] - Optional feedback message
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function submitRating(requestId, rating, message) {
  try {
    const { error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'cohost-request',
        method: 'rate',
        payload: {
          requestId,
          'Rating': rating,
          'Rating message (optional)': message || '',
        },
      },
    });

    if (error) {
      console.error('[cohostService] Error submitting rating:', error);
      return { success: false, error: error.message || 'Failed to submit rating' };
    }

    return { success: true };
  } catch (err) {
    console.error('[cohostService] Exception submitting rating:', err);
    return { success: false, error: err.message || 'Failed to submit rating' };
  }
}

/**
 * Validate time slot selection
 * @param {Array} selectedSlots - Array of slot objects
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTimeSlots(selectedSlots) {
  if (!selectedSlots || selectedSlots.length === 0) {
    return { valid: false, error: 'Please select at least one time slot' };
  }
  if (selectedSlots.length < 3) {
    const remaining = 3 - selectedSlots.length;
    return { valid: false, error: `Please select ${remaining} more time slot${remaining > 1 ? 's' : ''}` };
  }
  if (selectedSlots.length > 3) {
    return { valid: false, error: 'You can only select up to 3 time slots' };
  }
  return { valid: true };
}

/**
 * Sanitize user input
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  if (!input) return '';
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .substring(0, 5000);
}

/**
 * Check if a date is selectable (not in the past, not a weekend if required)
 * @param {Date} date
 * @param {Date} [lastLogicalDate] - Optional last valid date
 * @returns {boolean}
 */
export function isDateSelectable(date, lastLogicalDate = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Past dates are not selectable
  if (date < today) {
    return false;
  }

  // If lastLogicalDate is set, dates beyond it are not selectable
  if (lastLogicalDate && date > lastLogicalDate) {
    return false;
  }

  return true;
}

/**
 * Check if a date is in the given month
 * @param {Date} date
 * @param {Date} month
 * @returns {boolean}
 */
export function isDateInMonth(date, month) {
  return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
}
