# Split Lease Authentication - Quick Reference Guide

## File Locations Summary

### Frontend Components
| File | Purpose | Key Methods |
|------|---------|------------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Login/signup form modal | `handleLoginSubmit()`, `handleSignupSubmit()` |
| `app/src/islands/shared/Header.jsx` | Site navigation + auth triggers | `performAuthValidation()`, login/logout buttons |

### Authentication Logic
| File | Purpose | Key Functions |
|------|---------|----------------|
| `app/src/lib/auth.js` | Main auth interface | `loginUser()`, `signupUser()`, `validateTokenAndFetchUser()`, `logoutUser()`, `checkAuthStatus()` |
| `app/src/lib/secureStorage.js` | Token storage abstraction | `setAuthToken()`, `getAuthToken()`, `setSessionId()`, `getSessionId()`, `clearAllAuthData()` |
| `app/src/logic/workflows/auth/checkAuthStatusWorkflow.js` | Auth status orchestration | `checkAuthStatusWorkflow()` |
| `app/src/logic/rules/auth/isSessionValid.js` | Session validation rule | `isSessionValid()` |

### Edge Functions (Supabase)
| File | Purpose | Handler |
|------|---------|---------|
| `supabase/functions/bubble-auth-proxy/index.ts` | Main router | Routes to specific handlers |
| `supabase/functions/bubble-auth-proxy/handlers/login.ts` | Login handler | `handleLogin()` |
| `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Signup handler | `handleSignup()` |
| `supabase/functions/bubble-auth-proxy/handlers/logout.ts` | Logout handler | `handleLogout()` |
| `supabase/functions/bubble-auth-proxy/handlers/validate.ts` | Token validation | `handleValidate()` |

### Shared Utilities
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/cors.ts` | CORS headers |
| `supabase/functions/_shared/errors.ts` | Error handling |
| `supabase/functions/_shared/validation.ts` | Input validation |

---

## Core Function Signatures

### Frontend (app/src/lib/auth.js)

```javascript
// Login
export async function loginUser(email, password)
// Returns: { success: boolean, user_id?: string, error?: string, expires?: number }

// Signup
export async function signupUser(email, password, retype)
// Returns: { success: boolean, user_id?: string, error?: string, expires?: number }

// Validate token and get user data
export async function validateTokenAndFetchUser()
// Returns: { userId, firstName, fullName, profilePhoto, userType } | null

// Logout
export async function logoutUser()
// Returns: { success: boolean, message: string }

// Check if user is logged in
export async function checkAuthStatus()
// Returns: boolean
```

### Edge Function (supabase/functions/bubble-auth-proxy/)

```typescript
// All handlers receive:
// - bubbleAuthBaseUrl: string (from Secrets)
// - bubbleApiKey: string (from Secrets)
// - payload: any (from request body)

export async function handleLogin(url, key, payload)
export async function handleSignup(url, key, payload)
export async function handleLogout(url, key, payload)
export async function handleValidate(url, key, supabaseUrl, serviceKey, payload)
```

---

## Authentication Flow Steps

### Login Flow
```
1. User clicks "Sign In" → SignUpLoginModal opens
2. User enters email/password → handleLoginSubmit()
3. Calls auth.js: loginUser(email, password)
4. Invokes Edge Function: bubble-auth-proxy
5. Edge Function calls Bubble API: /wf/login-user
6. Bubble validates credentials
7. Returns {token, user_id, expires}
8. Frontend stores in localStorage via secureStorage
9. Modal closes, page reloads
10. User is logged in
```

### Signup Flow
```
1. User clicks "Sign Up" → SignUpLoginModal signup view
2. User enters email/password/retype
3. Client-side validation:
   - Check all fields present
   - Password >= 4 chars
   - password === retype
4. Calls auth.js: signupUser(email, password, retype)
5. Rest same as login flow
```

### Logout Flow
```
1. User clicks logout
2. Calls auth.js: logoutUser()
3. Calls Edge Function with token
4. Edge Function invalidates token in Bubble
5. Frontend clears all localStorage data
6. User is logged out
```

### Protected Page Flow
```
1. User visits /guest-proposals (protected page)
2. Header checks: isProtectedPage() = true
3. Header calls: validateTokenAndFetchUser()
4. If token valid:
   - User data loaded
   - Page displays content
5. If token invalid:
   - Auth data cleared
   - Login modal shown (or redirect to home)
```

---

## Storage Keys in localStorage

```javascript
// Private (only accessed by secureStorage.js)
'__sl_at__'         → Auth token (Bearer token for Bubble API)
'__sl_sid__'        → Session ID (User ID from Bubble)
'__sl_rd__'         → Refresh data (future use)

// Public (accessible to app)
'sl_auth_state'     → Is authenticated (boolean)
'sl_user_id'        → Public user ID (string)
'sl_user_type'      → User type: "Host" or "Guest" (string)
'sl_last_activity'  → Last activity timestamp (number)
'sl_session_valid'  → Is session valid (boolean)
```

---

## Environment Variables Required

### Supabase Secrets (set in Supabase Dashboard)
```
BUBBLE_API_BASE_URL      = "https://app.split.lease/version-test/api/1.1"
BUBBLE_API_KEY           = (from Bubble app settings)
SUPABASE_URL             = (from Supabase project settings)
SUPABASE_SERVICE_ROLE_KEY = (from Supabase project settings)
```

### Frontend Environment (.env or .env.local)
```
VITE_SUPABASE_URL      = (from Supabase project settings)
VITE_SUPABASE_ANON_KEY = (from Supabase project settings)
```

---

## Common Debugging Scenarios

### User can't login
1. Check Supabase Secrets are configured correctly
2. Check `supabase functions logs bubble-auth-proxy` for errors
3. Verify Bubble API is accessible from Edge Function (not blocked by firewall)
4. Check email/password are correct in Bubble app

### Token appears invalid after login
1. Check token is stored in `__sl_at__` in localStorage
2. Check `validateTokenAndFetchUser()` response in console
3. Verify Bubble token hasn't expired
4. Check `supabase functions logs bubble-auth-proxy` for validation errors

### Protected page redirects on login
1. Check Header component received valid userData from `validateTokenAndFetchUser()`
2. Check `isProtectedPage()` correctly identifies the page
3. Verify page URL matches exactly with protected paths:
   - `/guest-proposals`
   - `/account-profile`
   - `/host-dashboard`

### User stays logged in after closing browser
1. This is normal - tokens persisted in localStorage
2. To test logout, clear localStorage manually
3. Or use DevTools → Application → Local Storage → Delete __sl_* keys

---

## Testing Commands

```bash
# Deploy Edge Function
supabase functions deploy bubble-auth-proxy

# View Edge Function logs
supabase functions logs bubble-auth-proxy

# Test locally
supabase functions serve

# Check Secrets configuration
supabase secrets list
```

---

## No Fallback Principle Examples

### In loginUser()
```javascript
// NO: Don't do this
if (!token) {
  token = 'demo-token-123';  // WRONG - no fallback
  return { success: true };  // WRONG - no demo user
}

// YES: Do this
if (!token) {
  return { success: false, error: 'Login failed' };
}
```

### In validateTokenAndFetchUser()
```javascript
// NO: Don't do this
if (token invalid) {
  return { userId: null };  // WRONG - partial state
  return cached userData;   // WRONG - expired data
}

// YES: Do this
if (token invalid) {
  clearAuthData();
  return null;
}
```

### In logout
```javascript
// YES: Always clear, even if API fails
try {
  await callBubbleLogoutAPI();
} finally {
  clearAuthData();  // Fail-safe approach
}
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Use Edge Functions | API keys server-side, not exposed to frontend |
| localStorage for tokens | User stays logged in across sessions; Bubble handles expiry |
| Separate token/state storage | App only knows "logged in/out", not raw tokens |
| Clear data on failure | Better to be logged out than in inconsistent state |
| No fallback mechanisms | Errors are explicit and traceable |
| Page reload after login | Ensures all components see updated auth state |
| Protected page auto-login | Better UX than redirect to home |

---

## Integration Points

When building new features:

1. **Protected Routes**: Use `isProtectedPage()` to check access
2. **User Display**: Use `validateTokenAndFetchUser()` for user data
3. **API Calls**: Use `getAuthToken()` only for Edge Function calls
4. **Logout**: Call `logoutUser()` from Header or menu
5. **Auth Modals**: Show `SignUpLoginModal` with `isOpen` and `onClose` props

All integration should go through `app/src/lib/auth.js` - never access tokens or storage directly.
