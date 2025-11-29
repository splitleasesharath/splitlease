# Auth Rules - Logic Layer 2

**GENERATED**: 2025-11-26
**LAYER**: Rules (Boolean Predicates)
**PARENT**: app/src/logic/rules/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Boolean predicates for authentication and authorization decisions
[LAYER]: Layer 2 - Rules (return true/false, express business rules)
[PATTERN]: All functions return boolean values based on input state

---

## ### FILE_INVENTORY ###

### isProtectedPage.js
[INTENT]: Determine if current page path requires authentication before access
[EXPORTS]: isProtectedPage
[SIGNATURE]: (pathname: string) => boolean
[RETURNS]: true if page requires login, false otherwise

### isSessionValid.js
[INTENT]: Check if current session token is valid and not expired
[EXPORTS]: isSessionValid
[IMPORTS]: lib/secureStorage
[SIGNATURE]: () => boolean
[RETURNS]: true if session is valid, false if expired or missing

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { isProtectedPage } from 'logic/rules/auth/isProtectedPage'
[CONSUMED_BY]: Route guards, Header component, auth workflows
[PATTERN]: if (isProtectedPage(path) && !isAuthenticated) redirect('/login')

---

## ### PROTECTED_PAGES ###

[REQUIRES_AUTH]: /account-profile, /host-dashboard
[PUBLIC]: /search, /view-split-lease, /help-center, /faq

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
