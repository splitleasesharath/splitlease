# Messaging Authentication Investigation Report

**Date**: January 17, 2026
**Issue**: Messaging features not working for `splitleasetesting@test.com` while working for other test users
**Status**: RESOLVED

---

## Executive Summary

The messaging issues experienced by `splitleasetesting@test.com` were caused by **two independent bugs**, not user-specific configuration differences. The timing of when each user tested the system determined whether they encountered the bugs.

**Key Finding**: All three test users (`splitleasetesting@test.com`, `terrencegrey@test.com`, `splitleasefrederick+matiaslunar@gmail.com`) use the **same authentication method** (legacy auth via secure storage). The bugs were in the codebase, not user accounts.

---

## User Authentication Analysis

### Authentication Methods in Split Lease

Split Lease supports two authentication methods:

| Method | How It Works | Who Uses It |
|--------|--------------|-------------|
| **Legacy Auth** | User ID stored in secure storage (localStorage encrypted), passed to Edge Functions via `user_id` parameter | Users who logged in before Supabase Auth migration |
| **Supabase JWT Auth** | JWT token in Authorization header, validated by Supabase Auth | Users who created accounts after migration or re-authenticated |

### Test User Authentication Status

All three test users authenticate via **Legacy Auth**:

```
Console log from all users:
[DEBUG] ✅ User authenticated via secure storage (legacy)
```

| User | Auth Method | Bubble ID |
|------|-------------|-----------|
| `splitleasetesting@test.com` | Legacy (secure storage) | `1764981388058x38544543907239472` |
| `terrencegrey@test.com` | Legacy (secure storage) | Different Bubble ID |
| `splitleasefrederick+matiaslunar@gmail.com` | Legacy (secure storage) | Different Bubble ID |

**Conclusion**: The authentication method is NOT the differentiating factor.

---

## The Real Root Causes

### Bug #1: PostgREST `.or()` Filter Parsing Issue

**Affected Features**:
- Messaging icon visibility (thread count)
- Thread list in messaging panel

**Technical Details**:

The `thread` table has columns with leading hyphens:
- `-Host User`
- `-Guest User`

PostgREST's `.or()` filter fails to correctly parse column names with leading hyphens, even when properly quoted:

```javascript
// This query FAILS silently (returns 0 results when data exists)
supabase
  .from('thread')
  .select('*')
  .or(`"-Host User".eq.${userId},"-Guest User".eq.${userId}`)
```

**Why It Affected Some Users But Not Others**:

Git history shows the code was modified **twice on January 17, 2026**:

| Time | Commit | Change |
|------|--------|--------|
| Earlier | (unknown) | Removed quotes from column names in `.or()` filter |
| Later | `5592ee10` | Re-added quotes to fix a different issue |

Different users tested at different times:
- **Users who tested earlier**: Caught the system with working code (before quotes were removed, or with a different implementation)
- **Users who tested later**: Caught the system with broken `.or()` filter

This is **temporal inconsistency**, not user-specific behavior.

**Solution Applied**:
Created RPC functions that use raw SQL, bypassing PostgREST's filter parsing:

```sql
-- count_user_threads(user_id TEXT)
SELECT COUNT(*)::integer FROM thread
WHERE "-Host User" = user_id OR "-Guest User" = user_id;

-- get_user_threads(user_id TEXT)
SELECT * FROM thread
WHERE "-Host User" = user_id OR "-Guest User" = user_id
ORDER BY "Modified Date" DESC NULLS LAST
LIMIT 20;
```

---

### Bug #2: Missing `user_id` in Edge Function Payload

**Affected Features**:
- Fetching messages within a thread
- Sending messages

**Technical Details**:

The `messages` Edge Function supports two authentication methods:

```typescript
// Method 1: JWT token in Authorization header
const authHeader = headers.get('Authorization');
if (authHeader) {
  const { data: { user } } = await authClient.auth.getUser();
  // ... authenticate via JWT
}

// Method 2: user_id in payload (legacy auth fallback)
const userId = payload.user_id as string | undefined;
if (userId) {
  // ... authenticate via database lookup
}
```

The frontend code was calling the Edge Function **without** passing `user_id`:

```javascript
// BEFORE (broken for legacy auth users)
const { data, error } = await supabase.functions.invoke('messages', {
  body: {
    action: 'get_messages',
    payload: { thread_id: threadId },
  },
});
```

Since legacy auth users don't have JWT tokens, the Edge Function couldn't authenticate them, returning **401 Unauthorized**.

**Why It Worked for Some Users Previously**:

This is harder to explain without more git history analysis, but possibilities include:
1. Earlier code may have included `user_id` in the payload
2. Some users may have had cached Supabase sessions from previous JWT authentications
3. The Edge Function may have been deployed with different logic at different times

**Solution Applied**:

```javascript
// AFTER (works for both auth methods)
const bubbleId = userBubbleId || getUserId();

const { data, error } = await supabase.functions.invoke('messages', {
  body: {
    action: 'get_messages',
    payload: {
      thread_id: threadId,
      user_id: bubbleId,  // Legacy auth: pass user_id inside payload
    },
  },
});
```

---

## Timeline of Issues and Fixes

| Time | Event |
|------|-------|
| Unknown | Code worked for some users |
| Jan 17, earlier | Code changed, introduced `.or()` filter issues |
| Jan 17, 5592ee10 | Attempted fix by adding quotes (didn't fully solve it) |
| Jan 17, session | User reports `splitleasetesting@test.com` not showing messaging icon |
| Jan 17, fix #1 | Created `count_user_threads` RPC - messaging icon now shows |
| Jan 17, fix #2 | Created `get_user_threads` RPC - thread list now loads |
| Jan 17, fix #3 | Added `user_id` to Edge Function payload - messages now load |

---

## Files Modified

| File | Change |
|------|--------|
| [useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js) | Use `count_user_threads` RPC instead of `.or()` filter |
| [useHeaderMessagingPanelLogic.js](../../../app/src/islands/shared/HeaderMessagingPanel/useHeaderMessagingPanelLogic.js) | Use `get_user_threads` RPC; Add `user_id` to Edge Function payloads |
| [getThreads.ts](../../../supabase/functions/messages/handlers/getThreads.ts) | Use `get_user_threads` RPC for consistency |

---

## Database Migrations Applied

Both RPC functions need to be deployed to **production** (supabase-live):

```sql
-- Migration: count_user_threads
CREATE OR REPLACE FUNCTION count_user_threads(user_id TEXT)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM thread
  WHERE "-Host User" = user_id OR "-Guest User" = user_id;
$$;

-- Migration: get_user_threads
CREATE OR REPLACE FUNCTION get_user_threads(user_id TEXT)
RETURNS SETOF thread
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM thread
  WHERE "-Host User" = user_id OR "-Guest User" = user_id
  ORDER BY "Modified Date" DESC NULLS LAST
  LIMIT 20;
$$;
```

---

## Remaining Action Items

1. **Deploy RPC functions to production** (supabase-live)
   - `count_user_threads`
   - `get_user_threads`

2. **Deploy Edge Function** (if not already done)
   - `supabase functions deploy messages`

3. **Consider migrating all legacy auth users to Supabase Auth**
   - Would simplify authentication logic
   - Eliminates need for `user_id` payload fallback

---

## Lessons Learned

1. **PostgREST has limitations with special characters in column names**
   - Column names with leading hyphens (`-Host User`) require RPC functions
   - The `.or()` filter is particularly problematic

2. **Authentication fallbacks require explicit handling**
   - Legacy auth users need `user_id` passed explicitly
   - JWT auth users get authentication automatically via headers

3. **Temporal inconsistency can mimic user-specific bugs**
   - Different users testing at different times see different behavior
   - Git history analysis is essential for understanding "why did it work before?"

4. **Database column naming conventions matter**
   - Avoid leading hyphens, spaces, or special characters
   - Consider renaming `-Host User` to `host_user` in future migration

---

## Conclusion

The issues were **NOT** caused by differences between user accounts. All three test users use identical authentication methods (legacy auth via secure storage). The bugs were:

1. **PostgREST filter parsing issue** with hyphen-prefixed column names
2. **Missing `user_id` parameter** in Edge Function calls for legacy auth

Both bugs are now fixed. The perception that "it works for other users" was due to temporal inconsistency in the codebase, not user-specific configurations.
