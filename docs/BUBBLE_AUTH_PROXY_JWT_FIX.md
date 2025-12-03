# Critical Fix: bubble-auth-proxy JWT Verification Setting

**STATUS**: REQUIRES MANUAL SUPABASE DASHBOARD FIX
**SEVERITY**: CRITICAL
**ISSUE**: Mismatch between local config and deployed configuration
**DATE_IDENTIFIED**: 2025-12-03

---

## The Problem

The `bubble-auth-proxy` Edge Function has JWT verification **ENABLED** on the deployed Supabase project, but it should be **DISABLED**.

### Why This Is Critical

The `bubble-auth-proxy` function handles authentication endpoints:
- **login**: Users don't have a JWT token yet (they're logging in)
- **signup**: New users don't have a JWT token yet (they're signing up)
- **logout**: Should work even if token is expired
- **validate**: Used to check if a session is still valid

**You CANNOT require JWT authentication for these endpoints.** It's logically impossible - users can't provide a JWT token when they're in the process of obtaining one.

---

## Current State

### Local Configuration (Correct)
File: `supabase/config.toml` (lines 370-379)
```toml
[functions.bubble-auth-proxy]
enabled = true
verify_jwt = false  ← CORRECT
import_map = "./functions/bubble-auth-proxy/deno.json"
entrypoint = "./functions/bubble-auth-proxy/index.ts"
```

### Deployed Configuration (INCORRECT)
Supabase Project Dashboard shows:
```
bubble-auth-proxy (version 27)
status: ACTIVE
verify_jwt: true  ← WRONG - should be false
```

---

## Code Quality

The deployed code (version 27) is correct and properly handles authentication. The issue is purely a configuration setting in Supabase.

Proof from index.ts comment block:
```typescript
/**
 * Bubble Auth Proxy - Authentication Router
 *
 * NO USER AUTHENTICATION REQUIRED - These ARE the auth endpoints
 *
 * Security:
 * - NO user authentication on these endpoints (you can't require auth to log in!)
 * - API key stored server-side in Supabase Secrets
 * - Validates request format only
 */
```

---

## How to Fix This

Unfortunately, the Supabase MCP `deploy_edge_function` tool only deploys code - it doesn't configure the `verify_jwt` setting. This requires manual action in the Supabase Dashboard.

### Option 1: Supabase Dashboard (Fastest)

1. Go to https://supabase.com/dashboard
2. Select your Split Lease project
3. Navigate to **Edge Functions** (left sidebar)
4. Click on **bubble-auth-proxy**
5. Look for the **Verify JWT** toggle
6. **UNCHECK** it (or switch it to OFF/false)
7. Save changes

### Option 2: Supabase CLI (If available)

```bash
# In the project root directory
supabase functions deploy bubble-auth-proxy --verify-jwt=false
```

### Option 3: Verify with Supabase CLI

After fixing via Dashboard, verify locally:
```bash
# Check function status
supabase functions list

# Should show:
# bubble-auth-proxy  |  ACTIVE  |  false  |  ec5e2390...
#                                   ^
#                            verify_jwt = false
```

---

## Impact

### Current State (verify_jwt = true)
- Login requests are BLOCKED
- Signup requests are BLOCKED
- Logout requests may be BLOCKED
- Validate requests may be BLOCKED (if no valid token)

### After Fix (verify_jwt = false)
- All authentication endpoints work normally
- Users can authenticate without pre-existing JWT
- Proper error handling for missing/invalid tokens still works
- Request validation continues to function

---

## References

### Files Involved
- Local config: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\config.toml`
- Function code: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\index.ts`
- Documentation: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\CLAUDE.md`

### Supabase Documentation
- [Edge Functions Authentication](https://supabase.com/docs/guides/functions/auth)
- [Verify JWT Setting](https://supabase.com/docs/guides/functions)

---

## Verification Checklist

After making the change:

- [ ] Verify JWT toggle is OFF in Supabase Dashboard
- [ ] Test login endpoint: `POST /bubble-auth-proxy` with action "login"
- [ ] Test signup endpoint: `POST /bubble-auth-proxy` with action "signup"
- [ ] Test logout endpoint: `POST /bubble-auth-proxy` with action "logout"
- [ ] Test validate endpoint: `POST /bubble-auth-proxy` with action "validate"
- [ ] Check function logs for any errors
- [ ] Verify no 401/403 errors from JWT validation

---

## Summary

This is a one-setting fix in the Supabase Dashboard. The code is correct, the documentation is correct, but the deployment configuration doesn't match the local configuration. Once the `verify_jwt` setting is toggled OFF for bubble-auth-proxy, all authentication flows will work properly.

**Action Required**: Manual toggle in Supabase Dashboard - Edge Functions - bubble-auth-proxy - Verify JWT: OFF

