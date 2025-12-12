# Sign-In Session Wipe Fix - Implementation Plan

**Created**: 2025-12-11 16:30:00
**Updated**: 2025-12-11
**Status**: IMPLEMENTED (Phase 2)
**Commits**: d339b6f, [pending]

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

## Root Cause Analysis (Extended)

### Phase 1: clearOnFailure Issue (Fixed in d339b6f)

The original fix added `clearOnFailure` parameter to `validateTokenAndFetchUser()` and updated `SignUpLoginModal.jsx` to use `{ clearOnFailure: false }`.

### Phase 2: Race Condition (Fixed in this update)

The issue persisted because of a **Supabase client initialization race condition**:

1. **Timeline on page load:**
   - `checkAuthStatus()` runs immediately
   - Calls `supabase.auth.getSession()` - returns **null** (Supabase hasn't loaded session from localStorage yet)
   - Calls `setAuthState(false)` - marks user as not authenticated
   - **THEN** Supabase fires `INITIAL_SESSION` event (session was there all along!)
   - But by then, UI already shows logged out

2. **Multiple places calling validateTokenAndFetchUser without clearOnFailure:**
   - `Header.jsx` line 76: `performBackgroundValidation` called `validateTokenAndFetchUser()` with default `clearOnFailure: true`
   - `Header.jsx` line 139: `onAuthStateChange` INITIAL_SESSION handler also used default

---

## Solution Implemented (Phase 2)

### 1. Added Wait Logic for Supabase Initialization

In THREE places, added a brief wait (200ms) before concluding no session exists:

**File: `app/src/lib/auth.js`**

```javascript
// In checkAuthStatus() - lines 147-156
if (!session && !error) {
  console.log('🔄 No immediate Supabase session, waiting briefly for initialization...');
  await new Promise(resolve => setTimeout(resolve, 200));
  const retryResult = await supabase.auth.getSession();
  session = retryResult.data?.session;
  // ...
}

// In validateTokenAndFetchUser() - lines 870-878
if (!session && !error) {
  console.log('[Auth] 🔄 No immediate session, waiting briefly for Supabase initialization...');
  await new Promise(resolve => setTimeout(resolve, 200));
  const retryResult = await supabase.auth.getSession();
  // ...
}
```

**File: `app/src/islands/shared/Header.jsx`**

```javascript
// In performBackgroundValidation - lines 68-76
if (!hasSupabaseSession) {
  console.log('[Header] No immediate Supabase session, waiting briefly for initialization...');
  await new Promise(resolve => setTimeout(resolve, 200));
  const { data: retryData } = await supabase.auth.getSession();
  // ...
}
```

### 2. Added clearOnFailure: false to Header.jsx

Both places in Header.jsx now preserve sessions on validation failure:

```javascript
// Line 97 - performBackgroundValidation
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

// Line 181 - INITIAL_SESSION handler
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
```

### 3. Graceful Fallback on Validation Failure

When `validateTokenAndFetchUser` fails but a Supabase session exists, Header.jsx now uses session data as fallback:

```javascript
if (hasSupabaseSession && session?.user) {
  setCurrentUser({
    firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
    email: session.user.email,
    _isFromSession: true
  });
}
```

---

## Files Changed (Phase 2)

| File | Changes |
|------|---------|
| `app/src/lib/auth.js` | Added 200ms wait logic to `checkAuthStatus()` and `validateTokenAndFetchUser()` |
| `app/src/islands/shared/Header.jsx` | Added 200ms wait in `performBackgroundValidation`, added `clearOnFailure: false` in both validation calls, added session fallback logic |

---

## Behavior After Fix

### Login Flow (Complete Fix)

```
1. Login succeeds → Session stored in Supabase + secureStorage
2. Page reloads
3. checkAuthStatus() runs:
   - First getSession() call → may return null (race condition)
   - Waits 200ms for Supabase to initialize
   - Retry getSession() → finds session ✓
   - Returns true, user is authenticated!
4. Header's performBackgroundValidation:
   - Same 200ms wait logic
   - validateTokenAndFetchUser({ clearOnFailure: false })
   - If validation fails, preserves session and uses fallback
5. User sees logged-in UI ✓
```

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

---

## Testing Checklist

- [ ] Sign in with valid credentials → User stays logged in after reload
- [ ] Sign in when user profile missing in DB → Session preserved, basic UI works
- [ ] Background validation in Header still works → Stale sessions get cleared
- [ ] Signup flow still works → New users get logged in
- [ ] Logout still works → Session properly cleared
- [ ] Multiple page loads → No flickering between logged-in/logged-out states

---

## Why 200ms Wait?

The Supabase JS client loads the session from localStorage asynchronously after `createClient()` is called. This typically completes within 50-150ms. A 200ms wait provides enough buffer to handle the race condition without significantly impacting perceived performance.

If you're seeing issues with 200ms being too short, consider:
1. Increasing to 300-500ms
2. Using a polling approach with multiple retries
3. Implementing a more sophisticated initialization state machine

---

**Document Version**: 2.0
**Last Updated**: 2025-12-11
