/**
 * Reminder House Manual API Service Layer
 * Handles reminder operations via Supabase Edge Functions.
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch reminders for a house manual.
 *
 * @param {string} houseManualId - House manual ID.
 * @param {string} [status] - Optional status filter.
 * @returns {Promise<{status: string, data?: Array, message?: string}>}
 */
export async function fetchReminders(houseManualId, status) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('reminder-scheduler', {
      body: {
        action: 'get',
        payload: {
          houseManualId,
          status,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch reminders');
    }

    return {
      status: 'success',
      data: responseData?.data?.reminders || [],
    };
  } catch (error) {
    console.error('API Error (fetch-reminders):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Fetch reminders for a visit (guest view).
 *
 * @param {string} visitId - Visit ID.
 * @returns {Promise<{status: string, data?: Array, message?: string}>}
 */
export async function fetchRemindersByVisit(visitId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('reminder-scheduler', {
      body: {
        action: 'get-by-visit',
        payload: { visitId },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch visit reminders');
    }

    return {
      status: 'success',
      data: responseData?.data?.reminders || [],
    };
  } catch (error) {
    console.error('API Error (fetch-visit-reminders):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Create a new reminder.
 *
 * @param {object} data - Reminder data.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function createReminder(data) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('reminder-scheduler', {
      body: {
        action: 'create',
        payload: data,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create reminder');
    }

    return {
      status: 'success',
      data: responseData?.data?.reminder,
    };
  } catch (error) {
    console.error('API Error (create-reminder):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update an existing reminder.
 *
 * @param {object} data - Update data including reminderId.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function updateReminder(data) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('reminder-scheduler', {
      body: {
        action: 'update',
        payload: data,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to update reminder');
    }

    return {
      status: 'success',
      data: responseData?.data?.reminder,
    };
  } catch (error) {
    console.error('API Error (update-reminder):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete (cancel) a reminder.
 *
 * @param {string} reminderId - Reminder ID to delete.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function deleteReminder(reminderId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('reminder-scheduler', {
      body: {
        action: 'delete',
        payload: { reminderId },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete reminder');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (delete-reminder):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Export as service object
export const reminderHouseManualService = {
  fetchReminders,
  fetchRemindersByVisit,
  createReminder,
  updateReminder,
  deleteReminder,
};

export default reminderHouseManualService;
