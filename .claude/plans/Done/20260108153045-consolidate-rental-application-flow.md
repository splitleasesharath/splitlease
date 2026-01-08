# Implementation Plan: Consolidate Rental Application Flow

## Overview

This plan consolidates the rental application flow by converting the `RentalApplicationWizardModal` from a page-specific component into a reusable shared island, eliminating the standalone `/rental-application` page, and redirecting all navigation points to the account profile page with automatic modal opening via URL query parameters.

## Success Criteria

- [ ] `RentalApplicationWizardModal` moved to `app/src/islands/shared/RentalApplicationWizardModal/`
- [ ] AccountProfilePage imports from new shared location
- [ ] `goToRentalApplication()` redirects to `/account-profile` with query params
- [ ] LoggedInAvatar menu item navigates to account profile with rental application section
- [ ] ProposalSuccessModal redirects to account profile with rental application modal auto-open
- [ ] `/rental-application` route redirects to account profile (backward compatibility)
- [ ] Modal auto-opens when URL contains `?openRentalApp=true`
- [ ] Page scrolls to rental application section when URL contains `?section=rental-application`

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/` | Current modal location | Move entire directory to shared |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Uses the modal | Update import path |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Modal state management | Add URL param handling for auto-open |
| `app/src/lib/navigation.js` | Navigation utilities | Modify `goToRentalApplication()` |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | Avatar dropdown menu | Update rental application path |
| `app/src/islands/modals/ProposalSuccessModal.jsx` | Post-proposal redirect | Update rental app button navigation |
| `app/src/routes.config.js` | Route definitions | Add redirect for `/rental-application` |
| `app/src/islands/pages/RentalApplicationPage.jsx` | Standalone page | Mark as deprecated / redirect |

### Files Being Moved (RentalApplicationWizardModal directory)

```
app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/
  ├── RentalApplicationWizardModal.jsx      (main component)
  ├── RentalApplicationWizardModal.css      (styles)
  ├── StepIndicator.jsx                     (step navigation)
  ├── useRentalApplicationWizardLogic.js    (business logic hook)
  └── steps/
      ├── PersonalInfoStep.jsx
      ├── AddressStep.jsx
      ├── OccupantsStep.jsx
      ├── EmploymentStep.jsx
      ├── RequirementsStep.jsx
      ├── DocumentsStep.jsx
      └── ReviewStep.jsx
```

### Related Documentation

- [ROUTING_GUIDE.md](../Documentation/Routing/ROUTING_GUIDE.md) - Route registry patterns
- [miniCLAUDE.md](../Documentation/miniCLAUDE.md) - Project architecture patterns

### Existing Patterns to Follow

- **Shared Island Pattern**: Feature modules in `islands/shared/` with `index.js` barrel export (see `LoggedInAvatar/`, `VirtualMeetingManager/`)
- **URL Query Parameter Pattern**: Used in search page for filters, guest-proposals for proposal selection
- **Modal Auto-Open Pattern**: ProposalDetailsModal uses URL params for auto-selection

---

## URL Parameter Scheme

### Query Parameters for Account Profile Page

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `section` | `rental-application` | Scroll to rental application card section |
| `openRentalApp` | `true` | Auto-open the rental application wizard modal |

### Example URLs

```
# Scroll to section only (from menu navigation)
/account-profile/{userId}?section=rental-application

# Open modal directly (from proposal success)
/account-profile/{userId}?section=rental-application&openRentalApp=true

# With proposal context preserved
/account-profile/{userId}?section=rental-application&openRentalApp=true&proposal={proposalId}
```

---

## Implementation Steps

### Step 1: Create Shared RentalApplicationWizardModal Directory

**Files:** Create `app/src/islands/shared/RentalApplicationWizardModal/`

**Purpose:** Establish the new shared component location with proper structure

**Details:**
1. Create directory: `app/src/islands/shared/RentalApplicationWizardModal/`
2. Create subdirectory: `app/src/islands/shared/RentalApplicationWizardModal/steps/`
3. Create barrel export `index.js`:

```javascript
// app/src/islands/shared/RentalApplicationWizardModal/index.js
export { default } from './RentalApplicationWizardModal.jsx';
export { default as RentalApplicationWizardModal } from './RentalApplicationWizardModal.jsx';
```

**Validation:** Directory structure exists and matches pattern of other shared islands

---

### Step 2: Move RentalApplicationWizardModal Files

**Files:**
- Source: `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/*`
- Destination: `app/src/islands/shared/RentalApplicationWizardModal/`

**Purpose:** Relocate all modal files to shared location

**Details:**
1. Move all files from source to destination:
   - `RentalApplicationWizardModal.jsx`
   - `RentalApplicationWizardModal.css`
   - `StepIndicator.jsx`
   - `useRentalApplicationWizardLogic.js`
   - `steps/PersonalInfoStep.jsx`
   - `steps/AddressStep.jsx`
   - `steps/OccupantsStep.jsx`
   - `steps/EmploymentStep.jsx`
   - `steps/RequirementsStep.jsx`
   - `steps/DocumentsStep.jsx`
   - `steps/ReviewStep.jsx`

2. Update internal imports in `RentalApplicationWizardModal.jsx` if needed (relative paths should still work)

**Validation:** Files exist in new location, old directory is empty

---

### Step 3: Update AccountProfilePage Import

**Files:** `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx`

**Purpose:** Update import to use new shared location

**Details:**
1. Change import from:
```javascript
import RentalApplicationWizardModal from './components/RentalApplicationWizardModal/RentalApplicationWizardModal.jsx';
```

2. To:
```javascript
import RentalApplicationWizardModal from '../../shared/RentalApplicationWizardModal/RentalApplicationWizardModal.jsx';
```

**Validation:** Page loads without import errors, modal still functions

---

### Step 4: Add URL Parameter Handling to useAccountProfilePageLogic

**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`

**Purpose:** Handle URL query parameters for scroll-to-section and modal auto-open

**Details:**
1. Add URL parameter parsing in initialization useEffect:

```javascript
// Add near the top of the hook, with other imports
// (No new imports needed - URLSearchParams is native)

// Inside the useEffect initialization function, after profile data is loaded:
useEffect(() => {
  async function initialize() {
    // ... existing initialization code ...

    // After setLoading(false), handle URL parameters
    const params = new URLSearchParams(window.location.search);

    // Handle section scroll
    const section = params.get('section');
    if (section === 'rental-application') {
      // Scroll to rental application card after a brief delay for render
      setTimeout(() => {
        const rentalAppSection = document.getElementById('rental-application-section');
        if (rentalAppSection) {
          rentalAppSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Handle modal auto-open
    const openRentalApp = params.get('openRentalApp');
    if (openRentalApp === 'true' && !isHostUser) {
      setShowRentalWizardModal(true);

      // Clean up URL (optional - remove query params after handling)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }

  initialize();
}, [/* existing dependencies */]);
```

2. Alternatively, create a separate useEffect for URL param handling that runs after initial load completes:

```javascript
// Handle URL query parameters for rental application
useEffect(() => {
  // Only process after initial load and for guest users
  if (loading || isHostUser) return;

  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  const openRentalApp = params.get('openRentalApp');

  // Handle scroll to section
  if (section === 'rental-application') {
    setTimeout(() => {
      const rentalAppSection = document.getElementById('rental-application-section');
      if (rentalAppSection) {
        rentalAppSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // Handle modal auto-open
  if (openRentalApp === 'true') {
    setShowRentalWizardModal(true);
    // Clean URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }
}, [loading, isHostUser]);
```

**Validation:**
- Navigate to `/account-profile/{userId}?section=rental-application` - page scrolls to rental card
- Navigate to `/account-profile/{userId}?openRentalApp=true` - modal opens automatically

---

### Step 5: Add Section ID to RentalApplicationCard Container

**Files:** `app/src/islands/pages/AccountProfilePage/components/EditorView.jsx` (or wherever RentalApplicationCard is rendered)

**Purpose:** Add anchor point for scroll-to-section functionality

**Details:**
1. Locate where `RentalApplicationCard` is rendered in the EditorView component
2. Wrap or add id to the container:

```jsx
{/* Rental Application Section (Guest Only) */}
{!isHostUser && (
  <div id="rental-application-section">
    <RentalApplicationCard
      applicationStatus={rentalApplicationStatus}
      progress={rentalApplicationProgress}
      onOpenWizard={onOpenRentalWizard}
    />
  </div>
)}
```

**Validation:** Element with id `rental-application-section` exists in DOM when viewing as guest

---

### Step 6: Update goToRentalApplication() in navigation.js

**Files:** `app/src/lib/navigation.js`

**Purpose:** Redirect to account profile with query parameters instead of standalone page

**Details:**
1. Modify the existing function:

```javascript
/**
 * Navigate to rental application
 * Now redirects to account profile with rental application section focus and modal auto-open
 *
 * @param {string} proposalId - Optional proposal ID for context
 * @param {Object} options - Navigation options
 * @param {boolean} options.openModal - Whether to auto-open the rental application modal (default: true)
 * @param {boolean} options.scrollToSection - Whether to scroll to section (default: true)
 */
export function goToRentalApplication(proposalId, options = {}) {
  const { openModal = true, scrollToSection = true } = options;

  // Get current user ID from session
  const userId = getSessionId();

  if (!userId) {
    console.error('goToRentalApplication: userId is required (user not logged in)');
    // Redirect to login or home
    window.location.href = '/';
    return;
  }

  const params = new URLSearchParams();

  if (scrollToSection) {
    params.set('section', 'rental-application');
  }

  if (openModal) {
    params.set('openRentalApp', 'true');
  }

  if (proposalId) {
    params.set('proposal', proposalId);
  }

  const queryString = params.toString();
  window.location.href = `/account-profile/${userId}${queryString ? '?' + queryString : ''}`;
}
```

2. Add import for `getSessionId` if not already present:
```javascript
import { getSessionId } from './auth.js';
```

**Validation:** Calling `goToRentalApplication()` navigates to account profile with correct params

---

### Step 7: Update LoggedInAvatar Menu Item

**Files:** `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`

**Purpose:** Update rental application menu path to account profile with section parameter

**Details:**
1. Find the rental application menu item (around line 292-301):

```javascript
// BEFORE (line ~292-301):
// 10. Rental Application - GUEST only
if (menuVisibility.rentalApplication) {
  items.push({
    id: 'rental-application',
    label: 'Rental Application',
    icon: '/assets/icons/clipboard-purple.svg',
    path: effectiveUserType === NORMALIZED_USER_TYPES.HOST
      ? '/account'
      : '/rental-application',
  });
}
```

2. Change to:
```javascript
// 10. Rental Application - GUEST only
if (menuVisibility.rentalApplication) {
  items.push({
    id: 'rental-application',
    label: 'Rental Application',
    icon: '/assets/icons/clipboard-purple.svg',
    // Navigate to account profile with rental application section focus
    // Host path kept as '/account' for compatibility
    path: effectiveUserType === NORMALIZED_USER_TYPES.HOST
      ? '/account'
      : `/account-profile/${user.id}?section=rental-application`,
  });
}
```

**Validation:** Clicking "Rental Application" in dropdown navigates to account profile and scrolls to section

---

### Step 8: Update ProposalSuccessModal Navigation

**Files:** `app/src/islands/modals/ProposalSuccessModal.jsx`

**Purpose:** Update rental application button to navigate to account profile with modal auto-open

**Details:**
1. Modify the `handleGoToRentalApp` function (around line 17-19):

```javascript
// BEFORE:
const handleGoToRentalApp = () => {
  window.location.href = `/rental-application?proposal=${proposalId}`;
};

// AFTER:
const handleGoToRentalApp = () => {
  // Get user ID - we need this for account profile route
  // The userId should be available from the logged-in context
  // Since this modal appears after proposal submission, user is definitely logged in
  const userId = localStorage.getItem('splitlease_user_id') ||
                 sessionStorage.getItem('splitlease_session_id');

  if (userId) {
    const params = new URLSearchParams();
    params.set('section', 'rental-application');
    params.set('openRentalApp', 'true');
    if (proposalId) {
      params.set('proposal', proposalId);
    }
    window.location.href = `/account-profile/${userId}?${params.toString()}`;
  } else {
    // Fallback: use goToRentalApplication which handles getting userId
    // This requires importing the navigation utility
    import('../lib/navigation.js').then(({ goToRentalApplication }) => {
      goToRentalApplication(proposalId, { openModal: true, scrollToSection: true });
    });
  }
};
```

2. Alternatively, simpler approach using dynamic import at top:
```javascript
// Add at top of file (line ~9):
import { goToRentalApplication } from '../lib/navigation.js';

// Then simplify the handler:
const handleGoToRentalApp = () => {
  goToRentalApplication(proposalId);
};
```

**Validation:** After proposal submission, clicking "Submit Rental Application" navigates to account profile with modal open

---

### Step 9: Add Redirect for /rental-application Route

**Files:** `app/src/routes.config.js`

**Purpose:** Handle backward compatibility by redirecting old URL to account profile

**Details:**
1. Modify the existing rental-application route entry:

```javascript
// BEFORE (around line 285-293):
{
  path: '/rental-application',
  file: 'rental-application.html',
  aliases: ['/rental-application.html'],
  protected: true,
  cloudflareInternal: true,
  internalName: 'rental-application-view',
  hasDynamicSegment: false
},

// AFTER - Mark as deprecated with redirect behavior:
{
  path: '/rental-application',
  file: 'rental-application.html',
  aliases: ['/rental-application.html'],
  protected: true,
  cloudflareInternal: true,
  internalName: 'rental-application-view',
  hasDynamicSegment: false,
  deprecated: true,
  redirectTo: '/account-profile' // Note: actual redirect handled in page component
},
```

2. The actual redirect will be handled in the RentalApplicationPage component.

**Validation:** Route config reflects deprecation status

---

### Step 10: Update RentalApplicationPage to Redirect

**Files:** `app/src/islands/pages/RentalApplicationPage.jsx`

**Purpose:** Convert standalone page to redirect to account profile

**Details:**
1. Replace the entire page content with a redirect component:

```javascript
/**
 * RentalApplicationPage - DEPRECATED
 *
 * This page has been deprecated. The rental application is now accessed
 * via the Account Profile page as a modal wizard.
 *
 * This component handles backward compatibility by redirecting users
 * to the new location.
 */

import { useEffect } from 'react';
import { getSessionId } from '../../lib/auth.js';

export default function RentalApplicationPage() {
  useEffect(() => {
    // Get the user ID for redirect
    const userId = getSessionId();

    // Preserve any query params (like proposal ID)
    const params = new URLSearchParams(window.location.search);
    const proposalId = params.get('proposal');

    // Build redirect URL
    const redirectParams = new URLSearchParams();
    redirectParams.set('section', 'rental-application');
    redirectParams.set('openRentalApp', 'true');
    if (proposalId) {
      redirectParams.set('proposal', proposalId);
    }

    if (userId) {
      window.location.replace(`/account-profile/${userId}?${redirectParams.toString()}`);
    } else {
      // Not logged in - redirect to home (route is protected anyway)
      window.location.replace('/');
    }
  }, []);

  // Show loading state while redirecting
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e5e7eb',
        borderTopColor: '#7c3aed',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ marginTop: '16px', color: '#6b7280' }}>
        Redirecting to your profile...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
```

**Validation:** Visiting `/rental-application` redirects to `/account-profile/{userId}?section=rental-application&openRentalApp=true`

---

### Step 11: Clean Up Old Directory

**Files:** `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/`

**Purpose:** Remove the old component directory after confirming everything works

**Details:**
1. Delete the old directory after validation:
   - `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/` (entire directory)

2. This should be done AFTER all other steps are validated

**Validation:** Old directory no longer exists, no broken imports

---

### Step 12: Run Route Generation Script

**Files:** Generated files in `app/public/`

**Purpose:** Regenerate Cloudflare routing files after route changes

**Details:**
1. Run the route generation command:
```bash
cd app && bun run generate-routes
```

2. Verify the following files were updated:
   - `app/public/_redirects`
   - `app/public/_routes.json`

**Validation:** No errors during generation, files contain expected routes

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| User not logged in accesses `/rental-application` | Redirect to home page (protected route) |
| User ID not available in navigation function | Log error, redirect to home |
| Host user tries to access rental application | Section/modal not rendered (existing behavior) |
| URL params cleaned after modal opens | Prevents issues on page refresh |
| Old bookmarked URLs to `/rental-application` | Redirect preserves proposal ID if present |

---

## Testing Considerations

### Manual Testing Scenarios

1. **LoggedInAvatar Navigation**
   - Log in as guest
   - Click avatar dropdown
   - Click "Rental Application"
   - Verify: Page navigates to account profile and scrolls to rental application section

2. **ProposalSuccessModal Navigation**
   - Submit a proposal as guest
   - On success modal, click "Submit Rental Application"
   - Verify: Page navigates to account profile with modal auto-opened

3. **Direct URL Access**
   - Navigate to `/account-profile/{userId}?section=rental-application`
   - Verify: Page scrolls to rental application section
   - Navigate to `/account-profile/{userId}?openRentalApp=true`
   - Verify: Modal opens automatically

4. **Backward Compatibility**
   - Navigate to `/rental-application`
   - Verify: Redirects to account profile with modal
   - Navigate to `/rental-application?proposal=12345`
   - Verify: Redirects with proposal param preserved

5. **Host User Protection**
   - Log in as host
   - Attempt to access rental application via URL params
   - Verify: Modal does not open, section not visible

---

## Rollback Strategy

1. Restore `RentalApplicationWizardModal/` directory to original location
2. Revert `AccountProfilePage.jsx` import path
3. Revert `navigation.js` `goToRentalApplication()` function
4. Revert `LoggedInAvatar.jsx` menu item path
5. Revert `ProposalSuccessModal.jsx` navigation
6. Revert `RentalApplicationPage.jsx` to original implementation
7. Revert `routes.config.js` if modified
8. Re-run `bun run generate-routes`

---

## Dependencies & Blockers

- None identified - all files are within the frontend codebase
- No database changes required
- No edge function changes required

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Broken imports after move | Low | High | Test import paths before deleting old files |
| URL params not cleaned properly | Low | Low | URL cleaning is optional enhancement |
| Scroll position incorrect | Medium | Low | Use setTimeout to ensure DOM is ready |
| Host users see rental app content | Low | Medium | Existing conditional rendering prevents this |
| Redirect loop | Low | High | Use `window.location.replace()` not `.href` for redirect page |

---

## Files Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `app/src/islands/shared/RentalApplicationWizardModal/index.js` | Barrel export for shared component |

### Files to Move

| From | To |
|------|-----|
| `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/*` | `app/src/islands/shared/RentalApplicationWizardModal/` |

### Files to Modify

| Path | Changes |
|------|---------|
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Update import path |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Add URL param handling |
| `app/src/islands/pages/AccountProfilePage/components/EditorView.jsx` | Add section ID |
| `app/src/lib/navigation.js` | Modify `goToRentalApplication()` |
| `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx` | Update menu item path |
| `app/src/islands/modals/ProposalSuccessModal.jsx` | Update redirect logic |
| `app/src/islands/pages/RentalApplicationPage.jsx` | Convert to redirect |
| `app/src/routes.config.js` | Mark route as deprecated |

### Files to Delete

| Path | Reason |
|------|--------|
| `app/src/islands/pages/AccountProfilePage/components/RentalApplicationWizardModal/` | Moved to shared location |

---

**Plan Version:** 1.0
**Created:** 2026-01-08
**Author:** Claude Code (Implementation Planning Architect)
