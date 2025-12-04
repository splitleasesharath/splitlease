# User Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for user type and profile state evaluation
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions evaluate user object properties

---

## ### FILE_INVENTORY ###

### hasProfilePhoto.js
[INTENT]: Check if user has uploaded a profile photo (not using default avatar)
[EXPORTS]: hasProfilePhoto
[SIGNATURE]: (user: object) => boolean
[RETURNS]: true if custom photo exists, false if using default

### isGuest.js
[INTENT]: Determine if user account type is guest (not host)
[EXPORTS]: isGuest
[SIGNATURE]: (user: object) => boolean
[RETURNS]: true if user is a guest

### isHost.js
[INTENT]: Determine if user account type is host (property owner)
[EXPORTS]: isHost
[SIGNATURE]: (user: object) => boolean
[RETURNS]: true if user is a host

### shouldShowFullName.js
[INTENT]: Determine if full name should be displayed based on privacy settings and context
[EXPORTS]: shouldShowFullName
[SIGNATURE]: (user: object, context: string) => boolean
[RETURNS]: true if full name can be shown

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { isHost } from 'logic/rules/users/isHost'
[CONSUMED_BY]: Header navigation, dashboard routing, profile display
[PATTERN]: if (isHost(user)) showHostDashboard() else showGuestDashboard()

---

## ### USER_TYPES ###

[GUEST]: Can browse listings, create proposals, book stays
[HOST]: Can create listings, manage proposals, accept bookings

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
