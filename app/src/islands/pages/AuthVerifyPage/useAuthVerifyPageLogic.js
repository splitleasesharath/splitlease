/**
 * Auth Verify Page Logic Hook
 * Handles magic link OTP verification flow
 *
 * Flow:
 * 1. Extract token_hash, type, and redirect_to from URL query params
 * 2. Call supabase.auth.verifyOtp() to validate the token
 * 3. Display loading -> verifying -> success/error states
 * 4. On success: redirect to intended destination
 * 5. On error: show user-friendly message
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import {
  setAuthToken as setSecureAuthToken,
  setSessionId as setSecureSessionId,
  setAuthState,
  setUserType as setSecureUserType
} from '../../../lib/secureStorage.js';

/**
 * Extract redirect_to URL from query params
 * Security: Only accept relative paths (starting with /) to prevent open redirects
 */
const getRedirectToUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get('redirect_to');
  // Validate it's a relative path (security: prevent open redirect attacks)
  if (redirectTo && redirectTo.startsWith('/')) {
    return redirectTo;
  }
  return '/'; // Default to home
};

/**
 * Clear query params from URL to prevent re-verification attempts
 * Uses replaceState to not add to browser history
 */
const clearQueryParams = () => {
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
};

/**
 * Map Supabase error codes to user-friendly messages
 */
const getErrorMessage = (error, errorCode) => {
  // Handle specific error codes
  if (errorCode === 'otp_expired' || error?.message?.includes('expired')) {
    return 'This login link has expired. Please request a new one.';
  }

  if (errorCode === 'otp_disabled' || error?.message?.includes('disabled')) {
    return 'This login link has been disabled. Please request a new one.';
  }

  if (error?.message?.includes('already been used') || error?.message?.includes('already used')) {
    return 'This login link has already been used. Please request a new one.';
  }

  if (error?.message?.includes('Invalid') || error?.message?.includes('invalid')) {
    return 'Invalid verification link. Please request a new login link.';
  }

  if (error?.message?.includes('Token') || error?.message?.includes('token')) {
    return 'Invalid or expired token. Please request a new login link.';
  }

  // Network-related errors
  if (error?.message?.includes('network') || error?.message?.includes('Network')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Default fallback
  return error?.message || 'Verification failed. Please request a new login link.';
};

/**
 * Main logic hook for AuthVerifyPage
 * Following the Hollow Component Pattern - all logic here, no logic in component
 */
export function useAuthVerifyPageLogic() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [redirectTo] = useState(getRedirectToUrl); // Capture once on mount

  // Verification timeout (15 seconds)
  const VERIFICATION_TIMEOUT = 15000;

  /**
   * Perform the OTP verification
   */
  const verifyToken = useCallback(async (tokenHash, type) => {
    console.log('[AuthVerify] Starting verification...');
    console.log('[AuthVerify] Token hash present:', !!tokenHash);
    console.log('[AuthVerify] Type:', type);

    setStatus('verifying');
    setErrorMessage(null);
    setErrorCode(null);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      console.log('[AuthVerify] Verification timed out');
      setStatus('error');
      setErrorMessage('Verification timed out. Please try again or request a new link.');
      setErrorCode('timeout');
    }, VERIFICATION_TIMEOUT);

    try {
      // Call Supabase to verify the OTP
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type
      });

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      if (error) {
        console.error('[AuthVerify] Verification error:', error);
        setStatus('error');
        setErrorMessage(getErrorMessage(error, error.code));
        setErrorCode(error.code || 'unknown');
        // Clear URL params to prevent re-verification attempts
        clearQueryParams();
        return;
      }

      // Success - session established
      if (data?.session) {
        console.log('[AuthVerify] Verification successful');
        console.log('[AuthVerify] User ID:', data.session.user?.id);
        console.log('[AuthVerify] Email:', data.session.user?.email);

        // Sync session to secure storage for consistency with rest of app
        const session = data.session;
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

        // Clear URL params
        clearQueryParams();

        // Show success state
        setStatus('success');

        // Redirect after brief delay to show success message
        setTimeout(() => {
          console.log('[AuthVerify] Redirecting to:', redirectTo);
          window.location.href = redirectTo;
        }, 1500);
      } else {
        // No session returned - shouldn't happen but handle it
        console.error('[AuthVerify] No session in response');
        setStatus('error');
        setErrorMessage('Verification completed but no session was created. Please try logging in again.');
        setErrorCode('no_session');
        clearQueryParams();
      }
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutId);

      console.error('[AuthVerify] Unexpected error:', error);
      setStatus('error');
      setErrorMessage(getErrorMessage(error, null));
      setErrorCode('exception');
      clearQueryParams();
    }
  }, [redirectTo]);

  /**
   * Initialize verification on mount
   */
  useEffect(() => {
    console.log('[AuthVerify] Page mounted, checking URL params...');

    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type') || 'magiclink'; // Default to magiclink

    // Log what we have (don't log full token for security)
    console.log('[AuthVerify] Has token_hash:', !!tokenHash);
    console.log('[AuthVerify] Type:', type);
    console.log('[AuthVerify] Redirect to:', redirectTo);

    // Validate required parameters
    if (!tokenHash) {
      console.error('[AuthVerify] Missing token_hash parameter');
      setStatus('error');
      setErrorMessage('Invalid verification link. Please request a new login link.');
      setErrorCode('missing_token');
      return;
    }

    // Valid token types for verifyOtp
    const validTypes = ['magiclink', 'email', 'sms', 'phone_change', 'email_change', 'signup', 'recovery', 'invite'];
    if (!validTypes.includes(type)) {
      console.error('[AuthVerify] Invalid type parameter:', type);
      setStatus('error');
      setErrorMessage('Invalid verification link. Please request a new login link.');
      setErrorCode('invalid_type');
      return;
    }

    // Start verification
    verifyToken(tokenHash, type);
  }, [verifyToken, redirectTo]);

  /**
   * Handler for retry button - redirect to request new link
   */
  const handleRequestNewLink = useCallback(() => {
    // Redirect to home page where they can request a new magic link
    window.location.href = '/';
  }, []);

  return {
    status,
    errorMessage,
    errorCode,
    handleRequestNewLink,
    redirectTo
  };
}
