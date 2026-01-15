/**
 * Split Lease Authentication - Token Validation
 * Handles token validation, user data fetching, and auth status checking
 */

import { supabase } from '../supabase.js';
import { checkSplitLeaseCookies } from './cookies.js';
import {
  getAuthToken as getSecureAuthToken,
  getSessionId as getSecureSessionId,
  setAuthToken as setSecureAuthToken,
  setSessionId as setSecureSessionId,
  setAuthState,
  getAuthState,
  getUserType as getSecureUserType,
  setUserType as setSecureUserType,
  clearAllAuthData,
  hasValidTokens,
  migrateFromLegacyStorage,
  setFirstName as setSecureFirstName,
  setAvatarUrl as setSecureAvatarUrl,
} from '../secureStorage.js';

// ============================================================================
// Auth State Management
// ============================================================================

let isUserLoggedInState = false;

/**
 * Get current logged-in state
 * @returns {boolean} True if user is logged in
 */
export function getIsUserLoggedIn() {
  return isUserLoggedInState;
}

/**
 * Set logged-in state
 * @param {boolean} state - New logged-in state
 */
export function setIsUserLoggedIn(state) {
  isUserLoggedInState = state;
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
  // CRITICAL: Supabase client may not have loaded session from localStorage yet
  // We need to handle the race condition where getSession() returns null initially
  // but INITIAL_SESSION fires shortly after with a valid session
  try {
    let { data: { session }, error } = await supabase.auth.getSession();

    // If no session on first check, wait briefly for Supabase to initialize
    // This handles the race condition on page load
    if (!session && !error) {
      console.log('🔄 No immediate Supabase session, waiting briefly for initialization...');
      await new Promise(resolve => setTimeout(resolve, 200));
      const retryResult = await supabase.auth.getSession();
      session = retryResult.data?.session;
      error = retryResult.error;
      if (session) {
        console.log('✅ Found Supabase session after brief wait');
      }
    }

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
    console.log('[Auth] No legacy token found, checking for Supabase Auth session...');

    try {
      let { data: { session }, error } = await supabase.auth.getSession();

      // CRITICAL: Supabase client may not have loaded session from localStorage yet
      // Wait briefly for initialization if no session found
      if (!session && !error) {
        console.log('[Auth] 🔄 No immediate session, waiting briefly for Supabase initialization...');
        await new Promise(resolve => setTimeout(resolve, 200));
        const retryResult = await supabase.auth.getSession();
        session = retryResult.data?.session;
        error = retryResult.error;
        if (session) {
          console.log('[Auth] ✅ Found Supabase session after brief wait');
        }
      }

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
      // In newer Supabase JS versions, error.context is the Response object
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          console.error('   Error body from Response:', errorBody);
          if (errorBody?.error) {
            console.error('   Detailed error from response:', errorBody.error);
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
            console.error('   Detailed error from response:', errorBody.error);
          }
        } catch (parseErr) {
          // Silent - just for logging
        }
      }

      // Only clear auth data if clearOnFailure is true
      // This allows callers to preserve fresh sessions even when validation fails
      if (clearOnFailure) {
        clearAllAuthData();
      }
      isUserLoggedInState = false;
      return null;
    }

    if (!data.success) {
      console.log('❌ Token validation failed');
      console.log('   Reason:', data.error || 'Unknown');
      // Only clear auth data if clearOnFailure is true
      if (clearOnFailure) {
        console.log('   Clearing auth data...');
        clearAllAuthData();
      } else {
        console.log('   Preserving session (clearOnFailure=false)');
      }
      isUserLoggedInState = false;
      return null;
    }

    // Extract user data from Edge Function response
    const userData = data.data;

    // Cache user type if provided
    let userType = getSecureUserType();
    if (!userType || userType === '') {
      userType = userData.userType || null;
      if (userType) {
        setSecureUserType(userType);
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
      // Note: After migration, user._id is used directly as host reference
      accountHostId: userData.accountHostId || userData._id || null,
      // User profile fields for proposal prefilling
      aboutMe: userData.aboutMe || null,
      needForSpace: userData.needForSpace || null,
      specialNeeds: userData.specialNeeds || null,
      // Proposal count for determining first proposal flow
      proposalCount: userData.proposalCount ?? 0,
      // Rental application submission status for hiding CTA in success modal
      hasSubmittedRentalApp: userData.hasSubmittedRentalApp ?? false
    };

    // Cache firstName and avatarUrl for optimistic UI on page load
    if (userDataObject.firstName) {
      setSecureFirstName(userDataObject.firstName);
    }
    if (userDataObject.profilePhoto) {
      setSecureAvatarUrl(userDataObject.profilePhoto);
    }

    console.log('✅ User data validated:', userDataObject.firstName, '- Type:', userDataObject.userType);
    console.log('📊 User proposalCount from Edge Function:', userData.proposalCount, '→ stored as:', userDataObject.proposalCount);
    isUserLoggedInState = true;

    return userDataObject;

  } catch (error) {
    console.error('❌ Token validation error:', error);
    // Only clear auth data if clearOnFailure is true
    if (clearOnFailure) {
      clearAllAuthData();
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
