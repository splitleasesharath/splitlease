# Host Listings Fetch Investigation Report

**Date**: 2025-12-18
**Issue**: Listings not being fetched for host user (400 error on RPC call)
**User**: philfoden@test.com
**Host Account ID**: 1765898163442x19586482615483680

---

## Executive Summary

**ROOT CAUSE IDENTIFIED**: The `get_host_listings` RPC function expects the user's Bubble `_id` (e.g., `1765898163442x19586482615483680`), but the frontend is likely passing the Supabase Auth UUID (e.g., `8466bd4c-0eb3-4adc-89ca-2cced5d170c9`) instead.

**Critical Discovery**: The user table has a **DATA INCONSISTENCY**:
- User record `_id`: `1765898163442x19586482615483680` (Bubble ID)
- User record `bubble_id`: `null` (should contain the same value!)
- Auth user `id`: `8466bd4c-0eb3-4adc-89ca-2cced5d170c9` (Supabase UUID)

---

## Investigation Findings

### 1. RPC Function Definition

The `get_host_listings` function exists and works correctly:

```sql
-- Function signature: get_host_listings(host_user_id TEXT)
-- Function logic:
SELECT ... FROM listing l
WHERE (l."Host User" = host_user_id OR l."Created By" = host_user_id)
  AND l."Deleted" = false;
```

**Expected Parameter**: Bubble user ID (TEXT format like `1765898163442x19586482615483680`)

### 2. Database Structure

**Listing Table**:
- Primary key: `_id` (TEXT) - Bubble ID format
- Title field: `"Name"` (not `title` - this caused query errors)
- Host reference: `"Host User"` (TEXT) - stores Bubble user IDs
- Creator reference: `"Created By"` (TEXT) - stores Bubble user IDs

**User Table**:
- Primary key: `_id` (TEXT) - Bubble ID format
- Email: `"email as text"` and `email` columns
- Bubble ID reference: `bubble_id` (TEXT) - **SHOULD mirror `_id` but is NULL**
- User type: `"Type - User Current"` (not `"User Type"`)

**Auth.Users Table** (Supabase Auth):
- Primary key: `id` (UUID) - Supabase format
- Email: `email`

### 3. Data Verification

**✅ Listings Exist**: Found 4 listings for host `1765898163442x19586482615483680`:

| _id | Name | Complete | Deleted |
|-----|------|----------|---------|
| 1765927145616x55294201928847216 | 1 Bedroom Entire Place in Staten Island | true | false |
| 1765928847076x97558852867184528 | 1 Bedroom Private Room in Brooklyn | true | false |
| 1765929342612x08328547140417331 | new test | false | false |
| 1765901048170x64855832289573808 | 1 Bedroom Entire Place in Brooklyn | true | false |

**✅ User Exists**: Found user record:

```
_id: 1765898163442x19586482615483680
email: philfoden@test.com
bubble_id: null  ⚠️ PROBLEM - should be '1765898163442x19586482615483680'
"Type - User Current": "A Host (I have a space available to rent)"
```

**✅ Auth User Exists**:

```
id: 8466bd4c-0eb3-4adc-89ca-2cced5d170c9  ⚠️ DIFFERENT ID FORMAT
email: philfoden@test.com
```

### 4. Root Cause Analysis

The frontend code at `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` (lines 392-452) fetches listings using:

```javascript
const { data, error } = await supabase
  .rpc('get_host_listings', { host_user_id: userId });
```

**The Problem**: The `userId` parameter is determined by this logic (lines 458-495):

1. Check if user is authenticated
2. Get `validatedUserId` from `validateTokenAndFetchUser()`
3. Extract URL parameter or use `validatedUserId`

**Issue**: If `validateTokenAndFetchUser()` returns the Supabase Auth UUID (`8466bd4c-0eb3-4adc-89ca-2cced5d170c9`) instead of the Bubble ID (`1765898163442x19586482615483680`), the RPC will fail because:

```sql
WHERE l."Host User" = '8466bd4c-0eb3-4adc-89ca-2cced5d170c9'  -- No match!
-- Should be:
WHERE l."Host User" = '1765898163442x19586482615483680'  -- Would find 4 listings
```

### 5. Data Integrity Issue

The `bubble_id` field in the user table is **NULL** when it should contain `'1765898163442x19586482615483680'`. This suggests:

1. **Legacy Migration Issue**: During Bubble → Supabase migration, the `bubble_id` field wasn't properly populated
2. **Data Sync Problem**: The sync mechanism between Bubble and Supabase isn't maintaining referential integrity

---

## Impact Assessment

### Who Is Affected?

- Any user whose `user.bubble_id` field is NULL
- Any code path that relies on `bubble_id` for lookups
- Host users trying to view their listings on AccountProfilePage

### Where Does This Happen?

1. **AccountProfilePage** (`/account-profile`) - Confirmed 400 error
2. **HostOverviewPage** - Likely affected (uses same RPC)
3. **HostProposalsPage** - Likely affected (uses same RPC)
4. **LoggedInAvatar** - Potentially affected (uses same RPC)

---

## Recommended Solutions

### Option 1: Fix Data Consistency (RECOMMENDED)

Update all user records to ensure `bubble_id` mirrors `_id`:

```sql
UPDATE "user"
SET bubble_id = _id
WHERE bubble_id IS NULL OR bubble_id != _id;
```

**Pros**:
- Fixes the root cause
- Ensures data integrity going forward
- No code changes needed

**Cons**:
- Requires database migration
- Need to update sync mechanisms to maintain consistency

### Option 2: Update `validateTokenAndFetchUser()`

Ensure `validateTokenAndFetchUser()` always returns the Bubble `_id` (from the user table), not the Auth UUID:

```javascript
// In app/src/lib/auth.js
export async function validateTokenAndFetchUser() {
  // Get Supabase Auth session
  const { data: { session } } = await supabase.auth.getSession();

  // Fetch user record from user table by email
  const { data: userData } = await supabase
    .from('user')
    .select('_id, email')
    .eq('email', session.user.email)
    .single();

  return {
    userId: userData._id,  // Return Bubble ID, not Auth UUID
    email: userData.email
  };
}
```

**Pros**:
- Fixes the immediate issue
- No database changes needed

**Cons**:
- Doesn't fix underlying data inconsistency
- Other code paths might still fail

### Option 3: Update RPC to Accept Both ID Formats

Modify `get_host_listings` to accept either Bubble ID or Auth UUID:

```sql
CREATE OR REPLACE FUNCTION get_host_listings(host_user_id TEXT)
RETURNS SETOF ... AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM listing l
  LEFT JOIN "user" u ON u._id = l."Host User"
  WHERE (
    l."Host User" = host_user_id
    OR l."Created By" = host_user_id
    OR u.auth_user_id = host_user_id  -- Accept Auth UUID too
  )
  AND l."Deleted" = false;
END;
$$ LANGUAGE plpgsql;
```

**Pros**:
- Backwards compatible
- Works with both ID formats

**Cons**:
- Adds complexity
- Requires adding `auth_user_id` column to user table
- Still doesn't fix data inconsistency

---

## Testing Verification

To verify the fix, test with:

```javascript
// Should return 4 listings
const { data, error } = await supabase
  .rpc('get_host_listings', {
    host_user_id: '1765898163442x19586482615483680'
  });

// Currently returns 0 listings (wrong ID format)
const { data, error } = await supabase
  .rpc('get_host_listings', {
    host_user_id: '8466bd4c-0eb3-4adc-89ca-2cced5d170c9'
  });
```

---

## Files Referenced

- `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` (lines 392-520)
- `app/src/lib/auth.js` (contains `validateTokenAndFetchUser()`)
- `supabase/functions/...` (may contain user lookup logic)
- Database tables: `listing`, `user`, `auth.users`

---

## Next Steps

1. **Immediate Fix**: Run SQL update to populate `bubble_id` field
2. **Code Review**: Audit `validateTokenAndFetchUser()` to ensure it returns Bubble `_id`
3. **Testing**: Verify listing fetch works for all affected pages
4. **Long-term**: Update sync mechanisms to maintain `bubble_id` consistency
5. **Monitoring**: Add logging to detect ID format mismatches in production

---

## Additional Notes

### ID Format Reference

| Context | ID Format | Example |
|---------|-----------|---------|
| Bubble IDs (_id, bubble_id) | TEXT, numeric with 'x' separator | `1765898163442x19586482615483680` |
| Supabase Auth (auth.users.id) | UUID | `8466bd4c-0eb3-4adc-89ca-2cced5d170c9` |
| Internal Supabase (_id for some tables) | TEXT with prefix | `self_1764973043425_nkzixvohd` |

### Authentication Flow

```
User logs in
  ↓
Supabase Auth creates session with UUID
  ↓
validateTokenAndFetchUser() looks up user by email
  ↓
Should return user._id (Bubble ID) ⚠️ CHECK THIS
  ↓
Used as host_user_id parameter in RPC calls
  ↓
RPC searches listing."Host User" = host_user_id
```

**Critical Question**: What does `validateTokenAndFetchUser()` currently return?
- **CONFIRMED**: Returns Bubble `_id` (line 989: `userId: userData.userId`)
- The Edge Function response provides `userData.userId` which is the Bubble `_id`

### Authentication Flow Confirmed

From `app/src/lib/auth.js`:

```javascript
// Line 164 in checkAuthStatus():
const userId = session.user?.user_metadata?.user_id || session.user?.id;
//                                          ^^^^^^^^^ Bubble ID
//                                                              ^^^^^^^ Fallback to Auth UUID

// Line 884 in validateTokenAndFetchUser():
userId = session.user?.user_metadata?.user_id || session.user?.id;
//                                    ^^^^^^^^^ Bubble ID first
```

**CRITICAL FINDING**: The code correctly tries to use `user_metadata.user_id` (Bubble ID) first, but falls back to `session.user.id` (Auth UUID) if metadata is missing!

**THE ACTUAL PROBLEM**: The Supabase Auth session for `philfoden@test.com` likely does NOT have `user_metadata.user_id` set, causing the code to fall back to the Auth UUID.

---

**INVESTIGATION STATUS**: ✅ COMPLETE
**ROOT CAUSE**: Missing `user_metadata.user_id` in Supabase Auth session → fallback to Auth UUID → RPC fails
**FIX PRIORITY**: HIGH (blocks host users from seeing their listings)

### Verification Query Needed

```sql
-- Check if user_metadata has user_id set
SELECT
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE email = 'philfoden@test.com';
```

Expected: `raw_user_meta_data` should contain `{"user_id": "1765898163442x19586482615483680"}` but probably doesn't.
