# Split Lease - Edge Functions Authentication Analysis

**Date:** 2025-12-05
**Status:** Complete analysis - Ready for implementation decisions
**Scope:** JWT authentication, PUBLIC_ACTIONS, frontend integration, auth utilities

---

## Executive Summary

The Split Lease project uses a **hybrid authentication model** with three Supabase Edge Functions:

1. **bubble-auth-proxy** - Authentication endpoints (login, signup, logout, validate)
2. **bubble-proxy** - General API proxy with public/private action routing
3. **ai-gateway** - AI service gateway with public prompt support

Authentication is **NOT enforced uniformly**:
- Authentication endpoints (login/signup) are **completely open** (required for first-time auth)
- API endpoints use a **PUBLIC_ACTIONS whitelist** to bypass auth for specific operations
- AI prompts have a **PUBLIC_PROMPTS whitelist** for guest access

---

## 1. Current JWT Authentication Implementation

### 1.1 bubble-auth-proxy (No Authentication Required)

**Location:** `/supabase/functions/bubble-auth-proxy/index.ts`

The authentication proxy is intentionally **unauthenticated** because it provides the login/signup endpoints themselves:

```typescript
// NO USER AUTHENTICATION CHECK
// These endpoints ARE the authentication system
// Users calling /login or /signup are not yet authenticated
```

**Supported Actions:**
- `login` - User login (email/password)
- `signup` - New user registration
- `logout` - User logout (invalidate token)
- `validate` - Validate token and fetch user data

**Request Format:**
```javascript
await supabase.functions.invoke('bubble-auth-proxy', {
  body: {
    action: 'login',
    payload: {
      email: 'user@example.com',
      password: 'password'
    }
  }
});
```

**Flow:**
1. User submits credentials via frontend
2. Edge Function calls Bubble.io login workflow (via `BUBBLE_API_BASE_URL/wf/login-user`)
3. Bubble returns JWT token and user_id
4. Edge Function returns token to client
5. Client stores token in **encrypted sessionStorage** (via `secureStorage.js`)

**Key Implementation Details:**
- API key (`BUBBLE_API_KEY`) stored server-side in Supabase Secrets
- Response includes: `token`, `user_id`, `expires` (seconds)
- No token validation against Bubble (token trusted once login succeeds)
- All errors throw descriptive messages (NO FALLBACK principle)

---

### 1.2 bubble-proxy (PUBLIC_ACTIONS Whitelist)

**Location:** `/supabase/functions/bubble-proxy/index.ts`

This function implements **optional authentication** with explicit public action whitelist:

```typescript
const PUBLIC_ACTIONS = [
  'create_listing',
  'get_listing',
  'send_message',
  'signup_ai',
  'upload_photos',
  'toggle_favorite',
  'get_favorites'
];
```

**Authentication Logic:**

```typescript
// Check if action requires authentication
const isPublicAction = PUBLIC_ACTIONS.includes(action);
let user = null;

// Try to authenticate user (optional for public actions)
const authHeader = req.headers.get('Authorization');

if (authHeader) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (!authError && authUser) {
    user = authUser;
    console.log(`✅ Authenticated user: ${user.email}`);
  } else {
    console.log(`Auth header present but invalid: ${authError?.message}`);
  }
}

// Require auth for non-public actions
if (!isPublicAction && !user) {
  throw new AuthenticationError('Authentication required for this action');
}

if (!user) {
  // Create a guest user object for handlers
  user = { id: 'guest', email: null };
}
```

**Public Actions (No Authentication Required):**
1. `create_listing` - Create empty listing draft (unauthenticated)
2. `get_listing` - Fetch listing data (public view)
3. `send_message` - Contact host (no auth needed)
4. `signup_ai` - AI-powered guest signup (pre-auth)
5. `upload_photos` - Upload photos before signup (pre-auth)
6. `toggle_favorite` - Add/remove from favorites (no auth)
7. `get_favorites` - Fetch favorites list (no auth)

**Private Actions (Authentication Required):**
1. `submit_listing` - Submit full listing form (HOST ONLY)
2. `submit_referral` - Submit referral (implied authenticated)

**Why Public Actions Exist:**
- Photos uploaded in Section 6 (before user signup in Section 7)
- Listing creation starts before authentication
- Guests can browse and message hosts without accounts
- AI signup is accessible during registration flow

---

### 1.3 ai-gateway (PUBLIC_PROMPTS Whitelist)

**Location:** `/supabase/functions/ai-gateway/index.ts`

Implements authentication with public prompts for unauthenticated access:

```typescript
const PUBLIC_PROMPTS = ['listing-description', 'echo-test'];

// ─────────────────────────────────────────────────────────
// 2. Authenticate user (skip for public prompts)
// ─────────────────────────────────────────────────────────

let user = null;

if (!isPublicPrompt) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new ValidationError('Missing Authorization header');
  }

  // Client for auth validation
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: authUser },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !authUser) {
    throw new ValidationError('Invalid or expired token');
  }

  user = authUser;
} else {
  console.log(`Public prompt - skipping authentication`);
}
```

**Prompts:**
- **Public:** `listing-description`, `echo-test`
- **Authenticated:** All others (future prompts)

**Authentication Flow:**
1. Parse request and extract `payload.prompt_key`
2. Check if prompt is in `PUBLIC_PROMPTS` list
3. If private prompt: require `Authorization` header with valid JWT
4. Use Supabase client to validate token via `auth.getUser()`
5. If validation fails: throw `ValidationError` (401 status)

---

## 2. Authentication Bypass Mechanisms

### 2.1 PUBLIC_ACTIONS Whitelist (bubble-proxy)

**Current Public Actions:**

| Action | Purpose | Auth Required | Why Public |
|--------|---------|---------------|-----------|
| `create_listing` | Create empty listing draft | NO | User may not be logged in yet |
| `get_listing` | Fetch listing details | NO | Public listing viewing |
| `send_message` | Contact host | NO | Guest can message without account |
| `signup_ai` | AI signup flow | NO | Accessible during signup |
| `upload_photos` | Upload listing photos | NO | Happens before signup (Section 6) |
| `toggle_favorite` | Add/remove favorite | NO | No auth required per spec |
| `get_favorites` | Fetch user's favorites | NO | No auth required per spec |
| `submit_listing` | Full listing submission | **YES** | Requires authentication |
| `submit_referral` | Submit referral | **YES** | Requires authentication |

**Security Model:**
- Public actions validate format only (no user data access)
- Non-public actions require valid JWT in `Authorization` header
- Guest user object created if no auth: `{ id: 'guest', email: null }`
- No token secret validation (Bubble is source of truth)

### 2.2 PUBLIC_PROMPTS Whitelist (ai-gateway)

**Current Public Prompts:**

| Prompt | Purpose | Auth Required | Usage |
|--------|---------|---------------|-------|
| `listing-description` | Generate listing descriptions | NO | Guest can use on public site |
| `echo-test` | Debug/test prompt | NO | Development testing |

**Future Private Prompts:**
- Market research reports (only for authenticated users)
- Premium AI features (subscription-gated)

---

## 3. Frontend Integration (How Frontend Calls Edge Functions)

### 3.1 Frontend Files Invoking Edge Functions

**Authentication Functions:**
- `/app/src/lib/auth.js` - Login, signup, logout, token validation

**API/Bubble Proxy Functions:**
- `/app/src/lib/bubbleAPI.js` - General Bubble API calls
- `/app/src/islands/pages/FavoriteListingsPage/favoritesApi.js` - Favorites
- `/app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` - Host operations
- `/app/src/islands/shared/ContactHostMessaging.jsx` - Messaging
- `/app/src/islands/shared/FavoriteButton/FavoriteButton.jsx` - Favorite toggle
- `/app/src/islands/shared/Footer.jsx` - Footer actions
- `/app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js` - Meeting scheduling

**AI Functions:**
- `/app/src/lib/aiService.js` - AI prompt execution

### 3.2 Frontend Supabase Client Setup

**File:** `/app/src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

**Environment Variables (app/.env):**
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Anon key (public)
VITE_GOOGLE_MAPS_API_KEY=...
```

### 3.3 Function Invocation Pattern

**Basic Pattern:**
```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'create_listing',
    payload: {
      listing_name: 'My Apartment'
    }
  }
});

if (error) {
  console.error('Edge Function error:', error);
  throw error;
}

if (!data.success) {
  throw new Error(data.error || 'Unknown error');
}

return data.data; // Return result
```

**With Authentication Header:**
```javascript
import { getAuthToken } from './lib/auth.js';

const token = await getAuthToken();

const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: {
    action: 'submit_listing',
    payload: { /* ... */ }
  }
});
```

### 3.4 Example: Login Flow

**File:** `/app/src/lib/auth.js`

```javascript
export async function loginUser(email, password) {
  console.log('Attempting login via Edge Function for:', email);

  try {
    const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
      body: {
        action: 'login',
        payload: {
          email,
          password
        }
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      return {
        success: false,
        error: 'Failed to authenticate. Please try again.'
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error
      };
    }

    // Store token securely
    const { token, user_id, expires } = data.data;
    await setSecureAuthToken(token);
    await setSecureSessionId(user_id);
    setAuthState(true);
    setSecureUserType(data.data.user_type || 'Guest');

    return {
      success: true,
      userId: user_id
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 4. Shared Utilities in _shared/

### 4.1 Validation (validation.ts)

```typescript
// Validate email format
validateEmail(email: string): void

// Validate required field exists
validateRequired(value: any, fieldName: string): void

// Validate object has required fields
validateRequiredFields(obj, ['field1', 'field2']): void

// Validate action is allowed
validateAction(action: string, allowedActions: string[]): void
```

**Usage in Edge Functions:**
```typescript
validateRequiredFields(payload, ['email', 'password']);
validateAction(action, ['login', 'signup', 'logout', 'validate']);
```

### 4.2 Error Handling (errors.ts)

**Error Classes:**
```typescript
class BubbleApiError extends Error
class SupabaseSyncError extends Error
class ValidationError extends Error
class AuthenticationError extends Error
class OpenAIError extends Error
```

**Helper Functions:**
```typescript
// Format error for client response
formatErrorResponse(error: Error): { success: false; error: string }

// Get HTTP status code from error type
getStatusCodeFromError(error: Error): number

// Status mapping:
// - BubbleApiError → statusCode property (or 500)
// - AuthenticationError → 401
// - ValidationError → 400
// - OpenAIError → statusCode property (or 500)
// - Other → 500
```

### 4.3 CORS Headers (cors.ts)

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

**All Edge Functions return CORS headers:**
```typescript
return new Response(JSON.stringify(response), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### 4.4 Bubble Sync Service (bubbleSync.ts)

Handles atomic operations with Bubble and Supabase:

```typescript
class BubbleSyncService {
  // Trigger Bubble workflow
  async triggerWorkflow(workflowName: string, params: Record<string, any>): Promise<string>

  // Fetch Bubble object
  async fetchBubbleObject(typeName: string, objectId: string): Promise<any>

  // Sync data to Supabase
  async syncToSupabase(tableName: string, data: Record<string, any>): Promise<void>

  // Sync multiple records
  async syncMultipleRecords(tableName: string, records: Record<string, any>[]): Promise<void>
}
```

---

## 5. Frontend Authentication Flow

### 5.1 Secure Storage System (secureStorage.js)

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                     APPLICATION                         │
│  ✅ Can access: getAuthState(), getUserId(), getUserType()
│  ❌ Cannot access: Raw tokens (encrypted)              │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ Encrypted Storage Layer
┌─────────────────────────────────────────────────────────┐
│                secureStorage.js                         │
│         (AES-GCM Encryption & Management)              │
├─────────────────────────────────────────────────────────┤
│ sessionStorage (encrypted, tab-session only):           │
│ - __sl_at__  → Encrypted auth token                     │
│ - __sl_sid__ → Encrypted session/user ID                │
│ - __sl_rd__  → Encrypted refresh data (future)          │
│                                                         │
│ localStorage (plaintext state, non-sensitive):          │
│ - sl_auth_state     → 'true' | 'false'                  │
│ - sl_user_id        → user ID (public identifier)       │
│ - sl_user_type      → 'Host' | 'Guest'                  │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
1. **AES-GCM Encryption** for sensitive tokens
2. **Per-session encryption key** (unique per browser tab)
3. **sessionStorage** for sensitive data (cleared on tab close)
4. **localStorage** for public state (persists across sessions)
5. **Automatic legacy migration** from old plaintext storage

**Public API (exposed to app):**
```javascript
// Check authentication state
const isAuth = getAuthState(); // boolean

// Get user ID (public identifier)
const userId = getUserId(); // string

// Get user type
const userType = getUserType(); // 'Host' | 'Guest'

// Check session validity
const isValid = isSessionValid(); // boolean

// Clear all auth data (on logout)
await clearAllAuthData();

// Check if valid tokens exist
const hasTokens = await hasValidTokens(); // boolean

// Migrate from legacy storage
const migrated = await migrateFromLegacyStorage(); // boolean
```

**Internal API (auth.js only):**
```javascript
// Get decrypted auth token
const token = await getAuthToken(); // Promise<string>

// Get decrypted session ID
const sessionId = await getSessionId(); // Promise<string>

// Store encrypted token
await setAuthToken(token); // Promise<void>

// Store encrypted session ID
await setSessionId(sessionId); // Promise<void>

// Store user type
await setUserType(userType); // Promise<void>
```

### 5.2 Token Storage & Encryption

**Before (Insecure):**
- Tokens in plaintext localStorage
- Anyone with browser access could steal tokens
- Persist forever (until manual logout)

**After (Secure):**
- Tokens encrypted with AES-GCM
- Stored in sessionStorage (cleared on tab close)
- Encryption key exists only in memory
- Can only be decrypted by auth.js

**Encryption Process:**
```javascript
// Generate unique key per browser tab
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Create random IV for each encryption
const iv = crypto.getRandomValues(new Uint8Array(12));

// Encrypt token with AES-GCM
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  token
);

// Store: base64(iv + encrypted)
const combined = base64(iv + encrypted);
sessionStorage.setItem('__sl_at__', combined);
```

### 5.3 Session Management

**Session Validation:**
- Bubble API manages token expiry (source of truth)
- Client validates tokens on every API request
- Invalid/expired tokens immediately rejected
- No client-side session timers

**Session Lifetime:**
- Token expiry determined by Bubble workflow response
- sessionStorage cleared on tab close (automatic)
- localStorage state persists until logout

---

## 6. Current Authentication State

### 6.1 What's Working

✅ **Login/Signup Workflows**
- `bubble-auth-proxy` fully functional
- Tokens encrypted and stored securely
- User validation on session restore

✅ **Public Actions**
- Guest users can create listings
- Unauthenticated users can upload photos
- Public listing viewing works

✅ **CORS Configuration**
- All Edge Functions return proper CORS headers
- Frontend can invoke from any origin

✅ **Error Handling**
- Descriptive error messages for all failures
- No fallback mechanisms (fails fast)
- Proper HTTP status codes

✅ **Secure Storage**
- Tokens encrypted in sessionStorage
- State exposed only to auth module
- Automatic legacy migration

### 6.2 What's Disabled/Incomplete

⚠️ **Token Refresh**
- No automatic token refresh mechanism
- Tokens expire per Bubble API response
- User must re-login when token expires

⚠️ **CSRF Protection**
- No CSRF tokens on requests
- Relies on CORS headers for protection
- Should add `X-CSRF-Token` header

⚠️ **Persistent Tokens**
- sessionStorage clears on page refresh
- User must re-login after browser restart
- Future: HttpOnly cookies via Cloudflare Worker

⚠️ **MFA/Advanced Auth**
- No multi-factor authentication
- No rate limiting on login attempts
- No IP-based anomaly detection

---

## 7. Edge Function Request/Response Patterns

### 7.1 Standard Request Format

**All Edge Functions expect:**
```typescript
{
  action: string,        // Required: one of allowed actions
  payload: {             // Required: action-specific data
    [key: string]: any
  }
}
```

**Example:**
```javascript
{
  action: 'create_listing',
  payload: {
    listing_name: 'My Apartment',
    user_email: 'user@example.com'
  }
}
```

### 7.2 Standard Response Format

**Success Response:**
```javascript
{
  success: true,
  data: {
    // Action-specific result data
  }
}
```

**Error Response:**
```javascript
{
  success: false,
  error: 'Error message here'
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Validation error (invalid input)
- `401` - Authentication required
- `405` - Method not allowed (only POST)
- `500` - Server error

### 7.3 Authorization Header Format

**For authenticated requests:**
```
Authorization: Bearer <token>
```

Where `<token>` is the JWT returned from login.

**Header Optional For:**
- `create_listing`, `get_listing`, `send_message`, `upload_photos`, `signup_ai`, `toggle_favorite`, `get_favorites`

**Header Required For:**
- `submit_listing`, `submit_referral` (in bubble-proxy)
- All prompts except `listing-description` and `echo-test` (in ai-gateway)

---

## 8. Environment & Configuration

### 8.1 Required Secrets (Supabase Dashboard)

```
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=<from-supabase-secrets-setup>
BUBBLE_AUTH_BASE_URL=https://upgradefromstr.bubbleapps.io/api/1.1
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-...
```

### 8.2 Frontend Environment (app/.env)

```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## 9. Key Files Reference

**Edge Functions:**
- `supabase/functions/bubble-auth-proxy/index.ts` - Authentication router
- `supabase/functions/bubble-auth-proxy/handlers/login.ts` - Login handler
- `supabase/functions/bubble-auth-proxy/handlers/validate.ts` - Token validation
- `supabase/functions/bubble-proxy/index.ts` - API proxy router
- `supabase/functions/ai-gateway/index.ts` - AI service gateway

**Frontend Auth:**
- `app/src/lib/auth.js` - Authentication utilities (login, signup, logout)
- `app/src/lib/secureStorage.js` - Encrypted token storage
- `app/src/lib/supabase.js` - Supabase client initialization
- `app/src/lib/bubbleAPI.js` - Bubble API wrapper functions

**Shared Utilities:**
- `supabase/functions/_shared/cors.ts` - CORS headers
- `supabase/functions/_shared/errors.ts` - Error classes
- `supabase/functions/_shared/validation.ts` - Input validation
- `supabase/functions/_shared/bubbleSync.ts` - Bubble/Supabase sync service

---

## 10. Architecture Diagrams

### 10.1 Authentication Flow (Login)

```
┌──────────────┐                              ┌────────────┐
│   Frontend   │                              │  Supabase  │
│   (React)    │                              │  Edge Fn   │
└──────┬───────┘                              └────┬───────┘
       │                                           │
       │  1. Call bubble-auth-proxy                │
       │      action: 'login'                      │
       │      payload: {email, password}           │
       ├──────────────────────────────────────────>│
       │                                           │
       │                                    2. Validate input
       │                                           │
       │                        3. Call Bubble API
       │                           (wf/login-user) │
       │                           ┌───────────────┴──────┐
       │                           │                      │
       │                           │     Bubble.io        │
       │                           │   (Auth Endpoint)    │
       │                           │                      │
       │                           │   Returns: token,    │
       │                           │   user_id, expires   │
       │                           └──────┬────────────────┘
       │                                  │
       │                           4. Return data
       │                              (no validation)
       │<──────────────────────────────────┤
       │   {success: true, data: {         │
       │     token, user_id, expires}      │
       │
       │  5. Encrypt & store token
       │     in sessionStorage (__sl_at__)
       │
       │  6. Store state in localStorage
       │     (sl_auth_state = 'true')
       │
       └──────────────────────────────────>│
              Tokens now ready for
            authenticated API calls
```

### 10.2 API Request Flow (Authenticated)

```
┌──────────────┐                              ┌────────────┐
│   Frontend   │                              │  Supabase  │
│   (React)    │                              │  Edge Fn   │
└──────┬───────┘                              └────┬───────┘
       │                                           │
       │  1. Get token from secureStorage          │
       │     (decrypts from sessionStorage)        │
       │                                           │
       │  2. Call bubble-proxy                     │
       │      headers: {Authorization: Bearer ...} │
       │      body: {action, payload}              │
       ├──────────────────────────────────────────>│
       │                                           │
       │                                    3. Parse request
       │                                           │
       │                                    4. Check PUBLIC_ACTIONS
       │                                           │
       │                             5. (If not public) Validate token
       │                                Supabase.auth.getUser()
       │                                           │
       │                                    6. Route to handler
       │                                           │
       │                                    7. Call Bubble workflow
       │                                           │
       │                                    8. Sync to Supabase
       │                                           │
       │<──────────────────────────────────────────┤
       │   {success: true, data: result}           │
       │
       │  9. Update UI
       │
       └──────────────────────────────────────────>│
```

### 10.3 Public Action Flow (Unauthenticated)

```
┌──────────────┐                              ┌────────────┐
│   Frontend   │                              │  Supabase  │
│   (Browser)  │                              │  Edge Fn   │
└──────┬───────┘                              └────┬───────┘
       │                                           │
       │  1. Call bubble-proxy                     │
       │      (NO Authorization header)            │
       │      action: 'create_listing'             │
       │      payload: {listing_name}              │
       ├──────────────────────────────────────────>│
       │                                           │
       │                                    2. Parse request
       │                                           │
       │                                    3. Check PUBLIC_ACTIONS
       │                                       ✓ create_listing
       │                                           │
       │                                    4. Skip auth validation
       │                                       user = {id: 'guest'}
       │                                           │
       │                                    5. Call Bubble workflow
       │                                           │
       │                                    6. Return result
       │                                           │
       │<──────────────────────────────────────────┤
       │   {success: true, data: {_id, Name}}      │
       │
       │  7. Listing created (guest mode)
       │
       └──────────────────────────────────────────>│
```

---

## 11. Design Principles Observed

### 11.1 NO FALLBACK Principle

All Edge Functions follow the "NO FALLBACK" principle:

```typescript
// ✅ CORRECT: Fail fast, return error
if (!required_field) {
  throw new ValidationError('Required field missing');
}

// ❌ INCORRECT: Fallback to default (forbidden)
const value = required_field || 'default_value';

// ❌ INCORRECT: Fallback to demo data (forbidden)
const listings = await fetchListings() || [
  { _id: '1', Name: 'Demo Listing' }
];
```

**Benefits:**
- Errors are transparent and debuggable
- Problems surface immediately (don't hide in logs)
- Clear indication of what needs fixing

### 11.2 Authentication at System Boundaries

JWT validation happens only at:
- Edge Function entry points (checking Authorization header)
- Public action whitelist (deciding whether to require auth)
- Prompt whitelist (deciding whether to require auth)

NOT at:
- Bubble API calls (Bubble is trusted)
- Supabase database queries (Edge Function is trusted)

### 11.3 Bubble as Source of Truth

**For Authentication:**
- Bubble.io manages token issuance
- Bubble API calls use tokens (Bubble validates)
- Client never validates token format
- Expired tokens caught when Bubble rejects them

**For Data:**
- Bubble is the primary database
- Supabase is a read-only replica (for performance)
- All mutations go through Bubble
- Sync failures are logged but don't fail operations

---

## 12. Security Assessment

### 12.1 Strengths

✅ **API Keys Server-Side Only**
- `BUBBLE_API_KEY` never exposed to frontend
- Frontend uses anon key with RLS policies
- No direct Bubble API calls from browser

✅ **Encrypted Token Storage**
- Tokens encrypted with AES-GCM
- Encryption key in memory only
- sessionStorage (cleared on tab close)

✅ **CORS Protected**
- All requests require proper CORS headers
- Prevents unauthorized cross-origin calls

✅ **No Token Validation Bypass**
- Public actions are format-validated only
- Private actions require valid JWT
- No hardcoded demo tokens

✅ **Clear Error Messages**
- Errors fail fast without fallbacks
- Debuggable error responses
- No security information leakage

### 12.2 Weaknesses / Future Improvements

⚠️ **No CSRF Protection**
- Should add `X-CSRF-Token` header validation
- Currently relies on CORS headers

⚠️ **No Rate Limiting**
- Login attempts not rate-limited
- Should add exponential backoff or IP-based limiting

⚠️ **Sessions Don't Persist**
- Page refresh loses sessionStorage
- Breaks UX (user logs out on refresh)
- Solution: HttpOnly cookies via Cloudflare Worker

⚠️ **No Token Refresh**
- Token expires per Bubble response
- No automatic refresh mechanism
- User must re-login when expired

⚠️ **No MFA**
- Single-factor authentication only
- No phone verification or TOTP

⚠️ **Supabase Anon Key Exposed**
- Published in frontend (necessary for client)
- Protected by RLS policies only
- Could be rotated independently if compromised

---

## 13. Implementation Recommendations

### Phase 1: Immediate (Next Sprint)

1. **Add CSRF Protection**
   ```typescript
   // In each Edge Function
   const csrfToken = req.headers.get('X-CSRF-Token');
   if (!csrfToken || csrfToken !== generateExpectedToken()) {
     throw new ValidationError('Invalid CSRF token');
   }
   ```

2. **Implement Token Refresh**
   ```javascript
   // When token expires:
   const newToken = await refreshAccessToken(refreshToken);
   await setAuthToken(newToken);
   ```

3. **Add Rate Limiting**
   ```typescript
   // Track login attempts per IP
   const attempts = await redis.get(`login_attempts:${ip}`);
   if (attempts > 5) {
     throw new Error('Too many login attempts');
   }
   ```

### Phase 2: Medium-Term (2-3 Sprints)

1. **HttpOnly Cookies via Cloudflare Worker**
   - Move from sessionStorage to server-side cookies
   - Tokens never accessible to JavaScript
   - Better XSS protection

2. **Token Expiry Notification**
   - Warn user before token expires
   - Offer to refresh before expiry
   - Better UX than forced re-login

3. **Audit Logging**
   - Log all authentication events
   - Track failed login attempts
   - Monitor for suspicious patterns

### Phase 3: Long-Term (Future)

1. **MFA Support**
   - TOTP-based 2FA
   - SMS verification (via Twilio)
   - Email confirmation for new devices

2. **Session Management UI**
   - View active sessions
   - Logout from specific device
   - Session activity log

3. **IP Whitelist/Blacklist**
   - Restrict access by country/IP
   - Anomaly detection
   - Device fingerprinting

---

## Conclusion

Split Lease's authentication system is **fundamentally sound** but with **specific attack surfaces**:

**Healthy Architecture:**
- Server-side secrets management ✅
- Encrypted token storage ✅
- Clear public/private action separation ✅
- Fast-fail error handling ✅
- Bubble as source of truth ✅

**Needs Attention:**
- CSRF protection (add headers) ⚠️
- Token refresh mechanism ⚠️
- Rate limiting on auth endpoints ⚠️
- Session persistence (UX issue) ⚠️

**Next Step:** Implement Phase 1 recommendations above, starting with CSRF protection and rate limiting.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-05
**Status:** Complete Analysis - Ready for Implementation Planning
