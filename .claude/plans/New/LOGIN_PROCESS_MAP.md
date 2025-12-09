# Split Lease Login Process Map

**GENERATED**: 2025-12-02
**STATUS**: Complete Analysis

---

## Overview

Split Lease uses a **hybrid authentication architecture** that bridges:
1. A React frontend (Vite + Islands Architecture)
2. Supabase Edge Functions as a secure proxy layer
3. Bubble.io as the actual authentication backend

The key innovation is that **API keys never touch the frontend**. All authentication requests are proxied through Supabase Edge Functions, which store sensitive credentials server-side.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │  SignUpLoginModal    │    │         Header.jsx               │   │
│  │  (SignUpLoginModal.  │◄───│  (triggers modal on click)       │   │
│  │   jsx)               │    └──────────────────────────────────┘   │
│  │                      │                                           │
│  │  Views:              │                                           │
│  │  - Initial           │                                           │
│  │  - Login             │                                           │
│  │  - Signup (2 steps)  │                                           │
│  │  - Password Reset    │                                           │
│  └──────────┬───────────┘                                           │
│             │                                                        │
│             ▼                                                        │
│  ┌──────────────────────┐                                           │
│  │     auth.js          │  loginUser(), signupUser(), logoutUser()  │
│  │     (lib/auth.js)    │◄──validateTokenAndFetchUser()             │
│  └──────────┬───────────┘  checkAuthStatus()                        │
│             │                                                        │
│             ▼                                                        │
│  ┌──────────────────────┐                                           │
│  │   secureStorage.js   │  setAuthToken(), getAuthToken()           │
│  │   (lib/secureStorage │  setSessionId(), getSessionId()           │
│  │    .js)              │  setAuthState(), clearAllAuthData()       │
│  └──────────────────────┘                                           │
│             │                                                        │
│             │  localStorage:                                         │
│             │  - __sl_at__ (auth token)                              │
│             │  - __sl_sid__ (session/user ID)                        │
│             │  - sl_auth_state (boolean)                             │
│             │  - sl_user_type (Host/Guest)                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ supabase.functions.invoke()
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  bubble-auth-proxy (index.ts)                                 │   │
│  │                                                               │   │
│  │  Routes:                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ action: "login"  ─► handlers/login.ts                   │ │   │
│  │  │ action: "signup" ─► handlers/signup.ts                  │ │   │
│  │  │ action: "logout" ─► handlers/logout.ts                  │ │   │
│  │  │ action: "validate" ─► handlers/validate.ts              │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  │                                                               │   │
│  │  Secrets (from Supabase Dashboard):                           │   │
│  │  - BUBBLE_API_BASE_URL                                        │   │
│  │  - BUBBLE_API_KEY                                             │   │
│  │  - SUPABASE_SERVICE_ROLE_KEY                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ fetch() with Bearer token
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BUBBLE.IO BACKEND                            │
│                                                                      │
│  Endpoints (BUBBLE_API_BASE_URL):                                   │
│  - POST /wf/login-user                                               │
│  - POST /wf/signup-user                                              │
│  - POST /wf/logout                                                   │
│  - POST /wf/validate-token                                           │
│                                                                      │
│  Returns:                                                            │
│  - token (Bearer JWT)                                                │
│  - user_id                                                           │
│  - expires (seconds)                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Login Flow (Step-by-Step)

### 1. User Opens Modal

**Trigger**: User clicks "Sign In" button in `Header.jsx`

**Component**: `SignUpLoginModal.jsx`
- Located at: `app/src/islands/shared/SignUpLoginModal.jsx`
- Initial view: "Welcome" screen with options

### 2. User Enters Credentials

**Views in SignUpLoginModal**:
```javascript
const VIEWS = {
  INITIAL: 'initial',      // Welcome screen
  LOGIN: 'login',          // Email + password form
  SIGNUP_STEP1: 'signup-step1',  // First name, last name, email
  SIGNUP_STEP2: 'signup-step2',  // DOB, phone, password, user type
  PASSWORD_RESET: 'password-reset'
};
```

### 3. Form Submission

**File**: `app/src/islands/shared/SignUpLoginModal.jsx:624-641`

```javascript
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  // Call auth.js loginUser()
  const result = await loginUser(loginData.email, loginData.password);

  if (result.success) {
    onAuthSuccess?.(result);
    onClose();
    window.location.reload();  // Refresh to update auth state
  } else {
    setError(result.error);
  }
};
```

### 4. Auth Library Call

**File**: `app/src/lib/auth.js:415-498`

```javascript
export async function loginUser(email, password) {
  // Call Edge Function via Supabase client
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'login',
      payload: { email, password }
    }
  });

  if (data.success) {
    // Store credentials securely
    setAuthToken(data.data.token);
    setSessionId(data.data.user_id);
    setAuthState(true, data.data.user_id);
  }

  return { success: data.success, user_id: data.data.user_id };
}
```

### 5. Edge Function Processing

**File**: `supabase/functions/bubble-auth-proxy/handlers/login.ts`

```typescript
export async function handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload) {
  // Call Bubble.io with server-side API key
  const response = await fetch(`${bubbleAuthBaseUrl}/wf/login-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bubbleApiKey}`  // Server-side secret
    },
    body: JSON.stringify({ email, password })
  });

  // Return token and user_id
  return {
    token: data.response.token,
    user_id: data.response.user_id,
    expires: data.response.expires
  };
}
```

### 6. Token Storage

**File**: `app/src/lib/secureStorage.js`

Tokens are stored in localStorage with obfuscated keys:

| Purpose | Storage Key | Example Value |
|---------|-------------|---------------|
| Auth Token | `__sl_at__` | Bearer JWT token |
| Session ID | `__sl_sid__` | User UUID |
| Auth State | `sl_auth_state` | `"true"` or `"false"` |
| User Type | `sl_user_type` | `"Host"` or `"Guest"` |
| Last Activity | `sl_last_activity` | Timestamp |

---

## Authentication Check Flow

### On Page Load

**File**: `app/src/lib/auth.js:112-151`

```javascript
export async function checkAuthStatus() {
  // 1. Try legacy migration first
  await migrateFromLegacyStorage();

  // 2. Check cross-domain cookies (Bubble.io legacy)
  const splitLeaseAuth = checkSplitLeaseCookies();
  if (splitLeaseAuth.isLoggedIn) {
    return true;
  }

  // 3. Check localStorage state
  const authState = getAuthState();
  if (authState) {
    const hasTokens = await hasValidTokens();
    if (hasTokens) {
      updateLastActivity();
      return true;
    }
  }

  return false;
}
```

### Token Validation

**File**: `app/src/lib/auth.js:647-737`

```javascript
export async function validateTokenAndFetchUser() {
  const token = getAuthToken();
  const userId = getSessionId();

  // Call Edge Function to validate with Bubble
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'validate',
      payload: { token, user_id: userId }
    }
  });

  if (data.success) {
    // Cache user type
    setUserType(data.data.userType);
    return {
      userId: data.data.userId,
      firstName: data.data.firstName,
      profilePhoto: data.data.profilePhoto,
      userType: data.data.userType
    };
  }

  // Invalid token - clear all auth data
  clearAuthData();
  return null;
}
```

---

## Signup Flow

### Step 1: Basic Info

**Fields**:
- First Name
- Last Name
- Email

**Validation**:
- All fields required
- Email format validation

### Step 2: Details + Password

**Fields**:
- User Type (Host/Guest)
- Birth Date (must be 18+)
- Phone Number
- Password + Confirm Password

**File**: `app/src/islands/shared/SignUpLoginModal.jsx:557-621`

```javascript
const handleSignupSubmit = async (e) => {
  // Validate 18+
  if (!isOver18(...)) {
    setError('You must be at least 18 years old');
    return;
  }

  // Call signupUser with additional data
  const result = await signupUser(email, password, confirmPassword, {
    firstName,
    lastName,
    userType,
    birthDate: `${year}-${month}-${day}`,
    phoneNumber
  });
};
```

---

## Logout Flow

**File**: `app/src/lib/auth.js:774-826`

```javascript
export async function logoutUser() {
  const token = getAuthToken();

  // Call Edge Function
  await supabase.functions.invoke('bubble-auth-proxy', {
    body: { action: 'logout', payload: { token } }
  });

  // Clear ALL auth data (storage + cookies)
  clearAuthData();

  return { success: true };
}
```

**Clear Auth Data** (`secureStorage.js:200-225`):
- Removes all localStorage tokens
- Clears legacy keys
- Clears cookies (both local and `.split.lease` domain)

---

## Key Files Reference

### Frontend (app/src/)

| File | Purpose |
|------|---------|
| `islands/shared/SignUpLoginModal.jsx` | Multi-view modal for login/signup |
| `islands/shared/Header.jsx` | Triggers auth modal |
| `lib/auth.js` | Auth API functions |
| `lib/secureStorage.js` | Token storage utilities |
| `lib/supabase.js` | Supabase client |
| `lib/constants.js` | Auth URLs and keys |

### Edge Functions (supabase/functions/)

| File | Purpose |
|------|---------|
| `bubble-auth-proxy/index.ts` | Main router for auth actions |
| `bubble-auth-proxy/handlers/login.ts` | Login handler |
| `bubble-auth-proxy/handlers/signup.ts` | Signup handler |
| `bubble-auth-proxy/handlers/logout.ts` | Logout handler |
| `bubble-auth-proxy/handlers/validate.ts` | Token validation |
| `_shared/cors.ts` | CORS headers |
| `_shared/errors.ts` | Error formatting |
| `_shared/validation.ts` | Input validation |

---

## Security Considerations

### Good Practices

1. **API Keys Server-Side**: `BUBBLE_API_KEY` stored in Supabase Secrets, never exposed to frontend
2. **Token Obfuscation**: Storage keys use non-obvious names (`__sl_at__` vs `auth_token`)
3. **Cross-Domain Cookie Handling**: Supports legacy Bubble.io cookie auth
4. **Token Validation**: Server-side validation with Bubble on each sensitive request
5. **No Fallback Mechanisms**: Auth failures return false/null, no silent bypasses

### Potential Improvements

1. **Token Encryption**: Currently tokens are stored in plain localStorage (protected by browser same-origin policy, but vulnerable to XSS)
2. **HttpOnly Cookies**: Consider using HttpOnly cookies for tokens instead of localStorage
3. **Rate Limiting**: Edge Functions should implement rate limiting for auth endpoints
4. **Refresh Tokens**: `setRefreshData()` exists but not implemented - could enable token refresh

---

## Cross-Domain Cookie Auth (Legacy)

Bubble.io sets cookies on `.split.lease` domain for cross-subdomain auth:

**File**: `app/src/lib/auth.js:82-97`

```javascript
export function checkSplitLeaseCookies() {
  const cookies = document.cookie.split('; ');
  const loggedInCookie = cookies.find(c => c.startsWith('loggedIn='));
  const usernameCookie = cookies.find(c => c.startsWith('username='));

  return {
    isLoggedIn: loggedInCookie?.split('=')[1] === 'true',
    username: getUsernameFromCookies()
  };
}
```

This allows users authenticated on `app.split.lease` (Bubble) to be recognized on the React frontend.

---

## Protected Pages

**File**: `app/src/lib/auth.js:748-762`

```javascript
export function isProtectedPage() {
  const protectedPaths = [
    '/guest-proposals',
    '/account-profile',
    '/host-dashboard'
  ];

  const currentPath = window.location.pathname.replace(/\.html$/, '');
  return protectedPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
}
```

Protected pages should call `checkAuthStatus()` on mount and redirect to login if false.

---

## Quick Reference

### To Log In Programmatically

```javascript
import { loginUser } from 'lib/auth.js';

const result = await loginUser(email, password);
if (result.success) {
  console.log('Logged in as:', result.user_id);
}
```

### To Check Auth Status

```javascript
import { checkAuthStatus, validateTokenAndFetchUser } from 'lib/auth.js';

const isLoggedIn = await checkAuthStatus();
if (isLoggedIn) {
  const userData = await validateTokenAndFetchUser();
  console.log('User:', userData.firstName, userData.userType);
}
```

### To Log Out

```javascript
import { logoutUser } from 'lib/auth.js';

await logoutUser();
window.location.href = '/';
```

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-02
