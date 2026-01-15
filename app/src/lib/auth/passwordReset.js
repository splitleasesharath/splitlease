/**
 * Split Lease Authentication - Password Reset
 * Handles password reset request and update flows
 */

import { supabase } from '../supabase.js';
import {
  setAuthToken as setSecureAuthToken,
  setSessionId as setSecureSessionId,
  setAuthState,
  setUserType as setSecureUserType,
} from '../secureStorage.js';
import { setIsUserLoggedIn } from './tokenValidation.js';

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

      // In newer Supabase JS versions, error.context is the Response object
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          console.error('   Error body from Response:', errorBody);
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
    setIsUserLoggedIn(true);

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
