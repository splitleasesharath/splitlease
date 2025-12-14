/**
 * Signup Handler - Register new user via Supabase Auth (Native)
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Check if email already exists in public.user table
 * 4. Check if email already exists in Supabase Auth
 * 5. Generate Supabase IDs using generate_bubble_id():
 *    - user_id (primary _id for user table)
 *    - host_account_id (primary _id for account_host table)
 * 6. Create Supabase Auth user (auth.users table)
 * 7. Sign in user to get session tokens
 * 8. Insert account_host row with generated ID
 * 9. Insert user profile into public.user table with:
 *    - _id = generated user_id
 *    - Account - Host / Landlord = host_account_id
 * 10. Return session tokens and user data
 *
 * NO FALLBACK - If any operation fails, entire signup fails
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, password, retype, additionalData?}
 *   additionalData may include: firstName, lastName, userType, birthDate, phoneNumber
 * @returns {access_token, refresh_token, user_id, host_account_id, supabase_user_id, expires_in}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueSignupSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

interface SignupAdditionalData {
  firstName?: string;
  lastName?: string;
  userType?: 'Host' | 'Guest';
  birthDate?: string; // ISO format: YYYY-MM-DD
  phoneNumber?: string;
}

export async function handleSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[signup] ========== SIGNUP REQUEST (SUPABASE NATIVE) ==========');

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

  // Map userType string to os_user_type.display for foreign key constraint
  // Foreign key references os_user_type(display) which contains full descriptive strings
  const userTypeDisplayMap: Record<string, string> = {
    'Host': 'A Host (I have a space available to rent)',
    'host': 'A Host (I have a space available to rent)',
    'Guest': 'A Guest (I would like to rent a space)',
    'guest': 'A Guest (I would like to rent a space)',
    'Split Lease': 'Split Lease',
    'split_lease': 'Split Lease',
    'Trial Host': 'Trial Host',
    'trial_host': 'Trial Host'
  };
  const userTypeDisplay = userTypeDisplayMap[userType] ?? 'A Guest (I would like to rent a space)'; // Default to Guest

  console.log(`[signup] Registering new user: ${email}`);
  console.log(`[signup] Additional data: firstName=${firstName}, lastName=${lastName}, userType=${userType} -> display="${userTypeDisplay}"`);

  // Client-side validation
  if (password.length < 4) {
    throw new BubbleApiError('Password must be at least 4 characters long.', 400);
  }

  if (password !== retype) {
    throw new BubbleApiError('The two passwords do not match!', 400);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BubbleApiError('Please enter a valid email address.', 400);
  }

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== CHECK FOR EXISTING USER ==========
    console.log('[signup] Checking if email already exists...');

    // Check in public.user table
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select('_id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('[signup] Error checking existing user:', userCheckError.message);
      throw new BubbleApiError('Failed to verify email availability', 500);
    }

    if (existingUser) {
      console.log('[signup] Email already exists in user table:', email);
      throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
    }

    // Check in Supabase Auth
    let existingAuthUser = null;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && authUsers?.users) {
        existingAuthUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      }
    } catch (listErr) {
      console.log('[signup] Could not list auth users:', listErr);
    }

    if (existingAuthUser) {
      console.log('[signup] Email already exists in Supabase Auth:', email);
      throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
    }

    console.log('[signup] ✅ Email is available');

    // ========== GENERATE BUBBLE-STYLE IDs ==========
    console.log('[signup] Generating IDs using generate_bubble_id()...');

    const { data: generatedUserId, error: userIdError } = await supabaseAdmin.rpc('generate_bubble_id');
    const { data: generatedHostId, error: hostIdError } = await supabaseAdmin.rpc('generate_bubble_id');

    if (userIdError || hostIdError) {
      console.error('[signup] Failed to generate IDs:', userIdError || hostIdError);
      throw new BubbleApiError('Failed to generate unique IDs', 500);
    }

    console.log(`[signup]    Generated User ID: ${generatedUserId}`);
    console.log(`[signup]    Generated Host Account ID: ${generatedHostId}`);

    // ========== CREATE SUPABASE AUTH USER ==========
    console.log('[signup] Creating Supabase Auth user...');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm for immediate login
      user_metadata: {
        user_id: generatedUserId,
        host_account_id: generatedHostId,
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        birth_date: birthDate,
        phone_number: phoneNumber
      }
    });

    if (authError) {
      console.error('[signup] Supabase Auth user creation failed:', authError.message);

      // Map Supabase auth errors to user-friendly messages
      if (authError.message.includes('already registered')) {
        throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
      }
      throw new BubbleApiError(`Failed to create account: ${authError.message}`, 500);
    }

    const supabaseUserId = authData.user?.id;
    console.log('[signup] ✅ Supabase Auth user created:', supabaseUserId);

    // ========== SIGN IN TO GET SESSION TOKENS ==========
    console.log('[signup] Signing in user to get session tokens...');

    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (signInError || !sessionData.session) {
      console.error('[signup] Failed to sign in user:', signInError?.message);
      // User was created but couldn't get session - clean up
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
      throw new BubbleApiError('Failed to create session. Please try again.', 500);
    }

    const { access_token, refresh_token, expires_in } = sessionData.session;
    console.log('[signup] ✅ Session created, expires in:', expires_in, 'seconds');

    // ========== CREATE DATABASE RECORDS ==========
    const now = new Date().toISOString();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    // Parse birthDate to timestamp if provided
    let dateOfBirth: string | null = null;
    if (birthDate) {
      try {
        dateOfBirth = new Date(birthDate).toISOString();
      } catch (e) {
        console.log('[signup] Could not parse birthDate:', birthDate);
      }
    }

    // Step 1: Insert into account_host table
    console.log('[signup] Creating account_host record...');

    const hostAccountRecord = {
      '_id': generatedHostId,
      'User': generatedUserId,
      'HasClaimedListing': false,
      'Receptivity': 0,
      'Created Date': now,
      'Modified Date': now,
      'bubble_id': null
    };

    const { error: hostInsertError } = await supabaseAdmin
      .from('account_host')
      .insert(hostAccountRecord);

    if (hostInsertError) {
      console.error('[signup] Failed to insert into account_host:', hostInsertError.message);
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
      throw new BubbleApiError(
        `Failed to create host account: ${hostInsertError.message}`,
        500
      );
    }

    console.log('[signup] ✅ account_host record created:', generatedHostId);

    // Step 2: Insert into public.user table
    console.log('[signup] Inserting into public.user table...');

    const userRecord = {
      '_id': generatedUserId,
      'bubble_id': null, // No Bubble user - native Supabase signup
      'email': email.toLowerCase(),
      'email as text': email.toLowerCase(),
      'Name - First': firstName || null,
      'Name - Last': lastName || null,
      'Name - Full': fullName,
      'Date of Birth': dateOfBirth,
      'Phone Number (as text)': phoneNumber || null,
      'Type - User Current': userTypeDisplay, // Foreign key to os_user_type.display
      'Type - User Signup': userTypeDisplay,  // Foreign key to os_user_type.display
      'Account - Host / Landlord': generatedHostId,
      'Created Date': now,
      'Modified Date': now,
      'authentication': {}, // Required jsonb field
      'user_signed_up': true // Required boolean field
    };

    console.log('[signup] User record to insert:', JSON.stringify(userRecord, null, 2));

    const { error: userInsertError } = await supabaseAdmin
      .from('user')
      .insert(userRecord);

    if (userInsertError) {
      console.error('[signup] Failed to insert into public.user:', userInsertError.message);
      // Clean up: delete host account and auth user
      await supabaseAdmin.from('account_host').delete().eq('_id', generatedHostId);
      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
      throw new BubbleApiError(
        `Failed to create user profile: ${userInsertError.message}`,
        500
      );
    }

    console.log('[signup] ✅ User inserted into public.user table');
    console.log(`[signup] ========== SIGNUP COMPLETE ==========`);
    console.log(`[signup]    User ID (_id): ${generatedUserId}`);
    console.log(`[signup]    Host Account ID: ${generatedHostId}`);
    console.log(`[signup]    Supabase Auth ID: ${supabaseUserId}`);
    console.log(`[signup]    public.user created: yes`);
    console.log(`[signup]    account_host created: yes`);

    // ========== QUEUE BUBBLE SYNC ==========
    // Queue the atomic signup operation for Bubble sync
    // This will be processed by bubble_sync Edge Function (via pg_cron or HTTP trigger)
    console.log('[signup] Queueing Bubble sync for background processing...');

    try {
      await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
      console.log('[signup] ✅ Bubble sync queued');

      // Trigger queue processing immediately (fire-and-forget, non-blocking)
      // This is a backup - pg_cron will also process the queue every minute
      triggerQueueProcessing();
      console.log('[signup] Queue processing triggered');
    } catch (syncQueueError) {
      // Log but don't fail signup - the queue item can be processed later by pg_cron
      console.error('[signup] Failed to queue Bubble sync (non-blocking):', syncQueueError);
    }

    // Return session and user data
    return {
      access_token,
      refresh_token,
      expires_in,
      user_id: generatedUserId,
      host_account_id: generatedHostId,
      supabase_user_id: supabaseUserId,
      user_type: userType
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`[signup] ========== SIGNUP ERROR ==========`);
    console.error(`[signup] Error:`, error);

    throw new BubbleApiError(
      `Failed to register user: ${error.message}`,
      500
    );
  }
}
