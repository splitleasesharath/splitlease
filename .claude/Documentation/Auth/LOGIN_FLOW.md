# Split Lease - Login Flow Documentation

**GENERATED**: 2025-12-11
**VERSION**: 2.0.0
**STATUS**: Production
**BACKEND**: Supabase Auth (Native) - No Bubble Dependency

---

## Overview

The Split Lease login flow authenticates users via Supabase Auth natively. This is a complete migration from the previous Bubble-based authentication system. Users authenticate through the Edge Function which proxies to Supabase Auth, returning JWT session tokens.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------+
|                            FRONTEND (React)                                |
+---------------------------------------------------------------------------+
|                                                                            |
|  +---------------------+     +--------------------+     +----------------+ |
|  |  SignUpLoginModal   |---->|    auth.js         |---->| secureStorage  | |
|  |  (UI Component)     |     |  (loginUser fn)    |     | (Token Store)  | |
|  +---------------------+     +--------------------+     +----------------+ |
|                                       |                                    |
+---------------------------------------------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------+
|                        SUPABASE EDGE FUNCTION                              |
+---------------------------------------------------------------------------+
|                                                                            |
|  +---------------------+     +------------------------+                    |
|  | auth-user/index.ts  |---->|  handlers/login.ts     |                    |
|  | (Router)            |     |  (Supabase Auth Native)|                    |
|  +---------------------+     +------------------------+                    |
|                                       |                                    |
+---------------------------------------------------------------------------+
                                        |
                   +--------------------+--------------------+
                   |                                         |
                   v                                         v
     +------------------------+              +------------------------+
     |   SUPABASE AUTH        |              |   SUPABASE DATABASE    |
     |   (auth.users)         |              |   (public.user)        |
     +------------------------+              +------------------------+
     |                        |              |                        |
     | signInWithPassword()   |              | SELECT user profile    |
     | Returns:               |              | by email               |
     | - access_token         |              |                        |
     | - refresh_token        |              | Returns:               |
     | - expires_in           |              | - _id                  |
     | - user metadata        |              | - Name - First         |
     |                        |              | - Profile Photo        |
     +------------------------+              | - Account - Host       |
                                             +------------------------+
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
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'login',
        payload: { email, password }
      }
    });

    if (error || !data?.success) {
      const errorMsg = data?.error || error?.message || 'Login failed.';
      return { success: false, error: errorMsg };
    }

    // Extract response data (Supabase Auth tokens)
    const { access_token, refresh_token, user_id, user_type, expires_in } = data.data;

    // Store authentication tokens
    setAuthToken(access_token);
    setSessionId(user_id);
    setAuthState(true, user_id);

    // Store user type
    if (user_type) {
      setUserType(user_type);
    }

    return {
      success: true,
      access_token,
      refresh_token,
      userId: user_id,
      userType: user_type
    };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
```

#### Key Operations
1. **Input Validation**: Check email and password are provided
2. **Edge Function Call**: Invoke `auth-user` with action `login`
3. **Token Storage**: Store access_token, session ID, and auth state
4. **User Type Storage**: Cache user type for UI decisions

---

### Step 3: Edge Function Router (auth-user/index.ts)

**File**: `supabase/functions/auth-user/index.ts`

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
  const allowedActions = ['login', 'signup', 'logout', 'validate', 'request_password_reset', 'update_password'];
  validateAction(action, allowedActions);

  // Get Supabase configuration from secrets
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Route to login handler (Supabase Auth Native)
  if (action === 'login') {
    const result = await handleLogin(supabaseUrl, supabaseServiceKey, payload);
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

### Step 4: Login Handler (handlers/login.ts)

**File**: `supabase/functions/auth-user/handlers/login.ts`

The login handler authenticates via Supabase Auth natively (no Bubble dependency).

#### Handler Function
```typescript
export async function handleLogin(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  // Validate required fields
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ========== AUTHENTICATE VIA SUPABASE AUTH ==========
  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email: email.toLowerCase(),
    password
  });

  if (authError) {
    // Map common auth errors to user-friendly messages
    if (authError.message.includes('Invalid login credentials')) {
      throw new BubbleApiError('Invalid email or password. Please try again.', 401);
    }
    if (authError.message.includes('Email not confirmed')) {
      throw new BubbleApiError('Please verify your email address before logging in.', 401);
    }
    throw new BubbleApiError(authError.message, 401);
  }

  const { session, user: authUser } = authData;

  // ========== FETCH USER PROFILE ==========
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('user')
    .select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  // Get user_id from profile or user_metadata
  let userId = userProfile?._id || authUser.user_metadata?.user_id || authUser.id;
  let userType = authUser.user_metadata?.user_type || 'Guest';
  let hostAccountId = userProfile?.['Account - Host / Landlord'] || authUser.user_metadata?.host_account_id;

  // ========== RETURN SESSION DATA ==========
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    user_id: userId,
    supabase_user_id: authUser.id,
    user_type: userType,
    host_account_id: hostAccountId,
    email: authUser.email,
    firstName: userProfile?.['First Name'] || '',
    lastName: userProfile?.['Last Name'] || '',
    profilePhoto: userProfile?.['Profile Photo'] || null
  };
}
```

#### Supabase Auth Response Format
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "abc123...",
    "expires_in": 3600,
    "user_id": "1234567890x123456789",
    "supabase_user_id": "uuid-from-supabase-auth",
    "user_type": "Guest",
    "host_account_id": "host_id_here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePhoto": "https://..."
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
  AUTH_TOKEN: '__sl_at__',     // Access token (JWT)
  SESSION_ID: '__sl_sid__',    // Session/user ID
  REFRESH_DATA: '__sl_rd__',   // Refresh token data
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
// Store access token (JWT)
setAuthToken(access_token);

// Store session ID (user ID)
setSessionId(userId);

// Set auth state
setAuthState(true, userId);
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
| Invalid credentials | "Invalid email or password. Please try again." |
| Email not confirmed | "Please verify your email address before logging in." |
| Network error | "An unexpected error occurred." |
| Server error | "Login failed. Please try again later." |

### Error Response Format (Edge Function)
```json
{
  "success": false,
  "error": "Invalid email or password. Please try again."
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

### 2. Forgot Password
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

  const { data, error } = await supabase.functions.invoke('auth-user', {
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
| `supabase/functions/auth-user/index.ts` | Auth router |
| `supabase/functions/auth-user/handlers/login.ts` | Login handler (Supabase Auth Native) |
| `supabase/functions/auth-user/handlers/validate.ts` | Token validation |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Input validation |

---

## Security Considerations

### 1. JWT Token Storage
- Access tokens stored in localStorage (persists across sessions)
- Refresh tokens enable session renewal
- Token expiry managed by Supabase Auth (configurable)

### 2. API Key Protection
- Supabase service role key stored server-side in Edge Function secrets
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

## Authentication Backend Comparison

| Feature | Old (Bubble) | New (Supabase Auth) |
|---------|--------------|---------------------|
| Authentication | Bubble Workflow API | Supabase signInWithPassword |
| Token Type | Bubble Token | JWT (access + refresh) |
| Token Expiry | Server-controlled | Configurable (default 1 hour) |
| Password Reset | N/A | Native Supabase Auth |
| Email Verification | N/A | Native Supabase Auth |
| User Metadata | Bubble Database | auth.users + public.user |
| Session Management | Cookie-based | JWT-based |

---

## Testing Checklist

- [ ] Valid email and password logs in successfully
- [ ] Invalid email shows appropriate error
- [ ] Invalid password shows appropriate error
- [ ] Empty fields show validation error
- [ ] Password visibility toggle works
- [ ] Forgot password link works
- [ ] Page reloads after successful login
- [ ] User data displayed after login (avatar, name)
- [ ] Session persists across page refresh
- [ ] Logout clears all stored data
- [ ] JWT tokens stored correctly
- [ ] Refresh token works for session renewal

---

**DOCUMENT_VERSION**: 2.0.0
**LAST_UPDATED**: 2025-12-11
**AUTHOR**: Claude Code
**MIGRATION**: Bubble -> Supabase Auth (Native)
