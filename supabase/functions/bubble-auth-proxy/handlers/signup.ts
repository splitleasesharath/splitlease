/**
 * Signup Handler - Register new user via Bubble
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Call Bubble signup workflow (BUBBLE_AUTH_BASE_URL/wf/signup-user)
 * 4. If successful, Bubble creates user and returns {token, user_id, expires}
 * 5. Auto-login user (return token and user data)
 *
 * NO FALLBACK - If Bubble signup fails, entire operation fails
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble
 * @param payload - Request payload {email, password, retype}
 * @returns {token, user_id, expires}
 */

import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any> {
  console.log('[signup] ========== SIGNUP REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password', 'retype']);
  const { email, password, retype } = payload;

  console.log(`[signup] Registering new user: ${email}`);

  // Client-side validation (same as current auth.js)
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  if (password !== retype) {
    throw new Error('The two passwords do not match!');
  }

  try {
    // Call Bubble signup workflow
    const url = `${bubbleAuthBaseUrl}/wf/signup-user`;
    console.log(`[signup] Calling Bubble API: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`
      },
      body: JSON.stringify({
        email,
        password,
        retype
      })
    });

    console.log(`[signup] Bubble response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log(`[signup] Bubble response:`, JSON.stringify(data, null, 2));

    // Check if signup was successful
    if (!response.ok || data.status !== 'success') {
      console.error(`[signup] Signup failed:`, data.reason || data.message);

      // Map Bubble error reasons to user-friendly messages
      let errorMessage = data.message || 'Signup failed. Please try again.';

      if (data.reason === 'NOT_VALID_EMAIL') {
        errorMessage = data.message || 'Please enter a valid email address.';
      } else if (data.reason === 'USED_EMAIL') {
        errorMessage = data.message || 'This email is already in use.';
      } else if (data.reason === 'DO_NOT_MATCH') {
        errorMessage = data.message || 'The two passwords do not match!';
      }

      throw new BubbleApiError(errorMessage, response.status, data.reason);
    }

    // Extract response data
    const token = data.response?.token;
    const userId = data.response?.user_id;
    const expires = data.response?.expires;

    if (!token || !userId) {
      console.error(`[signup] Missing token or user_id in response:`, data);
      throw new BubbleApiError('Signup response missing required fields', 500);
    }

    console.log(`[signup] ✅ Signup successful`);
    console.log(`[signup]    User ID: ${userId}`);
    console.log(`[signup]    Token expires in: ${expires} seconds`);
    console.log(`[signup]    User automatically logged in`);
    console.log(`[signup] ========== SIGNUP COMPLETE ==========`);

    // Return authentication data (user is automatically logged in)
    return {
      token,
      user_id: userId,
      expires
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`[signup] ========== SIGNUP ERROR ==========`);
    console.error(`[signup] Error:`, error);

    throw new BubbleApiError(
      `Failed to register user: ${error.message}`,
      500,
      error
    );
  }
}
