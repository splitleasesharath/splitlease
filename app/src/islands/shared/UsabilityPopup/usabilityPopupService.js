/**
 * Usability Popup Service
 * Split Lease - Frontend
 *
 * API service layer for sending magic link via SMS.
 * Wraps the auth-user Edge Function's send_magic_link_sms action.
 *
 * Usage:
 *   import { sendMagicLinkViaSms } from './usabilityPopupService.js';
 *
 *   const result = await sendMagicLinkViaSms({
 *     email: 'user@example.com',
 *     phoneNumber: '+15551234567',
 *     redirectTo: 'https://splitlease.com/search'
 *   });
 */

import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';

/**
 * Send a magic login link via SMS
 *
 * @param {Object} params - Request parameters
 * @param {string} params.email - User's email (must match logged-in user)
 * @param {string} params.phoneNumber - Phone number in E.164 format (+15551234567)
 * @param {string} [params.redirectTo] - Optional redirect URL after magic link click
 * @returns {Promise<Object>} Result with success status and message_sid
 * @throws {Error} If SMS send fails
 */
export async function sendMagicLinkViaSms({ email, phoneNumber, redirectTo }) {
  logger.debug('[UsabilityPopup] Sending magic link via SMS...');
  logger.debug('[UsabilityPopup] Email:', email);
  logger.debug('[UsabilityPopup] Phone:', phoneNumber);
  logger.debug('[UsabilityPopup] Redirect:', redirectTo);

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'send_magic_link_sms',
        payload: {
          email,
          phoneNumber,
          redirectTo: redirectTo || window.location.href
        }
      }
    });

    if (error) {
      logger.error('[UsabilityPopup] Edge Function error:', error);

      // Extract detailed error from response if available
      let errorMessage = 'Failed to send login link';
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseErr) {
          // Use default message
        }
      }

      throw new Error(errorMessage);
    }

    if (!data?.success) {
      const errorMessage = data?.error || 'Failed to send login link';
      logger.error('[UsabilityPopup] API returned failure:', errorMessage);
      throw new Error(errorMessage);
    }

    logger.debug('[UsabilityPopup] SMS sent successfully');
    logger.debug('[UsabilityPopup] Message SID:', data.data?.message_sid);

    return {
      success: true,
      messageSid: data.data?.message_sid,
      sentAt: data.data?.sent_at
    };

  } catch (error) {
    logger.error('[UsabilityPopup] sendMagicLinkViaSms error:', error);

    // Re-throw with user-friendly message
    if (error.message?.includes('E.164')) {
      throw new Error('Please enter a valid US phone number');
    }
    if (error.message?.includes('delivery failed')) {
      throw new Error('Unable to send SMS. Please check the phone number and try again.');
    }

    throw error;
  }
}
