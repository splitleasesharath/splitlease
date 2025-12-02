# Logged In Avatar Component

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: User avatar dropdown component displaying user photo/initials and account menu
[PATTERN]: Hollow component - delegates logic to custom hook

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export providing LoggedInAvatar component
[EXPORTS]: LoggedInAvatar

### LoggedInAvatar.jsx
[INTENT]: Avatar display with dropdown menu for account navigation
[IMPORTS]: react, ./useLoggedInAvatarData
[DEPENDENCIES]: logic/processors/user/processProfilePhotoUrl, logic/processors/user/processUserInitials
[PROPS]: user, onLogout

### LoggedInAvatar.css
[INTENT]: Styles for avatar circle and dropdown menu

### useLoggedInAvatarData.js
[INTENT]: Hook containing avatar data processing and menu state management
[IMPORTS]: react
[EXPORTS]: useLoggedInAvatarData

### README.md
[INTENT]: Component usage documentation

---

## ### AVATAR_DISPLAY ###

[WITH_PHOTO]: Circular image with user's profile photo
[WITHOUT_PHOTO]: Circular badge with user's initials (e.g., "JD")

---

## ### DROPDOWN_MENU ###

[ITEMS]: Profile, My Proposals, Settings, Help, Logout
[VISIBILITY]: Toggle on avatar click

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { LoggedInAvatar } from 'islands/shared/LoggedInAvatar'
[CONSUMED_BY]: Header component when user is authenticated

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 2
