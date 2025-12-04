# Host Overview Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/host-overview`
**ENTRY_POINT**: `app/src/host-overview.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
host-overview.jsx (Entry Point)
    |
    +-- HostOverviewPage.jsx (Hollow Component)
            |
            +-- useHostOverviewPageLogic.js (Business Logic Hook)
            |       +-- Auth validation via checkAuthStatus
            |       +-- Data fetching (listings, manuals, meetings)
            |       +-- CRUD operations for listings/manuals
            |       +-- Toast notification management
            |       +-- Modal state management
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- Footer.jsx (Site footer)
                +-- Welcome Section
                |       +-- Help banner (dismissible)
                |       +-- Action buttons (Create/Import)
                +-- Listings to Claim Section
                |       +-- ClaimListingCard.jsx (per listing)
                +-- Your Listings Section
                |       +-- ListingCard.jsx (per listing)
                |       +-- Empty state
                +-- House Manuals Section
                |       +-- HouseManualCard.jsx (per manual)
                |       +-- Empty state
                +-- Virtual Meetings Section
                |       +-- VirtualMeetingCard.jsx (per meeting)
                +-- Modals
                |       +-- ConfirmModal.jsx (Delete confirmation)
                +-- Toast Notifications
                        +-- ToastContainer.jsx
                        +-- Toast.jsx (individual notifications)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/host-overview.jsx` | Mounts HostOverviewPage to #host-overview-page |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostOverviewPage/HostOverviewPage.jsx` | Main hollow component |
| `app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js` | Core business logic hook |

### Sub-Components (in components/)
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx` | Card, ListingCard, ClaimListingCard, HouseManualCard, VirtualMeetingCard |
| `app/src/islands/pages/HostOverviewPage/components/HostOverviewButton.jsx` | Button component with variants |
| `app/src/islands/pages/HostOverviewPage/components/HostOverviewModals.jsx` | Modal, ConfirmModal components |
| `app/src/islands/pages/HostOverviewPage/components/HostOverviewToast.jsx` | Toast, ToastContainer components |
| `app/src/islands/pages/HostOverviewPage/components/index.js` | Re-exports all components |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/host-overview.css` | Complete page styling (1081 lines) |
| `app/src/islands/pages/HostOverviewPage/HostOverviewPage.css` | Component-specific overrides |

### HTML
| File | Purpose |
|------|---------|
| `app/public/host-overview.html` | HTML entry with #host-overview-page div |

---

## ### URL_ROUTING ###

```
/host-overview                    # Host dashboard
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/host-overview',
  file: 'host-overview.html',
  aliases: ['/host-overview.html'],
  protected: true,               // Requires authentication
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Navigation Function
```javascript
import { goToHostOverview } from 'lib/navigation.js'

goToHostOverview()  // Navigates to /host-overview
```

---

## ### DATA_FLOW ###

### 1. Authentication Check
```javascript
// In host-overview.jsx
const isLoggedIn = await checkAuthStatus();

// Renders page with auth state
<HostOverviewPage requireAuth={true} isAuthenticated={isLoggedIn} />
```

### 2. User Data Fetching
```javascript
// In useHostOverviewPageLogic.js
const fetchUserData = async () => {
  const userData = await validateTokenAndFetchUser();
  setUser({
    id: userData._id || userData.id,
    firstName: userData['Name - First'] || userData.firstName,
    lastName: userData['Name - Last'] || userData.lastName,
    email: userData.email,
    accountHostId: userData['Account - Host / Landlord']
  });
};
```

### 3. Parallel Data Fetching
```javascript
const [listings, claimListings, manuals, meetings] = await Promise.all([
  fetchHostListings(hostAccountId),
  fetchListingsToClaim(hostAccountId),
  fetchHouseManuals(hostAccountId),
  fetchVirtualMeetings(hostAccountId)
]);
```

### 4. API Endpoints Used
| Function | Endpoint | Method | Source |
|----------|----------|--------|--------|
| fetchHostListings | `bubble-proxy` -> `listing` | GET | Bubble via Edge Function |
| fetchListingsToClaim | `bubble-proxy` -> `listing` | GET | Bubble via Edge Function |
| fetchHouseManuals | `bubble-proxy` -> `House manual` | GET | Bubble via Edge Function |
| fetchVirtualMeetings | `virtualmeetingschedulesandlinks` | SELECT | Supabase direct |

---

## ### HOOK_RETURN_VALUES ###

```javascript
const {
  // Core data
  user,                    // { id, firstName, lastName, email, accountHostId }
  listingsToClaim,         // Array of unclaimed listings
  myListings,              // Array of host's listings
  houseManuals,            // Array of house manuals
  virtualMeetings,         // Array of virtual meetings
  loading,                 // Boolean - loading state
  error,                   // String - error message

  // UI State
  showHelpBanner,          // Boolean - show/hide help banner
  setShowHelpBanner,       // Function to toggle banner
  toasts,                  // Array of toast notifications
  removeToast,             // Function to remove toast by id

  // Modal state
  showDeleteConfirm,       // Boolean - show delete modal
  itemToDelete,            // Item pending deletion
  deleteType,              // 'listing' | 'claim' | 'manual'

  // Action handlers
  handleCreateNewListing,  // Navigate to /self-listing
  handleImportListing,     // Show import toast (TODO)
  handleCreateNewManual,   // Create new house manual via API
  handleEditListing,       // Navigate to /listing-dashboard?id={id}
  handlePreviewListing,    // Open /view-split-lease/{id} in new tab
  handleSeeDetails,        // Navigate to /view-split-lease/{id}?claim=true
  handleEditManual,        // Navigate to /host-house-manual/{id}
  handleViewVisits,        // Show visits toast (TODO)
  handleDeleteClick,       // Open delete confirmation modal
  handleConfirmDelete,     // Execute deletion
  handleCancelDelete,      // Close delete modal
  handleRespondToVirtualMeeting,  // Open meeting link

  // Utility
  loadData                 // Refresh all data
} = useHostOverviewPageLogic();
```

---

## ### DATA_MODELS ###

### User Object
```javascript
{
  id: string,              // User ID (_id or id)
  firstName: string,       // First name
  lastName: string,        // Last name
  email: string,           // Email address
  accountHostId: string    // Account - Host / Landlord ID
}
```

### Listing Object
```javascript
{
  id: string,              // Listing ID
  _id: string,             // Bubble ID
  name: string,            // Listing name
  Name: string,            // Original Bubble field
  complete: boolean,       // Is listing complete
  location: {
    borough: string        // Borough display name
  },
  leasesCount: number,     // Number of leases
  proposalsCount: number,  // Number of proposals
  photos: array            // Features - Photos array
}
```

### House Manual Object
```javascript
{
  id: string,              // Manual ID
  _id: string,             // Bubble ID
  display: string,         // Display name
  Display: string,         // Original Bubble field
  audience: string,        // Audience type (e.g., 'Guests')
  createdOn: string        // Created Date
}
```

### Virtual Meeting Object
```javascript
{
  id: string,              // Meeting ID
  _id: string,             // Same as id
  guest: {
    firstName: string      // Guest first name
  },
  listing: {
    name: string           // Associated listing name
  },
  bookedDate: string,      // ISO date string
  notifications: array     // Notification messages
}
```

### Toast Object
```javascript
{
  id: number,              // Timestamp-based ID
  title: string,           // Toast title
  message: string,         // Toast message
  type: string,            // 'success' | 'error' | 'information' | 'warning'
  duration: number         // Auto-dismiss duration (ms)
}
```

---

## ### CARD_COMPONENTS ###

### ListingCard
Host's managed listings with edit/preview/delete actions.

```jsx
<ListingCard
  listing={listing}
  onEdit={handleEditListing}
  onPreview={handlePreviewListing}
  onDelete={() => handleDeleteClick(listing, 'listing')}
  isMobile={false}
/>
```

**Displays:**
- Listing name
- Borough location
- Complete/Draft status
- Leases count badge (if > 0)
- Proposals count badge (if > 0)
- "Manage Listing" button (primary)
- "Preview" button (secondary)
- Delete icon

### ClaimListingCard
Unclaimed listings available for the host to claim.

```jsx
<ClaimListingCard
  listing={listing}
  onSeeDetails={handleSeeDetails}
  onDelete={() => handleDeleteClick(listing, 'claim')}
/>
```

**Displays:**
- Listing name
- Complete/Incomplete status
- Borough location
- "See Details" button (action)
- Delete icon

### HouseManualCard
House manual documentation cards.

```jsx
<HouseManualCard
  manual={manual}
  onEdit={handleEditManual}
  onDelete={() => handleDeleteClick(manual, 'manual')}
  onViewVisits={handleViewVisits}
  isMobile={false}
/>
```

**Displays:**
- Manual display name
- Audience type
- Created date (formatted)
- "View/Edit Manual" button (primary)
- "Visits" button (ghost)
- Delete icon

### VirtualMeetingCard
Scheduled virtual meeting cards.

```jsx
<VirtualMeetingCard
  meeting={meeting}
  onRespond={handleRespondToVirtualMeeting}
/>
```

**Displays:**
- Guest first name
- Listing name
- "Virtual meeting booked" status (with checkmark)
- Booked date/time (formatted)
- Notifications (if any)
- "Respond to Virtual Meeting" button (primary)

---

## ### BUTTON_VARIANTS ###

```jsx
<Button
  variant="primary"    // Deep purple background
  variant="secondary"  // White with purple border
  variant="action"     // Blue background
  variant="danger"     // Red background
  variant="ghost"      // Transparent background
  size="medium"        // Default size
  fullWidth={false}    // Full width option
  disabled={false}     // Disabled state
  onClick={handler}
>
  Button Text
</Button>
```

---

## ### MODAL_SYSTEM ###

### ConfirmModal
Used for delete confirmations.

```jsx
<ConfirmModal
  isOpen={showDeleteConfirm}
  onClose={handleCancelDelete}
  onConfirm={handleConfirmDelete}
  title="Delete House Manual"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Yes, Delete"
  cancelText="No, Cancel"
  variant="danger"
/>
```

### Modal Features
- Backdrop click to close
- ESC key to close
- Body scroll lock when open
- Size variants: small, medium, large
- ARIA labels for accessibility

---

## ### TOAST_SYSTEM ###

### Toast Types
| Type | Color | Icon | Border Color |
|------|-------|------|--------------|
| `success` | Green | Checkmark | #10B981 |
| `error` | Red | X | #EF4444 |
| `information` | Blue | Info | #3B82F6 |
| `warning` | Yellow | Warning | #F59E0B |

### Toast Usage
```javascript
// In useHostOverviewPageLogic
const showToast = (title, message, type = 'information', duration = 3000) => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, title, message, type, duration }]);
};

// Examples
showToast('Success', 'House manual created!', 'success');
showToast('Error', 'Failed to delete item', 'error', 5000);
showToast('Creating Listing', 'Redirecting...', 'information');
```

### Toast Features
- Auto-dismiss with progress bar
- Manual close button
- Slide-down entrance animation
- Slide-up exit animation
- Stacking support

---

## ### CSS_DESIGN_TOKENS ###

```css
/* Colors */
--ho-color-deep-purple: #3D2661;
--ho-color-royal-purple: #4E2A84;
--ho-color-primary-brand: #250856;
--ho-color-primary-blue: #4E4AFF;
--ho-color-secondary-blue: #5B56FF;
--ho-color-red: #FF6B6B;
--ho-color-coral: #E74C3C;
--ho-color-white: #FFFFFF;
--ho-color-off-white: #F5F5F5;
--ho-color-light-gray: #FAFAFA;
--ho-color-light-purple: #E8E4F0;
--ho-color-text-primary: #000000;
--ho-color-text-secondary: #666666;
--ho-color-text-light: #FFFFFF;
--ho-color-border-light: #E0E0E0;

/* Typography */
--ho-font-primary: 'DM Sans', sans-serif;

/* Spacing */
--ho-spacing-xs: 4px;
--ho-spacing-sm: 8px;
--ho-spacing-md: 12px;
--ho-spacing-lg: 16px;
--ho-spacing-xl: 20px;
--ho-spacing-2xl: 24px;
--ho-spacing-3xl: 30px;
--ho-spacing-4xl: 40px;

/* Border Radius */
--ho-radius-small: 6px;
--ho-radius-medium: 8px;
--ho-radius-large: 12px;
--ho-radius-pill: 20px;

/* Shadows */
--ho-shadow-card: 0px 2px 8px rgba(0, 0, 0, 0.08);
--ho-shadow-hover: 0px 4px 12px rgba(0, 0, 0, 0.12);

/* Transitions */
--ho-transition-normal: 0.2s ease;

/* Layout */
--ho-max-content-width: 1440px;
--ho-header-height: 70px;
```

---

## ### CSS_CLASS_REFERENCE ###

### Layout Classes
| Class | Purpose |
|-------|---------|
| `.host-overview-page-wrapper` | Root wrapper with CSS variables |
| `.host-overview-main` | Main content area |
| `.host-overview-container` | Max-width container |
| `.welcome-section` | Top welcome area |
| `.page-section` | White bordered section card |
| `.section-header` | Section header with title + button |
| `.section-heading` | Section title |

### Grid Classes
| Class | Purpose |
|-------|---------|
| `.listings-grid` | Listings grid layout |
| `.manuals-grid` | House manuals grid (auto-fill, min 300px) |
| `.meetings-grid` | Virtual meetings grid |

### Card Classes
| Class | Purpose |
|-------|---------|
| `.host-card` | Base card styling |
| `.host-card--hover` | Hover shadow effect |
| `.host-card--clickable` | Cursor pointer |
| `.listing-card` | White background listing card |
| `.claim-listing-card` | Light gray claim card |
| `.house-manual-card` | White background manual card |
| `.virtual-meeting-card` | Off-white meeting card |

### Button Classes
| Class | Purpose |
|-------|---------|
| `.btn` | Base button styling |
| `.btn--primary` | Deep purple primary button |
| `.btn--secondary` | White with border |
| `.btn--action` | Blue action button |
| `.btn--danger` | Red danger button |
| `.btn--ghost` | Transparent ghost button |
| `.btn--full-width` | 100% width |
| `.btn--disabled` | Disabled state |

### State Classes
| Class | Purpose |
|-------|---------|
| `.loading-state` | Loading spinner container |
| `.error-state` | Error message container |
| `.empty-state` | Empty state message |
| `.spinner` | Animated loading spinner |

### Badge Classes
| Class | Purpose |
|-------|---------|
| `.badge` | Base badge styling |
| `.badge--leases` | Green leases badge |
| `.badge--proposals` | Orange proposals badge |

### Toast Classes
| Class | Purpose |
|-------|---------|
| `.host-toast-container` | Fixed position container |
| `.host-toast` | Individual toast styling |
| `.host-toast--error` | Red error toast |
| `.host-toast--success` | Green success toast |
| `.host-toast--information` | Blue info toast |
| `.host-toast--warning` | Yellow warning toast |
| `.host-toast--exiting` | Exit animation |
| `.host-toast__progress` | Progress bar container |
| `.host-toast__progress-bar` | Animated progress bar |

### Modal Classes
| Class | Purpose |
|-------|---------|
| `.host-modal-backdrop` | Semi-transparent overlay |
| `.host-modal` | Modal container |
| `.host-modal--small` | Max 400px width |
| `.host-modal--medium` | Max 600px width |
| `.host-modal--large` | Max 900px width |
| `.host-modal__header` | Modal header |
| `.host-modal__title` | Modal title |
| `.host-modal__close` | Close button |
| `.host-modal__content` | Modal body |
| `.host-confirm-modal__message` | Confirmation message |
| `.host-confirm-modal__actions` | Button container |

### Help Banner Classes
| Class | Purpose |
|-------|---------|
| `.help-banner` | Dismissible help banner |
| `.help-banner__icon` | Left icon |
| `.help-banner__text` | Banner text |
| `.help-banner__close` | Close button |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 900px` | Container padding reduced, page section padding reduced, manuals grid single column |
| `< 700px` | Title 20px, help banner stacks, action buttons full width, cards stack vertically, modal actions reverse |

---

## ### DELETE_WORKFLOW ###

### 1. Initiate Delete
```javascript
handleDeleteClick(item, type)  // type: 'listing' | 'claim' | 'manual'
```

### 2. Show Confirmation
```jsx
<ConfirmModal
  title={`Delete ${deleteType === 'manual' ? 'House Manual' : 'Listing'}`}
  message={`Are you sure you want to delete ${itemName}?`}
/>
```

### 3. Execute Delete
```javascript
// Listing: DELETE via bubble-proxy
await supabase.functions.invoke('bubble-proxy', {
  body: { endpoint: `listing/${itemId}`, method: 'DELETE' }
});

// Claim: PATCH to clear Claimable By
await supabase.functions.invoke('bubble-proxy', {
  body: {
    endpoint: `listing/${itemId}`,
    method: 'PATCH',
    body: { 'Claimable By': [] }
  }
});

// Manual: DELETE via bubble-proxy
await supabase.functions.invoke('bubble-proxy', {
  body: { endpoint: `House manual/${itemId}`, method: 'DELETE' }
});
```

### 4. Update State
```javascript
setMyListings(prev => prev.filter(l => (l.id || l._id) !== itemId));
// OR
setListingsToClaim(prev => prev.filter(l => (l.id || l._id) !== itemId));
// OR
setHouseManuals(prev => prev.filter(m => (m.id || m._id) !== itemId));
```

---

## ### NAVIGATION_HANDLERS ###

| Handler | Destination | Query Params |
|---------|-------------|--------------|
| `handleCreateNewListing` | `/self-listing` | - |
| `handleEditListing` | `/listing-dashboard` | `?id={listingId}` |
| `handlePreviewListing` | `/view-split-lease/{id}` | Opens new tab |
| `handleSeeDetails` | `/view-split-lease/{id}` | `?claim=true` |
| `handleEditManual` | `/host-house-manual/{id}` | - |
| `handleCreateNewManual` | `/host-house-manual/{newId}` | After API creates manual |

---

## ### KEY_IMPORTS ###

```javascript
// Entry point
import { createRoot } from 'react-dom/client';
import HostOverviewPage from './islands/pages/HostOverviewPage/HostOverviewPage.jsx';
import { checkAuthStatus } from './lib/auth.js';
import './styles/components/host-overview.css';

// Page component
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { ListingCard, ClaimListingCard, HouseManualCard, VirtualMeetingCard } from './components/HostOverviewCards.jsx';
import { ConfirmModal } from './components/HostOverviewModals.jsx';
import { ToastContainer } from './components/HostOverviewToast.jsx';
import { Button } from './components/HostOverviewButton.jsx';
import { useHostOverviewPageLogic } from './useHostOverviewPageLogic.js';
import './HostOverviewPage.css';

// Logic hook
import { useState, useEffect, useCallback } from 'react';
import { validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

// Navigation
import { goToHostOverview } from 'lib/navigation.js';
```

---

## ### DATABASE_DEPENDENCIES ###

### Bubble Tables (via Edge Functions)
| Table | Purpose |
|-------|---------|
| `listing` | Property listings with Creator field |
| `House manual` | House manual documentation |
| `user` | User accounts |

### Supabase Tables (Direct)
| Table | Purpose |
|-------|---------|
| `virtualmeetingschedulesandlinks` | Virtual meeting records |

### Key Listing Fields
| Field | Purpose |
|-------|---------|
| `_id` | Unique identifier |
| `Name` | Listing display name |
| `Complete` | Boolean - is listing complete |
| `Creator` | Host account ID (for filtering) |
| `Claimable By` | Array of account IDs who can claim |
| `Location - Borough` | Borough object with Display |
| `Leases Count` | Number of active leases |
| `Proposals Count` | Number of proposals |
| `Features - Photos` | Photo array |

### Key House Manual Fields
| Field | Purpose |
|-------|---------|
| `_id` | Unique identifier |
| `Display` | Manual display name |
| `Host` | Host account ID |
| `Audience` | Target audience object |
| `Created Date` | Creation timestamp |

### Key Virtual Meeting Fields
| Field | Purpose |
|-------|---------|
| `id` | Unique identifier |
| `host_account_id` | Host account ID |
| `guest_first_name` | Guest's first name |
| `listing_name` | Associated listing name |
| `booked_date` | Scheduled date/time |
| `notifications` | Array of notification strings |

---

## ### ERROR_HANDLING ###

### Loading State
```jsx
if (loading) {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  );
}
```

### Error State
```jsx
if (error) {
  return (
    <div className="error-state">
      <div className="error-icon">&#9888;</div>
      <h2>Unable to Load Dashboard</h2>
      <p className="error-message">{error}</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

### Demo/Unauthenticated Fallback
```javascript
if (!userData) {
  setUser({ id: 'demo', firstName: 'Demo', lastName: 'Host', email: 'demo@example.com' });
  setListingsToClaim([]);
  setMyListings([]);
  setHouseManuals([]);
  setVirtualMeetings([]);
}
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Page won't load | Verify auth token via `checkAuthStatus()` |
| No listings showing | Check `hostAccountId` from user data |
| Delete fails | Check Edge Function response in console |
| Toast not appearing | Verify `toasts` array state |
| Modal not closing | Check `handleCancelDelete` binding |
| Cards not updating | Verify state setter calls after API |
| Styling broken | Check CSS import in host-overview.jsx |
| Help banner persists | Check `setShowHelpBanner` state |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database Tables Detailed | `Documentation/DATABASE_TABLES_DETAILED.md` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |
| Navigation Utilities | `app/src/lib/navigation.js` |
| Route Registry | `app/src/routes.config.js` |
| Auth Module | `app/src/lib/auth.js` |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive documentation for Host Overview page
