# Session Management - Visual Lifecycle Diagrams
## Split Lease Authentication System

---

## 1. COMPLETE SESSION LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SESSION CREATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User enters credentials at /signup-login                          │
│  │                                                                 │
│  ▼                                                                 │
│  Frontend: loginUser(email, password)                             │
│  │                                                                 │
│  ├─→ supabase.functions.invoke('auth-user', {                     │
│  │     action: 'login',                                           │
│  │     payload: { email, password }                               │
│  │   })                                                           │
│  │                                                                 │
│  ▼                                                                 │
│  Edge Function (supabase/functions/auth-user/handlers/login.ts)   │
│  │                                                                 │
│  ├─→ supabaseAdmin.auth.signInWithPassword(email, password)       │
│  │   [Supabase Auth handles this natively]                        │
│  │                                                                 │
│  ├─→ Fetch user profile from public.user table                    │
│  │                                                                 │
│  └─→ Return: {                                                    │
│        access_token,    // Supabase JWT                           │
│        refresh_token,   // For auto-refresh                       │
│        expires_in,      // 3600 seconds (1 hour)                  │
│        user_id,         // Bubble _id                             │
│        user_type        // 'Host' or 'Guest'                      │
│      }                                                             │
│  │                                                                 │
│  ▼                                                                 │
│  Frontend: Store tokens in localStorage                           │
│  │                                                                 │
│  ├─→ localStorage['__sl_at__'] = access_token                     │
│  │   localStorage['__sl_sid__'] = user_id                        │
│  │                                                                 │
│  ├─→ supabase.auth.setSession({ access_token, refresh_token })   │
│  │   [Supabase stores in localStorage automatically]              │
│  │                                                                 │
│  ├─→ localStorage['sl_auth_state'] = 'true'                       │
│  │   localStorage['sl_user_id'] = user_id                        │
│  │   localStorage['sl_user_type'] = user_type                    │
│  │                                                                 │
│  └─→ Set cookies for legacy compatibility:                       │
│      document.cookie = 'loggedIn=true; domain=.split.lease'       │
│      document.cookie = 'username=...'; domain=.split.lease'       │
│  │                                                                 │
│  ▼                                                                 │
│  ✅ SESSION CREATED - User logged in                              │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. SESSION VALIDATION (ON PAGE LOAD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION VALIDATION                             │
│                   (Called when page loads)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User navigates to page → checkAuthStatus()                        │
│  │                                                                 │
│  ▼                                                                 │
│  Check 1: Split Lease Cookies (Legacy)                            │
│  │                                                                 │
│  └─→ document.cookie.find(c => c.startsWith('loggedIn='))         │
│      │                                                             │
│      ├─ IF found: ✅ AUTHENTICATED (legacy)                       │
│      │            Return true                                     │
│      │                                                             │
│      └─ IF NOT found: continue...                                 │
│  │                                                                 │
│  ▼                                                                 │
│  Check 2: Supabase Auth Session (Native)                          │
│  │                                                                 │
│  └─→ supabase.auth.getSession()                                   │
│      [Checks Supabase SDK internal state]                          │
│      │                                                             │
│      ├─ IF session found:                                         │
│      │  ✅ AUTHENTICATED (native)                                 │
│      │  - Sync to secure storage                                  │
│      │  - setAuthToken(session.access_token)                      │
│      │  - setSessionId(user_id)                                   │
│      │  - Return true                                             │
│      │                                                             │
│      └─ IF NOT found: continue...                                 │
│  │                                                                 │
│  ▼                                                                 │
│  Check 3: Secure Storage (Fallback)                               │
│  │                                                                 │
│  └─→ getAuthState()  [checks sl_auth_state in localStorage]       │
│      │                                                             │
│      ├─ IF 'true':                                                │
│      │  - hasValidTokens() [check __sl_at__ and __sl_sid__]      │
│      │  │                                                         │
│      │  ├─ IF both exist:                                         │
│      │  │  ✅ AUTHENTICATED (secure storage)                      │
│      │  │  Return true                                            │
│      │  │                                                         │
│      │  └─ IF either missing:                                     │
│      │     ❌ NOT AUTHENTICATED                                   │
│      │     Return false                                           │
│      │                                                             │
│      └─ IF NOT 'true':                                            │
│         ❌ NOT AUTHENTICATED                                      │
│         Return false                                              │
│  │                                                                 │
│  ▼                                                                 │
│  Result:                                                           │
│  │                                                                 │
│  ├─ IF authenticated: Continue page load                          │
│  │                                                                 │
│  └─ IF NOT authenticated:                                         │
│     ├─ Check if protected page (guest-proposals, account-profile)  │
│     │  │                                                           │
│     │  ├─ IF protected: redirectToLogin()                         │
│     │  └─ IF public: Load page normally                           │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. SESSION DATA RETRIEVAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                 VALIDATE & FETCH USER DATA                          │
│        (Called when user data is needed - proposals, etc.)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Component needs user data → validateTokenAndFetchUser()           │
│  │                                                                 │
│  ▼                                                                 │
│  Get token and user_id from storage:                              │
│  │                                                                 │
│  ├─→ token = getAuthToken()     [from __sl_at__]                  │
│  ├─→ userId = getSessionId()    [from __sl_sid__]                 │
│  │                                                                 │
│  └─ IF both exist: continue...                                    │
│     ELSE: Check Supabase Auth session, sync, continue...          │
│  │                                                                 │
│  ▼                                                                 │
│  Call Edge Function to validate with Bubble/Supabase:             │
│  │                                                                 │
│  └─→ supabase.functions.invoke('auth-user', {                     │
│        action: 'validate',                                        │
│        payload: { token, user_id: userId }                        │
│      })                                                           │
│  │                                                                 │
│  ▼                                                                 │
│  Edge Function (validate.ts):                                     │
│  │                                                                 │
│  ├─→ Detect auth type:                                            │
│  │   isUUID(user_id) ?                                            │
│  │   │                                                             │
│  │   ├─ YES (Supabase Auth):                                      │
│  │   │  ├─ supabase.auth.getUser(token)                           │
│  │   │  │  [Validates JWT with Supabase]                          │
│  │   │  │                                                         │
│  │   │  └─ Fetch user from public.user by email                   │
│  │   │                                                             │
│  │   └─ NO (Bubble Auth):                                         │
│  │      └─ Fetch user from public.user by _id                     │
│  │                                                                 │
│  ├─→ IF validation fails:                                         │
│  │   throw BubbleApiError('Invalid or expired session', 401)       │
│  │                                                                 │
│  └─→ IF validation succeeds:                                      │
│      return { userId, firstName, email, userType, ... }           │
│  │                                                                 │
│  ▼                                                                 │
│  Frontend receives response:                                      │
│  │                                                                 │
│  ├─ IF error: ❌ SESSION INVALID/EXPIRED                          │
│  │  └─→ clearAuthData()  [Remove all tokens and state]            │
│  │      redirectToLogin()                                         │
│  │                                                                 │
│  └─ IF success: ✅ SESSION VALID                                  │
│     └─→ Return userData to component                              │
│         Component can now display user info                       │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. SESSION LOGOUT

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SESSION LOGOUT                              │
│                  (User clicks logout button)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User clicks "Logout" → logoutUser()                               │
│  │                                                                 │
│  ▼                                                                 │
│  Step 1: Clear Supabase Auth client session                        │
│  │                                                                 │
│  └─→ supabase.auth.signOut()                                       │
│      [Clears Supabase SDK internal state]                          │
│      [Removes localStorage keys starting with 'sb-']              │
│  │                                                                 │
│  ├─ IF success: ✅ Continue                                        │
│  └─ IF error:   ⚠️ Log warning, continue anyway                   │
│  │                                                                 │
│  ▼                                                                 │
│  Step 2: Call Edge Function logout                                │
│  │                                                                 │
│  └─→ supabase.functions.invoke('auth-user', {                     │
│        action: 'logout',                                          │
│        payload: { token }                                         │
│      })                                                           │
│      [Currently no-op in backend]                                 │
│  │                                                                 │
│  ├─ IF success: Continue                                          │
│  └─ IF error:   Log error, continue anyway                        │
│  │                                                                 │
│  ▼                                                                 │
│  Step 3: ALWAYS clear all local auth data (regardless of steps 1-2)
│  │                                                                 │
│  └─→ clearAllAuthData():                                          │
│      ├─ Remove __sl_at__ (access token)                           │
│      ├─ Remove __sl_sid__ (session ID)                            │
│      ├─ Remove __sl_rd__ (refresh data)                           │
│      ├─ Remove sl_auth_state                                      │
│      ├─ Remove sl_user_id                                         │
│      ├─ Remove sl_user_type                                       │
│      ├─ Remove sl_first_name                                      │
│      ├─ Remove sl_avatar_url                                      │
│      ├─ Remove legacy keys (splitlease_*)                         │
│      ├─ Remove all Supabase keys (sb-*, supabase.*)               │
│      └─ Clear cookies:                                            │
│         ├─ loggedIn=false; path=/; max-age=0                      │
│         ├─ username=; path=/; max-age=0                           │
│         └─ [Same for domain=.split.lease]                         │
│  │                                                                 │
│  ▼                                                                 │
│  ✅ SESSION TERMINATED - All auth data removed                    │
│  │                                                                 │
│  └─→ window.location.href = '/'  [Redirect to home]               │
│      [User is now logged out]                                     │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. PASSWORD RESET WITH SESSION PRESERVATION

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PASSWORD RESET FLOW                            │
│          (User clicks reset link from email, sets new password)     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. USER REQUESTS RESET                                            │
│  └──────────────────────────────────────────────────────────────   │
│     User enters email → requestPasswordReset(email)                │
│     │                                                               │
│     ▼                                                               │
│     supabase.functions.invoke('auth-user', {                       │
│       action: 'request_password_reset',                            │
│       payload: { email, redirectTo: '/reset-password' }            │
│     })                                                             │
│     │                                                               │
│     ▼                                                               │
│     Edge Function: handleRequestPasswordReset(email)               │
│     │                                                               │
│     ├─ Check if email in auth.users                                │
│     ├─ If not, check public.user (legacy)                          │
│     │  └─ If found, create auth.users entry with temp password     │
│     ├─ Send password reset email via Supabase Auth                 │
│     │  └─ Email contains link: /reset-password?token=XXX           │
│     └─ ALWAYS return success (prevent email enumeration)           │
│  │                                                                 │
│  ▼                                                                 │
│  2. USER CLICKS RESET LINK IN EMAIL                                │
│  └──────────────────────────────────────────────────────────────   │
│     Email link: /reset-password#access_token=XXX&type=recovery     │
│     │                                                               │
│     ▼                                                               │
│     User browser navigates to /reset-password                      │
│     │                                                               │
│     ├─ Supabase client detects URL hash with recovery token        │
│     ├─ Fires PASSWORD_RECOVERY event                               │
│     ├─ Automatically sets session with recovery token              │
│     │                                                               │
│     └─ ResetPasswordPage.jsx:                                      │
│        ├─ Listens for PASSWORD_RECOVERY event                      │
│        ├─ Checks supabase.auth.getSession()                        │
│        ├─ If session found: setStatus('ready') ✅                  │
│        └─ If timeout (4s): show error                              │
│  │                                                                 │
│  ▼                                                                 │
│  3. USER ENTERS NEW PASSWORD                                       │
│  └──────────────────────────────────────────────────────────────   │
│     User fills form with new password → handleSubmit()             │
│     │                                                               │
│     ├─ Client validation:                                          │
│     │  ├─ Check password length >= 4                               │
│     │  └─ Check passwords match                                    │
│     │                                                               │
│     ▼                                                               │
│     updatePassword(newPassword)                                    │
│     │                                                               │
│     ├─ Get current session (from PASSWORD_RECOVERY event)          │
│     │                                                               │
│     │  supabase.auth.getSession()                                  │
│     │  │                                                            │
│     │  └─ Session contains recovery token + access_token           │
│     │                                                               │
│     ├─ Call Edge Function:                                         │
│     │                                                               │
│     │  supabase.functions.invoke('auth-user', {                    │
│     │    action: 'update_password',                                │
│     │    payload: { password, access_token: session.access_token } │
│     │  })                                                          │
│     │                                                               │
│     ▼                                                               │
│     Edge Function: handleUpdatePassword()                          │
│     │                                                               │
│     └─→ supabase.auth.admin.updateUserById(                        │
│            { password: newPassword }                                │
│          )  [Updates user password in Supabase Auth]               │
│  │                                                                 │
│  ▼                                                                 │
│  4. KEEP USER LOGGED IN (Session Preservation)                     │
│  └──────────────────────────────────────────────────────────────   │
│     ✅ Password updated successfully!                              │
│     │                                                               │
│     └─→ Frontend: Sync session to secure storage                   │
│         │                                                           │
│         ├─ setSecureAuthToken(session.access_token)                │
│         ├─ setSecureSessionId(userId)                              │
│         ├─ setAuthState(true, userId)                              │
│         ├─ setSecureUserType(userType)                             │
│         └─ isUserLoggedInState = true                              │
│         │                                                           │
│         └─→ User remains logged in with new password! ✅           │
│  │                                                                 │
│  ▼                                                                 │
│  5. REDIRECT                                                       │
│  └──────────────────────────────────────────────────────────────   │
│     Show success message for 2.5 seconds                           │
│     │                                                               │
│     └─→ window.location.href = returnTo  [e.g., /home]            │
│     │                                                               │
│     └─→ ✅ Reset complete, user stays logged in                    │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. TOKEN STORAGE & LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TOKEN STORAGE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SUPABASE AUTH TOKENS (via Supabase SDK)                           │
│  ├─ Storage: localStorage with key pattern sb-<PROJECT_ID>-auth    │
│  ├─ Format: JSON { access_token, refresh_token, expires_at }       │
│  ├─ Persistence: Survives browser restart                          │
│  ├─ Expiry: 3600 seconds (1 hour) from Supabase                    │
│  ├─ Refresh: Automatic by Supabase SDK (60s before expiry)         │
│  └─ Cleared: By supabase.auth.signOut() or clearAllAuthData()      │
│  │                                                                 │
│  CUSTOM AUTH TOKENS (Split Lease secure storage)                   │
│  ├─ __sl_at__ (Access Token):                                      │
│  │  ├─ Value: Supabase JWT access token                            │
│  │  ├─ Persistence: localStorage (plaintext)                       │
│  │  └─ Used in: validateTokenAndFetchUser() API calls              │
│  │                                                                 │
│  ├─ __sl_sid__ (Session ID):                                       │
│  │  ├─ Value: user_id (Bubble _id)                                 │
│  │  ├─ Persistence: localStorage (plaintext)                       │
│  │  └─ Used in: API calls as user identifier                       │
│  │                                                                 │
│  └─ __sl_rd__ (Refresh Data):                                      │
│     ├─ Value: { refresh_token, ... }                               │
│     ├─ Status: Stored but UNUSED                                   │
│     └─ Purpose: Reserved for future refresh implementation         │
│  │                                                                 │
│  PUBLIC STATE (localStorage - non-sensitive)                       │
│  ├─ sl_auth_state: 'true' | 'false'                                │
│  │  └─ Indicates if user is logged in (hint only)                 │
│  ├─ sl_user_id: user_id (public identifier)                        │
│  │  └─ Used for UI rendering, not sensitive                       │
│  ├─ sl_user_type: 'Host' | 'Guest'                                 │
│  │  └─ Used for role-based UI                                     │
│  ├─ sl_first_name: User's first name                               │
│  │  └─ For optimistic UI display                                  │
│  └─ sl_avatar_url: Profile photo URL                               │
│     └─ For user avatar in header                                  │
│  │                                                                 │
│  LEGACY KEYS (automatically migrated on first load)                │
│  ├─ splitlease_auth_token (deprecated)                             │
│  ├─ splitlease_session_id (deprecated)                             │
│  ├─ splitlease_user_type (deprecated)                              │
│  └─ All removed on logout via clearAllAuthData()                   │
│  │                                                                 │
│  CROSS-DOMAIN COOKIES (for legacy compatibility)                   │
│  ├─ loggedIn=true; domain=.split.lease                             │
│  ├─ username=...; domain=.split.lease                              │
│  └─ splitlease_auth=...; domain=.split.lease                       │
│     All cleared on logout                                          │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. SESSION TIMEOUT BEHAVIOR (CURRENT)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NO CLIENT-SIDE TIMEOUT                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SESSION LIFETIME BEHAVIOR:                                        │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  TIME: 0:00 - User logs in                                        │
│  ├─ Tokens stored in localStorage: __sl_at__, __sl_sid__           │
│  ├─ State set: sl_auth_state = 'true'                              │
│  └─ Session: ✅ VALID                                              │
│                                                                     │
│  TIME: 0:30 - User browses site                                   │
│  ├─ Tokens still in localStorage (unchanged)                       │
│  ├─ State still: sl_auth_state = 'true'                            │
│  ├─ NO timeout check, NO activity monitoring                       │
│  └─ Session: ✅ VALID (client thinks so)                           │
│                                                                     │
│  TIME: 1:00 - Server-side token expires (Bubble API)              │
│  ├─ Client tokens still in localStorage (unchanged)                │
│  ├─ State still: sl_auth_state = 'true'                            │
│  ├─ Client has no idea token is expired                            │
│  └─ Session: ❌ INVALID (server-side)                              │
│                                                                     │
│  TIME: 2:00 - User makes API call (e.g., load proposals)          │
│  ├─ Frontend calls validateTokenAndFetchUser()                     │
│  ├─ Sends expired token to Edge Function                           │
│  ├─ Edge Function validates: supabase.auth.getUser(token)          │
│  ├─ Response: Invalid or expired session (401)                     │
│  ├─ Frontend: clearAuthData() [removes all tokens]                 │
│  └─ Redirects to login                                             │
│  │                                                                 │
│  ⚠️  USER EXPERIENCE:                                              │
│     - No warning before logout                                    │
│     - Sudden redirect to login on API call                        │
│     - Loses any unsaved form data                                 │
│  │                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. SESSION STATES & TRANSITIONS

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SESSION STATE MACHINE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌──────────────────┐                            │
│                    │                  │                            │
│                    │   ANONYMOUS      │                            │
│                    │   (Not Logged In) │                            │
│                    │                  │                            │
│                    │ Auth State:      │                            │
│                    │ - sl_auth_state: │                            │
│                    │   'false'        │                            │
│                    │ - No tokens      │                            │
│                    │                  │                            │
│                    └────────┬─────────┘                            │
│                             │                                      │
│                             │ User enters credentials &             │
│                             │ clicks login/signup                  │
│                             │                                      │
│                             ▼                                      │
│                    ┌──────────────────┐                            │
│                    │                  │                            │
│                    │   LOGGING_IN     │                            │
│                    │   (Authenticating)                            │
│                    │                  │                            │
│                    │ Calling:         │                            │
│                    │ Edge Function    │                            │
│                    │ auth-user        │                            │
│                    │                  │                            │
│                    └────┬─────────┬───┘                            │
│                         │         │                               │
│            ┌────────────┘         └──────────────────┐             │
│            │                                         │             │
│            │ Error                                   │ Success     │
│            │ (Invalid credentials)                   │             │
│            │                                         │             │
│            ▼                                         ▼             │
│    ┌──────────────────┐              ┌──────────────────┐         │
│    │   ANONYMOUS      │              │  AUTHENTICATED   │         │
│    │ (Back to start)  │              │  (Logged In)     │         │
│    │                  │              │                  │         │
│    │ Auth State:      │              │ Auth State:      │         │
│    │ - sl_auth_state: │              │ - sl_auth_state: │         │
│    │   'false'        │              │   'true'         │         │
│    │ - No tokens      │              │ - __sl_at__: JWT │         │
│    │ - Error shown    │              │ - __sl_sid__: ID │         │
│    │                  │              │ - Cookies set    │         │
│    │                  │              │                  │         │
│    └──────────────────┘              └────┬───────┬────┘         │
│                                            │       │              │
│                  ┌─────────────────────────┘       └────────────┐ │
│                  │                                            │  │ │
│                  │ User navigates                             │  │ │
│                  │ (no action)                                │  │ │
│                  │                                            │  │ │
│                  ▼                                            ▼  │ │
│        ┌──────────────────────┐                  ┌─────────────┬─┘ │
│        │  CHECKING_VALIDITY   │                  │ VALIDATING   │   │
│        │  (validateTokenAndFetch)                 │ (API call)   │   │
│        │                      │                  │              │   │
│        │ Calling:             │                  │ Calling:     │   │
│        │ auth-user validate   │                  │ auth-user    │   │
│        │ action               │                  │ validate     │   │
│        └──────┬───────────────┘                  │              │   │
│               │                                  └────┬─────┬───┘   │
│               │                                       │     │       │
│        ┌──────┴──────┬────────────┐        ┌─────────┘     │       │
│        │             │            │        │               │       │
│   Valid│         Error/         Error│   Valid│             │       │
│        │        Expired          (401)│        │             │       │
│        │                              │        │             │       │
│        ▼                              ▼        ▼             │       │
│    Continue               ┌──────────────────┐              │       │
│    (show data)            │  TOKEN_EXPIRED   │              │       │
│                           │ (Session Invalid)│              │       │
│                           │                  │              │       │
│                           │ Actions:         │              │       │
│                           │ - clearAuthData()│              │       │
│                           │ - redirectToLog  │              │       │
│                           │   in()           │              │       │
│                           │                  │              │       │
│                           └────────┬─────────┘              │       │
│                                    │                        │       │
│        ┌────────────────────────────────────────────────────┘       │
│        │                                                            │
│        └─────────────┬──────────────────────────────────────────    │
│                      │                                              │
│                      │ User logs out                                │
│                      │ OR clicks logout button                      │
│                      │                                              │
│                      ▼                                              │
│             ┌──────────────────┐                                    │
│             │                  │                                    │
│             │   LOGGING_OUT    │                                    │
│             │                  │                                    │
│             │ Calling:         │                                    │
│             │ supabase.auth.   │                                    │
│             │ signOut()        │                                    │
│             │                  │                                    │
│             └────────┬─────────┘                                    │
│                      │                                              │
│                      ├─→ clearAllAuthData()                         │
│                      │   - Remove __sl_at__                         │
│                      │   - Remove __sl_sid__                        │
│                      │   - Remove sl_auth_state                     │
│                      │   - Clear cookies                            │
│                      │                                              │
│                      │                                              │
│                      ▼                                              │
│             ┌──────────────────┐                                    │
│             │                  │                                    │
│             │   ANONYMOUS      │                                    │
│             │   (Back to start) │                                    │
│             │                  │                                    │
│             └──────────────────┘                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. KEY TAKEAWAYS

### Session Creation
- Supabase Auth handles password verification natively
- Returns tokens with 3600-second (1 hour) expiry
- Tokens stored in localStorage (plaintext)
- State flags set for quick checks

### Session Validation
- Three-tier check: Cookies → Supabase SDK → localStorage
- No client-side timeout implemented
- Server validates every API request
- Token expiry is Bubble API's responsibility

### Session Persistence
- ✅ Survives browser restart (localStorage)
- ✅ Survives tab close (localStorage)
- ❌ Does not survive cache clear
- ❌ No inactivity timeout

### Session Termination
- Logout clears ALL tokens and state
- Edge Function logout is currently a no-op
- Client-side clear-up always happens
- Safe even if server call fails

### Password Reset
- User stays logged in after password change
- Recovery token comes from email link
- Session is synced to secure storage
- Prevents forced re-login

