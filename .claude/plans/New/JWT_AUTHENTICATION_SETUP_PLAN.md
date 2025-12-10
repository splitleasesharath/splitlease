# Supabase Edge Functions JWT Authentication Setup Plan

**Date:** 2025-12-05
**Status:** Pending Implementation
**Priority:** High - Security Infrastructure

---

## Introduction: What is JWT Authentication & Why You Need It

### What is a JWT?

A **JSON Web Token (JWT)** is a compact, URL-safe token that represents claims between two parties. Think of it as a digitally-signed ID card that proves who you are.

```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Structure:**
- **Header**: Algorithm & token type (e.g., HS256)
- **Payload**: User claims (user_id, email, expiry time)
- **Signature**: Cryptographic proof that the token hasn't been tampered with

### Why JWT Authentication is Essential

Without JWT authentication, your Edge Functions are vulnerable:

| Scenario | Without JWT | With JWT |
|----------|-------------|----------|
| Hacker sends malicious request | Function executes it blindly | Function rejects (no valid token) |
| User tries to access another user's data | Data exposed | Request blocked (wrong user ID in token) |
| API key stolen | Full system access | Limited - still need valid user token |
| Row Level Security (RLS) | Not enforced | Automatically enforced |

**Your Current Problem:**
You're deploying Edge Functions with `--no-verify-jwt` flag, which disables Supabase's automatic JWT verification. This means:
1. Anyone can call your functions without authentication
2. Row Level Security (RLS) policies don't work
3. User context isn't established for database queries

---

## Your Current Authentication Architecture

### Three Edge Functions Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPLIT LEASE EDGE FUNCTIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  bubble-auth-proxy        bubble-proxy           ai-gateway     │
│  ────────────────        ────────────           ──────────      │
│  NO AUTH REQUIRED        HYBRID AUTH           HYBRID AUTH      │
│                                                                  │
│  Actions:                PUBLIC_ACTIONS:       PUBLIC_PROMPTS:   │
│  • login                 • create_listing      • listing-desc   │
│  • signup                • get_listing         • echo-test      │
│  • logout                • send_message                          │
│  • validate              • signup_ai           PRIVATE:          │
│                          • upload_photos       • all others      │
│                          • toggle_favorite                       │
│                          • get_favorites                         │
│                                                                  │
│                          PRIVATE (requires JWT):                 │
│                          • submit_listing                        │
│                          • submit_referral                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### What's Currently Happening

1. **bubble-auth-proxy**: Intentionally unauthenticated (it IS the login endpoint)
2. **bubble-proxy**: Has `PUBLIC_ACTIONS` whitelist - auth bypass for certain actions
3. **ai-gateway**: Has `PUBLIC_PROMPTS` whitelist - auth bypass for certain prompts

The code for JWT validation EXISTS in your codebase (`bubble-proxy/index.ts` lines 83-99), but it's optional and only enforced for non-public actions.

---

## The Problem: Why You're Disabling JWT

Based on your codebase analysis, the issue is likely one of these:

### Issue 1: Frontend Not Sending Authorization Header

```javascript
// CURRENT (broken):
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: { action: 'submit_listing', payload: {...} }
});

// REQUIRED (with auth):
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: { action: 'submit_listing', payload: {...} }
});
// Note: supabase.functions.invoke() AUTOMATICALLY includes auth header
// IF user is logged in via Supabase Auth
```

### Issue 2: Token Source Mismatch (Your Actual Issue)

Your architecture uses **Bubble.io tokens**, NOT Supabase tokens:

```
YOUR CURRENT FLOW:
1. User logs in via bubble-auth-proxy
2. Bubble.io returns a custom JWT token
3. Frontend stores this token (encrypted in sessionStorage)
4. Frontend sends this token to Edge Functions
5. Edge Function tries to validate with Supabase Auth
6. FAILS - because token was issued by Bubble, not Supabase

SUPABASE EXPECTED FLOW:
1. User logs in via Supabase Auth
2. Supabase returns JWT (signed with your project's JWT secret)
3. Frontend stores token automatically
4. supabase.functions.invoke() includes token automatically
5. Edge Function validates with Supabase Auth
6. WORKS - token was issued by Supabase
```

---

## Solution Options

### Option A: Use Supabase Auth (Recommended for New Projects)

Replace Bubble.io authentication with Supabase Auth entirely.

**Pros:**
- Native integration - everything "just works"
- Automatic token refresh
- RLS policies work automatically
- No custom code needed

**Cons:**
- Requires migration from Bubble.io auth
- Breaking change to existing users
- Not suitable if Bubble must remain auth source

**Implementation:**

```javascript
// Frontend: app/src/lib/auth.js
import { supabase } from './supabase';

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  // Token automatically stored and managed by Supabase client
  return data.user;
}

// Edge Function: No changes needed!
// JWT validation happens automatically when deployed without --no-verify-jwt
```

---

### Option B: Custom Token Validation (Your Current Architecture)

Keep Bubble.io as auth source, but implement proper token validation.

**Pros:**
- No migration needed
- Works with existing Bubble workflows
- Gradual adoption possible

**Cons:**
- Manual token management
- Custom validation code required
- Bubble must expose token verification endpoint

**Implementation:**

#### Step 1: Create Token Validation Utility

```typescript
// supabase/functions/_shared/tokenValidation.ts

export interface TokenValidationResult {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    user_type: 'Host' | 'Guest';
  };
  error?: string;
}

export async function validateBubbleToken(
  token: string
): Promise<TokenValidationResult> {
  const bubbleApiBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Call Bubble's validate endpoint
    const response = await fetch(
      `${bubbleApiBaseUrl}/wf/validate-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bubbleApiKey}`
        },
        body: JSON.stringify({ token })
      }
    );

    if (!response.ok) {
      return { valid: false, error: 'Token validation failed' };
    }

    const data = await response.json();

    if (!data.response?.valid) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    return {
      valid: true,
      user: {
        id: data.response.user_id,
        email: data.response.email,
        user_type: data.response.user_type
      }
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Validation service unavailable' };
  }
}
```

#### Step 2: Update Edge Function to Use Custom Validation

```typescript
// supabase/functions/bubble-proxy/index.ts

import { validateBubbleToken } from '../_shared/tokenValidation.ts';

// ... existing imports ...

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    const isPublicAction = PUBLIC_ACTIONS.includes(action);

    let user = null;

    // Check for Authorization header
    const authHeader = req.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      // Validate with Bubble instead of Supabase
      const validation = await validateBubbleToken(token);

      if (validation.valid) {
        user = validation.user;
        console.log(`✅ Authenticated user: ${user.email}`);
      } else {
        console.log(`Token validation failed: ${validation.error}`);

        // For private actions, reject immediately
        if (!isPublicAction) {
          throw new AuthenticationError(validation.error || 'Invalid token');
        }
      }
    }

    // Require auth for non-public actions
    if (!isPublicAction && !user) {
      throw new AuthenticationError('Authentication required');
    }

    // Proceed with handler...
  } catch (error) {
    // ... error handling ...
  }
});
```

#### Step 3: Ensure Frontend Sends Token

```javascript
// app/src/lib/auth.js - Update API call function

import { getAuthToken } from './secureStorage';

export async function authenticatedFetch(action, payload) {
  const token = await getAuthToken();

  const response = await supabase.functions.invoke('bubble-proxy', {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: { action, payload }
  });

  return response;
}
```

---

### Option C: Hybrid Approach (Best for Your Case)

Use Supabase Auth for new users, migrate existing Bubble users over time.

**Phase 1: Enable Both Auth Systems**
```typescript
// Check Supabase token first, fall back to Bubble token
const authHeader = req.headers.get('Authorization');

if (authHeader?.startsWith('Bearer ')) {
  const token = authHeader.replace('Bearer ', '');

  // Try Supabase first
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user: supabaseUser } } = await supabaseClient.auth.getUser();

  if (supabaseUser) {
    user = supabaseUser;
  } else {
    // Fall back to Bubble validation
    const bubbleValidation = await validateBubbleToken(token);
    if (bubbleValidation.valid) {
      user = bubbleValidation.user;
    }
  }
}
```

---

## Deployment Configuration

### Option 1: Config.toml (Recommended)

Configure JWT verification per-function in `supabase/config.toml`:

```toml
[functions.bubble-auth-proxy]
verify_jwt = false  # Login/signup endpoints must be public

[functions.bubble-proxy]
verify_jwt = false  # We handle auth internally with PUBLIC_ACTIONS

[functions.ai-gateway]
verify_jwt = false  # We handle auth internally with PUBLIC_PROMPTS
```

**Why `verify_jwt = false` even with authentication?**

Your functions handle auth internally using whitelists. Supabase's built-in JWT verification would reject ALL unauthenticated requests, breaking your public actions.

### Option 2: Deploy Command Flags

```bash
# Auth proxy - must be public
supabase functions deploy bubble-auth-proxy --no-verify-jwt

# API proxy - handles auth internally
supabase functions deploy bubble-proxy --no-verify-jwt

# AI gateway - handles auth internally
supabase functions deploy ai-gateway --no-verify-jwt
```

---

## Step-by-Step Implementation Guide

### Phase 1: Verify Current State (Day 1)

1. **Check existing token flow:**
   ```bash
   # Look at login response in browser DevTools
   # Network tab → bubble-auth-proxy → Response
   # Check if token is being returned
   ```

2. **Verify frontend stores token:**
   ```javascript
   // In browser console:
   console.log(sessionStorage.getItem('__sl_at__')); // Should see encrypted data
   console.log(localStorage.getItem('sl_auth_state')); // Should be 'true' after login
   ```

3. **Check if token sent with requests:**
   ```bash
   # Network tab → bubble-proxy request → Headers
   # Look for: Authorization: Bearer <token>
   ```

### Phase 2: Fix Token Sending (Day 2)

If tokens aren't being sent, update `app/src/lib/bubbleAPI.js`:

```javascript
import { supabase } from './supabase';
import { getAuthToken } from './secureStorage';

export async function callBubbleProxy(action, payload) {
  const token = await getAuthToken();

  const options = {
    body: { action, payload }
  };

  // Only add auth header if we have a token
  if (token) {
    options.headers = {
      'Authorization': `Bearer ${token}`
    };
  }

  const { data, error } = await supabase.functions.invoke('bubble-proxy', options);

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data.data;
}
```

### Phase 3: Add Token Validation Endpoint to Bubble (Day 3)

Create a new Bubble workflow: `validate-token`

**Workflow Steps:**
1. Receive token in request body
2. Look up user by token (your token storage)
3. Check if token is expired
4. Return user data if valid

**Response:**
```json
{
  "valid": true,
  "user_id": "...",
  "email": "...",
  "user_type": "Host"
}
```

### Phase 4: Deploy and Test (Day 4)

```bash
# 1. Deploy with explicit no-verify-jwt (you handle auth internally)
supabase functions deploy bubble-proxy --no-verify-jwt

# 2. Test public action (should work without token)
curl -X POST https://[project].supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "get_listing", "payload": {"id": "123"}}'

# 3. Test private action without token (should fail)
curl -X POST https://[project].supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "submit_listing", "payload": {...}}'
# Expected: {"success": false, "error": "Authentication required"}

# 4. Test private action with valid token (should work)
curl -X POST https://[project].supabase.co/functions/v1/bubble-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"action": "submit_listing", "payload": {...}}'
```

---

## Quick Reference: Your Files

### Edge Functions (Authentication Logic)
- `supabase/functions/bubble-auth-proxy/index.ts` - Login endpoint
- `supabase/functions/bubble-proxy/index.ts:55-57` - PUBLIC_ACTIONS definition
- `supabase/functions/bubble-proxy/index.ts:83-99` - Auth validation code
- `supabase/functions/ai-gateway/index.ts:55-56` - PUBLIC_PROMPTS definition

### Frontend (Token Management)
- `app/src/lib/auth.js` - Login/logout functions
- `app/src/lib/secureStorage.js` - Encrypted token storage
- `app/src/lib/supabase.js` - Supabase client
- `app/src/lib/bubbleAPI.js` - API calls

### Shared Utilities
- `supabase/functions/_shared/errors.ts` - AuthenticationError class
- `supabase/functions/_shared/validation.ts` - Input validation
- `supabase/functions/_shared/cors.ts` - CORS headers

---

## Decision Matrix

| Factor | Option A (Supabase Auth) | Option B (Custom Validation) | Option C (Hybrid) |
|--------|--------------------------|------------------------------|-------------------|
| Implementation Effort | High (migration) | Medium | Medium-High |
| Breaking Changes | Yes | No | Minimal |
| Maintenance | Low | Medium | Medium |
| Supabase RLS Support | Full | Manual | Partial |
| Token Refresh | Automatic | Manual | Mixed |
| Recommendation | New projects | Current architecture | Best long-term |

---

## Recommended Next Steps

1. **Immediate (Today):**
   - Verify if tokens are being sent from frontend (check DevTools)
   - Confirm Bubble has a token validation endpoint

2. **Short-term (This Week):**
   - Implement Option B if Bubble validation exists
   - OR create Bubble validation workflow if it doesn't exist

3. **Medium-term (Next Sprint):**
   - Consider migrating to Option C (Hybrid)
   - Add rate limiting to auth endpoints
   - Implement token refresh mechanism

4. **Long-term (Future):**
   - Full migration to Supabase Auth
   - Remove Bubble dependency for authentication

---

**Document Version:** 1.0
**Last Updated:** 2025-12-05
**Status:** Ready for Implementation Decision
