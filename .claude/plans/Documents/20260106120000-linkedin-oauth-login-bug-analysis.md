# LinkedIn OAuth Login Flow - Root Cause Analysis

**Date**: 2026-01-06
**Issue**: Users not logged in after completing LinkedIn OAuth flow
**Status**: Root cause identified, fix pending

---

## Symptoms

- User enters correct LinkedIn credentials during OAuth flow
- OAuth flow completes and redirects user back to `/account-profile`
- User is NOT authenticated/logged in to split.lease
- No error messages visible to user

---

## Root Cause Identified

The **LinkedIn OAuth callback is not being processed** on the `/account-profile` page after the OAuth redirect.

### Why This Happens

1. **OAuth Flow Completes**: Supabase redirects user back to `/account-profile` with valid OAuth session
2. **Frontend Receives Session**: The Supabase Auth client has a valid `session` with OAuth credentials
3. **Missing Callback Handler**: The `AccountProfilePage` does NOT call `handleLinkedInOAuthLoginCallback()`
4. **Result**: Session exists but tokens are never stored in localStorage or secureStorage
5. **Authentication Fails**: Without stored tokens, `checkAuthStatus()` finds no authentication

---

## Evidence from Code Analysis

### Backend Handler (Working Correctly)

**File**: `supabase/functions/auth-user/handlers/oauthLogin.ts`

```typescript
export async function handleOAuthLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: OAuthLoginPayload
): Promise<any> {
  // ✅ Validates user exists
  // ✅ Updates Supabase Auth metadata
  // ✅ Returns session data with tokens
  return {
    user_id: existingUser._id,
    supabase_user_id: supabaseUserId,
    user_type: userType,
    access_token,    // ← Session token returned
    refresh_token,
    // ... other fields
  };
}
```

**Status**: Edge Function works correctly. Returns all necessary tokens and user data.

---

### Frontend OAuth Handlers (Implemented but Not Called)

**File**: `app/src/lib/auth.js`

#### `handleLinkedInOAuthSignupCallback()` - ✅ Implemented

```javascript
export async function handleLinkedInOAuthCallback() {
  // ✅ Checks if OAuth session exists
  // ✅ Calls oauth_signup action on auth-user Edge Function
  // ✅ Stores tokens in secureStorage
  // ✅ Used by SignUpLoginModal during signup flow
}
```

#### `handleLinkedInOAuthLoginCallback()` - ✅ Implemented

```javascript
export async function handleLinkedInOAuthLoginCallback() {
  // ✅ Checks if OAuth login flow
  // ✅ Calls oauth_login action on auth-user Edge Function
  // ✅ Stores tokens in secureStorage and auth state
  // ✅ NOT CALLED anywhere - **THIS IS THE BUG**
}
```

---

### Frontend OAuth Callback Missing on /account-profile

**File**: `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`

The `useAccountProfilePageLogic` hook initialization does:

```javascript
useEffect(() => {
  async function initialize() {
    // ✅ Check for auth errors
    const authError = checkUrlForAuthError();
    
    // ✅ Check if authenticated
    const isAuthenticated = await checkAuthStatus();
    
    // ❌ MISSING: Check if OAuth callback from LinkedIn
    //    Should call: await handleLinkedInOAuthLoginCallback()
    
    // Fetch profile data...
  }
}, []);
```

**Problem**: When user is redirected from LinkedIn OAuth, `checkAuthStatus()` returns `false` because:
1. Supabase Auth has the OAuth session in memory
2. But `secureStorage` and `localStorage` are still empty
3. `checkAuthStatus()` only checks `secureStorage` and localStorage, not Supabase Auth session
4. Without the callback handler, tokens never get stored

---

## Data Flow Comparison

### Signup Flow (Works) ✅

```
LinkedIn OAuth Redirect → /signup (account-profile)
                              ↓
                  SignUpLoginModal.jsx
                              ↓
              handleLinkedInOAuthCallback() [Signup]
                              ↓
          Call oauth_signup on auth-user Edge Function
                              ↓
          Receive: user_id, access_token, refresh_token
                              ↓
        Store tokens in secureStorage & auth state
                              ↓
              User logged in ✅
```

### Login Flow (Broken) ❌

```
LinkedIn OAuth Redirect → /account-profile page
                              ↓
              useAccountProfilePageLogic()
                              ↓
    checkAuthStatus() → looks for tokens → NONE FOUND ❌
                              ↓
              User appears not logged in
                              ↓
    handleLinkedInOAuthLoginCallback() NEVER CALLED ❌
                              ↓
        Tokens never stored, user not authenticated
```

---

## Critical Finding

The redirect URL in `initiateLinkedInOAuthLogin()`:

```javascript
export async function initiateLinkedInOAuthLogin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      // ❌ WRONG: Stays on current page instead of account-profile
      redirectTo: window.location.href,
      scopes: 'openid profile email',
    }
  });
}
```

**Issue**: If user clicks LinkedIn OAuth login from anywhere OTHER than `/account-profile`, the redirect won't be handled properly because:
- If redirected to `/search`, the SearchPage doesn't check for OAuth
- If redirected to `/`, the HomePage doesn't check for OAuth
- Only `/account-profile` exists BUT it doesn't have the callback handler

---

## Solution Required

### Fix 1: Add OAuth Callback Handler to AccountProfilePage

In `useAccountProfilePageLogic.js`, during initialization:

```javascript
useEffect(() => {
  async function initialize() {
    // Check for OAuth login callback (LinkedIn)
    const loginFlowFlag = getLinkedInOAuthLoginFlow();
    if (loginFlowFlag) {
      const oauthResult = await handleLinkedInOAuthLoginCallback();
      if (oauthResult.success) {
        // User logged in via OAuth, proceed to profile load
      } else {
        // Handle OAuth error
      }
    }
    
    // ... rest of initialization
  }
}, []);
```

### Fix 2: Alternative - Set Correct Redirect URL

Change `initiateLinkedInOAuthLogin()` to redirect to `/account-profile` explicitly:

```javascript
redirectTo: `${window.location.origin}/account-profile`,
```

---

## Files Involved

### Backend (Working)
- `supabase/functions/auth-user/handlers/oauthLogin.ts` - Edge Function handler ✅
- `supabase/functions/auth-user/index.ts` - Router ✅

### Frontend (Broken)
- `app/src/lib/auth.js` - `handleLinkedInOAuthLoginCallback()` function exists but NOT called ❌
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` - Missing callback invocation ❌
- `app/src/islands/shared/SignUpLoginModal.jsx` - Has callback for signup (for reference) ✅

### Frontend (Supporting)
- `app/src/lib/secureStorage.js` - Token storage (works correctly) ✅
- `app/src/account-profile.jsx` - Entry point to /account-profile ✅

---

## Next Steps

1. **Implement the fix** in `useAccountProfilePageLogic.js`
2. **Test the OAuth flow** locally
3. **Verify tokens are stored** after redirect
4. **Confirm user is logged in** after OAuth completes

---

## Impact Assessment

- **User Impact**: HIGH - Users cannot login via LinkedIn
- **Scope**: LinkedIn OAuth login only (signup works)
- **Breaking Change**: No
- **Existing Data**: Safe - only affects new OAuth logins
