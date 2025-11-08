/**
 * Split Lease Authentication Utilities
 * Extracted from input/index/script.js
 *
 * Provides authentication-related functions for:
 * - Cookie checking and parsing
 * - Token management
 * - Login status detection
 * - Username extraction
 * - Session validation
 *
 * No fallback mechanisms - returns null or throws error on auth failure
 *
 * Usage:
 *   import { checkAuthStatus, getUsernameFromCookies, isUserLoggedIn } from './auth.js'
 */

import {
  AUTH_STORAGE_KEYS,
  SESSION_VALIDATION,
  SIGNUP_LOGIN_URL,
  ACCOUNT_PROFILE_URL
} from './constants.js';

// ============================================================================
// Auth State Management
// ============================================================================

let isUserLoggedInState = false;
let authCheckAttempts = 0;
const MAX_AUTH_CHECK_ATTEMPTS = SESSION_VALIDATION.MAX_AUTH_CHECK_ATTEMPTS;

// ============================================================================
// Cookie Parsing Utilities
// ============================================================================

/**
 * Parse username from document cookies
 * Decodes URL-encoded cookie values and removes surrounding quotes
 *
 * @returns {string|null} Username if found, null if no username cookie exists
 */
export function getUsernameFromCookies() {
  const cookies = document.cookie.split('; ');
  const usernameCookie = cookies.find(c => c.startsWith('username='));

  if (usernameCookie) {
    let username = decodeURIComponent(usernameCookie.split('=')[1]);
    // Remove surrounding quotes if present (both single and double quotes)
    username = username.replace(/^["']|["']$/g, '');
    return username;
  }

  return null;
}

/**
 * Check Split Lease cookies from Bubble app
 * Verifies both loggedIn and username cookies
 *
 * @returns {Object} Authentication status object
 *   - isLoggedIn: boolean indicating if user is logged in
 *   - username: string with username or null if not set
 */
export function checkSplitLeaseCookies() {
  const cookies = document.cookie.split('; ');
  const loggedInCookie = cookies.find(c => c.startsWith('loggedIn='));
  const usernameCookie = cookies.find(c => c.startsWith('username='));

  const isLoggedIn = loggedInCookie ? loggedInCookie.split('=')[1] === 'true' : false;
  const username = getUsernameFromCookies();

  // Log the authentication status to console
  console.log('🔐 Split Lease Cookie Auth Check:');
  console.log('   Logged In:', isLoggedIn);
  console.log('   Username:', username || 'not set');
  console.log('   Raw Cookies:', { loggedInCookie, usernameCookie });

  return { isLoggedIn, username };
}

// ============================================================================
// Authentication Status Checking
// ============================================================================

/**
 * Lightweight authentication status check
 * Checks cross-domain cookies first, then falls back to localStorage/legacy cookies
 *
 * No fallback mechanisms - returns boolean directly
 * On failure: returns false without fallback logic
 *
 * @returns {boolean} True if user is authenticated, false otherwise
 */
export function checkAuthStatus() {
  console.log('🔍 Checking authentication status...');

  // First check cross-domain cookies from .split.lease
  const splitLeaseAuth = checkSplitLeaseCookies();

  if (splitLeaseAuth.isLoggedIn) {
    console.log('✅ User authenticated via Split Lease cookies');
    console.log('   Username:', splitLeaseAuth.username);
    isUserLoggedInState = true;
    return true;
  }

  // Check for localStorage authentication tokens
  const authToken = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  const sessionId = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION_ID);
  const lastAuthTime = localStorage.getItem(AUTH_STORAGE_KEYS.LAST_AUTH);

  // Check for legacy auth cookie
  const authCookie = document.cookie.split('; ').find(row => row.startsWith('splitlease_auth='));

  // Validate session age (24 hours)
  const sessionValid = lastAuthTime &&
    (Date.now() - parseInt(lastAuthTime)) < SESSION_VALIDATION.MAX_AGE_MS;

  if ((authToken || sessionId || authCookie) && sessionValid) {
    console.log('✅ User authenticated via localStorage/legacy cookies');
    isUserLoggedInState = true;
    return true;
  } else {
    console.log('❌ User not authenticated');
    isUserLoggedInState = false;
    return false;
  }
}

/**
 * Check if user is currently logged in
 * Returns cached authentication state from last check
 *
 * @returns {boolean} True if user is logged in, false otherwise
 */
export function isUserLoggedIn() {
  return isUserLoggedInState;
}

/**
 * Set the logged in state explicitly
 * Useful for handling authentication events
 *
 * @param {boolean} state - Whether user is logged in
 */
export function setUserLoggedInState(state) {
  isUserLoggedInState = state;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Validate session by checking expiry time
 * Ensures session is not older than 24 hours
 *
 * @returns {boolean} True if session is valid, false if expired or missing
 */
export function isSessionValid() {
  const lastAuthTime = localStorage.getItem(AUTH_STORAGE_KEYS.LAST_AUTH);

  if (!lastAuthTime) {
    return false;
  }

  const sessionAge = Date.now() - parseInt(lastAuthTime);
  return sessionAge < SESSION_VALIDATION.MAX_AGE_MS;
}

/**
 * Get the timestamp of the last authentication
 *
 * @returns {number|null} Timestamp in milliseconds, or null if no auth recorded
 */
export function getLastAuthTime() {
  const lastAuth = localStorage.getItem(AUTH_STORAGE_KEYS.LAST_AUTH);
  return lastAuth ? parseInt(lastAuth) : null;
}

/**
 * Get current session age in milliseconds
 *
 * @returns {number|null} Age in milliseconds, or null if no session
 */
export function getSessionAge() {
  const lastAuthTime = getLastAuthTime();
  return lastAuthTime ? Date.now() - lastAuthTime : null;
}

/**
 * Clear authentication data from storage
 * Removes all auth tokens, session IDs, and timestamps
 */
export function clearAuthData() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_ID);
  localStorage.removeItem(AUTH_STORAGE_KEYS.LAST_AUTH);
  isUserLoggedInState = false;
  console.log('🗑️ Authentication data cleared');
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get authentication token from storage
 *
 * @returns {string|null} Auth token if exists, null otherwise
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
}

/**
 * Store authentication token
 *
 * @param {string} token - Authentication token to store
 */
export function setAuthToken(token) {
  localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_STORAGE_KEYS.LAST_AUTH, Date.now().toString());
}

/**
 * Get session ID from storage
 *
 * @returns {string|null} Session ID if exists, null otherwise
 */
export function getSessionId() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.SESSION_ID);
}

/**
 * Store session ID
 *
 * @param {string} sessionId - Session ID to store
 */
export function setSessionId(sessionId) {
  localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_ID, sessionId);
  localStorage.setItem(AUTH_STORAGE_KEYS.LAST_AUTH, Date.now().toString());
}

// ============================================================================
// User Information
// ============================================================================

/**
 * Get current logged-in username from cookies
 *
 * @returns {string|null} Username if logged in, null otherwise
 */
export function getCurrentUsername() {
  if (!isUserLoggedInState) {
    return null;
  }
  return getUsernameFromCookies();
}

/**
 * Store username in global scope for use in redirects
 * Also used by handleLoggedInUser to persist username
 *
 * @param {string} username - Username to store
 */
export function storeCurrentUsername(username) {
  if (typeof window !== 'undefined') {
    window.currentUsername = username;
  }
}

/**
 * Get stored username from global scope
 *
 * @returns {string|null} Stored username or null
 */
export function getStoredUsername() {
  if (typeof window !== 'undefined') {
    return window.currentUsername || null;
  }
  return null;
}

// ============================================================================
// Authentication Redirect Utilities
// ============================================================================

/**
 * Redirect to login page
 * Direct redirect without modal or iframe
 *
 * @param {string} returnUrl - Optional URL to return to after login
 */
export function redirectToLogin(returnUrl = null) {
  let url = SIGNUP_LOGIN_URL;

  if (returnUrl) {
    url += `?returnTo=${encodeURIComponent(returnUrl)}`;
  }

  window.location.href = url;
}

/**
 * Redirect to account profile page
 * Only redirect if user is logged in
 *
 * @returns {boolean} True if redirect initiated, false if not logged in
 */
export function redirectToAccountProfile() {
  if (!isUserLoggedInState) {
    console.warn('User is not logged in, cannot redirect to account profile');
    return false;
  }

  window.location.href = ACCOUNT_PROFILE_URL;
  return true;
}

// ============================================================================
// Authentication Check Attempts
// ============================================================================

/**
 * Increment authentication check attempt counter
 * Useful for limiting retry attempts
 *
 * @returns {number} New attempt count
 */
export function incrementAuthCheckAttempts() {
  authCheckAttempts++;
  return authCheckAttempts;
}

/**
 * Get current authentication check attempt count
 *
 * @returns {number} Current attempt count
 */
export function getAuthCheckAttempts() {
  return authCheckAttempts;
}

/**
 * Check if maximum auth check attempts reached
 *
 * @returns {boolean} True if max attempts exceeded, false otherwise
 */
export function hasExceededMaxAuthAttempts() {
  return authCheckAttempts >= MAX_AUTH_CHECK_ATTEMPTS;
}

/**
 * Reset authentication check attempt counter
 */
export function resetAuthCheckAttempts() {
  authCheckAttempts = 0;
}

// ============================================================================
// Auth State Query Utilities
// ============================================================================

/**
 * Get complete authentication state object
 * Useful for debugging or state inspection
 *
 * @returns {Object} Auth state including status, username, tokens, and session info
 */
export function getAuthState() {
  return {
    isLoggedIn: isUserLoggedInState,
    username: getCurrentUsername(),
    authToken: getAuthToken(),
    sessionId: getSessionId(),
    sessionValid: isSessionValid(),
    sessionAge: getSessionAge(),
    lastAuth: getLastAuthTime(),
    checkAttempts: getAuthCheckAttempts()
  };
}

/**
 * Check if user has any valid authentication
 * Returns true if ANY form of authentication is present and valid
 *
 * @returns {boolean} True if user has valid auth, false otherwise
 */
export function hasValidAuthentication() {
  // Check cookies
  const cookieAuth = checkSplitLeaseCookies();
  if (cookieAuth.isLoggedIn) {
    return true;
  }

  // Check localStorage tokens
  const authToken = getAuthToken();
  const sessionId = getSessionId();
  const sessionValid = isSessionValid();

  if ((authToken || sessionId) && sessionValid) {
    return true;
  }

  return false;
}
