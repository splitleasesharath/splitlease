# Auth Workflows - Logic Layer 4

**GENERATED**: 2025-11-26
**LAYER**: Workflows (Orchestration)
**PARENT**: app/src/logic/workflows/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Multi-step authentication orchestration combining rules, processors, and API calls
[LAYER]: Layer 4 - Workflows (orchestrate lower layers, handle async operations)
[PATTERN]: Coordinate auth state validation, token management, and user fetching

---

## ### FILE_INVENTORY ###

### checkAuthStatusWorkflow.js
[INTENT]: Verify user login status, validate token, and fetch user data if authenticated
[EXPORTS]: checkAuthStatusWorkflow
[IMPORTS]: lib/auth, lib/secureStorage, ../../rules/auth/isSessionValid
[SIGNATURE]: () => Promise<{ isAuthenticated: boolean, user: object | null }>
[ASYNC]: Yes

### validateTokenWorkflow.js
[INTENT]: Validate auth token with backend and refresh if needed
[EXPORTS]: validateTokenWorkflow
[IMPORTS]: lib/auth, lib/secureStorage
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/handlers/validate
[SIGNATURE]: (token: string) => Promise<{ valid: boolean, user: object | null }>
[ASYNC]: Yes

---

## ### WORKFLOW_SEQUENCE ###

### checkAuthStatusWorkflow
```
1. Check if token exists in secureStorage
2. If no token → return { isAuthenticated: false, user: null }
3. If token exists → call validateTokenWorkflow
4. If valid → return { isAuthenticated: true, user }
5. If invalid → clear storage, return { isAuthenticated: false, user: null }
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { checkAuthStatusWorkflow } from 'logic/workflows/auth/checkAuthStatusWorkflow'
[CONSUMED_BY]: App initialization, protected route guards, Header component
[PATTERN]: useEffect(() => { checkAuthStatusWorkflow().then(setAuthState) }, [])

---

## ### API_DEPENDENCIES ###

[EDGE_FUNCTION]: bubble-auth-proxy/handlers/validate
[ENDPOINT]: POST /validate with token in body

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
