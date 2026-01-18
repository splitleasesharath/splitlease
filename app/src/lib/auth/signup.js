/**
 * Split Lease Authentication - Signup
 * Handles user registration and OAuth signup flows
 */

import { supabase } from '../supabase.js';
import {
  setAuthToken as setSecureAuthToken,
  setSessionId as setSecureSessionId,
  setAuthState,
  setLinkedInOAuthUserType,
  getLinkedInOAuthUserType,
  clearLinkedInOAuthUserType,
} from '../secureStorage.js';
import { setIsUserLoggedIn } from './tokenValidation.js';
import { setUserType } from './session.js';

// ============================================================================
// User Signup
// ============================================================================

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
        action: 'signup',
        payload
      })
    });

    const data = await response.json();
    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', data);

    // Handle HTTP errors
    if (!response.ok) {
      console.error('❌ Edge Function HTTP error:', response.status);
      const errorMessage = data?.error || `HTTP ${response.status}: Failed to create account`;
      return {
        success: false,
        error: errorMessage
      };
    }

    // Handle error in response body
    if (!data.success) {
      console.error('❌ Signup failed:', data.error);
      return {
        success: false,
        error: data.error || 'Signup failed. Please try again.'
      };
    }

    console.log('✅ Edge Function returned successfully');

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

    console.log('📋 Extracted session data:');
    console.log('   access_token:', access_token ? `${access_token.substring(0, 20)}...` : 'MISSING');
    console.log('   refresh_token:', refresh_token ? `${refresh_token.substring(0, 20)}...` : 'MISSING');
    console.log('   user_id:', user_id);
    console.log('   user_type:', user_type);

    // Set Supabase session using the client
    // This stores the session in localStorage and enables authenticated requests
    console.log('🔐 About to call setSession...');
    let sessionError = null;
    try {
      const result = await supabase.auth.setSession({
        access_token,
        refresh_token
      });
      sessionError = result.error;
      console.log('🔐 setSession completed, error:', sessionError);
    } catch (setSessionErr) {
      console.error('🔐 setSession threw an exception:', setSessionErr);
      sessionError = setSessionErr;
    }

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

    // Store access_token as auth token for backward compatibility with existing code
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

// ============================================================================
// LinkedIn OAuth Signup
// ============================================================================

/**
 * Initiate LinkedIn OAuth signup flow
 * Stores user type in localStorage before redirecting to LinkedIn
 *
 * @param {string} userType - 'Host' or 'Guest'
 * @returns {Promise<Object>} Result with success status or error
 */
export async function initiateLinkedInOAuth(userType) {
  console.log('[Auth] Initiating LinkedIn OAuth with userType:', userType);

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
  console.log('[Auth] Handling LinkedIn OAuth callback');

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
  const isLinkedInProvider = user?.app_metadata?.provider === 'linkedin_oidc';

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

  console.log('[Auth] LinkedIn data:', linkedInData);
  console.log('[Auth] Stored userType:', userType);

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
    setSecureAuthToken(session.access_token);
    setSecureSessionId(data.data.user_id);
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
