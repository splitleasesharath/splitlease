# Session Management - Quick Reference Guide

---

## QUICK FACTS

**Session Duration**: 3600 seconds (1 hour) from Supabase Auth
**Client Timeout**: NONE - Sessions persist until logout or token expired
**Token Storage**: localStorage (plaintext)
**Session Validation**: Server-side via Edge Function on every API call
**Keep Logged In**: YES - Users stay logged in indefinitely (no re-login required)
**Device Logout**: NO - Only individual device logout, not all devices
**Session Activity Log**: NO - No activity tracking

---

## SESSION STORAGE LOCATIONS

| Key | Storage | Type | Lifetime | Use |
|-----|---------|------|----------|-----|
| `__sl_at__` | localStorage | Token (plaintext) | Until logout | Access token for API calls |
| `__sl_sid__` | localStorage | Token (plaintext) | Until logout | User ID / session ID |
| `__sl_rd__` | localStorage | Token (JSON) | Until logout | Refresh data (unused) |
| `sl_auth_state` | localStorage | String 'true'/'false' | Until logout | Quick auth check (not authoritative) |
| `sl_user_id` | localStorage | String | Until logout | Public user ID |
| `sl_user_type` | localStorage | String | Until logout | 'Host' or 'Guest' |
| `sl_first_name` | localStorage | String | Until logout | User's first name |
| `sl_avatar_url` | localStorage | String | Until logout | Profile photo URL |
| `sb-*-auth-token` | localStorage | JSON | Until logout | Supabase SDK session |
| `loggedIn` | Cookie | Boolean | Session/explicit expiry | Legacy cross-domain check |
| `username` | Cookie | String | Session/explicit expiry | Legacy cross-domain check |

---

## CORE FUNCTIONS

### Login/Signup
```javascript
import { loginUser, signupUser } from 'app/src/lib/auth.js'

const result = await loginUser(email, password)
// Returns: { success, user_id, expires_in, error? }

const result = await signupUser(email, password, retype, additionalData)
// Returns: { success, user_id, expires_in, error? }
```

### Check Authentication
```javascript
import { checkAuthStatus, isSessionValid } from 'app/src/lib/auth.js'

const isLoggedIn = await checkAuthStatus()
// Returns: true if user has any valid auth (cookies, Supabase, or tokens)

const isValid = isSessionValid()
// Returns: true if getAuthState() is true (NOT authoritative - just a flag)
```

### Validate & Get User Data
```javascript
import { validateTokenAndFetchUser } from 'app/src/lib/auth.js'

const userData = await validateTokenAndFetchUser()
// Returns: { userId, firstName, email, userType, ... } or null if expired
// Clears all auth data if token is invalid
```

### Logout
```javascript
import { logoutUser } from 'app/src/lib/auth.js'

const result = await logoutUser()
// Clears all tokens and state, returns { success, message }
```

### Password Reset
```javascript
import { requestPasswordReset, updatePassword } from 'app/src/lib/auth.js'

await requestPasswordReset(email)
// Returns success (always, for security)

const result = await updatePassword(newPassword)
// Called after clicking reset link from email
// Returns: { success, message }
// User stays logged in after this
```

### Get Token/ID
```javascript
import { getAuthToken, getSessionId, getUserId, getUserType } from 'app/src/lib/auth.js'

const token = getAuthToken()          // Access token (for internal use)
const userId = getSessionId()         // User ID (for internal use)
const userId = getUserId()            // User ID from public state (safe to use)
const userType = getUserType()        // 'Host' or 'Guest' from public state
```

---

## SESSION LIFECYCLE

### 1. LOGIN
```
User enters email/password
→ loginUser(email, password)
→ Edge Function validates with Supabase Auth
→ Returns: access_token, refresh_token, expires_in: 3600
→ Store in __sl_at__, __sl_sid__, set sl_auth_state='true'
→ User is logged in (isSessionValid() = true)
```

### 2. BROWSING
```
User navigates to protected page
→ checkAuthStatus() called on mount
→ Checks: cookies → Supabase SDK → localStorage
→ If found: User can view page
→ If not found: Redirected to login (if protected page)
```

### 3. API CALL
```
Component needs user data
→ validateTokenAndFetchUser() called
→ Sends token to Edge Function validate action
→ Edge Function validates with Supabase/Bubble
→ If valid: Returns user data (component renders)
→ If expired: clearAuthData(), redirectToLogin()
```

### 4. LOGOUT
```
User clicks logout button
→ logoutUser() called
→ Calls supabase.auth.signOut()
→ Calls Edge Function logout (no-op)
→ Calls clearAllAuthData():
  - Remove __sl_at__, __sl_sid__, __sl_rd__
  - Remove sl_auth_state, sl_user_id, sl_user_type, sl_first_name, sl_avatar_url
  - Remove legacy keys
  - Clear cookies
→ User is logged out (isSessionValid() = false)
```

---

## PROTECTED PAGES

Pages that require authentication:
- `/guest-proposals` - Guest's proposals dashboard
- `/account-profile` - User account settings
- `/host-dashboard` - Host's listing dashboard

**Check**: `isProtectedPage()` in `app/src/lib/auth.js`

---

## TOKEN REFRESH

**How it works**:
- Supabase client automatically monitors token expiry
- Refreshes token **60 seconds before expiry** (default)
- Uses `refresh_token` from login response
- Update happens transparently in background

**What Split Lease does**:
- Stores `refresh_token` in `__sl_rd__` (unused currently)
- Relies entirely on Supabase SDK for refresh
- No manual refresh code needed

**If token expires**:
- Client-side: No immediate effect (tokens still in localStorage)
- Server-side: Bubble API rejects expired token on next request
- Client detects rejection: Clears data, redirects to login

---

## EDGE FUNCTION: auth-user

**Location**: `supabase/functions/auth-user/`

**Actions**:
| Action | Handler | Backend | Returns |
|--------|---------|---------|---------|
| `login` | login.ts | Supabase Auth native | access_token, refresh_token, expires_in |
| `signup` | signup.ts | Supabase Auth native | access_token, refresh_token, user_id |
| `logout` | logout.ts | No-op (client-side logout) | { success, message } |
| `validate` | validate.ts | Supabase Auth + database query | { userId, firstName, email, userType, ... } or error |
| `request_password_reset` | resetPassword.ts | Supabase Auth | Always { success, message } |
| `update_password` | updatePassword.ts | Supabase Auth | { success, message } |

**Key Handler: validate.ts**
- Detects auth type (Supabase UUID vs Bubble _id)
- For Supabase: Validates JWT with `supabase.auth.getUser(token)`
- For Bubble: Queries database by `_id`
- Returns null if validation fails (forces re-auth)

---

## SECURITY CONSIDERATIONS

### Tokens Are Plaintext
```javascript
localStorage['__sl_at__'] = 'eyJhbGci...'  // Unencrypted JWT
```
- ⚠️ Vulnerable to XSS attacks
- ✅ Protected by Same-Origin Policy + HTTPS

### No Client-Side Timeout
- ⚠️ No inactivity monitoring
- ⚠️ Session persists indefinitely
- ✅ Server validates on every API call
- ✅ Token expiry is server-enforced

### Session State is Not Authoritative
```javascript
isSessionValid() // Returns getAuthState() - just a flag
// NOT checking actual token validity
```
- ⚠️ Session might be expired but flag says valid
- ✅ Real validation happens on API call

### Logout is Atomic
```javascript
clearAllAuthData()  // ALWAYS runs, even if API calls fail
```
- ✅ All data guaranteed to be removed
- ✅ Safe even if network issues occur

---

## COMMON PATTERNS

### Check if user is logged in
```javascript
import { checkAuthStatus } from 'app/src/lib/auth.js'

const isLoggedIn = await checkAuthStatus()
if (isLoggedIn) {
  // User is authenticated
} else {
  // User is not authenticated
}
```

### Get user data (with validation)
```javascript
import { validateTokenAndFetchUser } from 'app/src/lib/auth.js'

const userData = await validateTokenAndFetchUser()
if (userData) {
  console.log('User:', userData.firstName, userData.email)
} else {
  console.log('Session expired or invalid')
  // User was redirected to login by the function
}
```

### Redirect to login if not authenticated
```javascript
import { checkAuthStatus, redirectToLogin, isProtectedPage } from 'app/src/lib/auth.js'

useEffect(() => {
  const init = async () => {
    const isLoggedIn = await checkAuthStatus()
    if (!isLoggedIn && isProtectedPage()) {
      redirectToLogin(window.location.pathname)
    }
  }
  init()
}, [])
```

### Logout on button click
```javascript
import { logoutUser } from 'app/src/lib/auth.js'

const handleLogout = async () => {
  await logoutUser()
  window.location.href = '/'  // Redirect to home
}
```

---

## TROUBLESHOOTING

### "Session keeps getting cleared"
- Check if token is actually expired (compare to now)
- Verify Edge Function validate is returning user data
- Check browser console for API errors

### "User stays logged in after closing browser"
- This is by design - localStorage persists
- To clear on close, need sessionStorage instead
- Or implement explicit timeout

### "Password reset doesn't keep user logged in"
- updatePassword() should sync session
- Check if session.access_token is being stored
- Verify setSecureAuthToken() is called

### "Protected page redirects even when logged in"
- May be race condition between checkAuthStatus() and page render
- Add loading state while checking
- Use useEffect hook to ensure check completes before render

---

## FILE REFERENCE

### Core Authentication
- **`app/src/lib/auth.js`** (1164 lines)
  - Main auth module: login, logout, validation, password reset
  - All session lifecycle functions

- **`app/src/lib/secureStorage.js`** (308 lines)
  - Token and state storage
  - clearAllAuthData() implementation
  - Legacy key migration

- **`app/src/lib/constants.js`**
  - `AUTH_STORAGE_KEYS` - Storage key names
  - `SESSION_VALIDATION` - Validation config (MAX_AUTH_CHECK_ATTEMPTS: 3)

- **`app/src/lib/supabase.js`**
  - Supabase client initialization
  - Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Edge Functions
- **`supabase/functions/auth-user/index.ts`**
  - Router for all auth actions

- **`supabase/functions/auth-user/handlers/login.ts`**
  - Supabase Auth sign-in

- **`supabase/functions/auth-user/handlers/signup.ts`**
  - Supabase Auth sign-up + user record creation

- **`supabase/functions/auth-user/handlers/validate.ts`**
  - Token validation and user data fetch

- **`supabase/functions/auth-user/handlers/logout.ts`**
  - No-op logout handler

- **`supabase/functions/auth-user/handlers/resetPassword.ts`**
  - Password reset email request

- **`supabase/functions/auth-user/handlers/updatePassword.ts`**
  - Password update after reset link

### Documentation
- **`app/src/lib/SECURE_AUTH_README.md`** (440 lines)
  - Full security documentation
  - Migration guide from legacy storage

### Page Components
- **`app/src/islands/pages/ResetPasswordPage.jsx`**
  - Password reset UI after clicking email link
  - Handles PASSWORD_RECOVERY event

- **`app/src/islands/shared/Header.jsx`**
  - Logout button and user menu

---

## WHAT'S MISSING?

### Not Implemented
- ❌ Client-side session timeout
- ❌ Inactivity detection
- ❌ Remember Me toggle
- ❌ Multiple device tracking
- ❌ Session activity log
- ❌ Force logout from admin
- ❌ Explicit token refresh monitoring

### Future Improvements
1. **Inactivity Timeout**: Clear session after 30-60 min of no activity
2. **SessionStorage**: Move tokens to sessionStorage (cleared on tab close)
3. **Active Refresh**: Monitor JWT exp claim, refresh proactively
4. **Encryption**: Encrypt tokens at rest with per-session key
5. **HttpOnly Cookies**: Move to server-side cookie management

---

## SUPABASE AUTH CONFIG

**Default Session Duration**: 3600 seconds (1 hour)

**To Change**:
1. Supabase Dashboard > Project Settings > Authentication
2. Find JWT expiry setting
3. Change from 3600 to desired seconds
4. Will apply to new logins

**Token Refresh**:
- Automatic by Supabase SDK
- Refresh happens 60s before expiry
- No manual intervention needed

---

## KEY CONSTANTS

```javascript
// From constants.js
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'splitlease_auth_token',        // DEPRECATED
  SESSION_ID: 'splitlease_session_id',   // DEPRECATED
  LAST_AUTH: 'splitlease_last_auth',     // DEPRECATED
  USER_TYPE: 'splitlease_user_type'      // DEPRECATED
};

export const SESSION_VALIDATION = {
  MAX_AUTH_CHECK_ATTEMPTS: 3  // Retry limit (not timeout)
};
```

```javascript
// From secureStorage.js
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',      // Current token storage
  SESSION_ID: '__sl_sid__',     // Current session storage
  REFRESH_DATA: '__sl_rd__'     // Reserved for future use
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  SESSION_VALID: 'sl_session_valid',
  FIRST_NAME: 'sl_first_name',
  AVATAR_URL: 'sl_avatar_url'
};
```

---

## SUMMARY

**Session Creation**: Supabase Auth handles login natively, returns 1-hour tokens
**Session Validation**: Server validates on every API request via Edge Function
**Session Persistence**: Indefinite (no client-side timeout)
**Session Termination**: Complete logout clears all tokens and state
**Token Expiry**: Managed by Supabase Auth, validated on API calls
**Password Reset**: User stays logged in after password update

