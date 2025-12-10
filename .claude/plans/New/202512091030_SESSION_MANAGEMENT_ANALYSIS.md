# Session Management & Expiration Analysis
## Split Lease Authentication System

**DATE**: 2025-12-09
**ANALYSIS**: Comprehensive Session Lifecycle Documentation
**STATUS**: Complete Architecture Overview

---

## EXECUTIVE SUMMARY

Split Lease uses a **hybrid authentication system** combining:
- **Supabase Auth (Native)** - Login/Signup via Supabase Auth natively
- **Token storage** - In localStorage (plaintext) with public state
- **Session validation** - Delegate to Bubble API (token expiry is server-side)
- **No client-side timeouts** - Sessions persist until logout or Bubble rejects expired tokens

### Key Finding
**There is NO explicit client-side session expiration timeout implemented.**
Sessions are managed entirely by Bubble API token expiry. The client validates tokens on every request and clears data if rejected.

---

## 1. SESSION CREATION & STORAGE

### 1.1 Session Creation Flow

#### Login Process (`app/src/lib/auth.js` - lines 445-571)
```javascript
export async function loginUser(email, password) {
  // 1. Call Edge Function auth-user with action: 'login'
  const { data, error } = await supabase.functions.invoke('auth-user', {
    body: { action: 'login', payload: { email, password } }
  });

  // 2. Extract tokens from response
  const {
    access_token,      // Supabase JWT token
    refresh_token,     // For token refresh (stored but not used)
    expires_in,        // Session duration (typically 3600 seconds = 1 hour)
    user_id,           // User's _id (primary key)
    user_type,         // 'Host' or 'Guest'
    supabase_user_id   // UUID from Supabase Auth
  } = data.data;

  // 3. Set Supabase client session
  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });

  // 4. Store tokens in secure storage
  setAuthToken(access_token);           // In __sl_at__
  setSessionId(user_id);                // In __sl_sid__
  setAuthState(true, user_id);          // In localStorage
  setUserType(user_type);               // In localStorage

  // 5. Store Supabase user ID for reference
  localStorage.setItem('splitlease_supabase_user_id', supabase_user_id);

  return {
    success: true,
    user_id,
    expires_in  // 3600 seconds typically
  };
}
```

**Edge Function Login** (`supabase/functions/auth-user/handlers/login.ts` - lines 24-139)
- Authenticates via `supabaseAdmin.auth.signInWithPassword()`
- Returns Supabase session with `expires_in` duration
- Fetches user profile from `public.user` table
- Returns user metadata including account IDs

#### Signup Process (`app/src/lib/auth.js` - lines 592-748)
- Identical storage to login
- Creates Supabase Auth user + public.user record
- Stores all tokens and state identically

### 1.2 Storage Mechanisms

#### Token Storage (`app/src/lib/secureStorage.js`)

**Secure Keys (localStorage - plaintext):**
```javascript
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',    // access_token from Supabase
  SESSION_ID: '__sl_sid__',   // user_id (Bubble _id)
  REFRESH_DATA: '__sl_rd__'   // refresh_token (unused)
};
```

**Public State (localStorage - plaintext):**
```javascript
const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',      // 'true' | 'false'
  USER_ID: 'sl_user_id',                  // user ID (non-sensitive)
  USER_TYPE: 'sl_user_type',              // 'Host' | 'Guest'
  SESSION_VALID: 'sl_session_valid',      // 'true' | 'false'
  FIRST_NAME: 'sl_first_name',            // User's first name
  AVATAR_URL: 'sl_avatar_url'             // Profile photo URL
};
```

**Persistent Cookies** (for cross-domain compatibility):
```javascript
document.cookie = 'loggedIn=true; path=/; domain=.split.lease'
document.cookie = 'username=...'; path=/; domain=.split.lease'
```

### 1.3 Supabase Session Management

When `supabase.auth.setSession()` is called with tokens:
- **Location**: Stored in localStorage with key pattern `sb-<project-ref>-auth-token`
- **Lifecycle**: Persists across browser restarts
- **Refresh**: Supabase client handles automatic token refresh before expiry
- **Duration**: Defaults to 3600 seconds (1 hour) unless configured otherwise

---

## 2. SESSION VALIDATION MECHANISMS

### 2.1 How Sessions Are Checked

#### Initial Auth Check (`app/src/lib/auth.js` - lines 116-184)
```javascript
export async function checkAuthStatus() {
  // 1. Check Split Lease cookies (legacy Bubble)
  const splitLeaseAuth = checkSplitLeaseCookies();
  if (splitLeaseAuth.isLoggedIn) {
    console.log('✅ User authenticated via Split Lease cookies');
    isUserLoggedInState = true;
    setAuthState(true);
    return true;
  }

  // 2. Check Supabase Auth session (native signup)
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session && !error) {
    console.log('✅ User authenticated via Supabase Auth session');
    // Sync to secure storage
    setSecureAuthToken(session.access_token);
    setSecureSessionId(userId);
    setAuthState(true, userId);
    isUserLoggedInState = true;
    return true;
  }

  // 3. Check auth state in localStorage
  const authState = getAuthState();
  if (authState) {
    const hasTokens = await hasValidTokens();
    if (hasTokens) {
      console.log('✅ User authenticated via secure storage (legacy)');
      isUserLoggedInState = true;
      return true;
    }
  }

  // Not authenticated
  isUserLoggedInState = false;
  setAuthState(false);
  return false;
}
```

**Key Flow:**
1. Checks cookies first (legacy compatibility)
2. Checks Supabase Auth session in client state
3. Checks localStorage tokens
4. Falls back to logout if no session found

#### Session Validity Check (`app/src/lib/auth.js` - lines 196-200)
```javascript
export function isSessionValid() {
  // Simply check if auth state is set
  // Bubble will reject expired tokens on API calls
  return getAuthState();
}
```

**IMPORTANT**: This does NOT verify token expiry. It only checks if state exists.
**Real validation happens on API calls** - if token is expired, Bubble rejects the request.

#### Token Validation (`app/src/lib/auth.js` - lines 761-885)
```javascript
export async function validateTokenAndFetchUser() {
  let token = getAuthToken();
  let userId = getSessionId();

  // If no legacy token, check Supabase Auth session
  if (!token || !userId) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session && !error) {
      token = session.access_token;
      userId = session.user?.user_metadata?.user_id || session.user?.id;
      // Sync to secure storage
      setSecureAuthToken(token);
      setSecureSessionId(userId);
      setAuthState(true, userId);
    }
  }

  // Call Edge Function to validate with Bubble
  const { data, error } = await supabase.functions.invoke('auth-user', {
    body: {
      action: 'validate',
      payload: { token, user_id: userId }
    }
  });

  if (!data.success) {
    console.log('❌ Token validation failed - clearing auth data');
    clearAuthData();  // CLEARS ALL SESSION
    isUserLoggedInState = false;
    return null;
  }

  // Return user data - session is valid
  return userData;
}
```

**This function:**
- Called whenever user data is needed
- Validates token via Edge Function (server-side)
- Clears all session data if token is invalid/expired
- Forces re-authentication on next attempt

### 2.2 Validation Points

**Where sessions are validated:**
1. **Page load** - `checkAuthStatus()` in page initialization
2. **Protected page access** - `isProtectedPage()` check before rendering
3. **API calls** - `validateTokenAndFetchUser()` before showing user data
4. **Logout** - `logoutUser()` clears all session data

**Which pages are protected:**
- `/guest-proposals` (requires guest to be logged in)
- `/account-profile` (requires any authenticated user)
- `/host-dashboard` (requires host to be logged in)

### 2.3 Session State Check Attempt Limits

```javascript
const MAX_AUTH_CHECK_ATTEMPTS = SESSION_VALIDATION.MAX_AUTH_CHECK_ATTEMPTS; // = 3

export function incrementAuthCheckAttempts() { authCheckAttempts++; }
export function hasExceededMaxAuthAttempts() {
  return authCheckAttempts >= MAX_AUTH_CHECK_ATTEMPTS;
}
```

**Purpose**: Limit retry attempts when checking auth status (prevents infinite loops)
**Used in**: Initial page load logic to prevent excessive re-checking

---

## 3. TOKEN REFRESH & EXPIRATION

### 3.1 Token Refresh Handling

#### Automatic Refresh (Supabase Built-in)
```javascript
// When we call supabase.auth.setSession()
await supabase.auth.setSession({
  access_token,
  refresh_token
});
```

**Supabase client automatically:**
- Stores refresh token in localStorage
- Monitors token expiry
- Refreshes 60 seconds before expiry (by default)
- Updates access token without user intervention

**Key Files:**
- Supabase JS SDK manages refresh transparently
- No manual refresh code in Split Lease codebase
- Configured with `autoRefreshToken: false` in server-side contexts (Edge Functions)

#### Bubble API Token Expiry
- Bubble returns `expires_in: 3600` (seconds) on login
- Expiry is managed **server-side by Bubble**
- Client doesn't track expiry duration
- Token validation happens on **each API request** via Edge Function

### 3.2 Refresh Token Storage

```javascript
export function setRefreshData(refreshData) {
  if (!refreshData) return;
  localStorage.setItem('__sl_rd__', JSON.stringify(refreshData));
}

export function getRefreshData() {
  const data = localStorage.getItem('__sl_rd__');
  return data ? JSON.parse(data) : null;
}
```

**Status**: Stored but **NOT actively used**
**Purpose**: Available for future token refresh implementation
**Current Approach**: Supabase SDK handles refresh internally

---

## 4. LOGOUT MECHANISMS

### 4.1 Logout Flow (`app/src/lib/auth.js` - lines 922-984)

```javascript
export async function logoutUser() {
  const token = getAuthToken();

  if (!token) {
    // Clear any remaining auth data even if no token
    clearAuthData();
    return { success: true, message: 'No active session to logout' };
  }

  // 1. Sign out from Supabase Auth client
  try {
    await supabase.auth.signOut();
    console.log('✅ Signed out from Supabase Auth client');
  } catch (err) {
    console.warn('⚠️ Error signing out from Supabase Auth client:', err);
    // Continue with logout regardless
  }

  // 2. Call Edge Function logout handler
  try {
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: { action: 'logout', payload: { token } }
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
  }

  // 3. ALWAYS clear all auth data (regardless of API response)
  clearAuthData();

  return { success: true, message: 'Logged out locally' };
}
```

**Key Points:**
- Calls `supabase.auth.signOut()` to clear Supabase client session
- Calls Edge Function logout handler (currently just returns success)
- **Always clears all local auth data** (even if API fails)
- Ensures clean logout state

### 4.2 What Gets Cleared on Logout

```javascript
export function clearAllAuthData() {
  // Clear secure storage (tokens)
  clearSecureStorage();

  // Clear public state
  localStorage.removeItem('sl_auth_state');
  localStorage.removeItem('sl_user_id');
  localStorage.removeItem('sl_user_type');
  localStorage.removeItem('sl_session_valid');
  localStorage.removeItem('sl_first_name');
  localStorage.removeItem('sl_avatar_url');

  // Clear legacy keys
  localStorage.removeItem('splitlease_auth_token');
  localStorage.removeItem('splitlease_session_id');
  localStorage.removeItem('splitlease_last_auth');
  localStorage.removeItem('splitlease_user_type');

  // Clear Supabase auth storage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.startsWith('supabase.'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Clear cookies
  document.cookie = 'loggedIn=false; path=/; max-age=0';
  document.cookie = 'username=; path=/; max-age=0';
  document.cookie = 'splitlease_auth=; path=/; max-age=0';
  document.cookie = 'loggedIn=false; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'username=; path=/; max-age=0; domain=.split.lease';
  document.cookie = 'splitlease_auth=; path=/; max-age=0; domain=.split.lease';
}
```

**Clears:**
1. All tokens (Bubble & Supabase)
2. All state (public non-sensitive data)
3. All legacy keys (from old system)
4. All Supabase SDK keys
5. All cookies (including cross-domain)

---

## 5. SESSION PERSISTENCE & "KEEP ME LOGGED IN"

### 5.1 Current Session Persistence

**How long sessions persist:**
- **Browser restart**: ✅ Sessions survive (localStorage persists)
- **Tab close**: ✅ Sessions survive (localStorage persists)
- **Browser clear cache**: ❌ Sessions lost
- **Manual logout**: ❌ All data cleared

**Implementation**: All auth data stored in **persistent localStorage**
**No "Remember Me" Feature**: Current system keeps users logged in indefinitely (until logout or token expiry)

### 5.2 Session Lifetime Considerations

```javascript
// In constants.js
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'splitlease_auth_token',
  SESSION_ID: 'splitlease_session_id',
  LAST_AUTH: 'splitlease_last_auth',      // Defined but unused
  USER_TYPE: 'splitlease_user_type'
};

export const SESSION_VALIDATION = {
  MAX_AUTH_CHECK_ATTEMPTS: 3  // Not a timeout, just retry limit
};
```

**Key Finding**:
- No session duration stored
- No last-activity timestamp tracked
- No "remember me" toggling
- Sessions persist until logout or Bubble API rejects expired token

---

## 6. EDGE FUNCTION AUTH IMPLEMENTATION

### 6.1 auth-user Edge Function (`supabase/functions/auth-user/`)

#### Login Handler
- Uses `supabaseAdmin.auth.signInWithPassword()`
- Returns `expires_in: 3600` (1 hour from Supabase)
- Stores in Supabase Auth natively
- NO fallback - fails immediately if login fails

#### Logout Handler
```typescript
export async function handleLogout(payload: any): Promise<any> {
  console.log('[logout] Logout successful (no server-side action required)');
  return { success: true, message: 'Logout successful' };
}
```
**Status**: Client-side logout via `supabase.auth.signOut()` is primary method

#### Validate Handler (`supabase/functions/auth-user/handlers/validate.ts`)
```typescript
// Supports both:
// 1. Supabase Auth users (UUID format user IDs)
// 2. Legacy Bubble Auth users (Bubble _id format)

const isSupabaseAuthUser = isUUID(user_id);

if (isSupabaseAuthUser) {
  // Validate Supabase Auth token
  const { data: { user: authUser }, error: authError }
    = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    throw new BubbleApiError('Invalid or expired session', 401, authError);
  }

  // User is validated - fetch from database
  const userData = await supabase.from('user').select(...).eq('email', ...);
} else {
  // Legacy Bubble user - fetch from database by _id
  const userData = await supabase.from('user').select(...).eq('_id', user_id);
}
```

**Key Points:**
- Detects auth type by user ID format
- Validates Supabase tokens with `getUser(token)`
- Fetches fresh user data from database
- Returns null if validation fails (forces re-auth)

### 6.2 Token Expiry Handling

```typescript
// In login handler
const { access_token, refresh_token, expires_in } = session;

// Returns to client
return {
  access_token,
  refresh_token,
  expires_in,  // Typically 3600 seconds
  user_id,
  // ...
};
```

**Expiry is managed by:**
1. **Supabase Auth** - Session duration configured in Supabase
2. **Bubble API** - If using legacy Bubble tokens
3. **Client** - Validates on each request via `validateTokenAndFetchUser()`

---

## 7. PASSWORD RESET & SESSION HANDLING

### 7.1 Password Reset Flow

#### Request Reset (`app/src/lib/auth.js` - lines 999-1042)
```javascript
export async function requestPasswordReset(email) {
  const { data, error } = await supabase.functions.invoke('auth-user', {
    body: {
      action: 'request_password_reset',
      payload: {
        email,
        redirectTo: `${window.location.origin}/reset-password`
      }
    }
  });

  // Always returns success (prevents email enumeration)
  return {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  };
}
```

**Security**: Always returns success, never reveals if email exists

#### Password Update After Reset (`app/src/lib/auth.js` - lines 1056-1163)
```javascript
export async function updatePassword(newPassword) {
  // 1. Get current session (from PASSWORD_RECOVERY event)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return {
      success: false,
      error: 'Invalid or expired reset link. Please request a new password reset.'
    };
  }

  // 2. Call Edge Function to update password
  const { data, error } = await supabase.functions.invoke('auth-user', {
    body: {
      action: 'update_password',
      payload: {
        password: newPassword,
        access_token: session.access_token
      }
    }
  });

  // 3. Keep user logged in by syncing session to secure storage
  const userId = session.user?.user_metadata?.user_id || session.user?.id;
  const userType = session.user?.user_metadata?.user_type;

  setSecureAuthToken(session.access_token);
  if (userId) {
    setSecureSessionId(userId);
    setAuthState(true, userId);
  }
  if (userType) {
    setSecureUserType(userType);
  }

  isUserLoggedInState = true;

  return {
    success: true,
    message: data?.data?.message || 'Password updated successfully.'
  };
}
```

**Key Points:**
- Requires active session from PASSWORD_RECOVERY event
- User remains logged in after password update
- Session is synced to secure storage (not cleared)
- Implements "keep me logged in" behavior for password reset flow

### 7.2 ResetPasswordPage Logic

```javascript
// src/islands/pages/ResetPasswordPage.jsx

useEffect(() => {
  // Listen for PASSWORD_RECOVERY event
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setStatus('ready');
    } else if (event === 'SIGNED_IN') {
      setStatus('ready');
    }
  });

  // Check for existing session
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (session) {
      setStatus('ready');
    } else {
      // Timeout if no session
      setTimeout(() => {
        if (status === 'loading') {
          setError('Invalid or expired reset link. Please request a new password reset.');
          setStatus('error');
        }
      }, 4000);
    }
  });
}, []);
```

**Behavior:**
- Waits for Supabase PASSWORD_RECOVERY event
- Shows timeout error after 4 seconds if no session detected
- Session is created automatically when user clicks reset link

---

## 8. CLIENT-SIDE SESSION CHECKS

### 8.1 Protected Page Checks

```javascript
export function isProtectedPage() {
  const protectedPaths = [
    '/guest-proposals',
    '/account-profile',
    '/host-dashboard'
  ];

  const currentPath = window.location.pathname.replace(/\.html$/, '');
  return protectedPaths.some(path =>
    currentPath === path || currentPath.startsWith(path + '/')
  );
}
```

**Protected pages:**
- `/guest-proposals` - Guest's booking proposals
- `/account-profile` - User profile/account settings
- `/host-dashboard` - Host's listing dashboard

### 8.2 Session Check Locations

**Where auth is validated in frontend:**

1. **Page initialization** (various page components):
   ```javascript
   useEffect(() => {
     const initializeAuth = async () => {
       const isLoggedIn = await checkAuthStatus();
       if (!isLoggedIn && isProtectedPage()) {
         redirectToLogin(window.location.pathname);
       }
     };
     initializeAuth();
   }, []);
   ```

2. **User data loading** (before rendering user-specific content):
   ```javascript
   const userData = await validateTokenAndFetchUser();
   if (!userData) {
     // Session invalid/expired
     clearAuthData();
     redirectToLogin();
   }
   ```

3. **API calls** (via Edge Functions - implicit validation):
   - All API calls go through Supabase client
   - Supabase client includes auth token in request
   - Edge Functions validate token

---

## 9. SESSION CONFIGURATION SUMMARY

### 9.1 Key Configuration Values

| Setting | Value | Location | Notes |
|---------|-------|----------|-------|
| Session Duration | 3600 seconds (1 hour) | Supabase Auth config | Returned from login response |
| Max Auth Check Attempts | 3 | `constants.js` SESSION_VALIDATION | Retry limit, not timeout |
| Reset Link Timeout | 4000 ms | ResetPasswordPage.jsx | UI timeout for password reset |
| Token Storage | localStorage (plaintext) | secureStorage.js | Persists across restarts |
| Refresh Token Handling | Automatic (Supabase SDK) | Supabase JS client | Transparent refresh 60s before expiry |
| Session Persistence | Indefinite | secureStorage.js | Until logout or manual clear |
| Cross-Domain Cookies | .split.lease domain | auth.js line 240-245 | For legacy compatibility |

### 9.2 What IS Implemented

✅ **Token Storage** - Tokens stored in localStorage
✅ **Session Creation** - Via Supabase Auth natively
✅ **Session Validation** - On API requests via Edge Function
✅ **Session Clearing** - Complete on logout
✅ **Token Refresh** - Automatic via Supabase SDK
✅ **Hybrid Auth** - Supabase Auth + Bubble legacy support
✅ **Protected Pages** - Auth checks before rendering
✅ **Password Reset** - With session preservation
✅ **Cross-Domain Cookies** - For legacy compatibility

### 9.3 What IS NOT Implemented

❌ **Session Timeout** - No client-side expiration timer
❌ **Inactivity Detection** - No idle-time tracking
❌ **Remember Me** - All sessions persist indefinitely
❌ **Multiple Device Sessions** - No device-specific tracking
❌ **Session Activity Log** - No activity tracking
❌ **Force Logout** - No admin-initiated logout
❌ **Session Duration Config** - Fixed to Supabase defaults
❌ **Explicit Token Refresh Monitoring** - Relies on SDK

---

## 10. CRITICAL FINDINGS

### 10.1 Security Considerations

**TOKENS ARE PLAINTEXT IN localStorage**
- ⚠️ `__sl_at__` contains unencrypted access_token
- ⚠️ `__sl_sid__` contains unencrypted user_id
- ⚠️ Vulnerable to XSS attacks
- ✅ Mitigated by: Browser Same-Origin Policy, HTTPS-only origin

**No Client-Side Session Expiry**
- ⚠️ Sessions persist indefinitely in localStorage
- ⚠️ If device is stolen, session remains valid until logout
- ✅ Mitigated by: Bubble API validates token on each request

**Session State is Non-Authoritative**
- ✅ Good: Client state (`sl_auth_state`) is just a hint
- ✅ Real validation happens server-side in Edge Function
- ✅ Token validation is required for actual API calls

### 10.2 Session Lifecycle Gap

**Current Flow:**
```
Login → Store tokens → Check state flag → Validate on API
 └─────────────────┬─────────────────┘        │
                   │                          └─→ Server validates token
         Client-side (no timeout)
```

**Gap**: No client-side monitoring between initial check and API call
- User could have been logged out server-side
- No refresh attempt if token is stale
- Session assumed valid until API call fails

### 10.3 Logout Atomicity

**Current Logout:**
```
1. supabase.auth.signOut() [client]
2. Edge Function logout [server - no-op currently]
3. clearAllAuthData() [client]
```

**Guarantee**: All auth data is cleared even if steps 1-2 fail
- Safe: Worst case is user stays signed in client-side but can't make API calls
- Edge Function logout handler is currently a no-op

---

## 11. FILES INVOLVED IN SESSION MANAGEMENT

### Core Auth Files
- `app/src/lib/auth.js` - Main auth module (1164 lines)
- `app/src/lib/secureStorage.js` - Token/state storage (308 lines)
- `app/src/lib/supabase.js` - Supabase client init (11 lines)
- `app/src/lib/constants.js` - Config constants (250+ lines)

### Edge Functions
- `supabase/functions/auth-user/index.ts` - Auth router
- `supabase/functions/auth-user/handlers/login.ts` - Login handler
- `supabase/functions/auth-user/handlers/signup.ts` - Signup handler
- `supabase/functions/auth-user/handlers/logout.ts` - Logout handler
- `supabase/functions/auth-user/handlers/validate.ts` - Token validation
- `supabase/functions/auth-user/handlers/resetPassword.ts` - Reset request
- `supabase/functions/auth-user/handlers/updatePassword.ts` - Reset completion

### Page Components
- `app/src/islands/pages/ResetPasswordPage.jsx` - Password reset UI
- `app/src/islands/shared/Header.jsx` - Contains logout button
- `app/src/islands/shared/SignUpLoginModal.jsx` - Login/signup UI

### Supporting Files
- `app/src/lib/SECURE_AUTH_README.md` - Documentation (440 lines)

---

## 12. RECOMMENDATIONS FOR IMPROVEMENT

### High Priority
1. **Implement Session Timeout**
   - Track last activity timestamp
   - Clear session after 30-60 minutes of inactivity
   - Show warning before auto-logout

2. **Move Tokens to SessionStorage**
   - Current: localStorage (persists forever)
   - Better: sessionStorage (cleared on tab close)
   - Plus: IndexedDB for cross-tab awareness

3. **Add Token Expiry Monitoring**
   - Parse JWT `exp` claim
   - Proactively refresh 60s before expiry
   - Redirect to login if refresh fails

### Medium Priority
4. **Encrypt Tokens at Rest**
   - Current: plaintext localStorage
   - Better: AES-GCM encryption with per-session key
   - Trade-off: Performance vs security

5. **Track Session Activity**
   - Log last activity timestamp
   - Detect suspicious activity
   - Enable "logout all devices" feature

### Low Priority
6. **Device-Specific Sessions**
   - Track which devices are logged in
   - Allow users to view/revoke device sessions
   - Add device fingerprinting

7. **HttpOnly Cookie Support**
   - Move to server-side cookie management
   - Requires Cloudflare Worker proxy
   - Eliminates XSS token theft risk

---

## CONCLUSION

Split Lease implements a **server-validated session model** where:
- **Client stores tokens** in localStorage (no timeout)
- **Server validates on each request** via Edge Function
- **Session is invalidated server-side** by Bubble API
- **No client-side session timeout** is implemented

This design prioritizes **availability** over security - users stay logged in indefinitely, but are always validated server-side. Token expiry and invalidation is delegated to Bubble API.

For better security:
1. Implement inactivity timeout (30-60 min)
2. Move tokens to sessionStorage
3. Add explicit token refresh monitoring
4. Encrypt tokens at rest

