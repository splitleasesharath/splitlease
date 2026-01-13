# Debug Analysis: Google OAuth Signup Fails with "Not a Google OAuth session"

**Created**: 2026-01-13T06:59:21
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Authentication - Google OAuth Signup Flow

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Auth (native), Supabase Edge Functions (Deno), Cloudflare Pages
- **Data Flow**:
  1. User clicks "Sign up with Google" in SignUpLoginModal
  2. `initiateGoogleOAuth(userType)` stores userType in localStorage and calls `supabase.auth.signInWithOAuth`
  3. User is redirected to Google, authenticates, returns to `/account-profile`
  4. SignUpLoginModal's useEffect detects OAuth callback via localStorage flag + URL tokens
  5. `handleGoogleOAuthCallback()` validates the session and calls Edge Function for user record creation

### 1.2 Domain Context
- **Feature Purpose**: Allow users to sign up with their Google account instead of email/password
- **Related Documentation**:
  - `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\SIGNUP_FLOW.md`
  - `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\LOGIN_FLOW.md`
- **Data Model**:
  - Supabase `auth.users` table (managed by Supabase Auth)
  - `public.user` table (application user profile)
  - `account_host` / `account_guest` tables (role-specific accounts)

### 1.3 Relevant Conventions
- **OAuth Flow Differentiation**:
  - Signup flow: `setGoogleOAuthUserType(userType)` stores "Host" or "Guest" before redirect
  - Login flow: `setGoogleOAuthLoginFlow(true)` flags it as a login attempt
- **Provider Validation**: Code checks `user.app_metadata.provider === 'google'`
- **Layer Boundaries**: Frontend handles OAuth initiation/callback detection; Edge Function handles user record creation

### 1.4 Entry Points & Dependencies
- **User Entry Point**: SignUpLoginModal.jsx "Sign up with Google" button
- **Critical Path**:
  1. `initiateGoogleOAuth(userType)` - `app/src/lib/auth.js:1686`
  2. Google OAuth redirect
  3. SignUpLoginModal.jsx useEffect callback detection - lines 900-972
  4. `handleGoogleOAuthCallback()` - `app/src/lib/auth.js:1720`
  5. Provider validation - `app/src/lib/auth.js:1736-1740`
- **Dependencies**:
  - `supabase.auth.signInWithOAuth` (Supabase JS client)
  - `supabase.auth.getSession` (session retrieval after redirect)
  - localStorage for OAuth flow flags

## 2. Problem Statement

Google OAuth **signup** fails with the error "Not a Google OAuth session" at line 1739 of `app/src/lib/auth.js`, even though:
1. The user successfully authenticates with Google
2. Supabase receives the OAuth callback and creates a session
3. Google OAuth **login** works correctly using the same provider validation logic

The symptom is:
- User redirected to `/account-profile#` (no user_id in URL)
- Toast shows: "Signup Failed - Not a Google OAuth session"
- Page shows: "Unable to load profile - User not found"

## 3. Reproduction Context
- **Environment**: Production (splitlease.com) and/or Development
- **Steps to reproduce**:
  1. Open SignUpLoginModal (click "Sign Up" in header)
  2. Select user type (Host or Guest)
  3. Click "Sign up with Google" button
  4. Complete Google authentication
  5. Return to app - observe error
- **Expected behavior**: User is redirected to `/account-profile/{user_id}` with success toast, new user record created
- **Actual behavior**: Toast shows "Signup Failed - Not a Google OAuth session", page shows error state
- **Error messages/logs**:
  - Toast: "Signup Failed - Not a Google OAuth session"
  - Page: "Unable to load profile - User not found"
  - Console: `[Auth] Handling Google OAuth callback`

## 4. Investigation Summary

### 4.1 Files Examined

| File | Lines | Relevance |
|------|-------|-----------|
| `app/src/lib/auth.js` | 1686-1711, 1720-1811, 1819-1849, 1857-1900+ | Google OAuth functions (initiate, callback handlers) |
| `app/src/lib/auth.js` | 1391-1424, 1432-1523, 1531-1561, 1569-1673 | LinkedIn OAuth functions (for comparison) |
| `app/src/lib/secureStorage.js` | 357-404 | Google OAuth storage functions |
| `app/src/islands/shared/SignUpLoginModal.jsx` | 900-972 | OAuth callback detection useEffect |
| `app/src/lib/oauthCallbackHandler.js` | full file | Global OAuth login callback handler |

### 4.2 Execution Flow Trace

#### Signup Flow (FAILING)
```
1. User clicks "Sign up with Google"
2. initiateGoogleOAuth('Guest') called - auth.js:1686
   └─ setGoogleOAuthUserType('Guest') - stores in localStorage
   └─ supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/account-profile' })
   └─ User redirected to Google

3. User authenticates with Google

4. User redirected back to /account-profile#access_token=...

5. SignUpLoginModal useEffect runs - lines 900-972
   └─ getGoogleOAuthUserType() returns 'Guest' (flag exists)
   └─ hasAccessToken in URL hash - true
   └─ isGoogleCallback = true (based on googleUserType existing)
   └─ handleGoogleOAuthCallback() called - auth.js:1720

6. handleGoogleOAuthCallback() - auth.js:1720
   └─ supabase.auth.getSession() - gets session with user
   └─ user.app_metadata.provider checked - LINE 1736
   └─ isGoogleProvider = (user.app_metadata.provider === 'google')
   └─ IF NOT GOOGLE PROVIDER → returns { success: false, error: 'Not a Google OAuth session' }
```

#### Login Flow (WORKING)
```
1. User clicks "Log in with Google"
2. initiateGoogleOAuthLogin() called - auth.js:1819
   └─ clearGoogleOAuthUserType() - clears any signup flag
   └─ setGoogleOAuthLoginFlow(true) - sets login flag
   └─ supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: currentPage })

3. User authenticates with Google

4. User redirected back to original page

5. oauthCallbackHandler.js processes the callback
   └─ getGoogleOAuthLoginFlow() returns true
   └─ hasOAuthTokensInUrl() returns true
   └─ handleGoogleOAuthLoginCallback() called - auth.js:1857

6. handleGoogleOAuthLoginCallback() - auth.js:1857
   └─ supabase.auth.getSession() - gets session with user
   └─ user.app_metadata.provider checked - LINE 1880
   └─ isGoogleProvider = (user.app_metadata.provider === 'google')
   └─ IF NOT GOOGLE PROVIDER → returns error (same check)
```

### 4.3 Git History Analysis

Recent commits affecting OAuth:
- `52b06490` - "feat(auth): Add Google OAuth buttons to SignUpLoginModal" - Added Google OAuth
- `e0a4c2b3` - "feat(auth): Add Google OAuth authentication functions" - Core implementation
- `9803c710` - "feat(auth): Add Google OAuth storage functions" - Storage keys
- `baac4f51` - "style(signup-modal): Display LinkedIn and Google OAuth buttons side by side"

The Google OAuth implementation was recently added, modeled after the working LinkedIn OAuth flow.

## 5. Hypotheses

### Hypothesis 1: `app_metadata.provider` vs `app_metadata.providers` Array (Likelihood: 85%)

**Theory**: Supabase Auth stores provider information differently depending on whether the user is NEW vs EXISTING:

- **NEW user (signup)**: `app_metadata.provider` may not be immediately set to `'google'` OR may be stored as `providers: ['google']` (array) instead of `provider: 'google'` (string)
- **EXISTING user (login)**: `app_metadata.provider` is already set from the original signup

Based on Supabase documentation research:
- `app_metadata.provider` = The **original/first** provider the user signed up with
- `app_metadata.providers` = Array of **all** linked providers

**For a brand new OAuth signup**, the user record is created during the OAuth flow. The `provider` field should be populated, but there may be a timing issue where the field isn't immediately available when we call `getSession()`.

**Supporting Evidence**:
- Login works (existing user already has `provider` set)
- Signup fails (new user may not have `provider` set yet)
- Same validation code used in both flows

**Contradicting Evidence**:
- LinkedIn signup uses identical check (`user.app_metadata.provider === 'linkedin_oidc'`) and reportedly works

**Verification Steps**:
1. Add console.log to dump `user.app_metadata` structure during signup callback
2. Check if `user.app_metadata.providers` array exists and contains 'google'
3. Compare the session object structure between signup and login callbacks

**Potential Fix**:
```javascript
// Instead of:
const isGoogleProvider = user?.app_metadata?.provider === 'google';

// Use:
const isGoogleProvider =
  user?.app_metadata?.provider === 'google' ||
  user?.app_metadata?.providers?.includes('google');
```

**Convention Check**: This aligns with Supabase's documented behavior where `providers` is an array.

---

### Hypothesis 2: Session Retrieval Timing Issue (Likelihood: 50%)

**Theory**: When `supabase.auth.getSession()` is called immediately after OAuth redirect, Supabase may still be processing the tokens from the URL hash. The session might exist but the user metadata may not be fully populated yet.

In `oauthCallbackHandler.js:79-80`, there's a 100ms delay before calling the login callback handler:
```javascript
// Wait a moment for Supabase to process the OAuth tokens from URL hash
await new Promise(resolve => setTimeout(resolve, 100));
```

However, in `handleGoogleOAuthCallback()` (signup), there is NO such delay.

**Supporting Evidence**:
- Login flow has explicit 100ms delay in `oauthCallbackHandler.js`
- Signup flow (in SignUpLoginModal useEffect) has no delay

**Contradicting Evidence**:
- LinkedIn signup uses the same pattern without delay and reportedly works

**Verification Steps**:
1. Add delay before `getSession()` in `handleGoogleOAuthCallback()`
2. Log session state before and after delay
3. Compare timing between LinkedIn and Google OAuth flows

**Potential Fix**:
```javascript
export async function handleGoogleOAuthCallback() {
  console.log('[Auth] Handling Google OAuth callback');

  // Wait for Supabase to process OAuth tokens
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get the session from OAuth callback
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  // ...
}
```

**Convention Check**: Adding explicit timing waits is a workaround, but acceptable for OAuth flows.

---

### Hypothesis 3: Google Provider Name Mismatch (Likelihood: 30%)

**Theory**: Google's provider name in Supabase might be different from 'google'. LinkedIn uses 'linkedin_oidc' (not just 'linkedin'), so Google might use a variant like 'google_oauth' or similar.

**Supporting Evidence**:
- LinkedIn uses 'linkedin_oidc' not 'linkedin'
- Supabase may have changed provider naming conventions

**Contradicting Evidence**:
- Supabase documentation shows 'google' as the provider name
- `signInWithOAuth({ provider: 'google' })` uses 'google' as the provider parameter

**Verification Steps**:
1. Log the actual value of `user.app_metadata.provider` during callback
2. Check Supabase documentation for exact provider names
3. Query the `auth.identities` table to see actual provider values

**Potential Fix**:
```javascript
// If the provider name is different:
const isGoogleProvider = user?.app_metadata?.provider?.includes('google');
```

**Convention Check**: Provider names should match Supabase's naming convention.

---

### Hypothesis 4: Existing User with Different Provider (Likelihood: 20%)

**Theory**: If the user already exists in Supabase Auth (e.g., signed up via email/password or LinkedIn), and they try to "sign up" with Google, Supabase performs identity linking instead of creating a new user. The `app_metadata.provider` would still show the ORIGINAL provider, not 'google'.

**Supporting Evidence**:
- Supabase auto-links identities with matching email addresses
- `provider` field shows the original signup method, not current login method

**Contradicting Evidence**:
- The error suggests this is happening for genuinely new users too
- If this were the case, the user would still exist and the flow should succeed

**Verification Steps**:
1. Test with a completely new email address never used before
2. Check if the email exists in `auth.users` before the OAuth attempt
3. Log whether `isNewUser` flag is set in the callback result

**Potential Fix**:
- Check `providers` array instead of `provider` field
- Handle identity linking scenario gracefully

**Convention Check**: Identity linking is expected Supabase behavior.

---

### Hypothesis 5: Callback Detection Race Condition (Likelihood: 15%)

**Theory**: The SignUpLoginModal useEffect that detects OAuth callbacks might be running before Supabase has processed the tokens, OR another component/handler is processing the callback first and clearing the session state.

**Supporting Evidence**:
- Multiple OAuth handlers exist (SignUpLoginModal for signup, oauthCallbackHandler.js for login)
- Both check for tokens in URL but have different trigger conditions

**Contradicting Evidence**:
- Signup and login flows use different localStorage flags
- The useEffect has `[]` dependency array (runs once)

**Verification Steps**:
1. Add logging to trace the order of callback handler execution
2. Check if the access_token is still in URL when `getSession()` is called
3. Verify localStorage flags aren't being cleared prematurely

**Potential Fix**:
- Add mutex/lock for OAuth callback processing
- Ensure only one handler processes the callback

**Convention Check**: Multiple handlers for different flows is reasonable, but needs clear separation.

## 6. Recommended Action Plan

### Priority 1 (Try First): Fix Provider Validation to Include `providers` Array

**Rationale**: Most likely cause based on Supabase's documented behavior.

**Implementation**:

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js`

**Location**: Lines 1736-1740 (and similar at lines 1880, 1448, 1592 for consistency)

**Change**:
```javascript
// OLD (line 1736):
const isGoogleProvider = user?.app_metadata?.provider === 'google';

// NEW:
const isGoogleProvider =
  user?.app_metadata?.provider === 'google' ||
  user?.app_metadata?.providers?.includes('google');
```

Apply the same pattern to:
- `handleGoogleOAuthCallback()` line 1736
- `handleGoogleOAuthLoginCallback()` line 1880
- `handleLinkedInOAuthCallback()` line 1448 (add providers array check for consistency)
- `handleLinkedInOAuthLoginCallback()` line 1592 (add providers array check)

**Testing**:
1. Test Google signup with new email
2. Test Google login with existing user
3. Test Google signup where email matches existing non-Google user
4. Verify LinkedIn flows still work

---

### Priority 2 (If Priority 1 Fails): Add Debug Logging and Session Delay

**Rationale**: If the provider field IS correct, we need more visibility.

**Implementation**:

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js`

**Location**: `handleGoogleOAuthCallback()` lines 1720-1741

**Change**:
```javascript
export async function handleGoogleOAuthCallback() {
  console.log('[Auth] Handling Google OAuth callback');

  // Add delay for Supabase to process OAuth tokens (matching login flow pattern)
  await new Promise(resolve => setTimeout(resolve, 150));

  // Get the session from OAuth callback
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    clearGoogleOAuthUserType();
    return {
      success: false,
      error: sessionError?.message || 'No session found after OAuth'
    };
  }

  // DEBUG: Log the full user object structure
  const user = session.user;
  console.log('[Auth] Google OAuth user object:', JSON.stringify({
    id: user.id,
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    identities: user.identities?.map(i => ({ provider: i.provider, identity_id: i.identity_id }))
  }, null, 2));

  // Check provider with both singular and array forms
  const isGoogleProvider =
    user?.app_metadata?.provider === 'google' ||
    user?.app_metadata?.providers?.includes('google');

  console.log('[Auth] Provider check result:', {
    provider: user?.app_metadata?.provider,
    providers: user?.app_metadata?.providers,
    isGoogleProvider
  });

  if (!isGoogleProvider) {
    return { success: false, error: 'Not a Google OAuth session' };
  }
  // ... rest of function
}
```

---

### Priority 3 (Deeper Investigation): Query Supabase Auth Tables Directly

**Rationale**: If the issue persists, we need to see the actual database state.

**Steps**:
1. After a failed signup attempt, query the `auth.users` table via Supabase MCP
2. Check `raw_app_meta_data` and `raw_user_meta_data` columns
3. Query `auth.identities` table to see linked identities
4. Compare with a successful LinkedIn signup

**SQL Queries**:
```sql
-- Check user by email
SELECT id, email, raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE email = 'test@example.com';

-- Check identities
SELECT * FROM auth.identities
WHERE user_id = '<user_id>';
```

## 7. Prevention Recommendations

1. **Standardize Provider Validation**: Create a utility function that handles both `provider` and `providers` fields:
```javascript
// lib/authUtils.js
export function isOAuthProvider(user, providerName) {
  const metadata = user?.app_metadata;
  return metadata?.provider === providerName ||
         metadata?.providers?.includes(providerName);
}
```

2. **Add Integration Tests**: Create tests for OAuth flows using mocked Supabase responses that cover:
   - New user signup (provider in both formats)
   - Existing user login
   - Identity linking scenarios

3. **Document Supabase Auth Metadata Structure**: Add documentation about expected `app_metadata` structure in `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\`

4. **Add Observability**: Log OAuth flow events to Slack (via existing Slack integration) for debugging production issues.

## 8. Related Files Reference

### Primary Files to Modify
| File | Lines | Purpose |
|------|-------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | 1736-1740 | Google signup provider check |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | 1880 | Google login provider check |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | 1448 | LinkedIn signup provider check |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\auth.js` | 1592 | LinkedIn login provider check |

### Supporting Files
| File | Purpose |
|------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\secureStorage.js` | OAuth flow localStorage functions |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\lib\oauthCallbackHandler.js` | Global OAuth login handler |
| `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` | OAuth callback detection useEffect |

### Documentation Files
| File | Purpose |
|------|---------|
| `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\SIGNUP_FLOW.md` | Signup flow documentation |
| `c:\Users\Split Lease\Documents\Split Lease\.claude\Documentation\Auth\LOGIN_FLOW.md` | Login flow documentation |
