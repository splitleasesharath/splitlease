/**
 * Login Handler - Authenticate user via Bubble
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Validate email/password in payload
 * 2. Call Bubble login workflow (BUBBLE_API_BASE_URL/wf/login-user)
 * 3. If successful, Bubble returns {token, user_id (bubble_id), expires}
 * 4. Look up user in Supabase by bubble_id to get the Supabase _id
 * 5. Return token and Supabase _id to client
 *
 * NO FALLBACK - If Bubble login fails or user not found in Supabase, entire operation fails
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Service role key for bypassing RLS
 * @param payload - Request payload {email, password}
 * @returns {token, user_id (_id), bubble_id, expires}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleLogin(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[login] ========== LOGIN REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  console.log(`[login] Authenticating user: ${email}`);

  try {
    // Call Bubble login workflow
    const url = `${bubbleAuthBaseUrl}/wf/login-user`;
    console.log(`[login] Calling Bubble API: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    console.log(`[login] Bubble response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log(`[login] Bubble response:`, JSON.stringify(data, null, 2));

    // Check if login was successful
    if (!response.ok || data.status !== 'success') {
      console.error(`[login] Login failed:`, data.reason || data.message);

      // Return user-friendly error message
      const errorMessage = data.message || 'Login failed. Please check your credentials.';
      throw new BubbleApiError(errorMessage, response.status, data.reason);
    }

    // Extract response data
    const token = data.response?.token;
    const userId = data.response?.user_id;
    const expires = data.response?.expires;

    if (!token || !userId) {
      console.error(`[login] Missing token or user_id in response:`, data);
      throw new BubbleApiError('Login response missing required fields', 500);
    }

    console.log(`[login] ✅ Bubble login successful`);
    console.log(`[login]    Bubble User ID: ${userId}`);
    console.log(`[login]    Token expires in: ${expires} seconds`);

    // Look up user in Supabase by bubble_id to get the Supabase _id
    console.log(`[login] Looking up user in Supabase by bubble_id...`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id')
      .eq('bubble_id', userId)
      .single();

    if (userError) {
      console.error(`[login] Supabase query error:`, userError);
      throw new SupabaseSyncError(`Failed to fetch user from Supabase: ${userError.message}`, userError);
    }

    if (!userData) {
      console.error(`[login] User not found in Supabase by bubble_id: ${userId}`);
      throw new SupabaseSyncError(`User not found in Supabase with bubble_id: ${userId}`);
    }

    const supabaseId = userData._id;
    console.log(`[login]    Supabase _id: ${supabaseId}`);
    console.log(`[login] ========== LOGIN COMPLETE ==========`);

    // Return authentication data with Supabase _id as user_id
    return {
      token,
      user_id: supabaseId,
      bubble_id: userId,
      expires
    };

  } catch (error) {
    if (error instanceof BubbleApiError || error instanceof SupabaseSyncError) {
      throw error;
    }

    console.error(`[login] ========== LOGIN ERROR ==========`);
    console.error(`[login] Error:`, error);

    throw new BubbleApiError(
      `Failed to authenticate user: ${error.message}`,
      500,
      error
    );
  }
}
