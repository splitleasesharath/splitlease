# Session Management - Key Findings & Recommendations

---

## CRITICAL DISCOVERY: NO CLIENT-SIDE SESSION TIMEOUT

### What We Found
After comprehensive analysis of the codebase, **there is NO explicit client-side session timeout implemented**.

### Evidence
1. **No timeout constant defined**
   - `SESSION_VALIDATION.MAX_AUTH_CHECK_ATTEMPTS = 3` is a retry limit, NOT a timeout
   - No time-based config values in `constants.js`
   - No inactivity timer in any auth file

2. **No activity tracking**
   - `LAST_AUTH` constant defined but **completely unused**
   - No timestamp recording on login/validation
   - No idle-time detection mechanism
   - No warning before auto-logout

3. **No refresh monitoring**
   - Token refresh delegated entirely to Supabase SDK
   - No manual expiry checking
   - No proactive token refresh
   - Client assumes token valid until API call fails

4. **Session persists indefinitely**
   - localStorage stores tokens permanently
   - Sessions survive browser restart
   - Sessions survive multiple days of inactivity
   - Only cleared on explicit logout or token rejection

### Current Behavior
```
Time 0:00   → User logs in → Token stored with 3600s expiry
Time 1:00   → Token expires server-side → Client unaware
Time 1:30   → User makes API call → API rejects token → Clear session
Time 1:35   → Redirect to login with no warning
```

**User Experience**: Sudden logout with potential data loss

---

## COMPLETE SESSION ARCHITECTURE

### 1. Session Creation

**Flow**:
```
Login Page → loginUser(email, password)
  → Edge Function auth-user/login
    → supabaseAdmin.auth.signInWithPassword()
    → Fetch user profile from public.user
    ← Returns: access_token, refresh_token, expires_in: 3600, user_id
  → Store tokens in localStorage:
    - __sl_at__ (access token)
    - __sl_sid__ (session/user id)
  → Set state in localStorage:
    - sl_auth_state = 'true'
    - sl_user_id = user_id
    - sl_user_type = user_type
  → Call supabase.auth.setSession():
    - Stores in sb-<PROJECT_ID>-auth-token (Supabase SDK)
  ← User is logged in
```

**Files Involved**:
- Frontend: `app/src/lib/auth.js:445-571` (loginUser)
- Edge: `supabase/functions/auth-user/handlers/login.ts`

**Session Duration**: 3600 seconds (1 hour) from Supabase Auth

---

### 2. Session Validation

**Three-Tier Check** (on page load):

1. **Cookie Check** (legacy Bubble compatibility)
   - Checks `document.cookie` for `loggedIn=true`
   - If found: Assume authenticated

2. **Supabase SDK Check** (native signup)
   - Calls `supabase.auth.getSession()`
   - Checks internal SDK state from localStorage
   - If found: Sync to secure storage, assume authenticated

3. **Secure Storage Check** (fallback)
   - Checks `sl_auth_state` in localStorage
   - Verifies tokens exist: `__sl_at__` and `__sl_sid__`
   - If all present: Assume authenticated

**Files Involved**:
- `app/src/lib/auth.js:116-184` (checkAuthStatus)
- `app/src/lib/secureStorage.js:252-257` (hasValidTokens)

**Key Issue**: This validation is **NOT authoritative**
- Only checks if state/tokens exist
- Does NOT verify token expiry
- Does NOT call server
- Server validates on API calls

---

### 3. Session Persistence

**Where Tokens Live**:

| Key | Storage | Persists? | Clears When? |
|-----|---------|-----------|--------------|
| `__sl_at__` | localStorage | ✅ Yes (browser restart) | Logout, cache clear |
| `__sl_sid__` | localStorage | ✅ Yes (browser restart) | Logout, cache clear |
| `sb-*-auth` | localStorage | ✅ Yes (browser restart) | signOut(), logout |
| `sl_auth_state` | localStorage | ✅ Yes (browser restart) | Logout |
| Cookies | Browser | ❌ No (session/explicit) | Logout, explicit clear |

**Current Behavior**:
- Sessions survive: Browser restart, tab close, hours of inactivity
- Sessions cleared by: User logout, manual cache clear, browser private mode

**No "Remember Me"** feature - all sessions persist indefinitely

---

### 4. Token Expiry & Refresh

**Supabase Auth Handles Refresh**:
```javascript
// When set in frontend:
await supabase.auth.setSession({
  access_token: '...',
  refresh_token: '...'
})

// Supabase SDK automatically:
// 1. Stores both tokens in localStorage
// 2. Monitors token expiry (3600 seconds)
// 3. Refreshes 60 seconds before expiry
// 4. Updates access_token transparently
// 5. No user interaction required
```

**How Split Lease Uses It**:
- Stores refresh_token in `__sl_rd__` (defined but currently unused)
- Relies entirely on Supabase SDK for automatic refresh
- No manual refresh code

**If Token Expires**:
- Client: No immediate effect (tokens still in storage)
- Server: Rejects next API request (401 Unauthorized)
- Client: Detects rejection, clears all data, redirects to login

---

### 5. Session Invalidation (Logout)

**Logout Flow**:

```javascript
logoutUser()
  ├─ supabase.auth.signOut()
  │  └─ Clears Supabase SDK internal state
  │     Removes localStorage keys starting with 'sb-'
  │
  ├─ supabase.functions.invoke('auth-user', { action: 'logout' })
  │  └─ Currently returns { success: true } (no-op)
  │
  └─ clearAllAuthData()  ← ALWAYS RUNS (even if above fail)
     ├─ Remove __sl_at__ (access token)
     ├─ Remove __sl_sid__ (session ID)
     ├─ Remove __sl_rd__ (refresh data)
     ├─ Remove all state keys (sl_auth_state, sl_user_id, etc.)
     ├─ Remove legacy keys (splitlease_*)
     ├─ Remove all Supabase keys (sb-*, supabase.*)
     └─ Clear all cookies (domain=.split.lease and root)

Result: Complete session wipeout
```

**Files Involved**:
- `app/src/lib/auth.js:922-984` (logoutUser)
- `app/src/lib/secureStorage.js:207-246` (clearAllAuthData)

**Safety**: Atomic - all data guaranteed cleared even if API fails

---

### 6. Password Reset Flow

**Special Behavior**: **User stays logged in after password reset**

```
User requests password reset
  → requestPasswordReset(email)
  → Edge Function creates auth.users entry if needed
  → Sends password reset email
  ← Always returns success (prevents email enumeration)

User clicks reset link in email
  → Browser navigates to /reset-password#access_token=...&type=recovery
  → Supabase client detects PASSWORD_RECOVERY event
  → Automatically creates session with recovery token
  → ResetPasswordPage waits for PASSWORD_RECOVERY event

User enters new password
  → updatePassword(newPassword)
  → Calls Edge Function update_password action
  ← Password updated

User session handling:
  → updatePassword() syncs session to secure storage:
     - setSecureAuthToken(session.access_token)
     - setSecureSessionId(userId)
     - setAuthState(true, userId)
  → User remains logged in (no redirect to login)
  → Page shows success message
  → Auto-redirects to original page
```

**Files Involved**:
- `app/src/lib/auth.js:1056-1163` (updatePassword)
- `app/src/islands/pages/ResetPasswordPage.jsx`

**Important**: Proves concept of session preservation is possible

---

## SECURITY ANALYSIS

### Current Vulnerabilities

**1. Plaintext Token Storage**
```javascript
localStorage['__sl_at__'] = 'eyJhbGci...' // Unencrypted JWT
```
- **Risk**: XSS attack can steal tokens
- **Impact**: Attacker gains full user access
- **Mitigation**: None currently
- **Better**: Encrypt at rest, use sessionStorage

**2. No Inactivity Timeout**
```javascript
// Tokens persist forever in localStorage
// No activity monitoring
// No idle detection
```
- **Risk**: Stolen device = permanent access
- **Impact**: Session can be used long after user leaves device
- **Mitigation**: Token expires server-side (weak, requires active use)
- **Better**: 30-60 min inactivity timeout

**3. Session State is Non-Authoritative**
```javascript
isSessionValid() // Returns getAuthState() - just checks a flag
// NOT checking actual token validity
```
- **Risk**: Appears logged in but API calls might fail
- **Impact**: User confusion, lost form data
- **Mitigation**: Validation happens on API calls
- **Better**: Validate before operations

**4. No Device Tracking**
```javascript
// Can't see logged-in devices
// Can't logout specific device
// All devices share same account access
```
- **Risk**: One compromised device = all compromised
- **Impact**: Can't revoke specific device access
- **Mitigation**: None
- **Better**: Device fingerprinting, session management UI

---

### Current Protections

**1. Server-Side Validation** ✅
- Every API call validated by Edge Function
- Token expiry enforced server-side
- Expired tokens rejected immediately

**2. Atomic Logout** ✅
- All data cleared even if network fails
- Complete session wipeout guaranteed
- No orphaned tokens

**3. Same-Origin Policy** ✅
- localStorage isolated by domain
- Cookies restricted to split.lease domain
- HTTPS-only protection in production

**4. Token Refresh** ✅
- Automatic by Supabase SDK
- No manual token handling
- Prevents most expiry issues

---

## USAGE PATTERNS IN CODEBASE

### Protected Pages
Files check `isProtectedPage()` to require auth:
- `/guest-proposals` - `useGuestProposalsPageLogic.js`
- `/account-profile` - `account-profile.jsx`
- `/host-dashboard` - `ListingDashboardPage`

### Session Checks
1. **Initial load**: `checkAuthStatus()` on component mount
2. **Data fetch**: `validateTokenAndFetchUser()` before rendering user data
3. **API calls**: Token automatically included in Supabase calls

### Token Usage
1. `getAuthToken()` - Rarely, only in `auth.js` for API calls
2. `getSessionId()` - Rarely, for user identification
3. `getUserId()` - Frequently, public non-sensitive ID
4. `getUserType()` - Frequently, for role-based UI

---

## RECOMMENDATIONS FOR IMPROVEMENT

### Priority 1: Critical Security

**1. Implement Inactivity Timeout** (Recommended: 30 min)
```javascript
// Track last activity timestamp
localStorage.setItem('sl_last_activity', Date.now())

// On every interaction (click, scroll, input)
document.addEventListener('activity', () => {
  localStorage.setItem('sl_last_activity', Date.now())
})

// Check periodically (every 5 min)
setInterval(() => {
  const lastActivity = localStorage.getItem('sl_last_activity')
  const inactiveMs = Date.now() - lastActivity
  if (inactiveMs > 30 * 60 * 1000) { // 30 min
    clearAuthData()
    redirectToLogin()
  }
}, 5 * 60 * 1000)
```

**Benefits**:
- Protects against stolen devices
- Reduces window of token misuse
- Industry standard practice

**Effort**: Medium (4-8 hours)

---

**2. Move Tokens to SessionStorage** (Recommended: Medium)
```javascript
// Current: localStorage (persists forever)
// Better: sessionStorage (cleared on tab close)

// In secureStorage.js:
function setAuthToken(token) {
  if (!token) return
  sessionStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token)
}

function getAuthToken() {
  return sessionStorage.getItem(SECURE_KEYS.AUTH_TOKEN)
}
```

**Benefits**:
- Tokens cleared when browser closes
- Still persist across page reloads
- Better than indefinite persistence

**Trade-off**: Users must log in again after closing browser

**Effort**: Low (2-4 hours)

---

**3. Encrypt Tokens at Rest** (Recommended: Advanced)
```javascript
// Use Web Crypto API (browser native)
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
)

const iv = crypto.getRandomValues(new Uint8Array(12))
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  token
)

// Store encrypted value + IV
```

**Benefits**:
- Protects against XSS token theft
- Encryption key never persisted
- Industry best practice

**Trade-off**: Performance hit from encrypt/decrypt

**Effort**: High (12-20 hours)

---

### Priority 2: Operational Improvements

**4. Monitor Token Expiry Proactively**
```javascript
// Parse JWT exp claim
const parseJwt = (token) => {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(base64))
}

// Monitor expiry
const monitorTokenExpiry = (token) => {
  const decoded = parseJwt(token)
  const expiresIn = (decoded.exp * 1000) - Date.now()

  // Refresh 5 minutes before expiry
  setTimeout(() => {
    refreshAccessToken()
  }, expiresIn - (5 * 60 * 1000))
}
```

**Benefits**:
- Prevents "sudden logout" during active use
- Proactively refreshes before expiry
- Better user experience

**Effort**: Medium (6-10 hours)

---

**5. Implement Device Tracking**
```javascript
// On login, store device fingerprint
const deviceId = generateDeviceId()
localStorage.setItem('sl_device_id', deviceId)

// Include in validate() call
const userData = await validateTokenAndFetchUser()
// Pass device_id to backend

// Backend tracks: user_id + device_id + last_activity
// Allows viewing/revoking device sessions
```

**Benefits**:
- Users can see logged-in devices
- Revoke specific device sessions
- Detect suspicious activity

**Effort**: High (20-30 hours)

---

### Priority 3: Long-term Architecture

**6. HttpOnly Cookie Support**
- Move tokens to server-side HttpOnly cookies
- Eliminate XSS token theft risk
- Requires Cloudflare Worker proxy

**Effort**: Very High (30-50 hours)

---

**7. Multi-Factor Authentication (MFA)**
- TOTP (Google Authenticator)
- SMS verification
- Security keys

**Effort**: High (25-40 hours)

---

## IMPLEMENTATION ROADMAP

### Phase 1 (Weeks 1-2): Security Quick Wins
- [ ] Implement 30-minute inactivity timeout
- [ ] Move to sessionStorage (breaking change, document)
- [ ] Add warning before auto-logout (2 min warning)
- Total Effort: 12-16 hours

### Phase 2 (Weeks 3-4): Token Monitoring
- [ ] Parse JWT exp claim
- [ ] Implement proactive refresh
- [ ] Add token refresh logging
- Total Effort: 8-12 hours

### Phase 3 (Weeks 5-6): Device Tracking
- [ ] Generate device fingerprints
- [ ] Track device sessions in database
- [ ] Build device management UI
- Total Effort: 20-30 hours

### Phase 4 (Months 2-3): Advanced Security
- [ ] Encrypt tokens at rest
- [ ] Implement HttpOnly cookies
- [ ] Add MFA support
- Total Effort: 60-100 hours

---

## TESTING CHECKLIST

Before deploying any session changes:

- [ ] User can login and stay logged in
- [ ] User can logout and all tokens clear
- [ ] Protected pages redirect to login when not authenticated
- [ ] User data persists across page reloads
- [ ] Session expires after configured timeout
- [ ] Warning appears before auto-logout
- [ ] User can dismiss warning and extend session
- [ ] Password reset keeps user logged in
- [ ] Token refresh happens transparently
- [ ] API calls fail with 401 when token expires
- [ ] Multiple tabs share same session
- [ ] Closing browser clears localStorage (if using sessionStorage)
- [ ] Concurrent logins don't conflict
- [ ] Browser back button doesn't expose logged-out state

---

## CONCLUSION

Split Lease implements a **server-validated session model** where:
- Tokens are stored client-side indefinitely
- Server validates on every API request
- Token expiry is server-enforced
- **No client-side timeout exists**

This design prioritizes **availability** (users stay logged in) over **security** (no session timeout).

**For production**, recommend implementing at minimum:
1. 30-60 minute inactivity timeout
2. User warning before auto-logout
3. Proactive token refresh monitoring

The password reset flow proves the team understands session preservation is possible - that same pattern should apply to normal sessions with a configurable timeout.

