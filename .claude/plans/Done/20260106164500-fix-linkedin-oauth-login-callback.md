# Implementation Plan: Fix LinkedIn OAuth Login Callback Handler

## Overview
This plan fixes the LinkedIn OAuth login flow where users are not logged in after returning from LinkedIn authentication. The root cause is that the callback handler in `SignUpLoginModal.jsx` only fires when the modal is mounted, but after OAuth redirect, the modal is not open on the page.

## Success Criteria
- [ ] LinkedIn OAuth login callbacks are handled globally on every page load
- [ ] Users are successfully logged in after completing LinkedIn OAuth flow
- [ ] Tokens are stored correctly in secure storage
- [ ] Auth state is updated so Header shows logged-in UI
- [ ] Toast notifications show login success/failure
- [ ] Edge cases handled: modal already open, signup flow (not login), errors

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/lib/auth.js` | Contains `handleLinkedInOAuthLoginCallback()` function | No changes (logic is correct) |
| `app/src/lib/secureStorage.js` | Contains `getLinkedInOAuthLoginFlow()` flag | No changes (already has the flag) |
| `app/src/lib/supabase.js` | Supabase client singleton | Minor enhancement: add global OAuth callback detector |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Current (broken) callback location | Remove callback detection (moved to global) |
| `app/src/islands/shared/Header.jsx` | Auth state management, already listens to auth changes | No changes (will react to auth state) |

### New Files to Create
| File | Purpose |
|------|---------|
| `app/src/lib/oauthCallbackHandler.js` | Global OAuth callback detector and processor |

### Related Documentation
- `app/src/lib/auth.js` lines 1525-1667: `initiateLinkedInOAuthLogin()` and `handleLinkedInOAuthLoginCallback()`
- `app/src/lib/secureStorage.js` lines 327-349: OAuth login flow flag functions
- `supabase/functions/auth-user/handlers/oauthLogin.ts`: Edge function that processes OAuth login

### Existing Patterns to Follow
- OAuth SIGNUP callback detection in `SignUpLoginModal.jsx` (lines 877-940) - but this only works because signup redirects to `/account-profile` where the modal may be mounted
- Header's `supabase.auth.onAuthStateChange` listener (lines 168-229) - will automatically update UI when session is set

## Problem Analysis

### Current Flow (Broken)
1. User clicks "Login with LinkedIn" in the login modal
2. `initiateLinkedInOAuthLogin()` is called:
   - Sets `sl_linkedin_oauth_login_flow = 'true'` in localStorage
   - Redirects to LinkedIn with `redirectTo: window.location.href` (stays on current page)
3. User authenticates on LinkedIn
4. LinkedIn redirects back to the current page URL with OAuth tokens in hash
5. **PROBLEM**: The login modal is NOT open when user returns
6. `SignUpLoginModal.jsx` callback detection (lines 942-1010) never fires because:
   - The component is not mounted (modal is closed)
   - Even if it were mounted later, the useEffect only runs on initial mount
7. Tokens are in Supabase session (from OAuth redirect), but NOT stored in secure storage
8. User appears not logged in (no firstName/userType/session data stored)

### Why Signup Works
- Signup uses `redirectTo: /account-profile` - a specific page
- Account profile page has the modal potentially mounted
- Even then, it relies on the callback detection happening to fire

### Solution Architecture
Create a **global OAuth callback detector** that:
1. Runs synchronously during app initialization (before React mounts)
2. Checks if this is a returning OAuth login callback
3. Processes the callback and stores tokens
4. Sets auth state so subsequent React components see the user as logged in

## Implementation Steps

### Step 1: Create Global OAuth Callback Handler Module
**Files:** `app/src/lib/oauthCallbackHandler.js` (NEW)
**Purpose:** Standalone module that detects and handles OAuth callbacks globally

**Details:**
- Create a module that can be imported at the top of any entry point
- Check for OAuth login flow flag (`getLinkedInOAuthLoginFlow()`)
- Check for OAuth tokens in URL hash (`access_token`) or URL params (`code`)
- If both conditions met, call `handleLinkedInOAuthLoginCallback()`
- Store results and set a flag indicating callback was processed
- Export `processOAuthCallback()` function and `isOAuthCallbackProcessed()` check

**Code Structure:**
```javascript
// app/src/lib/oauthCallbackHandler.js

import { getLinkedInOAuthLoginFlow, clearLinkedInOAuthLoginFlow } from './secureStorage.js';
import { handleLinkedInOAuthLoginCallback, setAuthToken, setSessionId, setAuthState, setUserType } from './auth.js';
import { supabase } from './supabase.js';

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
 *
 * @returns {Promise<{processed: boolean, success?: boolean, result?: any, error?: string}>}
 */
export async function processOAuthLoginCallback() {
  // Prevent duplicate processing
  if (oauthCallbackProcessed) {
    console.log('[OAuth] Callback already processed in this session');
    return { processed: false, reason: 'already_processed' };
  }

  // Check if this is a login flow
  const isLoginFlow = getLinkedInOAuthLoginFlow();
  if (!isLoginFlow) {
    return { processed: false, reason: 'not_login_flow' };
  }

  // Check for OAuth tokens in URL
  if (!hasOAuthTokensInUrl()) {
    return { processed: false, reason: 'no_tokens_in_url' };
  }

  console.log('[OAuth] Detected OAuth login callback, processing...');
  oauthCallbackProcessed = true;

  try {
    // Wait a moment for Supabase to process the OAuth tokens from URL hash
    // Supabase client automatically handles the hash and creates a session
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now call our handler which reads the session and calls the Edge Function
    const result = await handleLinkedInOAuthLoginCallback();

    oauthCallbackResult = result;

    if (result.success) {
      console.log('[OAuth] Login callback processed successfully');

      // Clean up URL hash to remove OAuth tokens (optional but cleaner)
      if (window.location.hash) {
        // Use replaceState to not add to history
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', cleanUrl);
      }

      return { processed: true, success: true, result: result.data };
    } else {
      console.log('[OAuth] Login callback failed:', result.error);
      // Clear the login flow flag on failure
      clearLinkedInOAuthLoginFlow();

      return { processed: true, success: false, error: result.error, userNotFound: result.userNotFound };
    }
  } catch (error) {
    console.error('[OAuth] Error processing callback:', error);
    clearLinkedInOAuthLoginFlow();
    oauthCallbackResult = { success: false, error: error.message };
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
  return getLinkedInOAuthLoginFlow() && hasOAuthTokensInUrl() && !oauthCallbackProcessed;
}
```

**Validation:** Module exports correctly, functions are pure with clear return types

### Step 2: Integrate Global Handler into Supabase Client Module
**Files:** `app/src/lib/supabase.js`
**Purpose:** Process OAuth callback immediately when Supabase client initializes

**Details:**
- Import `processOAuthLoginCallback` from `oauthCallbackHandler.js`
- Call it synchronously after creating the Supabase client
- This ensures callback is processed before any React components mount
- The Supabase `onAuthStateChange` listener in Header will then pick up the session

**Current Code (lines 1-11):**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**New Code:**
```javascript
import { createClient } from '@supabase/supabase-js';
import { processOAuthLoginCallback } from './oauthCallbackHandler.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Process any pending OAuth login callback immediately
// This runs when the supabase module is first imported (early in app lifecycle)
// Result is fire-and-forget - the Header's onAuthStateChange will handle UI updates
processOAuthLoginCallback().then(result => {
  if (result.processed) {
    console.log('[Supabase Init] OAuth callback processed:', result.success ? 'success' : 'failed');
  }
}).catch(err => {
  console.error('[Supabase Init] OAuth callback error:', err);
});
```

**Validation:**
- Check that `processOAuthLoginCallback` is called on module load
- Verify it doesn't block the synchronous export of `supabase`

### Step 3: Handle Circular Import Issue
**Files:** `app/src/lib/oauthCallbackHandler.js`, `app/src/lib/supabase.js`
**Purpose:** Prevent circular dependency between supabase.js and oauthCallbackHandler.js

**Details:**
The `oauthCallbackHandler.js` imports from `auth.js`, which imports from `supabase.js`.
If `supabase.js` imports from `oauthCallbackHandler.js`, we create a circular dependency.

**Solution:** Move the OAuth callback processing call to a separate initialization module or use dynamic import.

**Alternative Approach - Use Dynamic Import:**
```javascript
// app/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Use dynamic import to avoid circular dependency
// This runs after module initialization completes
import('./oauthCallbackHandler.js').then(({ processOAuthLoginCallback }) => {
  processOAuthLoginCallback().then(result => {
    if (result.processed) {
      console.log('[Supabase Init] OAuth callback processed:', result.success ? 'success' : 'failed');
    }
  }).catch(err => {
    console.error('[Supabase Init] OAuth callback error:', err);
  });
});
```

**Validation:** No circular import warnings, module loads correctly

### Step 4: Update oauthCallbackHandler to NOT Import supabase.js
**Files:** `app/src/lib/oauthCallbackHandler.js`
**Purpose:** Break circular dependency by not importing supabase directly

**Details:**
- The `handleLinkedInOAuthLoginCallback()` in `auth.js` already handles getting the session
- We don't need to import supabase.js in oauthCallbackHandler.js
- Remove any direct supabase imports from the new module

**Updated Code Structure:**
```javascript
// app/src/lib/oauthCallbackHandler.js

import { getLinkedInOAuthLoginFlow, clearLinkedInOAuthLoginFlow } from './secureStorage.js';
import { handleLinkedInOAuthLoginCallback } from './auth.js';

// ... rest of the implementation
```

**Validation:** Module loads without circular dependency errors

### Step 5: Remove Duplicate Callback Detection from SignUpLoginModal
**Files:** `app/src/islands/shared/SignUpLoginModal.jsx`
**Purpose:** Remove the now-redundant OAuth login callback detection

**Details:**
- The useEffect at lines 942-1010 handles OAuth login callback
- This is now handled globally by `oauthCallbackHandler.js`
- Remove this useEffect to avoid duplicate processing
- Keep the OAuth SIGNUP callback detection (lines 877-940) as that has different redirect behavior

**Current Code to Remove (lines 942-1010):**
```javascript
  // OAuth LOGIN callback detection (separate from signup flow)
  useEffect(() => {
    // Check if this is a login flow
    const isLoginFlow = getLinkedInOAuthLoginFlow();
    if (!isLoginFlow) return;
    // ... rest of the effect
  }, []); // Only run once on mount
```

**Validation:** OAuth login still works, no duplicate toasts or API calls

### Step 6: Add Toast Notifications for Global OAuth Callback
**Files:** `app/src/lib/oauthCallbackHandler.js`
**Purpose:** Show user feedback after OAuth callback processing

**Details:**
- The global handler processes the callback before React mounts
- We need a way to show toasts after the page renders
- Store the result and let the Header/SignUpLoginModal check it
- Or dispatch a custom event that components can listen for

**Approach: Use Custom Event**
```javascript
// In oauthCallbackHandler.js - after successful processing
if (result.success) {
  // Dispatch event for components to show toast
  window.dispatchEvent(new CustomEvent('oauth-login-success', {
    detail: result.data
  }));
} else if (result.userNotFound) {
  window.dispatchEvent(new CustomEvent('oauth-login-user-not-found', {
    detail: { email: result.email }
  }));
} else {
  window.dispatchEvent(new CustomEvent('oauth-login-error', {
    detail: { error: result.error }
  }));
}
```

**In Header.jsx - Add event listener for toast:**
```javascript
// Listen for global OAuth callback results
useEffect(() => {
  const handleOAuthSuccess = (event) => {
    // Show success toast - Header already has Toast integration
    console.log('[Header] OAuth login success:', event.detail);
    // Toast will be shown via auth state change handling
  };

  const handleOAuthError = (event) => {
    console.log('[Header] OAuth login error:', event.detail.error);
    // Could show error toast here if needed
  };

  const handleUserNotFound = (event) => {
    console.log('[Header] OAuth user not found:', event.detail.email);
    // Open signup modal with email prefilled
    setShowAuthModal(true);
    setAuthModalInitialView('signup');
  };

  window.addEventListener('oauth-login-success', handleOAuthSuccess);
  window.addEventListener('oauth-login-error', handleOAuthError);
  window.addEventListener('oauth-login-user-not-found', handleUserNotFound);

  return () => {
    window.removeEventListener('oauth-login-success', handleOAuthSuccess);
    window.removeEventListener('oauth-login-error', handleOAuthError);
    window.removeEventListener('oauth-login-user-not-found', handleUserNotFound);
  };
}, []);
```

**Validation:** Toasts appear after OAuth callback, user not found triggers signup modal

### Step 7: Handle User Not Found Case (Prompt Signup)
**Files:** `app/src/islands/shared/Header.jsx`
**Purpose:** When OAuth login fails because user doesn't exist, open signup modal

**Details:**
- The `oauth-login-user-not-found` event carries the email
- Open SignUpLoginModal in signup mode with email prefilled
- Pass email to modal via props

**Implementation:**
- Header already has `showAuthModal` and `setAuthModalInitialView` state
- Add state for prefilled email: `const [prefillEmail, setPrefillEmail] = useState(null)`
- In event handler: `setPrefillEmail(event.detail.email); setShowAuthModal(true); setAuthModalInitialView('signup');`
- Pass to modal: `<SignUpLoginModal prefillEmail={prefillEmail} ... />`

**Validation:** User not found leads to signup modal with email prefilled

## Edge Cases & Error Handling

### Edge Case 1: Modal Already Open When Returning from OAuth
- **Situation:** User opens login modal, clicks LinkedIn, returns with modal somehow still open
- **Handling:** Global handler processes first, sets `oauthCallbackProcessed = true`
- **Result:** Modal's useEffect (if kept) would skip processing due to flag check

### Edge Case 2: OAuth Signup Flow (Not Login)
- **Situation:** User uses OAuth for signup (different from login)
- **Handling:** `getLinkedInOAuthLoginFlow()` returns false for signup flows
- **Result:** Global handler skips, signup callback in modal handles it

### Edge Case 3: Page Refresh After OAuth Without Flag
- **Situation:** User refreshes page, tokens in hash but no login flag
- **Handling:** Global handler checks for login flag first, skips if missing
- **Result:** Supabase client still has session from hash, Header's onAuthStateChange handles it

### Edge Case 4: Network Error During Callback Processing
- **Situation:** Edge function call fails
- **Handling:** Try-catch in `processOAuthLoginCallback`, dispatches error event
- **Result:** Error toast shown, user can try again

### Edge Case 5: Tokens Expired or Invalid
- **Situation:** OAuth tokens in URL are old/invalid
- **Handling:** `handleLinkedInOAuthLoginCallback` returns error from Edge Function
- **Result:** Error event dispatched, user prompted to try again

## Testing Considerations

### Manual Testing Scenarios
1. **Fresh LinkedIn OAuth Login:**
   - Log out completely
   - Click "Login with LinkedIn" on any page
   - Complete LinkedIn authentication
   - Verify: Returned to same page, logged in, toast shown

2. **OAuth Login When Already Logged In:**
   - While logged in as another user, try LinkedIn login
   - Verify: Previous session cleared, new session established

3. **OAuth Login with User Not Found:**
   - Use LinkedIn account without existing Split Lease account
   - Verify: Signup modal appears with email prefilled

4. **OAuth Signup Still Works:**
   - Use "Sign up with LinkedIn" flow
   - Verify: Redirects to /account-profile, account created

5. **Page Refresh After OAuth:**
   - After successful OAuth login, refresh the page
   - Verify: User remains logged in (session persisted)

### Automated Testing Notes
- Unit test `processOAuthLoginCallback()` with mocked localStorage and URL
- Test edge cases: no flag, no tokens, both conditions met
- Mock `handleLinkedInOAuthLoginCallback` to test success/failure paths

## Rollback Strategy

If issues arise:
1. **Quick Rollback:** Comment out the dynamic import in `supabase.js`
2. **Full Rollback:** Revert `oauthCallbackHandler.js` creation and `supabase.js` changes
3. **Restore Modal Handler:** Uncomment the useEffect in SignUpLoginModal.jsx (lines 942-1010)

The existing behavior (broken but stable) would return.

## Dependencies & Blockers

- **None identified:** All required functions exist in `auth.js` and `secureStorage.js`
- Edge Function `oauth_login` action is already implemented and working

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Circular import issues | Medium | High | Use dynamic import pattern |
| Race condition with React mount | Low | Medium | Process callback before React mount via module init |
| Duplicate toast notifications | Medium | Low | Remove modal's duplicate useEffect |
| Edge case: OAuth tokens but no flag | Low | Low | Supabase's onAuthStateChange handles session |

---

## File Summary

### Files to Create
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\oauthCallbackHandler.js` - Global OAuth callback detection and processing

### Files to Modify
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` - Add dynamic import to trigger callback processing
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` - Remove duplicate OAuth login callback useEffect (lines 942-1010)
- `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\Header.jsx` - Add event listeners for OAuth callback results, handle user not found case

### Files Referenced (No Changes)
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` - Contains `handleLinkedInOAuthLoginCallback()`
- `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\secureStorage.js` - Contains `getLinkedInOAuthLoginFlow()`
- `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\oauthLogin.ts` - Edge Function (already working)
