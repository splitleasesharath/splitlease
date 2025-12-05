/**
 * Co-Host Service
 * Handles API calls for co-host scheduling via Supabase Edge Functions
 */

import { supabase } from '../../../lib/supabase';

/**
 * Generate available time slots for the next 7 days
 * @returns {Array<{id: string, dateTime: Date, formattedTime: string}>}
 */
export function generateAvailableTimeSlots() {
  const slots = [];
  const now = new Date();

  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Morning slots (9am, 10am, 11am EST)
    [9, 10, 11].forEach((hour) => {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      slots.push({
        id: `slot_${slot.getTime()}`,
        dateTime: slot,
        formattedTime: formatDateTime(slot),
      });
    });

    // Afternoon slots (2pm, 3pm, 4pm EST)
    [14, 15, 16].forEach((hour) => {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      slots.push({
        id: `slot_${slot.getTime()}`,
        dateTime: slot,
        formattedTime: formatDateTime(slot),
      });
    });
  }

  return slots;
}

/**
 * Format date/time for display
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
 * @param {string[]} data.selectedTimes - Array of selected time slot IDs
 * @param {string} [data.subject] - What help is needed
 * @param {string} [data.details] - Additional details
 * @param {string} [data.listingId] - Associated listing ID
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
 */
export async function createCoHostRequest(data) {
  try {
    const { data: response, error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'cohost-request',
        method: 'create',
        payload: {
          'Subject': data.subject || '',
          'details submitted (optional)': data.details || '',
          'Co-Host User': data.userId,
          'Listing': data.listingId,
          'selected_times': data.selectedTimes.map((id) => {
            // Extract timestamp from slot ID and format for Bubble
            const timestamp = parseInt(id.replace('slot_', ''), 10);
            return formatDateForBubble(new Date(timestamp));
          }),
          userEmail: data.userEmail,
          userName: data.userName,
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
 * @param {string[]} selectedSlots
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
