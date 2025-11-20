# LoggedInAvatar Island Component

A fully-featured React dropdown menu component for authenticated users in the Split Lease application. This is a **shared island component** that can be integrated into any page.

## Features

- **User Type Conditional Rendering**: Different menu items displayed for HOST, GUEST, and TRIAL_HOST users
- **Smart Routing**: Navigation paths adjust based on user data (e.g., single listing vs multiple listings)
- **Notification Badges**: Purple badges for most items, red badge for urgent Messages
- **Active Page Highlighting**: Visual indicator for current page
- **Hover States**: Interactive feedback on menu items
- **Click Outside to Close**: Dropdown closes when clicking outside
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Keyboard navigation and ARIA attributes

## Installation

The component is already available in the shared islands directory:
```
app/src/islands/shared/LoggedInAvatar.jsx
app/src/islands/shared/LoggedInAvatar.css
```

## Usage

### Basic Integration

```jsx
import LoggedInAvatar from './islands/shared/LoggedInAvatar';

function MyPage() {
  const currentUser = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    userType: 'HOST', // or 'GUEST' or 'TRIAL_HOST'
    avatarUrl: 'https://example.com/avatar.jpg', // optional
    proposalsCount: 3,
    listingsCount: 2,
    virtualMeetingsCount: 1,
    houseManualsCount: 2,
    leasesCount: 1,
    favoritesCount: 5,
    unreadMessagesCount: 2,
  };

  const handleNavigate = (path) => {
    // Implement your navigation logic
    window.location.href = path;
  };

  const handleLogout = () => {
    // Implement your logout logic
    console.log('User logged out');
  };

  return (
    <div>
      <header>
        <LoggedInAvatar
          user={currentUser}
          currentPath={window.location.pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </header>
    </div>
  );
}
```

### Integration with Supabase Authentication

```jsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LoggedInAvatar from './islands/shared/LoggedInAvatar';

function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user data from Supabase
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Fetch additional user profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        // Fetch counts for badges
        const { count: proposalsCount } = await supabase
          .from('proposals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        const { count: listingsCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        // ... fetch other counts

        setUser({
          id: authUser.id,
          name: profile.name,
          email: authUser.email,
          userType: profile.user_type,
          avatarUrl: profile.avatar_url,
          proposalsCount: proposalsCount || 0,
          listingsCount: listingsCount || 0,
          virtualMeetingsCount: 0,
          houseManualsCount: 0,
          leasesCount: 0,
          favoritesCount: 0,
          unreadMessagesCount: 0,
        });
      }
    }

    loadUser();
  }, []);

  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (!user) return null;

  return (
    <LoggedInAvatar
      user={user}
      currentPath={window.location.pathname}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />
  );
}
```

## Props

### LoggedInAvatarProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | `Object` | Yes | Current user object with profile and stats |
| `currentPath` | `string` | Yes | Current page path for active highlighting |
| `onNavigate` | `Function` | Yes | Callback when user clicks menu item (receives path) |
| `onLogout` | `Function` | Yes | Callback when user clicks Sign Out |

### User Object Structure

```typescript
{
  id: string;                    // User ID
  name: string;                  // User's full name
  email: string;                 // User's email
  userType: 'HOST' | 'GUEST' | 'TRIAL_HOST';  // User type
  avatarUrl?: string;            // Optional avatar image URL
  proposalsCount: number;        // Count of proposals
  listingsCount: number;         // Count of listings
  virtualMeetingsCount: number;  // Count of virtual meetings
  houseManualsCount: number;     // Count of house manuals
  leasesCount: number;           // Count of leases
  favoritesCount: number;        // Count of favorite listings
  unreadMessagesCount: number;   // Count of unread messages
}
```

## Menu Items by User Type

### All Users
- My Profile
- My Listings
- Virtual Meetings
- House manuals & Visits
- My Leases
- My Favorite Listings
- Messages
- Rental Application
- Reviews Manager
- Referral
- Sign Out

### HOST / TRIAL_HOST Only
- My Proposals

### GUEST Only
- Suggested Proposal

## Smart Routing Logic

The component implements intelligent routing based on user data:

- **My Listings**:
  - Multiple listings (>1): → `/host-overview`
  - Single listing (1): → `/host-dashboard`
  - No listings (0): → `/host-overview`

- **House Manuals**:
  - HOST with 1 manual: → `/host-house-manual`
  - HOST with 0 or >1 manuals: → `/host-overview`
  - GUEST: → `/guest-house-manual`

- **Virtual Meetings**:
  - HOST: → `/host-overview`
  - GUEST: → `/guest-dashboard`

- **My Leases**:
  - HOST: → `/host-leases`
  - GUEST: → `/guest-leases`

## Styling

The component uses its own CSS file (`LoggedInAvatar.css`) with the following design specifications:

- **Colors**:
  - Background: `#FFFFFF`
  - Hover: `#CAC8C8`
  - Active Border: `#FF6B35`
  - Purple Badge: `#31135D`
  - Red Badge: `#FF0000`

- **Typography**:
  - Font: DM Sans
  - Size: 15px (menu items), 14px (badges)
  - Weight: 500 (regular), 700 (badges)

- **Layout**:
  - Max width: 300px
  - Menu item height: 46px
  - Border radius: 10px
  - Shadow: `0px 10px 20px rgba(0,0,0,0.1)`

## Required Icons

The component expects the following icon files in `/icons/`:

- User.svg
- Proposals-purple.svg
- Listing.svg
- virtual meeting.svg
- House Manual 1.svg
- Leases-purple.svg
- Favorite.svg
- Message.svg
- suitcase-svgrepo-com 1.svg
- check green.svg
- Referral.svg
- Log out.svg

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Example: Integration in account-profile.jsx

```jsx
import { useState, useEffect } from 'react';
import LoggedInAvatar from './islands/shared/LoggedInAvatar';

export default function AccountProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load user data from your auth system
    // This is a mock example
    setUser({
      id: '123',
      name: 'Jane Smith',
      email: 'jane@example.com',
      userType: 'HOST',
      proposalsCount: 5,
      listingsCount: 3,
      virtualMeetingsCount: 2,
      houseManualsCount: 3,
      leasesCount: 2,
      favoritesCount: 8,
      unreadMessagesCount: 1,
    });
  }, []);

  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleLogout = () => {
    // Implement logout
    console.log('Logging out...');
  };

  return (
    <div className="account-profile-page">
      <header className="page-header">
        <h1>My Account</h1>
        {user && (
          <LoggedInAvatar
            user={user}
            currentPath="/account-profile"
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}
      </header>
      {/* Rest of your page content */}
    </div>
  );
}
```

## Customization

If you need to customize the component:

1. **Change styling**: Edit `LoggedInAvatar.css`
2. **Modify menu items**: Edit the `getMenuItems()` function in `LoggedInAvatar.jsx`
3. **Add new user types**: Extend the conditionals in `getMenuItems()`
4. **Change routing logic**: Modify the path assignments in menu items

## Accessibility

The component includes:
- ARIA labels for screen readers
- Keyboard navigation support
- Focus indicators
- Semantic HTML structure

## Performance

- Lightweight: Only ~10KB total (JSX + CSS)
- No external dependencies beyond React
- Efficient re-rendering with proper state management
- CSS animations for smooth transitions

## License

Proprietary - Split Lease
