# Page-Level Authentication Guide

**Created**: 2026-01-20
**Status**: AUTHORITATIVE REFERENCE
**Scope**: All authentication handling in Split Lease page components
**Keywords**: authentication, auth, login, session, token, protected pages, clearOnFailure, fallback, Supabase, Header, avatar

---

## TL;DR - The Golden Rules

**THREE FUNCTIONS control page authentication**:
1. `checkAuthStatus()` - Quick token existence check
2. `validateTokenAndFetchUser({ clearOnFailure: false })` - Deep validation (ALWAYS use clearOnFailure: false)
3. `supabase.auth.getSession()` - Fallback for session metadata

**ALWAYS use all three in sequence for protected pages.**

Never:
- Use `validateTokenAndFetchUser()` without the `clearOnFailure: false` option
- Skip the `checkAuthStatus()` pre-check
- Omit the Supabase session fallback
- Fail silently - always redirect on complete auth failure

---

## Quick Reference Table

| Task | Action |
|------|--------|
| Add auth to new protected page | Copy Gold Standard pattern from useMessagingPageLogic.js |
| Fix auth state issues | Verify `clearOnFailure: false` and fallback logic |
| Debug logged-out flicker | Check for race conditions, add session fallback |
| User appears logged out on navigation | Page missing `clearOnFailure: false` |
| Header shows wrong state | Check Header.jsx auth listener timing |
| Add protected route | Set `protected: true` in routes.config.js + implement auth pattern |

---

## Authentication Architecture

### How Auth State Flows

```
                           PAGE LOAD
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    checkAuthStatus()                            │
│    ┌─────────────────────────────────────────────────────┐     │
│    │ 1. Check Split Lease cookies (legacy Bubble)        │     │
│    │ 2. Check Supabase Auth session (with 200ms retry)   │     │
│    │ 3. Check legacy auth state in secureStorage         │     │
│    └─────────────────────────────────────────────────────┘     │
│                               │                                 │
│                    Returns: boolean                             │
└────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
        false │                                 │ true
              ▼                                 ▼
    ┌──────────────────┐         ┌──────────────────────────────┐
    │ REDIRECT TO      │         │ validateTokenAndFetchUser()   │
    │ /?login=true     │         │ { clearOnFailure: false }     │
    └──────────────────┘         └──────────────────────────────┘
                                                │
                                 ┌──────────────┴──────────────┐
                                 │                             │
                         userData│                             │ null
                                 ▼                             ▼
                    ┌────────────────────┐    ┌────────────────────────┐
                    │ USE userData       │    │ FALLBACK: Check        │
                    │ Set user state     │    │ supabase.auth.getSession() │
                    └────────────────────┘    └────────────────────────┘
                                                           │
                                            ┌──────────────┴──────────────┐
                                            │                             │
                                    session │                             │ null
                                            ▼                             ▼
                               ┌────────────────────┐     ┌──────────────────┐
                               │ USE session        │     │ REDIRECT TO      │
                               │ metadata fallback  │     │ /?login=true     │
                               └────────────────────┘     └──────────────────┘
```

### Why This Pattern Matters

**Islands Architecture creates race conditions:**
- Each page is a separate React app (not SPA)
- Navigation = full page load = fresh app initialization
- Supabase client must restore session from localStorage
- If auth check runs before session restoration → false negative

**The `clearOnFailure: false` option prevents:**
- Clearing valid sessions during transient failures
- Profile API failures wiping auth state
- Network hiccups logging users out

---

## Auth Function Reference

### checkAuthStatus()

**Purpose**: Lightweight check that tokens/session exist

**Location**: `app/src/lib/auth.js:118`

**Checks in order**:
1. Split Lease cookies from Bubble app
2. Supabase Auth session (with 200ms retry for initialization)
3. Legacy auth state in secureStorage

**Returns**: `Promise<boolean>`

**Side effects**: Syncs Supabase session to secureStorage if found

```javascript
import { checkAuthStatus } from '../lib/auth.js';

const isAuthenticated = await checkAuthStatus();
if (!isAuthenticated) {
  window.location.href = '/?login=true';
  return;
}
```

### validateTokenAndFetchUser(options)

**Purpose**: Deep validation + fetch user profile data

**Location**: `app/src/lib/auth.js:857`

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clearOnFailure` | boolean | `true` | If true, clears all auth data on validation failure |

**CRITICAL**: Always pass `{ clearOnFailure: false }` on protected pages to prevent clearing fresh sessions.

**Returns**: `Promise<Object|null>`

**User data object**:
```javascript
{
  userId: string,        // Bubble _id
  firstName: string,
  fullName: string,
  email: string,
  profilePhoto: string,  // URL
  userType: string,      // 'Host' | 'Guest' | 'A Host (I would like to...) | ...
  accountHostId: string,
  aboutMe: string,
  needForSpace: string,
  specialNeeds: string,
  proposalCount: number
}
```

### supabase.auth.getSession()

**Purpose**: Get current Supabase session (fallback for metadata)

**Location**: Supabase client library

**Returns**: `{ data: { session: Session | null }, error: Error | null }`

**Session user metadata**:
```javascript
session.user.user_metadata = {
  user_id: string,      // Bubble _id
  user_type: string,
  first_name: string,
  last_name: string
}
```

---

## The Gold Standard Pattern

### Complete Implementation

**Reference**: `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js:64-130`

```javascript
import { useState, useEffect } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
import { supabase } from '../../../lib/supabase.js';

export function useYourPageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    shouldRedirect: false
  });
  const [user, setUser] = useState(null);

  // ============================================================================
  // AUTH CHECK ON MOUNT
  // ============================================================================
  useEffect(() => {
    async function init() {
      try {
        // ──────────────────────────────────────────────────────────────────────
        // STEP 1: Quick auth check (validates tokens/session exist)
        // ──────────────────────────────────────────────────────────────────────
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated) {
          console.log('[YourPage] User not authenticated, redirecting');
          setAuthState({ isChecking: false, shouldRedirect: true });
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        // ──────────────────────────────────────────────────────────────────────
        // STEP 2: Deep validation with clearOnFailure: false
        // CRITICAL: Preserves session if profile fetch fails transiently
        // ──────────────────────────────────────────────────────────────────────
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          // Success path: Use validated user data
          setUser({
            id: userData.userId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.fullName?.split(' ').slice(1).join(' ') || '',
            profilePhoto: userData.profilePhoto,
            userType: userData.userType
          });
          console.log('[YourPage] User data loaded:', userData.firstName);
        } else {
          // ────────────────────────────────────────────────────────────────────
          // STEP 3: Fallback to Supabase session metadata
          // Handles case where profile API failed but session is valid
          // ────────────────────────────────────────────────────────────────────
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              firstName: session.user.user_metadata?.first_name ||
                         getFirstName() ||
                         session.user.email?.split('@')[0] ||
                         'User',
              lastName: session.user.user_metadata?.last_name || '',
              profilePhoto: getAvatarUrl() || null,
              userType: session.user.user_metadata?.user_type || null
            };
            setUser(fallbackUser);
            console.log('[YourPage] Using fallback user data:', fallbackUser.firstName);
          } else {
            // No valid session at all - redirect
            console.log('[YourPage] No valid session, redirecting');
            setAuthState({ isChecking: false, shouldRedirect: true });
            setTimeout(() => {
              window.location.href = '/?login=true';
            }, 100);
            return;
          }
        }

        setAuthState({ isChecking: false, shouldRedirect: false });

        // Continue with page initialization...

      } catch (err) {
        console.error('[YourPage] Auth check failed:', err);
        setError('Failed to check authentication. Please refresh the page.');
      }
    }

    init();
  }, []);

  // Return auth state for component to handle loading/redirect
  return {
    authState,
    user,
    // ... other page logic
  };
}
```

### Component Usage

```javascript
function YourPage() {
  const { authState, user, /* other stuff */ } = useYourPageLogic();

  // Show nothing during auth check (prevents flash)
  if (authState.isChecking) {
    return <LoadingSpinner />;
  }

  // Redirect handling (should happen in hook, this is safety)
  if (authState.shouldRedirect) {
    return null;
  }

  // Render page content
  return (
    <div>
      <Header />
      {/* Page content using user data */}
    </div>
  );
}
```

---

## How To: Add Authentication to a New Protected Page

### Step 1: Mark Route as Protected

Edit `app/src/routes.config.js`:

```javascript
{
  path: '/your-new-page',
  file: 'your-new-page.html',
  aliases: ['/your-new-page.html'],
  protected: true,  // IMPORTANT: Mark as protected
  cloudflareInternal: true,
  internalName: 'your-new-page-view',
  hasDynamicSegment: false
}
```

### Step 2: Create Page Logic Hook

Create `app/src/islands/pages/YourNewPage/useYourNewPageLogic.js`:

1. Copy the Gold Standard pattern from above
2. Replace `[YourPage]` with your page name in console logs
3. Add page-specific data fetching after auth check

### Step 3: Update isProtectedPage() List

Edit `app/src/lib/auth.js:1041`:

```javascript
export function isProtectedPage() {
  const protectedPaths = [
    '/guest-proposals',
    '/host-proposals',
    '/account-profile',
    // ... existing paths
    '/your-new-page'  // ADD YOUR PATH
  ];
  // ...
}
```

### Step 4: Test Navigation Flows

```
1. Cold load /your-new-page while logged in
2. Navigate from /messages to /your-new-page
3. Navigate from /your-new-page to a public page and back
4. Simulate slow network and verify no auth flicker
```

---

## How To: Fix Auth State Issues on Existing Page

### Symptom: User appears logged out on navigation

**Cause**: Missing `clearOnFailure: false` option

**Fix**:
```javascript
// BEFORE (broken)
const userData = await validateTokenAndFetchUser();

// AFTER (fixed)
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
```

### Symptom: Page shows broken state instead of redirecting

**Cause**: Missing redirect on auth failure

**Fix**: Add redirect after fallback check fails:
```javascript
if (!session?.user) {
  setAuthState({ isChecking: false, shouldRedirect: true });
  window.location.href = '/?login=true';
  return;
}
```

### Symptom: Auth works on cold load but fails on navigation

**Cause**: Race condition - auth check runs before Supabase initializes

**Fix**: Ensure `checkAuthStatus()` is called first (it has 200ms retry built in)

### Symptom: Profile data missing but user is authenticated

**Cause**: Missing Supabase session fallback

**Fix**: Add the fallback block after `validateTokenAndFetchUser` returns null:
```javascript
if (!userData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // Use session.user.user_metadata for fallback data
  }
}
```

---

## Header Component Auth Handling

### How Header Determines Auth State

**File**: `app/src/islands/shared/Header.jsx`

The Header uses an **optimistic UI pattern**:

1. **Immediate**: Reads cached auth state from secureStorage
2. **Background**: Validates via `validateTokenAndFetchUser`
3. **Listener**: Subscribes to `onAuthStateChange` for real-time updates

### Key Functions Used

```javascript
import {
  getFirstName,      // Cached first name
  getAvatarUrl,      // Cached avatar URL
  getAuthState       // Cached auth boolean
} from '../lib/auth.js';

import {
  hasCachedAuth      // Quick check if cache exists
} from '../lib/secureStorage.js';
```

### Race Condition Prevention

Header waits for document ready state before background validation:
```javascript
if (document.readyState === 'complete') {
  runBackgroundValidation();
} else {
  window.addEventListener('load', runBackgroundValidation);
}
```

---

## Protected Pages Checklist

### Current Implementation Status

| Page | Route | `checkAuthStatus` | `clearOnFailure: false` | Session Fallback | Redirect on Failure | Status |
|------|-------|-------------------|-------------------------|------------------|---------------------|--------|
| MessagingPage | `/messages` | Yes | Yes | Yes | Yes | Gold Standard |
| GuestProposalsPage | `/guest-proposals` | Yes | No | No | Yes | Needs Update |
| HostProposalsPage | `/host-proposals` | Yes | No | No | Yes | Needs Update |
| FavoriteListingsPage | `/favorite-listings` | Yes | No | No | Yes | Needs Update |
| HostOverviewPage | `/host-overview` | No | No | No | No (demo mode) | Critical |
| ListingDashboardPage | `/listing-dashboard` | No | No | No | No | Critical |
| RentalApplicationPage | `/rental-application` | Yes | No | No | Yes | Needs Update |
| AccountProfilePage | `/account-profile` | ? | ? | ? | ? | Unknown |
| SelfListingPage | `/self-listing` | ? | ? | ? | ? | Unknown |
| PreviewSplitLeasePage | `/preview-split-lease` | ? | ? | ? | ? | Unknown |

---

## Testing Checklist

### For Each Protected Page

- [ ] **Cold load while logged in** → Shows authenticated state immediately
- [ ] **Navigate from another protected page** → Maintains auth state (no flicker)
- [ ] **Navigate from public page** → Auth state correct
- [ ] **Slow network (throttle to Slow 3G)** → Auth state preserved, loading shown
- [ ] **Profile API returns error** → Falls back to session metadata
- [ ] **Complete auth failure** → Redirects to `/?login=true`
- [ ] **Header avatar matches** → Shows correct user avatar/initials

### Cross-Page Navigation Tests

- [ ] `/messages` → `/listing-dashboard` → `/messages`
- [ ] `/host-overview` → `/guest-proposals` → `/host-proposals`
- [ ] Any protected → Public → Protected (same or different)

### Edge Case Tests

- [ ] Expired token during navigation
- [ ] Network offline during auth check
- [ ] Multiple rapid navigations
- [ ] Tab backgrounded during auth check
- [ ] Browser back button on protected page

---

## Troubleshooting

### Problem: User Flickers to Logged-Out State

**Symptom**: User briefly sees logged-out UI before authenticated UI

**Causes**:
1. Missing `clearOnFailure: false` on `validateTokenAndFetchUser`
2. Page not showing loading state during auth check
3. Header background validation clearing state

**Solutions**:
1. Add `{ clearOnFailure: false }` to all `validateTokenAndFetchUser` calls
2. Show loading spinner while `authState.isChecking === true`
3. Verify Header's `onAuthStateChange` handler doesn't clear unnecessarily

### Problem: User Logged Out After Navigation

**Symptom**: User authenticated on Page A, appears logged out on Page B

**Cause**: Page B's auth check clears valid session due to transient failure

**Solution**:
```javascript
// In Page B's logic hook:
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
// Add fallback to session metadata
```

### Problem: Protected Page Shows Demo/Mock Data

**Symptom**: HostOverviewPage shows demo data instead of real data

**Cause**: Missing proper auth redirect - page falls back to demo mode

**Solution**: Remove demo mode fallback, implement proper redirect:
```javascript
if (!userData && !session?.user) {
  window.location.href = '/?login=true';
  return;
}
```

### Problem: Auth State Lost on Browser Refresh

**Symptom**: User logged in, refreshes page, appears logged out

**Cause**: Supabase session not being restored from localStorage

**Solution**: Ensure `checkAuthStatus()` is called first (has 200ms retry for initialization)

### Problem: Different Auth State in Header vs Page

**Symptom**: Header shows logged in, page shows logged out (or vice versa)

**Cause**: Header and page using different auth check timing

**Solution**: Both should use the same pattern - Header uses optimistic cache, page validates. Ensure secureStorage cache is being updated by page auth.

---

## Anti-Patterns (DON'T DO THESE)

### DON'T: Use validateTokenAndFetchUser without options

```javascript
// BAD - will clear session on transient failures
const userData = await validateTokenAndFetchUser();

// GOOD
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
```

### DON'T: Skip the pre-check

```javascript
// BAD - no quick check, expensive operation first
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

// GOOD - quick check first
const isAuthenticated = await checkAuthStatus();
if (!isAuthenticated) { /* redirect */ }
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
```

### DON'T: Fail silently on auth failure

```javascript
// BAD - user sees broken page
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
if (!userData) {
  console.log('No user data');
  // Page continues with null user...
}

// GOOD - redirect on complete failure
if (!userData) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    window.location.href = '/?login=true';
    return;
  }
  // Use session fallback...
}
```

### DON'T: Use demo/mock data as fallback

```javascript
// BAD - security risk, shows protected data to unauthenticated users
if (!userData) {
  setUser({ id: 'demo', firstName: 'Demo User' });
}

// GOOD - redirect to login
if (!userData && !session?.user) {
  window.location.href = '/?login=true';
  return;
}
```

---

## File Locations Reference

```
app/
├── src/
│   ├── lib/
│   │   ├── auth.js              # CORE: Auth functions
│   │   ├── secureStorage.js     # CORE: Token/state storage
│   │   └── supabase.js          # CORE: Supabase client
│   │
│   ├── islands/
│   │   ├── shared/
│   │   │   └── Header.jsx       # Header auth display
│   │   │
│   │   └── pages/
│   │       ├── MessagingPage/
│   │       │   └── useMessagingPageLogic.js  # GOLD STANDARD
│   │       │
│   │       ├── proposals/
│   │       │   └── useGuestProposalsPageLogic.js
│   │       │
│   │       ├── HostProposalsPage/
│   │       │   └── useHostProposalsPageLogic.js
│   │       │
│   │       ├── HostOverviewPage/
│   │       │   └── useHostOverviewPageLogic.js
│   │       │
│   │       ├── ListingDashboardPage/
│   │       │   └── useListingDashboardPageLogic.js
│   │       │
│   │       └── FavoriteListingsPage/
│   │           └── FavoriteListingsPage.jsx
│   │
│   └── routes.config.js         # Route definitions (protected flag)
```

---

## Keywords for Search

authentication, auth, login, logout, session, token, protected pages, clearOnFailure, fallback, Supabase, Header, avatar, checkAuthStatus, validateTokenAndFetchUser, getSession, secureStorage, auth state, logged in, logged out, redirect, race condition, flicker, Islands Architecture, page navigation, session metadata, user_metadata, first_name, profile photo, Gold Standard pattern

---

**Document Version**: 1.0
**Last Updated**: 2026-01-20
**Maintainer**: Development Team
