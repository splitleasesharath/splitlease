# LoggedInAvatar Component Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### COMPONENT_CONTRACTS ###

### LoggedInAvatar
[PATH]: ./LoggedInAvatar.jsx
[INTENT]: User avatar dropdown with account menu based on user type and data counts
[PROPS]:
  - user: object (req) - User object with:
    - id: string - Bubble _id
    - name: string - Full name (first name extracted for display)
    - email: string
    - userType: 'HOST' | 'GUEST' | 'TRIAL_HOST' - Fallback if data not loaded
    - avatarUrl?: string - Optional profile photo URL
    - proposalsCount?: number - Fallback count
    - listingsCount?: number - Fallback count
    - virtualMeetingsCount?: number - Fallback count
    - houseManualsCount?: number - Fallback count
    - leasesCount?: number - Fallback count
    - favoritesCount?: number - Fallback count
    - unreadMessagesCount?: number - Fallback count
  - currentPath: string (req) - Current page path for active highlighting
  - onNavigate: (path: string) => void (req) - Callback for menu item clicks
  - onLogout: () => void (req) - Callback for Sign Out click
[BEHAVIOR]:
  - Logic: Delegates to `useLoggedInAvatarData` hook for Supabase data
  - State: Internal isOpen for dropdown toggle
  - Events: Click outside closes dropdown, menu items call onNavigate
[RENDERS]:
  - Avatar button (photo or initials placeholder)
  - Dropdown menu with conditional items based on userType and counts
  - Notification badges (purple for most, red for Messages)
[DEPENDS_ON]: ./useLoggedInAvatarData.js, ./LoggedInAvatar.css

### useLoggedInAvatarData
[PATH]: ./useLoggedInAvatarData.js
[INTENT]: Fetch user-specific data from Supabase for menu visibility
[SIGNATURE]: (userId: string) => { data: UserData, loading: boolean, error: Error | null, refetch: () => void }
[RETURNS]:
  ```
  {
    data: {
      userType: 'GUEST' | 'HOST' | 'TRIAL_HOST',
      proposalsCount: number,
      visitsCount: number,
      houseManualsCount: number,
      listingsCount: number,
      virtualMeetingsCount: number,
      leasesCount: number,
      favoritesCount: number,
      unreadMessagesCount: number
    },
    loading: boolean,
    error: Error | null,
    refetch: () => void
  }
  ```
[SIDE_EFFECTS]: Fetches from Supabase tables (user, listing, visit, virtualmeetingschedulesandlinks, Booking - Lease, message, account_host)
[DEPENDS_ON]: lib/supabase.js

### normalizeUserType
[PATH]: ./useLoggedInAvatarData.js
[INTENT]: Convert raw Supabase user type to normalized enum
[SIGNATURE]: (rawUserType: string) => 'GUEST' | 'HOST' | 'TRIAL_HOST'
[TRUTH_SOURCE]: USER_TYPES constant:
  ```
  GUEST: 'A Guest (I would like to rent a space)'
  HOST: 'A Host (I have a space available to rent)'
  TRIAL_HOST: 'Trial Host'
  SPLIT_LEASE: 'Split Lease' -> maps to HOST
  ```
[DEPENDS_ON]: None (pure function)

### getMenuVisibility
[PATH]: ./useLoggedInAvatarData.js
[INTENT]: Calculate menu item visibility based on user type and data counts
[SIGNATURE]: (data: UserData, currentPath?: string) => MenuVisibility
[OUTPUT]:
  ```
  {
    myProfile: true,           // ALWAYS visible
    myProposals: true,         // ALWAYS visible
    myProposalsSuggested: boolean, // HOST/TRIAL_HOST + proposalsCount < 1
    myListings: boolean,       // HOST/TRIAL_HOST only
    virtualMeetings: boolean,  // proposalsCount === 0
    houseManualsAndVisits: boolean, // GUEST: visits < 1, HOST: houseManualsCount === 0
    myLeases: true,            // ALWAYS visible
    myFavoriteListings: boolean, // GUEST + favoritesCount > 0
    messages: true,            // ALWAYS visible
    rentalApplication: boolean, // GUEST only
    reviewsManager: true,      // ALWAYS visible
    referral: true             // ALWAYS visible
  }
  ```
[DEPENDS_ON]: NORMALIZED_USER_TYPES constant

---

## ### CONSTANTS ###

### USER_TYPES
```javascript
{
  GUEST: 'A Guest (I would like to rent a space)',
  HOST: 'A Host (I have a space available to rent)',
  TRIAL_HOST: 'Trial Host',
  SPLIT_LEASE: 'Split Lease'
}
```

### NORMALIZED_USER_TYPES
```javascript
{
  GUEST: 'GUEST',
  HOST: 'HOST',
  TRIAL_HOST: 'TRIAL_HOST'
}
```

---

## ### MENU_VISIBILITY_RULES ###

| Menu Item | GUEST | HOST | TRIAL_HOST | Condition |
|-----------|-------|------|------------|-----------|
| My Profile | Yes | Yes | Yes | Always |
| My Proposals | Yes | Yes | Yes | Always |
| My Proposals Suggested | No | Yes | Yes | proposalsCount < 1 |
| My Listings | No | Yes | Yes | - |
| Virtual Meetings | Yes | Yes | Yes | proposalsCount === 0 |
| House Manuals & Visits | Yes | Yes | Yes | GUEST: visits < 1, HOST: houseManualsCount === 0 |
| My Leases | Yes | Yes | Yes | Always |
| My Favorite Listings | Yes | No | No | favoritesCount > 0 |
| Messages | Yes | Yes | Yes | Always (red badge) |
| Rental Application | Yes | No | No | - |
| Reviews Manager | Yes | Yes | Yes | Always |
| Referral | Yes | Yes | Yes | Always |

---

## ### ROUTING_LOGIC ###

[MY_LISTINGS_PATH]:
  - listingsCount > 1 -> '/host-overview'
  - listingsCount === 1 -> '/host-dashboard'
  - listingsCount === 0 -> '/host-overview'

[VIRTUAL_MEETINGS_PATH]:
  - GUEST -> '/guest-dashboard'
  - HOST/TRIAL_HOST -> '/host-overview'

[HOUSE_MANUALS_PATH]:
  - GUEST -> '/guest-house-manual'
  - HOST (houseManualsCount === 1) -> '/host-house-manual'
  - HOST (otherwise) -> '/host-overview'

---

## ### DEPENDENCIES ###

[LOCAL]: ./index.js, ./LoggedInAvatar.css, ./useLoggedInAvatarData.js
[EXTERNAL]: lib/supabase.js, react
[EXPORTS]: LoggedInAvatar (default), useLoggedInAvatarData, normalizeUserType, getMenuVisibility, USER_TYPES, NORMALIZED_USER_TYPES

---

## ### USAGE_PATTERN ###

```javascript
import { LoggedInAvatar } from 'islands/shared/LoggedInAvatar'

<LoggedInAvatar
  user={{ id: 'user123', name: 'John Doe', userType: 'GUEST' }}
  currentPath="/guest-proposals"
  onNavigate={(path) => window.location.href = path}
  onLogout={() => logoutUser()}
/>
```

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 6
