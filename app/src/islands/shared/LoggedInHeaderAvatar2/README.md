# LoggedInHeaderAvatar2

A minimal, self-contained logged-in user avatar dropdown component for the Split Lease application header.

## Overview

This component provides a simple dropdown interface for authenticated users, displaying their avatar (or initials) and providing quick access to essential account actions.

## Features

✅ **Simple 2-Option Menu**
- My Profile → `/account-profile`
- Log Out → Calls logout callback

✅ **Avatar Display**
- Shows profile photo if available
- Falls back to first initial in purple circle
- Handles protocol-relative URLs (`//cdn.example.com/photo.jpg`)

✅ **Self-Managed State**
- Internal `isOpen` state
- No dependency on parent component state
- Independent dropdown management

✅ **Interaction Handling**
- Click to toggle dropdown
- Click outside to close
- Keyboard navigation (Enter/Space/Escape)

✅ **Responsive Design**
- Desktop: Shows avatar + name + arrow
- Mobile (≤768px): Shows avatar only

✅ **Accessibility**
- ARIA attributes (role, aria-expanded, aria-haspopup)
- Keyboard navigation support
- Semantic HTML structure

## Installation

This component is already integrated into the Split Lease application structure:

```
app/src/islands/shared/LoggedInHeaderAvatar2/
├── LoggedInHeaderAvatar2.jsx    # Main component
├── LoggedInHeaderAvatar2.css    # Component styles
├── README.md                     # This file
└── index.js                      # Export file
```

## Usage

### Basic Example

```jsx
import LoggedInHeaderAvatar2 from './islands/shared/LoggedInHeaderAvatar2';

function MyHeader() {
  const currentUser = {
    firstName: 'John',
    lastName: 'Doe',
    profilePhoto: 'https://example.com/photo.jpg'
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.reload();
  };

  return (
    <LoggedInHeaderAvatar2
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}
```

### Integration in Header Component

```jsx
import LoggedInHeaderAvatar2 from './LoggedInHeaderAvatar2';

export default function Header() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      window.location.reload();
    }
  };

  return (
    <header>
      {/* Other header content */}

      {currentUser && currentUser.firstName ? (
        <LoggedInHeaderAvatar2
          user={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        /* Login/Signup buttons */
      )}
    </header>
  );
}
```

## Props API

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | Object | Yes | User data object |
| `user.firstName` | string | Yes | User's first name (displayed in header) |
| `user.lastName` | string | No | User's last name (not currently used) |
| `user.profilePhoto` | string | No | Profile photo URL (shows initials if missing) |
| `onLogout` | Function | Yes | Async callback function called when user clicks "Log Out" |

### User Object Example

```javascript
{
  firstName: 'John',
  lastName: 'Doe',
  profilePhoto: 'https://cdn.example.com/users/john-doe.jpg'
}
```

### onLogout Callback Example

```javascript
const onLogout = async () => {
  console.log('Logging out...');

  // Call your logout API
  const result = await logoutUser();

  if (result.success) {
    // Clear session, reload page, or redirect
    window.location.reload();
  } else {
    console.error('Logout failed:', result.error);
  }
};
```

## CSS Classes

### Component-Specific (in LoggedInHeaderAvatar2.css)

| Class | Purpose |
|-------|---------|
| `.logged-in-header-avatar-2` | Component root container |
| `.user-trigger` | Dropdown trigger button (avatar + name + arrow) |
| `.user-avatar` | Profile photo image (40px circle) |
| `.user-avatar-placeholder` | Initial placeholder (purple circle) |
| `.user-name-wrapper` | Container for name + arrow (hidden on mobile) |

### Shared Classes (from header.css)

The component uses these shared dropdown classes:

| Class | Purpose | Location |
|-------|---------|----------|
| `.nav-dropdown` | Base dropdown container | header.css |
| `.dropdown-menu` | Dropdown menu container | header.css |
| `.dropdown-menu.active` | Active/visible dropdown state | header.css |
| `.dropdown-item` | Individual menu item | header.css |
| `.dropdown-title` | Menu item text | header.css |
| `.dropdown-arrow` | Chevron down icon | header.css |

## Customization

### Styling

To customize the component's appearance, edit `LoggedInHeaderAvatar2.css`:

```css
/* Change avatar size */
.logged-in-header-avatar-2 .user-avatar,
.logged-in-header-avatar-2 .user-avatar-placeholder {
  width: 50px;
  height: 50px;
}

/* Change purple brand color */
.logged-in-header-avatar-2 .user-avatar {
  border-color: #your-color;
}

.logged-in-header-avatar-2 .user-avatar-placeholder {
  background-color: #your-color;
}

/* Change name font size */
.logged-in-header-avatar-2 .user-name-wrapper {
  font-size: 16px;
}
```

### Adding Menu Items

To add more menu items, edit `LoggedInHeaderAvatar2.jsx`:

```jsx
<div className={`dropdown-menu ${isOpen ? 'active' : ''}`}>
  <a href="/account-profile" className="dropdown-item">
    <span className="dropdown-title">My Profile</span>
  </a>

  {/* NEW: Add Account Settings */}
  <a href="/account-settings" className="dropdown-item">
    <span className="dropdown-title">Account Settings</span>
  </a>

  {/* NEW: Add Help Center */}
  <a href="/help" className="dropdown-item">
    <span className="dropdown-title">Help Center</span>
  </a>

  <a href="#" className="dropdown-item" onClick={handleLogoutClick}>
    <span className="dropdown-title">Log Out</span>
  </a>
</div>
```

## Behavior

### Dropdown States

- **Closed** (default): Avatar and name visible, menu hidden
- **Open** (click avatar): Dropdown menu becomes visible
- **Closing triggers**:
  - Click outside component
  - Press Escape key
  - Click a menu item (navigates away)

### Click-Outside Detection

The component uses a `useEffect` hook with event listener to detect clicks outside:

```javascript
useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest('.logged-in-header-avatar-2')) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('click', handleClickOutside);
  }

  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, [isOpen]);
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Enter | Toggle dropdown open/close |
| Space | Toggle dropdown open/close |
| Escape | Close dropdown |

## Mobile Responsive Behavior

On screens ≤768px wide:
- User name and dropdown arrow are **hidden**
- Only the avatar circle is **visible**
- Dropdown menu still fully functional

## Accessibility

### ARIA Attributes

- `role="button"` on trigger - Identifies as interactive button
- `aria-expanded={isOpen}` - Indicates dropdown state
- `aria-haspopup="true"` - Indicates presence of popup menu
- `role="menu"` on dropdown - Identifies as menu container
- `role="menuitem"` on links - Identifies as menu options

### Screen Reader Support

The component provides appropriate context for screen reader users:
- Avatar has `alt` text with user's first name
- Dropdown has `aria-label="User menu"`
- All interactive elements are keyboard accessible

## Differences from LoggedInAvatar

| Feature | LoggedInAvatar | LoggedInHeaderAvatar2 |
|---------|----------------|----------------------|
| **Purpose** | Full-featured user dashboard | Minimal header dropdown |
| **Menu Items** | 12+ with badges | 2 (Profile, Logout) |
| **Icons** | Requires SVG files | No icons needed |
| **User Types** | HOST/GUEST/TRIAL_HOST logic | No user type logic |
| **Routing** | Smart routing based on data | Simple static links |
| **Badge Counts** | Proposals, Messages, etc. | None |
| **Complexity** | ~300+ lines | ~180 lines |
| **Use Case** | Comprehensive user menu | Quick header access |

**LoggedInHeaderAvatar2** is intentionally minimal for header use only.

## Troubleshooting

### Dropdown not opening

1. Check that `user.firstName` has a value
2. Verify component is being rendered
3. Check browser console for errors

### Dropdown not closing on outside click

1. Ensure class name `.logged-in-header-avatar-2` is present
2. Check for z-index conflicts
3. Verify no other click handlers are preventing propagation

### Avatar not showing

1. Check that `user.profilePhoto` URL is valid
2. Verify CORS policy allows loading the image
3. Check network tab for image load failures
4. Component should fall back to initials automatically

### Styles not applying

1. Verify `LoggedInHeaderAvatar2.css` is imported
2. Check that `header.css` is loaded (for shared dropdown classes)
3. Inspect element in browser DevTools to debug CSS specificity

## File Structure

```
LoggedInHeaderAvatar2/
│
├── LoggedInHeaderAvatar2.jsx    # Main component (180 lines)
│   ├── Component logic
│   ├── State management (isOpen)
│   ├── Event handlers
│   ├── Click-outside detection
│   └── JSX render structure
│
├── LoggedInHeaderAvatar2.css    # Component styles (70 lines)
│   ├── Avatar styles
│   ├── Name wrapper styles
│   └── Mobile responsive rules
│
├── README.md                     # This documentation
│
└── index.js                      # Clean export
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Lightweight**: No external dependencies
- **Fast render**: Simple component structure
- **Minimal re-renders**: Optimized state management
- **Small bundle**: ~3KB total (JSX + CSS)

## Future Enhancements

Potential features for future versions:

- [ ] Dropdown open/close animation
- [ ] User email display in menu
- [ ] Notification badge on avatar
- [ ] Theme switcher integration
- [ ] Avatar upload/change functionality
- [ ] Recent activity preview

## Support

For issues or questions:

1. Review this README
2. Check the implementation plan: `LOGGEDINHEADERAVATAR2-IMPLEMENTATION-PLAN.md`
3. Review Header integration code
4. Check browser console for errors

## Version History

- **v1.0.0** (2025-11-22) - Initial implementation
  - Extracted from Header.jsx
  - Self-contained dropdown
  - Mobile responsive
  - Full accessibility support

## License

Part of the Split Lease application. Internal use only.
