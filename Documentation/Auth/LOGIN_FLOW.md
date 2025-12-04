# Split Lease - Login Flow Documentation

**GENERATED**: 2025-12-04
**VERSION**: 1.0.0
**STATUS**: Production

---

## Overview

The Split Lease login flow authenticates users via a multi-layer architecture that routes through Supabase Edge Functions to the Bubble.io backend. This document provides a comprehensive guide to the entire login process from UI interaction to token storage.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐     ┌────────────────────┐     ┌────────────────┐  │
│  │  SignUpLoginModal   │────▶│    auth.js         │────▶│ secureStorage  │  │
│  │  (UI Component)     │     │  (loginUser fn)    │     │ (Token Store)  │  │
│  └─────────────────────┘     └────────────────────┘     └────────────────┘  │
│                                       │                                      │
└───────────────────────────────────────│──────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE EDGE FUNCTION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐     ┌────────────────────┐                         │
│  │ bubble-auth-proxy   │────▶│  handlers/login.ts │                         │
│  │ index.ts (Router)   │     │  (Login Handler)   │                         │
│  └─────────────────────┘     └────────────────────┘                         │
│                                       │                                      │
└───────────────────────────────────────│──────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BUBBLE.IO BACKEND                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              /api/1.1/wf/login-user Workflow                          │   │
│  │                                                                       │   │
│  │  1. Validate email format                                            │   │
│  │  2. Check user exists in database                                    │   │
│  │  3. Verify password hash                                             │   │
│  │  4. Generate authentication token                                    │   │
│  │  5. Return: { token, user_id, expires }                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Flow

### Step 1: User Interface (SignUpLoginModal.jsx)

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`

The login flow begins when a user clicks the "Log into my account" button in the modal.

#### Modal States
```javascript
const VIEWS = {
  INITIAL: 'initial',      // Welcome screen with login/signup options
  LOGIN: 'login',          // Login form view
  SIGNUP_STEP1: 'signup-step1',
  SIGNUP_STEP2: 'signup-step2',
  PASSWORD_RESET: 'password-reset'
};
```

#### Login Form State
```javascript
const [loginData, setLoginData] = useState({
  email: '',
  password: ''
});
```

#### Login Form Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | `email` | Yes | Valid email format |
| Password | `password` | Yes | Min 4 characters |

#### Form Submission Handler
```javascript
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  // Call auth.js loginUser function
  const result = await loginUser(loginData.email, loginData.password);

  setIsLoading(false);

  if (result.success) {
    if (onAuthSuccess) {
      onAuthSuccess(result);
    }
    onClose();
    if (!skipReload) {
      window.location.reload(); // Refresh to load authenticated UI
    }
  } else {
    setError(result.error || 'Login failed. Please check your credentials.');
  }
};
```

---

### Step 2: Authentication Library (auth.js)

**File**: `app/src/lib/auth.js`

The `loginUser` function orchestrates the login process.

#### loginUser Function
```javascript
export async function loginUser(email, password) {
  try {
    // Input validation
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
      body: {
        action: 'login',
        payload: { email, password }
      }
    });

    if (error || !data?.success) {
      const errorMsg = data?.error || error?.message || 'Login failed.';
      return { success: false, error: errorMsg };
    }

    // Extract response data
    const { token, user_id, expires } = data.data;

    // Store authentication tokens
    setAuthToken(token);
    setSessionId(user_id);
    setAuthState(true, user_id);

    // Fetch and store user type
    const userData = await validateTokenAndFetchUser();
    if (userData?.userType) {
      setUserType(userData.userType);
    }

    return {
      success: true,
      token,
      userId: user_id,
      userData
    };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
```

#### Key Operations
1. **Input Validation**: Check email and password are provided
2. **Edge Function Call**: Invoke `bubble-auth-proxy` with action `login`
3. **Token Storage**: Store token, session ID, and auth state
4. **User Data Fetch**: Validate token and fetch user profile
5. **User Type Storage**: Cache user type for UI decisions

---

### Step 3: Edge Function Router (bubble-auth-proxy/index.ts)

**File**: `supabase/functions/bubble-auth-proxy/index.ts`

The Edge Function routes the login request to the appropriate handler.

#### Request Format
```json
{
  "action": "login",
  "payload": {
    "email": "user@example.com",
    "password": "userpassword"
  }
}
```

#### Router Logic
```typescript
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Parse request body
  const body = await req.json();
  const { action, payload } = body;

  // Validate action
  const allowedActions = ['login', 'signup', 'logout', 'validate'];
  validateAction(action, allowedActions);

  // Get Bubble API configuration from secrets
  const bubbleAuthBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  // Route to login handler
  if (action === 'login') {
    const result = await handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload);
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

### Step 4: Login Handler (handlers/login.ts)

**File**: `supabase/functions/bubble-auth-proxy/handlers/login.ts`

The login handler communicates with the Bubble.io API.

#### Handler Function
```typescript
export async function handleLogin(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any> {
  // Validate required fields
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  // Call Bubble login workflow
  const url = `${bubbleAuthBaseUrl}/wf/login-user`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bubbleApiKey}`
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  // Check if login was successful
  if (!response.ok || data.status !== 'success') {
    throw new BubbleApiError(
      data.message || 'Login failed. Please check your credentials.',
      response.status,
      data.reason
    );
  }

  // Extract response data
  const token = data.response?.token;
  const userId = data.response?.user_id;
  const expires = data.response?.expires;

  if (!token || !userId) {
    throw new BubbleApiError('Login response missing required fields', 500);
  }

  // Return authentication data
  return { token, user_id: userId, expires };
}
```

#### Bubble API Response Format
```json
{
  "status": "success",
  "response": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "1234567890x123456789",
    "expires": 2592000
  }
}
```

---

### Step 5: Token Storage (secureStorage.js)

**File**: `app/src/lib/secureStorage.js`

After successful login, tokens are stored in localStorage.

#### Storage Keys
```javascript
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',     // Auth token
  SESSION_ID: '__sl_sid__',    // Session/user ID
  REFRESH_DATA: '__sl_rd__',   // Refresh token data (future)
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  SESSION_VALID: 'sl_session_valid'
};
```

#### Storage Functions Called
```javascript
// Store auth token
setAuthToken(token);
// localStorage.setItem('__sl_at__', token);

// Store session ID (user ID)
setSessionId(userId);
// localStorage.setItem('__sl_sid__', userId);

// Set auth state
setAuthState(true, userId);
// localStorage.setItem('sl_auth_state', 'true');
// localStorage.setItem('sl_user_id', userId);
```

---

## Error Handling

### Frontend Error Display
```javascript
// Error state in SignUpLoginModal.jsx
const [error, setError] = useState('');

// Error display component
{error && (
  <div style={styles.errorBox}>
    <p style={styles.errorText}>{error}</p>
  </div>
)}
```

### Error Mapping

| Error Scenario | User Message |
|----------------|--------------|
| Empty email/password | "Email and password are required." |
| Invalid credentials | "Login failed. Please check your credentials." |
| Network error | "An unexpected error occurred." |
| Server error | "Login failed. Please try again later." |
| User not found | "Login failed. Please check your credentials." |

### Error Response Format (Edge Function)
```json
{
  "success": false,
  "error": "Login failed. Please check your credentials."
}
```

---

## Additional Login Features

### 1. Password Visibility Toggle
```javascript
const [showLoginPassword, setShowLoginPassword] = useState(false);

<input
  type={showLoginPassword ? 'text' : 'password'}
  ...
/>
<button onClick={() => setShowLoginPassword(!showLoginPassword)}>
  <EyeIcon open={showLoginPassword} />
</button>
```

### 2. Magic Link Login (Passwordless)
```javascript
const handleMagicLink = async () => {
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'magic-link',
      payload: { email: loginData.email }
    }
  });

  if (!error && data?.success) {
    alert(`Magic link sent to ${loginData.email}!`);
  }
};
```

### 3. Forgot Password
```javascript
const goToPasswordReset = () => {
  setCurrentView(VIEWS.PASSWORD_RESET);
  setResetEmail(loginData.email); // Preserve email from login
  setError('');
};
```

---

## Post-Login Actions

### 1. Page Reload
```javascript
if (!skipReload) {
  window.location.reload(); // Refresh to load authenticated UI
}
```

### 2. Auth Success Callback
```javascript
if (onAuthSuccess) {
  onAuthSuccess(result);
}
```

### 3. Modal Close
```javascript
onClose();
```

---

## Session Validation

After login, session validation occurs on subsequent page loads.

### checkAuthStatus Function
```javascript
export async function checkAuthStatus() {
  // Check cookies first (cross-domain compatibility)
  const cookies = getSplitLeaseCookies();
  if (cookies.isLoggedIn) {
    return true;
  }

  // Check secure storage
  const authState = getAuthState();
  const hasTokens = hasValidTokens();

  if (authState && hasTokens) {
    return true;
  }

  return false;
}
```

### validateTokenAndFetchUser Function
```javascript
export async function validateTokenAndFetchUser() {
  const token = getAuthToken();
  const userId = getSessionId();

  if (!token || !userId) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'validate',
      payload: { token, user_id: userId }
    }
  });

  if (error || !data?.success) {
    clearAllAuthData(); // Clear invalid session
    return null;
  }

  return data.data; // { userId, firstName, fullName, email, profilePhoto, userType }
}
```

---

## Related Files

### Frontend
| File | Purpose |
|------|---------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login UI component |
| `app/src/lib/auth.js` | Authentication functions |
| `app/src/lib/secureStorage.js` | Token storage utilities |
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/lib/constants.js` | Auth configuration constants |

### Logic Layer
| File | Purpose |
|------|---------|
| `app/src/logic/workflows/auth/checkAuthStatusWorkflow.js` | Auth status workflow |
| `app/src/logic/workflows/auth/validateTokenWorkflow.js` | Token validation workflow |
| `app/src/logic/rules/auth/isSessionValid.js` | Session validity rule |
| `app/src/logic/rules/auth/isProtectedPage.js` | Protected page detection |

### Backend
| File | Purpose |
|------|---------|
| `supabase/functions/bubble-auth-proxy/index.ts` | Auth router |
| `supabase/functions/bubble-auth-proxy/handlers/login.ts` | Login handler |
| `supabase/functions/bubble-auth-proxy/handlers/validate.ts` | Token validation |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Input validation |

---

## Security Considerations

### 1. Token Storage
- Tokens stored in localStorage (persists across sessions)
- Token expiry managed entirely by Bubble API (no client-side expiration)

### 2. API Key Protection
- Bubble API key stored server-side in Supabase Secrets
- Never exposed to frontend code
- All API calls proxied through Edge Functions

### 3. CORS Configuration
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

### 4. No Fallback Principle
- Login fails entirely if any step fails
- No mock data or default values
- Clear error messages returned to user

---

## Testing Checklist

- [ ] Valid email and password logs in successfully
- [ ] Invalid email shows appropriate error
- [ ] Invalid password shows appropriate error
- [ ] Empty fields show validation error
- [ ] Password visibility toggle works
- [ ] Magic link option appears after email entered
- [ ] Forgot password link works
- [ ] Page reloads after successful login
- [ ] User data displayed after login (avatar, name)
- [ ] Session persists across page refresh
- [ ] Logout clears all stored data

---

**DOCUMENT_VERSION**: 1.0.0
**LAST_UPDATED**: 2025-12-04
**AUTHOR**: Claude Code
