/**
 * Login Handler - Authenticate user via Supabase Auth (Native)
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email/password in payload
 * 2. Authenticate via Supabase Auth (signInWithPassword)
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
import { BubbleApiError, SupabaseSyncError } from '../../_shared/errors.ts';
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
    // ========== AUTHENTICATE VIA SUPABASE AUTH ==========
    console.log('[login] Signing in via Supabase Auth...');

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });

    if (authError) {
      console.error(`[login] Auth error:`, authError.message);

      // Map common auth errors to user-friendly messages
      if (authError.message.includes('Invalid login credentials')) {
        throw new BubbleApiError('Invalid email or password. Please try again.', 401);
      }
      if (authError.message.includes('Email not confirmed')) {
        throw new BubbleApiError('Please verify your email address before logging in.', 401);
      }

      throw new BubbleApiError(authError.message, 401);
    }

    if (!authData.session || !authData.user) {
      console.error(`[login] No session returned from auth`);
      throw new BubbleApiError('Authentication failed. Please try again.', 401);
    }

    const { session, user: authUser } = authData;
    console.log(`[login] ✅ Supabase Auth successful`);
    console.log(`[login]    Auth User ID: ${authUser.id}`);
    console.log(`[login]    Email: ${authUser.email}`);

    // ========== FETCH USER PROFILE ==========
    console.log('[login] Fetching user profile from public.user table...');

    // First try to find user by email
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user')
      .select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error(`[login] Profile fetch error:`, profileError.message);
      // Don't fail login - user might exist in auth but not in public.user yet
    }

    // Get user_id from profile or user_metadata
    let userId = userProfile?._id || authUser.user_metadata?.user_id || authUser.id;
    let userType = authUser.user_metadata?.user_type || 'Guest';
    let hostAccountId = userProfile?.['Account - Host / Landlord'] || authUser.user_metadata?.host_account_id;

    console.log(`[login] ✅ User profile loaded`);
    console.log(`[login]    User ID (_id): ${userId}`);
    console.log(`[login]    User Type: ${userType}`);
    console.log(`[login]    Host Account ID: ${hostAccountId}`);

    // ========== RETURN SESSION DATA ==========
    const { access_token, refresh_token, expires_in } = session;

    console.log(`[login] ========== LOGIN COMPLETE ==========`);

    return {
      access_token,
      refresh_token,
      expires_in,
      user_id: userId,
      supabase_user_id: authUser.id,
      user_type: userType,
      host_account_id: hostAccountId,
      email: authUser.email,
      firstName: userProfile?.['First Name'] || '',
      lastName: userProfile?.['Last Name'] || '',
      profilePhoto: userProfile?.['Profile Photo'] || null
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
