# LoggedInHeaderAvatar2 - Comprehensive Implementation Plan

## Executive Summary

This document outlines the complete plan to extract the current logged-in user dropdown from `Header.jsx` into a standalone, self-contained React Island component called **LoggedInHeaderAvatar2**.

**Goal**: Create a minimal, focused avatar dropdown island that handles its own state, interactions, and styling without depending on Header's infrastructure.

---

## 1. Current State Analysis

### **What Exists in Header.jsx**

#### **A. JSX Structure** (Lines 492-561)
```jsx
{currentUser && currentUser.firstName ? (
  <div className="nav-dropdown user-dropdown">
    {/* Avatar + Name + Arrow */}
    <a href="#user" onClick={...} onKeyDown={...}>
      {/* Avatar or Initials */}
      {/* First Name */}
      {/* Dropdown Arrow SVG */}
    </a>

    {/* Dropdown Menu */}
    <div className={`dropdown-menu ${activeDropdown === 'user' ? 'active' : ''}`}>
      <a href="/account-profile">My Profile</a>
      <a onClick={handleLogout}>Log Out</a>
    </div>
  </div>
) : (
  /* Auth buttons */
)}
```

**Dependencies:**
- `currentUser` state (from Header)
- `activeDropdown` state (from Header)
- `toggleDropdown('user')` function (from Header)
- `handleDropdownKeyDown(e, 'user')` function (from Header)
- `handleLogout()` function (from Header)

#### **B. State Management**
- **External State**: Uses Header's `activeDropdown` state
- **Required Change**: Internalize as `isOpen` boolean state

#### **C. Event Handlers**

**1. Click Handler** (Line 502-504)
```jsx
onClick={(e) => {
  e.preventDefault();
  toggleDropdown('user');
}}
```

**2. Keyboard Handler** (Line 505)
```jsx
onKeyDown={(e) => handleDropdownKeyDown(e, 'user')}
```

**Full Implementation** (Line 261-268 in Header):
```jsx
const handleDropdownKeyDown = (e, dropdownName) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleDropdown(dropdownName);
  } else if (e.key === 'Escape') {
    setActiveDropdown(null);
  }
};
```

**3. Logout Handler** (Line 554-556)
```jsx
onClick={async (e) => {
  e.preventDefault();
  await handleLogout();
}}
```

**Full Implementation** (Line 271-284 in Header):
```jsx
const handleLogout = async () => {
  console.log('🔓 Logging out...');
  const result = await logoutUser();
  if (result.success) {
    console.log('✅ Logout successful - reloading page');
    window.location.reload();
  } else {
    console.error('❌ Logout failed:', result.error);
  }
};
```

**4. Click-Outside Handler** (Line 162-176 in Header)
```jsx
useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      setActiveDropdown(null);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, []);
```

#### **D. CSS Styles** (from header.css)

**Required Classes:**
- `.user-dropdown .user-trigger` (lines 290-295)
- `.user-avatar` (lines 297-304)
- `.user-avatar-placeholder` (lines 306-318)
- `.user-name-wrapper` (lines 320-327)
- Mobile responsive rules (lines 380-382)

**Shared Classes** (will remain in header.css):
- `.nav-dropdown`
- `.dropdown-menu`
- `.dropdown-item`
- `.dropdown-title`
- `.dropdown-arrow`

---

## 2. New Component Design

### **A. Component Architecture**

```
app/src/islands/shared/LoggedInHeaderAvatar2/
├── LoggedInHeaderAvatar2.jsx          # Main component
├── LoggedInHeaderAvatar2.css          # Scoped styles
├── README.md                           # Documentation
└── index.js                            # Export file
```

### **B. Component API**

#### **Props Interface**
```jsx
/**
 * @param {Object} props.user - Current user object
 * @param {string} props.user.firstName - User's first name
 * @param {string} props.user.lastName - User's last name (optional)
 * @param {string} props.user.profilePhoto - Profile photo URL (optional)
 * @param {Function} props.onLogout - Async callback for logout
 */
```

#### **State**
- `isOpen` (boolean) - Controls dropdown visibility

#### **Refs**
- `dropdownRef` - Reference to dropdown container for click-outside detection

### **C. Self-Contained Features**

✅ **Internal State Management**
- Own `isOpen` state (no dependency on Header)

✅ **Internal Event Handlers**
- `toggleDropdown()` - Toggle isOpen state
- `handleKeyDown()` - Keyboard navigation (Enter/Space/Escape)
- `handleClickOutside()` - Close on outside click

✅ **Scoped Styles**
- Component-specific CSS in own file
- Uses shared dropdown classes from header.css

✅ **Minimal Props**
- Only requires `user` object and `onLogout` callback
- No state lifting needed

---

## 3. Implementation Steps

### **Step 1: Create Component Directory Structure**

```bash
mkdir -p app/src/islands/shared/LoggedInHeaderAvatar2
```

**Files to create:**
1. `LoggedInHeaderAvatar2.jsx`
2. `LoggedInHeaderAvatar2.css`
3. `README.md`
4. `index.js`

---

### **Step 2: Implement LoggedInHeaderAvatar2.jsx**

#### **A. Imports and Setup**
```jsx
import { useState, useRef, useEffect } from 'react';
import './LoggedInHeaderAvatar2.css';
```

#### **B. Component Structure**
```jsx
export default function LoggedInHeaderAvatar2({ user, onLogout }) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Event Handlers
  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleLogoutClick = async (e) => {
    e.preventDefault();
    await onLogout();
  };

  // Click-outside effect
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.logged-in-header-avatar-2')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Extract first name and initial
  const firstName = user.firstName || '';
  const initial = firstName.charAt(0).toUpperCase();

  // Normalize profile photo URL
  const avatarUrl = user.profilePhoto?.startsWith('//')
    ? `https:${user.profilePhoto}`
    : user.profilePhoto;

  return (
    <div className="logged-in-header-avatar-2 nav-dropdown user-dropdown" ref={dropdownRef}>
      {/* Trigger Button */}
      <a
        href="#user"
        className="nav-link dropdown-trigger user-trigger"
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={(e) => {
          e.preventDefault();
          toggleDropdown();
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Avatar or Placeholder */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName}
            className="user-avatar"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {initial}
          </div>
        )}

        {/* User Name + Arrow */}
        <span className="user-name-wrapper">
          {firstName}
          <svg
            className="dropdown-arrow"
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </a>

      {/* Dropdown Menu */}
      <div
        className={`dropdown-menu ${isOpen ? 'active' : ''}`}
        role="menu"
        aria-label="User menu"
      >
        <a
          href="/account-profile"
          className="dropdown-item"
          role="menuitem"
        >
          <span className="dropdown-title">My Profile</span>
        </a>
        <a
          href="#"
          className="dropdown-item"
          role="menuitem"
          onClick={handleLogoutClick}
        >
          <span className="dropdown-title">Log Out</span>
        </a>
      </div>
    </div>
  );
}
```

---

### **Step 3: Create LoggedInHeaderAvatar2.css**

```css
/* ========================================
   LoggedInHeaderAvatar2 Component Styles
   ======================================== */

/* Component root - ensures proper stacking */
.logged-in-header-avatar-2 {
  position: relative;
  z-index: 100;
}

/* User Dropdown Trigger Styles */
.logged-in-header-avatar-2 .user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  cursor: pointer;
}

/* User Avatar - Profile Photo */
.logged-in-header-avatar-2 .user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #5B21B6;
  flex-shrink: 0;
}

/* User Avatar - Placeholder (Initials) */
.logged-in-header-avatar-2 .user-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #5B21B6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

/* User Name Wrapper */
.logged-in-header-avatar-2 .user-name-wrapper {
  font-size: 14px;
  font-weight: 500;
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Mobile Responsive - Hide name on small screens */
@media (max-width: 768px) {
  .logged-in-header-avatar-2 .user-name-wrapper {
    display: none;
  }
}
```

---

### **Step 4: Create index.js**

```js
export { default } from './LoggedInHeaderAvatar2.jsx';
```

---

### **Step 5: Create README.md**

```markdown
# LoggedInHeaderAvatar2

A minimal, self-contained logged-in user avatar dropdown component.

## Features

✅ Simple 2-option menu (My Profile, Log Out)
✅ Avatar image or initials fallback
✅ Self-managed dropdown state
✅ Click-outside to close
✅ Keyboard navigation (Enter/Space/Escape)
✅ Mobile responsive (hides name, shows avatar only)
✅ ARIA accessibility

## Usage

\`\`\`jsx
import LoggedInHeaderAvatar2 from './islands/shared/LoggedInHeaderAvatar2';

function MyComponent() {
  const currentUser = {
    firstName: 'John',
    lastName: 'Doe',
    profilePhoto: 'https://example.com/photo.jpg'
  };

  const handleLogout = async () => {
    // Your logout logic
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
\`\`\`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `user` | Object | Yes | User data object |
| `user.firstName` | string | Yes | User's first name |
| `user.lastName` | string | No | User's last name |
| `user.profilePhoto` | string | No | Profile photo URL |
| `onLogout` | Function | Yes | Async logout callback |

## CSS Classes

Component uses shared dropdown classes from `header.css`:
- `.nav-dropdown` - Dropdown container
- `.dropdown-menu` - Menu container
- `.dropdown-item` - Menu item
- `.dropdown-title` - Item text
- `.dropdown-arrow` - Chevron icon

Component-specific classes in `LoggedInHeaderAvatar2.css`:
- `.logged-in-header-avatar-2` - Component root
- `.user-avatar` - Profile photo
- `.user-avatar-placeholder` - Initials circle
- `.user-name-wrapper` - Name + arrow container
```

---

### **Step 6: Update Header.jsx**

#### **A. Add Import**
```jsx
import LoggedInHeaderAvatar2 from './LoggedInHeaderAvatar2';
```

#### **B. Replace Inline Dropdown** (Lines 492-561)

**REMOVE THIS:**
```jsx
{currentUser && currentUser.firstName ? (
  <div className="nav-dropdown user-dropdown">
    {/* All the inline dropdown code */}
  </div>
) : (
  /* Auth buttons */
)}
```

**REPLACE WITH:**
```jsx
{currentUser && currentUser.firstName ? (
  <LoggedInHeaderAvatar2
    user={currentUser}
    onLogout={handleLogout}
  />
) : (
  /* Auth buttons */
)}
```

#### **C. Cleanup**

**Can be removed (no longer needed):**
- ❌ `toggleDropdown('user')` calls
- ❌ `activeDropdown === 'user'` checks
- ❌ `handleDropdownKeyDown(e, 'user')` - kept for other dropdowns

**Must be kept (still used by Header):**
- ✅ `handleLogout()` function - passed as prop
- ✅ `currentUser` state - passed as prop
- ✅ `activeDropdown` state - still used by Host/Guest dropdowns
- ✅ `toggleDropdown()` function - still used by Host/Guest dropdowns
- ✅ Click-outside handler - still needed for Host/Guest dropdowns

---

## 4. CSS Migration Strategy

### **Styles to MOVE to LoggedInHeaderAvatar2.css**

From `app/src/styles/components/header.css`:

```css
/* Lines 290-295: User trigger */
.user-dropdown .user-trigger { ... }

/* Lines 297-304: Avatar image */
.user-avatar { ... }

/* Lines 306-318: Avatar placeholder */
.user-avatar-placeholder { ... }

/* Lines 320-327: User name wrapper */
.user-name-wrapper { ... }

/* Lines 380-382: Mobile responsive */
@media (max-width: 768px) {
  .user-name-wrapper { display: none; }
}
```

### **Styles to KEEP in header.css** (Shared)

```css
/* Lines 93-110: Base dropdown structure */
.nav-dropdown { ... }
.dropdown-arrow { ... }

/* Lines 111-134: Dropdown menu */
.dropdown-menu { ... }
.dropdown-menu.active { ... }

/* Lines 135-160: Dropdown items */
.dropdown-item { ... }
.dropdown-item:hover { ... }
.dropdown-title { ... }
```

**Strategy:**
- Namespace component-specific styles with `.logged-in-header-avatar-2` prefix
- Continue using shared classes (`.nav-dropdown`, `.dropdown-menu`, etc.)
- Component CSS file only contains avatar/name specific styles

---

## 5. Testing Plan

### **A. Functional Testing**

✅ **Dropdown Interaction**
- [ ] Click avatar → Dropdown opens
- [ ] Click outside → Dropdown closes
- [ ] Click avatar again → Dropdown toggles
- [ ] Escape key → Dropdown closes

✅ **Navigation**
- [ ] Click "My Profile" → Navigates to `/account-profile`
- [ ] Click "Log Out" → Calls `onLogout` callback
- [ ] After logout → Page reloads

✅ **Visual Display**
- [ ] With profile photo → Shows image
- [ ] Without profile photo → Shows initials
- [ ] User name displays correctly
- [ ] Dropdown arrow displays

✅ **Keyboard Accessibility**
- [ ] Enter key → Toggles dropdown
- [ ] Space key → Toggles dropdown
- [ ] Escape key → Closes dropdown
- [ ] Tab navigation works

### **B. Responsive Testing**

✅ **Desktop** (>768px)
- [ ] Avatar + Name + Arrow visible
- [ ] Dropdown menu properly positioned

✅ **Mobile** (≤768px)
- [ ] Only avatar visible (name hidden)
- [ ] Dropdown still functional

### **C. Edge Cases**

✅ **Missing Data**
- [ ] No firstName → Component handles gracefully
- [ ] No profilePhoto → Shows initials
- [ ] Invalid profile photo URL → Shows initials

✅ **Multiple Instances**
- [ ] Click-outside only closes its own dropdown
- [ ] No interference between instances

---

## 6. Integration Checklist

### **Pre-Implementation**
- [ ] Read restoration guide thoroughly
- [ ] Understand current Header implementation
- [ ] Review existing LoggedInAvatar component (for reference)

### **Implementation**
- [ ] Create component directory structure
- [ ] Write LoggedInHeaderAvatar2.jsx
- [ ] Write LoggedInHeaderAvatar2.css
- [ ] Write README.md
- [ ] Write index.js
- [ ] Update Header.jsx import
- [ ] Update Header.jsx to mount island
- [ ] Remove unused code from Header.jsx

### **CSS Migration**
- [ ] Copy user-specific styles to component CSS
- [ ] Add `.logged-in-header-avatar-2` namespace
- [ ] Test that shared classes still work
- [ ] Remove old styles from header.css (optional cleanup)

### **Testing**
- [ ] Test dropdown open/close
- [ ] Test click-outside behavior
- [ ] Test keyboard navigation
- [ ] Test "My Profile" link
- [ ] Test "Log Out" functionality
- [ ] Test on desktop viewport
- [ ] Test on mobile viewport
- [ ] Test with profile photo
- [ ] Test without profile photo

### **Git Workflow**
- [ ] Stage all new files
- [ ] Stage Header.jsx changes
- [ ] Write descriptive commit message
- [ ] Commit to development branch
- [ ] (Optional) Push to GitHub

---

## 7. Benefits of This Approach

### **Separation of Concerns**
✅ Header focuses on navigation and layout
✅ Avatar component handles user-specific UI
✅ Each component has clear responsibility

### **Reusability**
✅ Can be used in other locations (mobile header, dashboard, etc.)
✅ Self-contained with no external dependencies
✅ Simple API makes integration easy

### **Maintainability**
✅ All avatar logic in one place
✅ Changes don't affect Header
✅ Clear, documented component

### **Testability**
✅ Can test avatar component independently
✅ Can create demo page for visual testing
✅ Isolated state makes debugging easier

---

## 8. Differences from Existing LoggedInAvatar

| Feature | LoggedInAvatar | LoggedInHeaderAvatar2 |
|---------|----------------|----------------------|
| Menu Items | 12+ items with badges | 2 items (Profile, Logout) |
| Icons | SVG icon files | No icons needed |
| Smart Routing | Yes (based on listings count) | No (simple links) |
| Badge Counts | Proposals, Listings, Messages, etc. | None |
| User Types | HOST/GUEST/TRIAL_HOST logic | No user type logic |
| Complexity | Complex, feature-rich | Minimal, focused |
| Use Case | Full user dashboard dropdown | Simple header avatar |
| File Size | ~300+ lines | ~150 lines |

**LoggedInHeaderAvatar2** is intentionally minimal and focused on the header use case only.

---

## 9. Future Enhancements (Optional)

### **Phase 2 - Enhanced Features**
- [ ] Add animation for dropdown open/close
- [ ] Add user email display
- [ ] Add "Account Settings" link
- [ ] Add notification indicator dot

### **Phase 3 - Advanced Features**
- [ ] Integrate badge counts like LoggedInAvatar
- [ ] Add more menu items dynamically
- [ ] Add user type conditional rendering
- [ ] Add keyboard arrow key navigation

---

## 10. Commit Message Template

```
feat: Extract user dropdown into LoggedInHeaderAvatar2 island

- Create self-contained LoggedInHeaderAvatar2 component
- Move user avatar dropdown from inline Header code to standalone island
- Internalize dropdown state management (isOpen)
- Internalize click-outside and keyboard handlers
- Migrate user-specific CSS to component file
- Update Header to mount LoggedInHeaderAvatar2 island
- Maintain simple 2-option menu (My Profile, Log Out)
- Preserve all accessibility features (ARIA, keyboard nav)

Benefits:
- Separation of concerns (Header vs User UI)
- Reusable across application
- Easier to test and maintain
- Clear component boundaries

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 11. Success Criteria

✅ **Functionality**
- Component renders avatar/initials correctly
- Dropdown opens and closes properly
- Click-outside works as expected
- Keyboard navigation functional
- My Profile link navigates correctly
- Log Out calls callback and works

✅ **Integration**
- Header.jsx imports and uses component
- No errors in browser console
- Styling matches original appearance
- Mobile responsive behavior maintained

✅ **Code Quality**
- Component is self-contained
- No dependencies on Header state
- Clear prop interface
- Proper ARIA attributes
- Clean, readable code

✅ **Documentation**
- README explains usage
- Props documented
- Examples provided

---

**Status**: Ready to implement
**Estimated Time**: 2-3 hours
**Complexity**: Medium
**Risk**: Low (reversible via git)
