# Sign-In Session Wipe Fix - Implementation Plan

**Created**: 2025-12-11 16:30:00
**Status**: IMPLEMENTED
**Commit**: d339b6f

---

## Problem Statement

Users were unable to stay logged in after signing in through the SignUpLoginModal:
1. User clicks "Sign In" and enters credentials
2. 3 toast alerts appear (informational)
3. The popup closes (indicating login success)
4. Page reloads
5. **User appears logged out** - not authenticated

### Console Logs Observed (After Reload)

```
auth.js:117 🔍 Checking authentication status...
auth.js:91 🔐 Split Lease Cookie Auth Check:
auth.js:92    Logged In: false
auth.js:93    Username: not set
Header.jsx:49 [Header] No auth state - showing logged-out UI
Header.jsx:123 [Header] Auth state changed: INITIAL_SESSION
auth.js:180 ❌ User not authenticated
```

Key observation: `INITIAL_SESSION` fired (meaning Supabase found a session), but `checkAuthStatus` still returned false.

---

## Root Cause Analysis

### The Login Flow

```
SignUpLoginModal.handleLoginSubmit()
    │
    ├── 1. loginUser(email, password)
    │       ├── Calls auth-user Edge Function (action: 'login')
    │       ├── Edge Function calls Supabase Auth signInWithPassword()
    │       ├── Returns: access_token, refresh_token, user_id, etc.
    │       ├── Calls supabase.auth.setSession({ access_token, refresh_token })
    │       ├── Verifies session is persisted
    │       └── Stores tokens in secureStorage
    │
    ├── 2. validateTokenAndFetchUser()  ← THE PROBLEM
    │       ├── Gets token and user_id from secureStorage
    │       ├── Calls auth-user Edge Function (action: 'validate')
    │       ├── Edge Function queries public.user by _id
    │       │
    │       └── IF VALIDATION FAILS:
    │           ├── clearAuthData()  ← WIPES ENTIRE SESSION!
    │           └── return null
    │
    ├── 3. Close modal
    │
    └── 4. Reload page → User is logged out because session was cleared
```

### Why Validation Can Fail

The validate endpoint (`supabase/functions/auth-user/handlers/validate.ts`) queries:

```typescript
const { data: userData, error: userError } = await supabase
  .from('user')
  .select('_id, ...')
  .eq('_id', user_id)  // ← Queries by _id
  .single();
```

This can fail if:
1. **User profile doesn't exist in public.user table** (user created via Supabase Auth but profile not synced)
2. **user_id mismatch** - login returns Supabase Auth UUID instead of Bubble-style _id
3. **Database query error**
4. **Network error**
5. **Timing issue** - profile not committed yet

### The Critical Bug

In `validateTokenAndFetchUser()` (auth.js:889-940):

```javascript
if (error) {
  clearAuthData();  // ← CLEARS VALID SESSION!
  return null;
}

if (!data.success) {
  clearAuthData();  // ← CLEARS VALID SESSION!
  return null;
}
```

**The session is valid** (we just logged in!), but if the user profile fetch fails, `clearAuthData()` wipes everything including the Supabase session tokens.

---

## Solution Implemented

### 1. Add `clearOnFailure` Parameter to `validateTokenAndFetchUser()`

**File**: `app/src/lib/auth.js`

```javascript
/**
 * @param {Object} options - Configuration options
 * @param {boolean} options.clearOnFailure - If true, clears auth data when validation fails. Default: true.
 *                                           Set to false when calling immediately after login/signup to preserve
 *                                           the fresh session even if user profile fetch fails.
 */
export async function validateTokenAndFetchUser({ clearOnFailure = true } = {}) {
  // ...

  if (error) {
    // Only clear auth data if clearOnFailure is true
    if (clearOnFailure) {
      clearAuthData();
    }
    return null;
  }

  if (!data.success) {
    if (clearOnFailure) {
      console.log('   Clearing auth data...');
      clearAuthData();
    } else {
      console.log('   Preserving session (clearOnFailure=false)');
    }
    return null;
  }

  // ... also in catch block
}
```

### 2. Update SignUpLoginModal to Preserve Session

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`

```javascript
// After successful login, fetch user data but DON'T clear session on failure
try {
  console.log('[SignUpLoginModal] Fetching user data...');
  await validateTokenAndFetchUser({ clearOnFailure: false });
  console.log('[SignUpLoginModal] User data fetched successfully');
} catch (validationError) {
  console.warn('[SignUpLoginModal] User data fetch failed, continuing with login:', validationError);
  // Session is preserved - page reload will try again
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `app/src/lib/auth.js` | Added `clearOnFailure` parameter to `validateTokenAndFetchUser()` |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Pass `{ clearOnFailure: false }` after login |

### Diff Summary

```diff
// auth.js
-export async function validateTokenAndFetchUser() {
+export async function validateTokenAndFetchUser({ clearOnFailure = true } = {}) {

// On error/failure:
-      clearAuthData();
+      if (clearOnFailure) {
+        clearAuthData();
+      }

// SignUpLoginModal.jsx
-        await validateTokenAndFetchUser();
+        await validateTokenAndFetchUser({ clearOnFailure: false });
```

---

## Behavior After Fix

### Login Flow (Fixed)

```
1. Login succeeds → Session stored in Supabase + secureStorage
2. validateTokenAndFetchUser({ clearOnFailure: false }) called
3. IF validation fails:
   - Session is PRESERVED (not cleared)
   - Console logs: "Preserving session (clearOnFailure=false)"
   - return null (but session intact)
4. Modal closes
5. Page reloads
6. Supabase finds session → User stays logged in!
7. Header's background validation runs and fetches user data
```

### Backward Compatibility

- Default `clearOnFailure: true` maintains existing behavior for:
  - Header.jsx background validation
  - Other pages that validate stale sessions
  - Any code that doesn't pass the option

---

## Key Files Reference

### Authentication Flow Files

| File | Purpose |
|------|---------|
| `app/src/lib/auth.js` | Main auth module - loginUser, validateTokenAndFetchUser, checkAuthStatus |
| `app/src/lib/secureStorage.js` | Token storage - setAuthToken, getAuthToken, clearAllAuthData |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login/Signup modal UI and handlers |
| `app/src/islands/shared/Header.jsx` | Auth state display, background validation |
| `supabase/functions/auth-user/handlers/login.ts` | Login Edge Function |
| `supabase/functions/auth-user/handlers/validate.ts` | Validation Edge Function |

### Auth State Storage Keys

```javascript
// secureStorage.js
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',
  SESSION_ID: '__sl_sid__',
  REFRESH_DATA: '__sl_rd__',
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  // ...
};
```

### Supabase Session Storage

Supabase stores session in localStorage with key pattern: `sb-{project-ref}-auth-token`

---

## Related Issues

### Potential Future Improvements

1. **Validate endpoint should be more lenient** - Return partial data if user profile not found, rather than failing entirely. The session is valid even if we can't fetch the profile.

2. **Login should ensure user_id consistency** - The login handler falls back to `authUser.id` (UUID) if profile not found by email. This UUID won't match `_id` in the user table.

3. **Consider removing validateTokenAndFetchUser call after login** - Since it's wrapped in try-catch and doesn't block, we could skip it entirely. The page reload triggers validation anyway.

### AiSignupMarketReport Component

The user mentioned changes to AiSignupMarketReport. This component:
- Uses `signupUser()` directly (not `validateTokenAndFetchUser`)
- Doesn't have the same issue
- Signup flow is different from login flow

---

## Testing Checklist

- [ ] Sign in with valid credentials → User stays logged in after reload
- [ ] Sign in when user profile missing in DB → Session preserved, user stays logged in
- [ ] Background validation in Header still works → Stale sessions get cleared
- [ ] Signup flow still works → New users get logged in
- [ ] Logout still works → Session properly cleared

---

## Commit Information

```
commit d339b6f
Author: [Your Name]
Date:   2025-12-11

fix(auth): prevent session wipe when validateTokenAndFetchUser fails after login

Root cause: After successful login, validateTokenAndFetchUser() was called
to fetch user profile data. If this failed for any reason (user not found
in database, network error, etc.), it would call clearAuthData() which
wiped the entire session including the Supabase auth tokens that were
just established. This caused the user to appear logged out after reload.

Fix: Add clearOnFailure parameter to validateTokenAndFetchUser():
- Default: true (backward compatible - still clears on failure for
  background validation where stale sessions should be cleared)
- Set to false when called immediately after login/signup to preserve
  the fresh session even if user profile fetch fails
```

---

## Architecture Context

### Day Indexing (Not directly related but important context)

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API (external) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

### Auth Architecture

```
Frontend (React)
    │
    ├── loginUser() ──────────────────┐
    │                                  │
    │                                  ▼
    │                    Supabase Edge Function
    │                    (auth-user/login.ts)
    │                           │
    │                           ├── signInWithPassword()
    │                           │
    │                           └── Query public.user by email
    │                                      │
    │   ◄─────────────────────────────────┘
    │   (access_token, refresh_token, user_id)
    │
    ├── supabase.auth.setSession()
    │
    ├── setAuthToken(), setSessionId(), setAuthState()
    │
    └── validateTokenAndFetchUser({ clearOnFailure: false })
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-11
