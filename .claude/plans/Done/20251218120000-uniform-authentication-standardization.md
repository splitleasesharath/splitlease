# Uniform Authentication Standardization Plan

**Created**: 2025-12-18
**Status**: READY FOR IMPLEMENTATION
**Priority**: HIGH
**Scope**: All protected pages in Split Lease application

---

## Executive Summary

This plan addresses authentication state inconsistencies discovered when navigating between pages. The root cause is inconsistent implementation of auth patterns across protected pages. We will standardize all protected pages to use the "Gold Standard" pattern from `useMessagingPageLogic.js`.

---

## Problem Statement

### Symptoms
- User appeared logged out when navigating from `/messages` to `/view-split-lease`
- Header avatar showed logged-out state despite valid session
- Re-logging in fixed the issue

### Root Cause
Authentication implementations vary across pages:
1. Different `clearOnFailure` settings (true vs false)
2. Missing fallback to Supabase session metadata
3. Single-step vs two-step auth checks
4. Silent failures vs proper redirects

---

## Implementation Tiers (Current State)

### Tier 1: Gold Standard (Target Pattern)
| Page | Implementation | Status |
|------|----------------|--------|
| `/messages` | `useMessagingPageLogic.js` | Reference |

### Tier 2: Strong (Needs `clearOnFailure: false` + fallback)
| Page | Implementation | Changes Needed |
|------|----------------|----------------|
| `/guest-proposals` | `useGuestProposalsPageLogic.js` | Add `clearOnFailure: false`, add fallback |
| `/host-proposals` | `useHostProposalsPageLogic.js` | Add `clearOnFailure: false`, add fallback |
| `/favorite-listings` | `FavoriteListingsPage.jsx` | Add `clearOnFailure: false`, add fallback |

### Tier 3: Basic (Needs major updates)
| Page | Implementation | Changes Needed |
|------|----------------|----------------|
| `/listing-dashboard` | `useListingDashboardPageLogic.js` | Add pre-check, add redirect, add `clearOnFailure: false`, add fallback |
| `/host-overview` | `useHostOverviewPageLogic.js` | Remove demo mode, add pre-check, add redirect, add `clearOnFailure: false`, add fallback |
| `/rental-application` | `RentalApplicationPage.jsx` | Add token validation, add `clearOnFailure: false`, add fallback |

### Unknown (Needs Investigation + Implementation)
| Page | Implementation | Action |
|------|----------------|--------|
| `/account-profile` | Unknown | Investigate, then implement Gold Standard |
| `/self-listing` | TypeScript module | Investigate, then implement Gold Standard |
| `/preview-split-lease` | Inline logic | Investigate, then implement Gold Standard |

---

## Gold Standard Pattern

### Reference Implementation
File: `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` (lines 64-130)

```javascript
useEffect(() => {
  async function init() {
    try {
      // Step 1: Quick auth check (validates tokens exist)
      const isAuthenticated = await checkAuthStatus();

      if (!isAuthenticated) {
        console.log('[PageName] User not authenticated, redirecting');
        setAuthState({ isChecking: false, shouldRedirect: true });
        setTimeout(() => {
          window.location.href = '/?login=true';
        }, 100);
        return;
      }

      // Step 2: Deep validation with clearOnFailure: false
      // CRITICAL: Preserves session if profile fetch fails transiently
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

      if (userData) {
        // Success path: Use validated user data
        setUser({
          id: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          // ... other fields
        });
      } else {
        // Step 3: Fallback to Supabase session metadata
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Session valid but profile fetch failed - use session metadata
          const fallbackUser = {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.user_metadata?.first_name ||
                       getFirstName() ||
                       session.user.email?.split('@')[0] ||
                       'User',
            // ... other fields with fallbacks
          };
          setUser(fallbackUser);
        } else {
          // No valid session - redirect
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
      console.error('[PageName] Auth check failed:', err);
      setError('Failed to check authentication. Please refresh the page.');
    }
  }

  init();
}, []);
```

### Required Imports
```javascript
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
import { supabase } from '../../../lib/supabase.js';
```

---

## Implementation Steps

### Phase 1: Tier 3 Pages (Critical)

#### 1.1 HostOverviewPage
**File**: `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js`

**Changes**:
1. Remove demo mode fallback (security risk)
2. Add `checkAuthStatus()` pre-check
3. Change `validateTokenAndFetchUser()` to `validateTokenAndFetchUser({ clearOnFailure: false })`
4. Add Supabase session fallback
5. Add redirect on complete auth failure

**Estimated Impact**: High (removes security risk)

#### 1.2 ListingDashboardPage
**File**: `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js`

**Changes**:
1. Add `checkAuthStatus()` pre-check
2. Change `validateTokenAndFetchUser()` to `validateTokenAndFetchUser({ clearOnFailure: false })`
3. Add Supabase session fallback
4. Add redirect on auth failure (currently silently fails)

**Estimated Impact**: High (page currently shows broken state on auth failure)

#### 1.3 RentalApplicationPage
**File**: `app/src/islands/pages/RentalApplicationPage/RentalApplicationPage.jsx` (or logic hook)

**Changes**:
1. Add `validateTokenAndFetchUser({ clearOnFailure: false })` after `checkAuthStatus()`
2. Add Supabase session fallback
3. Verify redirect behavior

**Estimated Impact**: Medium

### Phase 2: Tier 2 Pages (High Priority)

#### 2.1 GuestProposalsPage
**File**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`

**Changes**:
1. Change `validateTokenAndFetchUser()` to `validateTokenAndFetchUser({ clearOnFailure: false })`
2. Add Supabase session fallback before redirect

#### 2.2 HostProposalsPage
**File**: `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`

**Changes**:
1. Change `validateTokenAndFetchUser()` to `validateTokenAndFetchUser({ clearOnFailure: false })`
2. Add Supabase session fallback before redirect

#### 2.3 FavoriteListingsPage
**File**: `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

**Changes**:
1. Change `validateTokenAndFetchUser()` to `validateTokenAndFetchUser({ clearOnFailure: false })`
2. Add Supabase session fallback

### Phase 3: Unknown Pages (Investigation + Implementation)

#### 3.1 AccountProfilePage
**Action**: Locate auth implementation, assess current state, implement Gold Standard

#### 3.2 SelfListingPage
**Action**: Analyze TypeScript module, identify auth patterns, implement Gold Standard

#### 3.3 PreviewSplitLeasePage
**Action**: Check inline logic, implement Gold Standard pattern

### Phase 4: Header Component Alignment

#### 4.1 Header.jsx
**File**: `app/src/islands/shared/Header.jsx`

**Review**:
- Verify optimistic UI pattern handles race conditions
- Ensure `onAuthStateChange` listener is properly synchronized
- Consider adding explicit session check on visibility change

---

## Testing Checklist

### For Each Modified Page
- [ ] Cold load while logged in → Shows authenticated state
- [ ] Navigate from another page while logged in → Maintains auth state
- [ ] Slow network simulation → Auth state preserved (no flicker)
- [ ] Token refresh during page load → Handles gracefully
- [ ] Profile API failure with valid session → Falls back to session metadata
- [ ] Complete auth failure → Redirects to login

### Cross-Page Navigation Tests
- [ ] Messages → View-Split-Lease → Back to Messages
- [ ] Host-Overview → Listing-Dashboard → Guest-Proposals
- [ ] Any protected page → Any public page → Back to protected page

### Edge Cases
- [ ] Expired token during navigation
- [ ] Network offline during auth check
- [ ] Multiple rapid page navigations

---

## Rollback Plan

Each page will be modified independently. If issues arise:
1. Revert the specific page's logic hook to previous commit
2. Document the failure scenario for debugging
3. Address root cause before re-attempting

---

## Success Criteria

1. **Zero auth flicker**: User never sees logged-out state when authenticated
2. **Consistent behavior**: All protected pages behave identically
3. **Graceful degradation**: Profile fetch failures don't clear valid sessions
4. **Clear logging**: All auth decisions logged for debugging

---

## Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| Critical | `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Remove demo mode, add full Gold Standard |
| Critical | `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Add full Gold Standard |
| High | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | Add `clearOnFailure: false`, add fallback |
| High | `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Add `clearOnFailure: false`, add fallback |
| High | `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Add `clearOnFailure: false`, add fallback |
| Medium | `app/src/islands/pages/RentalApplicationPage/RentalApplicationPage.jsx` | Add validation, add fallback |
| Investigate | AccountProfilePage logic | Locate and implement |
| Investigate | SelfListingPage logic | Locate and implement |
| Investigate | PreviewSplitLeasePage logic | Locate and implement |

---

## Reference Files

| File | Purpose |
|------|---------|
| `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js` | Gold Standard reference (lines 64-130) |
| `app/src/lib/auth.js` | Auth utilities (`checkAuthStatus`, `validateTokenAndFetchUser`) |
| `app/src/lib/secureStorage.js` | Secure storage utilities |
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/routes.config.js` | Route definitions (protected flag) |
| `app/src/islands/shared/Header.jsx` | Header auth display |

---

## Documentation Deliverable

Create `AUTH_GUIDE.md` in `.claude/Documentation/` following the format of `ROUTING_GUIDE.md` to serve as:
1. Instructional guide for new protected pages
2. Evaluation checklist for existing pages
3. Troubleshooting reference for auth bugs

---

**Plan Version**: 1.0
**Author**: Claude Code
**Review Status**: Ready for execution
