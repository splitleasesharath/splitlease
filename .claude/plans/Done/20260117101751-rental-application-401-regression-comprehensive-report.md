# Rental Application 401 Regression - Comprehensive Bug Report

**Date:** 2026-01-17
**Severity:** Critical (Feature completely non-functional)
**Time to Resolution:** ~3 hours across multiple debugging sessions
**Tag:** `fix/rental-application-401-regression`
**Status:** RESOLVED

---

## Executive Summary

The Rental Application feature was completely broken, showing "Failed to load application" errors. This regression involved **multiple interacting failures** across different layers of the stack, making diagnosis particularly challenging. The root cause was a mismatch between Edge Function deployment settings (`verify_jwt: true`) and the application's authentication model, compounded by confusion about multi-environment Supabase configurations.

---

## Symptoms Observed

1. **User-visible error**: "Failed to load application" message on the rental application page
2. **Console error**: `POST https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/rental-application 401 (Unauthorized)`
3. **No server-side logs**: Edge Function logs showed zero invocations despite frontend making requests
4. **Silent failure**: No detailed error messages to indicate the cause

---

## Timeline of the Regression

| Date | Event | Impact |
|------|-------|--------|
| 2026-01-07 | FP refactor applied to rental-application Edge Function | Function redeployed with `verify_jwt: true` (default) |
| 2026-01-16 03:06 | AUTO refactor broke step completion tracking | Secondary bug introduced |
| 2026-01-16 ~16:00 | User reports "Failed to load application" | Investigation begins |
| 2026-01-16 ~17:00 | First fix attempt - redeploy to production | Still failing |
| 2026-01-17 ~09:00 | Discovery of multi-environment issue | Root cause identified |
| 2026-01-17 ~10:00 | Redeploy to BOTH dev and prod | **RESOLVED** |

---

## Root Cause Analysis

### Primary Issue: Edge Function `verify_jwt` Setting

The `rental-application` Edge Function was deployed with `verify_jwt: true`, which is the **Supabase default**. This setting causes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE GATEWAY                            │
│                                                                 │
│  verify_jwt: true  → JWT validated BEFORE function code runs   │
│                    → Invalid/missing JWT = immediate 401        │
│                    → Function code NEVER executes               │
│                                                                 │
│  verify_jwt: false → Requests pass through to function          │
│                    → Function handles its own authentication    │
└─────────────────────────────────────────────────────────────────┘
```

**The function's internal authentication logic was designed to accept either:**
1. Supabase JWT token in Authorization header
2. Legacy Bubble user_id in request payload

But with `verify_jwt: true`, requests without valid JWTs were rejected at the gateway - the function's fallback logic **never had a chance to execute**.

### Secondary Issue: Multi-Environment Configuration Confusion

The codebase has **two separate Supabase projects**:

| Environment | Supabase Project ID | MCP Server | When Used |
|-------------|---------------------|------------|-----------|
| Development | `qzsmhgyojmwvtjmnrdea` | `supabase-dev` | `bun run dev` |
| Production | `qcfifybkaddcoimjroca` | `supabase-live` | Production deploy |

**The debugging confusion:**
1. Initial fix was deployed to `supabase-live` (production project)
2. User was testing with `bun run dev` (development project)
3. Development project still had `verify_jwt: true`
4. Appeared that fix "didn't work" when actually it was deployed to wrong environment

### Tertiary Issue: Misleading Log Absence

When checking Edge Function logs, **no rental-application invocations appeared**. This was misinterpreted as "function not being called" when actually:

- The function WAS being called
- But requests were rejected at the Supabase gateway layer (before function execution)
- Gateway rejections don't generate function-level logs
- Only successful function invocations appear in Edge Function logs

---

## Why This Regression Was Introduced

### The FP Refactoring Initiative (2026-01-07)

Commit `e7f05853` applied a Functional Programming pattern to remaining Edge Functions:

```
commit e7f05853e0f200715d4f66063ee0b6c050c6fcd7
Author: splitleasesharath
Date:   Wed Jan 7 04:18:05 2026

    refactor: apply FP pattern to remaining edge functions

    Refactored the final 5 edge function entry points...
    - rental-application: getUserId supports JWT or payload fallback
```

When this function was redeployed, it used the default `verify_jwt: true` setting. The previous deployment may have had `verify_jwt: false`, or this was a new function where the setting hadn't been considered.

### Why It Wasn't Caught

1. **No automated tests** for Edge Function authentication flows
2. **Manual testing used JWT-authenticated sessions** which worked fine
3. **Legacy Bubble token users** (the failing case) weren't part of QA testing
4. **Default setting is dangerous** - `verify_jwt: true` blocks custom auth

---

## Why It Took So Long to Resolve

### 1. Misleading Error Information

| What We Saw | What We Thought | Reality |
|-------------|-----------------|---------|
| 401 Unauthorized | Invalid credentials | Gateway rejection |
| No function logs | Function not called | Called but blocked at gateway |
| Code looked correct | Must be token issue | Deployment setting issue |

### 2. Multi-Environment Blindspot

The MCP tools `supabase-live` and `supabase-dev` connect to **different** Supabase projects. When we "fixed" the function, we:
1. Used `supabase-live` MCP (production project)
2. Tested with `bun run dev` (development project)
3. Wondered why fix "didn't work"

This required understanding that:
- `.env.development` → `qzsmhgyojmwvtjmnrdea` (dev project)
- `.env.production` → `qcfifybkaddcoimjroca` (prod project)

### 3. Documentation Gap

There was no documentation explaining:
- The two Supabase projects and their purposes
- When to use `supabase-dev` vs `supabase-live` MCP
- The `verify_jwt` deployment setting and its implications
- How to test legacy authentication flows

### 4. Silent Gateway Failures

Supabase's gateway doesn't provide detailed error messages when rejecting requests due to `verify_jwt`. The response is simply:
```json
{"error": "Unauthorized", "status": 401}
```

No indication that:
- This is a gateway rejection (not function code)
- `verify_jwt: true` is enabled
- The function code never executed

---

## The Complete Fix

### 1. Edge Function Redeployment

Both environments needed `verify_jwt: false`:

**Development (qzsmhgyojmwvtjmnrdea):**
```
mcp__supabase-dev__deploy_edge_function(
  name: "rental-application",
  verify_jwt: false,
  ...
)
```
→ Result: Version 19

**Production (qcfifybkaddcoimjroca):**
```
mcp__supabase-live__deploy_edge_function(
  name: "rental-application",
  verify_jwt: false,
  ...
)
```
→ Result: Version 29

### 2. config.toml Update

Added explicit `verify_jwt = false` to prevent future deployments from reverting:

```toml
[functions.rental-application]
verify_jwt = false
```

### 3. Frontend Enhancement

Commit `dfe9184b` added Supabase session token support:

```javascript
// Get Supabase session for proper JWT token
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
  },
  body: JSON.stringify({
    action: 'get',
    payload: { user_id: userId },  // Legacy fallback
  }),
});
```

---

## Related Bugs Fixed in This Session

### Step Completion Tracking Bug

The rental application wizard wasn't properly marking steps as completed for submitted applications. This was a separate issue caused by the AUTO refactor removing component props without updating the component to use context.

See: `20260116180000-photo-upload-regression-root-cause-analysis.md`

---

## Recommendations

### Immediate Actions

1. **Audit all Edge Functions** for `verify_jwt` settings
2. **Add `verify_jwt` to config.toml** for all functions requiring custom auth
3. **Document the two Supabase environments** in CLAUDE.md
4. **Add E2E tests** for legacy authentication flows

### Process Improvements

| Area | Recommendation |
|------|----------------|
| Deployment | Always specify `verify_jwt` explicitly in config.toml |
| Testing | Include legacy Bubble token user testing in QA |
| Documentation | Document which MCP server to use for which environment |
| Monitoring | Add alerts for gateway-level rejections (not just function errors) |
| Debugging | Check `verify_jwt` setting first when seeing 401s with no function logs |

### Suggested config.toml Template

```toml
# Functions that handle their own authentication (legacy support)
[functions.rental-application]
verify_jwt = false

[functions.messages]
verify_jwt = false

[functions.proposal]
verify_jwt = false

# Functions that require valid Supabase JWT
[functions.user-settings]
verify_jwt = true
```

---

## Files Modified

| File | Change |
|------|--------|
| [useRentalApplicationWizardLogic.js](../../../app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js) | Added Supabase session token support |
| [config.toml](../../../supabase/config.toml) | Added verify_jwt settings |
| [20260116180339-rental-application-401-fix.md](./20260116180339-rental-application-401-fix.md) | Initial fix documentation |

## Commits in This Fix

| Commit | Description |
|--------|-------------|
| `dfe9184b` | Frontend fix for Supabase session token |
| `3813847d` | Edge Function redeployment documentation |
| `283b1961` | config.toml verify_jwt settings |
| `8d764752` | Root cause analysis documentation |
| `9c0dcd1a` | Debug logging cleanup |

## Edge Function Deployments

| Environment | Project ID | Version | verify_jwt |
|-------------|------------|---------|------------|
| Development | `qzsmhgyojmwvtjmnrdea` | 19 | false |
| Production | `qcfifybkaddcoimjroca` | 29 | false |

---

## Lessons Learned

1. **`verify_jwt: true` is a silent killer** - Gateway rejects requests before function code runs, no function logs appear, making debugging extremely difficult.

2. **Know your environments** - Development and production use different Supabase projects. Fixing one doesn't fix the other.

3. **Default settings are dangerous** - Supabase defaults to `verify_jwt: true`, which breaks custom authentication flows.

4. **Log absence is information** - No function logs + 401 response = gateway rejection, not function error.

5. **Document deployment settings** - `verify_jwt` setting must be tracked in config.toml to survive redeployments.

---

**Git Tag:** `fix/rental-application-401-regression`
