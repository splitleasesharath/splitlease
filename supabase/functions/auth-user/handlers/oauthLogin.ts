/**
 * OAuth Login Handler - Verify user exists and return session data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate OAuth payload (email, supabaseUserId)
 * 2. Check if email exists in public.user table
 * 3. If NOT found: Return userNotFound indicator for frontend to show signup prompt
 * 4. If found: Update Supabase Auth user metadata, return session data
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @param payload - Request payload from OAuth callback
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface OAuthLoginPayload {
  email: string;
  supabaseUserId: string;
  access_token: string;
  refresh_token: string;
}

export async function handleOAuthLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthLoginPayload
): Promise<any> {
  console.log('[oauth-login] ========== OAUTH LOGIN REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'supabaseUserId']);

  const {
    email,
    supabaseUserId,
    access_token,
    refresh_token,
  } = payload;

  console.log(`[oauth-login] Email: ${email}`);
  console.log(`[oauth-login] Supabase User ID: ${supabaseUserId}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== CHECK IF USER EXISTS ==========
    console.log('[oauth-login] Checking if user exists in database...');

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select('_id, email, "Name - First", "Name - Last", "Type - User Current", "Profile Photo"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userCheckError) {
      console.error('[oauth-login] Error checking user:', userCheckError.message);
      throw new BubbleApiError('Failed to verify user', 500);
    }

    if (!existingUser) {
      console.log('[oauth-login] User NOT found for email:', email);
      // Return userNotFound indicator for frontend to prompt signup
      return {
        userNotFound: true,
        email: email,
        message: 'No account found with this email. Please sign up first.',
      };
    }

    console.log('[oauth-login] User found:', existingUser._id);

    // ========== PARSE USER TYPE ==========
    // Convert display text back to simple type
    let userType = 'Guest';
    const userTypeDisplay = existingUser['Type - User Current'];
    if (userTypeDisplay && userTypeDisplay.includes('Host')) {
      userType = 'Host';
    } else if (userTypeDisplay && userTypeDisplay.includes('Guest')) {
      userType = 'Guest';
    }

    console.log(`[oauth-login] User Type: ${userType} (from: ${userTypeDisplay})`);

    // ========== UPDATE SUPABASE AUTH USER METADATA ==========
    // Only update if metadata not already set
    console.log('[oauth-login] Updating Supabase Auth user metadata...');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUserId,
      {
        user_metadata: {
          user_id: existingUser._id,
          host_account_id: existingUser._id, // user._id is now used directly as host reference
          first_name: existingUser['Name - First'] || '',
          last_name: existingUser['Name - Last'] || '',
          user_type: userType,
        }
      }
    );

    if (updateError) {
      console.warn('[oauth-login] Failed to update user metadata (non-blocking):', updateError.message);
      // Non-blocking - user can still login
    } else {
      console.log('[oauth-login] User metadata updated successfully');
    }

    console.log('[oauth-login] ========== OAUTH LOGIN COMPLETE ==========');

    return {
      user_id: existingUser._id,
      supabase_user_id: supabaseUserId,
      user_type: userType,
      access_token,
      refresh_token,
      firstName: existingUser['Name - First'] || '',
      lastName: existingUser['Name - Last'] || '',
      profilePhoto: existingUser['Profile Photo'] || null,
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[oauth-login] Error:', error);
    throw new BubbleApiError(
      `Failed to complete OAuth login: ${error.message}`,
      500
    );
  }
}
