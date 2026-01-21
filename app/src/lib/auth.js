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
import { logger } from './logger.js';
import { delay } from './timing.js';
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
  clearAllAuthData,
  hasValidTokens,
  migrateFromLegacyStorage,
  getFirstName as getSecureFirstName,
  getAvatarUrl as getSecureAvatarUrl,
  setFirstName as setSecureFirstName,
  setAvatarUrl as setSecureAvatarUrl,
  setLinkedInOAuthUserType,
  getLinkedInOAuthUserType,
  clearLinkedInOAuthUserType,
  setLinkedInOAuthLoginFlow,
  getLinkedInOAuthLoginFlow,
  clearLinkedInOAuthLoginFlow,
  setGoogleOAuthUserType,
  getGoogleOAuthUserType,
  clearGoogleOAuthUserType,
  setGoogleOAuthLoginFlow,
  getGoogleOAuthLoginFlow,
  clearGoogleOAuthLoginFlow
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
  logger.debug('🔐 Split Lease Cookie Auth Check:');
  logger.debug('   Logged In:', isLoggedIn);
  logger.debug('   Username:', username || 'not set');
  logger.debug('   Raw Cookies:', { loggedInCookie, usernameCookie });

  return { isLoggedIn, username };
}

// ============================================================================
// Authentication Status Checking
// ============================================================================

/**
 * Lightweight authentication status check
 * Checks auth state (not tokens) and validates session
 *
 * Supports both:
 * - Supabase Auth sessions (native signup)
 * - Legacy Bubble auth (tokens in localStorage)
 *
 * No fallback mechanisms - returns boolean directly
 * On failure: returns false without fallback logic
 *
 * @returns {Promise<boolean>} True if user is authenticated, false otherwise
 */
export async function checkAuthStatus() {
  logger.debug('🔍 Checking authentication status...');

  // Try to migrate from legacy storage first
  const migrated = await migrateFromLegacyStorage();
  if (migrated) {
    logger.debug('✅ Migrated from legacy storage');
  }

  // First check cross-domain cookies from .split.lease (for compatibility)
  const splitLeaseAuth = checkSplitLeaseCookies();

  if (splitLeaseAuth.isLoggedIn) {
    logger.debug('✅ User authenticated via Split Lease cookies');
    logger.debug('   Username:', splitLeaseAuth.username);
    isUserLoggedInState = true;
    setAuthState(true);
    return true;
  }

  // Check Supabase Auth session (for native Supabase signups)
  // CRITICAL: Supabase client may not have loaded session from localStorage yet
  // We need to handle the race condition where getSession() returns null initially
  // but INITIAL_SESSION fires shortly after with a valid session
  try {
    let { data: { session }, error } = await supabase.auth.getSession();

    // If no session on first check, wait briefly for Supabase to initialize
    // This handles the race condition on page load
    if (!session && !error) {
      logger.debug('🔄 No immediate Supabase session, waiting briefly for initialization...');
      await delay(200);
      const retryResult = await supabase.auth.getSession();
      session = retryResult.data?.session;
      error = retryResult.error;
      if (session) {
        logger.debug('✅ Found Supabase session after brief wait');
      }
    }

    if (session && !error) {
      logger.debug('✅ User authenticated via Supabase Auth session');
      logger.debug('   User ID:', session.user?.id);
      logger.debug('   Email:', session.user?.email);

      // Sync Supabase session to our storage for consistency
      const userId = session.user?.user_metadata?.user_id || session.user?.id;
      const userType = session.user?.user_metadata?.user_type;

      setSecureAuthToken(session.access_token);
      if (userId) {
        setSecureSessionId(userId);
        setAuthState(true, userId);
      }
      if (userType) {
        setSecureUserType(userType);
      }

      isUserLoggedInState = true;
      return true;
    }
  } catch (err) {
    logger.debug('⚠️ Supabase session check failed:', err.message);
    // Continue to check legacy auth
  }

  // Check auth state (not tokens directly) - legacy Bubble auth
  const authState = getAuthState();

  if (authState) {
    // Verify we actually have tokens
    const hasTokens = await hasValidTokens();

    if (hasTokens) {
      logger.debug('✅ User authenticated via secure storage (legacy)');
      isUserLoggedInState = true;
      return true;
    }
  }

  logger.debug('❌ User not authenticated');
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
 * Clear authentication data from storage
 * Removes all auth tokens, session IDs, timestamps, user type, and cookies
 */
export function clearAuthData() {
  // Use secure storage clear (handles both secure tokens and state)
  clearAllAuthData();

  isUserLoggedInState = false;
  logger.debug('🗑️ Authentication data cleared (secure storage and cookies)');
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
 *
 * @param {string} token - Authentication token to store
 */
export function setAuthToken(token) {
  setSecureAuthToken(token);
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
 *
 * @param {string} sessionId - Session ID to store
 */
export function setSessionId(sessionId) {
  setSecureSessionId(sessionId);
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
// User Profile Getters (Proxied from secureStorage)
// ============================================================================

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
    logger.warn('User is not logged in, cannot redirect to account profile');
    return false;
  }

  const userId = getSessionId();
  if (!userId) {
    logger.error('No user ID found in session, cannot redirect to account profile');
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
// Bubble Authentication API - Edge Function Proxy
// ============================================================================

/**
 * Login user via Supabase Edge Function (auth-user)
 * Stores token and user_id in localStorage on success
 *
 * ✅ MIGRATED: Now uses Edge Functions instead of direct Bubble API calls
 * API key is stored server-side in Supabase Secrets
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response object with status, token, user_id, or error
 */
export async function loginUser(email, password) {
  logger.debug('🔐 Attempting login via Edge Function for:', email);

  try {
    // CRITICAL: Use direct fetch to bypass Supabase client session handling
    // The Supabase client's functions.invoke can hang indefinitely when there's a stale
    // session because it tries to refresh the token before making requests. Since auth-user
    // has verify_jwt=false, we don't need any auth token. Using direct fetch bypasses this.
    logger.debug('🔄 Using direct fetch to bypass Supabase client session handling...');

    // Clear localStorage directly to avoid signOut() hanging
    try {
      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      if (storageKey && storageKey !== 'sb-undefined-auth-token') {
        localStorage.removeItem(storageKey);
        logger.debug('✅ Cleared auth token from localStorage');
      }
    } catch (clearErr) {
      logger.warn('⚠️ Could not clear localStorage:', clearErr);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    logger.debug('📡 Calling auth-user edge function via direct fetch...');
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}` // Use anon key, not user token
      },
      body: JSON.stringify({
        action: 'login',
        payload: {
          email,
          password
        }
      })
    });

    const data = await response.json();
    logger.debug('📡 Response status:', response.status);
    logger.debug('📡 Response data:', data);

    // Handle HTTP errors
    if (!response.ok) {
      logger.error('❌ Edge Function HTTP error:', response.status);
      const errorMessage = data?.error || `HTTP ${response.status}: Failed to authenticate`;
      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.success) {
      logger.error('❌ Login failed:', data.error);
      return {
        success: false,
        error: data.error || 'Login failed. Please try again.'
      };
    }

    // Extract Supabase session data (login now returns same format as signup)
    const {
      access_token,
      refresh_token,
      expires_in,
      user_id,
      host_account_id,
      guest_account_id,
      supabase_user_id,
      user_type
    } = data.data;

    // Set Supabase session using the client
    // This stores the session in localStorage and enables authenticated requests
    if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) {
        logger.error('❌ Failed to set Supabase session:', sessionError.message);
        // Continue anyway - tokens are still valid, just not in client state
      } else {
        logger.debug('✅ Supabase session set successfully');
      }

      // CRITICAL: Verify the session is actually persisted before proceeding
      // This fixes a race condition where the page can reload before localStorage is written
      let verifyAttempts = 0;
      const maxVerifyAttempts = 5;
      while (verifyAttempts < maxVerifyAttempts) {
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        if (verifiedSession && verifiedSession.access_token === access_token) {
          logger.debug('✅ Session verified and persisted');
          break;
        }
        verifyAttempts++;
        logger.debug(`⏳ Waiting for session to persist (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
        await delay(100);
      }

      if (verifyAttempts >= maxVerifyAttempts) {
        logger.warn('⚠️ Session may not be fully persisted, but continuing...');
      }
    }

    // Store access_token as auth token for backward compatibility
    setAuthToken(access_token);
    setSessionId(user_id);

    // Set auth state with user ID (public, non-sensitive)
    setAuthState(true, user_id);

    // Store user type
    if (user_type) {
      setUserType(user_type);
    }

    // Update login state
    isUserLoggedInState = true;

    logger.debug('✅ Login successful (Supabase Auth)');
    logger.debug('   User ID (_id):', user_id);
    logger.debug('   Supabase Auth ID:', supabase_user_id);
    logger.debug('   User Type:', user_type);
    logger.debug('   Session expires in:', expires_in, 'seconds');

    // Store Supabase user ID for reference
    if (supabase_user_id) {
      localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);
    }

    return {
      success: true,
      user_id: user_id,
      host_account_id: host_account_id,
      guest_account_id: guest_account_id,
      supabase_user_id: supabase_user_id,
      user_type: user_type,
      expires_in: expires_in
    };

  } catch (error) {
    logger.error('❌ Login error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Sign up new user via Supabase Edge Function (auth-user)
 * Uses Supabase Auth natively - stores session tokens for authentication
 * Automatically logs in the user after successful signup
 *
 * ✅ MIGRATED TO SUPABASE AUTH: No longer uses Bubble for signup
 * Creates user in Supabase Auth + public.user (account_host deprecated)
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} retype - Password confirmation
 * @param {Object} additionalData - Optional additional signup data
 * @param {string} additionalData.firstName - User's first name
 * @param {string} additionalData.lastName - User's last name
 * @param {string} additionalData.userType - 'Host' or 'Guest'
 * @param {string} additionalData.birthDate - ISO date string (YYYY-MM-DD)
 * @param {string} additionalData.phoneNumber - User's phone number
 * @returns {Promise<Object>} Response object with status, user_id, or error
 */
export async function signupUser(email, password, retype, additionalData = null) {
  logger.debug('📝 Attempting signup via Supabase Auth for:', email);

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

  // Build payload with optional additional data
  const payload = {
    email,
    password,
    retype
  };

  // Add additional signup data if provided
  if (additionalData) {
    payload.additionalData = additionalData;
    logger.debug('📝 Additional signup data:', additionalData);
  }

  try {
    // CRITICAL: Use direct fetch to bypass Supabase client session handling
    // The Supabase client's functions.invoke can hang indefinitely when there's a stale
    // session because it tries to refresh the token before making requests. Since auth-user
    // has verify_jwt=false, we don't need any auth token. Using direct fetch bypasses this.
    logger.debug('🔄 Using direct fetch to bypass Supabase client session handling...');

    // Clear localStorage directly to avoid signOut() hanging
    try {
      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      if (storageKey && storageKey !== 'sb-undefined-auth-token') {
        localStorage.removeItem(storageKey);
        logger.debug('✅ Cleared auth token from localStorage');
      }
    } catch (clearErr) {
      logger.warn('⚠️ Could not clear localStorage:', clearErr);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    logger.debug('📡 Calling auth-user edge function via direct fetch...');
    const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}` // Use anon key, not user token
      },
      body: JSON.stringify({
        action: 'signup',
        payload
      })
    });

    const data = await response.json();
    logger.debug('📡 Response status:', response.status);
    logger.debug('📡 Response data:', data);

    // Handle HTTP errors
    if (!response.ok) {
      logger.error('❌ Edge Function HTTP error:', response.status);
      const errorMessage = data?.error || `HTTP ${response.status}: Failed to create account`;
      return {
        success: false,
        error: errorMessage
      };
    }

    // Handle error in response body
    if (!data.success) {
      logger.error('❌ Signup failed:', data.error);
      return {
        success: false,
        error: data.error || 'Signup failed. Please try again.'
      };
    }

    logger.debug('✅ Edge Function returned successfully');

    // Extract Supabase session data
    const {
      access_token,
      refresh_token,
      expires_in,
      user_id,
      host_account_id,
      guest_account_id,
      supabase_user_id,
      user_type
    } = data.data;

    logger.debug('📋 Extracted session data:');
    logger.debug('   access_token:', access_token ? `${access_token.substring(0, 20)}...` : 'MISSING');
    logger.debug('   refresh_token:', refresh_token ? `${refresh_token.substring(0, 20)}...` : 'MISSING');
    logger.debug('   user_id:', user_id);
    logger.debug('   user_type:', user_type);

    // Set Supabase session using the client
    // This stores the session in localStorage and enables authenticated requests
    logger.debug('🔐 About to call setSession...');
    let sessionError = null;
    try {
      const result = await supabase.auth.setSession({
        access_token,
        refresh_token
      });
      sessionError = result.error;
      logger.debug('🔐 setSession completed, error:', sessionError);
    } catch (setSessionErr) {
      logger.error('🔐 setSession threw an exception:', setSessionErr);
      sessionError = setSessionErr;
    }

    if (sessionError) {
      logger.error('❌ Failed to set Supabase session:', sessionError.message);
      // Continue anyway - tokens are still valid, just not in client state
    } else {
      logger.debug('✅ Supabase session set successfully');
    }

    // CRITICAL: Verify the session is actually persisted before proceeding
    // This fixes a race condition where the page can reload before localStorage is written
    let verifyAttempts = 0;
    const maxVerifyAttempts = 5;
    while (verifyAttempts < maxVerifyAttempts) {
      const { data: { session: verifiedSession } } = await supabase.auth.getSession();
      if (verifiedSession && verifiedSession.access_token === access_token) {
        logger.debug('✅ Session verified and persisted');
        break;
      }
      verifyAttempts++;
      logger.debug(`⏳ Waiting for session to persist (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
      await delay(100);
    }

    if (verifyAttempts >= maxVerifyAttempts) {
      logger.warn('⚠️ Session may not be fully persisted, but continuing...');
    }

    // Store access_token as auth token for backward compatibility with existing code
    setAuthToken(access_token);
    setSessionId(user_id);

    // Set auth state with user ID (public, non-sensitive)
    setAuthState(true, user_id);

    // Store user type
    if (user_type) {
      setUserType(user_type);
    }

    // Update login state
    isUserLoggedInState = true;

    logger.debug('✅ Signup successful (Supabase Auth)');
    logger.debug('   User ID (_id):', user_id);
    logger.debug('   Supabase Auth ID:', supabase_user_id);
    logger.debug('   Host Account ID:', host_account_id);
    logger.debug('   Guest Account ID:', guest_account_id);
    logger.debug('   User Type:', user_type);
    logger.debug('   Session expires in:', expires_in, 'seconds');

    // Store Supabase user ID for reference
    if (supabase_user_id) {
      localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);
    }

    return {
      success: true,
      user_id: user_id,
      host_account_id: host_account_id,
      guest_account_id: guest_account_id,
      supabase_user_id: supabase_user_id,
      user_type: user_type,
      expires_in: expires_in
    };

  } catch (error) {
    logger.error('❌ Signup error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Validate token via Supabase Edge Function (auth-user) and fetch user data
 * Two-step process:
 * 1. Validate token via Edge Function (validates with Bubble + fetches from Supabase)
 * 2. Cache user type locally
 *
 * ✅ MIGRATED: Now uses Edge Functions instead of direct Bubble API calls
 * API key is stored server-side in Supabase Secrets
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.clearOnFailure - If true, clears auth data when validation fails. Default: true.
 *                                           Set to false when calling immediately after login/signup to preserve
 *                                           the fresh session even if user profile fetch fails.
 * @returns {Promise<Object|null>} User data object with firstName, fullName, email, profilePhoto, userType, etc. or null if invalid
 */
export async function validateTokenAndFetchUser({ clearOnFailure = true } = {}) {
  let token = getAuthToken();
  let userId = getSessionId();

  // If no legacy token/userId, check for Supabase Auth session and sync it
  if (!token || !userId) {
    logger.debug('[Auth] No legacy token found, checking for Supabase Auth session...');

    try {
      let { data: { session }, error } = await supabase.auth.getSession();

      // CRITICAL: Supabase client may not have loaded session from localStorage yet
      // Wait briefly for initialization if no session found
      if (!session && !error) {
        logger.debug('[Auth] 🔄 No immediate session, waiting briefly for Supabase initialization...');
        await delay(200);
        const retryResult = await supabase.auth.getSession();
        session = retryResult.data?.session;
        error = retryResult.error;
        if (session) {
          logger.debug('[Auth] ✅ Found Supabase session after brief wait');
        }
      }

      if (session && !error) {
        logger.debug('[Auth] ✅ Found Supabase Auth session, syncing to secure storage');
        token = session.access_token;
        userId = session.user?.user_metadata?.user_id || session.user?.id;

        // Sync to secure storage for consistency
        setSecureAuthToken(token);
        if (userId) {
          setSecureSessionId(userId);
          setAuthState(true, userId);
        }
        const userType = session.user?.user_metadata?.user_type;
        if (userType) {
          setSecureUserType(userType);
        }
      }
    } catch (err) {
      logger.debug('[Auth] Error checking Supabase session:', err.message);
    }
  }

  if (!token || !userId) {
    logger.debug('[Auth] No token or user ID found - user not logged in');
    return null;
  }

  logger.debug('🔍 Validating token and fetching user data via Edge Function...');

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'validate',
        payload: {
          token,
          user_id: userId
        }
      }
    });

    if (error) {
      logger.error('❌ Edge Function error:', error);
      logger.error('   Error context:', error.context);

      // Extract detailed error for logging
      // In newer Supabase JS versions, error.context is the Response object
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          logger.error('   Error body from Response:', errorBody);
          if (errorBody?.error) {
            logger.error('   Detailed error from response:', errorBody.error);
          }
        } catch (parseErr) {
          // Silent - just for logging
        }
      } else if (error.context?.body) {
        // Fallback for older Supabase JS versions
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            logger.error('   Detailed error from response:', errorBody.error);
          }
        } catch (parseErr) {
          // Silent - just for logging
        }
      }

      // Only clear auth data if clearOnFailure is true
      // This allows callers to preserve fresh sessions even when validation fails
      if (clearOnFailure) {
        clearAuthData();
      }
      isUserLoggedInState = false;
      return null;
    }

    if (!data.success) {
      logger.debug('❌ Token validation failed');
      logger.debug('   Reason:', data.error || 'Unknown');
      // Only clear auth data if clearOnFailure is true
      if (clearOnFailure) {
        logger.debug('   Clearing auth data...');
        clearAuthData();
      } else {
        logger.debug('   Preserving session (clearOnFailure=false)');
      }
      isUserLoggedInState = false;
      return null;
    }

    // Extract user data from Edge Function response
    const userData = data.data;

    // Cache user type if provided
    let userType = getUserType();
    if (!userType || userType === '') {
      userType = userData.userType || null;
      if (userType) {
        setUserType(userType);
        logger.debug('✅ User type fetched and cached:', userType);
      }
    } else {
      logger.debug('✅ User type loaded from cache:', userType);
    }

    const userDataObject = {
      userId: userData.userId,
      firstName: userData.firstName || null,
      fullName: userData.fullName || null,
      email: userData.email || null,
      profilePhoto: userData.profilePhoto || null,
      userType: userType,
      // Host account ID for fetching host-specific data (listings, etc.)
      // Note: After migration, user._id is used directly as host reference
      accountHostId: userData.accountHostId || userData._id || null,
      // User profile fields for proposal prefilling
      aboutMe: userData.aboutMe || null,
      needForSpace: userData.needForSpace || null,
      specialNeeds: userData.specialNeeds || null,
      // Proposal count for determining first proposal flow
      proposalCount: userData.proposalCount ?? 0,
      // Rental application submission status for hiding CTA in success modal
      hasSubmittedRentalApp: userData.hasSubmittedRentalApp ?? false,
      // Usability testing flag - determines who sees mobile testing popup
      isUsabilityTester: userData.isUsabilityTester ?? false,
      // Phone number for SMS magic link pre-fill
      phoneNumber: userData.phoneNumber || null
    };

    // Cache firstName and avatarUrl for optimistic UI on page load
    if (userDataObject.firstName) {
      setSecureFirstName(userDataObject.firstName);
    }
    if (userDataObject.profilePhoto) {
      setSecureAvatarUrl(userDataObject.profilePhoto);
    }

    logger.debug('✅ User data validated:', userDataObject.firstName, '- Type:', userDataObject.userType);
    logger.debug('📊 User proposalCount from Edge Function:', userData.proposalCount, '→ stored as:', userDataObject.proposalCount);
    isUserLoggedInState = true;

    return userDataObject;

  } catch (error) {
    logger.error('❌ Token validation error:', error);
    // Only clear auth data if clearOnFailure is true
    if (clearOnFailure) {
      clearAuthData();
    }
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
    '/host-proposals',
    '/account-profile',
    '/host-dashboard',
    '/self-listing',
    '/listing-dashboard',
    '/host-overview',
    '/favorite-listings',
    '/rental-application',
    '/preview-split-lease'
  ];

  // Normalize path by removing .html extension for consistent matching
  const currentPath = window.location.pathname.replace(/\.html$/, '');

  // Check if current path matches any protected path exactly or starts with it
  return protectedPaths.some(path =>
    currentPath === path || currentPath.startsWith(path + '/')
  );
}

/**
 * Logout user via Supabase Edge Function (auth-user)
 * Calls logout endpoint with stored Bearer token
 * Clears all authentication data from localStorage
 *
 * ✅ MIGRATED: Now uses Edge Functions instead of direct Bubble API calls
 * API key is stored server-side in Supabase Secrets
 *
 * @returns {Promise<Object>} Response object with success status or error
 */
export async function logoutUser() {
  const token = getAuthToken();

  if (!token) {
    logger.debug('❌ No token found for logout');
    // Clear any remaining auth data even if no token
    clearAuthData();
    return {
      success: true,
      message: 'No active session to logout'
    };
  }

  logger.debug('🔓 Attempting logout via Edge Function...');

  // Sign out from Supabase Auth client explicitly
  // This ensures the client-side session is cleared from localStorage
  try {
    await supabase.auth.signOut();
    logger.debug('✅ Signed out from Supabase Auth client');
  } catch (err) {
    logger.warn('⚠️ Error signing out from Supabase Auth client:', err);
    // Continue with legacy logout...
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'logout',
        payload: {
          token
        }
      }
    });

    // Clear auth data regardless of API response
    // This ensures clean logout even if API call fails
    clearAuthData();

    if (error || !data.success) {
      logger.debug('⚠️ Logout API returned error, but local data cleared');
      return {
        success: true,
        message: 'Logged out locally'
      };
    }

    logger.debug('✅ Logout successful');
    return {
      success: true,
      message: data.data.message || 'Logout successful'
    };

  } catch (error) {
    logger.error('❌ Logout error:', error);
    // Auth data already cleared above
    clearAuthData();
    return {
      success: true,
      message: 'Logged out locally (network error)'
    };
  }
}

// ============================================================================
// URL Auth Error Detection (Magic Link / OTP Errors)
// ============================================================================

/**
 * Check URL hash for Supabase auth errors
 * Returns error info if present, null otherwise
 *
 * When Supabase redirects after a failed magic link (expired OTP, already used, etc.),
 * it includes error params in the URL hash:
 * #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
 *
 * @returns {Object|null} Error object with error, errorCode, errorDescription, or null if no error
 */
export function checkUrlForAuthError() {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const error = params.get('error');
  const errorCode = params.get('error_code');
  const errorDescription = params.get('error_description');

  if (error || errorCode) {
    return {
      error,
      errorCode,
      errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : null
    };
  }

  return null;
}

/**
 * Clear auth error params from URL hash
 * Call this after handling the error to prevent re-processing
 * Uses replaceState to not add to browser history
 */
export function clearAuthErrorFromUrl() {
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// ============================================================================
// Password Reset Functions
// ============================================================================

/**
 * Request password reset email via Edge Function (auth-user)
 * Always returns success to prevent email enumeration
 *
 * Uses Edge Functions - API keys stored server-side
 *
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Response object with success status and message
 */
export async function requestPasswordReset(email) {
  logger.debug('🔐 Requesting password reset for:', email);

  if (!email) {
    return {
      success: false,
      error: 'Email is required.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'request_password_reset',
        payload: {
          email,
          redirectTo: `${window.location.origin}/reset-password`
        }
      }
    });

    if (error) {
      logger.error('❌ Password reset request failed:', error);
      // Don't expose error details - always show generic message
      return {
        success: true, // Return success even on error to prevent email enumeration
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    }

    logger.debug('✅ Password reset request processed');
    return {
      success: true,
      message: data?.data?.message || 'If an account with that email exists, a password reset link has been sent.'
    };

  } catch (error) {
    logger.error('❌ Password reset error:', error);
    return {
      success: true, // Return success even on error to prevent email enumeration
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
}

/**
 * Update password after clicking reset link
 * Must be called when user has active session from PASSWORD_RECOVERY event
 *
 * After successful password update, the user remains logged in with their
 * existing session synced to secure storage.
 *
 * Uses Edge Functions - API keys stored server-side
 *
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Response object with success status
 */
export async function updatePassword(newPassword) {
  logger.debug('🔐 Updating password...');

  if (!newPassword) {
    return {
      success: false,
      error: 'New password is required.'
    };
  }

  if (newPassword.length < 4) {
    return {
      success: false,
      error: 'Password must be at least 4 characters long.'
    };
  }

  // Get current session (from PASSWORD_RECOVERY event)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    logger.error('❌ No active session for password update');
    return {
      success: false,
      error: 'Invalid or expired reset link. Please request a new password reset.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'update_password',
        payload: {
          password: newPassword,
          access_token: session.access_token
        }
      }
    });

    if (error) {
      logger.error('❌ Password update failed:', error);

      // Extract detailed error from response body if available
      let errorMessage = 'Failed to update password. Please try again.';

      // In newer Supabase JS versions, error.context is the Response object
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          logger.error('   Error body from Response:', errorBody);
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseErr) {
          // Silent - use default message
        }
      } else if (error.context?.body) {
        // Fallback for older Supabase JS versions
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseErr) {
          // Silent - use default message
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.success && data.error) {
      return {
        success: false,
        error: data.error
      };
    }

    logger.debug('✅ Password updated successfully');

    // Keep user logged in by syncing the Supabase session to secure storage
    // The user has proven account ownership by accessing their email
    const userId = session.user?.user_metadata?.user_id || session.user?.id;
    const userType = session.user?.user_metadata?.user_type;

    // Store session tokens
    setSecureAuthToken(session.access_token);
    if (userId) {
      setSecureSessionId(userId);
      setAuthState(true, userId);
    }
    if (userType) {
      setSecureUserType(userType);
    }

    // Update login state
    isUserLoggedInState = true;

    logger.debug('✅ User session preserved after password update');
    logger.debug('   User ID:', userId);
    logger.debug('   User Type:', userType);

    return {
      success: true,
      message: data?.data?.message || 'Password updated successfully.'
    };

  } catch (error) {
    logger.error('❌ Password update error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}

// ============================================================================
// LinkedIn OAuth Functions
// ============================================================================

/**
 * Initiate LinkedIn OAuth signup flow
 * Stores user type in localStorage before redirecting to LinkedIn
 *
 * @param {string} userType - 'Host' or 'Guest'
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateLinkedInOAuth(userType) {
  logger.debug('[Auth] Initiating LinkedIn OAuth with userType:', userType);

  // Store user type before redirect
  setLinkedInOAuthUserType(userType);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/account-profile`,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearLinkedInOAuthUserType();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearLinkedInOAuthUserType();
    return { success: false, error: err.message };
  }
}

/**
 * Handle LinkedIn OAuth callback after redirect
 * Creates user record if new user, or links accounts if existing
 *
 * @returns {Promise<Object>} Result with user data or error
 */
export async function handleLinkedInOAuthCallback() {
  logger.debug('[Auth] Handling LinkedIn OAuth callback');

  // Get the session from OAuth callback
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    clearLinkedInOAuthUserType();
    return {
      success: false,
      error: sessionError?.message || 'No session found after OAuth'
    };
  }

  // Check if this is a fresh OAuth session (from LinkedIn)
  const user = session.user;
  const isLinkedInProvider =
    user?.app_metadata?.provider === 'linkedin_oidc' ||
    user?.app_metadata?.providers?.includes('linkedin_oidc');

  if (!isLinkedInProvider) {
    return { success: false, error: 'Not a LinkedIn OAuth session' };
  }

  // Retrieve stored user type
  const userType = getLinkedInOAuthUserType() || 'Guest';

  // Extract LinkedIn data from user_metadata
  const linkedInData = {
    email: user.email,
    firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
    profilePhoto: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
    supabaseUserId: user.id,
  };

  logger.debug('[Auth] LinkedIn data:', linkedInData);
  logger.debug('[Auth] Stored userType:', userType);

  // Call Edge Function to create/link user record
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'oauth_signup',
        payload: {
          ...linkedInData,
          userType,
          provider: 'linkedin_oidc',
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      clearLinkedInOAuthUserType();
      return {
        success: false,
        error: data.error || 'Failed to create user record',
        isDuplicate: data.isDuplicate || false,
        existingEmail: data.existingEmail || null,
      };
    }

    // Clear OAuth storage keys
    clearLinkedInOAuthUserType();

    // Store session data
    setAuthToken(session.access_token);
    setSessionId(data.data.user_id);
    setAuthState(true, data.data.user_id);
    if (userType) {
      setUserType(userType);
    }

    return {
      success: true,
      data: data.data,
      isNewUser: data.data.isNewUser,
    };

  } catch (err) {
    clearLinkedInOAuthUserType();
    return { success: false, error: err.message };
  }
}

/**
 * Initiate LinkedIn OAuth login flow
 * Sets login flow flag and redirects to current page after OAuth
 *
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateLinkedInOAuthLogin() {
  logger.debug('[Auth] Initiating LinkedIn OAuth Login');

  // Clear any existing signup flow flags to prevent conflicts
  clearLinkedInOAuthUserType();

  // Set login flow flag before redirect
  setLinkedInOAuthLoginFlow(true);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        // Stay on current page after OAuth (no redirect to profile)
        redirectTo: window.location.href,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearLinkedInOAuthLoginFlow();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearLinkedInOAuthLoginFlow();
    return { success: false, error: err.message };
  }
}

/**
 * Handle LinkedIn OAuth login callback
 * Verifies user exists in database, returns session data or error
 *
 * @returns {Promise<Object>} Result with user data or error (userNotFound: true if account doesn't exist)
 */
export async function handleLinkedInOAuthLoginCallback() {
  logger.debug('[Auth] Handling LinkedIn OAuth Login callback');

  // Verify this is a login flow
  if (!getLinkedInOAuthLoginFlow()) {
    logger.debug('[Auth] Not a login flow callback, skipping');
    return { success: false, error: 'Not a login flow' };
  }

  try {
    // Get the session from OAuth callback
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      clearLinkedInOAuthLoginFlow();
      return {
        success: false,
        error: sessionError?.message || 'No session found after OAuth'
      };
    }

    // Check if this is a fresh OAuth session (from LinkedIn)
    const user = session.user;
    const isLinkedInProvider =
      user?.app_metadata?.provider === 'linkedin_oidc' ||
      user?.app_metadata?.providers?.includes('linkedin_oidc');

    if (!isLinkedInProvider) {
      clearLinkedInOAuthLoginFlow();
      return { success: false, error: 'Not a LinkedIn OAuth session' };
    }

    // Extract LinkedIn data
    const email = user.email;
    const supabaseUserId = user.id;

    logger.debug('[Auth] LinkedIn OAuth login data:', { email, supabaseUserId });

    // Call Edge Function to verify user exists
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'oauth_login',
        payload: {
          email,
          supabaseUserId,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      })
    });

    const data = await response.json();

    // Always clear the login flow flag
    clearLinkedInOAuthLoginFlow();

    if (!response.ok || !data.success) {
      // Check if user was not found
      if (data.data?.userNotFound) {
        logger.debug('[Auth] User not found for OAuth login:', email);
        return {
          success: false,
          userNotFound: true,
          email: email,
          error: 'No account found with this email'
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to login'
      };
    }

    // Store session data
    const { user_id, user_type, supabase_user_id, access_token, refresh_token } = data.data;

    setAuthToken(session.access_token);
    setSessionId(user_id);
    setAuthState(true, user_id);
    if (user_type) {
      setUserType(user_type);
    }

    // Store Supabase user ID for reference
    if (supabase_user_id) {
      localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);
    }

    logger.debug('[Auth] LinkedIn OAuth login successful');
    return {
      success: true,
      data: data.data
    };

  } catch (err) {
    clearLinkedInOAuthLoginFlow();
    logger.error('[Auth] LinkedIn OAuth login callback error:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Google OAuth Functions
// ============================================================================

/**
 * Initiate Google OAuth signup flow
 * Stores user type in localStorage before redirecting to Google
 *
 * @param {string} userType - 'Host' or 'Guest'
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateGoogleOAuth(userType) {
  logger.debug('[Auth] Initiating Google OAuth with userType:', userType);

  // Store user type before redirect
  setGoogleOAuthUserType(userType);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/account-profile`,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearGoogleOAuthUserType();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearGoogleOAuthUserType();
    return { success: false, error: err.message };
  }
}

/**
 * Handle Google OAuth callback after redirect
 * Creates user record if new user, or links accounts if existing
 *
 * @returns {Promise<Object>} Result with user data or error
 */
export async function handleGoogleOAuthCallback() {
  logger.debug('[Auth] Handling Google OAuth callback');

  // Get the session from OAuth callback
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    clearGoogleOAuthUserType();
    return {
      success: false,
      error: sessionError?.message || 'No session found after OAuth'
    };
  }

  // Check if this is a fresh OAuth session (from Google)
  const user = session.user;
  const isGoogleProvider =
    user?.app_metadata?.provider === 'google' ||
    user?.app_metadata?.providers?.includes('google');

  if (!isGoogleProvider) {
    return { success: false, error: 'Not a Google OAuth session' };
  }

  // Retrieve stored user type
  const userType = getGoogleOAuthUserType() || 'Guest';

  // Extract Google data from user_metadata
  const googleData = {
    email: user.email,
    firstName: user.user_metadata?.given_name || user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.family_name || user.user_metadata?.last_name || '',
    profilePhoto: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
    supabaseUserId: user.id,
  };

  logger.debug('[Auth] Google data:', googleData);
  logger.debug('[Auth] Stored userType:', userType);

  // Call Edge Function to create/link user record
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'oauth_signup',
        payload: {
          ...googleData,
          userType,
          provider: 'google',
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      clearGoogleOAuthUserType();
      return {
        success: false,
        error: data.error || 'Failed to create user record',
        isDuplicate: data.isDuplicate || false,
        existingEmail: data.existingEmail || null,
      };
    }

    // Clear OAuth storage keys
    clearGoogleOAuthUserType();

    // DEBUG: Log what we received from Edge Function
    logger.debug('[Auth] Edge Function response:', JSON.stringify(data.data, null, 2));
    logger.debug('[Auth] user_id from Edge Function:', data.data.user_id);
    logger.debug('[Auth] supabase_user_id:', data.data.supabase_user_id);
    logger.debug('[Auth] Supabase session user.id:', session.user.id);

    // Store session data
    setAuthToken(session.access_token);
    setSessionId(data.data.user_id);
    setAuthState(true, data.data.user_id);
    if (userType) {
      setUserType(userType);
    }

    return {
      success: true,
      data: data.data,
      isNewUser: data.data.isNewUser,
    };

  } catch (err) {
    clearGoogleOAuthUserType();
    return { success: false, error: err.message };
  }
}

/**
 * Initiate Google OAuth login flow
 * Sets login flow flag and redirects to current page after OAuth
 *
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateGoogleOAuthLogin() {
  logger.debug('[Auth] Initiating Google OAuth Login');

  // Clear any existing signup flow flags to prevent conflicts
  clearGoogleOAuthUserType();

  // Set login flow flag before redirect
  setGoogleOAuthLoginFlow(true);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Stay on current page after OAuth (no redirect to profile)
        redirectTo: window.location.href,
        scopes: 'openid profile email',
      }
    });

    if (error) {
      clearGoogleOAuthLoginFlow();
      return { success: false, error: error.message };
    }

    // OAuth redirect will happen automatically
    return { success: true, data };
  } catch (err) {
    clearGoogleOAuthLoginFlow();
    return { success: false, error: err.message };
  }
}

/**
 * Handle Google OAuth login callback
 * Verifies user exists in database, returns session data or error
 *
 * @returns {Promise<Object>} Result with user data or error (userNotFound: true if account doesn't exist)
 */
export async function handleGoogleOAuthLoginCallback() {
  logger.debug('[Auth] Handling Google OAuth Login callback');

  // Verify this is a login flow
  if (!getGoogleOAuthLoginFlow()) {
    logger.debug('[Auth] Not a login flow callback, skipping');
    return { success: false, error: 'Not a login flow' };
  }

  try {
    // Get the session from OAuth callback
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      clearGoogleOAuthLoginFlow();
      return {
        success: false,
        error: sessionError?.message || 'No session found after OAuth'
      };
    }

    // Check if this is a fresh OAuth session (from Google)
    const user = session.user;
    const isGoogleProvider =
      user?.app_metadata?.provider === 'google' ||
      user?.app_metadata?.providers?.includes('google');

    if (!isGoogleProvider) {
      clearGoogleOAuthLoginFlow();
      return { success: false, error: 'Not a Google OAuth session' };
    }

    // Extract Google data
    const email = user.email;
    const supabaseUserId = user.id;

    logger.debug('[Auth] Google OAuth login data:', { email, supabaseUserId });

    // Call Edge Function to verify user exists
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'oauth_login',
        payload: {
          email,
          supabaseUserId,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      })
    });

    const data = await response.json();

    // Always clear the login flow flag
    clearGoogleOAuthLoginFlow();

    if (!response.ok || !data.success) {
      // Check if user was not found
      if (data.data?.userNotFound) {
        logger.debug('[Auth] User not found for OAuth login:', email);
        return {
          success: false,
          userNotFound: true,
          email: email,
          error: 'No account found with this email'
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to login'
      };
    }

    // Store session data
    const { user_id, user_type, supabase_user_id, access_token, refresh_token } = data.data;

    setAuthToken(session.access_token);
    setSessionId(user_id);
    setAuthState(true, user_id);
    if (user_type) {
      setUserType(user_type);
    }

    // Store Supabase user ID for reference
    if (supabase_user_id) {
      localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);
    }

    logger.debug('[Auth] Google OAuth login successful');
    return {
      success: true,
      data: data.data
    };

  } catch (err) {
    clearGoogleOAuthLoginFlow();
    logger.error('[Auth] Google OAuth login callback error:', err);
    return { success: false, error: err.message };
  }
}
