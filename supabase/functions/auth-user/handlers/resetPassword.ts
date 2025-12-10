/**
 * Reset Password Request Handler - Send password reset email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Check if user exists in auth.users - if not, check public.user (legacy)
 * 3. For legacy users: create auth.users entry first, then send reset
 * 4. Call Supabase Auth resetPasswordForEmail
 * 5. Return success (always - don't reveal if email exists)
 *
 * SECURITY: Always returns success to prevent email enumeration
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, redirectTo?}
 * @returns {message: string, _debug?: object}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

export async function handleRequestPasswordReset(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[reset-password] ========== PASSWORD RESET REQUEST ==========');
  console.log('[reset-password] Supabase URL:', supabaseUrl);
  console.log('[reset-password] Payload received:', JSON.stringify(payload, null, 2));

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  const emailLower = email.toLowerCase().trim();
  console.log(`[reset-password] Requesting reset for: ${emailLower}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Debug object to track what happened (returned in response for troubleshooting)
  const debugInfo: Record<string, any> = {
    email: emailLower,
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Default redirect URL for Split Lease (production domain is split.lease, not app.split.lease)
    const resetRedirectUrl = redirectTo || 'https://split.lease/reset-password';
    debugInfo.redirectUrl = resetRedirectUrl;

    console.log(`[reset-password] Redirect URL: ${resetRedirectUrl}`);

    // ========== STEP 1: Check if user exists in auth.users ==========
    console.log('[reset-password] Step 1: Checking auth.users for existing user...');
    debugInfo.steps.push('checking_auth_users');

    let existingAuthUser = null;
    try {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('[reset-password] ❌ Failed to list auth users:', JSON.stringify({
          message: listError.message,
          status: listError.status,
          code: listError.code
        }, null, 2));
        debugInfo.listUsersError = listError.message;
      } else {
        existingAuthUser = authUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === emailLower
        );
        debugInfo.foundInAuthUsers = !!existingAuthUser;
        console.log(`[reset-password] Found in auth.users: ${!!existingAuthUser}`);
      }
    } catch (listErr: any) {
      console.error('[reset-password] ❌ Exception listing auth users:', listErr.message);
      debugInfo.listUsersException = listErr.message;
    }

    // ========== STEP 2: If not in auth.users, check public.user (legacy) ==========
    if (!existingAuthUser) {
      console.log('[reset-password] Step 2: User not in auth.users, checking public.user (legacy)...');
      debugInfo.steps.push('checking_public_user');

      const { data: legacyUser, error: legacyError } = await supabaseAdmin
        .from('user')
        .select('_id, email, "Name - First", "Name - Last", "Type - User Current", "Account - Host / Landlord"')
        .eq('email', emailLower)
        .maybeSingle();

      if (legacyError) {
        console.error('[reset-password] ❌ Failed to check public.user:', JSON.stringify({
          message: legacyError.message,
          code: legacyError.code,
          details: legacyError.details
        }, null, 2));
        debugInfo.legacyUserError = legacyError.message;
      }

      debugInfo.foundInPublicUser = !!legacyUser;
      console.log(`[reset-password] Found in public.user: ${!!legacyUser}`);

      // ========== STEP 3: Create auth.users entry for legacy user ==========
      if (legacyUser) {
        console.log('[reset-password] Step 3: Creating auth.users entry for legacy user...');
        console.log('[reset-password] Legacy user data:', JSON.stringify({
          _id: legacyUser._id,
          email: legacyUser.email,
          firstName: legacyUser['Name - First'],
          userType: legacyUser['Type - User Current']
        }, null, 2));
        debugInfo.steps.push('creating_auth_user_for_legacy');

        // Generate temporary password (user will reset it via email)
        const tempPassword = crypto.randomUUID() + crypto.randomUUID();

        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: emailLower,
          password: tempPassword,
          email_confirm: true, // Auto-confirm so reset email works
          user_metadata: {
            // Link to existing records - DO NOT create new ones
            user_id: legacyUser._id,
            host_account_id: legacyUser['Account - Host / Landlord'],
            user_type: legacyUser['Type - User Current'] || 'Guest',
            first_name: legacyUser['Name - First'] || '',
            last_name: legacyUser['Name - Last'] || '',
            migrated_from_bubble: true,
            migration_date: new Date().toISOString()
          }
        });

        if (createError) {
          console.error('[reset-password] ❌ Failed to create auth.users entry:', JSON.stringify({
            message: createError.message,
            status: createError.status,
            code: createError.code
          }, null, 2));
          debugInfo.createAuthUserError = createError.message;
          debugInfo.steps.push('create_auth_user_failed');
        } else {
          console.log('[reset-password] ✅ Successfully created auth.users entry for legacy user');
          console.log('[reset-password]    New Auth ID:', newAuthUser?.user?.id);
          console.log('[reset-password]    Linked to user._id:', legacyUser._id);
          debugInfo.createdAuthUserId = newAuthUser?.user?.id;
          debugInfo.linkedToUserId = legacyUser._id;
          debugInfo.steps.push('create_auth_user_success');
        }
      } else {
        console.log('[reset-password] User not found in public.user either - email does not exist');
        debugInfo.steps.push('user_not_found_anywhere');
      }
    } else {
      console.log('[reset-password] User already exists in auth.users - standard reset flow');
      debugInfo.steps.push('user_exists_in_auth');
    }

    // ========== STEP 4: Send password reset email ==========
    console.log('[reset-password] Step 4: Sending password reset email via Supabase Auth...');
    debugInfo.steps.push('sending_reset_email');

    const { data: resetData, error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      emailLower,
      { redirectTo: resetRedirectUrl }
    );

    if (resetError) {
      console.error('[reset-password] ❌ RESET EMAIL ERROR:', JSON.stringify({
        message: resetError.message,
        status: resetError.status,
        code: resetError.code,
        name: resetError.name,
        stack: resetError.stack
      }, null, 2));
      debugInfo.resetEmailError = {
        message: resetError.message,
        status: resetError.status,
        code: resetError.code
      };
      debugInfo.steps.push('reset_email_failed');
      debugInfo.emailSent = false;
    } else {
      console.log('[reset-password] ✅ Password reset email sent successfully');
      console.log('[reset-password] Reset response data:', JSON.stringify(resetData, null, 2));
      debugInfo.resetEmailResponse = resetData;
      debugInfo.steps.push('reset_email_sent');
      debugInfo.emailSent = true;
    }

    console.log('[reset-password] ========== REQUEST COMPLETE ==========');
    console.log('[reset-password] Debug summary:', JSON.stringify(debugInfo, null, 2));

    // Return success message (security) plus debug info for troubleshooting
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      _debug: debugInfo // Include debug info in response for troubleshooting
    };

  } catch (error: any) {
    console.error('[reset-password] ========== UNEXPECTED ERROR ==========');
    console.error('[reset-password] Error type:', error.constructor.name);
    console.error('[reset-password] Error message:', error.message);
    console.error('[reset-password] Error stack:', error.stack);
    console.error('[reset-password] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    debugInfo.unexpectedError = {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack
    };
    debugInfo.steps.push('unexpected_error');

    // Return success for security, but include debug info
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      _debug: debugInfo
    };
  }
}
