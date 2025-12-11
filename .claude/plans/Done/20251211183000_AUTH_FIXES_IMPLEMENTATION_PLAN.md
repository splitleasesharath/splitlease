# Auth Fixes Implementation Plan

**Generated**: 2025-12-11 18:30:00
**Status**: Ready for Implementation
**Priority**: High

---

## Overview

This plan addresses three related authentication issues:
1. **Login Profile Fetch Error** - Column naming mismatch in Edge Function
2. **Logout Not Working** - Page not refreshing after logout
3. **Signup Popup Persists** - Cascading from login error

---

## Issue 1: Login Profile Fetch Error

### Root Cause
The Edge Function `auth-user/handlers/login.ts` uses incorrect column names when querying the Bubble `user` table.

### Current Code (login.ts:84)
```typescript
.select('_id, email, "First Name", "Last Name", "Profile Photo", "Account - Host / Landlord"')
```

### Required Change
```typescript
.select('_id, email, "Name - First", "Name - Last", "Profile Photo", "Account - Host / Landlord"')
```

### Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `supabase/functions/auth-user/handlers/login.ts` | 84 | Change `"First Name"` → `"Name - First"` |
| `supabase/functions/auth-user/handlers/login.ts` | 84 | Change `"Last Name"` → `"Name - Last"` |
| `supabase/functions/auth-user/handlers/login.ts` | 117 | Change `userProfile?.['First Name']` → `userProfile?.['Name - First']` |
| `supabase/functions/auth-user/handlers/login.ts` | 118 | Change `userProfile?.['Last Name']` → `userProfile?.['Name - Last']` |

### Implementation Steps
1. Open `supabase/functions/auth-user/handlers/login.ts`
2. Line 84: Update select query column names
3. Lines 117-118: Update field accessors in return statement
4. Deploy Edge Function: `supabase functions deploy auth-user`

---

## Issue 2: Logout Not Working

### Root Cause Analysis
The `onAuthStateChange` listener in Header.jsx (added in commit 52513b0) causes an immediate UI update when `SIGNED_OUT` fires. This may interfere with the page reload.

### Current Flow
```
handleSignOut() → onLogout() [not awaited] → handleLogout() → logoutUser() → window.location.reload()
```

### Problem
When `supabase.auth.signOut()` is called, the `onAuthStateChange` listener fires `SIGNED_OUT`, which sets `currentUser` to `null`. This triggers a re-render that unmounts `LoggedInAvatar`. The `handleLogout` async function continues running but the component that initiated it is gone.

### Solution
Make `handleSignOut` async and await `onLogout()` to ensure the logout completes before the component potentially unmounts.

### Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | 328-331 | Make `handleSignOut` async and await `onLogout()` |

### Current Code (LoggedInAvatar.jsx:328-331)
```javascript
const handleSignOut = () => {
  setIsOpen(false);
  onLogout();
};
```

### Required Change
```javascript
const handleSignOut = async () => {
  setIsOpen(false);
  await onLogout();
};
```

### Implementation Steps
1. Open `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
2. Line 328: Change `const handleSignOut = () => {` to `const handleSignOut = async () => {`
3. Line 330: Change `onLogout();` to `await onLogout();`

---

## Issue 3: Signup Popup Persists

### Root Cause
This is a cascading effect from Issue 1. When login fails due to the profile fetch error, the Edge Function returns an error, and the modal stays open because `result.success` is `false`.

### Solution
Fixing Issue 1 will resolve this issue. No additional changes needed.

---

## Implementation Order

1. **Fix login.ts column names** (Issue 1) - Backend fix
2. **Deploy Edge Function** - `supabase functions deploy auth-user`
3. **Fix handleSignOut async/await** (Issue 2) - Frontend fix
4. **Test login flow** - Verify modal closes and user appears logged in
5. **Test logout flow** - Verify page refreshes and user appears logged out

---

## Testing Plan

### Login Test
1. Navigate to any page with login modal
2. Enter valid credentials
3. Click Login
4. **Expected**: Modal closes, page reloads, user avatar appears in header

### Logout Test
1. While logged in, click avatar dropdown
2. Click "Sign Out"
3. **Expected**: Page reloads, login/signup buttons appear in header

### Protected Page Test
1. While logged in, navigate to `/guest-proposals`
2. Click "Sign Out"
3. **Expected**: Redirect to homepage (not reload)

---

## Deployment Checklist

- [ ] Update `login.ts` column names
- [ ] Deploy Edge Function: `supabase functions deploy auth-user`
- [ ] Update `LoggedInAvatar.jsx` handleSignOut
- [ ] Build frontend (if applicable)
- [ ] Test login on staging/production
- [ ] Test logout on staging/production
- [ ] Git commit changes

---

## Rollback Plan

If issues persist after deployment:
1. Revert Edge Function: `supabase functions deploy auth-user --version <previous>`
2. Revert frontend changes via git
3. Investigate further using browser console logs

---

## Related Files

### Backend
- `supabase/functions/auth-user/handlers/login.ts` - Login handler
- `supabase/functions/auth-user/handlers/logout.ts` - Logout handler (no changes needed)

### Frontend
- `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` - Avatar dropdown
- `app/src/islands/shared/Header.jsx` - Header with onAuthStateChange listener
- `app/src/islands/shared/SignUpLoginModal.jsx` - Auth modal
- `app/src/lib/auth.js` - Auth utilities
- `app/src/lib/secureStorage.js` - Token storage

---

## Notes

- The `onAuthStateChange` listener in Header.jsx (commit 52513b0) is intentional and should NOT be removed - it provides reactive UI updates when auth state changes from any source
- The async/await fix in LoggedInAvatar ensures the logout completes before React potentially unmounts the component
- The column naming issue in login.ts is a simple mapping error that doesn't require schema changes

---

**Estimated Time**: 15-30 minutes
**Risk Level**: Low - targeted fixes with no architectural changes
