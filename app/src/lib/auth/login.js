/**
 * Split Lease Authentication - Login
 * Handles email/password login and OAuth login flows
 */

import { supabase } from '../supabase.js';
import { SIGNUP_LOGIN_URL, ACCOUNT_PROFILE_URL } from '../constants.js';
import {
  setAuthToken as setSecureAuthToken,
  setSessionId as setSecureSessionId,
  setAuthState,
  setUserType as setSecureUserType,
  setLinkedInOAuthLoginFlow,
  getLinkedInOAuthLoginFlow,
  clearLinkedInOAuthLoginFlow,
  clearLinkedInOAuthUserType,
} from '../secureStorage.js';
import { setIsUserLoggedIn } from './tokenValidation.js';
import { setUserType } from './session.js';
import { getSessionId } from './tokenValidation.js';

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
    // CRITICAL: Use direct fetch to bypass Supabase client session handling
    // The Supabase client's functions.invoke can hang indefinitely when there's a stale
    // session because it tries to refresh the token before making requests. Since auth-user
    // has verify_jwt=false, we don't need any auth token. Using direct fetch bypasses this.
    console.log('🔄 Using direct fetch to bypass Supabase client session handling...');

    // Clear localStorage directly to avoid signOut() hanging
    try {
      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      if (storageKey && storageKey !== 'sb-undefined-auth-token') {
        localStorage.removeItem(storageKey);
        console.log('✅ Cleared auth token from localStorage');
      }
    } catch (clearErr) {
      console.warn('⚠️ Could not clear localStorage:', clearErr);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log('📡 Calling auth-user edge function via direct fetch...');
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
    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', data);

    // Handle HTTP errors
    if (!response.ok) {
      console.error('❌ Edge Function HTTP error:', response.status);
      const errorMessage = data?.error || `HTTP ${response.status}: Failed to authenticate`;
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

      // CRITICAL: Verify the session is actually persisted before proceeding
      // This fixes a race condition where the page can reload before localStorage is written
      let verifyAttempts = 0;
      const maxVerifyAttempts = 5;
      while (verifyAttempts < maxVerifyAttempts) {
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        if (verifiedSession && verifiedSession.access_token === access_token) {
          console.log('✅ Session verified and persisted');
          break;
        }
        verifyAttempts++;
        console.log(`⏳ Waiting for session to persist (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      }

      if (verifyAttempts >= maxVerifyAttempts) {
        console.warn('⚠️ Session may not be fully persisted, but continuing...');
      }
    }

    // Store access_token as auth token for backward compatibility
    setSecureAuthToken(access_token);
    setSecureSessionId(user_id);

    // Set auth state with user ID (public, non-sensitive)
    setAuthState(true, user_id);

    // Store user type
    if (user_type) {
      setUserType(user_type);
    }

    // Update login state
    setIsUserLoggedIn(true);

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
 * @param {boolean} isUserLoggedIn - Whether user is logged in
 * @returns {Promise<boolean>} True if redirect initiated, false if not logged in or no user ID
 */
export async function redirectToAccountProfile(isUserLoggedIn) {
  if (!isUserLoggedIn) {
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
// LinkedIn OAuth Functions
// ============================================================================

/**
 * Initiate LinkedIn OAuth login flow
 * Sets login flow flag and redirects to current page after OAuth
 *
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateLinkedInOAuthLogin() {
  console.log('[Auth] Initiating LinkedIn OAuth Login');

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
  console.log('[Auth] Handling LinkedIn OAuth Login callback');

  // Verify this is a login flow
  if (!getLinkedInOAuthLoginFlow()) {
    console.log('[Auth] Not a login flow callback, skipping');
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
    const isLinkedInProvider = user?.app_metadata?.provider === 'linkedin_oidc';

    if (!isLinkedInProvider) {
      clearLinkedInOAuthLoginFlow();
      return { success: false, error: 'Not a LinkedIn OAuth session' };
    }

    // Extract LinkedIn data
    const email = user.email;
    const supabaseUserId = user.id;

    console.log('[Auth] LinkedIn OAuth login data:', { email, supabaseUserId });

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
        console.log('[Auth] User not found for OAuth login:', email);
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

    setSecureAuthToken(session.access_token);
    setSecureSessionId(user_id);
    setAuthState(true, user_id);
    if (user_type) {
      setUserType(user_type);
    }

    // Store Supabase user ID for reference
    if (supabase_user_id) {
      localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);
    }

    console.log('[Auth] LinkedIn OAuth login successful');
    return {
      success: true,
      data: data.data
    };

  } catch (err) {
    clearLinkedInOAuthLoginFlow();
    console.error('[Auth] LinkedIn OAuth login callback error:', err);
    return { success: false, error: err.message };
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
