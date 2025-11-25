/**
 * Logout Handler - Invalidate user session via Bubble
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Get token from payload
 * 2. Call Bubble logout workflow (BUBBLE_API_BASE_URL/wf/logout-user)
 * 3. Return success (always succeeds locally even if Bubble API fails)
 *
 * EXCEPTION TO NO FALLBACK:
 * Logout should always succeed locally even if Bubble API call fails.
 * This ensures users can always clear their local session.
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble
 * @param payload - Request payload {token}
 * @returns {message: string}
 */

import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleLogout(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any> {
  console.log('[logout] ========== LOGOUT REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['token']);
  const { token } = payload;

  console.log(`[logout] Invalidating session...`);

  try {
    // Call Bubble logout workflow
    const url = `${bubbleAuthBaseUrl}/wf/logout-user`;
    console.log(`[logout] Calling Bubble API: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`[logout] Bubble response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log(`[logout] ✅ Logout successful (Bubble API confirmed)`);
      console.log(`[logout] ========== LOGOUT COMPLETE ==========`);

      return {
        success: true,
        message: 'Logout successful'
      };
    } else {
      // Bubble API returned error, but we still succeed locally
      console.log(`[logout] ⚠️ Bubble API returned error, but logout succeeds locally`);
      console.log(`[logout] ========== LOGOUT COMPLETE (LOCAL) ==========`);

      return {
        success: true,
        message: 'Logged out locally'
      };
    }

  } catch (error) {
    // Network error or other failure - still succeed locally
    console.error(`[logout] ⚠️ Logout API error (but succeeding locally):`, error);
    console.log(`[logout] ========== LOGOUT COMPLETE (LOCAL) ==========`);

    return {
      success: true,
      message: 'Logged out locally (network error)'
    };
  }
}
