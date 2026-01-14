# Account Profile Redirect Loop - Implementation Plan

**Issue**: ERR_TOO_MANY_REDIRECTS on `/account-profile`
**Date**: 2026-01-14
**Status**: READY FOR IMPLEMENTATION

---

## 0. Database Analysis (2026-01-14)

### Supabase Projects
| Project | ID | Environment |
|---------|-----|-------------|
| splitlease-backend-dev | `qzsmhgyojmwvtjmnrdea` | Main branch (development) |
| splitlease-backend-live | `qcfifybkaddcoimjroca` | Cloudflare production |

### Orphaned Users Found

#### LIVE Environment (splitlease-backend-live) - **AFFECTED**
| Supabase UUID | Email | Provider | metadata_user_id | public.user |
|---------------|-------|----------|------------------|-------------|
| `476622df-b344-45df-96dc-3dc881252080` | `splitleaseteam@gmail.com` | `linkedin_oidc` | ❌ **NULL** | ❌ **Missing** |

**This is the user causing the redirect loop on production.**

#### DEV Environment (splitlease-backend-dev) - **FIXED**
| Supabase UUID | Email | Provider | metadata_user_id | public.user |
|---------------|-------|----------|------------------|-------------|
| `476622df-b344-45df-96dc-3dc881252080` | `splitleaseteam@gmail.com` | `linkedin_oidc` | ✅ `1768305822792x04219314882038216` | ✅ Exists |

**DEV was already fixed** - the same user now has matching records.

#### Users with Missing metadata_user_id (but have public.user)
These users work because `public.user` exists, but metadata should be synced:
- `igor@leasesplit.com` (both environments)
- `splitleasesharath+hostbughunt@gmail.com` (both environments)

---

## 1. Symptoms

### User-Facing Symptoms
- Browser shows "ERR_TOO_MANY_REDIRECTS" or "This page isn't working"
- `/account-profile` page fails to load
- User appears logged in (Supabase session exists) but cannot access protected pages

### Error Logs
```
[Edge Function Error] auth-user/validate
Request ID: c68ff2ed
Timestamp: 2026-01-14T11:18:09.381Z
Error Type: SupabaseSyncError
Message: User not found with _id or email: 476622df-b344-45df-96dc-3dc881252080
Context: Fatal error in main handler
```

### Technical Symptoms
1. **Supabase Auth session exists** - `supabase.auth.getSession()` returns valid session
2. **`user_metadata.user_id` is NOT set** - Falls back to Supabase UUID
3. **`public.user` record does NOT exist** - No matching row for email or `_id`
4. **Validation fails repeatedly** - Edge function throws `SupabaseSyncError`
5. **Auth state preserved** - `clearOnFailure: false` prevents logout
6. **Loop continues** - Each page load/navigation retries validation

### How to Identify Affected Users
```sql
-- Find auth.users without matching public.user records
SELECT 
  au.id as supabase_uuid,
  au.email,
  au.raw_user_meta_data->>'user_id' as metadata_user_id,
  pu._id as public_user_id
FROM auth.users au
LEFT JOIN public.user pu ON pu.email = au.email
WHERE pu._id IS NULL
  OR au.raw_user_meta_data->>'user_id' IS NULL;
```

---

## 2. Root Cause

**OAuth callback handler NOT invoked** → `public.user` record never created → `checkAuthStatus()` stores Supabase UUID → validation fails → loop.

### The Broken Flow

```
User authenticates via OAuth (Google/LinkedIn)
       ↓
Supabase creates auth.users record (UUID: 476622df-...)
       ↓
OAuth redirect back to app
       ↓
❌ localStorage flag missing/expired
       ↓
❌ processOAuthLoginCallback() skips processing
       ↓
❌ oauth_signup edge function NEVER called
       ↓
❌ public.user record NOT created
       ↓
❌ user_metadata.user_id NOT set
       ↓
checkAuthStatus() runs, finds session
       ↓
userId = user_metadata.user_id || session.user.id
       ↓
userId = undefined || "476622df-..." (UUID)
       ↓
validateTokenAndFetchUser() calls validate edge function
       ↓
validate.ts queries: SELECT * FROM user WHERE _id = '476622df-...'
       ↓
NOT FOUND (UUID format doesn't match Bubble-style _id)
       ↓
Throws SupabaseSyncError
       ↓
Returns null, but auth state preserved
       ↓
Page shows error OR redirects → LOOP
```

---

## 3. Implementation Plan

### Phase 1: Immediate Data Fix (P0) - LIVE ONLY

**Goal**: Fix the orphaned user on `splitlease-backend-live` (`qcfifybkaddcoimjroca`)

**Target User**:
- Supabase UUID: `476622df-b344-45df-96dc-3dc881252080`
- Email: `splitleaseteam@gmail.com`
- Provider: `linkedin_oidc`

#### Step 1.1: Generate Bubble-style ID
```sql
-- Run on splitlease-backend-live (qcfifybkaddcoimjroca)
SELECT generate_bubble_id() as new_user_id;
-- Expected output: something like "1768400000000x12345678901234567"
```

#### Step 1.2: Create public.user record
```sql
-- Run on splitlease-backend-live (qcfifybkaddcoimjroca)
-- Replace [NEW_ID] with the ID generated in Step 1.1
INSERT INTO public."user" (
  "_id",
  "email",
  "email as text",
  "Created Date",
  "Modified Date",
  "Type - User Current",
  "Type - User Signup",
  "authentication",
  "user_signed_up",
  "Receptivity"
)
VALUES (
  '[NEW_ID]',
  'splitleaseteam@gmail.com',
  'splitleaseteam@gmail.com',
  now(),
  now(),
  'A Guest (I would like to rent a space)',
  'A Guest (I would like to rent a space)',
  '{}',
  true,
  0
);
```

#### Step 1.3: Update Supabase Auth user_metadata
```sql
-- Run on splitlease-backend-live (qcfifybkaddcoimjroca)
-- This updates the auth.users row to include the user_id in metadata
-- Replace [NEW_ID] with the ID generated in Step 1.1
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'user_id', '[NEW_ID]',
  'host_account_id', '[NEW_ID]'
)
WHERE id = '476622df-b344-45df-96dc-3dc881252080';
```

#### Step 1.4: Verify the fix
```sql
-- Run on splitlease-backend-live (qcfifybkaddcoimjroca)
SELECT 
  au.id as supabase_uuid,
  au.email,
  au.raw_user_meta_data->>'user_id' as metadata_user_id,
  pu._id as public_user_id
FROM auth.users au
LEFT JOIN public."user" pu ON LOWER(pu.email) = LOWER(au.email)
WHERE au.id = '476622df-b344-45df-96dc-3dc881252080';
-- Expected: metadata_user_id and public_user_id should both show [NEW_ID]
```

#### Step 1.5: Fix users with missing metadata_user_id
```sql
-- Run on both DEV and LIVE
-- These users have public.user but missing metadata_user_id
-- Update igor@leasesplit.com
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'user_id', (SELECT _id FROM public."user" WHERE email = 'igor@leasesplit.com'),
  'host_account_id', (SELECT _id FROM public."user" WHERE email = 'igor@leasesplit.com')
)
WHERE email = 'igor@leasesplit.com'
  AND (raw_user_meta_data->>'user_id' IS NULL);

-- Update splitleasesharath+hostbughunt@gmail.com
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'user_id', (SELECT _id FROM public."user" WHERE email = 'splitleasesharath+hostbughunt@gmail.com'),
  'host_account_id', (SELECT _id FROM public."user" WHERE email = 'splitleasesharath+hostbughunt@gmail.com')
)
WHERE email = 'splitleasesharath+hostbughunt@gmail.com'
  AND (raw_user_meta_data->>'user_id' IS NULL);
```

---

### Phase 2: Graceful Error Handling (P1)

**Goal**: Detect UUID format and show helpful error instead of infinite loop

#### Step 2.1: Add UUID detection in useAccountProfilePageLogic.js

**File**: `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`

**Location**: After line ~545 (after `targetUserId` is determined)

```javascript
// Detect orphaned Supabase user (UUID indicates missing public.user record)
const isSupabaseUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (targetUserId && isSupabaseUUID.test(targetUserId)) {
  console.error('[AccountProfile] Detected Supabase UUID instead of Bubble ID:', targetUserId);
  console.error('[AccountProfile] This indicates missing public.user record');
  
  // Clear the invalid auth state to break the loop
  clearAuthData();
  await supabase.auth.signOut();
  
  throw new Error(
    'Your account setup is incomplete. Please sign up again or contact support.'
  );
}
```

#### Step 2.2: Add helper function to detect UUID format

**File**: `app/src/lib/auth.js`

```javascript
/**
 * Check if a user ID is a Supabase UUID (indicates orphaned auth user)
 * Bubble-style IDs look like: self_1234567890_abc123def
 * Supabase UUIDs look like: 476622df-b344-45df-96dc-3dc881252080
 */
export function isSupabaseUUID(userId) {
  if (!userId) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}
```

---

### Phase 3: Auto-Recovery in Validate (P2)

**Goal**: Automatically create missing `public.user` record when orphaned auth user detected

#### Step 3.1: Modify validate.ts to auto-create user

**File**: `supabase/functions/auth-user/handlers/validate.ts`

**Location**: After the "user not found" check (~line 130)

```typescript
// Before throwing error, try to auto-recover orphaned Supabase Auth users
if (!userData) {
  console.log('[validate] User not found, checking for orphaned Supabase Auth user...');
  
  // Get auth user details
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
  
  if (authUser && authUser.user?.email) {
    console.log('[validate] Found orphaned auth user, auto-creating public.user record...');
    
    // Generate Bubble-style ID
    const { data: generatedId, error: idError } = await supabase.rpc('generate_bubble_id');
    
    if (!idError && generatedId) {
      const now = new Date().toISOString();
      
      // Create user record
      const { error: insertError } = await supabase
        .from('user')
        .insert({
          '_id': generatedId,
          'email': authUser.user.email.toLowerCase(),
          'email as text': authUser.user.email.toLowerCase(),
          'Name - First': authUser.user.user_metadata?.first_name || null,
          'Name - Last': authUser.user.user_metadata?.last_name || null,
          'Created Date': now,
          'Modified Date': now,
          'Type - User Current': 'A Guest (I would like to rent a space)',
          'Type - User Signup': 'A Guest (I would like to rent a space)',
          'authentication': {},
          'user_signed_up': true,
          'Receptivity': 0
        });
      
      if (!insertError) {
        // Update auth user metadata
        await supabase.auth.admin.updateUserById(user_id, {
          user_metadata: {
            user_id: generatedId,
            host_account_id: generatedId
          }
        });
        
        console.log('[validate] ✅ Auto-created user record:', generatedId);
        
        // Fetch the newly created user
        const { data: newUser } = await supabase
          .from('user')
          .select(userSelectFields)
          .eq('_id', generatedId)
          .single();
        
        if (newUser) {
          userData = newUser;
        }
      }
    }
  }
}

// If still no userData after recovery attempt, throw error
if (!userData) {
  console.error(`[validate] User not found in Supabase by _id or email: ${user_id}`);
  throw new SupabaseSyncError(`User not found with _id or email: ${user_id}`);
}
```

---

### Phase 4: Prevention (P3)

**Goal**: Make OAuth callback detection more robust

#### Step 4.1: Add fallback detection in checkAuthStatus

**File**: `app/src/lib/auth.js`

**Location**: In `checkAuthStatus()`, after getting session (~line 176)

```javascript
// Check if this looks like a fresh OAuth session without proper setup
const userId = session.user?.user_metadata?.user_id || session.user?.id;

// Detect if we have a UUID (indicates OAuth user without public.user record)
if (!session.user?.user_metadata?.user_id && session.user?.id) {
  const isOAuthProvider = ['google', 'linkedin_oidc'].some(
    p => session.user?.app_metadata?.provider === p || 
         session.user?.app_metadata?.providers?.includes(p)
  );
  
  if (isOAuthProvider) {
    console.warn('[Auth] OAuth session without user_id in metadata detected');
    console.warn('[Auth] Triggering OAuth setup flow...');
    
    // Try to complete the OAuth setup
    const setupResult = await completeOrphanedOAuthSetup(session);
    if (setupResult.success) {
      return true; // Successfully set up
    }
  }
}
```

---

## 4. Testing Checklist

### After Phase 1 (Data Fix)
- [ ] Query `auth.users` confirms `user_metadata.user_id` is set
- [ ] Query `public.user` confirms record exists with matching email
- [ ] User can access `/account-profile` without redirect loop

### After Phase 2 (Graceful Error)
- [ ] User with orphaned auth account sees error message (not infinite loop)
- [ ] Error message provides clear next steps
- [ ] Auth state is cleared after detecting orphaned user

### After Phase 3 (Auto-Recovery)
- [ ] Orphaned auth user automatically gets `public.user` record created
- [ ] `user_metadata` is updated with new Bubble-style ID
- [ ] User can proceed to access protected pages after recovery

### After Phase 4 (Prevention)
- [ ] New OAuth signups always create `public.user` record
- [ ] `checkAuthStatus()` detects and handles orphaned OAuth sessions
- [ ] No new orphaned users can be created

---

## 5. Rollback Plan

If any fix causes issues:

1. **Phase 1**: Delete the created `public.user` record
2. **Phase 2**: Revert the UUID detection code
3. **Phase 3**: Revert `validate.ts` changes (auto-recovery is additive, safe to remove)
4. **Phase 4**: Revert `checkAuthStatus` changes

---

## 6. Files Modified

| Phase | File | Change |
|-------|------|--------|
| 1 | Database | SQL insert for `public.user`, update `auth.users` metadata |
| 2 | `useAccountProfilePageLogic.js` | Add UUID detection (~line 545) |
| 2 | `auth.js` | Add `isSupabaseUUID()` helper function |
| 3 | `validate.ts` | Add auto-recovery logic (~line 130) |
| 4 | `auth.js` | Modify `checkAuthStatus()` to handle orphaned OAuth |
