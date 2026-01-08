/**
 * OAuth Callback Handler - Global OAuth Callback Detection and Processing
 *
 * This module handles OAuth login callbacks globally, regardless of which page
 * the user returns to after LinkedIn authentication. It runs early in app
 * initialization (via dynamic import from supabase.js) before React mounts.
 *
 * Problem Solved:
 * - LinkedIn OAuth login redirects back to the original page
 * - The SignUpLoginModal is NOT mounted when user returns (modal is closed)
 * - Without global handling, OAuth tokens in URL are never processed
 *
 * Solution:
 * - Detect OAuth callback by checking localStorage flag + URL tokens
 * - Process callback via handleLinkedInOAuthLoginCallback() from auth.js
 * - Dispatch custom events for components to show toasts/handle UI
 *
 * @module lib/oauthCallbackHandler
 */

import { getLinkedInOAuthLoginFlow, clearLinkedInOAuthLoginFlow } from './secureStorage.js';
import { handleLinkedInOAuthLoginCallback } from './auth.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[OAuth]'

const EVENTS = Object.freeze({
  LOGIN_SUCCESS: 'oauth-login-success',
  USER_NOT_FOUND: 'oauth-login-user-not-found',
  LOGIN_ERROR: 'oauth-login-error'
})

const PROCESS_DELAY_MS = 100

const SKIP_REASONS = Object.freeze({
  ALREADY_PROCESSED: 'already_processed',
  NOT_LOGIN_FLOW: 'not_login_flow',
  NO_TOKENS: 'no_tokens_in_url'
})

// ─────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────

let oauthCallbackProcessed = false
let oauthCallbackResult = null

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if URL hash contains access token
 * @pure
 */
const hasAccessTokenInHash = () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  return !!hashParams.get('access_token')
}

/**
 * Check if URL query contains code parameter
 * @pure
 */
const hasCodeInQuery = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return !!urlParams.get('code')
}

/**
 * Detect if current URL contains OAuth callback tokens
 * @pure
 * @returns {boolean}
 */
function hasOAuthTokensInUrl() {
  return hasAccessTokenInHash() || hasCodeInQuery()
}

// ─────────────────────────────────────────────────────────────
// Result Builders (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Build skipped result
 * @pure
 */
const buildSkippedResult = (reason) =>
  Object.freeze({ processed: false, reason })

/**
 * Build success result
 * @pure
 */
const buildSuccessResult = (data) =>
  Object.freeze({ processed: true, success: true, result: data })

/**
 * Build user not found result
 * @pure
 */
const buildUserNotFoundResult = (email) =>
  Object.freeze({ processed: true, success: false, userNotFound: true, email })

/**
 * Build error result
 * @pure
 */
const buildErrorResult = (error) =>
  Object.freeze({ processed: true, success: false, error })

// ─────────────────────────────────────────────────────────────
// URL Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get clean URL without hash
 * @pure
 */
const getCleanUrl = () =>
  window.location.pathname + window.location.search

/**
 * Clean URL by removing OAuth hash
 * @effectful
 */
const cleanUrlHash = () => {
  if (window.location.hash) {
    window.history.replaceState(null, '', getCleanUrl())
  }
}

// ─────────────────────────────────────────────────────────────
// Event Dispatchers (Effectful)
// ─────────────────────────────────────────────────────────────

/**
 * Dispatch custom event
 * @effectful
 */
const dispatchEvent = (eventName, detail) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

/**
 * Dispatch success event
 * @effectful
 */
const dispatchSuccessEvent = (data) => {
  dispatchEvent(EVENTS.LOGIN_SUCCESS, data)
}

/**
 * Dispatch user not found event
 * @effectful
 */
const dispatchUserNotFoundEvent = (email) => {
  dispatchEvent(EVENTS.USER_NOT_FOUND, { email })
}

/**
 * Dispatch error event
 * @effectful
 */
const dispatchErrorEvent = (error) => {
  dispatchEvent(EVENTS.LOGIN_ERROR, { error })
}

// ─────────────────────────────────────────────────────────────
// Logging Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log info message
 * @effectful
 */
const logInfo = (message) => {
  console.log(`${LOG_PREFIX} ${message}`)
}

/**
 * Log error message
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Process OAuth login callback if applicable
 * This should be called early in app initialization
 * @effectful
 * @returns {Promise<{processed: boolean, success?: boolean, result?: any, error?: string, userNotFound?: boolean, email?: string}>}
 */
export async function processOAuthLoginCallback() {
  // Prevent duplicate processing
  if (oauthCallbackProcessed) {
    logInfo('Callback already processed in this session')
    return buildSkippedResult(SKIP_REASONS.ALREADY_PROCESSED)
  }

  // Check if this is a login flow
  const isLoginFlow = getLinkedInOAuthLoginFlow()
  if (!isLoginFlow) {
    return buildSkippedResult(SKIP_REASONS.NOT_LOGIN_FLOW)
  }

  // Check for OAuth tokens in URL
  if (!hasOAuthTokensInUrl()) {
    return buildSkippedResult(SKIP_REASONS.NO_TOKENS)
  }

  logInfo('Detected OAuth login callback, processing...')
  oauthCallbackProcessed = true

  try {
    // Wait for Supabase to process OAuth tokens from URL hash
    await new Promise(resolve => setTimeout(resolve, PROCESS_DELAY_MS))

    // Call handler which reads session and calls Edge Function
    const result = await handleLinkedInOAuthLoginCallback()
    oauthCallbackResult = result

    if (result.success) {
      logInfo('Login callback processed successfully')
      cleanUrlHash()
      dispatchSuccessEvent(result.data)
      return buildSuccessResult(result.data)
    }

    if (result.userNotFound) {
      logInfo(`User not found for OAuth login: ${result.email}`)
      dispatchUserNotFoundEvent(result.email)
      return buildUserNotFoundResult(result.email)
    }

    logInfo(`Login callback failed: ${result.error}`)
    clearLinkedInOAuthLoginFlow()
    dispatchErrorEvent(result.error)
    return buildErrorResult(result.error)
  } catch (error) {
    logError('Error processing callback', error)
    clearLinkedInOAuthLoginFlow()
    oauthCallbackResult = { success: false, error: error.message }
    dispatchErrorEvent(error.message)
    return buildErrorResult(error.message)
  }
}

/**
 * Check if OAuth callback was already processed this page load
 * @pure
 * @returns {boolean}
 */
export function isOAuthCallbackProcessed() {
  return oauthCallbackProcessed
}

/**
 * Get the result of OAuth callback processing
 * @pure
 * @returns {object|null}
 */
export function getOAuthCallbackResult() {
  return oauthCallbackResult
}

/**
 * Check if this is likely an OAuth callback page
 * Useful for components to decide whether to show loading states
 * @pure
 * @returns {boolean}
 */
export function isPendingOAuthCallback() {
  return getLinkedInOAuthLoginFlow() && hasOAuthTokensInUrl() && !oauthCallbackProcessed
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  LOG_PREFIX,
  EVENTS,
  PROCESS_DELAY_MS,
  SKIP_REASONS
}
