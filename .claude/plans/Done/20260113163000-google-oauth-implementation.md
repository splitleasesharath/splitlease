# Implementation Plan: Google OAuth for Signup and Login

## Overview

Implement Google OAuth authentication by mirroring the existing LinkedIn OAuth pattern. This is a straightforward port since the backend Edge Functions are already provider-agnostic, requiring only frontend changes to add Google OAuth storage functions, auth functions, callback handling, and button integrations.

## Success Criteria

- [ ] Users can sign up via Google OAuth with proper user type preservation
- [ ] Users can log in via Google OAuth from any page
- [ ] OAuth callback is processed globally (regardless of which page user returns to)
- [ ] Appropriate toasts/errors shown for success, user-not-found, and error states
- [ ] No regressions to existing LinkedIn OAuth functionality

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/lib/secureStorage.js` | OAuth state storage | Add 6 Google OAuth storage functions |
| `app/src/lib/auth.js` | Authentication functions | Add 4 Google OAuth functions |
| `app/src/lib/oauthCallbackHandler.js` | Global OAuth callback detection | Add Google login flow detection |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login/Signup modal | Replace Google button alerts with real OAuth calls |

### Related Documentation

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google) - Official configuration guide
- Backend handlers are provider-agnostic: `supabase/functions/auth-user/handlers/oauthSignup.ts` and `oauthLogin.ts`

### Existing Patterns to Follow

1. **LinkedIn OAuth Storage Pattern** (secureStorage.js lines 298-349)
   - `setLinkedInOAuthUserType()` / `getLinkedInOAuthUserType()` / `clearLinkedInOAuthUserType()`
   - `setLinkedInOAuthLoginFlow()` / `getLinkedInOAuthLoginFlow()` / `clearLinkedInOAuthLoginFlow()`

2. **LinkedIn OAuth Auth Functions** (auth.js lines 1392-1667)
   - `initiateLinkedInOAuth(userType)` - Signup flow
   - `handleLinkedInOAuthCallback()` - Process signup callback
   - `initiateLinkedInOAuthLogin()` - Login flow
   - `handleLinkedInOAuthLoginCallback()` - Process login callback

3. **OAuth Callback Handler Pattern** (oauthCallbackHandler.js lines 44-124)
   - Checks localStorage flag to determine if login vs signup flow
   - Calls appropriate handler
   - Dispatches custom events for UI feedback

## Implementation Steps

### Step 1: Add Google OAuth Storage Functions

**Files:** `app/src/lib/secureStorage.js`
**Purpose:** Store Google OAuth state across the redirect flow

**Details:**

1. Add two new state keys to `STATE_KEYS` object (around line 41):
```javascript
GOOGLE_OAUTH_USER_TYPE: 'sl_google_oauth_user_type',
GOOGLE_OAUTH_LOGIN_FLOW: 'sl_google_oauth_login_flow',
```

2. Add 6 new functions after line 349 (after `clearLinkedInOAuthLoginFlow`):

```javascript
/**
 * Set Google OAuth user type before redirect
 * @param {string} userType - 'Host' or 'Guest'
 */
export function setGoogleOAuthUserType(userType) {
  if (userType) {
    localStorage.setItem(STATE_KEYS.GOOGLE_OAUTH_USER_TYPE, userType);
  }
}

/**
 * Get Google OAuth user type (stored before redirect)
 * @returns {string|null} User type or null
 */
export function getGoogleOAuthUserType() {
  return localStorage.getItem(STATE_KEYS.GOOGLE_OAUTH_USER_TYPE);
}

/**
 * Clear Google OAuth user type after callback handling
 */
export function clearGoogleOAuthUserType() {
  localStorage.removeItem(STATE_KEYS.GOOGLE_OAUTH_USER_TYPE);
}

/**
 * Set Google OAuth login flow flag before redirect
 * Distinguishes login flow from signup flow
 * @param {boolean} isLoginFlow - Whether this is a login attempt
 */
export function setGoogleOAuthLoginFlow(isLoginFlow) {
  if (isLoginFlow) {
    localStorage.setItem(STATE_KEYS.GOOGLE_OAUTH_LOGIN_FLOW, 'true');
  } else {
    localStorage.removeItem(STATE_KEYS.GOOGLE_OAUTH_LOGIN_FLOW);
  }
}

/**
 * Get Google OAuth login flow flag
 * @returns {boolean} True if this is a login flow
 */
export function getGoogleOAuthLoginFlow() {
  return localStorage.getItem(STATE_KEYS.GOOGLE_OAUTH_LOGIN_FLOW) === 'true';
}

/**
 * Clear Google OAuth login flow flag after callback handling
 */
export function clearGoogleOAuthLoginFlow() {
  localStorage.removeItem(STATE_KEYS.GOOGLE_OAUTH_LOGIN_FLOW);
}
```

**Validation:** Confirm functions are exported and localStorage keys are unique.

---

### Step 2: Add Google OAuth Auth Functions

**Files:** `app/src/lib/auth.js`
**Purpose:** Implement Google OAuth initiation and callback handling

**Details:**

1. Update imports at line 42-47 to include Google OAuth storage functions:
```javascript
import {
  // ... existing imports ...
  setGoogleOAuthUserType,
  getGoogleOAuthUserType,
  clearGoogleOAuthUserType,
  setGoogleOAuthLoginFlow,
  getGoogleOAuthLoginFlow,
  clearGoogleOAuthLoginFlow
} from './secureStorage.js';
```

2. Add 4 Google OAuth functions after line 1667 (after `handleLinkedInOAuthLoginCallback`):

```javascript
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
  console.log('[Auth] Initiating Google OAuth with userType:', userType);

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
  console.log('[Auth] Handling Google OAuth callback');

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
  const isGoogleProvider = user?.app_metadata?.provider === 'google';

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

  console.log('[Auth] Google data:', googleData);
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
  console.log('[Auth] Initiating Google OAuth Login');

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
  console.log('[Auth] Handling Google OAuth Login callback');

  // Verify this is a login flow
  if (!getGoogleOAuthLoginFlow()) {
    console.log('[Auth] Not a login flow callback, skipping');
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
    const isGoogleProvider = user?.app_metadata?.provider === 'google';

    if (!isGoogleProvider) {
      clearGoogleOAuthLoginFlow();
      return { success: false, error: 'Not a Google OAuth session' };
    }

    // Extract Google data
    const email = user.email;
    const supabaseUserId = user.id;

    console.log('[Auth] Google OAuth login data:', { email, supabaseUserId });

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
    const { user_id, user_type, supabase_user_id } = data.data;

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

    console.log('[Auth] Google OAuth login successful');
    return {
      success: true,
      data: data.data
    };

  } catch (err) {
    clearGoogleOAuthLoginFlow();
    console.error('[Auth] Google OAuth login callback error:', err);
    return { success: false, error: err.message };
  }
}
```

**Validation:** Test that functions can be imported without errors.

---

### Step 3: Update OAuth Callback Handler

**Files:** `app/src/lib/oauthCallbackHandler.js`
**Purpose:** Detect and process Google OAuth login callbacks globally

**Details:**

1. Update imports at lines 19-20 to include Google OAuth functions:
```javascript
import { getLinkedInOAuthLoginFlow, clearLinkedInOAuthLoginFlow, getGoogleOAuthLoginFlow, clearGoogleOAuthLoginFlow } from './secureStorage.js';
import { handleLinkedInOAuthLoginCallback, handleGoogleOAuthLoginCallback } from './auth.js';
```

2. Update `processOAuthLoginCallback()` function starting at line 44 to check for Google OAuth:

Replace the current implementation (lines 44-124) with:
```javascript
export async function processOAuthLoginCallback() {
  // Prevent duplicate processing
  if (oauthCallbackProcessed) {
    console.log('[OAuth] Callback already processed in this session');
    return { processed: false, reason: 'already_processed' };
  }

  // Check if this is a LinkedIn login flow
  const isLinkedInLoginFlow = getLinkedInOAuthLoginFlow();

  // Check if this is a Google login flow
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

    // Call the appropriate handler based on provider
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
      // Clear the login flow flag on failure (handled in the callback functions now)

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('oauth-login-error', {
        detail: { error: result.error }
      }));

      return { processed: true, success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[OAuth] Error processing ${provider} callback:`, error);
    clearLinkedInOAuthLoginFlow();
    clearGoogleOAuthLoginFlow();
    oauthCallbackResult = { success: false, error: error.message };

    // Dispatch error event
    window.dispatchEvent(new CustomEvent('oauth-login-error', {
      detail: { error: error.message }
    }));

    return { processed: true, success: false, error: error.message };
  }
}
```

3. Update `isPendingOAuthCallback()` function at line 147 to include Google:
```javascript
export function isPendingOAuthCallback() {
  const isLinkedInPending = getLinkedInOAuthLoginFlow() && hasOAuthTokensInUrl() && !oauthCallbackProcessed;
  const isGooglePending = getGoogleOAuthLoginFlow() && hasOAuthTokensInUrl() && !oauthCallbackProcessed;
  return isLinkedInPending || isGooglePending;
}
```

**Validation:** Confirm no syntax errors and callbacks are properly detected.

---

### Step 4: Update SignUpLoginModal Buttons

**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Replace placeholder Google OAuth alerts with real functionality

**Details:**

1. Update imports at line 27 to include Google OAuth functions:
```javascript
import { loginUser, signupUser, validateTokenAndFetchUser, initiateLinkedInOAuth, handleLinkedInOAuthCallback, initiateLinkedInOAuthLogin, initiateGoogleOAuth, initiateGoogleOAuthLogin } from '../../lib/auth.js';
```

2. Update Google LOGIN button (around line 1711-1718):

Replace:
```javascript
{/* Google OAuth Button */}
<button
  type="button"
  style={styles.googleBtn}
  onClick={() => alert('Google OAuth login coming soon!')}
>
  <GoogleLogo />
  <span>Google</span>
</button>
```

With:
```javascript
{/* Google OAuth Button */}
<button
  type="button"
  style={styles.googleBtn}
  onClick={async () => {
    const result = await initiateGoogleOAuthLogin();
    if (!result.success) {
      setError(result.error || 'Failed to start Google login');
    }
  }}
  disabled={isLoading}
>
  <GoogleLogo />
  <span>Google</span>
</button>
```

3. Update Google SIGNUP button (around line 1850-1858):

Replace:
```javascript
{/* Google OAuth Button */}
<button
  type="button"
  style={styles.googleBtn}
  onClick={() => alert('Google OAuth signup coming soon!')}
>
  <GoogleLogo />
  <span>Google</span>
</button>
```

With:
```javascript
{/* Google OAuth Button */}
<button
  type="button"
  style={styles.googleBtn}
  onClick={async () => {
    const result = await initiateGoogleOAuth(signupData.userType);
    if (!result.success) {
      setError(result.error || 'Failed to start Google signup');
    }
  }}
  disabled={isLoading}
>
  <GoogleLogo />
  <span>Google</span>
</button>
```

**Validation:** Verify button clicks initiate OAuth flow without errors.

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| User cancels Google consent screen | OAuth error returned, flow flag cleared, user stays on page |
| Google user with no Split Lease account tries to login | `userNotFound: true` returned, `oauth-login-user-not-found` event dispatched |
| User with existing email tries to signup via Google | `isDuplicate: true` returned with `existingEmail` |
| Network error during OAuth callback | Error caught, flow flags cleared, error toast shown |
| Multiple OAuth callbacks in same session | `oauthCallbackProcessed` flag prevents duplicate processing |

## Testing Strategy

### Manual Testing Checklist

**Signup Flow:**
1. [ ] Open SignUpLoginModal, select "Guest" user type
2. [ ] Click Google button on Identity step
3. [ ] Verify redirect to Google consent screen
4. [ ] After consent, verify redirect to `/account-profile`
5. [ ] Verify user record created in database with correct user type
6. [ ] Verify session tokens stored in localStorage

**Login Flow:**
1. [ ] Open SignUpLoginModal on any page (e.g., `/search`)
2. [ ] Click Google button on Login view
3. [ ] After consent, verify redirect back to same page
4. [ ] Verify `oauth-login-success` event dispatched
5. [ ] Verify session tokens stored in localStorage

**User Not Found:**
1. [ ] Try to login with Google account not in database
2. [ ] Verify `oauth-login-user-not-found` event dispatched
3. [ ] Verify appropriate error message shown

**Edge Cases:**
1. [ ] Cancel Google consent and verify no errors
2. [ ] Try signup with email already in database
3. [ ] Test on multiple pages (homepage, search, listing detail)

## Rollback Strategy

1. Revert changes to `auth.js` - removes Google OAuth functions
2. Revert changes to `secureStorage.js` - removes storage functions
3. Revert changes to `oauthCallbackHandler.js` - removes Google detection
4. Revert changes to `SignUpLoginModal.jsx` - restores placeholder alerts

No database changes, no Edge Function changes - rollback is purely frontend.

## Dependencies & Blockers

**Pre-requisites (Already Completed):**
- [x] Google Cloud Console OAuth client created
- [x] Supabase Dashboard Google provider configured
- [x] Redirect URIs added for production and dev branches

**No Blockers:** All dependencies are met.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wrong provider name ('google' vs 'google_oidc') | Low | High | Verified via Supabase docs - correct name is 'google' |
| Google returns different user_metadata fields | Low | Medium | Using fallback field names (given_name/first_name) |
| Conflict between Google and LinkedIn flows | Low | Low | Separate storage keys prevent conflicts |
| Backend rejects Google provider | Very Low | High | Backend is provider-agnostic, accepts any provider string |

## Key Differences from LinkedIn

| Aspect | LinkedIn | Google |
|--------|----------|--------|
| Provider name | `'linkedin_oidc'` | `'google'` |
| Provider check | `user?.app_metadata?.provider === 'linkedin_oidc'` | `user?.app_metadata?.provider === 'google'` |
| Storage keys | `sl_linkedin_oauth_*` | `sl_google_oauth_*` |
| User metadata fields | Same structure | Same structure |
| Scopes | `'openid profile email'` | `'openid profile email'` |

---

## Files Referenced

| File | Path | Purpose |
|------|------|---------|
| secureStorage.js | `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\secureStorage.js` | OAuth state storage functions |
| auth.js | `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | OAuth initiation and callback functions |
| oauthCallbackHandler.js | `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\oauthCallbackHandler.js` | Global OAuth callback detection |
| SignUpLoginModal.jsx | `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` | Login/Signup UI with OAuth buttons |
| oauthSignup.ts | `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\oauthSignup.ts` | Backend OAuth signup handler (no changes) |
| oauthLogin.ts | `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\oauthLogin.ts` | Backend OAuth login handler (no changes) |

---

**Plan Created:** 2026-01-13 16:30:00
**Status:** Ready for Implementation
**Estimated Effort:** 1-2 hours
