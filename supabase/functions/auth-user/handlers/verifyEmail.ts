/**
 * Verify Email Handler - Handle email verification callback
 * Split Lease - auth-user
 *
 * Flow:
 * 1. User clicks verification link in welcome email
 * 2. Frontend extracts token and email from URL params
 * 3. Frontend calls this handler with token + email
 * 4. Handler verifies the magic link token via Supabase Auth
 * 5. Handler updates public.user.email_verified = true
 * 6. Returns success response
 *
 * NO FALLBACK - If verification fails, return error
 * Uses Supabase Auth natively for token verification
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {token, email}
 * @returns {verified: boolean, message: string}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

interface VerifyEmailPayload {
  token: string;  // Magic link token from email (token_hash)
  email: string;  // User's email address
  type?: string;  // OTP type, defaults to 'magiclink'
}

export async function handleVerifyEmail(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: VerifyEmailPayload
): Promise<{ verified: boolean; message: string }> {
  console.log('[verifyEmail] ========== EMAIL VERIFICATION REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['token', 'email']);
  const { token, email, type = 'magiclink' } = payload;

  const emailLower = email.toLowerCase().trim();
  console.log(`[verifyEmail] Verifying email: ${emailLower}`);

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== VERIFY MAGIC LINK TOKEN ==========
    console.log('[verifyEmail] Verifying magic link token...');

    // Use verifyOtp to validate the magic link token
    // Note: For magic links generated via admin.generateLink(),
    // we need to verify the token_hash
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: type as 'magiclink' | 'email',
    });

    if (verifyError) {
      console.error('[verifyEmail] Token verification failed:', verifyError.message);

      // Map specific errors to user-friendly messages
      if (verifyError.message.includes('expired')) {
        throw new BubbleApiError('Verification link has expired. Please request a new one.', 400, 'TOKEN_EXPIRED');
      }
      if (verifyError.message.includes('invalid')) {
        throw new BubbleApiError('Invalid verification link. Please request a new one.', 400, 'TOKEN_INVALID');
      }

      throw new BubbleApiError(`Verification failed: ${verifyError.message}`, 400);
    }

    console.log('[verifyEmail] ✅ Token verified successfully');

    // ========== UPDATE EMAIL_VERIFIED IN PUBLIC.USER ==========
    console.log('[verifyEmail] Updating email_verified status...');

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('user')
      .update({ email_verified: true })
      .eq('email', emailLower)
      .select('_id, email, email_verified')
      .single();

    if (updateError) {
      console.error('[verifyEmail] Failed to update email_verified:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });

      // Don't fail completely - the token was valid
      // User might not exist in public.user yet (edge case)
      if (updateError.code === 'PGRST116') {
        console.warn('[verifyEmail] User not found in public.user table - token was valid');
        return {
          verified: true,
          message: 'Email verified but user profile not found',
        };
      }

      throw new BubbleApiError(`Failed to update verification status: ${updateError.message}`, 500);
    }

    console.log('[verifyEmail] ✅ email_verified updated for user:', updateData._id);
    console.log('[verifyEmail] ========== VERIFICATION COMPLETE ==========');

    return {
      verified: true,
      message: 'Email verified successfully',
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error('[verifyEmail] ========== VERIFICATION ERROR ==========');
    console.error('[verifyEmail] Error:', error);

    throw new BubbleApiError(
      `Email verification failed: ${(error as Error).message}`,
      500
    );
  }
}
