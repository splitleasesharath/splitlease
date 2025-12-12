# Sign-In Flow Analysis

**GENERATED**: 2025-12-11
**STATUS**: Complete Analysis
**BACKEND**: Supabase Auth (Native)

---

## Executive Summary

The Split Lease sign-in flow is a complete, end-to-end authentication system that uses **Supabase Auth natively** (no Bubble dependency for login). The flow begins with a UI modal component (`SignUpLoginModal.jsx`), calls the frontend auth library (`auth.js`), which invokes a Supabase Edge Function (`auth-user`), which authenticates against Supabase Auth and fetches user profile data from the database.

---

## Architecture Overview

```
USER ACTION: Click "Sign In" button
        |
        v
+---------------------------+
|    Header.jsx             |  Opens modal on "Sign In" click
|    (handleLoginClick)     |
+---------------------------+
        |
        v
+---------------------------+
|  SignUpLoginModal.jsx     |  Renders login form (email + password)
|  (handleLoginSubmit)      |  Shows loading state, error handling
+---------------------------+
        |
        v
+---------------------------+
|  lib/auth.js              |  loginUser(email, password) function
|  (loginUser)              |  Uses direct fetch to Edge Function
+---------------------------+
        |
        | POST /functions/v1/auth-user
        | Body: { action: 'login', payload: { email, password } }
        v
+---------------------------+
|  auth-user/index.ts       |  Edge Function router
|  (Deno.serve)             |  Routes to login handler
+---------------------------+
        |
        v
+---------------------------+
|  handlers/login.ts        |  Supabase Auth signInWithPassword
|  (handleLogin)            |  Fetches user profile from DB
+---------------------------+
        |
        | Returns: access_token, refresh_token, user_id, user_type
        v
+---------------------------+
|  lib/secureStorage.js     |  Stores tokens in localStorage
|  (setAuthToken, etc.)     |  Sets auth state
+---------------------------+
        |
        v
+---------------------------+
|  Page Reload              |  Header re-validates session
|  (window.location.reload) |  Shows LoggedInAvatar
+---------------------------+
```

---

## Key Files and Their Roles

### Frontend Files

| File | Path | Role |
|------|------|------|
| **Header.jsx** | `app/src/islands/shared/Header.jsx` | Main navigation component that triggers auth modal and displays auth state |
| **SignUpLoginModal.jsx** | `app/src/islands/shared/SignUpLoginModal.jsx` | Multi-view modal for login/signup/password reset |
| **auth.js** | `app/src/lib/auth.js` | Core authentication library with `loginUser()`, `checkAuthStatus()`, etc. |
| **secureStorage.js** | `app/src/lib/secureStorage.js` | Token storage utilities for localStorage |
| **supabase.js** | `app/src/lib/supabase.js` | Supabase client initialization |

### Backend Files

| File | Path | Role |
|------|------|------|
| **index.ts** | `supabase/functions/auth-user/index.ts` | Edge Function router that handles `login`, `signup`, `logout`, `validate`, etc. |
| **login.ts** | `supabase/functions/auth-user/handlers/login.ts` | Login handler using Supabase Auth `signInWithPassword` |

---

## Step-by-Step Sign-In Flow

### Step 1: User Initiates Login

**File**: `app/src/islands/shared/Header.jsx` (lines 254-257)

```javascript
const handleLoginClick = () => {
  setAuthModalInitialView('login');
  setShowAuthModal(true);
};
```

The Header component renders a "Sign In" link that opens the `SignUpLoginModal` with `initialView='login'`.

---

### Step 2: Login Form Displayed

**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (lines 873-969)

The modal renders a login form with:
- Email input field (required)
- Password input field (required, with visibility toggle)
- "Login" submit button
- "Log in Without Password" link (magic link option)
- "Forgot Password? Reset here" link
- "Sign Up Here" link for new users

**Form State**:
```javascript
const [loginData, setLoginData] = useState({
  email: '',
  password: ''
});
```

---

### Step 3: Form Submission

**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (lines 665-739)

```javascript
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  // Show toast notifications
  showToast({
    title: 'Welcome back!',
    content: 'Logging you in...',
    type: 'info',
    duration: 3000
  });

  // Call auth.js loginUser function
  const result = await loginUser(loginData.email, loginData.password);

  if (result.success) {
    // Fetch and cache user data for optimistic UI
    await validateTokenAndFetchUser();

    showToast({
      title: 'Login Successful!',
      content: 'Welcome back to Split Lease.',
      type: 'success'
    });

    if (onAuthSuccess) onAuthSuccess(result);
    onClose();
    if (!skipReload) window.location.reload();
  } else {
    showToast({
      title: 'Login Failed',
      content: result.error || 'Please check your credentials.',
      type: 'error'
    });
    setError(result.error || 'Login failed. Please check your credentials.');
  }
};
```

---

### Step 4: Frontend Auth Library

**File**: `app/src/lib/auth.js` (lines 447-600)

The `loginUser()` function:

1. **Clears stale auth state** - Removes old localStorage tokens to prevent session conflicts
2. **Calls Edge Function directly** - Uses `fetch()` instead of Supabase client to bypass session handling issues
3. **Handles response** - Extracts tokens and user data
4. **Sets Supabase session** - Calls `supabase.auth.setSession()` to persist session
5. **Verifies persistence** - Polls to ensure session is written to localStorage
6. **Stores to secure storage** - Saves tokens using the secureStorage module

```javascript
export async function loginUser(email, password) {
  // Direct fetch to bypass Supabase client session handling
  const response = await fetch(`${supabaseUrl}/functions/v1/auth-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      action: 'login',
      payload: { email, password }
    })
  });

  const data = await response.json();

  if (!data.success) {
    return { success: false, error: data.error };
  }

  // Set Supabase session
  await supabase.auth.setSession({
    access_token: data.data.access_token,
    refresh_token: data.data.refresh_token
  });

  // Store tokens
  setAuthToken(data.data.access_token);
  setSessionId(data.data.user_id);
  setAuthState(true, data.data.user_id);
  if (data.data.user_type) setUserType(data.data.user_type);

  return {
    success: true,
    user_id: data.data.user_id,
    user_type: data.data.user_type,
    ...
  };
}
```

---

### Step 5: Edge Function Router

**File**: `supabase/functions/auth-user/index.ts` (lines 39-176)

The Edge Function:
1. Handles CORS preflight requests
2. Parses the request body
3. Validates the action is allowed
4. Routes to the appropriate handler based on `action`

```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = await req.json();
  const { action, payload } = body;

  validateAction(action, ['login', 'signup', 'logout', 'validate', ...]);

  switch (action) {
    case 'login':
      result = await handleLogin(supabaseUrl, supabaseServiceKey, payload);
      break;
    // ... other cases
  }

  return new Response(JSON.stringify({ success: true, data: result }), ...);
});
```

---

### Step 6: Login Handler

**File**: `supabase/functions/auth-user/handlers/login.ts` (lines 24-136)

The handler:
1. Validates email and password are provided
2. Authenticates via Supabase Auth `signInWithPassword()`
3. Fetches user profile from `public.user` table
4. Returns session tokens and user data

```typescript
export async function handleLogin(supabaseUrl, supabaseServiceKey, payload) {
  validateRequiredFields(payload, ['email', 'password']);
  const { email, password } = payload;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Authenticate
  const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
    email: email.toLowerCase(),
    password
  });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      throw new BubbleApiError('Invalid email or password. Please try again.', 401);
    }
    // ... other error mapping
  }

  // Fetch user profile
  const { data: userProfile } = await supabaseAdmin
    .from('user')
    .select('_id, email, "Name - First", "Profile Photo", "Account - Host / Landlord"')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    user_id: userProfile?._id || authUser.user_metadata?.user_id,
    user_type: authUser.user_metadata?.user_type || 'Guest',
    host_account_id: userProfile?.['Account - Host / Landlord'],
    firstName: userProfile?.['Name - First'],
    ...
  };
}
```

---

### Step 7: Token Storage

**File**: `app/src/lib/secureStorage.js`

Tokens are stored in localStorage with specific keys:

```javascript
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',      // JWT access token
  SESSION_ID: '__sl_sid__',     // User ID
  REFRESH_DATA: '__sl_rd__',    // Refresh token data
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  FIRST_NAME: 'sl_first_name',
  AVATAR_URL: 'sl_avatar_url'
};
```

---

### Step 8: Post-Login UI Update

**File**: `app/src/islands/shared/Header.jsx` (lines 46-154)

After page reload, the Header component:
1. Reads cached auth data synchronously for **optimistic UI** (prevents flickering)
2. Performs background validation via `validateTokenAndFetchUser()`
3. Updates `currentUser` state with real user data
4. Renders `LoggedInAvatar` component instead of "Sign In" buttons

**Optimistic UI Pattern**:
```javascript
const cachedFirstName = getFirstName();
const hasCachedAuth = !!(cachedFirstName && getAuthState());

const [currentUser, setCurrentUser] = useState(() => {
  if (hasCachedAuth) {
    return {
      firstName: cachedFirstName,
      profilePhoto: cachedAvatarUrl,
      _isOptimistic: true
    };
  }
  return null;
});
```

---

## Error Handling

### Frontend Error Display

Errors are shown in a styled error box above the submit button:

```javascript
{error && (
  <div style={styles.errorBox}>
    <p style={styles.errorText}>{error}</p>
  </div>
)}
```

### Error Mapping

| Scenario | User-Facing Message |
|----------|---------------------|
| Empty fields | "Email and password are required." |
| Invalid credentials | "Invalid email or password. Please try again." |
| Unverified email | "Please verify your email address before logging in." |
| Network error | "Network error. Please check your connection and try again." |
| Server error | "Login failed. Please try again." |

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Validation error (missing fields) |
| 401 | Invalid credentials |
| 500 | Server error |

---

## Session Management

### Session Storage

Sessions are stored in multiple places:
1. **Supabase Auth localStorage** - `sb-<project-ref>-auth-token` (managed by Supabase client)
2. **Split Lease secure storage** - `__sl_at__`, `__sl_sid__` (for backward compatibility)
3. **Public state** - `sl_auth_state`, `sl_user_type`, `sl_first_name` (for optimistic UI)

### Session Validation

On page load, the Header component validates the session:

```javascript
useEffect(() => {
  const performBackgroundValidation = async () => {
    const userData = await validateTokenAndFetchUser();
    if (userData) {
      setCurrentUser(userData);
    } else {
      setCurrentUser(null);
      if (isProtectedPage()) {
        window.location.replace('/');  // Redirect if on protected page
      }
    }
  };
  // ...
}, []);
```

### Auth State Change Listener

The Header listens for Supabase auth state changes:

```javascript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Update UI with user data
    } else if (event === 'SIGNED_OUT') {
      // Reload page
    }
  });
  return () => subscription.unsubscribe();
}, []);
```

---

## API Request/Response Format

### Login Request

```http
POST /functions/v1/auth-user
Content-Type: application/json
apikey: <anon-key>
Authorization: Bearer <anon-key>

{
  "action": "login",
  "payload": {
    "email": "user@example.com",
    "password": "userpassword"
  }
}
```

### Success Response

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

### Error Response

```json
{
  "success": false,
  "error": "Invalid email or password. Please try again."
}
```

---

## Security Considerations

1. **API Keys Server-Side**: Supabase service role key stored in Edge Function secrets, never exposed to frontend
2. **JWT Tokens**: Access tokens are JWTs with configurable expiry (default 1 hour)
3. **Password Handling**: Passwords never logged or stored; sent directly to Supabase Auth
4. **CORS**: Edge Functions return appropriate CORS headers
5. **No Fallback**: Login fails entirely if any step fails (no mock data or defaults)

---

## Related Documentation

- [LOGIN_FLOW.md](..\Documentation\Auth\LOGIN_FLOW.md) - Existing login flow documentation
- [SIGNUP_FLOW.md](..\Documentation\Auth\SIGNUP_FLOW.md) - Signup flow documentation
- [AUTH_USER_EDGE_FUNCTION.md](..\Documentation\Auth\AUTH_USER_EDGE_FUNCTION.md) - Edge function details
