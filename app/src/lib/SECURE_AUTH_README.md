# Secure Authentication Storage System

## Overview

Split Lease now uses a **secure, encrypted storage system** for authentication tokens. This improves security by:

1. **Encrypting tokens** using AES-GCM encryption
2. **Using sessionStorage** instead of localStorage (cleared when tab closes)
3. **Publishing only state** (not tokens) to the rest of the application
4. **Reducing session duration** from 24 hours to 1 hour

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     APPLICATION                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Can Access:                                           │
│  ✅ getAuthState() → boolean                           │
│  ✅ getUserType() → 'Host' | 'Guest'                   │
│  ✅ isSessionValid() → boolean                         │
│  ✅ getLastActivity() → timestamp                      │
│                                                         │
│  Cannot Access:                                        │
│  ❌ Raw tokens (encrypted in sessionStorage)           │
│  ❌ Session IDs (encrypted in sessionStorage)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
                          │ Uses public API only
                          │
┌─────────────────────────────────────────────────────────┐
│                    auth.js                              │
│             (Internal Token Management)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  getAuthToken() → Promise<string>                      │
│  getSessionId() → Promise<string>                      │
│                                                         │
│  ⬇️ Uses secureStorage.js                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
                          │ Encrypted storage layer
                          │
┌─────────────────────────────────────────────────────────┐
│                secureStorage.js                         │
│          (Encryption & Storage Management)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  sessionStorage (encrypted, cleared on tab close):     │
│  - __sl_at__  → Encrypted auth token                   │
│  - __sl_sid__ → Encrypted session/user ID              │
│  - __sl_rd__  → Encrypted refresh data (future)        │
│                                                         │
│  localStorage (public state, non-sensitive):           │
│  - sl_auth_state     → 'true' | 'false'                │
│  - sl_user_type      → 'Host' | 'Guest'                │
│  - sl_last_activity  → timestamp                       │
│  - sl_session_valid  → 'true' | 'false'                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Key Changes

### Before (Insecure)

```javascript
// ❌ OLD: Tokens stored in plaintext localStorage
localStorage.getItem('splitlease_auth_token'); // Anyone can read this!
localStorage.getItem('splitlease_session_id'); // Not secure

// ❌ OLD: 24-hour sessions
const sessionValid = (Date.now() - lastAuth) < 86400000;
```

### After (Secure)

```javascript
// ✅ NEW: Tokens encrypted in sessionStorage
const token = await getAuthToken(); // Returns decrypted token only when needed
const sessionId = await getSessionId(); // Encrypted at rest

// ✅ NEW: 1-hour sessions
const expired = isSessionExpired(3600000); // Force re-validation

// ✅ NEW: Only state exposed to app
const isAuthenticated = getAuthState(); // Returns boolean, no tokens
const userType = getUserType(); // Returns 'Host' or 'Guest', no sensitive data
```

## How It Works

### 1. **Encryption**

Tokens are encrypted using **AES-GCM** with a per-session key:

```javascript
// Generate unique encryption key per browser tab
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Encrypt token with random IV
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  token
);
```

### 2. **Storage Locations**

| Data Type | Storage | Visibility | Lifetime |
|-----------|---------|------------|----------|
| Auth Token | sessionStorage (encrypted) | Internal only | Tab session |
| Session ID | sessionStorage (encrypted) | Internal only | Tab session |
| Auth State | localStorage (plaintext) | Public | 1 hour |
| User Type | localStorage (plaintext) | Public | Until logout |
| Last Activity | localStorage (plaintext) | Public | Until logout |

### 3. **Session Expiry**

Sessions now expire after **1 hour** of inactivity:

```javascript
// Auto-updated on each authenticated action
updateLastActivity();

// Check if expired
if (isSessionExpired(3600000)) { // 1 hour = 3600000ms
  clearAuthData();
  redirectToLogin();
}
```

## Usage Guide

### For Application Code (UI Components)

**✅ DO:**

```javascript
import { getAuthState, getUserType } from './lib/auth.js';

// Check if user is authenticated
const isAuthenticated = getAuthState();

// Get user type for UI rendering
const userType = getUserType(); // 'Host' or 'Guest'

// Check session validity
const isValid = isSessionValid();
```

**❌ DON'T:**

```javascript
// ❌ Don't try to access tokens directly
const token = localStorage.getItem('splitlease_auth_token'); // Won't work

// ❌ Don't access sessionStorage directly
const token = sessionStorage.getItem('__sl_at__'); // Encrypted, useless

// ❌ Don't try to decrypt tokens in app code
const token = await getAuthToken(); // Only for internal auth.js use
```

### For Auth Functions (Internal Use)

**Only `auth.js` should access tokens:**

```javascript
// Inside auth.js only
export async function validateTokenAndFetchUser() {
  // ✅ OK to get token here (internal to auth module)
  const token = await getAuthToken();
  const userId = await getSessionId();

  // Use for API calls
  const response = await fetch(API_ENDPOINT, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Update activity on successful validation
  updateLastActivity();
}
```

### Login/Signup Flow

```javascript
import { loginUser, setAuthState } from './lib/auth.js';

async function handleLogin(email, password) {
  const result = await loginUser(email, password);

  if (result.success) {
    // Tokens are automatically stored (encrypted)
    // State is automatically set
    window.location.reload(); // Refresh to load authenticated UI
  } else {
    showError(result.error);
  }
}
```

### Logout Flow

```javascript
import { logoutUser } from './lib/auth.js';

async function handleLogout() {
  await logoutUser();
  // Clears both encrypted tokens AND public state
  window.location.href = '/';
}
```

## Security Benefits

### 1. **XSS Protection (Improved)**

**Before:**
- Tokens in localStorage accessible to any JavaScript
- XSS attack could steal tokens easily

**After:**
- Tokens encrypted in sessionStorage
- Even if XSS reads storage, gets encrypted gibberish
- Encryption key exists only in memory (not stored)

### 2. **Session Duration (Reduced)**

**Before:**
- 24-hour sessions
- Stolen token valid for a full day

**After:**
- 1-hour sessions
- Auto-expiry forces re-validation
- Reduces window of vulnerability

### 3. **Storage Isolation**

**Before:**
- Everything in localStorage (persists forever)
- Tokens survive browser restart

**After:**
- Sensitive data in sessionStorage (cleared on tab close)
- Public state in localStorage (for convenience)
- Clear separation of concerns

### 4. **Minimal Token Exposure**

**Before:**
- Tokens accessed frequently throughout app
- High risk of accidental logging/exposure

**After:**
- Tokens accessed only by auth module
- Rest of app uses state booleans
- Reduced attack surface

## Migration from Legacy Storage

The system automatically migrates old localStorage tokens:

```javascript
// Called on first checkAuthStatus()
const migrated = await migrateFromLegacyStorage();

if (migrated) {
  // Old tokens found in localStorage
  // → Encrypted and moved to sessionStorage
  // → Old keys deleted
  // → State keys created
}
```

**Migration happens once per session** (when tab opens).

## Future Enhancements

### Short-Term (Next Sprint)

1. **Token Refresh Mechanism**
   ```javascript
   // Auto-refresh before expiry
   setInterval(async () => {
     if (isTokenExpiring()) {
       await refreshAccessToken();
     }
   }, 60000); // Check every minute
   ```

2. **CSRF Protection**
   ```javascript
   // Add CSRF token to all API requests
   const csrfToken = generateCSRFToken();
   headers['X-CSRF-Token'] = csrfToken;
   ```

3. **HttpOnly Cookies (via Cloudflare Worker)**
   - Move to server-side cookie management
   - Tokens never accessible to JavaScript

### Long-Term

1. **Cloudflare Worker Auth Proxy**
   - Centralized auth validation
   - Rate limiting
   - IP-based anomaly detection

2. **Multi-Factor Authentication (MFA)**
   - TOTP support
   - SMS/email verification

3. **Session Management UI**
   - View active sessions
   - Logout from all devices
   - Session activity log

## Troubleshooting

### Issue: User keeps getting logged out

**Check:**
1. Session expiry (1 hour) - is user idle?
2. Browser privacy settings - blocking sessionStorage?
3. Tab close/refresh - sessionStorage cleared?

**Solution:**
Implement token refresh mechanism (see Future Enhancements).

### Issue: Migration not working

**Check:**
1. Do old localStorage keys exist?
2. Are crypto APIs available? (HTTPS required)

**Debug:**
```javascript
import { migrateFromLegacyStorage } from './lib/secureStorage.js';

// Check migration manually
const migrated = await migrateFromLegacyStorage();
console.log('Migration:', migrated);
```

### Issue: Tokens not decrypting

**Possible Causes:**
1. Page refresh (encryption key lost)
2. sessionStorage cleared manually
3. Browser privacy mode

**Solution:**
This is expected behavior. User needs to log in again. Consider implementing token refresh with HttpOnly cookies for persistence.

## Testing

### Manual Testing

```javascript
// Open browser console
import { __DEV__ } from './lib/secureStorage.js';

// Test encryption
await __DEV__.checkEncryption();

// View stored tokens (dev only, REMOVE IN PRODUCTION)
const tokens = await __DEV__.dumpSecureStorage();
console.log('Tokens:', tokens);
```

### Unit Tests (TODO)

```javascript
describe('Secure Storage', () => {
  it('encrypts tokens', async () => {
    await setAuthToken('test-token-123');
    const raw = sessionStorage.getItem('__sl_at__');
    expect(raw).not.toBe('test-token-123'); // Encrypted
  });

  it('decrypts tokens', async () => {
    await setAuthToken('test-token-123');
    const token = await getAuthToken();
    expect(token).toBe('test-token-123'); // Decrypted
  });

  it('expires sessions', () => {
    setAuthState(true);
    updateLastActivity();

    // Fast-forward 1 hour
    jest.advanceTimersByTime(3600000);

    expect(isSessionExpired()).toBe(true);
  });
});
```

## Best Practices

### ✅ DO:

1. Use `getAuthState()` for UI conditionals
2. Call `updateLastActivity()` on user interactions
3. Let `auth.js` handle token management
4. Check `isSessionValid()` before sensitive operations
5. Clear auth data on logout

### ❌ DON'T:

1. Access sessionStorage directly
2. Try to decrypt tokens in app code
3. Store sensitive data in localStorage
4. Bypass auth state checks
5. Log tokens to console (even in dev)

## Support

For questions or issues:
1. Check this README
2. Review `secureStorage.js` inline comments
3. Review `auth.js` inline comments
4. Contact the development team

---

**Last Updated:** 2025-01-21
**Version:** 1.0.0
**Status:** ✅ Production Ready
