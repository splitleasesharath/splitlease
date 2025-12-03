# Bubble Auth Proxy Handlers

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/bubble-auth-proxy/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Authentication request handlers proxying to Bubble.io auth API
[RUNTIME]: Deno Edge Runtime
[PATTERN]: Each handler processes a specific auth operation

---

## ### FILE_INVENTORY ###

### login.ts
[INTENT]: Process login requests by forwarding credentials to Bubble.io and returning JWT token
[EXPORTS]: handleLogin
[IMPORTS]: _shared/bubbleSync, _shared/validation
[ENDPOINT]: POST /bubble-auth-proxy/login
[BODY]: { email: string, password: string }
[RETURNS]: { token: string, user: object }

### logout.ts
[INTENT]: Process logout requests by invalidating session in Bubble.io and clearing server-side state
[EXPORTS]: handleLogout
[IMPORTS]: _shared/bubbleSync
[ENDPOINT]: POST /bubble-auth-proxy/logout
[BODY]: { token: string }
[RETURNS]: { success: boolean }

### signup.ts
[INTENT]: Process signup requests creating new user in Bubble.io with email verification
[EXPORTS]: handleSignup
[IMPORTS]: _shared/bubbleSync, _shared/validation
[ENDPOINT]: POST /bubble-auth-proxy/signup
[BODY]: { email: string, password: string, firstName: string, lastName: string }
[RETURNS]: { token: string, user: object }

### validate.ts
[INTENT]: Validate JWT tokens with Bubble.io and return current user data if valid
[EXPORTS]: handleValidate
[IMPORTS]: _shared/bubbleSync
[ENDPOINT]: POST /bubble-auth-proxy/validate
[BODY]: { token: string }
[RETURNS]: { valid: boolean, user: object | null }

---

## ### AUTH_FLOW ###

```
Frontend → Edge Function → Bubble.io Auth API
    │           │                  │
    │           │                  ▼
    │           │          Bubble validates
    │           │                  │
    │           ◄──────────────────┘
    │           │
    ◄───────────┘
```

---

## ### REQUIRED_SECRETS ###

[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Configured in Supabase Dashboard

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
