# Account Profile "Too Many Redirects" - Root Cause Analysis & Fix Plan

**Issue**: Infinite redirect loop on `/account-profile`
**Date**: 2026-01-14
**Status**: ANALYSIS COMPLETE - Ready for Implementation

---

## Executive Summary

**Root Cause**: User exists in Supabase Auth but has NO corresponding record in the `user` database table.

The specific error:
```
User not found with _id or email: 476622df-b344-45df-96dc-3dc881252080
```

The ID `476622df-b344-45df-96dc-3dc881252080` is a **Supabase Auth UUID**, not a Bubble-style `_id` (which looks like `self_1234_abc`).

---

## Detailed Root Cause Analysis

### The Redirect Loop Mechanism

1. **User lands on `/account-profile`** (protected page)

2. **`checkAuthStatus()` returns TRUE** because:
   - User has valid Supabase Auth session
   - Line 176 in `auth.js`:
     ```javascript
     const userId = session.user?.user_metadata?.user_id || session.user?.id;
     ```
   - If `user_metadata.user_id` is NOT set, it falls back to `session.user?.id` (Supabase UUID)

3. **`validateTokenAndFetchUser()` is called** (line 531 in `useAccountProfilePageLogic.js`)
   - Gets `userId` from `getSessionId()` → returns UUID
   - Calls edge function with `user_id: UUID`

4. **Edge function `auth-user/validate` fails**:
   - Tries to find user by `_id = UUID` → NOT FOUND
   - Falls back to email lookup → ALSO FAILS (user not in `user` table)
   - Throws: `SupabaseSyncError: User not found with _id or email: 476622df-...`

5. **Validation returns null** but `clearOnFailure: false` preserves auth state

6. **Page shows error state OR some other component triggers redirect**

7. **Loop continues** because Supabase Auth session is never invalidated

### Why This User State Exists

The user has a Supabase Auth account but NO database record. This can happen when:

1. **OAuth signup failed midway** - Supabase Auth user created, but `user` table insert failed
2. **Manual database cleanup** - User deleted from `user` table but not from Supabase Auth
3. **Race condition during signup** - User navigated away before database record was created
4. **Migration issue** - User wasn't properly migrated from Bubble

---

## Evidence from Code

### `@/app/src/lib/auth.js:176`
```javascript
// Sync Supabase session to our storage for consistency
const userId = session.user?.user_metadata?.user_id || session.user?.id;
```
**Problem**: Falls back to Supabase UUID if `user_metadata.user_id` not set.

### `@/supabase/functions/auth-user/handlers/validate.ts:131-133`
```typescript
if (!userData) {
  console.error(`[validate] User not found in Supabase by _id or email: ${user_id}`);
  throw new SupabaseSyncError(`User not found with _id or email: ${user_id}`);
}
```
**Problem**: Throws fatal error with no recovery path.

### `@/app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js:524-550`
```javascript
const isAuth = await checkAuthStatus();
setIsAuthenticated(isAuth);

let validatedUserId = null;
if (isAuth) {
  const validatedUser = await validateTokenAndFetchUser({ clearOnFailure: false });
  if (validatedUser?.userId) {
    validatedUserId = validatedUser.userId;
  } else {
    validatedUserId = getSessionId(); // Fallback to potentially wrong ID
  }
}
```
**Problem**: Falls back to `getSessionId()` which returns the same invalid UUID.

---

## NOT the Issue

Based on ROUTING_GUIDE.md analysis, these are **NOT** causing the redirect loop:

- ✅ `routes.config.js` - Account profile config is correct (`cloudflareInternal: false`, `protected: true`)
- ✅ `_redirects` - Properly configured with 200 rewrites
- ✅ `_headers` - Account profile doesn't need Content-Type header (not using `_internal/`)
- ✅ No 308 redirect issues (not a dynamic route with segments)

---

## Fix Options

### Option 1: Create Missing User Record (Data Fix - Immediate)

**For this specific user (476622df-b344-45df-96dc-3dc881252080)**:

1. Query Supabase Auth to get user email:
   ```sql
   SELECT id, email, raw_user_meta_data 
   FROM auth.users 
   WHERE id = '476622df-b344-45df-96dc-3dc881252080';
   ```

2. Create corresponding `user` table record:
   ```sql
   INSERT INTO public.user (_id, email, "email as text", "Created Date")
   VALUES (
     'self_' || extract(epoch from now())::bigint::text || '_' || substr(md5(random()::text), 1, 9),
     '[email from step 1]',
     '[email from step 1]',
     now()
   );
   ```

3. Update Supabase Auth user_metadata with the new `_id`:
   ```javascript
   await supabase.auth.admin.updateUserById('476622df-...', {
     user_metadata: { user_id: 'self_...' }
   });
   ```

### Option 2: Graceful Error Handling (Code Fix - Short Term)

Modify `useAccountProfilePageLogic.js` to handle "user not found" gracefully:

```javascript
// After line 548
if (!targetUserId) {
  throw new Error('Please log in to view your profile');
}

// NEW: Check if we're using a Supabase UUID (indicates missing user record)
if (targetUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
  console.error('[AccountProfile] Invalid user ID format (Supabase UUID detected)');
  // Clear auth and redirect to fix the orphaned state
  clearAuthData();
  await supabase.auth.signOut();
  throw new Error('Your account setup is incomplete. Please sign up again.');
}
```

### Option 3: Fix OAuth Signup Flow (Code Fix - Long Term)

Ensure `user_metadata.user_id` is ALWAYS set during OAuth signup:

In `@/supabase/functions/auth-user/handlers/oauthSignup.ts`:
- Verify user record creation succeeded before returning success
- If user creation fails, delete the Supabase Auth user to prevent orphaned state

### Option 4: Validation Fallback to Email (Code Fix - Medium Term)

In `auth-user/validate`, if `_id` lookup fails, try harder with email:

```typescript
// After email lookup fails, try creating the missing user record
if (!userData && authUser?.email) {
  console.log('[validate] User not found, checking if orphaned Supabase Auth user...');
  // Create user record from Supabase Auth data
  // This is a recovery mechanism for orphaned users
}
```

---

## Recommended Implementation Order

1. **Immediate (Data Fix)**: Run Option 1 SQL to fix this specific user
2. **Short Term (Code Fix)**: Implement Option 2 to prevent redirect loops for any future cases
3. **Long Term (Prevention)**: Implement Option 3 to prevent orphaned users during OAuth signup

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| Database (Supabase) | Create missing user record | P0 |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Add UUID detection and graceful error | P1 |
| `app/src/lib/auth.js` | Improve `checkAuthStatus` to detect orphaned users | P2 |
| `supabase/functions/auth-user/handlers/oauthSignup.ts` | Add user creation verification | P2 |
| `supabase/functions/auth-user/handlers/validate.ts` | Add orphaned user recovery | P3 |

---

## Testing Checklist

- [ ] User with Supabase Auth but no `user` record sees graceful error
- [ ] User with complete records can access `/account-profile`
- [ ] OAuth signup creates both Supabase Auth AND `user` record
- [ ] No redirect loops on any protected page
- [ ] Proper cleanup of Supabase Auth session when user record missing
