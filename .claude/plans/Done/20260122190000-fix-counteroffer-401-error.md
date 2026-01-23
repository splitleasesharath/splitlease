# Fix Counteroffer 401 Unauthorized Error

**Created**: 2026-01-22 19:00:00
**Status**: Ready for Implementation
**Priority**: Critical
**Affected Feature**: Host Counteroffer Submission

---

## Executive Summary

Host counteroffer submissions fail with **401 Unauthorized** error. After extensive debugging, the root cause is confirmed: **The proposal Edge Function is deployed with JWT verification enabled, but the authentication flow inside the function is failing**.

### Key Evidence
1. ✅ Frontend has valid session (token length: 1095 characters)
2. ✅ Session validation passes before Edge Function call
3. ✅ Authorization header is explicitly sent
4. ❌ Edge Function returns 401 Unauthorized
5. ❌ **Diagnostic logs from `authenticateFromHeaders()` never appear** - meaning the function code IS executing but failing silently

### Root Cause Hypothesis

The Edge Function is likely deployed **WITH** JWT verification enabled (default behavior), despite `config.toml` having `verify_jwt = false`. The `config.toml` setting **only applies to local development**, not deployed functions.

**Critical Discovery**: We deployed with `--no-verify-jwt` flag, but the 401 persists. This means:
- Either the deployment didn't work correctly
- OR there's a deeper authentication issue inside the Edge Function code
- OR the `--no-verify-jwt` flag isn't being applied properly

---

## Implementation Plan

### Phase 1: Verify Current Deployment State

**Objective**: Confirm whether `verify_jwt` is actually disabled on the deployed function.

#### Step 1.1: Check Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/functions/proposal
2. Click on the `proposal` function
3. Look for "JWT Verification" setting - confirm if it shows as **disabled**
4. If enabled, manually disable it in the dashboard

**Expected Result**: JWT verification should be disabled.

**If JWT verification is already disabled**, proceed to Phase 2.

---

### Phase 2: Add Comprehensive Edge Function Logging

**Objective**: Understand exactly where the authentication flow is failing.

#### Step 2.1: Enhance Entry Point Logging

**File**: `supabase/functions/proposal/index.ts`
**Location**: Start of Deno.serve handler (around line 45)

Add logging at the very beginning of the request handler:

```typescript
Deno.serve(async (req: Request) => {
  // DIAGNOSTIC: Log every incoming request
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[proposal] REQUEST RECEIVED');
  console.log('[proposal] Method:', req.method);
  console.log('[proposal] URL:', req.url);
  console.log('[proposal] Headers:', Object.fromEntries(req.headers.entries()));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    // ... existing CORS handling
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  console.log('[proposal] Environment check:');
  console.log('  SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? `SET (length: ${supabaseAnonKey.length})` : 'MISSING');

  // ... rest of handler
```

#### Step 2.2: Enhanced Authentication Logging

**File**: `supabase/functions/proposal/index.ts`
**Location**: `authenticateFromHeaders()` function (around line 270)

Replace the existing function with this enhanced version:

```typescript
async function authenticateFromHeaders(
  headers: Headers,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ id: string; email: string } | null> {
  console.log('[proposal:auth] ═══════════════════════════════════');
  console.log('[proposal:auth] Starting authentication');

  const authHeader = headers.get('Authorization');
  console.log('[proposal:auth] Authorization header present:', !!authHeader);

  if (authHeader) {
    console.log('[proposal:auth] Header length:', authHeader.length);
    console.log('[proposal:auth] Header format:', authHeader.substring(0, 20) + '...');
    console.log('[proposal:auth] Starts with "Bearer ":', authHeader.startsWith('Bearer '));
  }

  if (!authHeader) {
    console.log('[proposal:auth] ❌ No Authorization header - returning null');
    console.log('[proposal:auth] ═══════════════════════════════════');
    return null;
  }

  console.log('[proposal:auth] Creating auth client...');
  console.log('[proposal:auth] Using URL:', supabaseUrl);
  console.log('[proposal:auth] Using anon key length:', supabaseAnonKey.length);

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    console.log('[proposal:auth] ✅ Auth client created');

    console.log('[proposal:auth] Calling authClient.auth.getUser()...');
    const { data: { user }, error } = await authClient.auth.getUser();

    console.log('[proposal:auth] getUser() completed');
    console.log('[proposal:auth] Error:', error ? JSON.stringify(error) : 'null');
    console.log('[proposal:auth] User:', user ? 'FOUND' : 'null');

    if (user) {
      console.log('[proposal:auth] User ID (Supabase Auth UUID):', user.id);
      console.log('[proposal:auth] User email:', user.email);
    }

    if (error || !user) {
      console.log('[proposal:auth] ❌ Authentication failed - getUser returned error or null user');
      console.log('[proposal:auth] ═══════════════════════════════════');
      return null;
    }

    // Lookup application user ID from Supabase Auth UUID
    console.log('[proposal:auth] Looking up application user ID...');
    console.log('[proposal:auth] Querying user table with Supabase UUID:', user.id);

    const { data: appUser, error: appUserError } = await authClient
      .from('user')
      .select('_id')
      .eq('id', user.id)
      .single();

    console.log('[proposal:auth] User table query completed');
    console.log('[proposal:auth] Query error:', appUserError ? JSON.stringify(appUserError) : 'null');
    console.log('[proposal:auth] App user found:', appUser ? 'YES' : 'NO');

    if (appUser) {
      console.log('[proposal:auth] Application user ID (_id):', appUser._id);
    }

    if (appUserError || !appUser) {
      console.log('[proposal:auth] ❌ Failed to lookup application user ID');
      if (appUserError) {
        console.log('[proposal:auth] Error code:', appUserError.code);
        console.log('[proposal:auth] Error message:', appUserError.message);
        console.log('[proposal:auth] Error details:', appUserError.details);
        console.log('[proposal:auth] Error hint:', appUserError.hint);
      }
      console.log('[proposal:auth] ═══════════════════════════════════');
      return null;
    }

    console.log('[proposal:auth] ✅ Authentication successful');
    console.log('[proposal:auth] Returning:', { id: appUser._id, email: user.email ?? '' });
    console.log('[proposal:auth] ═══════════════════════════════════');
    return { id: appUser._id, email: user.email ?? '' };

  } catch (err) {
    console.error('[proposal:auth] ❌ EXCEPTION during authentication:');
    console.error('[proposal:auth] Exception type:', err.constructor.name);
    console.error('[proposal:auth] Exception message:', err.message);
    console.error('[proposal:auth] Exception stack:', err.stack);
    console.log('[proposal:auth] ═══════════════════════════════════');
    return null;
  }
}
```

#### Step 2.3: Log Authentication Check Points

**File**: `supabase/functions/proposal/index.ts`
**Location**: Where authenticateFromHeaders is called (around line 79-94)

```typescript
// For update action (around line 79-94)
if (action === 'update') {
  console.log('[proposal] Processing UPDATE action');
  console.log('[proposal] Attempting authentication...');

  const user = await authenticateFromHeaders(req.headers, supabaseUrl!, supabaseAnonKey!);

  console.log('[proposal] Authentication result:', user ? `SUCCESS (${user.id})` : 'FAILED (null)');

  if (!user) {
    console.log('[proposal] ❌ Returning 401 - no authenticated user');
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: corsHeaders }
    );
  }

  console.log('[proposal] ✅ User authenticated, proceeding with update');
  console.log('[proposal] Calling handleUpdate with user:', user.id);

  return handleUpdate(req, supabase, user);
}
```

#### Step 2.4: Deploy Enhanced Function

```bash
supabase functions deploy proposal --project-ref qzsmhgyojmwvtjmnrdea --no-verify-jwt
```

---

### Phase 3: Test and Capture Logs

#### Step 3.1: Attempt Counteroffer Submission
1. Navigate to http://localhost:3000/host-proposals
2. Click "Modify" on a proposal
3. Make a change (e.g., change check-in day)
4. Click "Update Proposal" → "Submit Edits" → "Yes, Proceed"
5. Observe the 401 error

#### Step 3.2: Retrieve Edge Function Logs

**Via Supabase Dashboard**:
1. Go to: https://supabase.com/dashboard/project/qzsmhgyojmwvtjmnrdea/logs/edge-functions
2. Filter by function: `proposal`
3. Look for the diagnostic logs starting with `[proposal]` and `[proposal:auth]`
4. Copy ALL log output

**Via Supabase CLI** (if accessible):
```bash
supabase functions logs proposal --project-ref qzsmhgyojmwvtjmnrdea
```

#### Step 3.3: Analyze Logs

Look for these key indicators:

1. **Does `[proposal] REQUEST RECEIVED` appear?**
   - YES → Request reaches the function ✅
   - NO → Request blocked at gateway level ❌

2. **Does `[proposal:auth] Starting authentication` appear?**
   - YES → Auth function is called ✅
   - NO → Function fails before auth ❌

3. **What does `getUser()` return?**
   - Error object → JWT is invalid/expired
   - Null user → Token format issue
   - User found → Auth works, issue is elsewhere

4. **What does user table lookup return?**
   - Error with code 23503 → FK constraint violation
   - Error with code 42501 → RLS policy denial
   - Error "no rows returned" → UUID doesn't exist in user table
   - Success → Full auth flow works

---

### Phase 4: Fix Based on Log Findings

#### Scenario A: Request Never Reaches Function

**Symptom**: No `[proposal] REQUEST RECEIVED` log entry.

**Root Cause**: Supabase gateway is blocking the request before it reaches the function.

**Solution**:
1. Verify JWT verification is disabled in Supabase dashboard
2. Check if there's a network/CORS issue
3. Try invoking the function via curl with the same token:
   ```bash
   curl -X POST https://qzsmhgyojmwvtjmnrdea.supabase.co/functions/v1/proposal \
     -H "Authorization: Bearer <TOKEN_FROM_BROWSER>" \
     -H "Content-Type: application/json" \
     -d '{"action":"update","payload":{"proposal_id":"1768674109497x26858129648361608","hc_check_in":3}}'
   ```

#### Scenario B: `getUser()` Returns Error

**Symptom**: `[proposal:auth] Error: {...}` shows JWT validation error.

**Root Cause**: Token is invalid, expired, or for wrong project.

**Solution**:
1. Decode the JWT token from the browser (use jwt.io)
2. Check the `aud` claim matches the Supabase project
3. Check the `exp` claim hasn't expired
4. Check the `iss` claim is correct
5. If token is for wrong project, fix frontend `.env` configuration

#### Scenario C: User Table Lookup Fails (RLS Denial)

**Symptom**: `[proposal:auth] Query error: {"code":"42501",...}`

**Root Cause**: Row Level Security policy on `user` table blocks authenticated client from reading.

**Solution**: The `user` table needs RLS policies that allow authenticated users to read their own record.

**File**: Create new migration in `supabase/migrations/`

```sql
-- Enable RLS on user table if not already enabled
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own user record by Supabase UUID
CREATE POLICY "Users can read own user record by auth UUID"
  ON public.user
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow service role to read all (for Edge Functions with service role)
CREATE POLICY "Service role can read all users"
  ON public.user
  FOR SELECT
  TO service_role
  USING (true);
```

Apply the migration:
```bash
supabase db push --project-ref qzsmhgyojmwvtjmnrdea
```

#### Scenario D: User Table Lookup Fails (No Rows)

**Symptom**: `[proposal:auth] App user found: NO` but no error.

**Root Cause**: The Supabase Auth UUID doesn't exist in the `user` table's `id` column.

**Solution**: This indicates a data consistency issue. The user authenticated via Supabase Auth but their UUID isn't in the `user` table. This requires manual investigation:

1. Check the user's Supabase Auth UUID in the logs
2. Query the `user` table to see if the user exists:
   ```sql
   SELECT * FROM public.user WHERE id = '<UUID_FROM_LOGS>';
   ```
3. If the user doesn't exist, they need to be created
4. If the user exists but with a different `id`, there's a data mismatch

#### Scenario E: Full Auth Flow Works

**Symptom**: Logs show `[proposal:auth] ✅ Authentication successful` but still get 401.

**Root Cause**: The 401 is returned from somewhere else in the code, not from `authenticateFromHeaders()`.

**Solution**: Check the update handler for additional auth checks:

**File**: `supabase/functions/proposal/actions/update.ts`
**Location**: Lines 91-98

The update handler has this authorization logic:
```typescript
const isGuest = proposalData.Guest === user.id;
const isHost = await checkIsHost(supabase, proposalData["Host User"], user.id);
```

**Known Issue**: These checks compare `proposalData.Guest` (application user ID like `1768674109497x...`) with `user.id` (which is ALSO the application user ID from `authenticateFromHeaders`). This should work, BUT the error messages don't specify which check failed.

Add logging to `update.ts`:
```typescript
console.log('[update] Checking authorization...');
console.log('[update] User ID from auth:', user.id);
console.log('[update] Proposal Guest ID:', proposalData.Guest);
console.log('[update] Proposal Host User ID:', proposalData["Host User"]);

const isGuest = proposalData.Guest === user.id;
const isHost = await checkIsHost(supabase, proposalData["Host User"], user.id);

console.log('[update] Is guest?', isGuest);
console.log('[update] Is host?', isHost);

if (!isGuest && !isHost) {
  console.log('[update] ❌ Authorization failed - user is neither guest nor host');
  return new Response(
    JSON.stringify({ error: 'Unauthorized: You are not the guest or host of this proposal' }),
    { status: 403, headers: corsHeaders }
  );
}
```

---

### Phase 5: Alternative Workaround (If All Else Fails)

If the issue persists after all debugging, consider this temporary workaround:

#### Option A: Use Service Role Key for This Specific Action

**Risk**: High - bypasses RLS
**Use Case**: ONLY if the issue is confirmed to be RLS-related and fixing RLS is complex

**File**: `supabase/functions/proposal/index.ts`
**Location**: Update action handler

```typescript
if (action === 'update') {
  // TEMPORARY WORKAROUND: Use service role for this specific action
  // TODO: Remove this once RLS policies are fixed
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const serviceClient = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false }
  });

  // Still validate the user's token, but use service role for DB operations
  const user = await authenticateFromHeaders(req.headers, supabaseUrl!, supabaseAnonKey!);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: corsHeaders }
    );
  }

  return handleUpdate(req, serviceClient, user);
}
```

#### Option B: Disable JWT Verification and Use Custom Auth

**Risk**: Medium - requires careful implementation
**Use Case**: If JWT verification is fundamentally incompatible with the current setup

This is what we've already been trying with `--no-verify-jwt`, so if that's not working, this option is moot.

---

## Success Criteria

1. ✅ Counteroffer submissions return 200 OK
2. ✅ Proposal status updates to "Host Counteroffer Submitted / Awaiting Guest Review"
3. ✅ All `hc_*` fields are populated correctly
4. ✅ Edge Function logs show successful authentication
5. ✅ No 401 errors in browser console

---

## Rollback Plan

If the enhanced logging causes issues:

```bash
# Revert to the previous deployment
git log --oneline supabase/functions/proposal/index.ts
git checkout <PREVIOUS_COMMIT> supabase/functions/proposal/index.ts
supabase functions deploy proposal --project-ref qzsmhgyojmwvtjmnrdea --no-verify-jwt
```

---

## Related Files

| File | Purpose | Lines |
|------|---------|-------|
| `supabase/functions/proposal/index.ts` | Entry point, authentication, routing | 45-94, 270-323 |
| `supabase/functions/proposal/actions/update.ts` | Update handler with authorization | 49-98 |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Frontend counteroffer submission | 795-950 |
| `.claude/plans/Documents/20260122180500-counteroffer-401-root-cause.md` | Root cause analysis document | All |

---

## Notes

### Why `--no-verify-jwt` Might Not Work

The `--no-verify-jwt` flag tells Supabase to skip JWT validation **at the gateway level**. However:
1. The Supabase deployment system might not respect this flag
2. The flag might only work for certain deployment methods
3. There might be a caching issue where the old configuration is still in effect

### The `[object Object]` Alert Mystery

The user reported seeing `[object Object]` in alert dialogs. This is JavaScript's default string representation of an object. The error object from the Edge Function is being passed directly to `alert()` instead of extracting the error message.

**Fix**: In `useHostProposalsPageLogic.js`, update error handling:

```javascript
} catch (err) {
  console.error('Failed to send counteroffer:', err);
  const errorMessage = err?.message || err?.error?.message || 'Failed to send counteroffer. Please try again.';
  alert(errorMessage);  // Instead of alert(err)
}
```

---

## Execution Order

1. **Phase 1** (5 min) - Check Supabase dashboard for JWT verification setting
2. **Phase 2** (15 min) - Add comprehensive logging to Edge Function
3. **Phase 2.4** (2 min) - Deploy enhanced function
4. **Phase 3** (5 min) - Test and capture logs
5. **Phase 3.3** (10 min) - Analyze logs to identify scenario
6. **Phase 4** (varies) - Apply fix based on scenario
7. **Validate** (5 min) - Test counteroffer submission again

**Total Estimated Time**: 1-2 hours (depending on which scenario applies)
