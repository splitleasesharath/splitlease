/**
 * Signup Handler - Register new user via Supabase Auth (Native)
 * Split Lease - auth-user
 *
 * Flow:
 * 1. Validate email/password/retype in payload
 * 2. Client-side validation (password length, match)
 * 3. Check if email already exists in public.user table
 * 4. Check if email already exists in Supabase Auth
 * 5. Generate user_id using generate_bubble_id()
 * 6. Create Supabase Auth user (auth.users table)
 * 7. Sign in user to get session tokens
 * 8. Insert user profile into public.user table with:
 *    - _id = generated user_id (also used as host reference in listings/proposals)
 *    - Receptivity = 0 (host field migrated from account_host)
 * 9. Return session tokens and user data
 *
 * NOTE: account_host table and "Account - Host / Landlord" column have been removed
 * User._id is now used directly as the host reference in listings and proposals
 *
 * NO FALLBACK - If any operation fails, entire signup fails
 * Uses Supabase Auth natively - no Bubble dependency
 *
 * @module auth-user/handlers/signup
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient, Session } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields } from '../../_shared/validation.ts';
import { enqueueSignupSync, triggerQueueProcessing } from '../../_shared/queueSync.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[signup]'
const MIN_PASSWORD_LENGTH = 4
const DEFAULT_USER_TYPE = 'Guest'
const DEFAULT_RECEPTIVITY = 0
const EMPTY_STRING = ''

/**
 * User type display text mappings
 * Foreign key references os_user_type(display) which contains full descriptive strings
 * @immutable
 */
const USER_TYPE_DISPLAY_MAP = Object.freeze({
  'Host': 'A Host (I have a space available to rent)',
  'host': 'A Host (I have a space available to rent)',
  'Guest': 'A Guest (I would like to rent a space)',
  'guest': 'A Guest (I would like to rent a space)',
  'Split Lease': 'Split Lease',
  'split_lease': 'Split Lease',
  'Trial Host': 'Trial Host',
  'trial_host': 'Trial Host',
} as const)

/**
 * Default user type display for unknown values
 * @immutable
 */
const DEFAULT_USER_TYPE_DISPLAY = 'A Guest (I would like to rent a space)'

/**
 * Email validation regex pattern
 * @immutable
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Error messages
 * @immutable
 */
const ERROR_MESSAGES = Object.freeze({
  PASSWORD_TOO_SHORT: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
  PASSWORDS_NO_MATCH: 'The two passwords do not match!',
  INVALID_EMAIL: 'Please enter a valid email address.',
  EMAIL_IN_USE: 'This email is already in use.',
  VERIFY_EMAIL_FAILED: 'Failed to verify email availability',
  GENERATE_ID_FAILED: 'Failed to generate unique ID',
  AUTH_CREATION_FAILED: 'Failed to create account',
  SESSION_CREATION_FAILED: 'Failed to create session. Please try again.',
  PROFILE_CREATION_FAILED: 'Failed to create user profile',
  SIGNUP_FAILED: 'Failed to register user',
} as const)

/**
 * Error code for email already in use
 * @immutable
 */
const USED_EMAIL_CODE = 'USED_EMAIL'

/**
 * User check select fields
 * @immutable
 */
const USER_CHECK_SELECT_FIELDS = '_id, email'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SignupAdditionalData {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly userType?: 'Host' | 'Guest';
  readonly birthDate?: string;
  readonly phoneNumber?: string;
}

interface SignupPayload {
  readonly email: string;
  readonly password: string;
  readonly retype: string;
  readonly additionalData?: SignupAdditionalData;
}

interface ExistingUser {
  readonly _id: string;
  readonly email: string;
}

interface UserRecord {
  readonly _id: string;
  readonly bubble_id: null;
  readonly email: string;
  readonly 'email as text': string;
  readonly 'Name - First': string | null;
  readonly 'Name - Last': string | null;
  readonly 'Name - Full': string | null;
  readonly 'Date of Birth': string | null;
  readonly 'Phone Number (as text)': string | null;
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

interface SignupResult {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly user_id: string;
  readonly host_account_id: string;
  readonly supabase_user_id: string;
  readonly user_type: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if password meets minimum length requirement
 * @pure
 */
const isValidPasswordLength = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH

/**
 * Check if passwords match
 * @pure
 */
const passwordsMatch = (password: string, retype: string): boolean =>
  password === retype

/**
 * Check if email format is valid
 * @pure
 */
const isValidEmailFormat = (email: string): boolean =>
  EMAIL_REGEX.test(email)

/**
 * Check if user exists
 * @pure
 */
const hasUser = (user: ExistingUser | null): user is ExistingUser =>
  user !== null

/**
 * Check if auth user has valid email matching search
 * @pure
 */
const matchesEmail = (authUser: { email?: string } | undefined, searchEmail: string): boolean =>
  authUser?.email?.toLowerCase() === searchEmail.toLowerCase()

/**
 * Check if string is non-empty
 * @pure
 */
const isNonEmptyString = (value: string | undefined | null): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Check if auth error indicates email already registered
 * @pure
 */
const isEmailAlreadyRegisteredError = (errorMessage: string): boolean =>
  errorMessage.includes('already registered')

/**
 * Check if session data is valid
 * @pure
 */
const hasValidSession = (sessionData: { session: Session | null } | null): sessionData is { session: Session } =>
  sessionData !== null && sessionData.session !== null

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

/**
 * Parse birth date to ISO string safely
 * @pure
 */
const parseBirthDate = (birthDate: string | undefined): string | null => {
  if (!isNonEmptyString(birthDate)) return null
  try {
    return new Date(birthDate).toISOString()
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

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
  dateOfBirth: string | null,
  phoneNumber: string
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
    'Date of Birth': dateOfBirth,
    'Phone Number (as text)': phoneNumber || null,
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
 * Build signup success result
 * @pure
 */
const buildSignupResult = (
  session: Session,
  userId: string,
  hostId: string,
  supabaseUserId: string,
  userType: string
): SignupResult =>
  Object.freeze({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 0,
    user_id: userId,
    host_account_id: hostId,
    supabase_user_id: supabaseUserId,
    user_type: userType,
  })

/**
 * Build user metadata for Supabase Auth creation
 * @pure
 */
const buildUserMetadata = (
  userId: string,
  hostId: string,
  firstName: string,
  lastName: string,
  userType: string,
  birthDate: string,
  phoneNumber: string
) =>
  Object.freeze({
    user_id: userId,
    host_account_id: hostId,
    first_name: firstName,
    last_name: lastName,
    user_type: userType,
    birth_date: birthDate,
    phone_number: phoneNumber,
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
// Validation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validate password requirements
 * @effectful (throws on validation failure)
 */
const validatePassword = (password: string, retype: string): void => {
  if (!isValidPasswordLength(password)) {
    throw new BubbleApiError(ERROR_MESSAGES.PASSWORD_TOO_SHORT, 400)
  }

  if (!passwordsMatch(password, retype)) {
    throw new BubbleApiError(ERROR_MESSAGES.PASSWORDS_NO_MATCH, 400)
  }
}

/**
 * Validate email format
 * @effectful (throws on validation failure)
 */
const validateEmailFormat = (email: string): void => {
  if (!isValidEmailFormat(email)) {
    throw new BubbleApiError(ERROR_MESSAGES.INVALID_EMAIL, 400)
  }
}

// ─────────────────────────────────────────────────────────────
// Database Query Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Check if email exists in user table
 * @effectful
 */
const checkEmailInUserTable = async (
  supabase: SupabaseClient,
  email: string
): Promise<ExistingUser | null> => {
  const { data, error } = await supabase
    .from('user')
    .select(USER_CHECK_SELECT_FIELDS)
    .eq('email', normalizeEmail(email))
    .maybeSingle()

  if (error) {
    console.error(`${LOG_PREFIX} Error checking existing user:`, error.message)
    throw new BubbleApiError(ERROR_MESSAGES.VERIFY_EMAIL_FAILED, 500)
  }

  return data
}

/**
 * Check if email exists in Supabase Auth
 * @effectful
 */
const checkEmailInAuth = async (
  supabase: SupabaseClient,
  email: string
): Promise<boolean> => {
  try {
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    if (listError || !authUsers?.users) {
      return false
    }
    return authUsers.users.some(user => matchesEmail(user, email))
  } catch (listErr) {
    console.log(`${LOG_PREFIX} Could not list auth users:`, listErr)
    return false
  }
}

/**
 * Generate unique user ID
 * @effectful
 */
const generateUserId = async (
  supabase: SupabaseClient
): Promise<string> => {
  const { data: generatedUserId, error: userIdError } = await supabase.rpc('generate_bubble_id')

  if (userIdError) {
    console.error(`${LOG_PREFIX} Failed to generate ID:`, userIdError)
    throw new BubbleApiError(ERROR_MESSAGES.GENERATE_ID_FAILED, 500)
  }

  return generatedUserId
}

/**
 * Create Supabase Auth user
 * @effectful
 */
const createAuthUser = async (
  supabase: SupabaseClient,
  email: string,
  password: string,
  metadata: ReturnType<typeof buildUserMetadata>
): Promise<string> => {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (authError) {
    console.error(`${LOG_PREFIX} Supabase Auth user creation failed:`, authError.message)

    if (isEmailAlreadyRegisteredError(authError.message)) {
      throw new BubbleApiError(ERROR_MESSAGES.EMAIL_IN_USE, 400, USED_EMAIL_CODE)
    }
    throw new BubbleApiError(`${ERROR_MESSAGES.AUTH_CREATION_FAILED}: ${authError.message}`, 500)
  }

  const supabaseUserId = authData.user?.id
  if (!supabaseUserId) {
    throw new BubbleApiError(ERROR_MESSAGES.AUTH_CREATION_FAILED, 500)
  }

  return supabaseUserId
}

/**
 * Sign in user to get session tokens
 * @effectful
 */
const signInForSession = async (
  supabase: SupabaseClient,
  email: string,
  password: string,
  supabaseUserId: string
): Promise<Session> => {
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !hasValidSession(sessionData)) {
    console.error(`${LOG_PREFIX} Failed to sign in user:`, signInError?.message)
    // Clean up: delete auth user since session creation failed
    await supabase.auth.admin.deleteUser(supabaseUserId)
    throw new BubbleApiError(ERROR_MESSAGES.SESSION_CREATION_FAILED, 500)
  }

  return sessionData.session
}

/**
 * Insert user record into database
 * @effectful
 */
const insertUserRecord = async (
  supabase: SupabaseClient,
  userRecord: UserRecord,
  supabaseUserId: string
): Promise<void> => {
  const { error: userInsertError } = await supabase
    .from('user')
    .insert(userRecord)

  if (userInsertError) {
    console.error(`${LOG_PREFIX} Failed to insert into public.user:`, userInsertError.message)
    // Clean up: delete auth user since profile creation failed
    await supabase.auth.admin.deleteUser(supabaseUserId)
    throw new BubbleApiError(
      `${ERROR_MESSAGES.PROFILE_CREATION_FAILED}: ${userInsertError.message}`,
      500
    )
  }
}

/**
 * Queue Bubble sync for background processing
 * @effectful
 */
const queueBubbleSync = async (
  supabase: SupabaseClient,
  userId: string,
  hostId: string
): Promise<void> => {
  try {
    await enqueueSignupSync(supabase, userId, hostId)
    console.log(`${LOG_PREFIX} ✅ Bubble sync queued`)
    triggerQueueProcessing()
    console.log(`${LOG_PREFIX} Queue processing triggered`)
  } catch (syncQueueError) {
    // Non-blocking - queue item can be processed later by pg_cron
    console.error(`${LOG_PREFIX} Failed to queue Bubble sync (non-blocking):`, syncQueueError)
  }
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle signup request
 * @effectful (database I/O, authentication, queue operations, console logging)
 */
export async function handleSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: SignupPayload
): Promise<SignupResult> {
  console.log(`${LOG_PREFIX} ========== SIGNUP REQUEST (SUPABASE NATIVE) ==========`)

  // Validate required fields
  validateRequiredFields(payload, ['email', 'password', 'retype'])
  const { email, password, retype, additionalData } = payload

  // Extract additional signup data
  const {
    firstName = EMPTY_STRING,
    lastName = EMPTY_STRING,
    userType = DEFAULT_USER_TYPE,
    birthDate = EMPTY_STRING,
    phoneNumber = EMPTY_STRING,
  }: SignupAdditionalData = additionalData || {}

  // Map userType string to os_user_type.display for foreign key constraint
  const userTypeDisplay = mapUserTypeToDisplay(userType)

  console.log(`${LOG_PREFIX} Registering new user: ${email}`)
  console.log(`${LOG_PREFIX} Additional data: firstName=${firstName}, lastName=${lastName}, userType=${userType} -> display="${userTypeDisplay}"`)

  // Validate inputs
  validatePassword(password, retype)
  validateEmailFormat(email)

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    buildClientConfig()
  )

  try {
    // ========== CHECK FOR EXISTING USER ==========
    console.log(`${LOG_PREFIX} Checking if email already exists...`)

    // Check in public.user table
    const existingUser = await checkEmailInUserTable(supabaseAdmin, email)
    if (hasUser(existingUser)) {
      console.log(`${LOG_PREFIX} Email already exists in user table:`, email)
      throw new BubbleApiError(ERROR_MESSAGES.EMAIL_IN_USE, 400, USED_EMAIL_CODE)
    }

    // Check in Supabase Auth
    const existsInAuth = await checkEmailInAuth(supabaseAdmin, email)
    if (existsInAuth) {
      console.log(`${LOG_PREFIX} Email already exists in Supabase Auth:`, email)
      throw new BubbleApiError(ERROR_MESSAGES.EMAIL_IN_USE, 400, USED_EMAIL_CODE)
    }

    console.log(`${LOG_PREFIX} ✅ Email is available`)

    // ========== GENERATE BUBBLE-STYLE ID ==========
    console.log(`${LOG_PREFIX} Generating ID using generate_bubble_id()...`)

    const generatedUserId = await generateUserId(supabaseAdmin)
    // User._id is now used directly as host reference - no separate host account ID needed
    const generatedHostId = generatedUserId

    console.log(`${LOG_PREFIX}    Generated User ID: ${generatedUserId}`)

    // ========== CREATE SUPABASE AUTH USER ==========
    console.log(`${LOG_PREFIX} Creating Supabase Auth user...`)

    const metadata = buildUserMetadata(
      generatedUserId,
      generatedHostId,
      firstName,
      lastName,
      userType,
      birthDate,
      phoneNumber
    )

    const supabaseUserId = await createAuthUser(supabaseAdmin, email, password, metadata)
    console.log(`${LOG_PREFIX} ✅ Supabase Auth user created:`, supabaseUserId)

    // ========== SIGN IN TO GET SESSION TOKENS ==========
    console.log(`${LOG_PREFIX} Signing in user to get session tokens...`)

    const session = await signInForSession(supabaseAdmin, email, password, supabaseUserId)
    console.log(`${LOG_PREFIX} ✅ Session created, expires in:`, session.expires_in, 'seconds')

    // ========== CREATE DATABASE RECORDS ==========
    console.log(`${LOG_PREFIX} Creating user record (user._id serves as host reference)`)
    console.log(`${LOG_PREFIX} Inserting into public.user table...`)

    const dateOfBirth = parseBirthDate(birthDate)
    const userRecord = buildUserRecord(
      generatedUserId,
      email,
      firstName,
      lastName,
      userTypeDisplay,
      dateOfBirth,
      phoneNumber
    )

    console.log(`${LOG_PREFIX} User record to insert:`, JSON.stringify(userRecord, null, 2))

    await insertUserRecord(supabaseAdmin, userRecord, supabaseUserId)

    console.log(`${LOG_PREFIX} ✅ User inserted into public.user table`)
    console.log(`${LOG_PREFIX} ========== SIGNUP COMPLETE ==========`)
    console.log(`${LOG_PREFIX}    User ID (_id): ${generatedUserId}`)
    console.log(`${LOG_PREFIX}    Host Account ID (legacy FK): ${generatedHostId}`)
    console.log(`${LOG_PREFIX}    Supabase Auth ID: ${supabaseUserId}`)
    console.log(`${LOG_PREFIX}    public.user created: yes`)
    console.log(`${LOG_PREFIX}    account_host created: SKIPPED (deprecated)`)

    // ========== QUEUE BUBBLE SYNC ==========
    console.log(`${LOG_PREFIX} Queueing Bubble sync for background processing...`)
    await queueBubbleSync(supabaseAdmin, generatedUserId, generatedHostId)

    // Return session and user data
    return buildSignupResult(session, generatedUserId, generatedHostId, supabaseUserId, userType)

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error
    }

    console.error(`${LOG_PREFIX} ========== SIGNUP ERROR ==========`)
    console.error(`${LOG_PREFIX} Error:`, error)

    throw new BubbleApiError(
      `${ERROR_MESSAGES.SIGNUP_FAILED}: ${(error as Error).message}`,
      500
    )
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
  DEFAULT_USER_TYPE,
  DEFAULT_RECEPTIVITY,
  EMPTY_STRING,
  USER_TYPE_DISPLAY_MAP,
  DEFAULT_USER_TYPE_DISPLAY,
  EMAIL_REGEX,
  ERROR_MESSAGES,
  USED_EMAIL_CODE,
  USER_CHECK_SELECT_FIELDS,

  // Predicates
  isValidPasswordLength,
  passwordsMatch,
  isValidEmailFormat,
  hasUser,
  matchesEmail,
  isNonEmptyString,
  isEmailAlreadyRegisteredError,
  hasValidSession,

  // Transformers
  normalizeEmail,
  mapUserTypeToDisplay,
  buildFullName,
  parseBirthDate,

  // Builders
  buildUserRecord,
  buildSignupResult,
  buildUserMetadata,
  buildClientConfig,

  // Validators
  validatePassword,
  validateEmailFormat,

  // Query helpers
  checkEmailInUserTable,
  checkEmailInAuth,
  generateUserId,
  createAuthUser,
  signInForSession,
  insertUserRecord,
  queueBubbleSync,
})
