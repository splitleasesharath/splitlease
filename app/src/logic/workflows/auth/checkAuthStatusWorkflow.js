/**
 * Check authentication status workflow.
 * Orchestrates checking cookies, secure storage, and session validation.
 *
 * @intent Determine if user is currently authenticated across multiple sources.
 * @rule Checks Split Lease cookies first (cross-domain compatibility).
 * @rule Falls back to secure storage tokens.
 * @rule Validates session hasn't expired.
 *
 * This workflow coordinates infrastructure layer (cookies, storage) with
 * business rules (session validity).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.splitLeaseCookies - Split Lease cookie auth status.
 * @param {boolean} params.splitLeaseCookies.isLoggedIn - Logged in via cookies.
 * @param {string} params.splitLeaseCookies.username - Username from cookies.
 * @param {boolean} params.authState - Auth state from secure storage.
 * @param {boolean} params.hasValidTokens - Whether valid tokens exist.
 * @returns {object} Authentication status with source information.
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
  // No Fallback: Validate inputs
  if (!splitLeaseCookies || typeof splitLeaseCookies !== 'object') {
    throw new Error(
      'checkAuthStatusWorkflow: splitLeaseCookies is required'
    )
  }

  if (typeof authState !== 'boolean') {
    throw new Error(
      'checkAuthStatusWorkflow: authState must be a boolean'
    )
  }

  if (typeof hasValidTokens !== 'boolean') {
    throw new Error(
      'checkAuthStatusWorkflow: hasValidTokens must be a boolean'
    )
  }

  // Priority 1: Check Split Lease cookies (cross-domain compatibility)
  if (splitLeaseCookies.isLoggedIn) {
    return {
      isAuthenticated: true,
      source: 'cookies',
      username: splitLeaseCookies.username
    }
  }

  // Priority 2: Check secure storage tokens
  if (authState && hasValidTokens) {
    return {
      isAuthenticated: true,
      source: 'secure_storage',
      username: null // Username would need to be fetched separately
    }
  }

  // Not authenticated
  return {
    isAuthenticated: false,
    source: null,
    username: null
  }
}
