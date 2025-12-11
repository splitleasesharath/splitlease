# Auth Issues Analysis Report

**Generated**: 2025-12-11 18:00:00
**Status**: Analysis Complete - Pending Implementation

---

## Executive Summary

Three related authentication issues were identified:
1. **Login Profile Fetch Error** - Column naming mismatch in Edge Function
2. **Logout Not Working** - Page not refreshing after logout
3. **Signup Popup Persists After Login** - Likely related to page refresh timing

---

## Issue 1: Login Profile Fetch Error

### Error Message
```
[login] Profile fetch error: column user.First Name does not exist
```

### Root Cause
The Edge Function `auth-user/handlers/login.ts` at **line 84** uses incorrect column names:

```typescript
.select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
```

But the actual Bubble `user` table schema uses:
- `Name - First` (NOT `First Name`)
- `Name - Last` (NOT `Last Name`)

### Affected File
- `supabase/functions/auth-user/handlers/login.ts:84`

### Fix Required
Change the select query from:
```typescript
.select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
```
To:
```typescript
.select('_id, email, "Name - First", "Name - Last", "Profile Photo", "Account - Host / Landlord"')
```

Also update the return statement at **lines 117-119**:
```typescript
// From
firstName: userProfile?.['First Name'] || '',
lastName: userProfile?.['Last Name'] || '',

// To
firstName: userProfile?.['Name - First'] || '',
lastName: userProfile?.['Name - Last'] || '',
```

---

## Issue 2: Logout Not Working

### Observed Behavior
After clicking logout, user still appears logged in.

### Root Cause Analysis
The logout flow in `app/src/lib/auth.js` at **line 1054** (`logoutUser` function) does the following:
1. Signs out from Supabase Auth client (`supabase.auth.signOut()`)
2. Calls Edge Function `auth-user` with action `logout`
3. Clears auth data via `clearAuthData()`

However, the `clearAuthData()` function (in `secureStorage.js:207`) clears:
- Secure storage tokens
- Public state
- Legacy keys
- Supabase auth keys
- Cookies

**The issue is that the page is NOT automatically refreshed after logout.** The `logoutUser` function returns without triggering a page reload, so the UI remains in its previous logged-in state.

### Affected Files
- `app/src/lib/auth.js:1053-1116` - `logoutUser()` function
- Consumer components that call `logoutUser()` need to handle the page refresh

### Fix Required
The component that calls `logoutUser()` must refresh the page after logout completes. Looking at where logout is typically called from (Header or LoggedInAvatar), it should trigger a page reload:

```javascript
const handleLogout = async () => {
  await logoutUser();
  window.location.reload(); // Or redirect to home
};
```

---

## Issue 3: Signup Popup Persists After Login

### Observed Behavior
After successful login, the SignUpLoginModal remains visible.

### Root Cause Analysis
Looking at `SignUpLoginModal.jsx`, the login success flow at **lines 688-723**:

```jsx
if (result.success) {
  // ...
  if (onAuthSuccess) {
    onAuthSuccess(result);
  }
  onClose();  // <-- Modal should close
  if (!skipReload) {
    window.location.reload();  // <-- Page should reload
  }
}
```

The modal IS designed to close and reload the page. However, if the login returns an error due to Issue #1 (profile fetch fails), the login might be returning `success: false` even though authentication succeeded.

### Connection to Issue 1
The Edge Function error occurs AFTER successful Supabase Auth but BEFORE returning data. Looking at `login.ts:88-91`:

```typescript
if (profileError) {
  console.error(`[login] Profile fetch error:`, profileError.message);
  // Don't fail login - user might exist in auth but not in public.user yet
}
```

The code is designed to NOT fail on profile error, so this shouldn't block login. However, if the query itself throws an exception (rather than returning an error), it could cause the entire function to fail.

### Likely Sequence
1. User enters credentials
2. Supabase Auth succeeds
3. Profile fetch query with wrong column names throws an error
4. Edge Function returns 500 error
5. Frontend receives error, shows error toast, keeps modal open
6. User appears logged in (Supabase session was set) but modal doesn't close

---

## Files to Modify

### Priority 1: Fix Column Names
| File | Line | Change |
|------|------|--------|
| `supabase/functions/auth-user/handlers/login.ts` | 84 | `"First Name"` → `"Name - First"`, `"Last Name"` → `"Name - Last"` |
| `supabase/functions/auth-user/handlers/login.ts` | 117-118 | Update field accessors to match |

### Priority 2: Ensure Logout Refreshes
| File | Line | Change |
|------|------|--------|
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | (logout handler) | Add `window.location.reload()` after `logoutUser()` |

---

## Deployment Notes

After fixing `login.ts`:
```bash
supabase functions deploy auth-user
```

---

## References

- Edge Function: `supabase/functions/auth-user/handlers/login.ts`
- Frontend Auth: `app/src/lib/auth.js`
- Secure Storage: `app/src/lib/secureStorage.js`
- Login Modal: `app/src/islands/shared/SignUpLoginModal.jsx`
- Database Schema: `.claude/plans/New/20251210_USER_TABLE_SCHEMA_ANALYSIS.md`
