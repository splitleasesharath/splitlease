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
 * @module auth-user/handlers/resetPassword
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SupabaseClient, User as AuthUser } from 'https://esm.sh/@supabase/supabase-js@2';
import { BubbleApiError } from '../../_shared/errors.ts';
import { validateRequiredFields, validateEmail } from '../../_shared/validation.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[reset-password]'
const DEFAULT_REDIRECT_URL = 'https://split.lease/reset-password'
const DEFAULT_USER_TYPE = 'Guest'
const EMPTY_STRING = ''

/**
 * Legacy user select fields
 * @immutable
 */
const LEGACY_USER_SELECT_FIELDS = '_id, email, "Name - First", "Name - Last", "Type - User Current"'

/**
 * Success message (security: always the same)
 * @immutable
 */
const SUCCESS_MESSAGE = 'If an account with that email exists, a password reset link has been sent.'

/**
 * Debug step names
 * @immutable
 */
const DEBUG_STEPS = Object.freeze({
  CHECKING_AUTH_USERS: 'checking_auth_users',
  CHECKING_PUBLIC_USER: 'checking_public_user',
  CREATING_AUTH_USER: 'creating_auth_user_for_legacy',
  CREATE_AUTH_USER_FAILED: 'create_auth_user_failed',
  CREATE_AUTH_USER_SUCCESS: 'create_auth_user_success',
  USER_NOT_FOUND_ANYWHERE: 'user_not_found_anywhere',
  USER_EXISTS_IN_AUTH: 'user_exists_in_auth',
  SENDING_RESET_EMAIL: 'sending_reset_email',
  RESET_EMAIL_FAILED: 'reset_email_failed',
  RESET_EMAIL_SENT: 'reset_email_sent',
  UNEXPECTED_ERROR: 'unexpected_error',
} as const)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ResetPasswordPayload {
  readonly email: string;
  readonly redirectTo?: string;
}

interface LegacyUser {
  readonly _id: string;
  readonly email: string;
  readonly 'Name - First'?: string | null;
  readonly 'Name - Last'?: string | null;
  readonly 'Type - User Current'?: string | null;
}

interface DebugInfo {
  email: string;
  timestamp: string;
  steps: string[];
  redirectUrl?: string;
  listUsersError?: string;
  listUsersException?: string;
  foundInAuthUsers?: boolean;
  foundInPublicUser?: boolean;
  legacyUserError?: string;
  createAuthUserError?: string;
  createdAuthUserId?: string;
  linkedToUserId?: string;
  resetEmailError?: {
    message: string;
    status?: number;
    code?: string;
  };
  resetEmailResponse?: unknown;
  emailSent?: boolean;
  unexpectedError?: {
    type: string;
    message: string;
    stack?: string;
  };
}

interface ResetPasswordResult {
  readonly message: string;
  readonly _debug: DebugInfo;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is truthy
 * @pure
 */
const isTruthy = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

/**
 * Check if auth user matches email
 * @pure
 */
const matchesEmail = (user: AuthUser, email: string): boolean =>
  user.email?.toLowerCase() === email

// ─────────────────────────────────────────────────────────────
// Data Transformers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize email to lowercase and trimmed
 * @pure
 */
const normalizeEmail = (email: string): string =>
  email.toLowerCase().trim()

/**
 * Generate temporary password for legacy user migration
 * @pure (crypto.randomUUID is deterministic per call)
 */
const generateTempPassword = (): string =>
  crypto.randomUUID() + crypto.randomUUID()

// ─────────────────────────────────────────────────────────────
// Debug Info Builders
// ─────────────────────────────────────────────────────────────

/**
 * Create initial debug info object
 * @pure
 */
const createDebugInfo = (email: string): DebugInfo => ({
  email,
  timestamp: new Date().toISOString(),
  steps: [],
})

/**
 * Add step to debug info (returns new object)
 * @pure
 */
const addDebugStep = (debug: DebugInfo, step: string): DebugInfo => ({
  ...debug,
  steps: [...debug.steps, step],
})

// ─────────────────────────────────────────────────────────────
// Result Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (debugInfo: DebugInfo): ResetPasswordResult =>
  Object.freeze({
    message: SUCCESS_MESSAGE,
    _debug: debugInfo,
  })

/**
 * Build legacy user metadata for auth creation
 * @pure
 */
const buildLegacyUserMetadata = (legacyUser: LegacyUser) =>
  Object.freeze({
    user_id: legacyUser._id,
    host_account_id: legacyUser._id, // user._id used directly as host reference
    user_type: legacyUser['Type - User Current'] ?? DEFAULT_USER_TYPE,
    first_name: legacyUser['Name - First'] ?? EMPTY_STRING,
    last_name: legacyUser['Name - Last'] ?? EMPTY_STRING,
    migrated_from_bubble: true,
    migration_date: new Date().toISOString(),
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
// Auth User Lookup
// ─────────────────────────────────────────────────────────────

/**
 * Find auth user by email in auth.users
 * @effectful
 */
const findAuthUserByEmail = async (
  supabaseAdmin: SupabaseClient,
  email: string,
  debugInfo: DebugInfo
): Promise<{ user: AuthUser | null; debugInfo: DebugInfo }> => {
  let updatedDebug = addDebugStep(debugInfo, DEBUG_STEPS.CHECKING_AUTH_USERS)

  try {
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error(`${LOG_PREFIX} ❌ Failed to list auth users:`, JSON.stringify({
        message: listError.message,
        status: listError.status,
        code: listError.code
      }, null, 2))
      updatedDebug = { ...updatedDebug, listUsersError: listError.message }
      return { user: null, debugInfo: updatedDebug }
    }

    const existingUser = authUsers?.users?.find((u) => matchesEmail(u, email)) ?? null
    updatedDebug = { ...updatedDebug, foundInAuthUsers: isTruthy(existingUser) }
    console.log(`${LOG_PREFIX} Found in auth.users: ${isTruthy(existingUser)}`)

    return { user: existingUser, debugInfo: updatedDebug }
  } catch (listErr) {
    console.error(`${LOG_PREFIX} ❌ Exception listing auth users:`, (listErr as Error).message)
    updatedDebug = { ...updatedDebug, listUsersException: (listErr as Error).message }
    return { user: null, debugInfo: updatedDebug }
  }
}

/**
 * Find legacy user in public.user table
 * @effectful
 */
const findLegacyUser = async (
  supabaseAdmin: SupabaseClient,
  email: string,
  debugInfo: DebugInfo
): Promise<{ user: LegacyUser | null; debugInfo: DebugInfo }> => {
  let updatedDebug = addDebugStep(debugInfo, DEBUG_STEPS.CHECKING_PUBLIC_USER)

  const { data: legacyUser, error: legacyError } = await supabaseAdmin
    .from('user')
    .select(LEGACY_USER_SELECT_FIELDS)
    .eq('email', email)
    .maybeSingle()

  if (legacyError) {
    console.error(`${LOG_PREFIX} ❌ Failed to check public.user:`, JSON.stringify({
      message: legacyError.message,
      code: legacyError.code,
      details: legacyError.details
    }, null, 2))
    updatedDebug = { ...updatedDebug, legacyUserError: legacyError.message }
  }

  updatedDebug = { ...updatedDebug, foundInPublicUser: isTruthy(legacyUser) }
  console.log(`${LOG_PREFIX} Found in public.user: ${isTruthy(legacyUser)}`)

  return { user: legacyUser as LegacyUser | null, debugInfo: updatedDebug }
}

/**
 * Create auth user for legacy user migration
 * @effectful
 */
const createAuthUserForLegacy = async (
  supabaseAdmin: SupabaseClient,
  email: string,
  legacyUser: LegacyUser,
  debugInfo: DebugInfo
): Promise<DebugInfo> => {
  console.log(`${LOG_PREFIX} Step 3: Creating auth.users entry for legacy user...`)
  console.log(`${LOG_PREFIX} Legacy user data:`, JSON.stringify({
    _id: legacyUser._id,
    email: legacyUser.email,
    firstName: legacyUser['Name - First'],
    userType: legacyUser['Type - User Current']
  }, null, 2))

  let updatedDebug = addDebugStep(debugInfo, DEBUG_STEPS.CREATING_AUTH_USER)
  const tempPassword = generateTempPassword()

  const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: buildLegacyUserMetadata(legacyUser)
  })

  if (createError) {
    console.error(`${LOG_PREFIX} ❌ Failed to create auth.users entry:`, JSON.stringify({
      message: createError.message,
      status: createError.status,
      code: createError.code
    }, null, 2))
    updatedDebug = {
      ...updatedDebug,
      createAuthUserError: createError.message,
    }
    updatedDebug = addDebugStep(updatedDebug, DEBUG_STEPS.CREATE_AUTH_USER_FAILED)
  } else {
    console.log(`${LOG_PREFIX} ✅ Successfully created auth.users entry for legacy user`)
    console.log(`${LOG_PREFIX}    New Auth ID:`, newAuthUser?.user?.id)
    console.log(`${LOG_PREFIX}    Linked to user._id:`, legacyUser._id)
    updatedDebug = {
      ...updatedDebug,
      createdAuthUserId: newAuthUser?.user?.id,
      linkedToUserId: legacyUser._id,
    }
    updatedDebug = addDebugStep(updatedDebug, DEBUG_STEPS.CREATE_AUTH_USER_SUCCESS)
  }

  return updatedDebug
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

/**
 * Handle password reset request
 * @effectful (authentication API, console logging)
 */
export async function handleRequestPasswordReset(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: ResetPasswordPayload
): Promise<ResetPasswordResult> {
  console.log(`${LOG_PREFIX} ========== PASSWORD RESET REQUEST ==========`)
  console.log(`${LOG_PREFIX} Supabase URL:`, supabaseUrl)
  console.log(`${LOG_PREFIX} Payload received:`, JSON.stringify(payload, null, 2))

  // Validate required fields
  validateRequiredFields(payload, ['email'])
  const { email, redirectTo } = payload

  // Validate email format
  validateEmail(email)

  const emailLower = normalizeEmail(email)
  console.log(`${LOG_PREFIX} Requesting reset for: ${emailLower}`)

  // Initialize Supabase admin client
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    buildClientConfig()
  )

  // Initialize debug info
  let debugInfo = createDebugInfo(emailLower)

  try {
    const resetRedirectUrl = redirectTo ?? DEFAULT_REDIRECT_URL
    debugInfo = { ...debugInfo, redirectUrl: resetRedirectUrl }
    console.log(`${LOG_PREFIX} Redirect URL: ${resetRedirectUrl}`)

    // ========== STEP 1: Check if user exists in auth.users ==========
    console.log(`${LOG_PREFIX} Step 1: Checking auth.users for existing user...`)
    const authResult = await findAuthUserByEmail(supabaseAdmin, emailLower, debugInfo)
    debugInfo = authResult.debugInfo

    // ========== STEP 2: If not in auth.users, check public.user (legacy) ==========
    if (!isTruthy(authResult.user)) {
      console.log(`${LOG_PREFIX} Step 2: User not in auth.users, checking public.user (legacy)...`)
      const legacyResult = await findLegacyUser(supabaseAdmin, emailLower, debugInfo)
      debugInfo = legacyResult.debugInfo

      // ========== STEP 3: Create auth.users entry for legacy user ==========
      if (isTruthy(legacyResult.user)) {
        debugInfo = await createAuthUserForLegacy(supabaseAdmin, emailLower, legacyResult.user, debugInfo)
      } else {
        console.log(`${LOG_PREFIX} User not found in public.user either - email does not exist`)
        debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.USER_NOT_FOUND_ANYWHERE)
      }
    } else {
      console.log(`${LOG_PREFIX} User already exists in auth.users - standard reset flow`)
      debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.USER_EXISTS_IN_AUTH)
    }

    // ========== STEP 4: Send password reset email ==========
    console.log(`${LOG_PREFIX} Step 4: Sending password reset email via Supabase Auth...`)
    debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.SENDING_RESET_EMAIL)

    const { data: resetData, error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      emailLower,
      { redirectTo: resetRedirectUrl }
    )

    if (resetError) {
      console.error(`${LOG_PREFIX} ❌ RESET EMAIL ERROR:`, JSON.stringify({
        message: resetError.message,
        status: resetError.status,
        code: resetError.code,
        name: resetError.name,
        stack: resetError.stack
      }, null, 2))
      debugInfo = {
        ...debugInfo,
        resetEmailError: {
          message: resetError.message,
          status: resetError.status,
          code: resetError.code,
        },
        emailSent: false,
      }
      debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.RESET_EMAIL_FAILED)
    } else {
      console.log(`${LOG_PREFIX} ✅ Password reset email sent successfully`)
      console.log(`${LOG_PREFIX} Reset response data:`, JSON.stringify(resetData, null, 2))
      debugInfo = {
        ...debugInfo,
        resetEmailResponse: resetData,
        emailSent: true,
      }
      debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.RESET_EMAIL_SENT)
    }

    console.log(`${LOG_PREFIX} ========== REQUEST COMPLETE ==========`)
    console.log(`${LOG_PREFIX} Debug summary:`, JSON.stringify(debugInfo, null, 2))

    return buildSuccessResult(debugInfo)

  } catch (error) {
    console.error(`${LOG_PREFIX} ========== UNEXPECTED ERROR ==========`)
    console.error(`${LOG_PREFIX} Error type:`, (error as Error).constructor.name)
    console.error(`${LOG_PREFIX} Error message:`, (error as Error).message)
    console.error(`${LOG_PREFIX} Error stack:`, (error as Error).stack)

    debugInfo = {
      ...debugInfo,
      unexpectedError: {
        type: (error as Error).constructor.name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    }
    debugInfo = addDebugStep(debugInfo, DEBUG_STEPS.UNEXPECTED_ERROR)

    // Return success for security, but include debug info
    return buildSuccessResult(debugInfo)
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
  DEFAULT_REDIRECT_URL,
  DEFAULT_USER_TYPE,
  EMPTY_STRING,
  LEGACY_USER_SELECT_FIELDS,
  SUCCESS_MESSAGE,
  DEBUG_STEPS,

  // Predicates
  isTruthy,
  matchesEmail,

  // Transformers
  normalizeEmail,
  generateTempPassword,

  // Debug builders
  createDebugInfo,
  addDebugStep,

  // Result builders
  buildSuccessResult,
  buildLegacyUserMetadata,
  buildClientConfig,

  // Lookup helpers
  findAuthUserByEmail,
  findLegacyUser,
  createAuthUserForLegacy,
})
