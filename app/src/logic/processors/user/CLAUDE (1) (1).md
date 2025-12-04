# User Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform user data for display and avatar rendering
[LAYER]: Layer 3 - Processors (data formatting for UI)
[PATTERN]: Extract and format user profile information

---

## ### FILE_INVENTORY ###

### processProfilePhotoUrl.js
[INTENT]: Process and validate profile photo URLs, handling Bubble storage URLs
[EXPORTS]: processProfilePhotoUrl
[SIGNATURE]: (url: string | null) => string
[OUTPUT]: Valid image URL or default avatar path

### processUserDisplayName.js
[INTENT]: Generate display name from user data (first name, or first + last initial)
[EXPORTS]: processUserDisplayName
[SIGNATURE]: (user: object) => string
[OUTPUT]: "John" or "John D."

### processUserInitials.js
[INTENT]: Extract user initials from name for avatar fallback display
[EXPORTS]: processUserInitials
[SIGNATURE]: (user: object) => string
[OUTPUT]: "JD" (first letters of first and last name)

### processUserData.js
[INTENT]: Process complete user object for frontend consumption
[EXPORTS]: processUserData
[SIGNATURE]: (rawUser: object) => ProcessedUser

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { processUserDisplayName } from 'logic/processors/user/processUserDisplayName'
[CONSUMED_BY]: LoggedInAvatar, Header, messaging components, host profiles

---

## ### BUBBLE_PHOTO_URLS ###

[FORMAT]: //s3.amazonaws.com/appforest_uf/... (Bubble storage)
[PROCESSING]: Add https: prefix if missing, validate URL format

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
