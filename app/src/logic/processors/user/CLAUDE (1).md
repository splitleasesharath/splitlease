# User Processors Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform user data for display and avatar rendering
[LAYER]: Layer 3 - Processors (data formatting for UI)
[PATTERN]: Extract and format user profile information

---

## ### PROCESSOR_CONTRACTS ###

### processProfilePhotoUrl
[PATH]: ./processProfilePhotoUrl.js
[INTENT]: Normalize and validate profile photo URLs
[SIGNATURE]: ({ photoUrl: string|null|undefined }) => string | null
[INPUT]:
  - photoUrl: string|null|undefined (opt) - Raw profile photo URL
[OUTPUT]: Normalized URL or null if invalid/missing
[THROWS]: Never throws (returns null for all invalid cases)
[HANDLES]:
  - Protocol-relative URLs: `//example.com/photo.jpg` → `https://example.com/photo.jpg`
  - Empty strings: Return null
  - XSS prevention: Reject `javascript:`, `data:` protocols
[EXAMPLE]:
  - `processProfilePhotoUrl({ photoUrl: '//s3.amazonaws.com/photo.jpg' })` => "https://s3.amazonaws.com/photo.jpg"
  - `processProfilePhotoUrl({ photoUrl: 'javascript:alert(1)' })` => null
  - `processProfilePhotoUrl({ photoUrl: '' })` => null
[DEPENDS_ON]: None (pure function)

---

### processUserDisplayName
[PATH]: ./processUserDisplayName.js
[INTENT]: Format user's display name for UI
[SIGNATURE]: ({ firstName: string, lastName?: string|null, showFull: boolean }) => string
[INPUT]:
  - firstName: string (req) - User's first name
  - lastName: string|null|undefined (opt) - User's last name
  - showFull: boolean (req) - Whether to show full name
[OUTPUT]: Formatted display name
[THROWS]:
  - Error when firstName is missing or invalid
  - Error when showFull is not boolean
[BUSINESS_RULES]:
  - showFull=true + lastName exists: "FirstName LastName"
  - showFull=false OR no lastName: "FirstName"
[EXAMPLE]:
  - `processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: true })` => "John Doe"
  - `processUserDisplayName({ firstName: 'John', lastName: 'Doe', showFull: false })` => "John"
[DEPENDS_ON]: None (pure function)

---

### processUserInitials
[PATH]: ./processUserInitials.js
[INTENT]: Generate initials for avatar fallback display
[SIGNATURE]: ({ firstName: string, lastName?: string|null }) => string
[INPUT]:
  - firstName: string (req) - User's first name
  - lastName: string|null|undefined (opt) - User's last name
[OUTPUT]: 1-2 letter initials (uppercase)
[THROWS]: Error when firstName is missing or invalid
[BUSINESS_RULES]:
  - Both names: First letter of each ("JD")
  - First name only: First letter ("J")
[EXAMPLE]:
  - `processUserInitials({ firstName: 'John', lastName: 'Doe' })` => "JD"
  - `processUserInitials({ firstName: 'Jane', lastName: null })` => "J"
[DEPENDS_ON]: None (pure function)

---

### processUserData
[PATH]: ./processUserData.js
[INTENT]: Transform raw Supabase user into clean UI-ready object
[SIGNATURE]: ({ rawUser: object, requireVerification?: boolean }) => ProcessedUser
[INPUT]:
  - rawUser: object (req) - Raw user from Supabase
  - requireVerification: boolean (opt, default false) - Enforce verification
[OUTPUT]: Clean user object with normalized fields
[THROWS]:
  - Error when rawUser is null/undefined
  - Error when _id is missing
  - Error when verification required but user not verified
[OUTPUT_SHAPE]:
  ```javascript
  {
    id: string,
    fullName: string,
    firstName: string,
    profilePhoto: string | null,
    bio: string | null,
    email: string | null,
    phone: string | null,
    isVerified: boolean,
    isEmailConfirmed: boolean,
    isPhoneVerified: boolean,
    linkedInId: string | null,
    displayName: string
  }
  ```
[NAME_FALLBACK_LOGIC]:
  1. Use "Name - Full" if available
  2. Build from "Name - First" + "Name - Last"
  3. Use just "Name - First" or "Name - Last"
  4. Default to "Guest User" with console.warn
[DEPENDS_ON]: None (pure function)

---

## ### BUBBLE_PHOTO_URL_HANDLING ###

| Input Format | Output |
|--------------|--------|
| `https://example.com/photo.jpg` | `https://example.com/photo.jpg` |
| `//s3.amazonaws.com/appforest_uf/...` | `https://s3.amazonaws.com/appforest_uf/...` |
| `http://example.com/photo.jpg` | `http://example.com/photo.jpg` |
| `javascript:alert(1)` | null (XSS blocked) |
| `data:image/png;base64,...` | null (blocked) |
| `""` or `null` or `undefined` | null |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always use processProfilePhotoUrl before rendering images
[RULE_2]: Use processUserInitials as avatar fallback when no photo
[RULE_3]: Use shouldShowFullName (from rules/users) to determine showFull param
[RULE_4]: processUserData handles missing name fields gracefully

---

## ### COMMON_PATTERNS ###

### Avatar Component
```javascript
import { processProfilePhotoUrl } from 'logic/processors/user/processProfilePhotoUrl'
import { processUserInitials } from 'logic/processors/user/processUserInitials'
import { hasProfilePhoto } from 'logic/rules/users/hasProfilePhoto'

function UserAvatar({ user }) {
  const photoUrl = processProfilePhotoUrl({ photoUrl: user.profilePhoto })
  const showPhoto = hasProfilePhoto({ photoUrl })
  const initials = processUserInitials({
    firstName: user.firstName,
    lastName: user.lastName
  })

  return showPhoto
    ? <img src={photoUrl} alt={user.firstName} />
    : <span className="initials">{initials}</span>
}
```

### User Name Display
```javascript
import { processUserDisplayName } from 'logic/processors/user/processUserDisplayName'
import { shouldShowFullName } from 'logic/rules/users/shouldShowFullName'

function UserName({ user, isMobile }) {
  const showFull = shouldShowFullName({
    firstName: user.firstName,
    lastName: user.lastName,
    isMobile
  })

  return processUserDisplayName({
    firstName: user.firstName,
    lastName: user.lastName,
    showFull
  })
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: processProfilePhotoUrl, processUserDisplayName, processUserInitials, processUserData

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Required fields throw, optional return null
[PURE]: No side effects (console.warn for debugging only)
[XSS_PROTECTION]: Photo URL validation blocks dangerous protocols

---

**FILE_COUNT**: 4
**EXPORTS_COUNT**: 4
