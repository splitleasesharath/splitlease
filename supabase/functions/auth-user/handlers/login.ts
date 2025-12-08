/**
 * Login Handler - Authenticate user via Supabase Auth (Native)
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email/password in payload
 * 2. Sign in with Supabase Auth (signInWithPassword)
 * 3. Fetch user profile from public.user table
 * 4. Return session tokens and user data
 *
 * NO FALLBACK - If login fails, entire operation fails
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, password}
 * @returns {access_token, refresh_token, user_id, expires_in, user_type}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[login] ========== LOGIN REQUEST (SUPABASE NATIVE) ==========');

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  console.log(`[login] Authenticating user: ${email}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== SIGN IN WITH SUPABASE AUTH ==========
    console.log('[login] Signing in with Supabase Auth...');

    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (signInError) {
      console.error('[login] Supabase Auth sign in failed:', signInError.message);

      // Map Supabase auth errors to user-friendly messages
      if (signInError.message.includes('Invalid login credentials')) {
        throw new BubbleApiError('Invalid email or password.', 401);
      }
      if (signInError.message.includes('Email not confirmed')) {
        throw new BubbleApiError('Please confirm your email before logging in.', 401);
      }
      throw new BubbleApiError(`Login failed: ${signInError.message}`, 401);
    }

    if (!sessionData.session) {
      console.error('[login] No session returned from Supabase Auth');
      throw new BubbleApiError('Failed to create session. Please try again.', 500);
    }

    const { access_token, refresh_token, expires_in } = sessionData.session;
    const supabaseUserId = sessionData.user?.id;

    console.log('[login] ✅ Supabase Auth sign in successful');
    console.log('[login]    Supabase User ID:', supabaseUserId);
    console.log('[login]    Session expires in:', expires_in, 'seconds');

    // ========== FETCH USER PROFILE FROM DATABASE ==========
    console.log('[login] Fetching user profile from database...');

    // Get user_id from user metadata (set during signup)
    const userMetadata = sessionData.user?.user_metadata;
    let userId = userMetadata?.user_id;
    let userType = userMetadata?.user_type;

    // If no user_id in metadata, look up by email in public.user table
    if (!userId) {
      console.log('[login] No user_id in metadata, looking up by email...');

      const { data: userData, error: userError } = await supabaseAdmin
        .from('user')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError) {
        console.error('[login] Error fetching user profile:', userError.message);
        // Don't fail login - user authenticated successfully
      } else if (userData) {
        userId = userData._id;
        userType = userData['Type - User Current'];
        console.log('[login] Found user in database:', userId);
      }
    }

    // If still no userId, use the Supabase Auth ID as fallback
    if (!userId) {
      console.log('[login] Using Supabase Auth ID as user_id');
      userId = supabaseUserId;
    }

    console.log('[login] ✅ Login complete');
    console.log('[login]    User ID:', userId);
    console.log('[login]    User Type:', userType || 'Unknown');
    console.log('[login] ========== LOGIN COMPLETE ==========');

    // Return authentication data
    // Using same field names as signup for consistency
    return {
      access_token,
      refresh_token,
      expires_in,
      user_id: userId,
      supabase_user_id: supabaseUserId,
      user_type: userType || null,
      // Legacy field names for backward compatibility
      token: access_token,
      expires: expires_in
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[login] ========== LOGIN ERROR ==========');
    console.error('[login] Error:', error);

    throw new BubbleApiError(
      `Failed to authenticate user: ${error.message}`,
      500,
      error
    );
  }
}
