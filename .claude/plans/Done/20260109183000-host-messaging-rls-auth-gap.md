# Host Messaging & Thread Visibility - RLS Authentication Gap

**Created:** 2026-01-09 18:30:00
**Status:** Analysis Complete - Awaiting Implementation Decision
**Priority:** High (blocks host messaging functionality)

## Problem Statement

Host users (e.g., `leoandres@test.com`) cannot see:
1. Messaging icon in the header (listing-dashboard page)
2. Conversations on the /messages page ("No Conversations Yet")
3. Correct proposal count may also be affected

## Root Cause Analysis

### The Authentication Gap

The application supports **two authentication methods**:
1. **Legacy Bubble Auth** - Cross-domain cookies from `.split.lease`
2. **Supabase Auth** - Native JWT-based sessions

However, the **RLS (Row Level Security) policies** on the `thread` table ONLY work with Supabase Auth:

```sql
-- RLS policy for SELECT on thread table
CREATE POLICY "users_read_own_threads" ON thread
FOR SELECT TO authenticated
USING (
  "-Host User" = get_user_bubble_id() OR
  "-Guest User" = get_user_bubble_id()
);
```

The `get_user_bubble_id()` function:
```sql
CREATE FUNCTION get_user_bubble_id() RETURNS text AS $$
  SELECT u._id
  FROM public."user" u
  WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**The Chain of Failure:**
1. User logs in via legacy Bubble cookies
2. `checkAuthStatus()` in `auth.js` (line 136-142) returns `true` immediately
3. No Supabase session is established or verified
4. Frontend makes queries to `thread` table using Supabase client
5. Supabase client sends request **without valid JWT** (or with expired JWT)
6. `auth.uid()` returns `NULL` in the database
7. `get_user_bubble_id()` returns `NULL`
8. RLS policy evaluates to: `"-Host User" = NULL` → always `false`
9. **Zero rows returned** despite data existing

### Evidence

#### Data Verification
- Host user `leoandres@test.com` has Bubble ID: `1766341001713x27075027492022908`
- Host has **2 threads** in the database where `-Host User` matches their Bubble ID
- Direct SQL queries return both threads correctly
- Queries through Supabase client (via RLS) return **0 threads**

#### Code Location
**File:** [app/src/lib/auth.js](../../app/src/lib/auth.js)
**Lines:** 136-142

```javascript
// PROBLEM: Returns early without establishing Supabase session
if (splitLeaseAuth.isLoggedIn) {
  console.log('✅ User authenticated via Split Lease cookies');
  isUserLoggedInState = true;
  setAuthState(true);
  return true;  // <-- Skips Supabase session check!
}
```

#### Affected Components
| Component | File | Impact |
|-----------|------|--------|
| Header messaging icon | `LoggedInAvatar.jsx` | Not shown (threadsCount = 0) |
| Messages page | `MessagingPage/useMessagingPageLogic.js` | Shows "No Conversations" |
| Thread count in header | `useLoggedInAvatarData.js` | Returns 0 |

## Proposed Solutions

### Option A: Establish Supabase Session for Legacy Cookie Users (Recommended)

When legacy cookies are detected, also attempt to establish a Supabase session:

```javascript
if (splitLeaseAuth.isLoggedIn) {
  console.log('✅ User authenticated via Split Lease cookies');

  // Also check/establish Supabase session for RLS-protected queries
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // User has legacy cookies but no Supabase session
      // Could: 1) Force re-login, 2) Use service role for specific queries,
      // or 3) Accept degraded functionality
      console.warn('⚠️ Legacy auth but no Supabase session - RLS queries will fail');
    }
  } catch (err) {
    console.warn('⚠️ Could not verify Supabase session:', err.message);
  }

  isUserLoggedInState = true;
  setAuthState(true);
  return true;
}
```

**Pros:** Minimal code change, surfaces the issue clearly
**Cons:** Doesn't fix the problem, just logs it

### Option B: Require Supabase Session for Protected Features

Add a helper function that ensures Supabase session exists before RLS queries:

```javascript
// New function in auth.js
export async function ensureSupabaseSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (session && !error) {
    return { valid: true, session };
  }

  // No valid session - prompt re-login
  console.warn('[Auth] No valid Supabase session for RLS-protected operation');
  return { valid: false, session: null };
}
```

Then use in messaging hooks:
```javascript
// In useMessagingPageLogic.js before thread queries
const { valid } = await ensureSupabaseSession();
if (!valid) {
  setError('Please log in again to access messages');
  return;
}
```

**Pros:** Explicit handling, good UX (clear error message)
**Cons:** More invasive changes across components

### Option C: Migrate All Users to Supabase Auth (Long-term)

Force all legacy cookie users to re-authenticate via Supabase Auth on next login.

**Pros:** Eliminates split-brain auth permanently
**Cons:** Disruptive to existing users, requires significant migration effort

### Option D: Add RLS Bypass for Specific Operations (Service Role)

Use Edge Functions with service role for thread/message queries instead of client-side RLS.

**Pros:** Works regardless of auth method
**Cons:** Moves security to application layer, increases Edge Function usage

## Recommended Approach

**Short-term (Option B):** Add `ensureSupabaseSession()` check before RLS-protected queries in:
- `useMessagingPageLogic.js`
- `useLoggedInAvatarData.js`

**Long-term (Option C):** Plan migration to deprecate legacy cookie auth.

## Files to Modify

1. **[app/src/lib/auth.js](../../app/src/lib/auth.js)** - Add `ensureSupabaseSession()` function
2. **[app/src/islands/pages/MessagingPage/useMessagingPageLogic.js](../../app/src/islands/pages/MessagingPage/useMessagingPageLogic.js)** - Check session before thread queries
3. **[app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js](../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js)** - Check session before thread count query

## Testing Plan

1. Log in as `leoandres@test.com` via the login form (ensures Supabase session)
2. Navigate to `/listing-dashboard?id=1766342812136x26268629342051432`
3. Verify messaging icon appears in header
4. Navigate to `/messages`
5. Verify threads are displayed (should see 2 threads)
6. Test sending a message in a thread

## Questions for User

1. Should we force re-login for users with legacy cookies but no Supabase session?
2. Is there a timeline to fully deprecate legacy Bubble cookie authentication?
3. Should Edge Functions be used as a fallback for critical queries when RLS fails?
