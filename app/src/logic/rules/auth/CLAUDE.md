# Auth Rules Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/rules/

---

## ### LOGIC_CONTRACTS ###

### isProtectedPage
[PATH]: ./isProtectedPage.js
[INTENT]: Determine if URL pathname requires authentication
[SIGNATURE]: ({ pathname: string }) => boolean
[INPUT]:
  - pathname: string (req) - Current URL pathname (e.g., '/guest-proposals')
[OUTPUT]: boolean - true if page requires login, false otherwise
[THROWS]:
  - Error: "pathname must be a string" - When not string
[TRUTH_SOURCE]: Internal `protectedPaths` array:
  ```
  ['/guest-proposals', '/account-profile', '/host-dashboard']
  ```
[RULES]:
  - Handles both clean URLs (/guest-proposals) and .html URLs (/guest-proposals.html)
  - Matches exact paths and sub-paths (e.g., /guest-proposals/123)
  - Normalizes path by removing .html extension
[EXAMPLE]:
  - isProtectedPage({ pathname: '/guest-proposals' }) => true
  - isProtectedPage({ pathname: '/search' }) => false
  - isProtectedPage({ pathname: '/guest-proposals.html' }) => true
[DEPENDS_ON]: None (pure function)
[USED_BY]: Route guards, Header component, Auth workflows

### isSessionValid
[PATH]: ./isSessionValid.js
[INTENT]: Check if user has valid active session
[SIGNATURE]: ({ authState: boolean }) => boolean
[INPUT]:
  - authState: boolean (req) - Current authentication state
[OUTPUT]: boolean - true if session is valid
[THROWS]:
  - Error: "authState must be a boolean" - When not boolean
[RULE]: Session is valid if authState is true (Bubble API handles actual token expiry)
[EXAMPLE]: isSessionValid({ authState: true }) => true
[DEPENDS_ON]: None (pure function)
[USED_BY]: Auth status checks, Protected page access

---

## ### CONSTANTS ###

[PROTECTED_PATHS]: ['/guest-proposals', '/account-profile', '/host-dashboard']
[PUBLIC_PATHS]: All other paths (implicit - not in protected list)

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: isProtectedPage, isSessionValid

---

## ### USAGE_PATTERN ###

```javascript
import { isProtectedPage } from 'logic/rules/auth/isProtectedPage'
import { isSessionValid } from 'logic/rules/auth/isSessionValid'

// Route guard pattern
if (isProtectedPage({ pathname }) && !isSessionValid({ authState })) {
  redirect('/')
}
```

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Throw errors for invalid input, never assume defaults
[PURE]: No side effects, no external calls
[LAYER]: Layer 2 - Rules (boolean predicates only)

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
