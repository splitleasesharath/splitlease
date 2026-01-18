# Rental Application 401 Unauthorized Fix

**Date:** 2026-01-16
**Severity:** High (Feature completely non-functional)
**Time to Diagnose:** ~20 minutes
**Time to Fix:** ~5 minutes (redeployment)
**Status:** RESOLVED

---

## Executive Summary

The Rental Application page was returning "Failed to load application" due to a 401 Unauthorized error from the `rental-application` Edge Function. The root cause was a **deployment configuration mismatch** - the function was deployed with `verify_jwt: true` while the code was designed to handle its own authentication for legacy users.

---

## Root Cause Analysis

### The Problem

The `rental-application` Edge Function was deployed with `verify_jwt: true`, which means **Supabase's gateway validates JWT tokens before the function code even runs**.

When a user (especially a legacy Bubble user) made a request:
1. The request arrived at Supabase's gateway
2. Gateway checked for valid JWT in Authorization header
3. If no valid JWT → immediate 401 response (function code never executes)

### Why The Code Logic Never Ran

The function had proper fallback authentication logic:

```typescript
// Line 55: All actions marked as PUBLIC
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["submit", "get", "upload"]);

// Lines 82-86: Try payload user_id first for public actions
if (!requireAuth) {
  const payloadUserId = payload.user_id as string | undefined;
  if (payloadUserId) {
    return ok(payloadUserId);
  }
}
```

But this code **never executed** because `verify_jwt: true` at the gateway rejected the request first.

### The Fix

Redeployed the function with `verify_jwt: false`:

| Before | After |
|--------|-------|
| `verify_jwt: true` | `verify_jwt: false` |
| Gateway rejects requests without valid JWT | Function handles its own authentication |
| Legacy users blocked | Legacy users can use `user_id` in payload |

---

## Technical Details

### Supabase Edge Function Authentication Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE GATEWAY                            │
│  (verify_jwt setting controls this layer)                       │
│                                                                 │
│  verify_jwt: true  → JWT validated BEFORE function runs         │
│  verify_jwt: false → Requests pass through to function          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCTION CODE                                │
│  (getUserId function handles custom auth logic)                 │
│                                                                 │
│  1. Try payload.user_id (for public actions)                    │
│  2. Try JWT from Authorization header                           │
│  3. Fall back to payload.user_id if JWT fails                   │
└─────────────────────────────────────────────────────────────────┘
```

### Functions That Should Have `verify_jwt: false`

Functions that need to support legacy Bubble users (user_id in payload) must have `verify_jwt: false`:

| Function | verify_jwt | Reason |
|----------|------------|--------|
| `rental-application` | **false** | Supports legacy auth via payload |
| `messages` | true (but needs fix?) | Has internal legacy auth support |
| `proposal` | false | Supports legacy auth |
| `listing` | false | Supports legacy auth |
| `auth-user` | false | Handles login/signup (no JWT yet) |

---

## Verification

After redeployment, the rental application page should:
1. Load successfully for Supabase Auth users (JWT in header)
2. Load successfully for legacy Bubble users (user_id in payload)
3. Not return 401 errors

---

## Lessons Learned

1. **Gateway vs Function Auth**: Always understand where authentication is enforced
2. **Deployment Settings Matter**: Code logic is useless if gateway rejects requests first
3. **Legacy Support Requires `verify_jwt: false`**: If function handles its own auth, disable gateway auth
4. **Compare Similar Functions**: When debugging, check how similar working functions are configured

---

## Files Referenced

- [useRentalApplicationWizardLogic.js](../../../app/src/islands/shared/RentalApplicationWizardModal/useRentalApplicationWizardLogic.js) - Frontend that makes the request
- [rental-application/index.ts](../../../supabase/functions/rental-application/index.ts) - Edge Function with auth logic
- [Photo Upload Regression Analysis](./20260116180000-photo-upload-regression-root-cause-analysis.md) - Similar pattern observed

---

## Related Issues

This issue follows a similar pattern to the photo upload regression documented in `20260116180000-photo-upload-regression-root-cause-analysis.md`, where deployment configuration (in that case, missing Storage bucket policies) prevented properly-coded functionality from working.
