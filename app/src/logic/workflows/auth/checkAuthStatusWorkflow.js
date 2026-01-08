/**
 * Check authentication status workflow.
 * Orchestrates checking cookies, secure storage, and session validation.
 *
 * @intent Determine if user is currently authenticated across multiple sources.
 * @rule Checks Split Lease cookies first (cross-domain compatibility).
 * @rule Falls back to secure storage tokens.
 * @rule Validates session hasn't expired.
 * @pure Yes - deterministic, no side effects
 *
 * This workflow coordinates infrastructure layer (cookies, storage) with
 * business rules (session validity).
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const AUTH_SOURCES = Object.freeze({
  COOKIES: 'cookies',
  SECURE_STORAGE: 'secure_storage'
})

const ERROR_MESSAGES = Object.freeze({
  MISSING_COOKIES: 'checkAuthStatusWorkflow: splitLeaseCookies is required',
  INVALID_AUTH_STATE: 'checkAuthStatusWorkflow: authState must be a boolean',
  INVALID_TOKENS: 'checkAuthStatusWorkflow: hasValidTokens must be a boolean'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a boolean
 * @pure
 */
const isBoolean = (value) => typeof value === 'boolean'

/**
 * Check if value is a non-null object
 * @pure
 */
const isObject = (value) => typeof value === 'object' && value !== null

/**
 * Check if cookies indicate logged in state
 * @pure
 */
const isLoggedInViaCookies = (cookies) => cookies.isLoggedIn === true

/**
 * Check if secure storage indicates logged in state
 * @pure
 */
const isLoggedInViaSecureStorage = (authState, hasValidTokens) =>
  authState === true && hasValidTokens === true

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build authenticated result from cookies
 * @pure
 */
const buildCookieAuthResult = (username) =>
  Object.freeze({
    isAuthenticated: true,
    source: AUTH_SOURCES.COOKIES,
    username
  })

/**
 * Build authenticated result from secure storage
 * @pure
 */
const buildSecureStorageAuthResult = () =>
  Object.freeze({
    isAuthenticated: true,
    source: AUTH_SOURCES.SECURE_STORAGE,
    username: null
  })

/**
 * Build unauthenticated result
 * @pure
 */
const buildUnauthenticatedResult = () =>
  Object.freeze({
    isAuthenticated: false,
    source: null,
    username: null
  })

// ─────────────────────────────────────────────────────────────
// Main Workflow
// ─────────────────────────────────────────────────────────────

/**
 * Check authentication status across multiple sources
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {object} params.splitLeaseCookies - Split Lease cookie auth status.
 * @param {boolean} params.splitLeaseCookies.isLoggedIn - Logged in via cookies.
 * @param {string} params.splitLeaseCookies.username - Username from cookies.
 * @param {boolean} params.authState - Auth state from secure storage.
 * @param {boolean} params.hasValidTokens - Whether valid tokens exist.
 * @returns {object} Authentication status with source information (frozen).
 *
 * @throws {Error} If splitLeaseCookies is not an object.
 * @throws {Error} If authState is not a boolean.
 * @throws {Error} If hasValidTokens is not a boolean.
 *
 * @example
 * const status = checkAuthStatusWorkflow({
 *   splitLeaseCookies: { isLoggedIn: true, username: 'john@example.com' },
 *   authState: true,
 *   hasValidTokens: true
 * })
 * // => { isAuthenticated: true, source: 'cookies', username: 'john@example.com' }
 */
export function checkAuthStatusWorkflow({
  splitLeaseCookies,
  authState,
  hasValidTokens
}) {
  // Validation
  if (!isObject(splitLeaseCookies)) {
    throw new Error(ERROR_MESSAGES.MISSING_COOKIES)
  }

  if (!isBoolean(authState)) {
    throw new Error(ERROR_MESSAGES.INVALID_AUTH_STATE)
  }

  if (!isBoolean(hasValidTokens)) {
    throw new Error(ERROR_MESSAGES.INVALID_TOKENS)
  }

  // Priority 1: Check Split Lease cookies (cross-domain compatibility)
  if (isLoggedInViaCookies(splitLeaseCookies)) {
    return buildCookieAuthResult(splitLeaseCookies.username)
  }

  // Priority 2: Check secure storage tokens
  if (isLoggedInViaSecureStorage(authState, hasValidTokens)) {
    return buildSecureStorageAuthResult()
  }

  // Not authenticated
  return buildUnauthenticatedResult()
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export { AUTH_SOURCES, ERROR_MESSAGES }
