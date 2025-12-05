# Split Lease Authentication - Quick Reference

**Document:** Quick lookup guide for Edge Functions authentication
**Status:** Ready for implementation

---

## Authentication Overview

| Function | Purpose | Public Access | Auth Method | Status |
|----------|---------|---------------|------------|--------|
| `bubble-auth-proxy` | Login/Signup/Token validation | YES (login/signup) | N/A (is auth) | ✅ Working |
| `bubble-proxy` | General API calls | PARTIAL (whitelist) | JWT optional | ✅ Working |
| `ai-gateway` | AI prompts | PARTIAL (whitelist) | JWT optional | ✅ Working |

---

## PUBLIC_ACTIONS Whitelist (bubble-proxy)

**No Authentication Required:**
```
✅ create_listing       - Draft listing creation
✅ get_listing         - View listing (read-only)
✅ send_message        - Contact host
✅ signup_ai           - AI signup flow
✅ upload_photos       - Pre-signup photo upload
✅ toggle_favorite     - Add/remove favorite
✅ get_favorites       - Fetch favorites list
```

**Authentication Required:**
```
🔒 submit_listing      - Full listing submission (HOST)
🔒 submit_referral     - Referral submission
```

---

## PUBLIC_PROMPTS Whitelist (ai-gateway)

**No Authentication Required:**
```
✅ listing-description - Generate listing descriptions
✅ echo-test          - Debug/test prompt
```

**Authentication Required:**
```
🔒 [future prompts]    - Premium features (TBD)
```

---

## Frontend Function Calls

### 1. Public Action (No Auth)

```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'create_listing',
    payload: { listing_name: 'My Place' }
  }
});
```

### 2. Private Action (Requires Auth)

```javascript
import { getAuthToken } from './lib/auth.js';

const token = await getAuthToken();
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: {
    action: 'submit_listing',
    payload: { /* data */ }
  }
});
```

### 3. Login

```javascript
import { loginUser } from './lib/auth.js';

const result = await loginUser(email, password);
if (result.success) {
  // Token automatically encrypted and stored
  window.location.reload();
}
```

### 4. AI Prompt (Public)

```javascript
import { callAiGateway } from './lib/aiService.js';

const result = await callAiGateway('listing-description', {
  listing: { /* data */ }
});
```

---

## Token Storage Flow

```
Login Request
    ↓
Bubble API (wf/login-user)
    ↓
Returns: {token, user_id, expires}
    ↓
Edge Function
    ↓
Frontend receives token
    ↓
✅ Encrypt with AES-GCM
✅ Store in sessionStorage (__sl_at__)
✅ Store state in localStorage (sl_auth_state)
    ↓
Ready for API calls
```

---

## Token Retrieval Flow

```
App needs to call authenticated endpoint
    ↓
Call getAuthToken()
    ↓
Decrypt from sessionStorage
    ↓
Add Authorization header: Bearer {token}
    ↓
Invoke Edge Function
    ↓
Edge Function validates:
  - Authorization header present
  - Token passed to Supabase.auth.getUser()
  - If valid: continue
  - If invalid: throw 401
    ↓
Handler executes
```

---

## Authentication Decision Tree

```
Request to Edge Function
    ↓
Which function?
    ├─ bubble-auth-proxy? → Skip auth check (IS auth)
    ├─ bubble-proxy?      → Check PUBLIC_ACTIONS
    │   ├─ In whitelist? → Skip auth (public action)
    │   └─ Not in list?  → Require Authorization header
    └─ ai-gateway?       → Check PUBLIC_PROMPTS
        ├─ In whitelist? → Skip auth (public prompt)
        └─ Not in list?  → Require Authorization header

If auth required:
    ├─ No Authorization header? → 400 ValidationError
    ├─ Invalid header format? → 400 ValidationError
    ├─ Invalid token? → 401 AuthenticationError
    └─ Valid token? → Continue to handler

If auth optional/skipped:
    └─ user = {id: 'guest', email: null}
```

---

## Error Handling

### By Status Code

| Code | Error Type | Cause | Response |
|------|-----------|-------|----------|
| 400 | ValidationError | Missing field, invalid input | `{success: false, error: "..."}` |
| 401 | AuthenticationError | Invalid/missing auth header | `{success: false, error: "..."}` |
| 405 | Method Not Allowed | Used GET instead of POST | Plain text error |
| 500 | Server Error | Bubble API down, Supabase error | `{success: false, error: "..."}` |

### By Error Class

```typescript
// In Edge Function handlers
throw new ValidationError('Invalid email format');     // → 400
throw new AuthenticationError('Unauthorized');         // → 401
throw new BubbleApiError('Workflow failed', 500);     // → 500
throw new SupabaseSyncError('Sync failed');           // → 500
throw new OpenAIError('API call failed', 500);        // → 500
```

---

## Secrets Required (Supabase Dashboard)

```
BUBBLE_API_BASE_URL           = https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY                = [from setup guide]
BUBBLE_AUTH_BASE_URL          = https://upgradefromstr.bubbleapps.io/api/1.1
SUPABASE_URL                  = https://[project].supabase.co
SUPABASE_ANON_KEY             = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ...
OPENAI_API_KEY                = sk-...
```

---

## Frontend Environment (app/.env)

```
VITE_SUPABASE_URL             = https://[project].supabase.co
VITE_SUPABASE_ANON_KEY        = eyJ...
VITE_GOOGLE_MAPS_API_KEY      = [google api key]
```

---

## Common Patterns

### Pattern 1: Public Data Fetch

```javascript
// No auth required - guest can call
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'get_listing',
    payload: { listing_id: '123' }
  }
});
```

### Pattern 2: Authenticated Data Modification

```javascript
// Auth required - only logged-in users
const token = await getAuthToken();
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: {
    action: 'submit_listing',
    payload: { listing_id: '123', /* form data */ }
  }
});
```

### Pattern 3: Optional Auth (Different Behavior)

```javascript
// Same endpoint, different behavior based on auth
const authHeader = await getAuthState()
  ? { 'Authorization': `Bearer ${await getAuthToken()}` }
  : {};

const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  headers: authHeader,
  body: {
    action: 'toggle_favorite',
    payload: { listing_id: '123' }
  }
});
// Guest: uses localStorage favorites
// Auth'd: uses Bubble user favorites
```

---

## Troubleshooting

### Issue: "Unauthorized" on authenticated endpoint

**Causes:**
1. Token not in Authorization header
2. Token format wrong (should be `Bearer {token}`)
3. Token expired (Bubble rejected it)
4. Token corrupted during encryption/decryption

**Check:**
```javascript
// Frontend debug
const token = await getAuthToken();
console.log('Token exists:', !!token);
console.log('Token format:', token ? `${token.substring(0, 20)}...` : 'none');
```

### Issue: "Missing Authorization" on public action

**Causes:**
1. Action not in PUBLIC_ACTIONS whitelist
2. Invocation missing action name in payload

**Check:**
```javascript
// Verify action is public
const PUBLIC_ACTIONS = [
  'create_listing', 'get_listing', 'send_message',
  'signup_ai', 'upload_photos', 'toggle_favorite', 'get_favorites'
];
console.log('Is public?', PUBLIC_ACTIONS.includes(action));
```

### Issue: Token expires on page refresh

**Expected Behavior:**
- sessionStorage clears on page refresh
- User must re-login
- This is by design (session scoped)

**Future Solution:**
- Implement HttpOnly cookies
- Or add token refresh mechanism

---

## Files to Know

### Edge Functions

| File | Purpose |
|------|---------|
| `supabase/functions/bubble-auth-proxy/index.ts` | Auth router |
| `supabase/functions/bubble-proxy/index.ts` | API router (PUBLIC_ACTIONS defined here) |
| `supabase/functions/ai-gateway/index.ts` | AI router (PUBLIC_PROMPTS defined here) |
| `supabase/functions/_shared/cors.ts` | CORS headers |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Input validation |

### Frontend

| File | Purpose |
|------|---------|
| `app/src/lib/auth.js` | Login, signup, logout, token management |
| `app/src/lib/secureStorage.js` | Encrypted token encryption/decryption |
| `app/src/lib/supabase.js` | Supabase client initialization |
| `app/src/lib/bubbleAPI.js` | Bubble API wrapper functions |
| `app/src/lib/aiService.js` | AI gateway wrapper functions |

---

## Adding New Public Actions

1. **Add to PUBLIC_ACTIONS array** in `bubble-proxy/index.ts`:
   ```typescript
   const PUBLIC_ACTIONS = [
     'create_listing',
     'get_listing',
     'send_message',
     'signup_ai',
     'upload_photos',
     'toggle_favorite',
     'get_favorites',
     'my_new_public_action' // ← Add here
   ];
   ```

2. **Create handler** in `bubble-proxy/handlers/myNewPublicAction.ts`:
   ```typescript
   export async function handleMyNewPublicAction(
     syncService: BubbleSyncService,
     payload: Record<string, any>,
     user: User
   ): Promise<any> {
     // Implementation
   }
   ```

3. **Import and route** in `bubble-proxy/index.ts`:
   ```typescript
   import { handleMyNewPublicAction } from './handlers/myNewPublicAction.ts';

   // In switch statement:
   case 'my_new_public_action':
     result = await handleMyNewPublicAction(syncService, payload, user);
     break;
   ```

4. **Test with frontend:**
   ```javascript
   const { data, error } = await supabase.functions.invoke('bubble-proxy', {
     body: {
       action: 'my_new_public_action',
       payload: { /* required fields */ }
     }
   });
   ```

---

## Adding New Private Actions

Same as above, but **DON'T add to PUBLIC_ACTIONS array**.

Edge Function will automatically require Authorization header.

---

## Adding New Public Prompts

1. **Add to PUBLIC_PROMPTS array** in `ai-gateway/index.ts`:
   ```typescript
   const PUBLIC_PROMPTS = [
     'listing-description',
     'echo-test',
     'my_new_public_prompt' // ← Add here
   ];
   ```

2. **Create prompt** in `ai-gateway/prompts/myNewPublicPrompt.ts`:
   ```typescript
   export const myNewPublicPrompt = {
     name: 'my_new_public_prompt',
     description: 'My new public prompt',
     template: 'Your template here with {{variables}}'
   };
   ```

3. **Register in registry** in `ai-gateway/prompts/_registry.ts`:
   ```typescript
   import { myNewPublicPrompt } from './myNewPublicPrompt.ts';

   registerPrompt(myNewPublicPrompt);
   ```

4. **Test with frontend:**
   ```javascript
   const result = await callAiGateway('my_new_public_prompt', {
     variables: 'values'
   });
   ```

---

**Last Updated:** 2025-12-05
**Version:** 1.0
