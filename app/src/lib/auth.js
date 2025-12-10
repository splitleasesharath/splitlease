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
  clearAllAuthData,
  hasValidTokens,
  migrateFromLegacyStorage,
  getFirstName as getSecureFirstName,
  getAvatarUrl as getSecureAvatarUrl
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

  // Check Supabase Auth session (for native Supabase signups)
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session && !error) {
      console.log('✅ User authenticated via Supabase Auth session');
      console.log('   User ID:', session.user?.id);
      console.log('   Email:', session.user?.email);

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
    console.log('⚠️ Supabase session check failed:', err.message);
    // Continue to check legacy auth
  }

  // Check auth state (not tokens directly) - legacy Bubble auth
  const authState = getAuthState();

  if (authState) {
    // Verify we actually have tokens
    const hasTokens = await hasValidTokens();

    if (hasTokens) {
      console.log('✅ User authenticated via secure storage (legacy)');
      isUserLoggedInState = true;
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
  console.log('🔐 Attempting login via Edge Function for:', email);

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'login',
        payload: {
          email,
          password
        }
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('   Error context:', error.context);

      // Extract detailed error from response body if available
      // Supabase wraps non-2xx responses in a generic error, but the body may contain details
      let errorMessage = 'Failed to authenticate. Please try again.';

      if (error.context?.body) {
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            console.error('   Detailed error from response:', errorMessage);
          }
        } catch (parseErr) {
          console.error('   Could not parse error body:', parseErr);
        }
      }

      // Also check if data was returned despite the error (some edge cases)
      if (data?.error) {
        errorMessage = data.error;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.success) {
      console.error('❌ Login failed:', data.error);
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
        console.error('❌ Failed to set Supabase session:', sessionError.message);
        // Continue anyway - tokens are still valid, just not in client state
      } else {
        console.log('✅ Supabase session set successfully');
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

    console.log('✅ Login successful (Supabase Auth)');
    console.log('   User ID (_id):', user_id);
    console.log('   Supabase Auth ID:', supabase_user_id);
    console.log('   User Type:', user_type);
    console.log('   Session expires in:', expires_in, 'seconds');

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
    console.error('❌ Login error:', error);
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
 * Creates user in Supabase Auth + public.user + account_host + account_guest
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
  console.log('📝 Attempting signup via Supabase Auth for:', email);

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
    console.log('📝 Additional signup data:', additionalData);
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'signup',
        payload
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('   Error context:', error.context);

      // Extract detailed error from response body if available
      let errorMessage = 'Failed to create account. Please try again.';

      if (error.context?.body) {
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            errorMessage = errorBody.error;
            console.error('   Detailed error from response:', errorMessage);
          }
        } catch (parseErr) {
          console.error('   Could not parse error body:', parseErr);
        }
      }

      if (data?.error) {
        errorMessage = data.error;
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.success) {
      console.error('❌ Signup failed:', data.error);
      return {
        success: false,
        error: data.error || 'Signup failed. Please try again.'
      };
    }

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

    // Set Supabase session using the client
    // This stores the session in localStorage and enables authenticated requests
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      console.error('❌ Failed to set Supabase session:', sessionError.message);
      // Continue anyway - tokens are still valid, just not in client state
    } else {
      console.log('✅ Supabase session set successfully');
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

    console.log('✅ Signup successful (Supabase Auth)');
    console.log('   User ID (_id):', user_id);
    console.log('   Supabase Auth ID:', supabase_user_id);
    console.log('   Host Account ID:', host_account_id);
    console.log('   Guest Account ID:', guest_account_id);
    console.log('   User Type:', user_type);
    console.log('   Session expires in:', expires_in, 'seconds');

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
    console.error('❌ Signup error:', error);
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
 * @returns {Promise<Object|null>} User data object with firstName, fullName, email, profilePhoto, userType, etc. or null if invalid
 */
export async function validateTokenAndFetchUser() {
  let token = getAuthToken();
  let userId = getSessionId();

  // If no legacy token/userId, check for Supabase Auth session and sync it
  if (!token || !userId) {
    console.log('[Auth] No legacy token found, checking for Supabase Auth session...');

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session && !error) {
        console.log('[Auth] ✅ Found Supabase Auth session, syncing to secure storage');
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
      console.log('[Auth] Error checking Supabase session:', err.message);
    }
  }

  if (!token || !userId) {
    console.log('[Auth] No token or user ID found - user not logged in');
    return null;
  }

  console.log('🔍 Validating token and fetching user data via Edge Function...');

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
      console.error('❌ Edge Function error:', error);
      console.error('   Error context:', error.context);

      // Extract detailed error for logging
      if (error.context?.body) {
        try {
          const errorBody = typeof error.context.body === 'string'
            ? JSON.parse(error.context.body)
            : error.context.body;
          if (errorBody?.error) {
            console.error('   Detailed error from response:', errorBody.error);
          }
        } catch (parseErr) {
          // Silent - just for logging
        }
      }

      clearAuthData();
      isUserLoggedInState = false;
      return null;
    }

    if (!data.success) {
      console.log('❌ Token validation failed - clearing auth data');
      console.log('   Reason:', data.error || 'Unknown');
      clearAuthData();
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
        console.log('✅ User type fetched and cached:', userType);
      }
    } else {
      console.log('✅ User type loaded from cache:', userType);
    }

    const userDataObject = {
      userId: userData.userId,
      firstName: userData.firstName || null,
      fullName: userData.fullName || null,
      email: userData.email || null,
      profilePhoto: userData.profilePhoto || null,
      userType: userType,
      // Host account ID for fetching host-specific data (listings, etc.)
      accountHostId: userData.accountHostId || null,
      // Also include with Bubble field naming for backwards compatibility
      'Account - Host / Landlord': userData.accountHostId || null,
      // User profile fields for proposal prefilling
      aboutMe: userData.aboutMe || null,
      needForSpace: userData.needForSpace || null,
      specialNeeds: userData.specialNeeds || null,
      // Proposal count for determining first proposal flow
      proposalCount: userData.proposalCount ?? 0
    };

    console.log('✅ User data validated:', userDataObject.firstName, '- Type:', userDataObject.userType);
    console.log('📊 User proposalCount from Edge Function:', userData.proposalCount, '→ stored as:', userDataObject.proposalCount);
    isUserLoggedInState = true;

    return userDataObject;

  } catch (error) {
    console.error('❌ Token validation error:', error);
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
    console.log('❌ No token found for logout');
    // Clear any remaining auth data even if no token
    clearAuthData();
    return {
      success: true,
      message: 'No active session to logout'
    };
  }

  console.log('🔓 Attempting logout via Edge Function...');

  // Sign out from Supabase Auth client explicitly
  // This ensures the client-side session is cleared from localStorage
  try {
    await supabase.auth.signOut();
    console.log('✅ Signed out from Supabase Auth client');
  } catch (err) {
    console.warn('⚠️ Error signing out from Supabase Auth client:', err);
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
      console.log('⚠️ Logout API returned error, but local data cleared');
      return {
        success: true,
        message: 'Logged out locally'
      };
    }

    console.log('✅ Logout successful');
    return {
      success: true,
      message: data.data.message || 'Logout successful'
    };

  } catch (error) {
    console.error('❌ Logout error:', error);
    // Auth data already cleared above
    clearAuthData();
    return {
      success: true,
      message: 'Logged out locally (network error)'
    };
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
  console.log('🔐 Requesting password reset for:', email);

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
      console.error('❌ Password reset request failed:', error);
      // Don't expose error details - always show generic message
      return {
        success: true, // Return success even on error to prevent email enumeration
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    }

    console.log('✅ Password reset request processed');
    return {
      success: true,
      message: data?.data?.message || 'If an account with that email exists, a password reset link has been sent.'
    };

  } catch (error) {
    console.error('❌ Password reset error:', error);
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
  console.log('🔐 Updating password...');

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
    console.error('❌ No active session for password update');
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
      console.error('❌ Password update failed:', error);

      // Extract detailed error from response body if available
      let errorMessage = 'Failed to update password. Please try again.';

      if (error.context?.body) {
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

    console.log('✅ Password updated successfully');

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

    console.log('✅ User session preserved after password update');
    console.log('   User ID:', userId);
    console.log('   User Type:', userType);

    return {
      success: true,
      message: data?.data?.message || 'Password updated successfully.'
    };

  } catch (error) {
    console.error('❌ Password update error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}
