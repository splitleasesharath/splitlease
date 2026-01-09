# Implementation Plan: Dynamic Header Menu System for Host/Guest Landing Pages

## Overview

Implement a context-aware navigation system for the "List With Us" (host) and "Why Split Lease" (guest) pages that dynamically renders menu items and CTAs based on user authentication state, user role (Host/Guest), and data ownership (listings, proposals, rental applications, leases). This feature will leverage the existing `useLoggedInAvatarData` hook pattern for data fetching and the Header component's conditional rendering patterns.

## Success Criteria

- [ ] ListWithUsPage displays dynamic header menu based on 5 host states
- [ ] WhySplitLeasePage displays dynamic header menu based on 6 guest states
- [ ] Menu items update without page refresh when user logs in/out
- [ ] CTAs correctly route users to appropriate destinations
- [ ] Loading states handled gracefully during data fetch
- [ ] All menu items use existing URL constants from lib/constants.js
- [ ] No regression to existing Header.jsx functionality
- [ ] Mobile menu correctly reflects dynamic state

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/ListWithUsPage.jsx` | Host landing page | Add dynamic menu section, integrate useHostLandingMenuData hook |
| `app/src/islands/pages/WhySplitLeasePage.jsx` | Guest landing page | Add dynamic menu section, integrate useGuestLandingMenuData hook |
| `app/src/islands/shared/Header.jsx` | Global header component | Reference only - patterns to follow |
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | Data fetching hook | Reference only - patterns to follow |
| `app/src/lib/auth.js` | Authentication utilities | Import checkAuthStatus, validateTokenAndFetchUser |
| `app/src/lib/constants.js` | URL constants | Import SEARCH_URL, HOST_OVERVIEW_URL, etc. |
| `app/src/lib/supabase.js` | Supabase client | Used for data queries |

### New Files to Create

| File | Purpose |
|------|---------|
| `app/src/islands/shared/LandingPageHeader/LandingPageHeader.jsx` | New header variant with dynamic menu |
| `app/src/islands/shared/LandingPageHeader/LandingPageHeader.css` | Styles for landing page header |
| `app/src/islands/shared/LandingPageHeader/useHostLandingMenuData.js` | Hook for host menu data fetching |
| `app/src/islands/shared/LandingPageHeader/useGuestLandingMenuData.js` | Hook for guest menu data fetching |
| `app/src/islands/shared/LandingPageHeader/index.js` | Barrel exports |

### Related Documentation

- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` - Pattern for parallel Supabase queries
- `app/src/islands/shared/Header.jsx` - Auth state management patterns
- `app/src/lib/auth.js` - Authentication flow reference

### Existing Patterns to Follow

1. **useLoggedInAvatarData hook pattern**: Parallel Supabase queries for counts (listings, proposals, leases)
2. **Header.jsx auth pattern**: Optimistic UI with cached auth state, background validation
3. **Menu visibility pattern**: getMenuVisibility() function returns boolean flags per menu item
4. **Normalized user types**: NORMALIZED_USER_TYPES enum (GUEST, HOST, TRIAL_HOST)

## Implementation Steps

### Step 1: Create useHostLandingMenuData Hook

**Files:** `app/src/islands/shared/LandingPageHeader/useHostLandingMenuData.js`

**Purpose:** Fetch host-specific data to determine which of the 5 host states applies

**Details:**
- Query `listing` table for user's listings count
- Query `proposal` table for proposals on user's listings (Host User = userId)
- Query `Booking - Lease` table for leases where user is host
- Return: `{ isAuthenticated, hasListing, hasProposals, hasLeases, listingsCount, proposalsCount, leasesCount, loading, error }`

**State Detection Logic:**
```javascript
// State 1: Logged Out
isAuthenticated === false

// State 2: Logged In (No Listing)
isAuthenticated && listingsCount === 0

// State 3: Logged In (With Listing, No Proposals)
isAuthenticated && listingsCount > 0 && proposalsCount === 0

// State 4: Logged In (With Proposals)
isAuthenticated && listingsCount > 0 && proposalsCount > 0 && leasesCount === 0

// State 5: Logged In (With Leases)
isAuthenticated && leasesCount > 0
```

**Validation:** Console log state detection during development

---

### Step 2: Create useGuestLandingMenuData Hook

**Files:** `app/src/islands/shared/LandingPageHeader/useGuestLandingMenuData.js`

**Purpose:** Fetch guest-specific data to determine which of the 6 guest states applies

**Details:**
- Query `proposal` table for user's proposals (Guest = userId)
- Query `proposal` table for suggested proposals (using SUGGESTED_PROPOSAL_STATUSES)
- Query rental_application or user table for rental application status
- Query `Booking - Lease` table for leases where user is guest
- Return: `{ isAuthenticated, hasProposals, hasSuggestedProposals, hasRentalApp, hasLeases, proposalsCount, suggestedCount, leasesCount, loading, error }`

**State Detection Logic:**
```javascript
// State 1: Logged Out
isAuthenticated === false

// State 2: Logged In (No Proposals, No Rental App)
isAuthenticated && proposalsCount === 0 && !hasRentalApp

// State 3: Logged In (No Proposals, With Rental App)
isAuthenticated && proposalsCount === 0 && hasRentalApp

// State 4: Logged In (With Proposals)
isAuthenticated && proposalsCount > 0 && suggestedCount === 0 && leasesCount === 0

// State 5: Logged In (With Suggested Proposals)
isAuthenticated && suggestedCount > 0

// State 6: Logged In (With Leases)
isAuthenticated && leasesCount > 0
```

**Validation:** Console log state detection during development

---

### Step 3: Create Menu Configuration Functions

**Files:** `app/src/islands/shared/LandingPageHeader/menuConfig.js`

**Purpose:** Define menu items and CTAs for each state

**Details:**

```javascript
// Host Menu Configurations
export const getHostMenuItems = (state, userId) => {
  switch (state) {
    case 'LOGGED_OUT':
      return {
        items: [
          { id: 'why-list', label: 'Why List with Us', href: '/list-with-us' },
          { id: 'success', label: 'Success Stories', href: '/host-success' },
          { id: 'legal', label: 'Legal Information', href: '/policies' },
          { id: 'faq', label: 'FAQs', href: '/faq?section=hosts' },
          { id: 'signup', label: 'Sign Up', action: 'openSignup' }
        ],
        cta: { label: 'Sign Up', action: 'openSignup' }
      };
    case 'NO_LISTING':
      return {
        items: [
          { id: 'house-manual', label: 'Create House Manual', href: '/house-manual/create' },
          { id: 'success', label: 'Success Stories', href: '/host-success' },
          { id: 'list-property', label: 'List Property', href: '/self-listing-v2' },
          { id: 'legal', label: 'Legal Information', href: '/policies' },
          { id: 'faq', label: 'FAQs', href: '/faq?section=hosts' }
        ],
        cta: { label: 'List Property', href: '/self-listing-v2' }
      };
    case 'WITH_LISTING_NO_PROPOSALS':
      return {
        items: [
          { id: 'house-manual', label: 'Create/Manage House Manual', href: '/host-overview#house-manuals' },
          { id: 'success', label: 'Success Stories', href: '/host-success' },
          { id: 'manage-listing', label: 'Manage Listing', href: '/host-overview' },
          { id: 'legal', label: 'Legal Information', href: '/policies' },
          { id: 'faq', label: 'FAQs', href: '/faq?section=hosts' }
        ],
        cta: { label: 'Manage Listing', href: '/host-overview' }
      };
    case 'WITH_PROPOSALS':
      return {
        items: [
          { id: 'house-manual', label: 'Create/Manage House Manual', href: '/host-overview#house-manuals' },
          { id: 'success', label: 'Success Stories', href: '/host-success' },
          { id: 'manage-listing', label: 'Manage Listing', href: '/host-overview' },
          { id: 'manage-proposals', label: 'Manage Proposals', href: '/host-proposals' },
          { id: 'legal', label: 'Legal Information', href: '/policies' },
          { id: 'faq', label: 'FAQs', href: '/faq?section=hosts' }
        ],
        cta: { label: 'Manage Proposals', href: '/host-proposals' }
      };
    case 'WITH_LEASES':
      return {
        items: [
          { id: 'house-manual', label: 'Create/Manage House Manual', href: '/host-overview#house-manuals' },
          { id: 'success', label: 'Success Stories', href: '/host-success' },
          { id: 'manage-listing', label: 'Manage Listing', href: '/host-overview' },
          { id: 'manage-proposals', label: 'Manage Proposals', href: '/host-proposals' },
          { id: 'legal', label: 'Legal Information', href: '/policies' },
          { id: 'faq', label: 'FAQs', href: '/faq?section=hosts' }
        ],
        cta: { label: 'Manage Leases', href: '/host-leases' }
      };
  }
};

// Guest Menu Configurations
export const getGuestMenuItems = (state, userId) => {
  // Similar switch statement for 6 guest states
  // ...
};
```

**Validation:** Unit test menu configurations with mock state inputs

---

### Step 4: Create LandingPageHeader Component

**Files:** `app/src/islands/shared/LandingPageHeader/LandingPageHeader.jsx`

**Purpose:** Render dynamic header with menu based on page type (host/guest) and user state

**Details:**
- Accept prop `pageType: 'host' | 'guest'` to determine which hook to use
- Render dropdown menu with items from getHostMenuItems/getGuestMenuItems
- Render CTA button with appropriate action
- Support mobile hamburger menu
- Handle loading state during data fetch
- Integrate SignUpLoginModal for 'openSignup' action

**Component Structure:**
```jsx
function LandingPageHeader({ pageType }) {
  // Auth state (follow Header.jsx pattern)
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Data hooks (conditionally use based on pageType)
  const hostData = pageType === 'host' ? useHostLandingMenuData(currentUser?.userId) : null;
  const guestData = pageType === 'guest' ? useGuestLandingMenuData(currentUser?.userId) : null;

  // Determine state
  const menuState = determineMenuState(pageType, currentUser, hostData || guestData);

  // Get menu config
  const menuConfig = pageType === 'host'
    ? getHostMenuItems(menuState, currentUser?.userId)
    : getGuestMenuItems(menuState, currentUser?.userId);

  return (
    <header className="landing-page-header">
      {/* Logo */}
      {/* Dynamic Menu Dropdown with:
          - Main menu items section
          - Separator line (hr or styled div)
          - Bottom CTA section
      */}
      {/* Auth Modal */}
    </header>
  );
}
```

**Menu Dropdown Structure:**
- Main menu items (Why List with Us, Success Stories, etc.)
- Visual separator (horizontal line)
- Bottom CTA button (Sign Up, List Property, Manage Listing, etc.)
```

**Validation:**
- Test all 5 host states manually
- Test all 6 guest states manually
- Test mobile responsiveness

---

### Step 5: Create CSS Styles

**Files:** `app/src/islands/shared/LandingPageHeader/LandingPageHeader.css`

**Purpose:** Style the landing page header consistent with existing design system

**Details:**
- Use CSS variables from `app/src/styles/variables.css`
- Follow existing Header.jsx patterns for dropdown styling
- Add landing-page-specific CTA button styling
- Ensure mobile responsiveness matches existing patterns
- Add loading skeleton styles for data fetch state

**Validation:** Visual comparison with existing Header styling

---

### Step 6: Integrate into ListWithUsPage

**Files:** `app/src/islands/pages/ListWithUsPage.jsx`

**Purpose:** Replace standard Header with LandingPageHeader for host-specific menu

**Details:**
- Import LandingPageHeader
- Replace `<Header />` with `<LandingPageHeader pageType="host" />`
- Keep existing page content unchanged
- Ensure modals (CreateDuplicateListingModal, ImportListingModal) still work

**Before:**
```jsx
import Header from '../shared/Header.jsx';
// ...
<Header />
```

**After:**
```jsx
import LandingPageHeader from '../shared/LandingPageHeader';
// ...
<LandingPageHeader pageType="host" />
```

**Validation:**
- Test all 5 host states display correctly
- Test CTA actions work correctly
- Test modals still function

---

### Step 7: Integrate into WhySplitLeasePage

**Files:** `app/src/islands/pages/WhySplitLeasePage.jsx`

**Purpose:** Replace standard Header with LandingPageHeader for guest-specific menu

**Details:**
- Import LandingPageHeader
- Replace `<Header />` with `<LandingPageHeader pageType="guest" />`
- Keep existing page content unchanged (schedule selector, featured listings, etc.)

**Validation:**
- Test all 6 guest states display correctly
- Test CTA actions work correctly
- Test existing interactive elements (schedule selector, borough filter) still work

---

### Step 8: Add Barrel Exports

**Files:** `app/src/islands/shared/LandingPageHeader/index.js`

**Purpose:** Clean exports for the component module

**Details:**
```javascript
export { default as LandingPageHeader } from './LandingPageHeader.jsx';
export { useHostLandingMenuData } from './useHostLandingMenuData.js';
export { useGuestLandingMenuData } from './useGuestLandingMenuData.js';
export { getHostMenuItems, getGuestMenuItems } from './menuConfig.js';
```

**Validation:** Import works from consuming components

---

## Edge Cases & Error Handling

1. **Network failure during data fetch**: Show generic menu (logged-out state) with retry
2. **User logs out while on page**: Menu should update to logged-out state via auth listener
3. **User signs up on page**: Menu should update via SIGNED_IN event listener
4. **Stale auth cache**: Background validation updates menu without flicker
5. **Missing user ID**: Gracefully fall back to logged-out menu
6. **Empty counts (0 listings, 0 proposals)**: Correctly detect as "no X" states

## Testing Considerations

### Manual Testing Checklist

**Host States (ListWithUsPage):**
- [ ] State 1: Visit page while logged out - see Sign Up CTA
- [ ] State 2: Login as host with 0 listings - see List Property CTA
- [ ] State 3: Create test listing, no proposals - see Manage Listing CTA
- [ ] State 4: Have listing with proposals - see Manage Proposals CTA
- [ ] State 5: Have active lease as host - see Manage Leases CTA

**Guest States (WhySplitLeasePage):**
- [ ] State 1: Visit page while logged out - see Sign Up CTA
- [ ] State 2: Login as guest with no proposals, no rental app - see Explore Rental CTA
- [ ] State 3: Submit rental application - see Explore Rental CTA (with "Active" indicator)
- [ ] State 4: Create proposal - see Manage Proposals CTA
- [ ] State 5: Have suggested proposals - see See Suggested Proposal CTA
- [ ] State 6: Have active lease as guest - see Manage Leases CTA

**Cross-cutting:**
- [ ] Mobile hamburger menu reflects correct state
- [ ] Sign Up action opens modal
- [ ] Auth state persists across page refresh
- [ ] Menu updates when user logs in/out without refresh

## Rollback Strategy

1. Revert page imports back to `<Header />` in both pages
2. Delete `app/src/islands/shared/LandingPageHeader/` directory
3. No database changes required

## Dependencies & Blockers

- None - all required data tables and auth infrastructure exists
- Assumes Supabase Edge Functions are working for auth validation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Auth race conditions | Medium | Medium | Follow Header.jsx background validation pattern |
| Stale menu state | Low | Low | Use Supabase auth event listener for real-time updates |
| Mobile layout breaks | Low | Medium | Test on actual mobile devices, follow existing responsive patterns |
| Performance (multiple queries) | Low | Low | Use Promise.all for parallel queries (existing pattern) |

---

## Summary of Files Referenced

### Files to Modify
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\ListWithUsPage.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\pages\WhySplitLeasePage.jsx`

### Files to Create
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\LandingPageHeader.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\LandingPageHeader.css`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\useHostLandingMenuData.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\useGuestLandingMenuData.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\menuConfig.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LandingPageHeader\index.js`

### Files to Reference (Read Only)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\Header.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\LoggedInAvatar\useLoggedInAvatarData.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\lib\auth.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\lib\constants.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\lib\supabase.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx`

---

**Plan Version:** 1.0
**Created:** 2026-01-08
**Author:** Implementation Planning Architect
