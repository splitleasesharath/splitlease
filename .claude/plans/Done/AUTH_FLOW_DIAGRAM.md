# Split Lease Authentication - Visual Flow Diagrams

## Login Flow - Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER INTERFACE LAYER                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

  User clicks "Sign In"
           │
           ├─→ app/src/islands/shared/SignUpLoginModal.jsx
                │
                ├─ Renders login form with email/password inputs
                ├─ User enters credentials
                └─ User clicks "Sign In" button
                     │
                     └─→ handleLoginSubmit() event handler
                          │
                          └─→ Calls: loginUser(email, password)
                               from app/src/lib/auth.js


┌─────────────────────────────────────────────────────────────────────────────┐
│ CLIENT-SIDE LOGIC LAYER (app/src/lib/auth.js)                              │
└─────────────────────────────────────────────────────────────────────────────┘

  loginUser(email, password)
           │
           ├─ Client-side validation:
           │  (Actually done in signupUser, loginUser skips client validation)
           │
           └─→ Invokes Supabase Edge Function
                │
                └─→ supabase.functions.invoke('bubble-auth-proxy', {
                     body: {
                       action: 'login',
                       payload: {
                         email: 'user@example.com',
                         password: 'securePassword123'
                       }
                     }
                   })


┌─────────────────────────────────────────────────────────────────────────────┐
│ NETWORK LAYER - HTTP POST REQUEST                                          │
└─────────────────────────────────────────────────────────────────────────────┘

  POST /functions/v1/bubble-auth-proxy (Supabase hosted)
    Headers: Content-Type: application/json
    Body: {
      action: 'login',
      payload: { email, password }
    }
           │
           ├─ CORS preflight check (OPTIONS)
           │  ✓ Allowed via corsHeaders from _shared/cors.ts
           │
           └─→ Routed to bubble-auth-proxy Edge Function


┌─────────────────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION ROUTER LAYER (supabase/functions/bubble-auth-proxy/index.ts)│
└─────────────────────────────────────────────────────────────────────────────┘

  Deno.serve(async (req) => {
           │
           ├─ Step 1: Validate HTTP method
           │  if (req.method !== 'POST') throw Error
           │
           ├─ Step 2: Parse request body
           │  const body = await req.json()
           │  → { action: 'login', payload: {...} }
           │
           ├─ Step 3: Validate required fields
           │  validateRequiredFields(body, ['action'])
           │
           ├─ Step 4: Load Bubble API credentials from Supabase Secrets
           │  - BUBBLE_API_BASE_URL
           │  - BUBBLE_API_KEY
           │  - SUPABASE_URL
           │  - SUPABASE_SERVICE_ROLE_KEY
           │
           ├─ Step 5: Route to appropriate handler
           │  switch(action) {
           │    case 'login':
           │      result = await handleLogin(...)
           │      break;
           │  }
           │
           └─→ Returns handler result


┌─────────────────────────────────────────────────────────────────────────────┐
│ LOGIN HANDLER (supabase/functions/bubble-auth-proxy/handlers/login.ts)     │
└─────────────────────────────────────────────────────────────────────────────┘

  handleLogin(bubbleAuthBaseUrl, bubbleApiKey, payload)
           │
           ├─ Step 1: Validate payload
           │  validateRequiredFields(payload, ['email', 'password'])
           │
           ├─ Step 2: Make HTTP request to Bubble API
           │  │
           │  └─→ POST {BUBBLE_API_BASE_URL}/wf/login-user
           │       URL: https://app.split.lease/version-test/api/1.1/wf/login-user
           │       Headers: {
           │         Content-Type: application/json,
           │         Authorization: Bearer {BUBBLE_API_KEY}
           │       }
           │       Body: { email, password }
           │       │
           │       └─→ EXTERNAL: Bubble.io processes request
           │
           ├─ Step 3: Parse Bubble response
           │  response = await fetch(...).then(r => r.json())
           │  Expected: {
           │    status: 'success',
           │    response: {
           │      token: 'bubble_token_123...',
           │      user_id: 'bubble_user_456...',
           │      expires: 3600
           │    }
           │  }
           │
           ├─ Step 4: Validate response
           │  if (!response.ok || data.status !== 'success')
           │    throw BubbleApiError(data.message)
           │
           ├─ Step 5: Extract authentication data
           │  token = data.response.token
           │  user_id = data.response.user_id
           │  expires = data.response.expires
           │
           ├─ Step 6: Validate extracted data
           │  if (!token || !user_id)
           │    throw BubbleApiError('Missing required fields')
           │
           └─→ Return to Edge Function router
                return {
                  token: 'bubble_token_123...',
                  user_id: 'bubble_user_456...',
                  expires: 3600
                }


┌─────────────────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION RESPONSE (supabase/functions/bubble-auth-proxy/index.ts)     │
└─────────────────────────────────────────────────────────────────────────────┘

  Handler result received
           │
           └─→ Return successful response to client
                HTTP 200 OK
                {
                  success: true,
                  data: {
                    token: '...',
                    user_id: '...',
                    expires: 3600
                  }
                }


┌─────────────────────────────────────────────────────────────────────────────┐
│ CLIENT-SIDE LOGIC LAYER - RESPONSE HANDLING (app/src/lib/auth.js)         │
└─────────────────────────────────────────────────────────────────────────────┘

  loginUser() receives response
           │
           ├─ Check for errors
           │  if (error || !data.success)
           │    return { success: false, error: ... }
           │
           ├─ Extract authentication data
           │  token = data.data.token
           │  user_id = data.data.user_id
           │  expires = data.data.expires
           │
           ├─ Store in secure localStorage
           │  setAuthToken(token)
           │    → localStorage['__sl_at__'] = token
           │
           ├─ Store user ID
           │  setSessionId(user_id)
           │    → localStorage['__sl_sid__'] = user_id
           │
           ├─ Set auth state
           │  setAuthState(true, user_id)
           │    → localStorage['sl_auth_state'] = true
           │    → localStorage['sl_user_id'] = user_id
           │
           ├─ Update module state
           │  isUserLoggedInState = true
           │
           └─→ Return to component
                return {
                  success: true,
                  user_id: '...',
                  expires: 3600
                }


┌─────────────────────────────────────────────────────────────────────────────┐
│ UI RESPONSE HANDLING (app/src/islands/shared/SignUpLoginModal.jsx)         │
└─────────────────────────────────────────────────────────────────────────────┘

  handleLoginSubmit() receives result
           │
           ├─ if (result.success)
           │  ├─ Call onAuthSuccess(result) callback (if provided)
           │  ├─ Call onClose() to close modal
           │  └─→ Call window.location.reload()
           │       (Reload page to refresh all components)
           │
           └─ else
              ├─ setLoginError(result.error)
              └─ Show error message in modal


┌─────────────────────────────────────────────────────────────────────────────┐
│ PAGE RELOAD - HEADER VALIDATION (app/src/islands/shared/Header.jsx)       │
└─────────────────────────────────────────────────────────────────────────────┘

  Page reloads
           │
           └─→ Header component mounts (useEffect, line 39)
                │
                ├─ Check if token exists
                │  token = getAuthToken()
                │
                ├─ If token exists:
                │  ├─ Wait for page to load
                │  └─→ Call validateTokenAndFetchUser()
                │       │
                │       └─→ Calls bubble-auth-proxy with action='validate'
                │           to verify token and fetch user data
                │
                ├─ If validation succeeds:
                │  ├─ setCurrentUser(userData)
                │  ├─ Show user avatar in header
                │  └─→ User is fully logged in
                │
                └─ If validation fails:
                   ├─ clearAuthData()
                   └─ Redirect to home (or show modal if protected page)


┌─────────────────────────────────────────────────────────────────────────────┐
│ FINAL STATE - USER IS LOGGED IN                                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ✓ Token stored in localStorage['__sl_at__']
  ✓ User ID stored in localStorage['__sl_sid__']
  ✓ Auth state stored in localStorage['sl_auth_state']
  ✓ User avatar visible in Header
  ✓ Protected pages accessible
  ✓ Ready for authenticated API calls
```

---

## Protected Page Access Flow

```
User visits /guest-proposals (protected page)
           │
           └─→ Page loads
                │
                ├─→ Header component mounts
                │   │
                │   └─→ useEffect triggers (line 39)
                │       │
                │       ├─ Check if token exists
                │       │  getAuthToken() returns null
                │       │
                │       └─→ setAuthChecked(true)
                │           Exit validation
                │
                ├─→ Header checks if page is protected
                │   │
                │   └─→ isProtectedPage()
                │       ├─ Get current path: /guest-proposals
                │       ├─ Check against protected paths:
                │       │  - /guest-proposals ← MATCH
                │       │  - /account-profile
                │       │  - /host-dashboard
                │       │
                │       └─→ Returns true
                │
                ├─→ token validation returned null
                │   and isProtectedPage() = true
                │   and autoShowLogin = true (for protected pages)
                │
                └─→ Show SignUpLoginModal automatically
                    │
                    └─ User logs in (same flow as above)
                        │
                        └─ After reload, token is valid
                           │
                           └─ Page displays protected content
```

---

## Token Validation Flow

```
At any time (page load, page transition, API call):

checkAuthStatus() / validateTokenAndFetchUser()
           │
           ├─ Step 1: Get tokens from storage
           │  token = getAuthToken()    // from '__sl_at__'
           │  user_id = getSessionId()  // from '__sl_sid__'
           │
           ├─ Step 2: Check if tokens exist
           │  if (!token || !user_id)
           │    return null
           │
           ├─ Step 3: Call Edge Function to validate
           │  supabase.functions.invoke('bubble-auth-proxy', {
           │    body: {
           │      action: 'validate',
           │      payload: { token, user_id }
           │    }
           │  })
           │
           ├─ Step 4: Edge Function validates with Bubble
           │  │
           │  └─→ handleValidate(url, key, supabase, serviceKey, payload)
           │       │
           │       ├─ Call Bubble: /wf/validate-token
           │       │  with Authorization: Bearer {token}
           │       │
           │       ├─ If Bubble says "invalid" or "expired":
           │       │  return error
           │       │
           │       └─ If Bubble says "valid":
           │          └─ Query Supabase for user data
           │             return {
           │               userId,
           │               firstName,
           │               fullName,
           │               profilePhoto,
           │               userType
           │             }
           │
           ├─ Step 5: Process response
           │
           ├─ If validation succeeds:
           │  ├─ Update last activity: updateLastActivity()
           │  ├─ Cache user type: setUserType(userData.userType)
           │  └─→ Return user data
           │       {
           │         userId,
           │         firstName,
           │         fullName,
           │         profilePhoto,
           │         userType
           │       }
           │
           └─ If validation fails:
              ├─ Clear all auth data: clearAuthData()
              │  ├─ Remove '__sl_at__'
              │  ├─ Remove '__sl_sid__'
              │  ├─ Remove 'sl_auth_state'
              │  ├─ Remove 'sl_user_type'
              │  └─ Clear all cookies
              │
              └─→ Return null (user must log in again)
```

---

## Logout Flow

```
User clicks logout button (in Header or menu)
           │
           └─→ Calls: logoutUser()
                from app/src/lib/auth.js
                │
                ├─ Step 1: Get current token
                │  token = getAuthToken()
                │
                ├─ Step 2: Call logout Edge Function
                │  supabase.functions.invoke('bubble-auth-proxy', {
                │    body: {
                │      action: 'logout',
                │      payload: { token }
                │    }
                │  })
                │
                ├─ Step 3: Edge Function invalidates token in Bubble
                │  │
                │  └─→ handleLogout(url, key, payload)
                │       │
                │       └─ Call Bubble: /wf/logout
                │          with Authorization: Bearer {token}
                │          Bubble invalidates the token server-side
                │
                ├─ Step 4: Clear all auth data (REGARDLESS of API result)
                │  clearAuthData()
                │  ├─ Remove '__sl_at__'
                │  ├─ Remove '__sl_sid__'
                │  ├─ Remove '__sl_rd__'
                │  ├─ Remove 'sl_auth_state'
                │  ├─ Remove 'sl_user_id'
                │  ├─ Remove 'sl_user_type'
                │  ├─ Remove 'sl_last_activity'
                │  └─ Remove 'sl_session_valid'
                │
                ├─ Step 5: Return success
                │  return {
                │    success: true,
                │    message: 'Logout successful'
                │  }
                │
                └─→ UI updates
                    ├─ Remove user avatar from Header
                    ├─ Hide user-specific menu items
                    └─ User is logged out
                        └─ Next protected page visit will show login modal
```

---

## State Transitions Diagram

```
                    ┌─────────────┐
                    │  NOT LOGGED │
                    │     IN      │
                    └──────┬──────┘
                           │
                           │ User enters valid credentials
                           │ loginUser() succeeds
                           ↓
                    ┌─────────────────┐
                    │ VALIDATING      │
                    │ (tokens stored) │
                    └──────┬──────────┘
                           │
                      ┌────┴────┐
                      ↓         ↓
            ✓ VALID      ✗ INVALID
                 │           │
                 ↓           ├─→ clearAuthData()
            ┌──────────┐     │
            │ LOGGED   │     ↓
            │   IN     │ ┌──────────┐
            └────┬─────┘ │ INVALID  │
                 │       │  TOKEN  │
            ┌────┴───┐   └────┬─────┘
            │         │        │
            │         │        │ Auto-validate fails
            │   ┌────┴────┐   │
            │   ↓         ↓   │
            │logoutUser() or  │
            │ Token expires    │
            │   │         │    │
            │   ↓         ↓    │
            │   ┌──────────┐   │
            │   │ CLEARED  │←──┘
            │   │   DATA   │
            │   └────┬─────┘
            │        │
            └────┴───┘
                 │
                 ↓
            ┌──────────┐
            │NOT LOGGED│
            │   IN     │
            └──────────┘
```

---

## Data Flow Summary

```
FRONTEND (React)
├── Component: SignUpLoginModal.jsx
│   └── Collects: email, password
│       └── Submits to: loginUser()
│
├── Library: auth.js
│   ├── loginUser(email, password)
│   │   └── Posts to: Edge Function
│   │
│   ├── signupUser(email, password, retype)
│   │   └── Posts to: Edge Function
│   │
│   └── validateTokenAndFetchUser()
│       └── Posts to: Edge Function
│
└── Module: secureStorage.js
    └── Stores/Retrieves: tokens, user_id, auth state

NETWORK
└── Edge Function (Supabase)
    ├── Route: bubble-auth-proxy/index.ts
    │   └── Validates: method, action
    │
    ├── Handler: login.ts
    │   └── Calls Bubble API: /wf/login-user
    │       └── Returns: {token, user_id, expires}
    │
    ├── Handler: signup.ts
    │   └── Calls Bubble API: /wf/signup-user
    │       └── Returns: {token, user_id, expires}
    │
    ├── Handler: validate.ts
    │   ├── Calls Bubble API: /wf/validate-token
    │   └── Calls Supabase: query user table
    │       └── Returns: {userId, firstName, ..., userType}
    │
    └── Handler: logout.ts
        └── Calls Bubble API: /wf/logout

EXTERNAL APIs
├── Bubble.io
│   ├── /wf/login-user → validates credentials
│   ├── /wf/signup-user → creates account
│   ├── /wf/validate-token → verifies token
│   └── /wf/logout → invalidates token
│
└── Supabase Database
    └── user table → user profile data
```

---

## Architecture Layers Visualized

```
┌────────────────────────────────────────────────────────────────────┐
│                        UI LAYER (React)                            │
│  SignUpLoginModal.jsx  │  Header.jsx  │  Other Components          │
├────────────────────────────────────────────────────────────────────┤
│                  LOGIC LAYER (auth.js)                             │
│  loginUser() | signupUser() | validateTokenAndFetchUser() | logout │
├────────────────────────────────────────────────────────────────────┤
│                STORAGE LAYER (secureStorage.js)                    │
│  Tokens  │  User ID  │  Auth State  │  Session Data               │
├────────────────────────────────────────────────────────────────────┤
│                   localStorage (Browser)                           │
│  __sl_at__ │ __sl_sid__ │ sl_auth_state │ sl_user_type            │
╞════════════════════════════════════════════════════════════════════╡
│                      NETWORK BOUNDARY                              │
╞════════════════════════════════════════════════════════════════════╡
│                EDGE FUNCTION LAYER (Supabase)                      │
│  index.ts (Router)  │  login.ts  │  signup.ts  │  validate.ts     │
├────────────────────────────────────────────────────────────────────┤
│                EXTERNAL APIS (Bubble + Supabase DB)                │
│  Bubble.io Auth  │  Bubble.io User DB  │  Supabase User DB        │
└────────────────────────────────────────────────────────────────────┘

SECURITY BOUNDARIES
- Token never exposed to frontend code
- Only secureStorage.js accesses raw tokens
- API keys only in Supabase Secrets (not in code)
- Edge Function validates all requests
- Bubble handles actual auth/token expiry
```
