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
 * @module auth-user/handlers/updatePassword
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[update-password]'
const MIN_PASSWORD_LENGTH = 4

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  PASSWORD_TOO_SHORT: 'Password must be at least 4 characters long.',
  INVALID_SESSION: 'Invalid or expired reset link. Please request a new password reset.',
  UPDATE_FAILED: 'Failed to update password. Please try again.',
  GENERIC_FAILED: 'Failed to update password',
} as const)

/**
 * Success messages
 * @immutable
 */
const SUCCESS_MESSAGES = Object.freeze({
  PASSWORD_UPDATED: 'Password updated successfully. You can now sign in with your new password.',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UpdatePasswordPayload {
  readonly password: string;
  readonly access_token: string;
}

interface UpdatePasswordResult {
  readonly message: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if password meets minimum length
 * @pure
 */
const isValidPasswordLength = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH

/**
 * Check if user object is valid
 * @pure
 */
const hasValidUser = (user: User | null): user is User =>
  user !== null

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (): UpdatePasswordResult =>
  Object.freeze({
    message: SUCCESS_MESSAGES.PASSWORD_UPDATED,
  })

// ─────────────────────────────────────────────────────────────
// Client Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build Supabase client configuration
 * @pure
 */
const buildClientConfig = () =>
  Object.freeze({
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

/**
 * Build Supabase client config with authorization header
 * @pure
 */
const buildClientConfigWithAuth = (accessToken: string) =>
  Object.freeze({
    ...buildClientConfig(),
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle password update request
 * @effectful (database I/O, authentication, console logging)
 */
export async function handleUpdatePassword(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: UpdatePasswordPayload
): Promise<UpdatePasswordResult> {
  console.log(`${LOG_PREFIX} ========== PASSWORD UPDATE REQUEST ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['password', 'access_token']);
  const { password, access_token } = payload;

  console.log(`${LOG_PREFIX} Validating session and updating password...`);

  // Password validation (matching signup.ts - minimum 4 characters)
  if (!isValidPasswordLength(password)) {
    throw new BubbleApiError(ERROR_MESSAGES.PASSWORD_TOO_SHORT, 400);
  }

  try {
    // Create Supabase client with user's access token to verify the session
    const supabaseUser: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      buildClientConfigWithAuth(access_token)
    );

    // Verify the session is valid by getting the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(access_token);

    if (userError || !hasValidUser(user)) {
      console.error(`${LOG_PREFIX} Invalid or expired session:`, userError?.message);
      throw new BubbleApiError(ERROR_MESSAGES.INVALID_SESSION, 401);
    }

    console.log(`${LOG_PREFIX} Session valid for user: ${user.id}`);

    // Update the password using admin client
    const supabaseAdmin: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      buildClientConfig()
    );

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (updateError) {
      console.error(`${LOG_PREFIX} Password update failed:`, updateError.message);
      throw new BubbleApiError(ERROR_MESSAGES.UPDATE_FAILED, 500);
    }

    console.log(`${LOG_PREFIX} Password updated successfully`);
    console.log(`${LOG_PREFIX} ========== UPDATE COMPLETE ==========`);

    return buildSuccessResult();

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`${LOG_PREFIX} ========== UPDATE ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);

    throw new BubbleApiError(
      `${ERROR_MESSAGES.GENERIC_FAILED}: ${(error as Error).message}`,
      500,
      error
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  MIN_PASSWORD_LENGTH,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,

  // Predicates
  isValidPasswordLength,
  hasValidUser,

  // Builders
  buildSuccessResult,
  buildClientConfig,
  buildClientConfigWithAuth,
})
