# CreateDuplicateListingModal Component

A reusable React island component for creating new property listings or duplicating existing ones. Converted from Bubble.io element to integrate with Split Lease's Supabase architecture.

## Features

- ✅ **Create New Listings** - Initialize with default values (inactive, $500 deposit, 1 bed)
- ✅ **Duplicate Existing Listings** - Copy all properties from existing listings
- ✅ **Authentication-Aware** - "Copy Existing" button only visible when user is logged in
- ✅ **Profile Completeness Tracking** - Marks first listing creation
- ✅ **Form Validation** - Requires listing name before submission
- ✅ **Dual View Modes** - Toggle between "Create New" and "Copy Existing"
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Supabase Integration** - Direct database operations
- ✅ **Toast Notifications** - Success/error feedback

## Installation

### 1. Import the Component

The component is already created at `app/src/islands/shared/CreateDuplicateListingModal.jsx`

### 2. Import the CSS

Add this to your page's HTML `<head>` or main CSS file:

```html
<link rel="stylesheet" href="/src/styles/components/create-listing-modal.css" />
```

## Usage

### Basic Example

```jsx
import { useState } from 'react';
import CreateDuplicateListingModal from './islands/shared/CreateDuplicateListingModal.jsx';

function MyPage() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [listings, setListings] = useState([]);

  return (
    <>
      <button onClick={() => setIsModalVisible(true)}>
        Create Listing
      </button>

      <CreateDuplicateListingModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        currentUser={currentUser}
        existingListings={listings}
        onSuccess={(listing) => {
          console.log('Created listing:', listing);
          setListings([...listings, listing]);
        }}
        onNavigateToListing={(listingId) => {
          window.location.href = `/listing-management?id=${listingId}`;
        }}
      />
    </>
  );
}
```

### With Authentication

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import CreateDuplicateListingModal from './islands/shared/CreateDuplicateListingModal.jsx';

function HostDashboard() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [listings, setListings] = useState([]);

  // Fetch current user
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('zat_user')
          .select('*')
          .eq('email', user.email)
          .single();
        setCurrentUser(data);
      }
    }
    loadUser();
  }, []);

  // Fetch user's listings
  useEffect(() => {
    async function loadListings() {
      if (!currentUser) return;

      const { data } = await supabase
        .from('zat_listings')
        .select('*')
        .eq('Host email', currentUser.email)
        .order('Created Date', { ascending: false });

      setListings(data || []);
    }
    loadListings();
  }, [currentUser]);

  return (
    <div>
      <h1>My Listings</h1>
      <button onClick={() => setIsModalVisible(true)}>
        + Create New Listing
      </button>

      <CreateDuplicateListingModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        currentUser={currentUser}
        existingListings={listings}
        onSuccess={(listing) => {
          setListings([listing, ...listings]);
        }}
        onNavigateToListing={(listingId) => {
          window.location.href = `/self-listing?id=${listingId}`;
        }}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isVisible` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Called when modal is closed (X button, Escape key, overlay click) |
| `currentUser` | `object \| null` | No | Current logged-in user from `zat_user` table. If `null`, "Copy Existing" is hidden |
| `existingListings` | `array` | No | Array of existing listings from `zat_listings` table for duplication |
| `onSuccess` | `(listing) => void` | No | Called after successful creation/duplication with the new listing object |
| `onNavigateToListing` | `(listingId) => void` | No | Called to navigate to listing detail page. Receives the new listing's `_id` |

## User Object Structure

The `currentUser` prop should match the `zat_user` table structure:

```javascript
{
  _id: 'user-uuid',
  email: 'user@example.com',
  firstName: 'John',
  'Name - Full': 'John Doe',
  'is usability tester': false,
  tasksCompleted: ['profile', 'listing'],
  'Account - Host / Landlord': {
    _id: 'host-account-uuid'
  }
}
```

## Listing Object Structure

The `existingListings` prop should match the `zat_listings` table structure:

```javascript
{
  _id: 'listing-uuid',
  Name: 'Cozy Downtown Apartment',
  active: false,
  'Default Extension Setting': false,
  '💰Damage Deposit': 500,
  'Host / Landlord': 'host-account-uuid',
  'HOST name': 'John Doe',
  'Host email': 'john@example.com',
  'Features - Qty Beds': 1,
  // ... other fields
}
```

## Default Values for New Listings

When creating a new listing, these defaults are set:

- `active`: `false` (inactive)
- `Default Extension Setting`: `false`
- `💰Damage Deposit`: `500` (dollars)
- `Features - Qty Beds`: `1`
- `Operator Last Updated AUT`: Current timestamp
- `HOST name`: User's full name or first name
- `Host email`: User's email
- `isForUsability`: User's usability tester status

## Authentication Behavior

### When Logged In (currentUser provided):
- ✅ Shows "Create New" button
- ✅ Shows "Copy Existing" button (if listings exist)
- ✅ Tracks profile completeness
- ✅ Associates listing with user account

### When Logged Out (currentUser = null):
- ✅ Shows "Create New" button only
- ❌ Hides "Copy Existing" button
- ❌ No profile tracking
- ⚠️ Creates listing without user association (edge case)

## Workflows Implemented

All 8 workflows from the original Bubble.io element:

1. **Alerts General** - Toast notification system
2. **B: Back is clicked** - Return to create mode from copy mode
3. **B: Copy is clicked** - Show copy/duplicate interface
4. **B: Create New is clicked** - Create listing with default values
5. **B: Duplicate is clicked** - Copy existing listing with all properties
6. **D: Listings value changed** - Handle dropdown selection changes
7. **I: Close Create New Listing is clicked** - Close modal
8. **Update profile completeness** - Track first listing creation

## Styling

The component uses CSS classes prefixed with `create-listing-*`. The styles are defined in `app/src/styles/components/create-listing-modal.css` and follow Split Lease's design system:

- **Colors**: `#31133D` (dark purple), `#4B47CE` (purple), `#FFFFFF` (white), `#F7F8F9` (light gray)
- **Typography**:
  - Inter (headings/titles)
  - DM Sans (buttons)
  - Lato (input fields)
- **Responsive**: Mobile breakpoint at 700px and 480px
- **Animations**: Fade-in overlay, slide-in modal

## Keyboard Shortcuts

- **Escape** - Close modal
- **Tab** - Navigate between form fields
- **Enter** - Submit form (when input is focused)

## Examples

### Opening Modal from Button
```jsx
<button
  className="btn-primary"
  onClick={() => setIsModalVisible(true)}
>
  + Create New Listing
</button>
```

### Opening Modal from Header
```jsx
// In your Header component
<nav>
  <a href="/dashboard">Dashboard</a>
  <button onClick={() => setShowCreateModal(true)}>
    Create Listing
  </button>
</nav>
```

### Fetching Listings for Duplication
```javascript
async function fetchUserListings(userEmail) {
  const { data, error } = await supabase
    .from('zat_listings')
    .select('*')
    .eq('Host email', userEmail)
    .order('Created Date', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  return data;
}
```

## Integration with Existing Pages

### Account Profile Page
```jsx
// app/src/islands/pages/AccountProfilePage.jsx
import CreateDuplicateListingModal from '../shared/CreateDuplicateListingModal.jsx';

// Add state
const [showCreateModal, setShowCreateModal] = useState(false);

// Add button in render
<button onClick={() => setShowCreateModal(true)}>
  + Create Listing
</button>

// Add modal
<CreateDuplicateListingModal
  isVisible={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  currentUser={currentUser}
  existingListings={userListings}
  onSuccess={(listing) => {
    // Refresh listings
    loadUserListings();
  }}
  onNavigateToListing={(id) => {
    window.location.href = `/self-listing?id=${id}`;
  }}
/>
```

## Troubleshooting

### Modal not appearing
- Check that `isVisible={true}` is set
- Verify CSS file is imported
- Check z-index conflicts (modal uses z-index: 9999)

### "Copy Existing" button not showing
- Verify `currentUser` is not null
- Check that `existingListings` array has items
- Ensure user is authenticated

### Toast notifications not working
- Import `Toast` component in your root component
- Verify `Toast.jsx` and `toast.css` are available

### Supabase errors
- Check table name is `zat_listings`
- Verify column names match (with emojis and special characters)
- Check RLS policies allow insert operations

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT

---

**Built with ❤️ for Split Lease**
