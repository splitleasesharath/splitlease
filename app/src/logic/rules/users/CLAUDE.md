# User Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for user type and profile state evaluation
[LAYER]: Layer 2 - Rules (return true/false)
[PATTERN]: Determine user privileges and display conditions

---

## ### RULE_CONTRACTS ###

### isHost
[PATH]: ./isHost.js
[INTENT]: Determine if user has Host privileges
[SIGNATURE]: ({ userType: string|null }) => boolean
[INPUT]:
  - userType: string|null (opt) - User type from Supabase or localStorage
[OUTPUT]: boolean - true if user has Host privileges
[THROWS]: Never throws (returns false for invalid input)
[BUSINESS_RULES]:
  - Host types: "A Host (I have a space available to rent)", "Trial Host"
  - "Split Lease" users have BOTH Host and Guest privileges
  - Checks if type includes "Host" substring
[EXAMPLE]:
  - `isHost({ userType: 'A Host (I have a space available to rent)' })` => true
  - `isHost({ userType: 'A Guest (I would like to rent a space)' })` => false
  - `isHost({ userType: 'Split Lease' })` => true (internal users)
  - `isHost({ userType: null })` => false
[DEPENDS_ON]: None (pure function)

---

### isGuest
[PATH]: ./isGuest.js
[INTENT]: Determine if user has Guest privileges
[SIGNATURE]: ({ userType: string|null }) => boolean
[INPUT]:
  - userType: string|null (opt) - User type from Supabase or localStorage
[OUTPUT]: boolean - true if user has Guest privileges
[THROWS]: Never throws (returns false for invalid input)
[BUSINESS_RULES]:
  - Guest types: "A Guest (I would like to rent a space)"
  - "Split Lease" users have BOTH Host and Guest privileges
  - Checks if type includes "Guest" substring
[EXAMPLE]:
  - `isGuest({ userType: 'A Guest (I would like to rent a space)' })` => true
  - `isGuest({ userType: 'A Host (I have a space available to rent)' })` => false
  - `isGuest({ userType: 'Split Lease' })` => true (internal users)
[DEPENDS_ON]: None (pure function)

---

### hasProfilePhoto
[PATH]: ./hasProfilePhoto.js
[INTENT]: Check if user has uploaded a profile photo
[SIGNATURE]: ({ photoUrl: string|null|undefined }) => boolean
[INPUT]:
  - photoUrl: string|null|undefined (opt) - Profile photo URL from user data
[OUTPUT]: boolean - true if valid non-empty photo URL exists
[THROWS]: Never throws (returns false for invalid input)
[BUSINESS_RULES]:
  - Valid: non-empty trimmed string
  - Invalid: null, undefined, empty string, whitespace-only
[EXAMPLE]:
  - `hasProfilePhoto({ photoUrl: 'https://example.com/photo.jpg' })` => true
  - `hasProfilePhoto({ photoUrl: '' })` => false
  - `hasProfilePhoto({ photoUrl: null })` => false
[DEPENDS_ON]: None (pure function)

---

### shouldShowFullName
[PATH]: ./shouldShowFullName.js
[INTENT]: Determine if full name should be displayed
[SIGNATURE]: ({ firstName: string, lastName: string|null|undefined, isMobile: boolean }) => boolean
[INPUT]:
  - firstName: string (req) - User's first name
  - lastName: string|null|undefined (opt) - User's last name
  - isMobile: boolean (req) - Whether viewport is mobile sized
[OUTPUT]: boolean - true if full name should be shown
[THROWS]:
  - Error when firstName is missing or empty
  - Error when isMobile is not boolean
[BUSINESS_RULES]:
  - Mobile: ALWAYS show first name only (space conservation)
  - Desktop: Show full name only if lastName exists and non-empty
[EXAMPLE]:
  - `shouldShowFullName({ firstName: 'John', lastName: 'Doe', isMobile: false })` => true
  - `shouldShowFullName({ firstName: 'John', lastName: 'Doe', isMobile: true })` => false
  - `shouldShowFullName({ firstName: 'John', lastName: null, isMobile: false })` => false
[DEPENDS_ON]: None (pure function)

---

## ### USER_TYPE_REFERENCE ###

| Type String | isHost | isGuest | Notes |
|-------------|--------|---------|-------|
| "A Host (I have a space available to rent)" | true | false | Regular host |
| "Trial Host" | true | false | Trial period |
| "A Guest (I would like to rent a space)" | false | true | Regular guest |
| "Split Lease" | true | true | Internal users (both roles) |
| null/undefined | false | false | Not authenticated |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: "Split Lease" users have BOTH Host AND Guest access
[RULE_2]: isHost and isGuest are NOT mutually exclusive
[RULE_3]: Always check authentication BEFORE checking user type
[RULE_4]: Use shouldShowFullName for responsive name display

---

## ### COMMON_PATTERNS ###

### Role-Based Navigation
```javascript
import { isHost } from 'logic/rules/users/isHost'
import { isGuest } from 'logic/rules/users/isGuest'

function getDashboardLink(userType) {
  if (isHost({ userType })) {
    return '/host-dashboard'
  }
  if (isGuest({ userType })) {
    return '/guest-proposals'
  }
  return '/login'
}
```

### Profile Display
```javascript
import { hasProfilePhoto } from 'logic/rules/users/hasProfilePhoto'
import { shouldShowFullName } from 'logic/rules/users/shouldShowFullName'

function renderUserAvatar(user, isMobile) {
  const showPhoto = hasProfilePhoto({ photoUrl: user.avatarUrl })
  const showFullName = shouldShowFullName({
    firstName: user.firstName,
    lastName: user.lastName,
    isMobile
  })

  return {
    image: showPhoto ? user.avatarUrl : '/default-avatar.png',
    displayName: showFullName ? `${user.firstName} ${user.lastName}` : user.firstName
  }
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: isHost, isGuest, hasProfilePhoto, shouldShowFullName

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: isHost/isGuest/hasProfilePhoto never throw, return false for bad input
[THROWS]: shouldShowFullName DOES throw for missing required params
[PURE]: No side effects, deterministic output

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
