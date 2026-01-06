# Debug Analysis: Magic Link Expired OTP Infinite Reload Loop

**Created**: 2026-01-06 18:35:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Magic login link handling, specifically error handling for expired OTP tokens

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Vite, Supabase Auth, Cloudflare Pages
- **Data Flow**:
  1. User clicks magic link in email
  2. Supabase redirects to `/account-profile/{userId}` with auth tokens in URL hash
  3. If OTP is expired, Supabase includes error params in URL hash instead of tokens
  4. Page loads, Header component initializes auth state listeners
  5. AccountProfilePage initializes and checks auth

### 1.2 Domain Context
- **Feature Purpose**: Magic login link allows passwordless authentication for existing users
- **Related Documentation**:
  - `.claude/Documentation/Auth/LOGIN_FLOW.md`
  - `app/src/islands/pages/CLAUDE.md` (page architecture)
- **Data Model**:
  - Supabase Auth handles OTP validation
  - User data stored in `public.user` table
  - Auth state managed via `lib/auth.js` and `lib/secureStorage.js`

### 1.3 Relevant Conventions
- **Key Patterns**:
  - `onAuthStateChange` listener in Header.jsx handles auth events
  - `PASSWORD_RECOVERY` event handling exists in ResetPasswordPage.jsx
  - No equivalent error handling for `otp_expired` error exists anywhere
- **Layer Boundaries**:
  - Frontend receives auth redirect with hash params
  - Supabase client parses hash and fires events
  - Header listens for `SIGNED_IN`/`INITIAL_SESSION` events
- **Shared Utilities**: `lib/auth.js`, `lib/secureStorage.js`, `lib/supabase.js`

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: User clicks magic link -> browser navigates to `/account-profile/{userId}#error=access_denied&error_code=otp_expired&...`
- **Critical Path**:
  1. HTML loads `account-profile.html`
  2. React mounts `AccountProfilePage`
  3. Header renders with auth listener
  4. AccountProfilePage calls `checkAuthStatus()` and `validateTokenAndFetchUser()`
- **Dependencies**:
  - `@supabase/supabase-js` for auth
  - Header.jsx for auth state listener
  - AccountProfilePage and its logic hook

## 2. Problem Statement

When a user clicks an expired magic login link (second or later click), the application receives an `otp_expired` error in the URL hash fragment (`#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`). However, the application:

1. Does NOT detect or handle this error
2. Does NOT have a valid Supabase session
3. AccountProfilePage sees no auth state and likely triggers a redirect or reload
4. This creates an infinite loop because the error params remain in the URL hash

**Expected behavior**: User should see a user-friendly error message indicating the magic link has expired and be offered options to request a new link or log in with password.

**Actual behavior**: Page enters an infinite reload loop, user cannot escape to retry login.

## 3. Reproduction Context
- **Environment**: Production (Cloudflare Pages), any browser
- **Steps to reproduce**:
  1. Request a magic login link via SignUpLoginModal
  2. Click the link in email once (successfully logs in)
  3. Click the same link again (OTP has been consumed)
  4. Observe infinite reload loop
- **Expected behavior**: Error message shown, option to retry
- **Actual behavior**: Infinite reload loop
- **Error messages/logs**: URL contains `#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/lib/auth.js` | Core auth functions - no hash error handling |
| `app/src/lib/supabase.js` | Supabase client init - minimal, no error handling |
| `app/src/islands/shared/Header.jsx` | Auth state listener - handles SIGNED_IN but NOT errors |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Magic link generation - sets redirect to `/account-profile/{userId}` |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Page component - shows error state if auth fails |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Logic hook - calls checkAuthStatus, no hash error detection |
| `app/src/islands/pages/ResetPasswordPage.jsx` | Reference for PASSWORD_RECOVERY handling - has timeout fallback |

### 4.2 Execution Flow Trace

```
1. User clicks expired magic link
   ↓
2. Browser navigates to: /account-profile/{userId}#error=access_denied&error_code=otp_expired&error_description=...
   ↓
3. account-profile.html loads, mounts AccountProfilePage
   ↓
4. Header.jsx renders, sets up onAuthStateChange listener
   - Listener waits for SIGNED_IN or INITIAL_SESSION
   - No session fires because OTP is expired/invalid
   ↓
5. AccountProfilePage.jsx renders, calls useAccountProfilePageLogic()
   ↓
6. useAccountProfilePageLogic.initialize() runs:
   - Calls checkAuthStatus() → returns false (no valid session)
   - Calls validateTokenAndFetchUser() → returns null
   - setIsAuthenticated(false)
   ↓
7. getUserIdFromUrl() extracts userId from URL path
   - Returns valid userId from /account-profile/{userId}
   ↓
8. targetUserId is set (from URL), profileUserId is set
   - BUT loggedInUserId is null (not authenticated)
   ↓
9. isEditorView = false (not authenticated)
   isPublicView = true
   ↓
10. Page renders PUBLIC VIEW of the profile
    - But wait... need to trace further
   ↓
11. Header's background validation runs:
    - checkAuthStatus() returns false
    - No Supabase session
    - isProtectedPage() returns TRUE for /account-profile
    - TRIGGERS: window.location.replace('/') at line 128 in Header.jsx
   ↓
12. Page redirects to '/' (home)
   ↓
13. Home page loads but URL still has hash params from original redirect
    - OR the redirect loop occurs elsewhere
```

**CRITICAL FINDING**: The actual loop mechanism needs closer examination. Let me trace further.

**Potential Loop Scenario A**: Header.jsx line 126-131
```javascript
if (isProtectedPage() && !autoShowLogin) {
  console.log('⚠️ Invalid token on protected page - redirecting to home');
  window.location.replace('/');
}
```
This redirects to `/`, but /account-profile IS a protected page, so unauthenticated users get redirected.

**Potential Loop Scenario B**: The AccountProfilePage might render Header, which on detecting no auth + protected page, triggers redirect. But /account-profile with a userId in the URL might not be considered "protected" in the same way - it allows public viewing.

**KEY INSIGHT**: Looking at `isProtectedPage()` in auth.js (lines 1040-1063):
```javascript
const protectedPaths = [
  '/guest-proposals',
  '/host-proposals',
  '/account-profile',  // <-- This IS protected
  ...
];
```

So `/account-profile/{userId}` IS a protected path. When:
1. User lands on protected page with invalid/expired OTP
2. No session is established
3. Header detects protected page + no auth
4. Header redirects to `/`

**But where's the LOOP?**

The hash fragment `#error=access_denied&error_code=otp_expired&...` would be preserved during `window.location.replace('/')` - NO, actually `replace('/')` would NOT preserve the hash unless explicitly included.

Let me reconsider. The issue might be:
1. User clicks link -> `/account-profile/{userId}#error=...`
2. AccountProfilePage loads
3. Supabase client sees hash params and tries to process them
4. Processing fails (expired OTP)
5. Something triggers a reload of the SAME URL (including hash)
6. Step 2-5 repeat infinitely

**REVISED ANALYSIS**: The Supabase client automatically processes URL hash params on initialization. If there's an error, it might:
- Fire an event (what event for errors?)
- Set error state that causes re-initialization
- Or the page logic might trigger a reload thinking it can "retry"

### 4.3 Git History Analysis

Recent magic link commits:
- `8b1e3a1a` (2026-01-05): Add SMS notification to magic login link flow - modified SignUpLoginModal.jsx
- `f55195cb` (2026-01-05): Implement magic login link functionality with dynamic BCC - modified SignUpLoginModal.jsx, send-email edge function

The magic link redirect is set in SignUpLoginModal.jsx line 898:
```javascript
const redirectTo = `${window.location.origin}/account-profile/${userData._id}`;
```

**No changes to error handling were made.** The feature was implemented without considering OTP expiration error handling.

## 5. Hypotheses

### Hypothesis 1: Missing URL Hash Error Detection (Likelihood: 85%)

**Theory**: The application has no code to detect and handle auth error parameters in the URL hash fragment. When Supabase redirects with error params, the page initializes normally, fails auth checks, and the Header's protected page logic kicks in to redirect. However, something is causing repeated loads of the same URL.

**Supporting Evidence**:
- Grep for `otp_expired`, `error_code`, `error_description` found NO matches in app/src
- ResetPasswordPage.jsx handles `PASSWORD_RECOVERY` event but no equivalent for errors
- Header.jsx only handles `SIGNED_IN`, `INITIAL_SESSION`, `SIGNED_OUT` events
- AccountProfilePage has no hash parameter parsing

**Contradicting Evidence**:
- A simple redirect to `/` should not cause a loop - need to identify what reloads the page

**Verification Steps**:
1. Add console.log at page entry to track loads
2. Check if Supabase client fires any events for expired OTP
3. Check browser dev tools Network tab for redirect chain

**Potential Fix**: Add URL hash error detection at the top of the initialization flow in AccountProfilePage or in a centralized location (like auth.js or a new auth error handler)

**Convention Check**: Aligns with project's "no fallback" philosophy - we should surface the error, not silently fail

### Hypothesis 2: Supabase Client Auto-Refresh Loop (Likelihood: 40%)

**Theory**: The Supabase client might be attempting to refresh or retry the session when it detects error parameters, causing repeated page operations.

**Supporting Evidence**:
- Supabase client is initialized in `lib/supabase.js` without specific error handling options
- The client might have internal retry logic

**Contradicting Evidence**:
- Supabase client typically doesn't auto-reload the page
- No `window.location.reload()` calls are triggered by Supabase events

**Verification Steps**:
1. Check Supabase client source/docs for error handling behavior
2. Add logging to onAuthStateChange to see what events fire
3. Check if `detectSessionInUrl` option affects behavior

**Potential Fix**: Configure Supabase client to not auto-process URL on error, or handle errors explicitly

**Convention Check**: Would require understanding Supabase internals

### Hypothesis 3: Protected Page Redirect + Something Re-navigates (Likelihood: 50%)

**Theory**: The Header's protected page logic redirects to `/`, but something else (like query params preserved elsewhere) causes navigation back to the original URL.

**Supporting Evidence**:
- Header.jsx line 126-128 redirects unauth users on protected pages to `/`
- The `days-selected` query param suggests this is happening during a booking flow
- Some component might be reading and re-navigating based on stored state

**Contradicting Evidence**:
- `window.location.replace('/')` should not preserve hash or cause loop
- No obvious "return to" logic that would redirect back

**Verification Steps**:
1. Check localStorage for any redirect/return URL storage
2. Add logging before and after the redirect in Header.jsx
3. Check if any other component is managing navigation state

**Potential Fix**: Clear any stored navigation state before redirecting

**Convention Check**: Need to ensure we're not inadvertently storing problematic state

### Hypothesis 4: AccountProfilePage Redirect Logic (Likelihood: 35%)

**Theory**: The AccountProfilePage or its logic hook might have its own redirect logic that conflicts with Header's redirect.

**Supporting Evidence**:
- useAccountProfilePageLogic.js line 507-509 throws error if no targetUserId and not logged in:
  ```javascript
  if (!targetUserId) {
    throw new Error('Please log in to view your profile...');
  }
  ```
  But this shows error state, not redirect.

**Contradicting Evidence**:
- The logic shows error state rather than redirecting
- targetUserId comes from URL, so it would be present

**Verification Steps**:
1. Add logging throughout initialize() function
2. Check what happens when error is thrown

**Potential Fix**: N/A if this is not the cause

**Convention Check**: The error handling shows proper error state, which aligns with conventions

### Hypothesis 5: Browser Back-Forward Cache + Hash Processing (Likelihood: 25%)

**Theory**: The browser's bfcache might be interacting with Supabase's hash processing in an unexpected way, causing the page to reload when navigating.

**Supporting Evidence**:
- Modern browsers aggressively cache pages
- Hash params persist across certain navigation types

**Contradicting Evidence**:
- This would be a very edge case
- User reports suggest consistent reproduction

**Verification Steps**:
1. Disable bfcache in dev tools and test
2. Check if issue occurs in incognito mode

**Potential Fix**: Add pageshow event handling to detect bfcache restores

**Convention Check**: This would be infrastructure-level handling

## 6. Recommended Action Plan

### Priority 1 (Try First): Add URL Hash Error Detection and Handling

**Specific Implementation Details**:

1. Create a new utility function in `app/src/lib/auth.js`:
```javascript
/**
 * Check URL hash for Supabase auth errors
 * Returns error info if present, null otherwise
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
 */
export function clearAuthErrorFromUrl() {
  // Replace hash with empty to clear error params
  // Use replaceState to not add to browser history
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
```

2. Modify `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`:

At the start of `initialize()` function (around line 477):
```javascript
async function initialize() {
  try {
    // FIRST: Check for auth errors in URL hash (e.g., expired magic link)
    const authError = checkUrlForAuthError();
    if (authError) {
      console.log('[AccountProfile] Auth error detected in URL:', authError);

      // Clear the error from URL to prevent re-processing
      clearAuthErrorFromUrl();

      // Set user-friendly error message
      let errorMessage = 'Authentication failed. ';
      if (authError.errorCode === 'otp_expired') {
        errorMessage = 'This magic login link has expired or already been used. Please request a new login link.';
      } else if (authError.errorDescription) {
        errorMessage = authError.errorDescription;
      }

      throw new Error(errorMessage);
    }

    // ... rest of existing initialize code
  }
}
```

3. Optionally, add a global handler in `app/src/main.jsx` (entry point for home page) to catch errors if user is redirected there:
```javascript
// At the top of the entry point, check for lingering auth errors
import { checkUrlForAuthError, clearAuthErrorFromUrl } from './lib/auth.js';

const authError = checkUrlForAuthError();
if (authError) {
  console.log('[Main] Auth error in URL, clearing:', authError);
  clearAuthErrorFromUrl();
  // Optionally show a toast or notification
}
```

**Files to Modify**:
- `app/src/lib/auth.js` - Add `checkUrlForAuthError()` and `clearAuthErrorFromUrl()` functions
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` - Add error detection at start of initialize()
- Optionally: `app/src/main.jsx` and other entry points for cleanup

### Priority 2 (If Priority 1 Fails): Prevent Redirect Loop

If the root cause is elsewhere, add a loop-prevention mechanism:

1. In Header.jsx, before redirecting:
```javascript
// Before the redirect at line 128
if (isProtectedPage() && !autoShowLogin) {
  // Check if we're already in a redirect situation (e.g., auth error in hash)
  const authError = checkUrlForAuthError();
  if (authError) {
    console.log('⚠️ Auth error present, not redirecting to prevent loop');
    // Let the page handle the error
    return;
  }

  console.log('⚠️ Invalid token on protected page - redirecting to home');
  window.location.replace('/');
}
```

### Priority 3 (Deeper Investigation): Debug the Actual Loop Mechanism

If the loop persists after Priority 1 and 2:

1. Add comprehensive logging:
```javascript
// At top of each entry point
console.log('=== PAGE LOAD ===');
console.log('URL:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Referrer:', document.referrer);
console.log('================');
```

2. Use browser dev tools:
   - Network tab: Watch for redirect patterns
   - Application tab: Check localStorage/sessionStorage for redirect state
   - Console: Watch for repeated logs

3. Check if Supabase client configuration affects behavior:
```javascript
// In lib/supabase.js, try:
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true, // Should be true by default
    flowType: 'pkce', // Try 'implicit' if PKCE causes issues
    autoRefreshToken: true,
    persistSession: true
  }
});
```

## 7. Prevention Recommendations

1. **Add Auth Error Handling Pattern**: Create a standardized pattern for handling all Supabase auth errors in URL hash, similar to how `PASSWORD_RECOVERY` is handled in ResetPasswordPage.

2. **Document Magic Link Flow**: Update `.claude/Documentation/Auth/LOGIN_FLOW.md` to include magic link flow and error handling.

3. **Add Test Cases**: Create manual test checklist for:
   - Fresh magic link click (should succeed)
   - Expired magic link click (should show error)
   - Already-used magic link click (should show error)
   - Invalid magic link click (should show error)

4. **Consider Centralized Auth Error Handler**: Instead of handling in each page, create a higher-order component or custom hook that all pages use to detect and handle auth errors.

5. **Add Error Boundary**: Implement React Error Boundary around auth-dependent components to catch and display errors gracefully.

## 8. Related Files Reference

### Files That Need Modification
| File | Line Numbers | Change Description |
|------|-------------|---------------------|
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | End of file | Add `checkUrlForAuthError()` and `clearAuthErrorFromUrl()` functions |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\AccountProfilePage\useAccountProfilePageLogic.js` | ~477-485 | Add auth error detection at start of `initialize()` |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\Header.jsx` | ~126-131 | Optionally add auth error check before redirect |

### Files for Reference (No Changes Needed)
| File | Purpose |
|------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\pages\ResetPasswordPage.jsx` | Reference for PASSWORD_RECOVERY handling pattern |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` | Supabase client initialization |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` | Magic link generation (lines 830-1022) |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\LOGIN_FLOW.md` | Auth documentation to update |

### Entry Points That May Need Cleanup Handler
| File | Route |
|------|-------|
| `c:\Users\Split Lease\Documents\Split Lease\app\src\main.jsx` | `/` (home) |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\account-profile.jsx` | `/account-profile/{userId}` |
