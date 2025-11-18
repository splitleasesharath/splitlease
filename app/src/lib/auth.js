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
import { supabase } from './supabase.js';

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
 * Removes all auth tokens, session IDs, timestamps, user type, and cookies
 */
export function clearAuthData() {
  // Clear localStorage
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_ID);
  localStorage.removeItem(AUTH_STORAGE_KEYS.LAST_AUTH);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER_TYPE);
  localStorage.removeItem('userEmail'); // Clear user email

  // Clear cookies to prevent checkAuthStatus from returning true after localStorage is cleared
  // Clear on current domain
  document.cookie = 'loggedIn=false; path=/; max-age=0';
  document.cookie = 'username=; path=/; max-age=0';
  document.cookie = 'splitlease_auth=; path=/; max-age=0';

  // Clear on .split.lease domain (cross-domain cookies)
  document.cookie = 'loggedIn=false; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'username=; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'splitlease_auth=; path=/; max-age=0; domain=.split.lease';

  isUserLoggedInState = false;
  console.log('🗑️ Authentication data cleared (localStorage and cookies)');
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

/**
 * Get user type from storage
 *
 * @returns {string|null} User type ('Host' or 'Guest') if exists, null otherwise
 */
export function getUserType() {
  return localStorage.getItem(AUTH_STORAGE_KEYS.USER_TYPE);
}

/**
 * Store user type
 *
 * @param {string} userType - User type to store ('Host' or 'Guest')
 */
export function setUserType(userType) {
  if (userType) {
    localStorage.setItem(AUTH_STORAGE_KEYS.USER_TYPE, userType);
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
      // Store token and user_id in localStorage
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.response.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_ID, data.response.user_id);
      localStorage.setItem(AUTH_STORAGE_KEYS.LAST_AUTH, Date.now().toString());

      // Store user email for convenience (useful for guest-proposals page)
      localStorage.setItem('userEmail', email);

      // Update login state
      isUserLoggedInState = true;

      console.log('✅ Login successful');
      console.log('   User ID:', data.response.user_id);
      console.log('   User Email:', email);
      console.log('   Token expires in:', data.response.expires, 'seconds');

      return {
        success: true,
        token: data.response.token,
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
      // Store token and user_id in localStorage
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.response.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_ID, data.response.user_id);
      localStorage.setItem(AUTH_STORAGE_KEYS.LAST_AUTH, Date.now().toString());

      // Store user email for convenience (useful for guest-proposals page)
      localStorage.setItem('userEmail', email);

      // Update login state
      isUserLoggedInState = true;

      console.log('✅ Signup successful');
      console.log('   User ID:', data.response.user_id);
      console.log('   User Email:', email);
      console.log('   Token expires in:', data.response.expires, 'seconds');

      return {
        success: true,
        token: data.response.token,
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
 * Check login session validity via Bubble API
 * Uses stored token as Bearer token to validate session
 *
 * @returns {Promise<boolean>} True if session is valid, false otherwise
 */
export async function checkLoginSession() {
  const token = getAuthToken();

  if (!token) {
    console.log('❌ No token found for session check');
    return false;
  }

  console.log('🔍 Checking login session...');

  try {
    const response = await fetch(BUBBLE_CHECK_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      console.log('✅ Session is valid');
      isUserLoggedInState = true;
      return true;
    } else {
      console.log('❌ Session is invalid');
      clearAuthData();
      return false;
    }
  } catch (error) {
    console.error('❌ Session check error:', error);
    clearAuthData();
    return false;
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
 * @returns {boolean} True if current page requires authentication
 */
export function isProtectedPage() {
  const protectedPages = [
    '/guest-proposals.html',
    '/account-profile.html',
    '/host-dashboard.html'
  ];

  const currentPath = window.location.pathname;
  return protectedPages.some(page => currentPath.includes(page));
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
