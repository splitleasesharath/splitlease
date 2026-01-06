/**
 * OAuth Signup Handler - Create user record from OAuth provider data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate OAuth payload
 * 2. Check if email already exists in public.user table
 * 3. If duplicate: Return indicator for frontend to show confirmation modal
 * 4. If new: Generate ID, create user record, queue Bubble sync
 * 5. Return user data
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @param payload - Request payload from OAuth callback
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueSignupSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

interface OAuthSignupPayload {
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Host' | 'Guest';
  provider: string;
  supabaseUserId: string;
  access_token: string;
  refresh_token: string;
}

function mapUserTypeToDisplay(userType: string): string {
  const mapping: Record<string, string> = {
    'Host': 'A Host (I have a space available to rent)',
    'Guest': 'A Guest (I would like to rent a space)',
    'host': 'A Host (I have a space available to rent)',
    'guest': 'A Guest (I would like to rent a space)',
  };
  return mapping[userType] || 'A Guest (I would like to rent a space)';
}

export async function handleOAuthSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthSignupPayload
): Promise<any> {
  console.log('[oauth-signup] ========== OAUTH SIGNUP REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'supabaseUserId']);

  const {
    email,
    firstName = '',
    lastName = '',
    userType = 'Guest',
    provider,
    supabaseUserId,
    access_token,
    refresh_token,
  } = payload;

  const userTypeDisplay = mapUserTypeToDisplay(userType);

  console.log(`[oauth-signup] Provider: ${provider}`);
  console.log(`[oauth-signup] Email: ${email}`);
  console.log(`[oauth-signup] Name: ${firstName} ${lastName}`);
  console.log(`[oauth-signup] UserType: ${userType} -> ${userTypeDisplay}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== CHECK FOR EXISTING USER ==========
    console.log('[oauth-signup] Checking if email already exists...');

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select('_id, email, "Name - First", "Name - Last"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('[oauth-signup] Error checking existing user:', userCheckError.message);
      throw new BubbleApiError('Failed to verify email availability', 500);
    }

    if (existingUser) {
      console.log('[oauth-signup] Email already exists in user table:', email);
      // Return duplicate indicator for frontend to show confirmation modal
      return {
        isDuplicate: true,
        existingEmail: email,
        existingUserId: existingUser._id,
        message: 'An account with this email already exists.',
      };
    }

    console.log('[oauth-signup] Email is available');

    // ========== GENERATE BUBBLE-STYLE ID ==========
    console.log('[oauth-signup] Generating ID using generate_bubble_id()...');

    const { data: generatedUserId, error: userIdError } = await supabaseAdmin.rpc('generate_bubble_id');

    if (userIdError) {
      console.error('[oauth-signup] Failed to generate ID:', userIdError);
      throw new BubbleApiError('Failed to generate unique ID', 500);
    }

    const generatedHostId = generatedUserId;
    console.log(`[oauth-signup] Generated User ID: ${generatedUserId}`);

    // ========== CREATE DATABASE RECORD ==========
    const now = new Date().toISOString();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    console.log('[oauth-signup] Creating user record...');

    const userRecord = {
      '_id': generatedUserId,
      'bubble_id': null,
      'email': email.toLowerCase(),
      'email as text': email.toLowerCase(),
      'Name - First': firstName || null,
      'Name - Last': lastName || null,
      'Name - Full': fullName,
      'Date of Birth': null, // OAuth signup skips DOB
      'Phone Number (as text)': null, // OAuth signup skips phone
      'Type - User Current': userTypeDisplay,
      'Type - User Signup': userTypeDisplay,
      'Created Date': now,
      'Modified Date': now,
      'authentication': {},
      'user_signed_up': true,
      'Receptivity': 0,
      'MedianHoursToReply': null,
      'Listings': null,
    };

    console.log('[oauth-signup] User record to insert:', JSON.stringify(userRecord, null, 2));

    const { error: userInsertError } = await supabaseAdmin
      .from('user')
      .insert(userRecord);

    if (userInsertError) {
      console.error('[oauth-signup] Failed to insert user:', userInsertError.message);
      throw new BubbleApiError(
        `Failed to create user profile: ${userInsertError.message}`,
        500
      );
    }

    console.log('[oauth-signup] User inserted into public.user table');

    // ========== UPDATE SUPABASE AUTH USER METADATA ==========
    console.log('[oauth-signup] Updating Supabase Auth user metadata...');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUserId,
      {
        user_metadata: {
          user_id: generatedUserId,
          host_account_id: generatedHostId,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
        }
      }
    );

    if (updateError) {
      console.warn('[oauth-signup] Failed to update user metadata (non-blocking):', updateError);
      // Non-blocking - user record already created
    }

    // ========== QUEUE BUBBLE SYNC ==========
    console.log('[oauth-signup] Queueing Bubble sync...');

    try {
      await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
      console.log('[oauth-signup] Bubble sync queued');
      triggerQueueProcessing();
    } catch (syncQueueError) {
      console.error('[oauth-signup] Failed to queue Bubble sync (non-blocking):', syncQueueError);
    }

    console.log('[oauth-signup] ========== OAUTH SIGNUP COMPLETE ==========');

    return {
      isNewUser: true,
      user_id: generatedUserId,
      host_account_id: generatedHostId,
      supabase_user_id: supabaseUserId,
      user_type: userType,
      access_token,
      refresh_token,
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[oauth-signup] Error:', error);
    throw new BubbleApiError(
      `Failed to complete OAuth signup: ${error.message}`,
      500
    );
  }
}
