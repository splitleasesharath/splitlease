/**
 * Reset Password Request Handler - Send password reset email
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email in payload
 * 2. Call Supabase Auth resetPasswordForEmail
 * 3. Return success (always - don't reveal if email exists)
 *
 * SECURITY: Always returns success to prevent email enumeration
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {email, redirectTo?}
 * @returns {message: string}
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

  // Validate required fields
  validateRequiredFields(payload, ['email']);
  const { email, redirectTo } = payload;

  // Validate email format
  validateEmail(email);

  console.log(`[reset-password] Requesting reset for: ${email}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Default redirect URL for Split Lease
    const resetRedirectUrl = redirectTo || 'https://app.split.lease/reset-password';

    console.log(`[reset-password] Redirect URL: ${resetRedirectUrl}`);

    // Call Supabase Auth to send reset email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: resetRedirectUrl
    });

    if (error) {
      // Log the error but don't expose it to prevent email enumeration
      console.error(`[reset-password] Supabase error (not exposed):`, error.message);
      // Still return success - security best practice
    }

    console.log(`[reset-password] Password reset processed`);
    console.log(`[reset-password] ========== REQUEST COMPLETE ==========`);

    // Always return success to prevent email enumeration
    return {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

  } catch (error) {
    console.error(`[reset-password] ========== RESET ERROR ==========`);
    console.error(`[reset-password] Error:`, error);

    // Still return success to prevent email enumeration
    return {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
}
