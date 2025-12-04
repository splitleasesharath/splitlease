# Account Profile Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/account-profile` or `/account-profile/{userId}`
**ENTRY_POINT**: `app/src/account-profile.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
account-profile.jsx (Entry Point)
    |
    +-- React Islands
    |       +-- Header.jsx (Site navigation, autoShowLogin)
    |       +-- Footer.jsx (Site footer)
    |       +-- SearchScheduleSelector.jsx (Recent Days Selected)
    |       +-- NotificationSettingsModal.jsx (Settings modal)
    |       +-- EditPhoneNumberModal.jsx (Phone edit modal)
    |
    +-- account-profile.html
            |
            +-- Inline CSS (820 lines of styling)
            +-- Vanilla JavaScript (750+ lines)
            |       +-- Supabase client initialization
            |       +-- User data fetching (fetchUserData)
            |       +-- Profile population (populateUserProfile)
            |       +-- User type detection (getUserType)
            |       +-- Conditional visibility (applyUserTypeVisibility)
            |       +-- Save functionality (form submission)
            |       +-- Photo upload handling
            |       +-- Toast notifications (showToast)
            |
            +-- Static HTML Sections
                +-- Profile Header (photo, name, progress bar)
                +-- Settings Navigation (3 links)
                +-- Verification Section (4 items)
                +-- Biography Section
                +-- Reasons to Host Me (checkboxes + textarea)
                +-- Need for Space textarea
                +-- Special Needs textarea
                +-- Transportation dropdown (Guest-only)
                +-- Sidebar
                    +-- Your Listings (Host-only)
                    +-- Recent Days Selected (React)
                    +-- Commonly Stored Items (checkboxes)
                    +-- Blog Articles
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/account-profile.jsx` | Mounts React islands to HTML page |

### HTML Page
| File | Purpose |
|------|---------|
| `app/public/account-profile.html` | Main page with inline CSS/JS |

### React Islands
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Navigation with autoShowLogin prop |
| `app/src/islands/shared/Footer.jsx` | Site footer |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Day selection for Recent Days Selected |
| `app/src/islands/modals/NotificationSettingsModal.jsx` | Email/SMS notification preferences |
| `app/src/islands/modals/EditPhoneNumberModal.jsx` | Phone number editing modal |

### Logic Layer - Rules
| File | Purpose |
|------|---------|
| `app/src/logic/rules/auth/isProtectedPage.js` | Checks if current page requires auth |

### Library Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/auth.js` | Authentication (getAuthToken, getSessionId) |
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/lib/navigation.js` | goToProfile() navigation function |

### Routes Configuration
| File | Purpose |
|------|---------|
| `app/src/routes.config.js` | Route definitions (protected: true) |

---

## ### URL_ROUTING ###

```
/account-profile                    # Profile page (uses session userId)
/account-profile/{userId}           # Profile for specific user
/account-profile.html               # Legacy .html alias
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/account-profile',
  file: 'account-profile.html',
  aliases: ['/account-profile.html'],
  protected: true,
  cloudflareInternal: false,
  hasDynamicSegment: true,
  dynamicPattern: '/account-profile/:userId'
}
```

### Navigation Function
```javascript
import { goToProfile } from 'lib/navigation.js'

goToProfile(userId)  // Navigates to /account-profile/{userId}
```

---

## ### AUTHENTICATION ###

### Protected Page Check
```javascript
import { isProtectedPage } from 'logic/rules/auth/isProtectedPage.js'

isProtectedPage({ pathname: '/account-profile' })  // => true
```

### Auto Login Modal
```javascript
// In account-profile.jsx
const token = getAuthToken();
const showLoginModal = !token; // Show login modal if no token
createRoot(headerRoot).render(<Header autoShowLogin={showLoginModal} />);
```

### User ID Retrieval
```javascript
import { getSessionId } from 'lib/auth.js'

function getCurrentUserId() {
  const userId = getSessionId();
  if (userId) {
    console.log(' User ID retrieved:', userId);
    return userId;
  }
  console.log('L No user ID found');
  return null;
}
```

---

## ### USER_TYPE_DETECTION ###

### Detection Function
```javascript
function getUserType(user) {
  const signupType = user['Type - User Signup']; // "Host" or "Guest"
  const hasHostAccount = !!user['Account - Host / Landlord'];
  const hasGuestAccount = !!user['Account - Guest'];

  return {
    signupType: signupType,
    isHost: hasHostAccount,
    isGuest: hasGuestAccount,
    isDualRole: hasHostAccount && hasGuestAccount,
    primaryRole: signupType || (hasHostAccount ? 'Host' : 'Guest')
  };
}
```

### Conditional Visibility
| Section | User Type | Visibility |
|---------|-----------|------------|
| Transportation dropdown | Guest | Show |
| Transportation dropdown | Host | Hide |
| Commonly Stored Items | Guest | Show |
| Commonly Stored Items | Host | Hide |
| Your Listings sidebar | Host | Show |
| Your Listings sidebar | Guest | Hide |

---

## ### DATA_FLOW ###

### 1. Fetch User Data
```javascript
async function fetchUserData(userId) {
  // 1. Fetch user from 'user' table
  const { data: userData } = await supabase
    .from('user')
    .select('*')
    .eq('_id', userId)
    .single();

  // 2. Fetch host account if exists
  let hostData = null;
  if (userData['Account - Host / Landlord']) {
    const { data: host } = await supabase
      .from('account_host')
      .select('*')
      .eq('_id', userData['Account - Host / Landlord'])
      .single();
    hostData = host;
  }

  // 3. Fetch guest account if exists
  let guestData = null;
  if (userData['Account - Guest']) {
    const { data: guest } = await supabase
      .from('account_guest')
      .select('*')
      .eq('_id', userData['Account - Guest'])
      .single();
    guestData = guest;
  }

  // 4. Fetch listings for hosts
  let listings = [];
  if (hostData?.Listings?.length > 0) {
    const { data } = await supabase
      .from('listing')
      .select('*')
      .in('_id', hostData.Listings);
    listings = data || [];
  }

  // 5. Fetch reviews
  const { data: reviews } = await supabase
    .from('mainreview')
    .select('*')
    .eq('Reviewee/Target', userId)
    .eq('Is Published?', true)
    .limit(5);

  return { user: userData, host: hostData, guest: guestData, listings, reviews };
}
```

### 2. Populate Profile
```javascript
function populateUserProfile(data) {
  const { user, host, guest, listings, reviews } = data;

  // Detect user type and apply visibility
  const userType = getUserType(user);
  applyUserTypeVisibility(userType);

  // Expose to React components
  window.userProfileData = user;

  // Populate identity fields
  document.getElementById('profileName').textContent = user['Name - Full'] || user['Name - First'];
  document.getElementById('email').textContent = user['email as text'];
  document.getElementById('phoneNumber').textContent = user['Phone Number (as text)'];

  // Populate profile photo
  if (user['Profile Photo']) {
    document.getElementById('profilePhoto').innerHTML = `<img src="${user['Profile Photo']}" alt="Profile">`;
  }

  // Populate textareas
  document.getElementById('biography').value = user['About Me / Bio'] || '';
  document.getElementById('reasonsToHostMeText').value = user['About - reasons to host me'] || '';
  document.getElementById('needForSpace').value = user['need for Space'] || '';
  document.getElementById('specialNeeds').value = user['special needs'] || '';

  // Populate transportation (Guest-only)
  if (user['transportation medium']) {
    document.getElementById('transportation').value = user['transportation medium'];
  }

  // Populate checkboxes
  populateStorageItemsCheckboxes(user['About - Commonly Stored Items'] || []);
  populateGoodGuestReasonsCheckboxes(user['Reasons to Host me'] || []);

  // Update progress bar
  if (user['profile completeness']) {
    document.getElementById('progressBarFill').style.width = `${user['profile completeness']}%`;
    document.getElementById('progressPercentage').textContent = `${user['profile completeness']}%`;
  }

  // Update verification statuses
  updateVerificationStatus('linkedin', !!user['Verify - Linked In ID']);
  updateVerificationStatus('phone', user['Verify - Phone']);
  updateVerificationStatus('email', user['is email confirmed']);
  updateVerificationStatus('identity', user['user verified?']);
}
```

---

## ### DATABASE_TABLES ###

### `user` Table - Key Fields
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | text | Primary key (Bubble format) |
| `Name - Full` | text | Full name |
| `Name - First` | text | First name |
| `email as text` | text | Email address |
| `Phone Number (as text)` | text | Phone number |
| `Profile Photo` | text | Photo URL |
| `About Me / Bio` | text | Biography |
| `About - reasons to host me` | text | Custom reasons textarea |
| `Reasons to Host me` | jsonb | Array of `zat_goodguestreasons._id` |
| `need for Space` | text | Space requirements |
| `special needs` | text | Special accommodations |
| `transportation medium` | text | "mostly-drive", "mostly-fly", etc. |
| `About - Commonly Stored Items` | jsonb | Array of `zat_storage._id` |
| `Recent Days Selected` | jsonb | Array of day names |
| `profile completeness` | numeric | 0-100 percentage |
| `Type - User Signup` | text | "Host" or "Guest" |
| `Account - Guest` | text | FK ’ `account_guest._id` |
| `Account - Host / Landlord` | text | FK ’ `account_host._id` |

### Verification Fields
| Field | Type | Purpose |
|-------|------|---------|
| `is email confirmed` | boolean | Email verified |
| `Verify - Phone` | boolean | Phone verified |
| `Verify - Linked In ID` | text | LinkedIn ID (truthy = verified) |
| `user verified?` | boolean | Identity verified |

### `account_guest` Table
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | text | Primary key |
| `User` | text | FK ’ `user._id` |

### `account_host` Table
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | text | Primary key |
| `User` | text | FK ’ `user._id` |
| `Listings` | jsonb | Array of `listing._id` |

### `zat_storage` Table
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | text | Primary key |
| `Name` | text | Storage item name |

### `zat_goodguestreasons` Table
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | text | Primary key |
| `name` | text | Reason name |

---

## ### SAVE_FUNCTIONALITY ###

### Fields Saved to `user` Table
```javascript
const { error } = await supabase
  .from('user')
  .update({
    'About Me / Bio': bio,
    'About - reasons to host me': reasonsToHostMeText,
    'Reasons to Host me': selectedReasons,              // JSONB array
    'need for Space': needForSpace,
    'special needs': specialNeeds,
    'transportation medium': transportation,
    'About - Commonly Stored Items': selectedStorageItems, // JSONB array
    'Recent Days Selected': recentDaysSelected
  })
  .eq('_id', userId);
```

### Collecting Checkbox Values
```javascript
// Collect selected storage items
const selectedStorageItems = [];
document.querySelectorAll('#storedItemsGrid input:checked').forEach(cb => {
  selectedStorageItems.push(cb.value);
});

// Collect selected reasons
const selectedReasons = [];
document.querySelectorAll('#reasonsToHostMeGrid input:checked').forEach(cb => {
  selectedReasons.push(cb.value);
});
```

---

## ### REACT_ISLANDS ###

### ScheduleSelectorWrapper
Syncs SearchScheduleSelector with vanilla JS page:

```javascript
function ScheduleSelectorWrapper() {
  const [selectedDays, setSelectedDays] = useState([]);

  // Day name <-> index mapping
  const dayMap = { 'Sunday': 0, 'Monday': 1, ... 'Saturday': 6 };
  const indexToDayName = ['Sunday', 'Monday', ..., 'Saturday'];

  // Load initial selection from window.userProfileData
  useEffect(() => {
    const checkUserData = setInterval(() => {
      if (window.userProfileData?.['Recent Days Selected']) {
        const dayNames = window.userProfileData['Recent Days Selected'];
        if (Array.isArray(dayNames)) {
          const dayIndices = dayNames.map(name => dayMap[name]);
          setSelectedDays(dayIndices);
        }
        clearInterval(checkUserData);
      }
    }, 100);
  }, []);

  // Expose changes to vanilla JS
  const handleSelectionChange = (days) => {
    const dayNames = days.map(day => indexToDayName[day.index]);
    if (window.updateRecentDaysSelected) {
      window.updateRecentDaysSelected(dayNames);
    }
  };

  return (
    <SearchScheduleSelector
      initialSelection={selectedDays}
      onSelectionChange={handleSelectionChange}
      minDays={2}
      requireContiguous={true}
      updateUrl={false}
    />
  );
}
```

### NotificationSettingsModal
```jsx
<NotificationSettingsModal
  isOpen={isOpen}
  userId={userId}
  onClose={() => setIsOpen(false)}
/>
```
- Email notifications toggle
- SMS notifications toggle
- TODO: Integrate with `core-notification-settings` API

### EditPhoneNumberModal
```jsx
<EditPhoneNumberModal
  isOpen={isOpen}
  currentPhoneNumber={currentPhoneNumber}
  onSave={handleSave}
  onClose={() => setIsOpen(false)}
/>
```
- Displays old phone number (disabled)
- Input for new phone number
- Saves to `user['Phone Number (as text)']`

---

## ### VERIFICATION_SECTION ###

### Verification Items
| Type | Icon | Field Check | Display |
|------|------|-------------|---------|
| LinkedIn | = | `Verify - Linked In ID` (truthy) | Verified  / Unverified |
| Phone | =ñ | `Verify - Phone` (boolean) | Verified  / Unverified |
| Email | 	 | `is email confirmed` (boolean) | Verified  / Unverified |
| Identity | >ª | `user verified?` (boolean) | Verified  / Unverified |

### Update Function
```javascript
function updateVerificationStatus(type, isVerified) {
  const item = document.querySelector(`[data-verification="${type}"]`);
  if (!item) return;

  const statusEl = item.querySelector('.verification-status');
  const verifyBtn = item.querySelector('.verify-btn');

  if (isVerified) {
    statusEl.textContent = 'Verified ';
    statusEl.style.color = '#10b981';
    if (verifyBtn) verifyBtn.style.display = 'none';
  }
}
```

---

## ### PROFILE_PROGRESS_BAR ###

### Visual Component
```html
<div class="profile-progress">
  <div class="progress-header">
    <span class="progress-label">Profile progress</span>
    <span class="progress-percentage" id="progressPercentage">0%</span>
  </div>
  <div class="progress-bar-track">
    <div class="progress-bar-fill" id="progressBarFill" style="width: 0%"></div>
  </div>
  <a href="#" class="progress-info-link">9 What's this?</a>
</div>
```

### CSS Variables
| Variable | Value | Purpose |
|----------|-------|---------|
| `--color-accent-purple` | #6366f1 | Progress bar fill |
| `--color-border` | #E5E5E5 | Progress bar track |

---

## ### CHECKBOX_GRID_PATTERN ###

### Dynamic Population
```javascript
async function populateStorageItemsCheckboxes(userSelectedItems = []) {
  const storageItems = await loadStorageItems();
  const gridContainer = document.getElementById('storedItemsGrid');

  const gridHTML = storageItems.map(item => {
    const isChecked = userSelectedItems.includes(item._id) ? 'checked' : '';
    return `
      <div class="checkbox-item">
        <input type="checkbox" id="item-${item._id}" value="${item._id}" ${isChecked}>
        <label for="item-${item._id}">${item.Name}</label>
      </div>
    `;
  }).join('');

  gridContainer.innerHTML = gridHTML;
}
```

### Checkbox Styling
```css
.checkbox-item input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  background-color: white;
}

.checkbox-item input[type="checkbox"]:checked {
  background-color: var(--color-accent-purple);
  border-color: var(--color-accent-purple);
}

.checkbox-item input[type="checkbox"]:checked::after {
  content: '';
  color: white;
  font-size: 14px;
}
```

---

## ### PHOTO_UPLOAD ###

### Upload Flow
```javascript
document.getElementById('photoFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size should be less than 5MB', 'error');
    return;
  }

  // Upload to Supabase Storage
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('profile-photos')
    .upload(fileName, file);

  // Update user profile with new URL
  await supabase
    .from('user')
    .update({ 'Profile Photo': publicUrl })
    .eq('_id', userId);
});
```

---

## ### TOAST_NOTIFICATIONS ###

### Toast Function
```javascript
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Expose to React components
window.showToast = showToast;
```

### Toast Types
| Type | Background Color |
|------|------------------|
| `success` | #10b981 (green) |
| `error` | #ef4444 (red) |
| `info` | #3b82f6 (blue) |

---

## ### TRANSPORTATION_OPTIONS ###

### Dropdown Values (Guest-Only)
```html
<select id="transportation" class="select-field">
  <option value="">Select...</option>
  <option value="mostly-drive">Mostly drive</option>
  <option value="mostly-fly">Mostly fly</option>
  <option value="public-transit">Take public transit</option>
  <option value="other">Other</option>
</select>
```

---

## ### SETTINGS_NAVIGATION ###

### Links
| Link | Action |
|------|--------|
| Payout Settings | TODO: Link to Bubble payout settings |
| Notification Settings | Opens NotificationSettingsModal via `window.openNotificationSettings()` |
| Change Password | TODO: Link to password change flow |

### Modal Trigger Pattern
```javascript
// In vanilla JS - event delegation
document.addEventListener('click', (e) => {
  if (e.target.id === 'notification-settings-link') {
    e.preventDefault();
    if (window.openNotificationSettings) {
      window.openNotificationSettings();
    }
  }
});

// In React island - expose function to window
useEffect(() => {
  window.openNotificationSettings = () => setIsOpen(true);
  return () => delete window.openNotificationSettings;
}, []);
```

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 800px` | Grid becomes single column, profile header stacks vertically |
| Mobile | Settings nav stacks vertically |

---

## ### CSS_VARIABLES ###

```css
:root {
  --color-primary-purple: #3D2463;
  --color-accent-purple: #6366f1;
  --color-light-purple: #9B7FBF;
  --color-pale-purple: #E0D7EC;
  --color-lavender: #C4B5D6;
  --color-background: #F5F5F5;
  --color-border: #E5E5E5;
  --color-text-dark: #333333;
  --color-text-gray: #666666;
  --color-emergency-red: #FF5733;
  --color-success: #10B981;
  --color-error: #EF4444;
}
```

---

## ### KEY_IMPORTS ###

```javascript
// Entry Point (account-profile.jsx)
import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import Header from './islands/shared/Header.jsx';
import Footer from './islands/shared/Footer.jsx';
import SearchScheduleSelector from './islands/shared/SearchScheduleSelector.jsx';
import NotificationSettingsModal from './islands/modals/NotificationSettingsModal.jsx';
import EditPhoneNumberModal from './islands/modals/EditPhoneNumberModal.jsx';
import { getAuthToken, getSessionId } from './lib/auth.js';
import { supabase } from './lib/supabase.js';

// Navigation
import { goToProfile } from 'lib/navigation.js';

// Auth Rules
import { isProtectedPage } from 'logic/rules/auth/isProtectedPage.js';
```

---

## ### WINDOW_EXPOSED_FUNCTIONS ###

Functions exposed to window for React-vanilla JS communication:

| Function | Purpose | Set By |
|----------|---------|--------|
| `window.userProfileData` | Current user data object | vanilla JS |
| `window.updateRecentDaysSelected(dayNames)` | Callback for day changes | vanilla JS |
| `window.openNotificationSettings()` | Opens notification modal | React |
| `window.openEditPhoneNumberModal(phone)` | Opens phone edit modal | React |
| `window.showToast(message, type)` | Shows toast notification | vanilla JS |

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Page shows login modal | User not authenticated - check `getAuthToken()` |
| Profile not loading | Verify userId from `getSessionId()`, check Supabase RLS |
| Checkboxes empty | Verify `zat_storage` and `zat_goodguestreasons` tables have data |
| Save not working | Check browser console for Supabase errors |
| React components not rendering | Check element IDs exist: `header-root`, `footer-root`, etc. |
| Verification always "Unverified" | Check user table field values |
| Photo upload fails | Storage bucket `profile-photos` may not exist |
| Transportation section visible for Host | Check `applyUserTypeVisibility()` logic |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database Tables Detailed | `Documentation/Database/DATABASE_TABLES_DETAILED.md` |
| Option Sets | `Documentation/Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md` |
| Routing Guide | `Documentation/Database/ROUTING_GUIDE.md` |
| Auth Flow | `Documentation/Auth/LOGIN_FLOW.md` |

---

## ### ARCHITECTURE_NOTE ###

The Account Profile page uses a **hybrid architecture**:
- **Vanilla JavaScript** handles core functionality (data fetching, form submission, DOM manipulation)
- **React Islands** provide specific interactive components (Header, Footer, SearchScheduleSelector, Modals)
- Communication between vanilla JS and React happens via **window object**

This differs from the pure **Hollow Component Pattern** used in pages like `GuestProposalsPage.jsx` where all logic is in a custom hook.

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive after thorough analysis
