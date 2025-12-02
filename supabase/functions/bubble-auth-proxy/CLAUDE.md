# Bubble Auth Proxy - Edge Function

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/

---

## ### FUNCTION_INTENT ###

[PURPOSE]: Authentication proxy handling login, signup, logout, and token validation
[ENDPOINT]: POST /bubble-auth-proxy
[BACKEND]: Proxies to Bubble.io authentication API

---

## ### SUBDIRECTORIES ###

### handlers/
[INTENT]: Request handlers for each auth operation
[FILES]: 4 handlers
[KEY_EXPORTS]: handleLogin, handleSignup, handleLogout, handleValidate

---

## ### FILE_INVENTORY ###

### deno.json
[INTENT]: Deno runtime configuration with Bubble.io API permissions

### index.ts
[INTENT]: Main entry point routing auth requests to handlers
[IMPORTS]: ./handlers/*, _shared/cors
[EXPORTS]: Deno.serve handler

### .npmrc
[INTENT]: NPM registry configuration (if using npm packages)

---

## ### REQUEST_ROUTING ###

```typescript
POST /bubble-auth-proxy
{
  "action": "login" | "signup" | "logout" | "validate",
  "payload": { ... }
}
```

---

## ### AUTH_OPERATIONS ###

### Login
[PAYLOAD]: { email, password }
[RETURNS]: { token, user }

### Signup
[PAYLOAD]: { email, password, firstName, lastName }
[RETURNS]: { token, user }

### Logout
[PAYLOAD]: { token }
[RETURNS]: { success: boolean }

### Validate
[PAYLOAD]: { token }
[RETURNS]: { valid: boolean, user: object | null }

---

## ### REQUIRED_SECRETS ###

[BUBBLE_AUTH_BASE_URL]: https://upgradefromstr.bubbleapps.io/api/1.1
[BUBBLE_API_KEY]: Bubble.io API key

---

## ### SECURITY_NOTES ###

[TOKEN_HANDLING]: Tokens are never stored in Edge Function
[VALIDATION]: All input validated before forwarding to Bubble
[RATE_LIMITING]: Consider implementing rate limiting for auth endpoints

---

## ### DEPLOYMENT ###

```bash
supabase functions deploy bubble-auth-proxy
```

---

**SUBDIRECTORY_COUNT**: 1
**TOTAL_FILES**: 6
