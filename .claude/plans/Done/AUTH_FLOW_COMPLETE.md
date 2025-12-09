# Split Lease - Complete Authentication Flow

## Overview

The Split Lease authentication system is a multi-layer architecture that routes all authentication requests through Supabase Edge Functions to maintain server-side API security. The flow begins with user interactions in the frontend, proceeds through logic layers, and ultimately communicates with Bubble.io authentication APIs via the `bubble-auth-proxy` Edge Function.

---

## 1. Frontend Entry Points - Where Login is Initiated

### 1.1 Primary Login Modal Component
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx`

**Purpose**: Reusable modal component for both login and signup operations

**Key Responsibilities**:
- Renders login/signup form UI with email and password inputs
- Manages form state (email, password, password visibility toggle)
- Handles form validation before submission
- Displays error messages from auth functions
- Triggers login/signup functions from `auth.js` on form submission
- Reloads page on successful authentication

**Key Methods**:
- `handleLoginSubmit()` (line 270): Submits login request to `loginUser()`
- `handleSignupSubmit()` (line 292): Submits signup request to `signupUser()`
- Shows/hides password with toggle buttons
- Switches between login and signup views

**Integration Points**:
- Imports `loginUser()` and `signupUser()` from `app/src/lib/auth.js`
- Called by components that need auth (e.g., Header with `autoShowLogin` prop)
- Calls `window.location.reload()` after successful auth to refresh page

---

### 1.2 Header Component Integration
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\Header.jsx`

**Purpose**: Navigation header that manages login modal display

**Key Responsibilities**:
- Manages `showLoginModal` state (line 15)
- Displays "Sign In" button when user is not logged in
- Validates auth tokens on page load via `validateTokenAndFetchUser()`
- Shows logged-in user avatar when authenticated
- Handles logout action
- Shows login modal with `autoShowLogin` prop for protected pages

**Key Methods**:
- `performAuthValidation()` (line 60): Validates token after page load
- Detects protected pages and shows login modal if needed
- Manages user type display (Host vs Guest)

**Protected Pages Trigger**:
- When user lands on protected page without valid token, Header shows login modal automatically

---

## 2. Authentication Logic Layer - Core Functions

### 2.1 Main Auth Library
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\lib\auth.js`

**Purpose**: All authentication-related functions; main interface for auth operations

#### Function: `loginUser(email, password)` (line 415)
```javascript
/**
 * Login user via Supabase Edge Function (bubble-auth-proxy)
 * Stores token and user_id in localStorage on success
 */
export async function loginUser(email, password)
```

**Data Flow**:
1. Calls Supabase function `bubble-auth-proxy` with action='login'
2. Passes email and password in payload
3. Receives {success, data: {token, user_id, expires}} response
4. On success:
   - Stores token in secure storage via `setAuthToken()`
   - Stores user_id in secure storage via `setSessionId()`
   - Sets auth state via `setAuthState(true, user_id)`
   - Updates `isUserLoggedInState = true`
   - Returns `{success: true, user_id, expires}`
5. On error:
   - Extracts error message from response
   - Returns `{success: false, error: errorMessage}`

#### Function: `signupUser(email, password, retype)` (line 513)
```javascript
/**
 * Sign up new user via Supabase Edge Function (bubble-auth-proxy)
 * Stores token and user_id in localStorage on success
 * Automatically logs in the user after successful signup
 */
export async function signupUser(email, password, retype)
```

**Data Flow**:
1. Client-side validation:
   - Checks all fields present (email, password, retype)
   - Validates password length >= 4 characters
   - Verifies password === retype
2. Calls Supabase function `bubble-auth-proxy` with action='signup'
3. Response handling same as loginUser()
4. Returns `{success: true, user_id, expires}` or `{success: false, error}`

#### Function: `validateTokenAndFetchUser()` (line 632)
```javascript
/**
 * Validate token via Supabase Edge Function and fetch user data
 * Two-step process:
 * 1. Validate token via Edge Function (validates with Bubble + fetches from Supabase)
 * 2. Cache user type locally
 */
export async function validateTokenAndFetchUser()
```

**Data Flow**:
1. Retrieves token via `getAuthToken()`
2. Retrieves user_id via `getSessionId()`
3. Returns null if either missing
4. Calls `bubble-auth-proxy` with action='validate'
5. On success:
   - Updates last activity via `updateLastActivity()`
   - Caches user type in storage
   - Returns user data object: `{userId, firstName, fullName, profilePhoto, userType}`
6. On failure:
   - Clears auth data via `clearAuthData()`
   - Returns null

#### Function: `logoutUser()` (line 759)
```javascript
/**
 * Logout user via Supabase Edge Function (bubble-auth-proxy)
 * Calls logout endpoint with stored Bearer token
 * Clears all authentication data from localStorage
 */
export async function logoutUser()
```

**Data Flow**:
1. Retrieves token via `getAuthToken()`
2. Calls `bubble-auth-proxy` with action='logout'
3. Clears auth data via `clearAuthData()` **regardless of API response**
4. Returns `{success: true, message}`

#### Function: `checkAuthStatus()` (line 112)
```javascript
/**
 * Lightweight authentication status check
 * Checks auth state (not tokens) and validates session
 */
export async function checkAuthStatus()
```

**Data Flow**:
1. Attempts legacy migration via `migrateFromLegacyStorage()`
2. Checks Split Lease cookies for cross-domain compatibility
3. If cookies indicate logged in, returns true
4. Checks secure storage auth state
5. Verifies valid tokens exist
6. Returns boolean

---

### 2.2 Secure Storage Module
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\lib\secureStorage.js`

**Purpose**: Encapsulates localStorage access for auth tokens and state

**Storage Keys**:
```javascript
// Sensitive tokens (limited access)
'__sl_at__'      → Auth token (Bearer token)
'__sl_sid__'     → Session ID (User ID)
'__sl_rd__'      → Refresh data (future use)

// Public state (accessible to app)
'sl_auth_state'  → Is authenticated boolean
'sl_user_id'     → Public user ID
'sl_user_type'   → "Host" or "Guest"
'sl_last_activity' → Last activity timestamp
'sl_session_valid' → Session validity
```

**Key Functions**:
- `setAuthToken(token)` / `getAuthToken()` - Token management
- `setSessionId(sessionId)` / `getSessionId()` - User ID management
- `setAuthState(state, userId)` / `getAuthState()` - Auth state
- `setUserType(type)` / `getUserType()` - User type caching
- `clearAllAuthData()` - Clear all auth data on logout
- `hasValidTokens()` - Check if tokens exist
- `updateLastActivity()` - Update activity timestamp

**Security Model**:
- Tokens stored in localStorage (persists across browser sessions)
- localStorage is origin-isolated by browser security model
- Only this module accesses raw tokens
- Rest of app only knows "logged in" or "logged out" state
- XSS is primary threat (browser security handles other threats)

---

### 2.3 Auth Workflow (Orchestration)
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\logic\workflows\auth\checkAuthStatusWorkflow.js`

**Purpose**: Orchestrates auth status checking across multiple sources

**Function**: `checkAuthStatusWorkflow(params)` (line 29)
```javascript
/**
 * Check authentication status across multiple sources
 * Priority 1: Split Lease cookies (cross-domain)
 * Priority 2: Secure storage tokens
 */
export function checkAuthStatusWorkflow({
  splitLeaseCookies,
  authState,
  hasValidTokens
})
```

**Returns**:
```javascript
{
  isAuthenticated: boolean,
  source: 'cookies' | 'secure_storage' | null,
  username: string | null
}
```

---

### 2.4 Auth Rules
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\logic\rules\auth\isSessionValid.js`

**Function**: `isSessionValid()` (line 163 in auth.js)
```javascript
/**
 * Validate session by checking if tokens exist
 * Bubble API handles actual token expiry - we validate on each request
 */
export function isSessionValid()
```

**Returns**: boolean indicating if auth state is set

---

## 3. Supabase Edge Function - bubble-auth-proxy

### 3.1 Main Router
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\index.ts`

**Purpose**: Central authentication router; delegates to specific handlers

**Security Notes**:
- NO user authentication required (these endpoints ARE the auth system)
- API key stored server-side in Supabase Secrets (not in frontend)
- Validates request format only
- Routes requests to appropriate handler

**Supported Actions**:
- `login` → handleLogin
- `signup` → handleSignup
- `logout` → handleLogout
- `validate` → handleValidate

**Flow**:
1. Check method is POST (line 50)
2. Parse request body (line 59)
3. Validate required fields: `action` (line 62)
4. Load Bubble API credentials from Secrets:
   - `BUBBLE_API_BASE_URL` - Base URL for auth workflows
   - `BUBBLE_API_KEY` - API key for Bubble
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role for Supabase queries
5. Route to handler based on action (line 90)
6. Return `{success: true, data: handler_result}` or error response

**Error Handling**:
- Uses `formatErrorResponse()` and `getStatusCodeFromError()` from `_shared/errors.ts`
- Returns appropriate HTTP status code
- Logs full error stack

---

### 3.2 Login Handler
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\login.ts`

**Function**: `handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload)`

**Input Payload**:
```javascript
{
  email: string,
  password: string
}
```

**Process**:
1. Validate required fields: email, password (line 30)
2. Call Bubble login workflow (line 37):
   - URL: `{BUBBLE_API_BASE_URL}/wf/login-user`
   - Method: POST
   - Header: `Authorization: Bearer {BUBBLE_API_KEY}`
   - Body: `{email, password}`
3. Parse Bubble response (line 54)
4. Check response.ok and data.status === 'success' (line 58)
5. Extract: `token`, `user_id`, `expires` (lines 67-69)
6. Validate token and user_id are present (line 71)
7. Return to client (line 82):
```javascript
{
  token: string,
  user_id: string,
  expires: number (seconds)
}
```

**Error Handling**:
- Throws `BubbleApiError` with user-friendly message
- No fallback - if Bubble login fails, entire operation fails
- Logs all errors with `[login]` prefix

---

### 3.3 Signup Handler
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\signup.ts`

**Function**: `handleSignup(bubbleAuthBaseUrl, bubbleApiKey, payload)`

**Input Payload**:
```javascript
{
  email: string,
  password: string,
  retype: string
}
```

**Process**:
1. Validate required fields: email, password, retype
2. Call Bubble signup workflow
3. Similar to login handler
4. Returns same format: `{token, user_id, expires}`

---

### 3.4 Logout Handler
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\logout.ts`

**Function**: `handleLogout(bubbleAuthBaseUrl, bubbleApiKey, payload)`

**Input Payload**:
```javascript
{
  token: string (Bearer token)
}
```

**Process**:
1. Validate token is present
2. Call Bubble logout workflow
3. Invalidates token server-side in Bubble
4. Returns `{message: string}`

---

### 3.5 Validate Handler
**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\validate.ts`

**Function**: `handleValidate(bubbleAuthBaseUrl, bubbleApiKey, supabaseUrl, supabaseServiceKey, payload)`

**Input Payload**:
```javascript
{
  token: string,
  user_id: string
}
```

**Process**:
1. Validate token and user_id present
2. Call Bubble token validation workflow
3. Query Supabase tables for user data:
   - Fetch user details by ID
4. Combine Bubble validation + Supabase data
5. Return user data:
```javascript
{
  userId: string,
  firstName: string | null,
  fullName: string | null,
  profilePhoto: string | null,
  userType: string | null
}
```

---

## 4. Shared Utilities

### 4.1 CORS Headers
**File**: `supabase/functions/_shared/cors.ts`

**Purpose**: Allows cross-origin requests from frontend

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

### 4.2 Error Handling
**File**: `supabase/functions/_shared/errors.ts`

**Exports**:
- `BubbleApiError` - Custom error class
- `formatErrorResponse()` - Formats error for response
- `getStatusCodeFromError()` - Maps error to HTTP status

### 4.3 Validation
**File**: `supabase/functions/_shared/validation.ts`

**Exports**:
- `validateRequiredFields(object, fields)` - Checks required fields present
- `validateAction(action, allowedActions)` - Validates action is allowed

---

## Complete Data Flow Diagram

```
USER LOGIN INTERFACE
        ↓
SignUpLoginModal.jsx
        ↓
User enters email/password → handleLoginSubmit()
        ↓
calls auth.js: loginUser(email, password)
        ↓
(CLIENT-SIDE) ────────────────────────────────────────────────
        ↓
invokes supabase.functions.invoke('bubble-auth-proxy', {
  body: {
    action: 'login',
    payload: { email, password }
  }
})
        ↓
HTTP POST to Edge Function
        ↓
(EDGE FUNCTION) ──────────────────────────────────────────────
        ↓
bubble-auth-proxy/index.ts (Router)
        ↓
Validates: method=POST, has action field
        ↓
Routes to: handleLogin()
        ↓
handleLogin.ts
        ↓
Calls Bubble API:
  POST {BUBBLE_API_BASE_URL}/wf/login-user
  Headers: Authorization: Bearer {BUBBLE_API_KEY}
  Body: { email, password }
        ↓
Bubble.io validates credentials ← EXTERNAL API
        ↓
Bubble returns: {
  status: 'success',
  response: {
    token: '...',
    user_id: '123',
    expires: 3600
  }
}
        ↓
Handler validates response, returns to client:
  { token, user_id, expires }
        ↓
(CLIENT-SIDE) ────────────────────────────────────────────────
        ↓
loginUser() receives handler response
        ↓
Stores in secure storage:
  - setAuthToken(token)      → '__sl_at__'
  - setSessionId(user_id)    → '__sl_sid__'
  - setAuthState(true)       → 'sl_auth_state'
        ↓
Returns: { success: true, user_id, expires }
        ↓
SignUpLoginModal catches success
        ↓
Calls onClose()
        ↓
Calls window.location.reload()
        ↓
Page reloads, Header component validates token
        ↓
User is now logged in
```

---

## Protected Page Flow

When user lands on protected page without valid token:

```
User visits /guest-proposals
        ↓
Header component mounts
        ↓
isProtectedPage() checks URL (line 733)
        ↓
Checks: startsWith('/guest-proposals')
        ↓
validateTokenAndFetchUser() called
        ↓
No token in storage → returns null
        ↓
Header component detects failure
        ↓
If autoShowLogin=true: Shows SignUpLoginModal
If autoShowLogin=false: Redirects to home (/)
```

---

## Key Constants

**File**: `C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app\src\lib\constants.js`

```javascript
AUTH_STORAGE_KEYS = {
  TOKEN: '__sl_at__',
  SESSION_ID: '__sl_sid__',
  // ... others
}

SESSION_VALIDATION = {
  MAX_AUTH_CHECK_ATTEMPTS: 3,
  // ... others
}

SIGNUP_LOGIN_URL = '/auth'  // Fallback redirect
```

---

## Testing the Flow

### 1. Manual Test - Login
```bash
1. Go to http://localhost:5173 (or any page)
2. Click "Sign In" button
3. Enter email: test@example.com
4. Enter password: testpass123
5. Click "Sign In"
6. Modal should close
7. Page should reload
8. User avatar should appear in header
```

### 2. Manual Test - Protected Page
```bash
1. Open DevTools → Application → Local Storage
2. Delete all __sl_* keys
3. Visit http://localhost:5173/guest-proposals
4. Login modal should appear automatically
5. Login succeeds
6. Page should show proposals
```

### 3. Edge Function Testing
```bash
# Deploy the function (from project root)
supabase functions deploy bubble-auth-proxy

# Check logs
supabase functions logs bubble-auth-proxy
```

---

## Architecture Summary

| Layer | File(s) | Responsibility |
|-------|---------|-----------------|
| **UI** | SignUpLoginModal.jsx, Header.jsx | Form rendering, modal display |
| **Logic** | auth.js | API calls, token storage, state management |
| **Storage** | secureStorage.js | localStorage abstraction, token persistence |
| **Workflow** | checkAuthStatusWorkflow.js | Orchestration logic |
| **Edge Function** | bubble-auth-proxy/index.ts | Routing, request validation |
| **Handlers** | login.ts, signup.ts, logout.ts, validate.ts | Bubble API integration |
| **Shared** | cors.ts, errors.ts, validation.ts | Cross-cutting concerns |
| **External API** | (Bubble.io) | Actual user authentication |

---

## Security Principles Applied

1. **No Fallback Mechanisms**: If auth fails, return error immediately (no fallback logic)
2. **Server-side Secrets**: API keys never exposed to frontend
3. **Token Isolation**: Tokens in localStorage, only accessed by secureStorage module
4. **Session-based State**: App only knows "logged in" or "logged out", not raw tokens
5. **Proper Cleanup**: All auth data cleared on logout and validation failure
6. **Error Transparency**: Detailed errors logged server-side, user-friendly errors to client

---

## No Fallback Principle in Auth Flow

This codebase strictly adheres to "no fallback mechanisms":

**Example 1 - loginUser()**:
- If Bubble login fails → return error object (no fallback, no retry)
- If token missing in response → throw error (no default token)
- If network error → return network error message (no demo user)

**Example 2 - validateTokenAndFetchUser()**:
- If token invalid → clear auth data immediately (no extended grace period)
- If Supabase query fails → return null (no cached user data)

**Example 3 - logoutUser()**:
- Always clear auth data, even if API fails (fail-safe approach)
- Better to be logged out locally than inconsistent state

This ensures the system behavior is always predictable and correct.
