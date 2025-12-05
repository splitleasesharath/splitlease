/**
 * Signup Handler - Register new user via Bubble + Supabase
 * Split Lease - bubble-auth-proxy
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Call Bubble signup workflow (BUBBLE_API_BASE_URL/wf/signup-user)
 * 4. If successful, Bubble creates user and returns {token, bubble_user_id, expires}
 * 5. Generate Supabase IDs using generate_bubble_id():
 *    - user_id (primary _id for user table)
 *    - host_account_id (primary _id for account_host table)
 *    - guest_account_id (primary _id for account_guest table)
 * 6. Create Supabase Auth user (auth.users table)
 * 7. Insert account_host row with generated ID
 * 8. Insert account_guest row with generated ID
 * 9. Insert user profile into public.user table with:
 *    - _id = generated user_id
 *    - bubble_id = Bubble's user_id (for backward compatibility)
 *    - Account - Host / Landlord = host_account_id
 *    - Account - Guest = guest_account_id
 * 10. Return token and user data
 *
 * NO FALLBACK - If Bubble signup OR any insert fails, entire operation fails
 * Supabase Auth user creation is best-effort (logged but doesn't block)
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
    console.log(`[signup]    Bubble User ID (stored as bubble_id): ${userId}`);
    console.log(`[signup]    Token expires in: ${expires} seconds`);

    // ========== SUPABASE USER CREATION (BLOCKING) ==========
    // Frontend waits for this to complete before proceeding
    let supabaseUserId: string | null = null;

    console.log('[signup] Creating Supabase users (auth + accounts + public.user)...');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ========== GENERATE BUBBLE-STYLE IDs ==========
    console.log('[signup] Generating Supabase IDs using generate_bubble_id()...');

    const { data: generatedIds, error: idGenError } = await supabaseAdmin.rpc('generate_bubble_id');
    const { data: generatedHostId, error: hostIdError } = await supabaseAdmin.rpc('generate_bubble_id');
    const { data: generatedGuestId, error: guestIdError } = await supabaseAdmin.rpc('generate_bubble_id');

    if (idGenError || hostIdError || guestIdError) {
      console.error('[signup] Failed to generate IDs:', idGenError || hostIdError || guestIdError);
      throw new BubbleApiError('Failed to generate unique IDs', 500);
    }

    const generatedUserId = generatedIds as string;
    const hostAccountId = generatedHostId as string;
    const guestAccountId = generatedGuestId as string;

    console.log(`[signup]    Generated User ID: ${generatedUserId}`);
    console.log(`[signup]    Generated Host Account ID: ${hostAccountId}`);
    console.log(`[signup]    Generated Guest Account ID: ${guestAccountId}`);

    // Step 1: Create Supabase Auth user
    console.log('[signup] Step 1: Creating Supabase Auth user...');

    // Check if user already exists in Supabase Auth (e.g., from previous attempt)
    let existingAuthUser = null;
    try {
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
      existingAuthUser = allUsers?.users?.find(u => u.email === email);
    } catch (listErr) {
      console.log('[signup] Could not list users, will try to create:', listErr);
    }

    if (existingAuthUser) {
      console.log('[signup] Supabase Auth user already exists, updating metadata...');
      supabaseUserId = existingAuthUser.id;

      // Update metadata to include both IDs
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          ...existingAuthUser.user_metadata,
          user_id: generatedUserId,
          bubble_user_id: userId,
          host_account_id: hostAccountId,
          guest_account_id: guestAccountId,
          first_name: firstName || existingAuthUser.user_metadata?.first_name,
          last_name: lastName || existingAuthUser.user_metadata?.last_name,
          user_type: userType || existingAuthUser.user_metadata?.user_type
        }
      });

      if (updateError) {
        console.error('[signup] Failed to update Supabase Auth user metadata:', updateError.message);
      } else {
        console.log('[signup] ✅ Updated existing Supabase Auth user');
      }
    } else {
      // Create new Supabase Auth user
      const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm since Bubble already validated
        user_metadata: {
          user_id: generatedUserId,
          bubble_user_id: userId,
          host_account_id: hostAccountId,
          guest_account_id: guestAccountId,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          birth_date: birthDate,
          phone_number: phoneNumber
        }
      });

      if (supabaseError) {
        console.error('[signup] Supabase Auth user creation failed:', supabaseError.message);
        // Continue to public.user creation even if auth fails
      } else {
        supabaseUserId = supabaseUser.user?.id || null;
        console.log('[signup] ✅ Supabase Auth user created:', supabaseUserId);
      }
    }

    const now = new Date().toISOString();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    // Step 2: Insert into account_host table
    console.log('[signup] Step 2: Creating account_host record...');

    const hostAccountRecord = {
      '_id': hostAccountId,
      'User': generatedUserId,
      'HasClaimedListing': false,
      'Receptivity': 0,
      'Created Date': now,
      'Modified Date': now,
      'bubble_id': null // Will be synced from Bubble if needed
    };

    const { error: hostInsertError } = await supabaseAdmin
      .from('account_host')
      .insert(hostAccountRecord);

    if (hostInsertError) {
      console.error('[signup] Failed to insert into account_host:', hostInsertError.message);
      throw new BubbleApiError(
        `Failed to create host account: ${hostInsertError.message}`,
        500,
        hostInsertError
      );
    }

    console.log('[signup] ✅ account_host record created:', hostAccountId);

    // Step 3: Insert into account_guest table
    console.log('[signup] Step 3: Creating account_guest record...');

    const guestAccountRecord = {
      '_id': guestAccountId,
      'User': generatedUserId,
      'Email': email,
      'Created Date': now,
      'Modified Date': now,
      'bubble_id': null // Will be synced from Bubble if needed
    };

    const { error: guestInsertError } = await supabaseAdmin
      .from('account_guest')
      .insert(guestAccountRecord);

    if (guestInsertError) {
      console.error('[signup] Failed to insert into account_guest:', guestInsertError.message);
      throw new BubbleApiError(
        `Failed to create guest account: ${guestInsertError.message}`,
        500,
        guestInsertError
      );
    }

    console.log('[signup] ✅ account_guest record created:', guestAccountId);

    // Step 4: Insert into public.user table
    console.log('[signup] Step 4: Inserting into public.user table...');

    // Parse birthDate to timestamp if provided
    let dateOfBirth: string | null = null;
    if (birthDate) {
      try {
        dateOfBirth = new Date(birthDate).toISOString();
      } catch (e) {
        console.log('[signup] Could not parse birthDate:', birthDate);
      }
    }

    const userRecord = {
      '_id': generatedUserId,
      'bubble_id': userId, // Store Bubble's user_id for backward compatibility
      'email as text': email,
      'Name - First': firstName || null,
      'Name - Last': lastName || null,
      'Name - Full': fullName,
      'Date of Birth': dateOfBirth,
      'Phone Number (as text)': phoneNumber || null,
      'Type - User Current': userType || 'Guest',
      'Type - User Signup': userType || 'Guest',
      'Account - Host / Landlord': hostAccountId,
      'Account - Guest': guestAccountId,
      'Created Date': now,
      'Modified Date': now,
      'authentication': {}, // Required jsonb field
      'user_signed_up': true // Required boolean field
    };

    console.log('[signup] User record to insert:', JSON.stringify(userRecord, null, 2));

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('user')
      .upsert(userRecord, { onConflict: '_id' })
      .select('_id')
      .single();

    if (insertError) {
      console.error('[signup] Failed to insert into public.user:', insertError.message);
      throw new BubbleApiError(
        `Failed to create user profile: ${insertError.message}`,
        500,
        insertError
      );
    }

    console.log('[signup] ✅ User inserted into public.user table');
    console.log(`[signup] ========== SIGNUP COMPLETE ==========`);
    console.log(`[signup]    User ID (_id): ${generatedUserId}`);
    console.log(`[signup]    Bubble User ID (bubble_id): ${userId}`);
    console.log(`[signup]    Host Account ID: ${hostAccountId}`);
    console.log(`[signup]    Guest Account ID: ${guestAccountId}`);
    console.log(`[signup]    Supabase Auth ID: ${supabaseUserId || 'not created'}`);
    console.log(`[signup]    public.user created: yes`);
    console.log(`[signup]    account_host created: yes`);
    console.log(`[signup]    account_guest created: yes`);

    // Return authentication data (user is automatically logged in)
    // Note: user_id now returns our generated ID, bubble_id contains Bubble's ID
    return {
      token,
      user_id: generatedUserId,
      bubble_id: userId,
      host_account_id: hostAccountId,
      guest_account_id: guestAccountId,
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
