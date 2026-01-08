/**
 * Validate token and fetch user data workflow.
 * Three-step process to validate authentication and retrieve user profile.
 *
 * @intent Validate user's authentication token and fetch their profile data.
 * @rule Step 1: Validate token via Bubble API (authentication check).
 * @rule Step 2: Fetch user display data from Supabase.
 * @rule Step 3: Fetch and cache user type if not already stored.
 *
 * This is an orchestration workflow that coordinates:
 * - External API validation (Bubble) - effectful
 * - Database queries (Supabase) - effectful
 * - Data transformation (user profile) - pure
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const PROTOCOL_RELATIVE_PREFIX = '//'
const HTTPS_PREFIX = 'https:'

const FIELD_NAMES = Object.freeze({
  ID: '_id',
  FIRST_NAME: 'Name - First',
  FULL_NAME: 'Name - Full',
  PROFILE_PHOTO: 'Profile Photo',
  USER_TYPE: 'Type - User Current'
})

const ERROR_MESSAGES = Object.freeze({
  INVALID_TOKEN: 'validateTokenWorkflow: token is required and must be a string',
  INVALID_USER_ID: 'validateTokenWorkflow: userId is required and must be a string',
  INVALID_VALIDATE_FN: 'validateTokenWorkflow: bubbleValidateFn must be a function',
  INVALID_FETCH_FN: 'validateTokenWorkflow: supabaseFetchUserFn must be a function'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if value is a function
 * @pure
 */
const isFunction = (value) => typeof value === 'function'

/**
 * Check if user type is valid (non-empty)
 * @pure
 */
const isValidUserType = (userType) =>
  userType !== null && userType !== undefined && userType !== ''

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize protocol-relative URLs to HTTPS
 * @pure
 */
const normalizePhotoUrl = (url) => {
  if (!url) {
    return null
  }
  if (url.startsWith(PROTOCOL_RELATIVE_PREFIX)) {
    return HTTPS_PREFIX + url
  }
  return url
}

/**
 * Resolve user type from cache or raw data
 * @pure
 */
const resolveUserType = (cachedUserType, userData) =>
  isValidUserType(cachedUserType)
    ? cachedUserType
    : (userData[FIELD_NAMES.USER_TYPE] || null)

/**
 * Build user result object from raw data
 * @pure
 */
const buildUserResult = (userData, userType) =>
  Object.freeze({
    userId: userData[FIELD_NAMES.ID],
    firstName: userData[FIELD_NAMES.FIRST_NAME] || null,
    fullName: userData[FIELD_NAMES.FULL_NAME] || null,
    profilePhoto: normalizePhotoUrl(userData[FIELD_NAMES.PROFILE_PHOTO]),
    userType
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Validate token and fetch user profile data
 *
 * @param {object} params - Named parameters.
 * @param {string} params.token - Authentication token to validate.
 * @param {string} params.userId - User ID for fetching profile.
 * @param {Function} params.bubbleValidateFn - Function to validate token with Bubble API.
 * @param {Function} params.supabaseFetchUserFn - Function to fetch user from Supabase.
 * @param {string|null} params.cachedUserType - Cached user type (if available).
 * @returns {Promise<object|null>} User data object (frozen) or null if invalid.
 *
 * @throws {Error} If token is not a valid string.
 * @throws {Error} If userId is not a valid string.
 * @throws {Error} If bubbleValidateFn is not a function.
 * @throws {Error} If supabaseFetchUserFn is not a function.
 *
 * @example
 * const userData = await validateTokenWorkflow({
 *   token: 'abc123',
 *   userId: 'user_456',
 *   bubbleValidateFn: async (token, userId) => { ... },
 *   supabaseFetchUserFn: async (userId) => { ... },
 *   cachedUserType: 'Guest'
 * })
 * // => { userId: 'user_456', firstName: 'John', userType: 'Guest', ... }
 */
export async function validateTokenWorkflow({
  token,
  userId,
  bubbleValidateFn,
  supabaseFetchUserFn,
  cachedUserType = null
}) {
  // Validation
  if (!isNonEmptyString(token)) {
    throw new Error(ERROR_MESSAGES.INVALID_TOKEN)
  }

  if (!isNonEmptyString(userId)) {
    throw new Error(ERROR_MESSAGES.INVALID_USER_ID)
  }

  if (!isFunction(bubbleValidateFn)) {
    throw new Error(ERROR_MESSAGES.INVALID_VALIDATE_FN)
  }

  if (!isFunction(supabaseFetchUserFn)) {
    throw new Error(ERROR_MESSAGES.INVALID_FETCH_FN)
  }

  // Step 1: Validate token via Bubble API (effectful)
  const isValidToken = await bubbleValidateFn(token, userId)

  if (!isValidToken) {
    return null
  }

  // Step 2: Fetch user data from Supabase (effectful)
  const userData = await supabaseFetchUserFn(userId)

  if (!userData) {
    return null
  }

  // Step 3: Transform and return user data (pure)
  const userType = resolveUserType(cachedUserType, userData)
  return buildUserResult(userData, userType)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  PROTOCOL_RELATIVE_PREFIX,
  HTTPS_PREFIX,
  FIELD_NAMES,
  ERROR_MESSAGES
}
