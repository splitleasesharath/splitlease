/**
 * Signup Handler - Register new user via Bubble
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Call Bubble signup workflow (BUBBLE_API_BASE_URL/wf/signup-user)
 * 4. If successful, Bubble creates user and returns {token, user_id, expires}
 * 5. Auto-login user (return token and user data)
 *
 * NO FALLBACK - If Bubble signup fails, entire operation fails
 *
 * @param bubbleAuthBaseUrl - Base URL for Bubble auth API
 * @param bubbleApiKey - API key for Bubble
 * @param payload - Request payload {email, password, retype, additionalData?}
 *   additionalData may include: firstName, lastName, userType, birthDate, phoneNumber
 * @returns {token, user_id, expires}
 */

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

    // Build request body with all available fields
    const requestBody: Record<string, any> = {
      email,
      password,
      retype
    };

    // Add optional fields if provided
    if (firstName) requestBody.first_name = firstName;
    if (lastName) requestBody.last_name = lastName;
    if (userType) requestBody.user_type = userType;
    if (birthDate) requestBody.birth_date = birthDate;
    if (phoneNumber) requestBody.phone_number = phoneNumber;

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

    console.log(`[signup] ✅ Signup successful`);
    console.log(`[signup]    User ID: ${userId}`);
    console.log(`[signup]    Token expires in: ${expires} seconds`);
    console.log(`[signup]    User automatically logged in`);

    // Insert user into Supabase
    console.log(`[signup] Inserting user into Supabase...`);

    // Build Supabase user record with all available fields
    const supabaseUserRecord: Record<string, any> = {
      '_id': userId,
      'email as text': email
    };

    // Add optional fields if provided (using Supabase column names)
    if (firstName) supabaseUserRecord['Name - First'] = firstName;
    if (lastName) supabaseUserRecord['Name - Last'] = lastName;
    if (userType) supabaseUserRecord['Type - User Current'] = userType;
    // Convert birthDate from ISO string to PostgreSQL timestamp format if provided
    if (birthDate) {
      try {
        // Parse ISO date string and convert to timestamp
        const dateObj = new Date(birthDate);
        if (isNaN(dateObj.getTime())) {
          console.warn(`[signup] Invalid birthDate format: ${birthDate}, skipping`);
        } else {
          supabaseUserRecord['Date of Birth'] = dateObj.toISOString();
        }
      } catch (e) {
        console.warn(`[signup] Error parsing birthDate: ${e}, skipping`);
      }
    }
    if (phoneNumber) supabaseUserRecord['Phone Number (as text)'] = phoneNumber;

    console.log(`[signup] Supabase user record:`, JSON.stringify(supabaseUserRecord, null, 2));

    try {
      const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(supabaseUserRecord)
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        console.error(`[signup] Supabase insert failed: ${supabaseResponse.status} - ${errorText}`);
        // Log but don't fail - user exists in Bubble
      } else {
        console.log(`[signup] ✅ User inserted into Supabase`);
      }
    } catch (supabaseError) {
      console.error(`[signup] Supabase insert error: ${supabaseError}`);
      // Log but don't fail - user exists in Bubble
    }

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
