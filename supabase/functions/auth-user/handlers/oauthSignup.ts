/**
 * OAuth Signup Handler - Create user record from OAuth provider data
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate OAuth payload
 * 2. Check if email already exists in public.user table
 * 3. If duplicate: Return indicator for frontend to show confirmation modal
 * 4. If new: Generate ID, create user record, queue Bubble sync
 * 5. Return user data
 *
 * @module auth-user/handlers/oauthSignup
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueSignupSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[oauth-signup]'
const DEFAULT_USER_TYPE = 'Guest'
const EMPTY_STRING = ''
const DEFAULT_RECEPTIVITY = 0

/**
 * User type display text mappings
 * @immutable
 */
const USER_TYPE_DISPLAY_MAP = Object.freeze({
  Host: 'A Host (I have a space available to rent)',
  Guest: 'A Guest (I would like to rent a space)',
  host: 'A Host (I have a space available to rent)',
  guest: 'A Guest (I would like to rent a space)',
} as const)

/**
 * Default user type display for unknown values
 * @immutable
 */
const DEFAULT_USER_TYPE_DISPLAY = 'A Guest (I would like to rent a space)'

/**
 * User check select fields
 * @immutable
 */
const USER_CHECK_SELECT_FIELDS = '_id, email, "Name - First", "Name - Last"'

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  VERIFY_EMAIL_FAILED: 'Failed to verify email availability',
  GENERATE_ID_FAILED: 'Failed to generate unique ID',
  CREATE_PROFILE_FAILED: 'Failed to create user profile',
  SIGNUP_FAILED: 'Failed to complete OAuth signup',
} as const)

/**
 * Duplicate user message
 * @immutable
 */
const DUPLICATE_USER_MESSAGE = 'An account with this email already exists.'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OAuthSignupPayload {
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly userType?: 'Host' | 'Guest';
  readonly provider?: string;
  readonly supabaseUserId: string;
  readonly access_token: string;
  readonly refresh_token: string;
  readonly profilePhoto?: string | null;
}

interface ExistingUser {
  readonly _id: string;
  readonly email: string;
}

interface DuplicateResult {
  readonly isDuplicate: true;
  readonly existingEmail: string;
  readonly existingUserId: string;
  readonly message: string;
}

interface NewUserResult {
  readonly isNewUser: true;
  readonly user_id: string;
  readonly host_account_id: string;
  readonly supabase_user_id: string;
  readonly user_type: string;
  readonly access_token: string;
  readonly refresh_token: string;
}

interface UserRecord {
  readonly _id: string;
  readonly bubble_id: null;
  readonly email: string;
  readonly 'email as text': string;
  readonly 'Name - First': string | null;
  readonly 'Name - Last': string | null;
  readonly 'Name - Full': string | null;
  readonly 'Date of Birth': null;
  readonly 'Phone Number (as text)': null;
  readonly 'Profile Photo': string | null;
  readonly 'Type - User Current': string;
  readonly 'Type - User Signup': string;
  readonly 'Created Date': string;
  readonly 'Modified Date': string;
  readonly authentication: Record<string, never>;
  readonly user_signed_up: true;
  readonly Receptivity: number;
  readonly MedianHoursToReply: null;
  readonly Listings: null;
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
 * Check if string is non-empty
 * @pure
 */
const isNonEmptyString = (value: string | undefined | null): value is string =>
  typeof value === 'string' && value.length > 0

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
 * Map user type to display text
 * @pure
 */
const mapUserTypeToDisplay = (userType: string): string =>
  USER_TYPE_DISPLAY_MAP[userType as keyof typeof USER_TYPE_DISPLAY_MAP] ?? DEFAULT_USER_TYPE_DISPLAY

/**
 * Build full name from first and last name
 * @pure
 */
const buildFullName = (firstName?: string, lastName?: string): string | null => {
  const parts = [firstName, lastName].filter(isNonEmptyString)
  return parts.length > 0 ? parts.join(' ') : null
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build duplicate user result
 * @pure
 */
const buildDuplicateResult = (email: string, userId: string): DuplicateResult =>
  Object.freeze({
    isDuplicate: true,
    existingEmail: email,
    existingUserId: userId,
    message: DUPLICATE_USER_MESSAGE,
  })

/**
 * Build new user success result
 * @pure
 */
const buildNewUserResult = (
  userId: string,
  hostId: string,
  supabaseUserId: string,
  userType: string,
  accessToken: string,
  refreshToken: string
): NewUserResult =>
  Object.freeze({
    isNewUser: true,
    user_id: userId,
    host_account_id: hostId,
    supabase_user_id: supabaseUserId,
    user_type: userType,
    access_token: accessToken,
    refresh_token: refreshToken,
  })

/**
 * Build user record for database insertion
 * @pure
 */
const buildUserRecord = (
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  userTypeDisplay: string,
  profilePhoto: string | null
): UserRecord => {
  const now = new Date().toISOString()
  const emailLower = normalizeEmail(email)

  return Object.freeze({
    '_id': userId,
    'bubble_id': null,
    'email': emailLower,
    'email as text': emailLower,
    'Name - First': firstName || null,
    'Name - Last': lastName || null,
    'Name - Full': buildFullName(firstName, lastName),
    'Date of Birth': null,
    'Phone Number (as text)': null,
    'Profile Photo': profilePhoto,
    'Type - User Current': userTypeDisplay,
    'Type - User Signup': userTypeDisplay,
    'Created Date': now,
    'Modified Date': now,
    'authentication': {},
    'user_signed_up': true,
    'Receptivity': DEFAULT_RECEPTIVITY,
    'MedianHoursToReply': null,
    'Listings': null,
  })
}

/**
 * Build user metadata for Supabase Auth update
 * @pure
 */
const buildUserMetadata = (
  userId: string,
  hostId: string,
  firstName: string,
  lastName: string,
  userType: string
) =>
  Object.freeze({
    user_metadata: {
      user_id: userId,
      host_account_id: hostId,
      first_name: firstName,
      last_name: lastName,
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
 * Handle OAuth signup request
 * @effectful (database I/O, authentication, queue operations, console logging)
 */
export async function handleOAuthSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthSignupPayload
): Promise<DuplicateResult | NewUserResult> {
  console.log(`${LOG_PREFIX} ========== OAUTH SIGNUP REQUEST ==========`);

  // Validate required fields
  validateRequiredFields(payload, ['email', 'supabaseUserId']);

  const {
    email,
    firstName = EMPTY_STRING,
    lastName = EMPTY_STRING,
    userType = DEFAULT_USER_TYPE,
    provider,
    supabaseUserId,
    access_token,
    refresh_token,
    profilePhoto = null,
  } = payload;

  const userTypeDisplay = mapUserTypeToDisplay(userType);

  console.log(`${LOG_PREFIX} Provider: ${provider}`);
  console.log(`${LOG_PREFIX} Email: ${email}`);
  console.log(`${LOG_PREFIX} Name: ${firstName} ${lastName}`);
  console.log(`${LOG_PREFIX} UserType: ${userType} -> ${userTypeDisplay}`);
  console.log(`${LOG_PREFIX} Profile Photo: ${profilePhoto ? 'provided' : 'not provided'}`);

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    buildClientConfig()
  );

  try {
    // ========== CHECK FOR EXISTING USER ==========
    console.log(`${LOG_PREFIX} Checking if email already exists...`);

    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('user')
      .select(USER_CHECK_SELECT_FIELDS)
      .eq('email', normalizeEmail(email))
      .maybeSingle();

    if (userCheckError) {
      console.error(`${LOG_PREFIX} Error checking existing user:`, userCheckError.message);
      throw new BubbleApiError(ERROR_MESSAGES.VERIFY_EMAIL_FAILED, 500);
    }

    if (hasUser(existingUser)) {
      console.log(`${LOG_PREFIX} Email already exists in user table:`, email);
      return buildDuplicateResult(email, existingUser._id);
    }

    console.log(`${LOG_PREFIX} Email is available`);

    // ========== GENERATE BUBBLE-STYLE ID ==========
    console.log(`${LOG_PREFIX} Generating ID using generate_bubble_id()...`);

    const { data: generatedUserId, error: userIdError } = await supabaseAdmin.rpc('generate_bubble_id');

    if (userIdError) {
      console.error(`${LOG_PREFIX} Failed to generate ID:`, userIdError);
      throw new BubbleApiError(ERROR_MESSAGES.GENERATE_ID_FAILED, 500);
    }

    const generatedHostId = generatedUserId;
    console.log(`${LOG_PREFIX} Generated User ID: ${generatedUserId}`);

    // ========== CREATE DATABASE RECORD ==========
    console.log(`${LOG_PREFIX} Creating user record...`);

    const userRecord = buildUserRecord(
      generatedUserId,
      email,
      firstName,
      lastName,
      userTypeDisplay,
      profilePhoto
    );

    console.log(`${LOG_PREFIX} User record to insert:`, JSON.stringify(userRecord, null, 2));

    const { error: userInsertError } = await supabaseAdmin
      .from('user')
      .insert(userRecord);

    if (userInsertError) {
      console.error(`${LOG_PREFIX} Failed to insert user:`, userInsertError.message);
      throw new BubbleApiError(
        `${ERROR_MESSAGES.CREATE_PROFILE_FAILED}: ${userInsertError.message}`,
        500
      );
    }

    console.log(`${LOG_PREFIX} User inserted into public.user table`);

    // ========== UPDATE SUPABASE AUTH USER METADATA ==========
    console.log(`${LOG_PREFIX} Updating Supabase Auth user metadata...`);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUserId,
      buildUserMetadata(generatedUserId, generatedHostId, firstName, lastName, userType)
    );

    if (updateError) {
      console.warn(`${LOG_PREFIX} Failed to update user metadata (non-blocking):`, updateError);
      // Non-blocking - user record already created
    }

    // ========== QUEUE BUBBLE SYNC ==========
    console.log(`${LOG_PREFIX} Queueing Bubble sync...`);

    try {
      await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
      console.log(`${LOG_PREFIX} Bubble sync queued`);
      triggerQueueProcessing();
    } catch (syncQueueError) {
      console.error(`${LOG_PREFIX} Failed to queue Bubble sync (non-blocking):`, syncQueueError);
    }

    console.log(`${LOG_PREFIX} ========== OAUTH SIGNUP COMPLETE ==========`);

    return buildNewUserResult(
      generatedUserId,
      generatedHostId,
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
      `${ERROR_MESSAGES.SIGNUP_FAILED}: ${(error as Error).message}`,
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
  DEFAULT_RECEPTIVITY,
  USER_TYPE_DISPLAY_MAP,
  DEFAULT_USER_TYPE_DISPLAY,
  USER_CHECK_SELECT_FIELDS,
  ERROR_MESSAGES,
  DUPLICATE_USER_MESSAGE,

  // Predicates
  hasUser,
  isNonEmptyString,

  // Transformers
  normalizeEmail,
  mapUserTypeToDisplay,
  buildFullName,

  // Builders
  buildDuplicateResult,
  buildNewUserResult,
  buildUserRecord,
  buildUserMetadata,
  buildClientConfig,
})
