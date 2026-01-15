/**
 * Split Lease Authentication - Session Management
 * Handles session validation, refresh, and cleanup
 */

import { SESSION_VALIDATION } from '../constants.js';
import {
  getAuthState,
  clearAllAuthData,
  getUserId as getPublicUserId,
  getUserType as getSecureUserType,
  setUserType as setSecureUserType,
  getFirstName as getSecureFirstName,
  getAvatarUrl as getSecureAvatarUrl,
} from '../secureStorage.js';

// ============================================================================
// Auth Check Attempts Tracking
// ============================================================================

let authCheckAttempts = 0;
const MAX_AUTH_CHECK_ATTEMPTS = SESSION_VALIDATION.MAX_AUTH_CHECK_ATTEMPTS;

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
// Session Management
// ============================================================================

/**
 * Validate session by checking if tokens exist
 * Bubble API handles actual token expiry - we validate on each request
 *
 * @returns {boolean} True if session is valid, false if expired or missing
 */
export function isSessionValid() {
  // Simply check if auth state is set
  // Bubble will reject expired tokens on API calls
  return getAuthState();
}

/**
 * Clear authentication data from storage
 * Removes all auth tokens, session IDs, timestamps, user type, and cookies
 */
export function clearAuthData() {
  // Use secure storage clear (handles both secure tokens and state)
  clearAllAuthData();

  console.log('🗑️ Authentication data cleared (secure storage and cookies)');
}

// ============================================================================
// User Information Getters
// ============================================================================

/**
 * Get user ID from public state (non-sensitive identifier)
 * NOTE: This is public state, not the encrypted session ID
 *
 * @returns {string|null} User ID if exists, null otherwise
 */
export function getUserId() {
  return getPublicUserId();
}

/**
 * Get user type from storage (public state)
 *
 * @returns {string|null} User type ('Host' or 'Guest') if exists, null otherwise
 */
export function getUserType() {
  return getSecureUserType();
}

/**
 * Store user type (public state)
 *
 * @param {string} userType - User type to store ('Host' or 'Guest')
 */
export function setUserType(userType) {
  if (userType) {
    setSecureUserType(userType);
  }
}

/**
 * Get first name
 * @returns {string|null} First name or null
 */
export function getFirstName() {
  return getSecureFirstName();
}

/**
 * Get avatar URL
 * @returns {string|null} Avatar URL or null
 */
export function getAvatarUrl() {
  return getSecureAvatarUrl();
}
