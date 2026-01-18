# Messages Page 401 Authentication Failure - Root Cause Analysis

**Date**: 2026-01-17
**Duration to Resolve**: ~45 minutes across 2 sessions
**Severity**: Critical (messaging feature completely broken)
**Status**: RESOLVED

---

## Executive Summary

The Messages page was returning **401 Unauthorized** errors, preventing users from viewing their conversation threads. The fix required addressing **two separate but related issues**:

1. **Infrastructure-level**: Missing `verify_jwt = false` configuration in `config.toml`
2. **Code-level**: Incorrect JWT validation pattern in the Edge Function

The debugging was complicated by **misleading symptoms** that pointed to the wrong layer of the stack, and by **inconsistent patterns** across Edge Functions in the codebase.

---

## Timeline of Investigation

### Phase 1: Initial Symptom (ERR_CONNECTION_REFUSED)
- **Symptom**: `192.168.1.31 refused to connect`
- **Actual Cause**: Dev server wasn't running
- **Resolution**: `bun run dev`
- **Time**: ~2 minutes

### Phase 2: 401 Unauthorized Error
- **Symptom**: `Failed to fetch threads: 401` with error `"Invalid JWT"`
- **Initial Hypothesis**: Edge Function code bug in authentication logic
- **Investigation**: Read frontend code, Edge Function code, checked auth flow
- **Time**: ~15 minutes

### Phase 3: Deployment Version Mismatch (Red Herring)
- **Observation**: Edge Function logs showed `messages` at version 22, while `auth-user` was at version 23
- **Hypothesis**: Outdated deployment missing recent auth fixes
- **Action**: User manually deployed messages function
- **Result**: Still failing (now version 23, still 401)
- **Time**: ~10 minutes

### Phase 4: Code Pattern Analysis
- **Discovery**: `messages` function used different auth pattern than `proposal`
- **Action**: Changed from `getUser(token)` to embedded Authorization header pattern
- **Result**: Still failing after deployment
- **Time**: ~10 minutes

### Phase 5: Infrastructure Configuration Discovery
- **Key Insight**: Error message `"Missing authorization header"` (not `"Invalid JWT"`)
- **Discovery**: `messages` function missing from `config.toml`
- **Root Cause**: `verify_jwt = true` (default) rejects requests at Supabase infrastructure level
- **Resolution**: Added config + deployed with `--no-verify-jwt`
- **Time**: ~8 minutes

---

## Root Causes (Multi-Layer)

### Root Cause #1: Missing config.toml Entry

**The Primary Issue**

```toml
# config.toml - BEFORE (missing)
[functions.proposal]
enabled = true
verify_jwt = false
# ... other functions

# [functions.messages] WAS MISSING!
```

**Why This Matters**:
- Supabase Edge Functions have a `verify_jwt` setting that defaults to `true`
- When `verify_jwt = true`, Supabase's **infrastructure layer** validates JWT tokens BEFORE the function code executes
- Without a valid JWT, the request is rejected with `{"code":401,"message":"Missing authorization header"}`
- Our custom authentication logic (which supports legacy `user_id` auth) never gets a chance to run

**The Fix**:
```toml
[functions.messages]
enabled = true
verify_jwt = false
import_map = "./functions/messages/deno.json"
entrypoint = "./functions/messages/index.ts"
```

### Root Cause #2: Inconsistent Auth Patterns

**The Secondary Issue**

The `messages` function used a different authentication pattern than other working functions:

```typescript
// messages/index.ts - BROKEN PATTERN
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
const { data: { user } } = await supabase.auth.getUser(token); // Token as parameter
```

```typescript
// proposal/index.ts - WORKING PATTERN
const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } }, // Header embedded in client
});
const { data: { user } } = await authClient.auth.getUser(); // No parameter
```

**Why This Difference Exists**:
- The `messages` function was likely written at a different time or by a different approach
- Both patterns *should* work, but the embedded header pattern is more robust
- The Supabase JS client expects the Authorization header to flow through the client config

---

## Why Debugging Took So Long

### 1. Misleading Error Messages

| What We Saw | What It Suggested | Reality |
|-------------|-------------------|---------|
| `"Invalid JWT"` (early) | Token validation failed in code | Infrastructure rejection |
| `"Missing authorization header"` (later) | Header not being sent | Header sent, but rejected by `verify_jwt` |

The error messages didn't clearly indicate that rejection was happening at the **infrastructure level** before our code executed.

### 2. Red Herring: Version Mismatch

We initially focused on the Edge Function version being outdated (v22 vs v23). This led to:
- Manual deployment
- Waiting for deployment to complete
- Re-testing (still failed)

This was a **valid hypothesis** but turned out to be unrelated to the core issue.

### 3. Inconsistent Codebase Patterns

The codebase has two different authentication patterns:

| Pattern | Used By | Works? |
|---------|---------|--------|
| `getUser(token)` | messages (before fix) | Sometimes* |
| `{ global: { headers: { Authorization } } }` + `getUser()` | proposal, rental-application | Yes |

*The `getUser(token)` pattern may work in some contexts but is less reliable.

### 4. Hidden Infrastructure Layer

The `config.toml` → Supabase infrastructure → Edge Function flow is not obvious:

```
Request → Supabase Infrastructure → [verify_jwt check] → Edge Function Code
                                           ↑
                                    REJECTION HAPPENS HERE
                                    (before our code runs)
```

When `verify_jwt = true`, requests without valid JWT are rejected **before** the Edge Function code executes. Console logs in the function never appear because the code never runs.

### 5. Legacy Auth Requirement

Split Lease supports two authentication methods:
1. **Modern**: Supabase JWT tokens (Authorization header)
2. **Legacy**: `user_id` in request payload (for pre-migration users)

Legacy users don't have JWT tokens, so they rely on `user_id` in the payload. With `verify_jwt = true`, these requests are rejected at the infrastructure level.

---

## Functions Affected

The investigation revealed **7 functions** were missing from `config.toml`:

| Function | Purpose | Now Fixed |
|----------|---------|-----------|
| `messages` | Messaging threads & messages | Yes |
| `rental-application` | Guest rental applications | Yes |
| `date-change-request` | Proposal date changes | Yes |
| `guest-payment-records` | Guest payment history | Yes |
| `host-payment-records` | Host payment history | Yes |
| `house-manual` | Property house manuals | Yes |
| `cohost-request-slack-callback` | Slack integration | Yes |

---

## Files Changed

### 1. supabase/functions/messages/index.ts
**Commit**: `1b9101cc`

Changed authentication from:
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
const { data: { user } } = await supabase.auth.getUser(token);
```

To:
```typescript
const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await authClient.auth.getUser();
```

### 2. supabase/config.toml
**Commit**: `283b1961`

Added 7 missing function configurations with `verify_jwt = false`.

---

## Lessons Learned

### 1. Check config.toml First
When an Edge Function returns 401, **first verify** it has an entry in `config.toml` with `verify_jwt = false` (if custom auth is needed).

### 2. Error Message Location Matters
- `"Missing authorization header"` from Supabase → Infrastructure rejection
- `"Invalid JWT"` or custom errors → Code-level rejection

### 3. Standardize Auth Patterns
All Edge Functions should use the same authentication pattern:
```typescript
const authClient = createClient(url, anonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await authClient.auth.getUser();
```

### 4. Deployment Flags Matter
When manually deploying, use `--no-verify-jwt` for functions that support legacy auth:
```bash
supabase functions deploy messages --project-ref <ref> --no-verify-jwt
```

### 5. Audit New Functions
When creating new Edge Functions, always:
1. Add entry to `config.toml`
2. Set `verify_jwt = false` if custom auth is needed
3. Use the standard auth pattern

---

## Prevention Checklist

For future Edge Function development:

- [ ] Function added to `config.toml`
- [ ] `verify_jwt` set appropriately (false for custom auth)
- [ ] Uses standard embedded Authorization header pattern
- [ ] Supports both JWT and legacy `user_id` auth (if applicable)
- [ ] Deployed with correct flags (`--no-verify-jwt` if needed)
- [ ] Tested with both auth methods

---

## Related Files

| File | Purpose |
|------|---------|
| [supabase/config.toml](../../../supabase/config.toml) | Function configuration |
| [supabase/functions/messages/index.ts](../../../supabase/functions/messages/index.ts) | Messages Edge Function |
| [supabase/functions/proposal/index.ts](../../../supabase/functions/proposal/index.ts) | Reference for correct auth pattern |
| [supabase/functions/_shared/fp/orchestration.ts](../../../supabase/functions/_shared/fp/orchestration.ts) | Shared auth utilities |

---

## Conclusion

The messages page 401 error was caused by a **missing infrastructure configuration** combined with an **inconsistent code pattern**. The debugging was prolonged by misleading error messages and the non-obvious two-layer authentication system (Supabase infrastructure + custom code).

The fix required both:
1. Adding `[functions.messages]` to `config.toml` with `verify_jwt = false`
2. Deploying with `--no-verify-jwt` flag
3. (Bonus) Aligning the auth code pattern with other working functions

This investigation also revealed 6 other functions with the same missing configuration, which were proactively fixed to prevent similar issues.
