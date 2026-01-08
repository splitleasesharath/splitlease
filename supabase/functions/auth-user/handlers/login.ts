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
 * @module auth-user/handlers/login
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient, User, Session } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[login]'
const DEFAULT_USER_TYPE = 'Guest'
const EMPTY_STRING = ''

/**
 * User profile select fields
 * @immutable
 */
const USER_PROFILE_SELECT_FIELDS = '_id, email, "Name - First", "Name - Last", "Profile Photo"'

/**
 * Auth error message mappings
 * @immutable
 */
const AUTH_ERROR_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: 'Invalid login credentials',
  EMAIL_NOT_CONFIRMED: 'Email not confirmed',
} as const)

/**
 * User-friendly error messages
 * @immutable
 */
const USER_ERROR_MESSAGES = Object.freeze({
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  EMAIL_NOT_CONFIRMED: 'Please verify your email address before logging in.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  LOGIN_FAILED: 'Failed to authenticate user',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

interface UserProfile {
  readonly _id: string;
  readonly email: string;
  readonly 'Name - First'?: string;
  readonly 'Name - Last'?: string;
  readonly 'Profile Photo'?: string;
}

interface LoginResult {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly user_id: string;
  readonly supabase_user_id: string;
  readonly user_type: string;
  readonly host_account_id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly profilePhoto: string | null;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy (not null or undefined)
 * @pure
 */
const isTruthy = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

/**
 * Check if auth error message contains specific text
 * @pure
 */
const hasAuthErrorMessage = (errorMessage: string, searchText: string): boolean =>
  errorMessage.includes(searchText)

/**
 * Check if session and user are present in auth data
 * @pure
 */
const hasValidSession = (session: Session | null, user: User | null): boolean =>
  isTruthy(session) && isTruthy(user)

// ─────────────────────────────────────────────────────────────
// Data Extractors
// ─────────────────────────────────────────────────────────────

/**
 * Extract user ID from profile or auth metadata
 * @pure
 */
const extractUserId = (
  profile: UserProfile | null,
  authUser: User
): string =>
  profile?._id ?? authUser.user_metadata?.user_id ?? authUser.id

/**
 * Extract user type from auth metadata
 * @pure
 */
const extractUserType = (authUser: User): string =>
  authUser.user_metadata?.user_type ?? DEFAULT_USER_TYPE

/**
 * Extract first name from profile
 * @pure
 */
const extractFirstName = (profile: UserProfile | null): string =>
  profile?.['Name - First'] ?? EMPTY_STRING

/**
 * Extract last name from profile
 * @pure
 */
const extractLastName = (profile: UserProfile | null): string =>
  profile?.['Name - Last'] ?? EMPTY_STRING

/**
 * Extract profile photo from profile
 * @pure
 */
const extractProfilePhoto = (profile: UserProfile | null): string | null =>
  profile?.['Profile Photo'] ?? null

// ─────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────

/**
 * Map auth error to user-friendly error
 * @pure
 */
const mapAuthErrorToUserError = (errorMessage: string): BubbleApiError => {
  if (hasAuthErrorMessage(errorMessage, AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS)) {
    return new BubbleApiError(USER_ERROR_MESSAGES.INVALID_CREDENTIALS, 401)
  }
  if (hasAuthErrorMessage(errorMessage, AUTH_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED)) {
    return new BubbleApiError(USER_ERROR_MESSAGES.EMAIL_NOT_CONFIRMED, 401)
  }
  return new BubbleApiError(errorMessage, 401)
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build login result object
 * @pure
 */
const buildLoginResult = (
  session: Session,
  authUser: User,
  profile: UserProfile | null
): LoginResult => {
  const userId = extractUserId(profile, authUser)

  return Object.freeze({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    user_id: userId,
    supabase_user_id: authUser.id,
    user_type: extractUserType(authUser),
    host_account_id: userId, // user._id is used directly as host reference
    email: authUser.email ?? EMPTY_STRING,
    firstName: extractFirstName(profile),
    lastName: extractLastName(profile),
    profilePhoto: extractProfilePhoto(profile),
  })
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle login request via Supabase Auth
 * @effectful (database I/O, authentication, console logging)
 */
export async function handleLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: LoginPayload
): Promise<LoginResult> {
  console.log(`${LOG_PREFIX} ========== LOGIN REQUEST (SUPABASE NATIVE) ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  console.log(`${LOG_PREFIX} Authenticating user: ${email}`);

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ========== AUTHENTICATE VIA SUPABASE AUTH ==========
    console.log(`${LOG_PREFIX} Signing in via Supabase Auth...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });

    if (authError) {
      console.error(`${LOG_PREFIX} Auth error:`, authError.message);
      throw mapAuthErrorToUserError(authError.message);
    }

    if (!hasValidSession(authData.session, authData.user)) {
      console.error(`${LOG_PREFIX} No session returned from auth`);
      throw new BubbleApiError(USER_ERROR_MESSAGES.AUTH_FAILED, 401);
    }

    const { session, user: authUser } = authData;
    console.log(`${LOG_PREFIX} ✅ Supabase Auth successful`);
    console.log(`${LOG_PREFIX}    Auth User ID: ${authUser.id}`);
    console.log(`${LOG_PREFIX}    Email: ${authUser.email}`);

    // ========== FETCH USER PROFILE ==========
    console.log(`${LOG_PREFIX} Fetching user profile from public.user table...`);

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user')
      .select(USER_PROFILE_SELECT_FIELDS)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error(`${LOG_PREFIX} Profile fetch error:`, profileError.message);
      // Don't fail login - user might exist in auth but not in public.user yet
    }

    const result = buildLoginResult(session, authUser, userProfile as UserProfile | null);

    console.log(`${LOG_PREFIX} ✅ User profile loaded`);
    console.log(`${LOG_PREFIX}    User ID (_id): ${result.user_id}`);
    console.log(`${LOG_PREFIX}    User Type: ${result.user_type}`);
    console.log(`${LOG_PREFIX} ========== LOGIN COMPLETE ==========`);

    return result;

  } catch (error) {
    if (error instanceof BubbleApiError || error instanceof SupabaseSyncError) {
      throw error;
    }

    console.error(`${LOG_PREFIX} ========== LOGIN ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);

    throw new BubbleApiError(
      `${USER_ERROR_MESSAGES.LOGIN_FAILED}: ${(error as Error).message}`,
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
  DEFAULT_USER_TYPE,
  EMPTY_STRING,
  USER_PROFILE_SELECT_FIELDS,
  AUTH_ERROR_MESSAGES,
  USER_ERROR_MESSAGES,

  // Predicates
  isTruthy,
  hasAuthErrorMessage,
  hasValidSession,

  // Extractors
  extractUserId,
  extractUserType,
  extractFirstName,
  extractLastName,
  extractProfilePhoto,

  // Error handling
  mapAuthErrorToUserError,

  // Result builders
  buildLoginResult,
})
