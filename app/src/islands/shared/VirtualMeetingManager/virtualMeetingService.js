/**
 * Virtual Meeting API Service Layer
 * Handles all backend workflow API calls via Supabase Edge Functions
 */

import { supabase } from '../../../lib/supabase.js';
import { toISOString } from './dateUtils.js';

// Edge function endpoint for Bubble workflow calls
const BUBBLE_PROXY_FUNCTION = 'bubble-proxy';

/**
 * Generic API request handler via Edge Function proxy
 * @param {string} workflow - Bubble workflow name
 * @param {Object} data - Request data
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
async function proxyRequest(workflow, data) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke(BUBBLE_PROXY_FUNCTION, {
      body: {
        endpoint: `/wf/${workflow}`,
        method: 'POST',
        data: data,
      },
    });

    if (error) {
      throw new Error(error.message || 'API request failed');
    }

    return {
      status: 'success',
      data: responseData,
    };
  } catch (error) {
    console.error(`API Error (${workflow}):`, error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Accept a virtual meeting request
 * @param {string} proposalId - Proposal ID
 * @param {Date} bookedDate - Selected meeting time
 * @param {string} userAcceptingId - User accepting the meeting
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function acceptVirtualMeeting(proposalId, bookedDate, userAcceptingId) {
  const data = {
    proposal: proposalId,
    booked_date_sel: toISOString(bookedDate),
    user_accepting: userAcceptingId,
  };

  return proxyRequest('accept-virtual-meeting', data);
}

/**
 * Create a virtual meeting request with proposed time slots
 * @param {string} proposalId - Proposal ID
 * @param {Date[]} timesSelected - Array of selected time slots
 * @param {string} requestedById - User requesting the meeting
 * @param {boolean} isAlternativeTimes - Whether this is suggesting alternative times
 * @param {string} timezoneString - Timezone string (default: 'America/New_York')
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function createVirtualMeetingRequest(
  proposalId,
  timesSelected,
  requestedById,
  isAlternativeTimes = false,
  timezoneString = 'America/New_York'
) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'create',
        payload: {
          proposalId,
          timesSelected: timesSelected.map(toISOString),
          requestedById,
          isAlternativeTimes,
          timezoneString,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (create-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Decline a virtual meeting request
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function declineVirtualMeeting(proposalId) {
  return proxyRequest('decline-virtual-meeting', { proposal: proposalId });
}

/**
 * Cancel an existing virtual meeting
 * @param {string} meetingId - Virtual meeting ID
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function cancelVirtualMeeting(meetingId, proposalId) {
  return proxyRequest('cancel-virtual-meeting', {
    meeting_id: meetingId,
    proposal: proposalId,
  });
}

/**
 * Send Google Calendar invite via Zapier integration
 * @param {string} proposalId - Proposal ID
 * @param {string} userId - User ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function sendGoogleCalendarInvite(proposalId, userId) {
  const data = {
    proposal: proposalId,
    user: userId,
  };

  return proxyRequest('l3-trigger-send-google-calend', data);
}

/**
 * Notify participants about virtual meeting (SMS/Email)
 * @param {string} hostId - Host user ID
 * @param {string} guestId - Guest user ID
 * @param {string} virtualMeetingId - Virtual meeting ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function notifyVirtualMeetingParticipants(hostId, guestId, virtualMeetingId) {
  const data = {
    host: hostId,
    guest: guestId,
    virtual_meeting: virtualMeetingId,
  };

  return proxyRequest('notify-virtual-meeting-partici', data);
}

/**
 * Direct Supabase update for virtual meeting (fallback for simpler operations)
 * @param {string} meetingId - Virtual meeting ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function updateVirtualMeetingDirect(meetingId, updates) {
  try {
    const { data, error } = await supabase
      .from('virtualmeetingschedulesandlinks')
      .update({
        ...updates,
        'Modified Date': new Date().toISOString(),
      })
      .eq('_id', meetingId)
      .select()
      .single();

    if (error) throw error;

    return {
      status: 'success',
      data: data,
    };
  } catch (error) {
    console.error('Direct Update Error:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update meeting',
    };
  }
}

/**
 * Retry logic wrapper for API calls
 * @param {Function} apiFunction - API function to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} delayMs - Base delay in milliseconds (default: 1000)
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function retryApiCall(apiFunction, maxRetries = 3, delayMs = 1000) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await apiFunction();

    if (result.status === 'success') {
      return result;
    }

    lastError = result;

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  return lastError || { status: 'error', message: 'All retry attempts failed' };
}

// Export all API functions as a service object
export const virtualMeetingService = {
  acceptMeeting: acceptVirtualMeeting,
  createRequest: createVirtualMeetingRequest,
  declineMeeting: declineVirtualMeeting,
  cancelMeeting: cancelVirtualMeeting,
  sendGoogleCalendar: sendGoogleCalendarInvite,
  notifyParticipants: notifyVirtualMeetingParticipants,
  updateDirect: updateVirtualMeetingDirect,
  retry: retryApiCall,
};

export default virtualMeetingService;
