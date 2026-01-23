# Counteroffer 401 Error - Root Cause Analysis

**Created**: 2026-01-22 18:05:00
**Status**: Investigation In Progress
**Severity**: High

## Summary

Host counteroffer submissions are failing with a 401 Unauthorized error. After extensive debugging, we've determined the root cause: **the proposal Edge Function request is not reaching the function at all** - it's being rejected at the Supabase gateway level.

## Evidence

### Frontend Logs Show
- ✅ Session exists: `true`
- ✅ Access token exists: `true`
- ✅ Auth token length: `1095` characters
- ✅ Explicit Authorization header being sent
- ❌ Edge Function returns: `401 Unauthorized`

### Edge Function Logs Show
- ❌ **NO requests to `/functions/v1/proposal` endpoint**
- ✅ Only `auth-user` function calls appear in logs
- ❌ Diagnostic logging in `authenticateFromHeaders()` never executes

### Conclusion
The 401 error is occurring **before the Edge Function code runs**. The Supabase gateway is rejecting the request, likely due to:

1. **Environment/Project Mismatch**: Auth token is for a different Supabase project
2. **JWT Audience Claim Mismatch**: Token `aud` claim doesn't match the Edge Function's project
3. **Expired Token**: Token might be invalid/expired at gateway level
4. **CORS/Preflight Issue**: Request blocked before reaching function

## Fixes Attempted

### ✅ Fix 1: Convert Day/Night Strings to Indices
**Status**: Completed successfully
**Commit**: `09f052b2`

Converted day names ('Monday', 'Friday') and night names ('Monday Night') to 0-based numeric indices (0-6) before sending to Edge Function.

### ✅ Fix 2: Session Validation Before Edge Function Call
**Status**: Completed
**Commit**: `fade369a`

Added session existence check and refresh logic before invoking Edge Function.

### ✅ Fix 3: Explicit Authorization Header
**Status**: Completed
**Commit**: `fdc665ad`

Explicitly pass `Authorization: Bearer <token>` header to bypass automatic header injection.

### ✅ Fix 4: Edge Function Diagnostic Logging
**Status**: Deployed
**Commit**: `343d44ff`

Added detailed logging to `authenticateFromHeaders()` to trace auth flow - **but these logs never execute**, confirming the request doesn't reach the function.

## Next Steps

### Priority 1: Verify Environment Configuration
**Action**: Check which Supabase project the frontend is connecting to
**Rationale**: Auth tokens are project-scoped; mismatch will cause 401 at gateway

### Priority 2: Inspect JWT Token
**Action**: Decode the access token and verify `aud`, `iss`, and `exp` claims
**Rationale**: Gateway validates JWT before routing to Edge Function

### Priority 3: Check Browser Network Tab
**Action**: Inspect the actual HTTP request/response in DevTools
**Rationale**: May reveal CORS errors, preflight failures, or other gateway rejections

### Priority 4: Test with curl
**Action**: Make a direct curl request with the same token
**Rationale**: Isolates whether issue is browser-specific or token-specific

## Related Files

| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js:795-950` | Frontend counteroffer handler with all fixes applied |
| `supabase/functions/proposal/index.ts:79-94` | Edge Function auth check (never reached) |
| `supabase/functions/proposal/index.ts:270-300` | `authenticateFromHeaders()` with diagnostic logs (never executes) |
| `app/src/lib/supabase.js` | Supabase client initialization |

## Timeline

- **15:50** - Initial 400 error reported (day/night conversion issue)
- **15:54** - Deployed fix for day/night conversion → Still failing
- **17:45** - Discovered actual error is 401, not 400
- **18:00** - Added session validation and explicit auth header
- **18:05** - Discovered Edge Function never receives request - gateway-level rejection

## Current Hypothesis

**Most Likely (90%)**: Environment mismatch where:
- User logs into Supabase project A
- Frontend tries to call Edge Function in Supabase project B
- Gateway rejects token because it's not valid for project B

**Alternative (10%)**: CORS or network-level issue preventing request from reaching Edge Function
