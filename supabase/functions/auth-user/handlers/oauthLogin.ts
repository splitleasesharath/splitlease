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
 * @module auth-user/handlers/oauthLogin
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[oauth-login]'
const DEFAULT_USER_TYPE = 'Guest'
const EMPTY_STRING = ''

/**
 * User profile select fields
 * @immutable
 */
const USER_SELECT_FIELDS = '_id, email, "Name - First", "Name - Last", "Type - User Current", "Profile Photo"'

/**
 * User type identifiers in display text
 * @immutable
 */
const USER_TYPE_IDENTIFIERS = Object.freeze({
  HOST: 'Host',
  GUEST: 'Guest',
} as const)

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  VERIFY_FAILED: 'Failed to verify user',
  LOGIN_FAILED: 'Failed to complete OAuth login',
} as const)

/**
 * User not found response message
 * @immutable
 */
const USER_NOT_FOUND_MESSAGE = 'No account found with this email. Please sign up first.'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OAuthLoginPayload {
  readonly email: string;
  readonly supabaseUserId: string;
  readonly access_token: string;
  readonly refresh_token: string;
}

interface ExistingUser {
  readonly _id: string;
  readonly email: string;
  readonly 'Name - First'?: string;
  readonly 'Name - Last'?: string;
  readonly 'Type - User Current'?: string;
  readonly 'Profile Photo'?: string;
}

interface UserNotFoundResult {
  readonly userNotFound: true;
  readonly email: string;
  readonly message: string;
}

interface OAuthLoginResult {
  readonly user_id: string;
  readonly supabase_user_id: string;
  readonly user_type: string;
  readonly access_token: string;
  readonly refresh_token: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly profilePhoto: string | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if user exists
 * @pure
 */
const hasUser = (user: ExistingUser | null): user is ExistingUser =>
  user !== null

/**
 * Check if display text contains user type identifier
 * @pure
 */
const containsUserType = (displayText: string | undefined, typeIdentifier: string): boolean =>
  displayText !== undefined && displayText.includes(typeIdentifier)

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize email to lowercase
 * @pure
 */
const normalizeEmail = (email: string): string =>
  email.toLowerCase()

/**
 * Parse user type from display text
 * @pure
 */
const parseUserType = (displayText: string | undefined): string => {
  if (containsUserType(displayText, USER_TYPE_IDENTIFIERS.HOST)) {
    return USER_TYPE_IDENTIFIERS.HOST
  }
  if (containsUserType(displayText, USER_TYPE_IDENTIFIERS.GUEST)) {
    return USER_TYPE_IDENTIFIERS.GUEST
  }
  return DEFAULT_USER_TYPE
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build user not found result
 * @pure
 */
const buildUserNotFoundResult = (email: string): UserNotFoundResult =>
  Object.freeze({
    userNotFound: true,
    email,
    message: USER_NOT_FOUND_MESSAGE,
  })

/**
 * Build OAuth login success result
 * @pure
 */
const buildOAuthLoginResult = (
  user: ExistingUser,
  supabaseUserId: string,
  userType: string,
  accessToken: string,
  refreshToken: string
): OAuthLoginResult =>
  Object.freeze({
    user_id: user._id,
    supabase_user_id: supabaseUserId,
    user_type: userType,
    access_token: accessToken,
    refresh_token: refreshToken,
    firstName: user['Name - First'] ?? EMPTY_STRING,
    lastName: user['Name - Last'] ?? EMPTY_STRING,
    profilePhoto: user['Profile Photo'] ?? null,
  })

/**
 * Build user metadata for Supabase Auth update
 * @pure
 */
const buildUserMetadata = (
  user: ExistingUser,
  userType: string
) =>
  Object.freeze({
    user_metadata: {
      user_id: user._id,
      host_account_id: user._id, // user._id is now used directly as host reference
      first_name: user['Name - First'] ?? EMPTY_STRING,
      last_name: user['Name - Last'] ?? EMPTY_STRING,
      user_type: userType,
    }
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

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle OAuth login request
 * @effectful (database I/O, authentication, console logging)
 */
export async function handleOAuthLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthLoginPayload
): Promise<UserNotFoundResult | OAuthLoginResult> {
  console.log(`${LOG_PREFIX} ========== OAUTH LOGIN REQUEST ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['email', 'supabaseUserId']);

  const {
    email,
    supabaseUserId,
    access_token,
    refresh_token,
  } = payload;

  console.log(`${LOG_PREFIX} Email: ${email}`);
  console.log(`${LOG_PREFIX} Supabase User ID: ${supabaseUserId}`);

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    buildClientConfig()
  );

  try {
    // ========== CHECK IF USER EXISTS ==========
    console.log(`${LOG_PREFIX} Checking if user exists in database...`);

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select(USER_SELECT_FIELDS)
      .eq('email', normalizeEmail(email))
      .maybeSingle();

    if (userCheckError) {
      console.error(`${LOG_PREFIX} Error checking user:`, userCheckError.message);
      throw new BubbleApiError(ERROR_MESSAGES.VERIFY_FAILED, 500);
    }

    if (!hasUser(existingUser)) {
      console.log(`${LOG_PREFIX} User NOT found for email:`, email);
      return buildUserNotFoundResult(email);
    }

    console.log(`${LOG_PREFIX} User found:`, existingUser._id);

    // ========== PARSE USER TYPE ==========
    const userTypeDisplay = existingUser['Type - User Current'];
    const userType = parseUserType(userTypeDisplay);

    console.log(`${LOG_PREFIX} User Type: ${userType} (from: ${userTypeDisplay})`);

    // ========== UPDATE SUPABASE AUTH USER METADATA ==========
    console.log(`${LOG_PREFIX} Updating Supabase Auth user metadata...`);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUserId,
      buildUserMetadata(existingUser, userType)
    );

    if (updateError) {
      console.warn(`${LOG_PREFIX} Failed to update user metadata (non-blocking):`, updateError.message);
      // Non-blocking - user can still login
    } else {
      console.log(`${LOG_PREFIX} User metadata updated successfully`);
    }

    console.log(`${LOG_PREFIX} ========== OAUTH LOGIN COMPLETE ==========`);

    return buildOAuthLoginResult(
      existingUser,
      supabaseUserId,
      userType,
      access_token,
      refresh_token
    );

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`${LOG_PREFIX} Error:`, error);
    throw new BubbleApiError(
      `${ERROR_MESSAGES.LOGIN_FAILED}: ${(error as Error).message}`,
      500
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
  DEFAULT_USER_TYPE,
  EMPTY_STRING,
  USER_SELECT_FIELDS,
  USER_TYPE_IDENTIFIERS,
  ERROR_MESSAGES,
  USER_NOT_FOUND_MESSAGE,

  // Predicates
  hasUser,
  containsUserType,

  // Transformers
  normalizeEmail,
  parseUserType,

  // Builders
  buildUserNotFoundResult,
  buildOAuthLoginResult,
  buildUserMetadata,
  buildClientConfig,
})
