# Debug Analysis: SignUpLoginModal TypeError in Playwright

**Created**: 2026-01-09 14:58:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: SignUpLoginModal / LoggedInAvatar component bundle

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with independent React roots per HTML page
- **Tech Stack**: React 18, Vite, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**: HTML page loads JSX entry point which mounts React component to #root

### 1.2 Domain Context
- **Feature Purpose**: SignUpLoginModal handles user authentication (login/signup)
- **Related Documentation**:
  - `app/CLAUDE.md` - Frontend architecture
  - `app/src/islands/CLAUDE.md` - Component patterns
- **Data Model**: User authentication via Supabase Auth + legacy Bubble user records

### 1.3 Relevant Conventions
- **Key Patterns**: Hollow Component Pattern, secure storage for auth tokens
- **Layer Boundaries**: Frontend components call Supabase Edge Functions for auth
- **Shared Utilities**: `lib/auth.js`, `lib/secureStorage.js`, `lib/supabase.js`

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: User clicks Login/Signup button in Header
- **Critical Path**: SignUpLoginModal renders -> User completes form -> auth.js handles auth
- **Dependencies**:
  - `Toast.jsx` for notifications
  - `auth.js` for login/signup functions
  - `supabase.js` for Supabase client

## 2. Problem Statement

A `TypeError: Cannot read properties of undefined (reading 'split')` occurs in the production bundle `SignUpLoginModal-BlXmlv_2.js` at position 11:7187 when running in Playwright's headless browser. The error causes the entire React application to fail mounting, resulting in a blank white screen.

**Symptoms:**
- Homepage renders correctly in regular browsers (Chrome, Firefox, Safari)
- Homepage shows blank screen in Playwright headless browser
- All network requests return 200 OK (no loading/network issues)
- JavaScript error crashes React before component can mount

## 3. Reproduction Context
- **Environment**: Playwright headless browser (Chromium-based)
- **Steps to reproduce**:
  1. Navigate to split.lease homepage using Playwright
  2. Wait for page to load
  3. Observe blank white screen instead of homepage
- **Expected behavior**: Homepage renders with header, hero section, listings
- **Actual behavior**: Blank white screen, React fails to mount
- **Error messages/logs**:
  ```
  TypeError: Cannot read properties of undefined (reading 'split')
      at SignUpLoginModal-BlXmlv_2.js:11:7187
      at Array.filter (<anonymous>)
      at Mt (preload-helper-C7YQd10l.js:33:9011)
      at SignUpLoginModal-BlXmlv_2.js:1:296
  ```

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Primary component - NO `.split()` calls found |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | **ROOT CAUSE** - Contains unprotected `.split()` at line 364 |
| `app/src/islands/shared/Header.jsx` | Parent that renders LoggedInAvatar with user prop |
| `app/src/lib/auth.js` | Has protected `.split()` calls with optional chaining |
| `app/dist/assets/SignUpLoginModal-PgbDTeDB.js` | Production bundle containing both components |
| `app/dist/assets/preload-helper-CEl6b2A9.js` | Vite's module preloader |

### 4.2 Execution Flow Trace

1. **Page Load**: HTML page loads, requests JavaScript bundles
2. **Module Loading**: Vite's preload-helper starts loading modules
3. **Bundle Parsing**: `SignUpLoginModal-PgbDTeDB.js` is parsed (contains both SignUpLoginModal AND LoggedInAvatar)
4. **Component Initialization**: LoggedInAvatar component code executes
5. **ERROR**: At line 364, `user.name.split(' ')[0]` is called with `user.name` being undefined
6. **Crash**: Unhandled exception crashes the entire module, React fails to mount

### 4.3 Git History Analysis
- Recent commits focused on referral feature (`e29ed034`, `9ed8cd5c`)
- No recent changes to LoggedInAvatar or SignUpLoginModal
- Issue likely pre-existing but only manifests in Playwright environment

## 5. Hypotheses

### Hypothesis 1: LoggedInAvatar Receives Undefined user.name (Likelihood: 85%)

**Theory**: The `LoggedInAvatar` component has unprotected property access on `user.name`:
```javascript
// Line 364 - UNPROTECTED
const firstName = user.name.split(' ')[0];

// Line 396 - ALSO UNPROTECTED
{user.name.charAt(0).toUpperCase()}
```

In Playwright, during module initialization or in some edge case, the component receives a `user` object where `name` is undefined.

**Supporting Evidence**:
- Stack trace shows error at exact position matching `user.name.split(' ')[0]`
- The minified bundle shows: `const p=o.name.split(" ")[0]` (line 5 of bundle)
- No null/undefined checks exist before these calls

**Contradicting Evidence**:
- Header.jsx checks `currentUser && currentUser.firstName` before rendering LoggedInAvatar
- When rendered, `name` is constructed from `firstName` which is required

**Verification Steps**:
1. Add defensive check: `const firstName = user?.name?.split(' ')[0] || 'User'`
2. Test in Playwright to see if error is resolved

**Potential Fix**:
```javascript
// Line 364
const firstName = user?.name?.split(' ')[0] || '';

// Line 396
{(user?.name?.charAt(0) || '?').toUpperCase()}
```

**Convention Check**: Follows defensive coding patterns but component assumed valid props

### Hypothesis 2: Vite Preload-Helper Module Filtering Issue (Likelihood: 10%)

**Theory**: Vite's preload-helper contains code that processes module paths using `.split()`. In Playwright's environment, some module path or metadata is undefined.

**Supporting Evidence**:
- Stack trace includes `preload-helper-C7YQd10l.js:33:9011`
- Stack shows `Array.filter` before the `.split()` call
- Preload-helper has multiple `.split()` calls (lines 33-37)

**Contradicting Evidence**:
- The character position 7187 on line 11 matches the LoggedInAvatar code, not preload-helper
- The preload-helper `.split()` calls are for stack trace parsing, not module loading

**Verification Steps**:
1. Check if preload-helper has any environment-specific behavior
2. Compare Playwright vs regular browser module loading

**Potential Fix**: If confirmed, would require Vite configuration changes

### Hypothesis 3: Playwright-Specific Environment Variable Issue (Likelihood: 5%)

**Theory**: Some environment variable or browser API that populates user data behaves differently in Playwright.

**Supporting Evidence**:
- Issue only manifests in Playwright
- `auth.js` relies on `import.meta.env.VITE_SUPABASE_URL` for storage keys

**Contradicting Evidence**:
- The error is in LoggedInAvatar, not auth.js
- auth.js `.split()` calls have optional chaining protection

**Verification Steps**:
1. Log `import.meta.env` values in Playwright
2. Check localStorage/sessionStorage state

**Potential Fix**: Ensure environment variables are properly set in Playwright context

## 6. Recommended Action Plan

### Priority 1 (Try First) - Most Likely Fix

**Add defensive null checks to LoggedInAvatar.jsx**

**File**: `c:\Users\Split Lease\Documents\Split Lease\app\src\islands\shared\LoggedInAvatar\LoggedInAvatar.jsx`

**Changes**:

1. **Line 364** - Add optional chaining and fallback:
```javascript
// Before
const firstName = user.name.split(' ')[0];

// After
const firstName = user?.name?.split(' ')[0] || '';
```

2. **Line 396** - Add optional chaining and fallback:
```javascript
// Before
{user.name.charAt(0).toUpperCase()}

// After
{(user?.name?.charAt(0) || '?').toUpperCase()}
```

3. **Line 393** - Add defensive check for alt attribute:
```javascript
// Before
<img src={user.avatarUrl} alt={user.name} className="avatar-image" />

// After
<img src={user.avatarUrl} alt={user?.name || 'User avatar'} className="avatar-image" />
```

### Priority 2 (If Priority 1 Fails) - Add Early Guard

Add an early return guard at the component level:

```javascript
export default function LoggedInAvatar({
  user,
  currentPath,
  onNavigate,
  onLogout,
}) {
  // Early guard - prevent crash if user data incomplete
  if (!user?.name || !user?.id) {
    console.warn('[LoggedInAvatar] Invalid user object:', user);
    return null; // Don't render if user data is incomplete
  }
  // ... rest of component
}
```

### Priority 3 (Deeper Investigation)

If fixes above don't resolve:

1. **Add Playwright-specific debugging**:
   - Add `console.log` statements before the error point
   - Log the `user` object state when component initializes
   - Check what triggers LoggedInAvatar rendering in Playwright

2. **Investigate bundle splitting**:
   - Check why LoggedInAvatar is bundled with SignUpLoginModal
   - Consider if tree-shaking is incorrectly including code

3. **Verify Vite preload behavior**:
   - Add Vite configuration to debug module loading
   - Compare bundle execution order in Playwright vs Chrome

## 7. Prevention Recommendations

1. **Enforce TypeScript for new components**: Use TypeScript interfaces to catch undefined property access at compile time

2. **Add PropTypes validation**: Add runtime prop validation to catch invalid props early:
```javascript
import PropTypes from 'prop-types';

LoggedInAvatar.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
    // ...
  }).isRequired,
  // ...
};
```

3. **Add Playwright E2E tests**: Include homepage smoke test in CI to catch rendering issues

4. **Defensive coding standard**: Establish convention to always use optional chaining when accessing props that come from external data sources

## 8. Related Files Reference

| File | Line Numbers | Modification Type |
|------|--------------|-------------------|
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | 364, 393, 396 | Add defensive null checks |
| `app/src/islands/shared/Header.jsx` | 678-702 | Reference only (shows how user prop is constructed) |
| `app/src/lib/auth.js` | N/A | Reference only (has proper optional chaining) |
| `app/dist/assets/SignUpLoginModal-PgbDTeDB.js` | N/A | Will be regenerated after fix |

---

## Quick Reference

**Root Cause**: Unprotected `.split()` call on potentially undefined `user.name` property in LoggedInAvatar.jsx line 364

**Fix Complexity**: Low - Simple addition of optional chaining

**Risk Assessment**: Low risk - Adding defensive checks won't affect happy path behavior

**Verification Method**: Run Playwright test against homepage after fix

---

**Analysis By**: Claude (debug-analyst)
**Analysis Date**: 2026-01-09
