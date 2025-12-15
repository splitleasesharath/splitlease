# Implementation Plan: Host Profile Listings Section & Guest Field Removal

## Overview
Modify the Account Profile page to differentiate between host and guest users. For host accounts, remove guest-specific form fields and add a new "My Listings" section that displays the host's listings as visually appealing cards. Guest profiles will retain all existing fields unchanged.

## Success Criteria
- [ ] Host profiles no longer display guest-specific fields (Reasons to Host Me, Storage Items, Why Split Lease?, Schedule & Commute)
- [ ] Host profiles display a new "My Listings" card section showing their listings
- [ ] Listing cards are visually appealing and consistent with app design (following FavoriteListingsPage card pattern)
- [ ] Guest profiles remain unchanged (all existing fields retained)
- [ ] No breaking changes to existing functionality
- [ ] Clean code following existing patterns (Hollow Component, Islands Architecture)

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Main logic hook | Add host detection, fetch host listings |
| `app/src/islands/pages/AccountProfilePage/components/EditorView.jsx` | Editor mode wrapper | Conditionally render sections based on user type |
| `app/src/islands/pages/AccountProfilePage/components/PublicView.jsx` | Public view wrapper | Conditionally render sections based on user type |
| `app/src/islands/pages/AccountProfilePage/components/cards/ListingsCard.jsx` | **NEW FILE** | Create new card for displaying host listings |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.css` | Page styles | Add styles for listings card and listing items |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Main page component | Pass userType/isHost to child components |
| `app/src/logic/rules/users/isHost.js` | Host detection rule | Reference only (already exists) |

### Related Documentation
- [largeCLAUDE.md](.claude/Documentation/largeCLAUDE.md) - Architecture patterns
- [FavoriteListingsPage ListingCard](app/src/islands/pages/FavoriteListingsPage/components/ListingCard.jsx) - Reference design for listing cards

### Existing Patterns to Follow
- **Hollow Component Pattern**: Logic in hooks, presentation in components
- **Four-Layer Logic**: Use existing `isHost` rule from `logic/rules/users/`
- **Card Pattern**: Use existing `ProfileCard` wrapper component for consistency
- **CSS Variables**: Use existing CSS custom properties from `AccountProfilePage.css`

## Guest-Specific Fields to Remove for Hosts

Based on code analysis, these are the guest-specific sections to remove:

1. **ReasonsCard** - "Reasons to Host Me" (chip selection for good guest reasons)
2. **StorageItemsCard** - "What You'll Need to Store" (chip selection for storage items)
3. **RequirementsCard** - "Why Split Lease?" containing:
   - "Why do you need the space?" textarea with placeholder about working in the city
   - "Any special requirements?" textarea
4. **ScheduleCommuteCard** - "Schedule & Commute" containing:
   - "Which days do you typically need a place?" day selector
   - "How will you commute?" transportation dropdown

## Implementation Steps

### Step 1: Update Logic Hook - Add Host Detection & Listings Fetch
**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Detect if profile belongs to a host user and fetch their listings

**Details:**
1. Import `isHost` rule from `logic/rules/users/isHost.js`
2. Add new state for `hostListings` and `isHostUser`
3. After fetching profile data, determine if user is host using:
   - `profileData?.['Type - User Signup']` field
   - Pass through `isHost({ userType })` rule
4. If host, fetch listings using same pattern as HostOverviewPage:
   - Query `listing` table where `Host / Landlord` equals user ID
   - Include `listing_photo` join for photos
   - Include relevant fields: Name, location, pricing, photos
5. Add `hostListings` and `isHostUser` to returned API

**Code Pattern:**
```javascript
// At top of file
import { isHost } from '../../../logic/rules/users/isHost.js';

// In state section
const [hostListings, setHostListings] = useState([]);
const [loadingListings, setLoadingListings] = useState(false);

// Computed value
const isHostUser = useMemo(() => {
  const userType = profileData?.['Type - User Signup'];
  return isHost({ userType });
}, [profileData]);

// Fetch listings function
const fetchHostListings = useCallback(async (userId) => {
  if (!userId) return;
  setLoadingListings(true);
  try {
    const { data, error } = await supabase
      .from('listing')
      .select(`
        _id,
        Name,
        "Borough/Region",
        hood,
        "Qty of Bedrooms",
        "Qty of Bathrooms",
        "Start Nightly Price",
        Complete,
        listing_photo!listing_photo_listing_fkey (
          _id,
          url,
          "Order"
        )
      `)
      .eq('"Host / Landlord"', userId)
      .eq('Complete', true)
      .order('_created_date', { ascending: false });

    if (error) throw error;
    setHostListings(data || []);
  } catch (err) {
    console.error('Error fetching host listings:', err);
  } finally {
    setLoadingListings(false);
  }
}, []);
```

**Validation:** Console log `isHostUser` value and `hostListings` after fetch completes

---

### Step 2: Create ListingsCard Component
**Files:** `app/src/islands/pages/AccountProfilePage/components/cards/ListingsCard.jsx` (NEW)
**Purpose:** Display host's listings as attractive cards

**Details:**
1. Create new component following existing card pattern
2. Use `ProfileCard` wrapper for consistency
3. Display listings in a responsive grid layout (2 columns on desktop, 1 on mobile)
4. Each listing item shows:
   - Primary photo (or placeholder if none)
   - Listing name
   - Location (Borough, Neighborhood)
   - Bedroom/Bathroom count
   - Starting nightly price
5. Clicking a listing navigates to `/view-split-lease/{listingId}`
6. Handle empty state with message and CTA button to create listing
7. Handle loading state with skeleton placeholders

**Component Structure:**
```jsx
import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

export default function ListingsCard({
  listings = [],
  loading = false,
  onListingClick,
  onCreateListing
}) {
  // Loading state
  if (loading) {
    return (
      <ProfileCard title="My Listings">
        <div className="listings-grid">
          {[1, 2].map(i => (
            <div key={i} className="listing-item-skeleton" />
          ))}
        </div>
      </ProfileCard>
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <ProfileCard title="My Listings">
        <div className="listings-empty-state">
          <svg>...</svg>
          <p>You haven't created any listings yet</p>
          <button onClick={onCreateListing}>Create Your First Listing</button>
        </div>
      </ProfileCard>
    );
  }

  // Listings grid
  return (
    <ProfileCard title="My Listings">
      <div className="listings-grid">
        {listings.map(listing => (
          <ListingItem key={listing._id} listing={listing} onClick={onListingClick} />
        ))}
      </div>
    </ProfileCard>
  );
}

function ListingItem({ listing, onClick }) {
  const photos = listing.listing_photo || [];
  const primaryPhoto = photos.sort((a, b) => (a.Order || 0) - (b.Order || 0))[0];
  const photoUrl = primaryPhoto?.url || null;

  const handleClick = () => {
    onClick?.(listing._id);
  };

  return (
    <div className="listing-item" onClick={handleClick}>
      <div className="listing-item-photo">
        {photoUrl ? (
          <img src={photoUrl} alt={listing.Name} />
        ) : (
          <div className="listing-item-photo-placeholder">
            <svg>...</svg>
          </div>
        )}
      </div>
      <div className="listing-item-details">
        <h4 className="listing-item-name">{listing.Name}</h4>
        <p className="listing-item-location">
          {listing['Borough/Region']}{listing.hood && `, ${listing.hood}`}
        </p>
        <div className="listing-item-meta">
          <span>{listing['Qty of Bedrooms'] || 0} bed, {listing['Qty of Bathrooms'] || 0} bath</span>
          <span className="listing-item-price">
            ${listing['Start Nightly Price'] || 0}/night
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Visually inspect card renders correctly with sample data

---

### Step 3: Add CSS Styles for ListingsCard
**Files:** `app/src/islands/pages/AccountProfilePage/AccountProfilePage.css`
**Purpose:** Style the new listings card and listing items

**Details:**
Add styles following existing design tokens and patterns:

```css
/* ============================================================================
   LISTINGS CARD (HOST PROFILE)
   ============================================================================ */

.listings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .listings-grid {
    grid-template-columns: 1fr;
  }
}

.listing-item {
  background: var(--sl-bg-body);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid var(--sl-border-subtle);
}

.listing-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.listing-item-photo {
  position: relative;
  height: 140px;
  background-color: var(--sl-border-subtle);
  overflow: hidden;
}

.listing-item-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.listing-item-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sl-primary-soft);
}

.listing-item-photo-placeholder svg {
  width: 32px;
  height: 32px;
  color: var(--sl-primary);
}

.listing-item-details {
  padding: 12px;
}

.listing-item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--sl-text-main);
  margin: 0 0 4px 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing-item-location {
  font-size: 13px;
  color: var(--sl-text-secondary);
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listing-item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--sl-text-tertiary);
}

.listing-item-price {
  font-weight: 600;
  color: var(--sl-primary);
}

/* Listings Empty State */
.listings-empty-state {
  text-align: center;
  padding: 32px 16px;
}

.listings-empty-state svg {
  width: 48px;
  height: 48px;
  color: var(--sl-text-tertiary);
  margin-bottom: 12px;
}

.listings-empty-state p {
  font-size: 14px;
  color: var(--sl-text-secondary);
  margin: 0 0 16px 0;
}

.listings-empty-state button {
  height: 40px;
  padding: 0 20px;
  background: var(--sl-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.listings-empty-state button:hover {
  opacity: 0.9;
}

/* Listing Item Skeleton */
.listing-item-skeleton {
  height: 200px;
  background: var(--sl-bg-body);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.3; }
}
```

**Validation:** Visually confirm styles match design system

---

### Step 4: Update EditorView to Conditionally Render Sections
**Files:** `app/src/islands/pages/AccountProfilePage/components/EditorView.jsx`
**Purpose:** Hide guest-specific sections for hosts, show listings section instead

**Details:**
1. Add `isHostUser`, `hostListings`, `loadingListings`, `onListingClick`, `onCreateListing` props
2. Import `ListingsCard` component
3. Conditionally render based on `isHostUser`:
   - **If host**: Show BasicInfoCard, AboutCard, TrustVerificationCard, **ListingsCard**, VideoIntroCard, AccountSettingsCard
   - **If guest**: Show all existing sections (no changes)

**Updated Component:**
```jsx
import ListingsCard from './cards/ListingsCard.jsx';

export default function EditorView({
  formData,
  formErrors,
  profileData,
  verifications,
  goodGuestReasonsList,
  storageItemsList,
  transportationOptions,
  onFieldChange,
  onDayToggle,
  onChipToggle,
  onVerifyEmail,
  onVerifyPhone,
  onVerifyGovId,
  onConnectLinkedIn,
  onEditPhone,
  onOpenNotificationSettings,
  onChangePassword,
  // New props for host support
  isHostUser = false,
  hostListings = [],
  loadingListings = false,
  onListingClick,
  onCreateListing
}) {
  return (
    <>
      {/* Basic Information - Always shown */}
      <BasicInfoCard ... />

      {/* About You - Always shown */}
      <AboutCard ... />

      {/* Guest-only: Why Split Lease? */}
      {!isHostUser && (
        <RequirementsCard ... />
      )}

      {/* Guest-only: Schedule & Commute */}
      {!isHostUser && (
        <ScheduleCommuteCard ... />
      )}

      {/* Trust & Verification - Always shown */}
      <TrustVerificationCard ... />

      {/* Guest-only: Reasons to Host Me */}
      {!isHostUser && (
        <ReasonsCard ... />
      )}

      {/* Guest-only: Storage Items */}
      {!isHostUser && (
        <StorageItemsCard ... />
      )}

      {/* Host-only: My Listings */}
      {isHostUser && (
        <ListingsCard
          listings={hostListings}
          loading={loadingListings}
          onListingClick={onListingClick}
          onCreateListing={onCreateListing}
        />
      )}

      {/* Video Introduction - Always shown */}
      <VideoIntroCard ... />

      {/* Account Settings - Always shown */}
      <AccountSettingsCard ... />
    </>
  );
}
```

**Validation:** Toggle between host/guest user type and verify correct sections display

---

### Step 5: Update PublicView for Host/Guest Differentiation
**Files:** `app/src/islands/pages/AccountProfilePage/components/PublicView.jsx`
**Purpose:** Hide guest-specific sections when viewing a host's public profile

**Details:**
1. Add `isHostUser`, `hostListings`, `onListingClick` props
2. Import `ListingsCard` component
3. Apply same conditional rendering logic as EditorView
4. For public view, listings are read-only (no create button needed)

**Validation:** View a host's public profile and confirm correct sections appear

---

### Step 6: Update Main Page Component to Pass New Props
**Files:** `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx`
**Purpose:** Wire new props from logic hook to EditorView and PublicView

**Details:**
1. Destructure new values from logic hook: `isHostUser`, `hostListings`, `loadingListings`, `handleListingClick`, `handleCreateListing`
2. Pass these props to EditorView component
3. Pass relevant props to PublicView component
4. Add handler functions in logic hook for navigation:
   - `handleListingClick(listingId)` -> navigate to `/view-split-lease/${listingId}`
   - `handleCreateListing()` -> navigate to `/self-listing`

**Validation:** Click a listing card and verify navigation works

---

### Step 7: Call fetchHostListings in Initialization
**Files:** `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js`
**Purpose:** Ensure listings are fetched when profile loads

**Details:**
In the `useEffect` initialization block, after fetching profile data:
```javascript
// After fetchProfileData(urlUserId)
const userData = await fetchProfileData(urlUserId);

// Check if host and fetch listings
if (userData) {
  const userType = userData['Type - User Signup'];
  if (isHost({ userType })) {
    await fetchHostListings(urlUserId);
  }
}
```

**Validation:** Verify network request fires for host profiles only

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Host with no listings | Show empty state with "Create Your First Listing" CTA |
| Host with listings but photos failed to load | Show placeholder image |
| User type is null/undefined | Default to guest view (show all sections) |
| Listing fetch fails | Log error, show empty listings section (non-blocking) |
| User viewing own host profile vs another host's profile | Both should show listings section, but only own profile is editable |
| Trial Host | Treat same as full Host (isHost rule handles this) |
| Split Lease internal user | Treat as Host (isHost rule handles this) |

## Testing Considerations

### Manual Testing Checklist
- [ ] Login as guest user -> Profile shows all existing fields
- [ ] Login as host user -> Profile hides guest fields, shows listings
- [ ] Host with listings -> Cards display correctly
- [ ] Host with no listings -> Empty state displays with CTA
- [ ] Click listing card -> Navigates to listing detail page
- [ ] Click "Create Your First Listing" -> Navigates to /self-listing
- [ ] View another host's public profile -> Shows their listings (read-only)
- [ ] View guest's public profile -> Shows guest fields
- [ ] Responsive layout -> Grid stacks to single column on mobile
- [ ] Save/Cancel still works after changes

### Test Users
- Guest user: Any user with `Type - User Signup` containing "Guest"
- Host user: Any user with `Type - User Signup` containing "Host"
- Trial Host: User with `Type - User Signup` = "Trial Host"

## Rollback Strategy

If issues arise:
1. Remove conditional rendering from EditorView.jsx and PublicView.jsx
2. Remove `isHostUser`, `hostListings` related code from logic hook
3. Delete ListingsCard.jsx component
4. Remove new CSS styles from AccountProfilePage.css

All changes are additive and contained within the AccountProfilePage directory, making rollback straightforward.

## Dependencies & Blockers

- **None identified**: All required patterns and data structures already exist in codebase
- The `listing` table already has the fields needed
- The `listing_photo` table can be joined via `listing_photo_listing_fkey` foreign key
- The `isHost` rule already exists and handles all host variants

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database query fails for listings | Low | Medium | Add error handling, fail gracefully |
| User type detection inaccurate | Low | High | Use existing tested `isHost` rule |
| CSS conflicts with existing styles | Low | Low | Use scoped class names |
| Performance with many listings | Low | Low | Limit to first 10 listings, add pagination later if needed |

---

## Files Referenced Summary

### Files to Modify
1. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\useAccountProfilePageLogic.js`
2. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\EditorView.jsx`
3. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\PublicView.jsx`
4. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\AccountProfilePage.jsx`
5. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\AccountProfilePage.css`

### Files to Create
1. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\ListingsCard.jsx`

### Reference Files (Read Only)
1. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\rules\users\isHost.js`
2. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\ListingCard.jsx`
3. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\components\ListingCard.css`
4. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostOverviewPage\useHostOverviewPageLogic.js`
5. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\ReasonsCard.jsx`
6. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\StorageItemsCard.jsx`
7. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\RequirementsCard.jsx`
8. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\cards\ScheduleCommuteCard.jsx`
9. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\AccountProfilePage\components\shared\ProfileCard.jsx`

---

**Plan Version**: 1.0
**Created**: 2025-12-14 18:45:00
**Author**: Claude (Implementation Planner)
