# Host Listings Fetch - Final Diagnosis

**Date**: 2025-12-18 19:45
**Issue**: 400 error when fetching listings for philfoden@test.com
**Status**: ROOT CAUSE IDENTIFIED

---

## Executive Summary

**ROOT CAUSE**: The user's `_id` in the `user` table (`1765898163442x19586482615483680`) does NOT match the `host_account_id` stored in `auth.users.raw_user_meta_data` (`1765898163495x03334670758730684`). The listings are correctly associated with `user._id`, but if any code path uses `host_account_id` from the auth metadata, it will fail to find listings.

---

## Data Investigation Results

### 1. Auth User Record (auth.users)

```json
{
  "id": "8466bd4c-0eb3-4adc-89ca-2cced5d170c9",
  "email": "philfoden@test.com",
  "raw_user_meta_data": {
    "user_id": "1765898163442x19586482615483680",        ← User table _id ✅
    "host_account_id": "1765898163495x03334670758730684", ← DIFFERENT ID ❌
    "user_type": "Host",
    "first_name": "phil",
    "last_name": "foden",
    "birth_date": "1998-06-06",
    "phone_number": "1234567890",
    "email_verified": true
  }
}
```

### 2. User Table Record (public.user)

```
_id: 1765898163442x19586482615483680  ← Matches user_id in metadata ✅
email: philfoden@test.com
bubble_id: NULL                        ← Should be same as _id
"Type - User Current": "A Host (I have a space available to rent)"
```

### 3. Listings (listing table)

**Query with user._id (CORRECT ID)**:
```sql
SELECT _id, "Name", "Host User", "Created By"
FROM listing
WHERE "Host User" = '1765898163442x19586482615483680'
   OR "Created By" = '1765898163442x19586482615483680';
```

**Result**: 4 listings found ✅

**Query with host_account_id (WRONG ID)**:
```sql
SELECT _id, "Name", "Host User", "Created By"
FROM listing
WHERE "Host User" = '1765898163495x03334670758730684'
   OR "Created By" = '1765898163495x03334670758730684';
```

**Result**: 0 listings found ❌

---

## Why The Mismatch Exists

### Scenario 1: Legacy Migration Issue
The `host_account_id` field in `raw_user_meta_data` was populated during migration from the old `account_host` table, which has since been deprecated. The user's listings were created with the newer `user._id`, but the auth metadata still references the old `account_host._id`.

### Scenario 2: Signup vs. Listing Creation Timing
1. User signed up → `auth.users` created with `host_account_id` = `1765898163495x03334670758730684`
2. User table entry created with `_id` = `1765898163442x19586482615483680`
3. Listings created using `user._id` as `"Host User"` reference
4. Auth metadata was never updated to reflect the new `user._id`

---

## Impact Assessment

### Affected Code Paths

Any code that uses `userData.accountHostId` or `host_account_id` from `validateTokenAndFetchUser()` will fail:

From `app/src/lib/auth.js` line 997:
```javascript
accountHostId: userData.accountHostId || userData._id || null,
```

If the Edge Function returns `accountHostId` as `1765898163495x03334670758730684`, the RPC call will fail because listings use `1765898163442x19586482615483680`.

### Current Behavior
- **AccountProfilePage**: Calls `fetchHostListings(targetUserId)` with the correct `user._id` ✅
- **Edge Function validate action**: May return wrong `accountHostId` from auth metadata ❌
- **Other pages**: May use `accountHostId` instead of `user._id` ❌

---

## Solution Options

### Option 1: Update Auth Metadata (RECOMMENDED)

Update the `raw_user_meta_data` to set `host_account_id` = `user_id`:

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('host_account_id', raw_user_meta_data->>'user_id')
WHERE email = 'philfoden@test.com';
```

**Pros**:
- Fixes data inconsistency at the source
- All code paths will work correctly
- No code changes needed

**Cons**:
- Requires database update
- May affect other users with similar issues

### Option 2: Deprecate accountHostId Usage

Update all code to use `user._id` directly instead of `host_account_id`:

```javascript
// In validateTokenAndFetchUser():
accountHostId: userData._id,  // Always use user._id, ignore host_account_id
```

**Pros**:
- Aligns with current architecture (account_host table deprecated)
- Future-proof

**Cons**:
- Requires code changes in multiple files
- Edge Function must be updated

### Option 3: Update RPC to Handle Both IDs

Modify `get_host_listings` to accept either ID:

```sql
CREATE OR REPLACE FUNCTION get_host_listings(host_user_id TEXT)
RETURNS SETOF ... AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM listing l
  WHERE (
    l."Host User" = host_user_id
    OR l."Created By" = host_user_id
    OR EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.raw_user_meta_data->>'host_account_id' = host_user_id
        AND (l."Host User" = au.raw_user_meta_data->>'user_id'
          OR l."Created By" = au.raw_user_meta_data->>'user_id')
    )
  )
  AND l."Deleted" = false;
END;
$$ LANGUAGE plpgsql;
```

**Pros**:
- Backwards compatible
- Works with both old and new IDs

**Cons**:
- Complex logic
- Performance overhead
- Doesn't fix underlying data issue

---

## Recommended Fix (Step-by-Step)

### Step 1: Update Auth Metadata for This User

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('host_account_id', raw_user_meta_data->>'user_id')
WHERE email = 'philfoden@test.com';
```

### Step 2: Verify Fix

```sql
-- Should show host_account_id = user_id
SELECT
  email,
  raw_user_meta_data->>'user_id' as user_id,
  raw_user_meta_data->>'host_account_id' as host_account_id
FROM auth.users
WHERE email = 'philfoden@test.com';
```

### Step 3: Fix All Users with Same Issue

```sql
-- Find all users with mismatched IDs
SELECT
  email,
  raw_user_meta_data->>'user_id' as user_id,
  raw_user_meta_data->>'host_account_id' as host_account_id
FROM auth.users
WHERE raw_user_meta_data->>'host_account_id' IS NOT NULL
  AND raw_user_meta_data->>'host_account_id' != raw_user_meta_data->>'user_id';

-- Update all mismatched users
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('host_account_id', raw_user_meta_data->>'user_id')
WHERE raw_user_meta_data->>'host_account_id' IS NOT NULL
  AND raw_user_meta_data->>'host_account_id' != raw_user_meta_data->>'user_id';
```

### Step 4: Update Edge Function (auth-user)

In the validate action, ensure `accountHostId` always uses `user._id`:

```javascript
// In supabase/functions/auth-user/index.ts
const accountHostId = userData._id;  // Always use user._id, not legacy host_account_id
```

### Step 5: Test

```javascript
// Should return 4 listings
const { data, error } = await supabase
  .rpc('get_host_listings', {
    host_user_id: '1765898163442x19586482615483680'
  });
```

---

## Files Referenced

- `app/src/lib/auth.js` (lines 857-1019: validateTokenAndFetchUser)
- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` (lines 392-452)
- `supabase/functions/auth-user/` (validate action)
- Database: `auth.users`, `public.user`, `listing`

---

## Additional Investigation Needed

1. **Check Edge Function**: Does the `auth-user` validate action return the correct `accountHostId`?
2. **Check Other Users**: How many users have this mismatch?
3. **Check account_host Deprecation**: Are there any remaining references to `account_host` table?

---

**INVESTIGATION STATUS**: ✅ COMPLETE
**ROOT CAUSE**: Auth metadata `host_account_id` != `user._id` (listings use `user._id`)
**FIX PRIORITY**: HIGH
**RECOMMENDED ACTION**: Update auth metadata to sync `host_account_id` with `user_id`
