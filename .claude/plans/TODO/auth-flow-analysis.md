# Auth Flow Analysis - Signup & Login Processes

**Date**: 2026-01-14
**Purpose**: Analyze all authentication flows to identify where `auth.users` and `public.user` records are created/updated

---

## 1. Flow Comparison Table

| Flow | Creates auth.users | Creates public.user | Sets user_metadata.user_id | Handles Missing public.user |
|------|-------------------|--------------------|-----------------------------|----------------------------|
| **Native Signup** | ✅ Yes (explicit) | ✅ Yes | ✅ Yes (at creation) | N/A (new user) |
| **Native Login** | ❌ No (already exists) | ❌ No | ❌ No | ⚠️ Falls back to UUID |
| **OAuth Signup** | ✅ Auto (by Supabase) | ✅ Yes (edge function) | ✅ Yes (edge function) | N/A (new user) |
| **OAuth Login** | ❌ No (already exists) | ❌ No | ✅ Updates if exists | ⚠️ Returns userNotFound |

---

## 2. Detailed Flow Analysis

### 2.1 Native Signup (`signup.ts`)

**Trigger**: User fills email/password form and clicks "Sign Up"

| Step | Action | File/Line | Result |
|------|--------|-----------|--------|
| 1 | Check email not in `public.user` | `signup.ts:129-145` | Block if exists |
| 2 | Check email not in `auth.users` | `signup.ts:149-170` | Block if exists |
| 3 | Generate Bubble-style ID | `signup.ts:178` | `1768xxx...` format |
| 4 | Create `auth.users` with `user_metadata` | `signup.ts:194-207` | ✅ `user_id` set |
| 5 | Sign in to get tokens | `signup.ts:225-238` | Session created |
| 6 | Insert into `public.user` | `signup.ts:286-288` | ✅ Record created |
| 7 | Queue Bubble sync | `signup.ts:314` | Background task |

**Status**: ✅ **CORRECT** - Both records created with proper linking

---

### 2.2 Native Login (`login.ts`)

**Trigger**: User fills email/password form and clicks "Log In"

| Step | Action | File/Line | Result |
|------|--------|-----------|--------|
| 1 | Authenticate via Supabase Auth | `login.ts:49-66` | Get session |
| 2 | Fetch from `public.user` by email | `login.ts:82-86` | May return null |
| 3 | Determine user_id | `login.ts:94` | ⚠️ Fallback chain |

**user_id Resolution (Line 94)**:
```typescript
let userId = userProfile?._id || authUser.user_metadata?.user_id || authUser.id;
```

| Priority | Source | ID Format | Works? |
|----------|--------|-----------|--------|
| 1 | `public.user._id` | Bubble-style | ✅ |
| 2 | `user_metadata.user_id` | Bubble-style | ✅ |
| 3 | `authUser.id` (UUID) | `476622df-...` | ❌ Breaks validate |

**Status**: ⚠️ **ISSUE** - If `public.user` missing AND `user_metadata.user_id` missing, returns Supabase UUID which breaks downstream validation

---

### 2.3 OAuth Signup - Edge Function (`oauthSignup.ts`)

**Trigger**: Called by client after OAuth redirect (signup flow)

| Step | Action | File/Line | Result |
|------|--------|-----------|--------|
| 1 | Check email in `public.user` | `oauthSignup.ts:90-94` | Return isDuplicate if exists |
| 2 | Generate Bubble-style ID | `oauthSignup.ts:117` | `1768xxx...` format |
| 3 | Insert into `public.user` | `oauthSignup.ts:157-159` | ✅ Record created |
| 4 | Update `auth.users` metadata | `oauthSignup.ts:174-185` | ✅ `user_id` set |
| 5 | Queue Bubble sync | `oauthSignup.ts:196` | Background task |

**Status**: ✅ **CORRECT** - Creates public.user AND updates user_metadata

---

### 2.4 OAuth Login - Edge Function (`oauthLogin.ts`)

**Trigger**: Called by client after OAuth redirect (login flow)

| Step | Action | File/Line | Result |
|------|--------|-----------|--------|
| 1 | Check email in `public.user` | `oauthLogin.ts:59-63` | Return userNotFound if missing |
| 2 | Update `auth.users` metadata | `oauthLogin.ts:98-109` | ✅ Sets user_id from public.user |

**Status**: ✅ **CORRECT** - Updates metadata if user exists, returns error if missing

---

### 2.5 OAuth Signup - Client Side (`auth.js` + `SignUpLoginModal.jsx`)

**Trigger**: User clicks "Continue with LinkedIn/Google" on SIGNUP form

| Step | Action | File | Result |
|------|--------|------|--------|
| 1 | Store userType in localStorage | `auth.js:1402` (LinkedIn) / `auth.js:1694` (Google) | `splitlease_linkedin_oauth_user_type` |
| 2 | Redirect to OAuth provider | `supabase.auth.signInWithOAuth()` | User leaves app |
| 3 | User authenticates with provider | External | `auth.users` created by Supabase |
| 4 | Redirect back to app | Provider → App | URL has tokens |
| 5 | **Detect callback in SignUpLoginModal** | `SignUpLoginModal.jsx:901-907` | ⚠️ Depends on localStorage flag |
| 6 | Call `handleLinkedInOAuthCallback()` | `auth.js:1432` | Calls `oauth_signup` edge function |
| 7 | Edge function creates `public.user` | `oauthSignup.ts:157` | ✅ Record created |

**Critical Dependency (Line 907 in SignUpLoginModal.jsx)**:
```javascript
if (!linkedInUserType && !googleUserType) return;  // SKIPS IF FLAG MISSING
```

**Status**: ⚠️ **FRAGILE** - Entire flow depends on localStorage flag surviving OAuth redirect

---

### 2.6 OAuth Login - Client Side (`auth.js` + `oauthCallbackHandler.js`)

**Trigger**: User clicks "Continue with LinkedIn/Google" on LOGIN form

| Step | Action | File | Result |
|------|--------|------|--------|
| 1 | Set login flow flag | `auth.js:1540` / `auth.js:1806` | `splitlease_linkedin_oauth_login_flow` |
| 2 | Redirect to OAuth provider | `supabase.auth.signInWithOAuth()` | User leaves app |
| 3 | User authenticates with provider | External | `auth.users` created if new |
| 4 | Redirect back to app | Provider → App | URL has tokens |
| 5 | **Detect callback in oauthCallbackHandler** | `oauthCallbackHandler.js:61-66` | ⚠️ Depends on localStorage flag |
| 6 | Call `handleLinkedInOAuthLoginCallback()` | `auth.js:1571` | Calls `oauth_login` edge function |
| 7 | Edge function returns userNotFound if no public.user | `oauthLogin.ts:73-77` | ⚠️ User stuck |

**Critical Dependency (Line 64-66 in oauthCallbackHandler.js)**:
```javascript
if (!isLinkedInLoginFlow && !isGoogleLoginFlow) {
  return { processed: false, reason: 'not_login_flow' };  // SKIPS IF FLAG MISSING
}
```

**Status**: ⚠️ **FRAGILE** - Same localStorage dependency issue

---

## 3. The Root Cause: localStorage Flag Dependency

### What Happens When localStorage Flag is Missing

```
User clicks OAuth signup/login button
       ↓
localStorage flag set (e.g., splitlease_linkedin_oauth_user_type)
       ↓
Redirect to LinkedIn/Google
       ↓
[ FLAG CAN BE LOST HERE ]
  - Different browser tab
  - Browser cleared storage
  - localStorage blocked
  - Long delay (session expired)
  - User bookmarked callback URL
       ↓
User redirected back to app with OAuth tokens
       ↓
Supabase automatically creates auth.users session
       ↓
❌ SignUpLoginModal.useEffect checks: if (!linkedInUserType && !googleUserType) return;
❌ oauthCallbackHandler checks: if (!isLinkedInLoginFlow && !isGoogleLoginFlow) return;
       ↓
Neither handler processes the callback!
       ↓
No public.user created
No user_metadata.user_id set
       ↓
User has valid Supabase session but incomplete profile
       ↓
checkAuthStatus() stores UUID as userId (fallback at line 176)
       ↓
validateTokenAndFetchUser() fails → redirect loop
```

---

## 4. Missing Checks/Safeguards

| Location | What's Missing | Impact |
|----------|----------------|--------|
| `auth.js:176` | No detection of UUID vs Bubble ID | Stores invalid ID |
| `oauthCallbackHandler.js:64` | No fallback for missing flag | Skips callback |
| `SignUpLoginModal.jsx:907` | No fallback for missing flag | Skips callback |
| `login.ts:94` | No warning when falling back to UUID | Silent failure |
| `validate.ts` | No auto-recovery for orphaned users | Throws error |
| Supabase OAuth | No way to pass userType through OAuth state | Requires localStorage |

---

## 5. OAuth Login Overwrite Analysis

**Question**: Does OAuth login overwrite existing data?

### `oauthLogin.ts` Lines 98-109:
```typescript
const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
  supabaseUserId,
  {
    user_metadata: {
      user_id: existingUser._id,              // From public.user
      host_account_id: existingUser._id,      // From public.user
      first_name: existingUser['Name - First'] || '',
      last_name: existingUser['Name - Last'] || '',
      user_type: userType,
    }
  }
);
```

**Answer**: ✅ **SAFE** - OAuth login UPDATES metadata with values FROM `public.user`, not the reverse. It syncs auth.users TO match public.user, which is correct.

---

## 6. Recommendations

### Immediate Fixes

1. **Add OAuth state parameter** - Pass userType/flow type through OAuth `options.queryParams` instead of localStorage
2. **Detect orphaned sessions** - In `checkAuthStatus()`, detect when `user_metadata.user_id` is missing for OAuth providers
3. **Auto-recovery in validate.ts** - If user not found but has valid OAuth session, auto-create public.user

### Architectural Fixes

1. **Remove localStorage dependency** - Use Supabase's built-in OAuth state parameter
2. **Add middleware check** - Before any protected route, verify public.user exists for session
3. **Add UUID detection** - Detect and handle Supabase UUID format explicitly

---

## 7. Files Analyzed

| File | Purpose |
|------|---------|
| `supabase/functions/auth-user/handlers/signup.ts` | Native email/password signup |
| `supabase/functions/auth-user/handlers/login.ts` | Native email/password login |
| `supabase/functions/auth-user/handlers/oauthSignup.ts` | OAuth signup edge function |
| `supabase/functions/auth-user/handlers/oauthLogin.ts` | OAuth login edge function |
| `app/src/lib/auth.js` | Client-side auth utilities |
| `app/src/lib/oauthCallbackHandler.js` | Global OAuth callback detection |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Signup/login UI component |
