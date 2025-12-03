# Auth Workflows Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Authentication orchestration across cookies, storage, and validation
[LAYER]: Layer 4 - Workflows (coordinate auth state checks)
[PATTERN]: Multi-source auth verification with priority ordering

---

## ### WORKFLOW_CONTRACTS ###

### checkAuthStatusWorkflow
[PATH]: ./checkAuthStatusWorkflow.js
[INTENT]: Determine if user is authenticated across multiple sources
[SIGNATURE]: ({ splitLeaseCookies: object, authState: boolean, hasValidTokens: boolean }) => AuthStatus
[INPUT]:
  - splitLeaseCookies: object (req) - { isLoggedIn: boolean, username: string }
  - authState: boolean (req) - Auth state from secure storage
  - hasValidTokens: boolean (req) - Whether valid tokens exist
[OUTPUT]: { isAuthenticated: boolean, source: 'cookies'|'secure_storage'|null, username: string|null }
[THROWS]:
  - Error when splitLeaseCookies is missing
  - Error when authState is not boolean
  - Error when hasValidTokens is not boolean
[PRIORITY_ORDER]:
  1. Split Lease cookies (cross-domain compatibility)
  2. Secure storage tokens
  3. Not authenticated
[ASYNC]: No (pure orchestration)
[EXAMPLE]:
  ```javascript
  checkAuthStatusWorkflow({
    splitLeaseCookies: { isLoggedIn: true, username: 'john@example.com' },
    authState: true,
    hasValidTokens: true
  })
  // => { isAuthenticated: true, source: 'cookies', username: 'john@example.com' }
  ```
[DEPENDS_ON]: None (pure function)

---

### validateTokenWorkflow
[PATH]: ./validateTokenWorkflow.js
[INTENT]: Validate auth token with backend
[SIGNATURE]: (token: string) => Promise<{ valid: boolean, user: object|null }>
[INPUT]:
  - token: string (req) - Auth token to validate
[OUTPUT]: { valid: boolean, user: object|null }
[API_DEPENDENCY]: supabase/functions/bubble-auth-proxy/handlers/validate
[ASYNC]: Yes

---

## ### AUTH_SOURCES ###

| Source | Priority | Use Case |
|--------|----------|----------|
| cookies | 1 | Cross-domain compatibility with Split Lease main site |
| secure_storage | 2 | Local encrypted token storage |
| none | 3 | Not authenticated |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always check auth status before accessing protected resources
[RULE_2]: Clear auth data on validation failure (don't leave stale tokens)
[RULE_3]: Cookies take priority for cross-domain scenarios
[RULE_4]: Return source information for debugging auth issues

---

## ### COMMON_PATTERNS ###

### App Initialization
```javascript
import { checkAuthStatusWorkflow } from 'logic/workflows/auth/checkAuthStatusWorkflow'

function useAuthInit() {
  const [authState, setAuthState] = useState({ isAuthenticated: false, user: null })

  useEffect(() => {
    const cookies = readSplitLeaseCookies()
    const storageState = getSecureStorageState()
    const hasTokens = checkTokensExist()

    const status = checkAuthStatusWorkflow({
      splitLeaseCookies: cookies,
      authState: storageState,
      hasValidTokens: hasTokens
    })

    setAuthState(status)
  }, [])

  return authState
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: lib/secureStorage, lib/auth
[API]: bubble-auth-proxy/handlers/validate
[EXPORTS]: checkAuthStatusWorkflow, validateTokenWorkflow

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Throws on invalid inputs
[DETERMINISTIC]: Same inputs always produce same output
[TESTABLE]: Pure function with no side effects

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
