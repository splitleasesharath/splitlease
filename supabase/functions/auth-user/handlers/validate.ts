/**
 * Validate Handler - Validate session and fetch user data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Get token and user_id from payload
 * 2. Fetch user data from Supabase database by _id (validates user exists)
 * 3. Return user profile data
 *
 * Note: Token validation against Bubble is skipped because:
 * - The token was validated when login succeeded
 * - Bubble will reject expired tokens on actual API calls
 * - The Bubble Data API may not accept workflow-issued tokens
 *
 * NO FALLBACK - If user not found, operation fails
 *
 * @module auth-user/handlers/validate
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient, User as AuthUser } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError, SupabaseSyncError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[validate]'
const HTTPS_PREFIX = 'https:'
const PROTOCOL_RELATIVE_PREFIX = '//'

/**
 * User profile select fields
 * @immutable
 */
const USER_SELECT_FIELDS = '_id, bubble_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current", "email as text", "email", "About Me / Bio", "need for Space", "special needs", "Proposals List", "Rental Application"'

/**
 * Rental application select fields
 * @immutable
 */
const RENTAL_APP_SELECT_FIELDS = 'submitted'

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  USER_FETCH_FAILED: 'Failed to fetch user data',
  USER_NOT_FOUND: 'User not found with _id or email',
  VALIDATE_FAILED: 'Failed to validate token',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ValidatePayload {
  readonly token: string;
  readonly user_id: string;
}

interface UserData {
  readonly _id: string;
  readonly bubble_id?: string | null;
  readonly 'Name - First'?: string | null;
  readonly 'Name - Full'?: string | null;
  readonly 'Profile Photo'?: string | null;
  readonly 'Type - User Current'?: string | null;
  readonly 'email as text'?: string | null;
  readonly email?: string | null;
  readonly 'About Me / Bio'?: string | null;
  readonly 'need for Space'?: string | null;
  readonly 'special needs'?: string | null;
  readonly 'Proposals List'?: ReadonlyArray<string> | null;
  readonly 'Rental Application'?: string | null;
}

interface RentalAppData {
  readonly submitted?: boolean;
}

interface ValidateResult {
  readonly userId: string;
  readonly firstName: string | null;
  readonly fullName: string | null;
  readonly email: string | null;
  readonly profilePhoto: string | null;
  readonly userType: string | null;
  readonly accountHostId: string;
  readonly aboutMe: string | null;
  readonly needForSpace: string | null;
  readonly specialNeeds: string | null;
  readonly proposalCount: number;
  readonly hasSubmittedRentalApp: boolean;
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
 * Check if user data exists
 * @pure
 */
const hasUserData = (data: UserData | null): data is UserData =>
  data !== null

/**
 * Check if auth user has email
 * @pure
 */
const hasEmail = (user: AuthUser | null): boolean =>
  user !== null && typeof user.email === 'string'

/**
 * Check if profile photo is protocol-relative
 * @pure
 */
const isProtocolRelative = (url: string | null | undefined): boolean =>
  typeof url === 'string' && url.startsWith(PROTOCOL_RELATIVE_PREFIX)

/**
 * Check if proposals list is an array
 * @pure
 */
const isProposalArray = (list: unknown): list is ReadonlyArray<string> =>
  Array.isArray(list)

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize profile photo URL (handle protocol-relative URLs)
 * @pure
 */
const normalizeProfilePhotoUrl = (url: string | null | undefined): string | null => {
  if (!isTruthy(url)) return null
  if (isProtocolRelative(url)) return HTTPS_PREFIX + url
  return url
}

/**
 * Extract email from user data (prefer 'email' column over 'email as text')
 * @pure
 */
const extractEmail = (userData: UserData): string | null =>
  userData.email ?? userData['email as text'] ?? null

/**
 * Count proposals from proposals list
 * @pure
 */
const countProposals = (proposalsList: ReadonlyArray<string> | null | undefined): number =>
  isProposalArray(proposalsList) ? proposalsList.length : 0

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build validate result from user data
 * @pure
 */
const buildValidateResult = (
  userData: UserData,
  hasSubmittedRentalApp: boolean
): ValidateResult =>
  Object.freeze({
    userId: userData._id,
    firstName: userData['Name - First'] ?? null,
    fullName: userData['Name - Full'] ?? null,
    email: extractEmail(userData),
    profilePhoto: normalizeProfilePhotoUrl(userData['Profile Photo']),
    userType: userData['Type - User Current'] ?? null,
    accountHostId: userData._id, // user IS their own host account
    aboutMe: userData['About Me / Bio'] ?? null,
    needForSpace: userData['need for Space'] ?? null,
    specialNeeds: userData['special needs'] ?? null,
    proposalCount: countProposals(userData['Proposals List']),
    hasSubmittedRentalApp,
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
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user by _id
 * @effectful
 */
const fetchUserById = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: UserData | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('user')
    .select(USER_SELECT_FIELDS)
    .eq('_id', userId)
    .maybeSingle()

  return { data, error }
}

/**
 * Fetch user by email
 * @effectful
 */
const fetchUserByEmail = async (
  supabase: SupabaseClient,
  email: string
): Promise<{ data: UserData | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('user')
    .select(USER_SELECT_FIELDS)
    .eq('email', email)
    .maybeSingle()

  return { data, error }
}

/**
 * Fetch user by 'email as text' column
 * @effectful
 */
const fetchUserByEmailText = async (
  supabase: SupabaseClient,
  email: string
): Promise<{ data: UserData | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from('user')
    .select(USER_SELECT_FIELDS)
    .eq('email as text', email)
    .maybeSingle()

  return { data, error }
}

/**
 * Fetch rental application submission status
 * @effectful
 */
const fetchRentalAppStatus = async (
  supabase: SupabaseClient,
  rentalAppId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('rentalapplication')
    .select(RENTAL_APP_SELECT_FIELDS)
    .eq('_id', rentalAppId)
    .maybeSingle()

  if (error) {
    console.warn(`${LOG_PREFIX} Failed to fetch rental application:`, error.message)
    return false
  }

  return (data as RentalAppData | null)?.submitted === true
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle session validation request
 * @effectful (database I/O, authentication, console logging)
 */
export async function handleValidate(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: ValidatePayload
): Promise<ValidateResult> {
  console.log(`${LOG_PREFIX} ========== SESSION VALIDATION REQUEST ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['token', 'user_id']);
  const { token, user_id } = payload;

  console.log(`${LOG_PREFIX} Validating session for user (_id): ${user_id}`);

  try {
    console.log(`${LOG_PREFIX} Skipping Bubble token validation (trusting login-issued token)`);
    console.log(`${LOG_PREFIX} Token present: ${token ? 'yes' : 'no'}`);

    // Step 1: Fetch user data from Supabase
    console.log(`${LOG_PREFIX} Fetching user data from Supabase...`);

    const supabase: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      buildClientConfig()
    );

    let userData: UserData | null = null;
    let userError: Error | null = null;

    // First attempt: query by _id
    console.log(`${LOG_PREFIX} Attempting to find user by _id: ${user_id}`);
    const byIdResult = await fetchUserById(supabase, user_id);

    if (hasUserData(byIdResult.data)) {
      userData = byIdResult.data;
      console.log(`${LOG_PREFIX} User found by _id`);
    } else {
      // Second attempt: use token to get email from Supabase Auth
      console.log(`${LOG_PREFIX} User not found by _id, trying to get email from token...`);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError) {
        console.error(`${LOG_PREFIX} Failed to get user from token:`, authError.message);
        userError = authError;
      } else if (hasEmail(authUser)) {
        const email = authUser!.email!;
        console.log(`${LOG_PREFIX} Got email from token: ${email}, querying by email...`);

        // Query by email
        const byEmailResult = await fetchUserByEmail(supabase, email);

        if (hasUserData(byEmailResult.data)) {
          userData = byEmailResult.data;
          console.log(`${LOG_PREFIX} User found by email`);
        } else {
          // Try 'email as text' column as fallback
          const byEmailTextResult = await fetchUserByEmailText(supabase, email);

          if (hasUserData(byEmailTextResult.data)) {
            userData = byEmailTextResult.data;
            console.log(`${LOG_PREFIX} User found by 'email as text'`);
          } else {
            userError = byEmailResult.error ?? byEmailTextResult.error ?? byIdResult.error;
          }
        }
      } else {
        console.error(`${LOG_PREFIX} No email found in auth user`);
        userError = byIdResult.error;
      }
    }

    if (userError) {
      console.error(`${LOG_PREFIX} Supabase query error:`, userError);
      throw new SupabaseSyncError(`${ERROR_MESSAGES.USER_FETCH_FAILED}: ${userError.message}`, userError);
    }

    if (!hasUserData(userData)) {
      console.error(`${LOG_PREFIX} User not found in Supabase by _id or email: ${user_id}`);
      throw new SupabaseSyncError(`${ERROR_MESSAGES.USER_NOT_FOUND}: ${user_id}`);
    }

    // Step 2: Check rental application submission status
    let hasSubmittedRentalApp = false;
    const rentalAppId = userData['Rental Application'];

    if (isTruthy(rentalAppId)) {
      console.log(`${LOG_PREFIX} User has rental application: ${rentalAppId}, checking submission status...`);
      hasSubmittedRentalApp = await fetchRentalAppStatus(supabase, rentalAppId);
      console.log(`${LOG_PREFIX} Rental application submitted: ${hasSubmittedRentalApp}`);
    } else {
      console.log(`${LOG_PREFIX} User has no rental application`);
    }

    // Step 3: Build result
    const result = buildValidateResult(userData, hasSubmittedRentalApp);

    console.log(`${LOG_PREFIX} ✅ Validation complete`);
    console.log(`${LOG_PREFIX}    User: ${result.firstName}`);
    console.log(`${LOG_PREFIX}    Type: ${result.userType}`);
    console.log(`${LOG_PREFIX}    Proposals: ${result.proposalCount}`);
    console.log(`${LOG_PREFIX}    Rental App Submitted: ${result.hasSubmittedRentalApp}`);
    console.log(`${LOG_PREFIX} ========== VALIDATION COMPLETE ==========`);

    return result;

  } catch (error) {
    if (error instanceof BubbleApiError || error instanceof SupabaseSyncError) {
      throw error;
    }

    console.error(`${LOG_PREFIX} ========== VALIDATION ERROR ==========`);
    console.error(`${LOG_PREFIX} Error:`, error);

    throw new BubbleApiError(
      `${ERROR_MESSAGES.VALIDATE_FAILED}: ${(error as Error).message}`,
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
  HTTPS_PREFIX,
  PROTOCOL_RELATIVE_PREFIX,
  USER_SELECT_FIELDS,
  RENTAL_APP_SELECT_FIELDS,
  ERROR_MESSAGES,

  // Predicates
  isTruthy,
  hasUserData,
  hasEmail,
  isProtocolRelative,
  isProposalArray,

  // Transformers
  normalizeProfilePhotoUrl,
  extractEmail,
  countProposals,

  // Builders
  buildValidateResult,
  buildClientConfig,

  // Query helpers
  fetchUserById,
  fetchUserByEmail,
  fetchUserByEmailText,
  fetchRentalAppStatus,
})
