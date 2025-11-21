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
 *   import { checkAuthStatus, getUsernameFromCookies } from './auth.js'
 */

import {
  AUTH_STORAGE_KEYS,
  SESSION_VALIDATION,
  SIGNUP_LOGIN_URL,
  ACCOUNT_PROFILE_URL
} from './constants.js';
import { supabase } from './supabase.js';
import {
  setAuthToken as setSecureAuthToken,
  getAuthToken as getSecureAuthToken,
  setSessionId as setSecureSessionId,
  getSessionId as getSecureSessionId,
  setAuthState,
  getAuthState,
  getUserId as getPublicUserId,
  setUserType as setSecureUserType,
  getUserType as getSecureUserType,
  updateLastActivity,
  isSessionExpired,
  clearAllAuthData,
  hasValidTokens,
  migrateFromLegacyStorage
} from './secureStorage.js';

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
 * Checks auth state (not tokens) and validates session
 *
 * No fallback mechanisms - returns boolean directly
 * On failure: returns false without fallback logic
 *
 * @returns {Promise<boolean>} True if user is authenticated, false otherwise
 */
export async function checkAuthStatus() {
  console.log('🔍 Checking authentication status...');

  // Try to migrate from legacy storage first
  const migrated = await migrateFromLegacyStorage();
  if (migrated) {
    console.log('✅ Migrated from legacy storage');
  }

  // First check cross-domain cookies from .split.lease (for compatibility)
  const splitLeaseAuth = checkSplitLeaseCookies();

  if (splitLeaseAuth.isLoggedIn) {
    console.log('✅ User authenticated via Split Lease cookies');
    console.log('   Username:', splitLeaseAuth.username);
    isUserLoggedInState = true;
    setAuthState(true);
    return true;
  }

  // Check auth state (not tokens directly)
  const authState = getAuthState();

  if (authState) {
    // Verify we actually have tokens
    const hasTokens = await hasValidTokens();

    if (hasTokens) {
      console.log('✅ User authenticated via secure storage');
      isUserLoggedInState = true;
      updateLastActivity();
      return true;
    }
  }

  console.log('❌ User not authenticated');
  isUserLoggedInState = false;
  setAuthState(false);
  return false;
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
 * Get the timestamp of the last authentication
 *
 * @returns {number|null} Timestamp in milliseconds, or null if no auth recorded
 */
export function getLastAuthTime() {
  return getLastActivity();
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
 * Removes all auth tokens, session IDs, timestamps, user type, and cookies
 */
export function clearAuthData() {
  // Use secure storage clear (handles both secure tokens and state)
  clearAllAuthData();

  isUserLoggedInState = false;
  console.log('🗑️ Authentication data cleared (secure storage and cookies)');
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get authentication token from secure storage
 * NOTE: This should only be used internally for API calls
 * External code should not access tokens directly
 *
 * @returns {string|null} Auth token if exists, null otherwise
 */
export function getAuthToken() {
  return getSecureAuthToken();
}

/**
 * Store authentication token in secure storage
 * Automatically updates last activity timestamp
 *
 * @param {string} token - Authentication token to store
 */
export function setAuthToken(token) {
  setSecureAuthToken(token);
  updateLastActivity();
}

/**
 * Get session ID from secure storage
 * NOTE: This should only be used internally
 * External code should not access session IDs directly
 *
 * @returns {string|null} Session ID if exists, null otherwise
 */
export function getSessionId() {
  return getSecureSessionId();
}

/**
 * Store session ID in secure storage
 * Automatically updates last activity timestamp
 *
 * @param {string} sessionId - Session ID to store
 */
export function setSessionId(sessionId) {
  setSecureSessionId(sessionId);
  updateLastActivity();
}

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
 * Redirect to account profile page with user ID
 * Only redirect if user is logged in and has a valid session ID
 *
 * @returns {Promise<boolean>} True if redirect initiated, false if not logged in or no user ID
 */
export async function redirectToAccountProfile() {
  if (!isUserLoggedInState) {
    console.warn('User is not logged in, cannot redirect to account profile');
    return false;
  }

  const userId = getSessionId();
  if (!userId) {
    console.error('No user ID found in session, cannot redirect to account profile');
    return false;
  }

  window.location.href = `${ACCOUNT_PROFILE_URL}/${userId}`;
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
// Bubble Authentication API
// ============================================================================

const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY;
const BUBBLE_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user';
const BUBBLE_SIGNUP_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user';
const BUBBLE_CHECK_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/check-login';
const BUBBLE_LOGOUT_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/logout-user';
const BUBBLE_USER_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/obj/user';

/**
 * Login user via Bubble API
 * Stores token and user_id in localStorage on success
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response object with status, token, user_id, or error
 */
export async function loginUser(email, password) {
  console.log('🔐 Attempting login for:', email);

  if (!BUBBLE_API_KEY) {
    console.error('[Auth] VITE_BUBBLE_API_KEY is not configured');
    return {
      success: false,
      error: 'Configuration error. Please contact support.'
    };
  }

  try {
    const response = await fetch(BUBBLE_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_API_KEY}`
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      // Store token and user_id in secure storage
      setAuthToken(data.response.token);
      setSessionId(data.response.user_id);

      // Set auth state with user ID (public, non-sensitive)
      setAuthState(true, data.response.user_id);

      // Update login state
      isUserLoggedInState = true;

      console.log('✅ Login successful');
      console.log('   User ID:', data.response.user_id);
      console.log('   User Email:', email);
      console.log('   Token expires in:', data.response.expires, 'seconds');

      return {
        success: true,
        user_id: data.response.user_id,
        expires: data.response.expires
      };
    } else {
      // Handle error response from Bubble
      console.error('❌ Login failed:', data.reason || data.message);

      return {
        success: false,
        error: data.message || 'Login failed. Please try again.',
        reason: data.reason
      };
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Sign up new user via Bubble API
 * Stores token and user_id in localStorage on success
 * Automatically logs in the user after successful signup
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} retype - Password confirmation
 * @returns {Promise<Object>} Response object with status, token, user_id, or error
 */
export async function signupUser(email, password, retype) {
  console.log('📝 Attempting signup for:', email);

  if (!BUBBLE_API_KEY) {
    console.error('[Auth] VITE_BUBBLE_API_KEY is not configured');
    return {
      success: false,
      error: 'Configuration error. Please contact support.'
    };
  }

  // Client-side validation
  if (!email || !password || !retype) {
    return {
      success: false,
      error: 'All fields are required.'
    };
  }

  if (password.length < 4) {
    return {
      success: false,
      error: 'Password must be at least 4 characters long.'
    };
  }

  if (password !== retype) {
    return {
      success: false,
      error: 'The two passwords do not match!'
    };
  }

  try {
    const response = await fetch(BUBBLE_SIGNUP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_API_KEY}`
      },
      body: JSON.stringify({
        email,
        password,
        retype
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      // Store token and user_id in secure storage
      setAuthToken(data.response.token);
      setSessionId(data.response.user_id);

      // Set auth state with user ID (public, non-sensitive)
      setAuthState(true, data.response.user_id);

      // Update login state
      isUserLoggedInState = true;

      console.log('✅ Signup successful');
      console.log('   User ID:', data.response.user_id);
      console.log('   User Email:', email);
      console.log('   Token expires in:', data.response.expires, 'seconds');

      return {
        success: true,
        user_id: data.response.user_id,
        expires: data.response.expires
      };
    } else {
      // Handle error response from Bubble
      console.error('❌ Signup failed:', data.reason || data.message);

      // Map error reasons to user-friendly messages
      let errorMessage = data.message || 'Signup failed. Please try again.';

      if (data.reason === 'NOT_VALID_EMAIL') {
        errorMessage = data.message || 'Please enter a valid email address.';
      } else if (data.reason === 'USED_EMAIL') {
        errorMessage = data.message || 'This email is already in use.';
      } else if (data.reason === 'DO_NOT_MATCH') {
        errorMessage = data.message || 'The two passwords do not match!';
      }

      return {
        success: false,
        error: errorMessage,
        reason: data.reason
      };
    }
  } catch (error) {
    console.error('❌ Signup error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Validate token via Bubble API and fetch user data from Supabase
 * Three-step process:
 * 1. Validate token via Bubble API (authentication check)
 * 2. Fetch user display data directly from Supabase (following SearchPage pattern)
 * 3. Fetch and cache user type if not already stored
 *
 * @returns {Promise<Object|null>} User data object with firstName, profilePhoto, userType, etc. or null if invalid
 */
export async function validateTokenAndFetchUser() {
  const token = getAuthToken();
  const userId = getSessionId();

  if (!token || !userId) {
    console.log('[Auth] No token or user ID found - user not logged in');
    return null;
  }

  console.log('🔍 Step 1: Validating token via Bubble API...');

  try {
    // Step 1: Validate token via Bubble API
    const response = await fetch(`${BUBBLE_USER_ENDPOINT}/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Token is invalid
      console.log('❌ Token validation failed - clearing auth data');
      clearAuthData();
      isUserLoggedInState = false;
      return null;
    }

    // Token is valid, update last activity
    updateLastActivity();

    // Token is valid, now fetch user data from Supabase
    console.log('✅ Token valid - Step 2: Fetching user data from Supabase...');

    // Step 2: Query Supabase directly for user data (same pattern as SearchPage)
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
      .eq('_id', userId)
      .single();

    if (userError) {
      console.error('❌ Supabase query error:', userError);
      clearAuthData();
      isUserLoggedInState = false;
      return null;
    }

    if (!userData) {
      console.log('❌ User not found in Supabase');
      clearAuthData();
      isUserLoggedInState = false;
      return null;
    }

    // Handle protocol-relative URLs for profile photos (same as SearchPage)
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    // Step 3: Check and store user type if not already cached
    let userType = getUserType();
    if (!userType || userType === '') {
      userType = userData['Type - User Current'] || null;
      if (userType) {
        setUserType(userType);
        console.log('✅ User type fetched and cached:', userType);
      }
    } else {
      console.log('✅ User type loaded from cache:', userType);
    }

    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      profilePhoto: profilePhoto || null,
      userType: userType
    };

    console.log('✅ User data fetched from Supabase:', userDataObject.firstName, '- Type:', userDataObject.userType);
    isUserLoggedInState = true;

    return userDataObject;

  } catch (error) {
    console.error('❌ Token validation or Supabase fetch error:', error);
    clearAuthData();
    isUserLoggedInState = false;
    return null;
  }
}

/**
 * Check if current page is a protected page requiring authentication
 * Protected pages redirect to home if user is not logged in
 *
 * Handles both clean URLs (/guest-proposals) and .html URLs (/guest-proposals.html)
 * by normalizing the path before comparison
 *
 * @returns {boolean} True if current page requires authentication
 */
export function isProtectedPage() {
  const protectedPaths = [
    '/guest-proposals',
    '/account-profile',
    '/host-dashboard'
  ];

  // Normalize path by removing .html extension for consistent matching
  const currentPath = window.location.pathname.replace(/\.html$/, '');

  // Check if current path matches any protected path exactly or starts with it
  return protectedPaths.some(path =>
    currentPath === path || currentPath.startsWith(path + '/')
  );
}

/**
 * Logout user via Bubble API
 * Calls logout endpoint with stored Bearer token
 * Clears all authentication data from localStorage on success
 *
 * @returns {Promise<Object>} Response object with success status or error
 */
export async function logoutUser() {
  const token = getAuthToken();

  if (!token) {
    console.log('❌ No token found for logout');
    // Clear any remaining auth data even if no token
    clearAuthData();
    return {
      success: true,
      message: 'No active session to logout'
    };
  }

  console.log('🔓 Attempting logout...');

  try {
    const response = await fetch(BUBBLE_LOGOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Clear auth data regardless of API response
    // This ensures clean logout even if API call fails
    clearAuthData();

    if (response.ok) {
      console.log('✅ Logout successful');
      return {
        success: true,
        message: 'Logout successful'
      };
    } else {
      console.log('⚠️ Logout API returned error, but local data cleared');
      return {
        success: true,
        message: 'Logged out locally'
      };
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Auth data already cleared above
    return {
      success: true,
      message: 'Logged out locally (network error)'
    };
  }
}
