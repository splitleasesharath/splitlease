/**
 * Virtual Meeting API Service Layer
 * Handles all backend workflow API calls via Supabase Edge Functions
 */

import { supabase } from '../../../lib/supabase.js';
import { toISOString } from './dateUtils.js';

/**
 * Accept a virtual meeting request
 * @param {string} proposalId - Proposal ID
 * @param {Date} bookedDate - Selected meeting time
 * @param {string} userAcceptingId - User accepting the meeting
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function acceptVirtualMeeting(proposalId, bookedDate, userAcceptingId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'accept',
        payload: {
          proposalId,
          bookedDate: toISOString(bookedDate),
          userAcceptingId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to accept virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (accept-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
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
    const isoTimes = timesSelected.map(toISOString);
    console.log('[VM Service] Creating request:', {
      proposalId,
      timesSelectedCount: timesSelected.length,
      timesSelectedISO: isoTimes,
      requestedById,
      isAlternativeTimes,
    });

    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'create',
        payload: {
          proposalId,
          timesSelected: isoTimes,
          requestedById,
          isAlternativeTimes,
          timezoneString,
        },
      },
    });

    console.log('[VM Service] Response:', { responseData, error });

    if (error) {
      // Try to get the actual error message from the response body
      let errorMessage = error.message || 'Failed to create virtual meeting';

      // error.context is the Response object - try to read its body
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          console.error('[VM Service] Error response body:', errorBody);
          errorMessage = errorBody?.error || errorBody?.message || errorMessage;
        } catch (parseError) {
          console.error('[VM Service] Could not parse error response:', parseError);
        }
      }

      console.error('[VM Service] Error details:', {
        message: error.message,
        extractedError: errorMessage,
        responseData,
      });
      throw new Error(errorMessage);
    }

    // Check if response indicates an error
    if (responseData && responseData.success === false) {
      console.error('[VM Service] API returned error:', responseData);
      throw new Error(responseData.error || responseData.message || 'API returned error');
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
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'decline',
        payload: {
          proposalId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to decline virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (decline-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Cancel an existing virtual meeting
 * @param {string} meetingId - Virtual meeting ID
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function cancelVirtualMeeting(meetingId, proposalId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'delete',
        payload: {
          virtualMeetingId: meetingId,
          proposalId: proposalId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to cancel virtual meeting');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (cancel-virtual-meeting):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send Google Calendar invite via Zapier integration
 * @param {string} proposalId - Proposal ID
 * @param {string} userId - User ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function sendGoogleCalendarInvite(proposalId, userId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'send_calendar_invite',
        payload: {
          proposalId,
          userId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send calendar invite');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (send-calendar-invite):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Notify participants about virtual meeting (SMS/Email)
 * @param {string} hostId - Host user ID
 * @param {string} guestId - Guest user ID
 * @param {string} virtualMeetingId - Virtual meeting ID
 * @returns {Promise<{status: string, data?: any, message?: string}>}
 */
export async function notifyVirtualMeetingParticipants(hostId, guestId, virtualMeetingId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('virtual-meeting', {
      body: {
        action: 'notify_participants',
        payload: {
          hostId,
          guestId,
          virtualMeetingId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to notify participants');
    }

    return {
      status: 'success',
      data: responseData?.data,
    };
  } catch (error) {
    console.error('API Error (notify-participants):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
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
