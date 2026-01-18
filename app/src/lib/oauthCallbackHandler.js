/**
 * oauthCallbackHandler.js - Global OAuth Callback Detection and Processing
 *
 * This module handles OAuth login callbacks globally, regardless of which page
 * the user returns to after OAuth authentication (LinkedIn or Google). It runs
 * early in app initialization (via dynamic import from supabase.js) before React mounts.
 *
 * Problem Solved:
 * - OAuth login redirects back to the original page
 * - The SignUpLoginModal is NOT mounted when user returns (modal is closed)
 * - Without global handling, OAuth tokens in URL are never processed
 *
 * Solution:
 * - Detect OAuth callback by checking localStorage flag + URL tokens
 * - Process callback via handleLinkedInOAuthLoginCallback() or handleGoogleOAuthLoginCallback()
 * - Dispatch custom events for components to show toasts/handle UI
 */

import {
  getLinkedInOAuthLoginFlow,
  clearLinkedInOAuthLoginFlow,
  getGoogleOAuthLoginFlow,
  clearGoogleOAuthLoginFlow
} from './secureStorage.js';
import {
  handleLinkedInOAuthLoginCallback,
  handleGoogleOAuthLoginCallback
} from './auth.js';

// Track if we've already processed an OAuth callback in this page load
let oauthCallbackProcessed = false;
let oauthCallbackResult = null;

/**
 * Detect if current URL contains OAuth callback tokens
 * @returns {boolean}
 */
function hasOAuthTokensInUrl() {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hasAccessToken = hashParams.get('access_token');
  const urlParams = new URLSearchParams(window.location.search);
  const hasCode = urlParams.get('code');
  return !!(hasAccessToken || hasCode);
}

/**
 * Process OAuth login callback if applicable
 * This should be called early in app initialization
 * Supports both LinkedIn and Google OAuth providers
 *
 * @returns {Promise<{processed: boolean, success?: boolean, result?: any, error?: string, userNotFound?: boolean, email?: string}>}
 */
export async function processOAuthLoginCallback() {
  // Prevent duplicate processing
  if (oauthCallbackProcessed) {
    console.log('[OAuth] Callback already processed in this session');
    return { processed: false, reason: 'already_processed' };
  }

  // Check if this is a login flow (LinkedIn or Google)
  const isLinkedInLoginFlow = getLinkedInOAuthLoginFlow();
  const isGoogleLoginFlow = getGoogleOAuthLoginFlow();

  if (!isLinkedInLoginFlow && !isGoogleLoginFlow) {
    return { processed: false, reason: 'not_login_flow' };
  }

  // Check for OAuth tokens in URL
  if (!hasOAuthTokensInUrl()) {
    return { processed: false, reason: 'no_tokens_in_url' };
  }

  const provider = isGoogleLoginFlow ? 'Google' : 'LinkedIn';
  console.log(`[OAuth] Detected ${provider} OAuth login callback, processing...`);
  oauthCallbackProcessed = true;

  try {
    // Wait a moment for Supabase to process the OAuth tokens from URL hash
    // Supabase client automatically handles the hash and creates a session
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now call the appropriate handler based on provider
    const result = isGoogleLoginFlow
      ? await handleGoogleOAuthLoginCallback()
      : await handleLinkedInOAuthLoginCallback();

    oauthCallbackResult = result;

    if (result.success) {
      console.log(`[OAuth] ${provider} login callback processed successfully`);

      // Clean up URL hash to remove OAuth tokens (optional but cleaner)
      if (window.location.hash) {
        // Use replaceState to not add to history
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      }

      // Dispatch success event for components to show toast
      window.dispatchEvent(new CustomEvent('oauth-login-success', {
        detail: result.data
      }));

      return { processed: true, success: true, result: result.data };
    } else if (result.userNotFound) {
      console.log(`[OAuth] User not found for ${provider} OAuth login:`, result.email);

      // Dispatch event for components to prompt signup
      window.dispatchEvent(new CustomEvent('oauth-login-user-not-found', {
        detail: { email: result.email }
      }));

      return { processed: true, success: false, userNotFound: true, email: result.email };
    } else {
      console.log(`[OAuth] ${provider} login callback failed:`, result.error);
      // Clear the appropriate login flow flag on failure
      if (isGoogleLoginFlow) {
        clearGoogleOAuthLoginFlow();
      } else {
        clearLinkedInOAuthLoginFlow();
      }

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('oauth-login-error', {
        detail: { error: result.error }
      }));

      return { processed: true, success: false, error: result.error };
    }
  } catch (error) {
    console.error('[OAuth] Error processing callback:', error);
    // Clear the appropriate flag on error
    if (isGoogleLoginFlow) {
      clearGoogleOAuthLoginFlow();
    } else {
      clearLinkedInOAuthLoginFlow();
    }
    oauthCallbackResult = { success: false, error: error.message };

    // Dispatch error event
    window.dispatchEvent(new CustomEvent('oauth-login-error', {
      detail: { error: error.message }
    }));

    return { processed: true, success: false, error: error.message };
  }
}

/**
 * Check if OAuth callback was already processed this page load
 * @returns {boolean}
 */
export function isOAuthCallbackProcessed() {
  return oauthCallbackProcessed;
}

/**
 * Get the result of OAuth callback processing
 * @returns {object|null}
 */
export function getOAuthCallbackResult() {
  return oauthCallbackResult;
}

/**
 * Check if this is likely an OAuth callback page
 * Useful for components to decide whether to show loading states
 * @returns {boolean}
 */
export function isPendingOAuthCallback() {
  const isLoginFlow = getLinkedInOAuthLoginFlow() || getGoogleOAuthLoginFlow();
  return isLoginFlow && hasOAuthTokensInUrl() && !oauthCallbackProcessed;
}
