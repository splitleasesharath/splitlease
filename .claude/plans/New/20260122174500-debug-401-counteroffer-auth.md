# Debug Analysis: 401 Unauthorized Error on Host Counteroffer Submission

**Created**: 2026-01-22T17:45:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Host Proposals Page / Proposal Edge Function

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions (Deno), PostgreSQL
- **Data Flow**: Frontend (React) -> supabase.functions.invoke() -> Edge Function -> Supabase Database

### 1.2 Domain Context
- **Feature Purpose**: Host counteroffers allow hosts to modify proposal terms (dates, duration, days) before accepting
- **Related Documentation**:
  - `supabase/CLAUDE.md` - Edge Functions reference
  - `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md`
- **Data Model**: `proposal` table with `Host User` column (stores user._id, Bubble-style ID)

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-6 (0=Sunday), correctly converted via `dayNameToIndex()` and `nightNamesToIndices()`
- **Authentication**: Supabase Auth with JWT tokens, session stored in localStorage
- **ID Format**: Two ID systems coexist:
  - `user.id` - Supabase Auth UUID (from auth.users)
  - `user._id` - Application user ID (Bubble-style, from public.user table)

### 1.4 Entry Points and Dependencies
- **User Entry Point**: Host Proposals Page -> Click "Modify" -> Submit counteroffer
- **Critical Path**:
  1. `useHostProposalsPageLogic.js` -> `handleCounteroffer()`
  2. `supabase.functions.invoke('proposal', { body: { action: 'update', payload } })`
  3. Edge Function `proposal/index.ts` -> `authenticateFromHeaders()`
  4. `proposal/actions/update.ts` -> `handleUpdate()`
- **Dependencies**:
  - `app/src/lib/supabase.js` - Supabase client
  - `supabase/functions/proposal/index.ts` - Edge Function entry
  - `supabase/functions/proposal/actions/update.ts` - Update handler

## 2. Problem Statement

When a host submits a counteroffer from the Host Proposals page, the request fails with a 401 Unauthorized error. The error occurs at the Edge Function level, indicating the authentication token is either missing or invalid.

**Symptoms**:
- HTTP Status: 401 Unauthorized
- Error Message: "Edge Function returned a non-2xx status code"
- User is authenticated (page loaded successfully, auth checks passed)
- Payload conversion is working correctly (day names -> indices)

## 3. Reproduction Context

- **Environment**: Production (qzsmhgyojmwvtjmnrdea.supabase.co)
- **Steps to reproduce**:
  1. Log in as a Host
  2. Navigate to Host Proposals page
  3. Select a listing with proposals
  4. Click "Modify" on a proposal
  5. Make changes and submit counteroffer
- **Expected behavior**: Counteroffer updates proposal with hc_* fields
- **Actual behavior**: 401 error returned from Edge Function
- **Error messages**: "Edge Function returned a non-2xx status code"

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Contains `handleCounteroffer()` that makes the Edge Function call |
| `supabase/functions/proposal/index.ts` | Edge Function entry, contains `authenticateFromHeaders()` |
| `supabase/functions/proposal/actions/update.ts` | Update handler with authorization checks |
| `app/src/lib/supabase.js` | Supabase client initialization |
| `app/src/lib/auth.js` | Authentication utilities and session management |

### 4.2 Execution Flow Trace

```
1. Host clicks "Submit Counteroffer"
   ↓
2. handleCounteroffer() in useHostProposalsPageLogic.js (line 795)
   - Builds payload with hc_* fields
   - Converts day names to indices (working correctly)
   ↓
3. supabase.functions.invoke('proposal', { body: {...} })
   - CRITICAL: Supabase client should automatically include Authorization header
   - Header format: "Bearer <JWT_TOKEN>"
   ↓
4. Edge Function proposal/index.ts (line 79-94)
   - authenticateFromHeaders() called
   - Extracts Authorization header
   - Creates auth client with header
   - Calls auth.getUser()
   ↓
5. authenticateFromHeaders() returns null
   - 401 response returned with "Authentication required"
   ↓
6. FAILURE: 401 Unauthorized
```

### 4.3 Git History Analysis

Recent commits in this area:
- `3abf9959` - fix(ViewSplitLeasePage): decouple custom schedule input
- No recent changes to proposal Edge Function authentication logic

## 5. Hypotheses

### Hypothesis 1: Supabase Session Not Active at Request Time (Likelihood: 70%)

**Theory**: The Supabase client's session may have expired or not been refreshed before the `functions.invoke()` call. The client would then send a request without the Authorization header or with an expired token.

**Supporting Evidence**:
- User is authenticated (page loaded successfully) but session might have expired during interaction
- Other Edge Function calls from the same file (e.g., `handleAcceptProposal`, `handleRejectFromEditing`) use the same pattern and may also fail
- The `checkAuthStatus()` function waits 200ms for session initialization on page load, suggesting timing issues are known

**Contradicting Evidence**:
- User reports "logs show successful auth validation" at the time of the call
- If session was completely expired, page would redirect to home

**Verification Steps**:
1. Add logging before the Edge Function call to verify session exists: `const { data: { session } } = await supabase.auth.getSession(); console.log('Session before call:', !!session);`
2. Check if `access_token` exists in the session
3. Test with a fresh login and immediate counteroffer attempt

**Potential Fix**:
- Refresh session before making the Edge Function call
- Wrap in try-catch with session refresh on 401 retry

**Convention Check**: Follows pattern of checking session, but may need explicit refresh

---

### Hypothesis 2: Authorization Header Not Passed by Supabase Client (Likelihood: 20%)

**Theory**: The `supabase.functions.invoke()` method might not be automatically including the Authorization header due to a configuration issue or client version bug.

**Supporting Evidence**:
- The Supabase client is initialized simply in `app/src/lib/supabase.js` without explicit auth configuration
- Some edge cases exist where the header isn't passed (per web search: double-space bug)

**Contradicting Evidence**:
- This is standard Supabase client behavior that should "just work"
- Other authenticated Edge Function calls in the codebase would also fail

**Verification Steps**:
1. Log the request headers in the Edge Function to see what's actually received
2. Use browser DevTools Network tab to inspect the actual request headers
3. Manually test with curl including the Authorization header

**Potential Fix**:
- Explicitly pass Authorization header in the options parameter
- Verify Supabase JS library version is up to date

**Convention Check**: N/A - library behavior

---

### Hypothesis 3: Token Validation Fails on Edge Function Side (Likelihood: 10%)

**Theory**: The token is being sent but `auth.getUser()` fails to validate it due to token format, clock skew, or JWT verification issue.

**Supporting Evidence**:
- Edge Function creates a new client with the passed header rather than using the service role client
- Token might be malformed or contain issues not caught by frontend

**Contradicting Evidence**:
- If token format was wrong, it would likely fail consistently everywhere
- `auth.getUser()` is the standard Supabase method for validation

**Verification Steps**:
1. Add detailed logging in `authenticateFromHeaders()` to see error from `auth.getUser()`
2. Decode the JWT manually to check expiry and claims
3. Check Supabase project settings for JWT configuration

**Potential Fix**:
- If token is expired, refresh before call
- If JWT verification fails, check Supabase project JWT signing key

**Convention Check**: N/A - Supabase Auth standard flow

## 6. Recommended Action Plan

### Priority 1 (Try First): Add Session Validation Before Edge Function Call

**File**: `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Location**: `handleCounteroffer()` function, around line 857

```javascript
const handleCounteroffer = useCallback(async (counterofferData) => {
  try {
    // ... existing payload building code ...

    console.log('[useHostProposalsPageLogic] Converted payload:', payload);

    // DIAGNOSTIC: Check session before Edge Function call
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[useHostProposalsPageLogic] Session error:', sessionError);
    }
    console.log('[useHostProposalsPageLogic] Session exists:', !!session);
    console.log('[useHostProposalsPageLogic] Access token exists:', !!session?.access_token);

    if (!session?.access_token) {
      // Try to refresh the session
      console.log('[useHostProposalsPageLogic] No active session, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshedSession) {
        throw new Error('Session expired. Please refresh the page and try again.');
      }
      console.log('[useHostProposalsPageLogic] Session refreshed successfully');
    }

    const { data, error } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'update',
        payload
      }
    });
    // ... rest of handler ...
```

### Priority 2 (If Priority 1 Fails): Add Diagnostic Logging to Edge Function

**File**: `supabase/functions/proposal/index.ts`
**Location**: `authenticateFromHeaders()` function, around line 270

```typescript
async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  const authHeader = headers.get('Authorization');

  console.log('[proposal:auth] Authorization header present:', !!authHeader);
  if (authHeader) {
    console.log('[proposal:auth] Header length:', authHeader.length);
    console.log('[proposal:auth] Header starts with Bearer:', authHeader.startsWith('Bearer '));
  }

  if (!authHeader) {
    console.log('[proposal:auth] No Authorization header - returning null');
    return null;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await authClient.auth.getUser();

  if (error) {
    console.error('[proposal:auth] getUser error:', error.message);
  }
  console.log('[proposal:auth] User retrieved:', !!user);

  if (error || !user) {
    return null;
  }

  return { id: user.id, email: user.email ?? '' };
}
```

### Priority 3 (Deeper Investigation): Browser DevTools Network Analysis

1. Open Host Proposals page
2. Open DevTools -> Network tab
3. Filter by "proposal"
4. Attempt counteroffer submission
5. Inspect the failed request:
   - Check Request Headers for "Authorization"
   - Check if value is "Bearer <token>" format
   - Check Response for error details

## 7. Prevention Recommendations

1. **Add Session Refresh Before Critical Operations**: For any Edge Function call that requires authentication, validate the session exists and refresh if needed before making the call.

2. **Centralize Authenticated Edge Function Calls**: Create a utility function that wraps `supabase.functions.invoke()` with automatic session validation:
   ```javascript
   // lib/supabaseUtils.js
   export async function invokeWithAuth(functionName, body) {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session?.access_token) {
       await supabase.auth.refreshSession();
     }
     return supabase.functions.invoke(functionName, { body });
   }
   ```

3. **Add Error Handling for 401**: Catch 401 errors specifically and prompt user to re-authenticate rather than showing generic error.

4. **Monitor Session Expiry**: Consider adding session state to the page-level hook to track when tokens will expire and proactively refresh.

## 8. Related Files Reference

| File | Line Numbers | Purpose |
|------|--------------|---------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | 795-881 | `handleCounteroffer()` function |
| `app/src/lib/supabase.js` | 1-25 | Supabase client initialization |
| `app/src/lib/auth.js` | 132-216 | `checkAuthStatus()` with session handling |
| `supabase/functions/proposal/index.ts` | 79-94 | Update action authentication check |
| `supabase/functions/proposal/index.ts` | 270-292 | `authenticateFromHeaders()` function |
| `supabase/functions/proposal/actions/update.ts` | 49-98 | Update handler authorization logic |

## 9. Additional Notes

### Secondary Issue Discovered

While investigating, I noticed a potential issue in the update handler's authorization check:

**File**: `supabase/functions/proposal/actions/update.ts` (lines 91-92)

```typescript
const isGuest = proposalData.Guest === user.id;
const isHost = await checkIsHost(supabase, proposalData["Host User"], user.id);
```

The `user.id` here is the **Supabase Auth UUID**, but `proposalData.Guest` and `proposalData["Host User"]` store the **application user ID** (`user._id` from the `user` table). These are different ID formats:
- `user.id` (Supabase Auth): UUID format, e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `user._id` (Application): Bubble-style ID, e.g., `1768674109497x26858129648361608`

**However**, this is a secondary issue that would only manifest AFTER the authentication passes. The current 401 error occurs before this code is reached.

### Sources

- [Supabase Securing Edge Functions Documentation](https://supabase.com/docs/guides/functions/auth)
- [GitHub Discussion: Edge Functions 401 Unauthorized](https://github.com/orgs/supabase/discussions/36548)
