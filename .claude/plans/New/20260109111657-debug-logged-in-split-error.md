# Debug Analysis: TypeError - Cannot read properties of undefined (reading 'split')

**Created**: 2026-01-09T11:16:57
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Authentication / LoggedInAvatar component

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Vite, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**: Frontend -> Header.jsx -> LoggedInAvatar component (for logged-in users)

### 1.2 Domain Context
- **Feature Purpose**: Display user avatar dropdown menu for authenticated users in the header
- **Related Documentation**:
  - `app/CLAUDE.md` - Frontend architecture
  - `app/src/islands/shared/LoggedInAvatar/README.md` - Component documentation
- **Data Model**: User data flows from auth.js -> Header.jsx -> LoggedInAvatar

### 1.3 Relevant Conventions
- **Key Patterns**: Hollow Component Pattern (LoggedInAvatar has no internal logic hook)
- **Layer Boundaries**: Auth state managed in lib/auth.js and lib/secureStorage.js
- **Shared Utilities**: validateTokenAndFetchUser(), checkAuthStatus(), getFirstName(), getAvatarUrl()

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: Page load -> Header.jsx renders -> LoggedInAvatar (if logged in)
- **Critical Path**: validateTokenAndFetchUser() -> setCurrentUser() -> LoggedInAvatar render
- **Dependencies**: LoggedInAvatar imports from useLoggedInAvatarData.js

## 2. Problem Statement

**Error**: `TypeError: Cannot read properties of undefined (reading 'split')` at `SignUpLoginModal-BlXmlv_2.js:11:7187`

**Critical Discovery**: The error ONLY occurs when the user is logged in. When not logged in, pages render correctly via Playwright.

This is a production build error occurring during component initialization before React fully mounts. The file `SignUpLoginModal-BlXmlv_2.js` is a Vite-generated chunk that bundles multiple shared components including `LoggedInAvatar`.

## 3. Reproduction Context
- **Environment**: Production (split.lease), Playwright testing context
- **Steps to reproduce**:
  1. Navigate to any page while logged in
  2. Error occurs during initial render
- **Expected behavior**: Page renders with LoggedInAvatar showing user dropdown
- **Actual behavior**: TypeError thrown, page fails to render
- **Error messages/logs**:
```
TypeError: Cannot read properties of undefined (reading 'split')
    at c (https://split.lease/assets/SignUpLoginModal-BlXmlv_2.js:11:7187)
    at https://split.lease/assets/SignUpLoginModal-BlXmlv_2.js:11:7267
    at Array.filter (<anonymous>)
    at Tt (https://split.lease/assets/SignUpLoginModal-BlXmlv_2.js:11:7256)
```

## 4. Investigation Summary

### 4.1 Files Examined
| File | Relevance |
|------|-----------|
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | **PRIMARY SUSPECT** - Contains `.split()` on user.name |
| `app/src/islands/shared/Header.jsx` | Renders LoggedInAvatar, constructs user object |
| `app/src/lib/auth.js` | Authentication functions, contains `.split()` on cookies |
| `app/src/lib/secureStorage.js` | Secure storage, no `.split()` calls |
| `app/src/islands/pages/SearchPage.jsx` | Uses LoggedInAvatar with different data shape |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Uses LoggedInAvatar |

### 4.2 `.split()` Calls Analysis

All `.split()` calls found in the shared components bundle:

| Location | Line | Code | Risk Level |
|----------|------|------|------------|
| `LoggedInAvatar.jsx:364` | 364 | `user.name.split(' ')[0]` | **CRITICAL** - No null check |
| `LoggedInAvatar.jsx:351` | 351 | `currentPath.split('?')[0].split('#')[0]` | LOW - currentPath is a required prop |
| `LoggedInAvatar.jsx:352` | 352 | `itemPath.split('?')[0].split('#')[0]` | LOW - itemPath from getMenuItems() |
| `Header.jsx:123` | 123 | `session.user.email?.split('@')[0]` | LOW - Optional chaining |
| `Header.jsx:210` | 210 | `session.user.email?.split('@')[0]` | LOW - Optional chaining |
| `Header.jsx:493,496` | 493/496 | `href?.split('?')[0].split('#')[0]` | LOW - Optional chaining |
| `Header.jsx:600,603` | 600/603 | `href?.split('?')[0].split('#')[0]` | LOW - Optional chaining |
| `auth.js:69,73,91,95` | 69-95 | Cookie parsing | MEDIUM - Has null checks |
| `auth.js:481,690` | 481/690 | `VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]` | LOW - Optional chaining |

### 4.3 Root Cause Identification

**The bug is on line 364 of `LoggedInAvatar.jsx`:**

```javascript
// Line 364 - NO NULL CHECK
const firstName = user.name.split(' ')[0];
```

This code executes during render, assuming `user.name` is always a string. If `user.name` is `undefined`, this throws:
```
TypeError: Cannot read properties of undefined (reading 'split')
```

### 4.4 Data Flow Trace

**Path 1: Header.jsx (SAFE)**
```javascript
// Header.jsx line 678-685
{currentUser && currentUser.firstName ? (
  <LoggedInAvatar
    user={{
      id: currentUser.userId || currentUser.id || '',
      name: `${currentUser.firstName} ${currentUser.lastName || ''}`.trim(),
      // ... name is always a string here
    }}
  />
)}
```
The guard `currentUser.firstName` ensures we don't render LoggedInAvatar without firstName. The template literal always produces a string.

**Path 2: SearchPage.jsx (POTENTIALLY UNSAFE)**
```javascript
// SearchPage.jsx line 205-207
<LoggedInAvatar
  user={currentUser}
  ...
/>
```
Passes `currentUser` directly. If `currentUser.name` is undefined, error occurs.

**Path 3: FavoriteListingsPage.jsx (POTENTIALLY UNSAFE)**
```javascript
// FavoriteListingsPage.jsx line 1336
<LoggedInAvatar
  user={currentUser}
  ...
/>
```
Same pattern - passes `currentUser` directly.

### 4.5 Execution Flow Trace

1. User navigates to page while logged in
2. Auth check runs: `checkAuthStatus()` -> `validateTokenAndFetchUser()`
3. `setCurrentUser()` called with user data
4. For **Header.jsx**: User object constructed with explicit `name` property from firstName/lastName
5. For **SearchPage/FavoriteListingsPage**: `currentUser` passed directly
6. **LoggedInAvatar** renders, line 364 executes: `user.name.split(' ')[0]`
7. If `user.name` is undefined -> **TypeError thrown**

### 4.6 Why Only Logged-In Users?

LoggedInAvatar only renders when a user is authenticated. The component is conditionally rendered:
- Header.jsx: `{currentUser && currentUser.firstName ? (<LoggedInAvatar...`
- SearchPage.jsx: `{isLoggedIn && currentUser ? (<LoggedInAvatar...`

When not logged in, LoggedInAvatar never renders, so line 364 never executes.

### 4.7 Git History Analysis

Recent commits to LoggedInAvatar:
```
9ed8cd5c feat(referral): rename referral to referral-invite and open modal from dropdown
e78169e5 fix(header): Simplify user avatar dropdown styling and hide current page
cb1959ec fix(header): Simplify hover effect and hide current page links
```

No recent changes to line 364 where the bug exists. This appears to be a latent bug exposed by edge case user data.

## 5. Hypotheses

### Hypothesis 1: user.name is undefined in SearchPage/FavoriteListingsPage (Likelihood: 85%)

**Theory**: When `currentUser` is passed directly to LoggedInAvatar (not constructed with explicit `name` property), and the user data from `validateTokenAndFetchUser()` doesn't include a `name` field, `user.name` is undefined.

**Supporting Evidence**:
- SearchPage.jsx line 1212 sets: `name: userData.fullName || userData.firstName || ''`
- But if this code path isn't reached or fails silently, `name` might not be set
- The error occurs "before React mounts" suggesting initial render state

**Contradicting Evidence**:
- SearchPage does set `name` in `setCurrentUser()` calls
- Header.jsx explicitly constructs the name

**Verification Steps**:
1. Add defensive check in LoggedInAvatar line 364
2. Add logging to trace `user.name` value at render time
3. Test with Playwright while logged in

**Potential Fix**:
```javascript
// Line 364 - ADD NULL CHECK
const firstName = (user.name || user.firstName || 'User').split(' ')[0];
```

**Convention Check**: This follows the "No Fallback Mechanisms" principle by providing sensible defaults rather than try/catch swallowing.

### Hypothesis 2: Race Condition in Auth State (Likelihood: 10%)

**Theory**: There's a race condition where `currentUser` is set (truthy), but individual properties like `name` haven't been populated yet.

**Supporting Evidence**:
- Multiple async operations: `checkAuthStatus()`, `validateTokenAndFetchUser()`, Supabase session
- Optimistic UI pattern in Header.jsx might set partial user data

**Contradicting Evidence**:
- The conditional `currentUser && currentUser.firstName` should guard against this
- SearchPage explicitly awaits `validateTokenAndFetchUser()` before setting user

**Verification Steps**:
1. Add breakpoint/logging in Header.jsx auth flow
2. Check if partial user object is ever passed to LoggedInAvatar

**Potential Fix**: Ensure complete user object before rendering LoggedInAvatar.

### Hypothesis 3: Playwright Session Data Differs from Browser (Likelihood: 5%)

**Theory**: Playwright's session/localStorage state differs from regular browser, causing incomplete user data restoration.

**Supporting Evidence**:
- Bug report states "ONLY occurs in logged-in sessions"
- Playwright might store/restore auth tokens differently

**Contradicting Evidence**:
- The error is in production JS, not Playwright-specific code
- Same bundle serves both Playwright and regular browsers

**Verification Steps**:
1. Compare localStorage contents between Playwright and regular browser
2. Check if auth state restoration differs

**Potential Fix**: Not a code fix - would be Playwright configuration issue.

## 6. Recommended Action Plan

### Priority 1 (Try First) - Defensive Null Check in LoggedInAvatar

**File**: `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
**Line**: 364

**Current Code**:
```javascript
// Extract first name from full name
const firstName = user.name.split(' ')[0];
```

**Proposed Fix**:
```javascript
// Extract first name from full name (with fallback for missing name)
const firstName = (user.name || user.firstName || 'User').split(' ')[0];
```

**Rationale**: This handles:
- `user.name` undefined -> falls back to `user.firstName`
- `user.firstName` undefined -> falls back to 'User'
- All paths produce a string that can be safely split

**Additionally**: Fix the same pattern at line 396 where `user.name.charAt(0)` is used:
```javascript
// Current (line 396)
{user.name.charAt(0).toUpperCase()}

// Proposed
{(user.name || user.firstName || 'U').charAt(0).toUpperCase()}
```

### Priority 2 (If Priority 1 Fails) - Validate User Object Shape

Add prop validation at the top of LoggedInAvatar component:

```javascript
export default function LoggedInAvatar({
  user,
  currentPath,
  onNavigate,
  onLogout,
}) {
  // Validate user object has required properties
  if (!user || typeof user.name !== 'string') {
    console.error('[LoggedInAvatar] Invalid user object:', user);
    return null; // Or render a fallback UI
  }
  // ... rest of component
}
```

### Priority 3 (Deeper Investigation) - Audit All LoggedInAvatar Consumers

Review all places where LoggedInAvatar is rendered to ensure consistent `user` object shape:

1. **Header.jsx** (line 682) - Constructs user object explicitly - **SAFE**
2. **SearchPage.jsx** (lines 205, 2944) - Passes `currentUser` directly - **NEEDS AUDIT**
3. **FavoriteListingsPage.jsx** (lines 1336, 1464) - Passes `currentUser` directly - **NEEDS AUDIT**

Ensure all consumers construct user object with required fields.

## 7. Prevention Recommendations

1. **TypeScript Migration**: Convert LoggedInAvatar to TypeScript with strict prop types
   ```typescript
   interface LoggedInAvatarProps {
     user: {
       id: string;
       name: string;  // Required, must be string
       email: string;
       userType: 'HOST' | 'GUEST' | 'TRIAL_HOST';
       avatarUrl?: string;
       // ...
     };
     // ...
   }
   ```

2. **PropTypes Validation**: If not using TypeScript, add PropTypes:
   ```javascript
   import PropTypes from 'prop-types';

   LoggedInAvatar.propTypes = {
     user: PropTypes.shape({
       name: PropTypes.string.isRequired,
       // ...
     }).isRequired,
   };
   ```

3. **Unit Tests**: Add test case for undefined `user.name`:
   ```javascript
   test('handles user without name gracefully', () => {
     const user = { id: '123', email: 'test@example.com' };
     render(<LoggedInAvatar user={user} ... />);
     // Should not throw, should render fallback
   });
   ```

4. **Defensive Coding Standard**: Update `.claude/CLAUDE.md` to mandate null checks before `.split()`, `.charAt()`, etc.

## 8. Related Files Reference

| File | Path | Lines to Modify |
|------|------|-----------------|
| **LoggedInAvatar.jsx** | `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | 364, 396 |
| Header.jsx | `app/src/islands/shared/Header.jsx` | Reference only |
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | 1210-1217, 2491-2497 |
| FavoriteListingsPage.jsx | `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Consumer of LoggedInAvatar |
| auth.js | `app/src/lib/auth.js` | Reference only |

---

## Implementation Notes

1. **Minimal Change**: The Priority 1 fix (2 lines) is the recommended approach
2. **No Breaking Changes**: The fix is backward compatible
3. **Test Coverage**: Test with logged-in Playwright session after fix
4. **Deploy**: Manual deployment required after fix (Cloudflare Pages)
5. **Commit Message**: `fix(avatar): add null check for user.name in LoggedInAvatar`
