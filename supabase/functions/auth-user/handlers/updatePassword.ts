/**
 * Update Password Handler - Set new password after reset link clicked
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate password in payload
 * 2. Validate access_token (user must have valid session from reset link)
 * 3. Verify session using the access token
 * 4. Update password using admin API
 * 5. Return success
 *
 * NO FALLBACK - If password update fails, entire operation fails
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key for admin operations
 * @param payload - Request payload {password, access_token}
 * @returns {message: string}
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

export async function handleUpdatePassword(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[update-password] ========== PASSWORD UPDATE REQUEST ==========');

  // Validate required fields
  validateRequiredFields(payload, ['password', 'access_token']);
  const { password, access_token } = payload;

  console.log(`[update-password] Validating session and updating password...`);

  // Password validation (matching signup.ts - minimum 4 characters)
  if (password.length < 4) {
    throw new BubbleApiError('Password must be at least 4 characters long.', 400);
  }

  try {
    // Create Supabase client with user's access token to verify the session
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    });

    // Verify the session is valid by getting the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(access_token);

    if (userError || !user) {
      console.error(`[update-password] Invalid or expired session:`, userError?.message);
      throw new BubbleApiError('Invalid or expired reset link. Please request a new password reset.', 401);
    }

    console.log(`[update-password] Session valid for user: ${user.id}`);

    // Update the password using admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (updateError) {
      console.error(`[update-password] Password update failed:`, updateError.message);
      throw new BubbleApiError('Failed to update password. Please try again.', 500);
    }

    console.log(`[update-password] Password updated successfully`);
    console.log(`[update-password] ========== UPDATE COMPLETE ==========`);

    return {
      message: 'Password updated successfully. You can now sign in with your new password.'
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`[update-password] ========== UPDATE ERROR ==========`);
    console.error(`[update-password] Error:`, error);

    throw new BubbleApiError(
      `Failed to update password: ${error.message}`,
      500,
      error
    );
  }
}
