/**
 * Signup Handler - Register new user via Bubble + Supabase Auth
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Call Bubble signup workflow (BUBBLE_API_BASE_URL/wf/signup-user)
 * 4. If successful, Bubble creates user and returns {token, user_id, expires}
 * 5. Create Supabase Auth user (non-blocking - failures logged but don't break signup)
 * 6. Return token and user data (including supabase_user_id if created)
 *
 * NO FALLBACK - If Bubble signup fails, entire operation fails
 * Supabase Auth creation is additive - failures are logged but don't break the flow
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, password, retype, additionalData?}
 *   additionalData may include: firstName, lastName, userType, birthDate, phoneNumber
 * @returns {token, user_id, expires, supabase_user_id}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface SignupAdditionalData {
  firstName?: string;
  lastName?: string;
  userType?: 'Host' | 'Guest';
  birthDate?: string; // ISO format: YYYY-MM-DD
  phoneNumber?: string;
}

export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[signup] ========== SIGNUP REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password', 'retype']);
  const { email, password, retype, additionalData } = payload;

  // Extract additional signup data
  const {
    firstName = '',
    lastName = '',
    userType = 'Guest',
    birthDate = '',
    phoneNumber = ''
  }: SignupAdditionalData = additionalData || {};

  console.log(`[signup] Registering new user: ${email}`);
  console.log(`[signup] Additional data: firstName=${firstName}, lastName=${lastName}, userType=${userType}`);

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

    // Build request body with all required fields (camelCase as Bubble expects)
    const requestBody: Record<string, any> = {
      email,
      password,
      retype,
      firstName,
      lastName,
      userType,
      birthDate,
      phoneNumber
    };

    console.log(`[signup] Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`
      },
      body: JSON.stringify(requestBody)
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

    console.log(`[signup] ✅ Bubble signup successful`);
    console.log(`[signup]    Bubble User ID: ${userId}`);
    console.log(`[signup]    Token expires in: ${expires} seconds`);

    // ========== SUPABASE AUTH USER CREATION ==========
    // Non-blocking: Failures are logged but don't break signup
    let supabaseUserId: string | null = null;

    try {
      console.log('[signup] Creating Supabase Auth user...');

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // Check if user already exists in Supabase Auth (e.g., from previous attempt)
      let existingUser = null;
      try {
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        existingUser = allUsers?.users?.find(u => u.email === email);
      } catch (listErr) {
        console.log('[signup] Could not list users, will try to create:', listErr);
      }

      if (existingUser) {
        console.log('[signup] Supabase user already exists, updating metadata to link Bubble ID...');
        supabaseUserId = existingUser.id;

        // Update metadata to include Bubble user ID
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            bubble_user_id: userId,
            first_name: firstName || existingUser.user_metadata?.first_name,
            last_name: lastName || existingUser.user_metadata?.last_name,
            user_type: userType || existingUser.user_metadata?.user_type
          }
        });

        if (updateError) {
          console.error('[signup] Failed to update existing Supabase user metadata:', updateError.message);
        } else {
          console.log('[signup] ✅ Linked existing Supabase user to Bubble ID');
        }
      } else {
        // Create new Supabase Auth user
        const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Auto-confirm since Bubble already validated
          user_metadata: {
            bubble_user_id: userId,
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
            birth_date: birthDate,
            phone_number: phoneNumber
          }
        });

        if (supabaseError) {
          console.error('[signup] Supabase user creation failed:', supabaseError.message);
          // Don't throw - Bubble signup succeeded, log and continue
        } else {
          supabaseUserId = supabaseUser.user?.id || null;
          console.log('[signup] ✅ Supabase Auth user created:', supabaseUserId);
        }
      }
    } catch (supabaseErr) {
      console.error('[signup] Supabase user creation error:', supabaseErr);
      // Non-fatal: Bubble signup succeeded, continue with null supabase_user_id
    }

    console.log(`[signup] ========== SIGNUP COMPLETE ==========`);
    console.log(`[signup]    Bubble User ID: ${userId}`);
    console.log(`[signup]    Supabase User ID: ${supabaseUserId || 'not created'}`);

    // Return authentication data (user is automatically logged in)
    return {
      token,
      user_id: userId,
      expires,
      supabase_user_id: supabaseUserId
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
