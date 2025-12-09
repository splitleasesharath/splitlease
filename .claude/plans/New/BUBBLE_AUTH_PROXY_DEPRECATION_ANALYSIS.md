# bubble-auth-proxy Deprecation Analysis

**Generated**: 2025-12-07
**Status**: Analysis Complete - Ready for Cleanup

---

## Executive Summary

The `bubble-auth-proxy` Edge Function has been **deprecated** in favor of `auth-user`, which uses **native Supabase Auth** instead of routing through Bubble.io. All runtime code has already been migrated, but documentation and configuration files still contain references to the deprecated function.

### Key Findings

| Aspect | Status |
|--------|--------|
| **Runtime Code (auth.js)** | MIGRATED - Using `auth-user` |
| **Runtime Code (SignUpLoginModal.jsx)** | MIGRATED - Using `auth-user` |
| **Edge Function `auth-user`** | ACTIVE - Native Supabase Auth |
| **Edge Function `bubble-auth-proxy`** | DEPRECATED - Still exists in codebase |
| **config.toml** | NEEDS UPDATE - `auth-user` not configured, `bubble-auth-proxy` still enabled |
| **Documentation** | NEEDS UPDATE - 50+ references to `bubble-auth-proxy` |

---

## Architecture Comparison

### OLD: bubble-auth-proxy (DEPRECATED)

```
Frontend → bubble-auth-proxy → Bubble.io Workflows → Response
                              └── /wf/login-user
                              └── /wf/signup
                              └── /wf/logout
                              └── /wf/validate
```

**File**: `supabase/functions/bubble-auth-proxy/`

**Authentication Method**:
- Login/Signup: Via Bubble.io workflow API
- Returns: `{ token, user_id, expires }`

---

### NEW: auth-user (ACTIVE)

```
Frontend → auth-user → Supabase Auth → Response
                      └── signInWithPassword (login)
                      └── signUp (signup)
                      └── Bubble.io (logout/validate - legacy)
```

**File**: `supabase/functions/auth-user/`

**Authentication Method**:
- Login: `supabase.auth.signInWithPassword()` (native Supabase)
- Signup: Native Supabase Auth + user table creation
- Logout/Validate: Still routes to Bubble (legacy support)
- Returns: `{ access_token, refresh_token, expires_in, user_id, supabase_user_id, user_type, ... }`

---

## Runtime Code Status

### Files Already Using `auth-user` (No Changes Needed)

| File | Lines | Function |
|------|-------|----------|
| `app/src/lib/auth.js` | 427, 609, 751, 884 | loginUser, signupUser, validateTokenAndFetchUser, logoutUser |
| `app/src/islands/shared/SignUpLoginModal.jsx` | 665, 698 | Login and signup handlers |

### Code Invocations (All Correct)

```javascript
// auth.js:427
const { data, error } = await supabase.functions.invoke('auth-user', {
  body: { action: 'login', payload: { email, password } }
});

// auth.js:609
const { data, error } = await supabase.functions.invoke('auth-user', {
  body: { action: 'signup', payload }
});

// auth.js:751
const { data, error } = await supabase.functions.invoke('auth-user', {
  body: { action: 'validate', payload: { token, user_id: userId } }
});

// auth.js:884
const { data, error } = await supabase.functions.invoke('auth-user', {
  body: { action: 'logout', payload: { token } }
});
```

---

## Files Requiring Updates

### 1. Configuration Files

#### supabase/config.toml

**Action Required**: Add `auth-user` configuration, consider removing `bubble-auth-proxy`

```toml
# ADD this section:
[functions.auth-user]
enabled = true
verify_jwt = false
entrypoint = "./functions/auth-user/index.ts"

# OPTIONALLY remove or disable:
[functions.bubble-auth-proxy]
enabled = false  # or delete entire section
```

---

### 2. Documentation Files - Direct References

| File | Lines with References | Priority |
|------|----------------------|----------|
| `.claude/CLAUDE.md` | 192 | HIGH |
| `CLAUDE.md` (root) | 71, 119, 145, 153, 275, 352 | HIGH |
| `app/CLAUDE.md` | 153 | HIGH |
| `supabase/CLAUDE.md` | 16, 54, 221-223, 318, 391-395, 423 | HIGH |
| `README.md` | 50, 94, 413 | HIGH |
| `Documentation/Auth/LOGIN_FLOW.md` | 35, 138, 180, 187, 189, 239, 398, 480, 520-522 | MEDIUM |
| `Documentation/Auth/SIGNUP_FLOW.md` | 44, 339, 381, 383, 421, 860-861 | MEDIUM |
| `Documentation/CORE-Functions/ARCHITECTURE_ANALYSIS.md` | 25, 60, 204, 206, 694, 1079 | MEDIUM |
| `Documentation/CORE-Functions/QUICK_REFERENCE.md` | 30, 140, 144, 169, 190, 202 | MEDIUM |
| `Documentation/CORE-Functions/README.md` | 27, 161 | MEDIUM |
| `Documentation/CORE-Functions/VISUAL_GUIDE.md` | 37, 99, 407 | MEDIUM |
| `docs/AUTH_QUICK_REFERENCE.md` | 12, 158, 328 | MEDIUM |
| `docs/EDGE_FUNCTIONS_AUTH_ANALYSIS.md` | 13, 26, 28, 46, 331, 606, 750-752, 780 | MEDIUM |
| `docs/EDGE_FUNCTIONS_DEPLOYMENT_ANALYSIS_2025_12_06.md` | 25 | LOW |
| `app/.env.example` | 23 | LOW |
| `app/src/lib/CLAUDE (1).md` | 37 | LOW |
| `app/src/lib/CLAUDE (1) (1).md` | 35, 45 | LOW |
| `app/src/islands/shared/CLAUDE (1).md` | 58 | LOW |
| `app/src/islands/shared/CLAUDE (1) (1).md` | 108 | LOW |
| `Documentation/EDGE-Functions/BUBBLE_SYNC_SERVICE.md` | 95 | LOW |
| `.claude/_A PLAN/EDGE_FUNCTIONS_AUTH_ANALYSIS.md` | 13, 26, 28, 46, 331, 606, 750-752, 780 | LOW (duplicate) |

---

### 3. Edge Function Files to Remove/Archive

#### Delete or Archive: `supabase/functions/bubble-auth-proxy/`

| File | Purpose |
|------|---------|
| `index.ts` | Main router (routes to Bubble) |
| `handlers/login.ts` | Bubble login workflow |
| `handlers/signup.ts` | Bubble signup workflow |
| `handlers/logout.ts` | Bubble logout workflow |
| `handlers/validate.ts` | Bubble token validation |
| `deno.json` | Import map |
| `.npmrc` | NPM config |

**Recommendation**: Archive to `_deprecated/bubble-auth-proxy/` rather than delete immediately

---

## Cleanup Actions Checklist

### Phase 1: Configuration (Required)

- [ ] Add `[functions.auth-user]` section to `supabase/config.toml`
- [ ] Disable or remove `[functions.bubble-auth-proxy]` from `supabase/config.toml`
- [ ] Verify `auth-user` function is deployed on Supabase Dashboard

### Phase 2: Documentation (Recommended)

#### HIGH Priority (Core Project Documentation)
- [ ] Update `.claude/CLAUDE.md` - Change troubleshooting reference
- [ ] Update `CLAUDE.md` (root) - Update edge functions list, auth references
- [ ] Update `app/CLAUDE.md` - Change edge function reference
- [ ] Update `supabase/CLAUDE.md` - Comprehensive update needed (actions, examples, secrets)
- [ ] Update `README.md` - Update edge functions table and tree structure

#### MEDIUM Priority (Feature Documentation)
- [ ] Update `Documentation/Auth/LOGIN_FLOW.md` - Full rewrite for Supabase Auth
- [ ] Update `Documentation/Auth/SIGNUP_FLOW.md` - Full rewrite for Supabase Auth
- [ ] Update `Documentation/CORE-Functions/*.md` - Remove bubble-auth-proxy references
- [ ] Update `docs/AUTH_QUICK_REFERENCE.md` - Update architecture diagram

#### LOW Priority (Internal/Legacy)
- [ ] Remove or update duplicate files in `.claude/_A PLAN/`
- [ ] Update internal CLAUDE files in `app/src/lib/` and `app/src/islands/`
- [ ] Update `app/.env.example` comments

### Phase 3: Code Cleanup (Optional but Recommended)

- [ ] Move `supabase/functions/bubble-auth-proxy/` to `_deprecated/` folder
- [ ] Or delete entirely if confirmed no longer needed
- [ ] Check Supabase Dashboard for deployed functions status

---

## Migration Verification

### Before Cleanup - Verify These Work

```bash
# Test login via auth-user
curl -X POST https://[PROJECT].supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "payload": {"email": "test@example.com", "password": "test"}}'

# Test signup via auth-user
curl -X POST https://[PROJECT].supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{"action": "signup", "payload": {"email": "new@example.com", "password": "test", "retype": "test"}}'
```

### After Cleanup - Verify bubble-auth-proxy is Disabled

```bash
# Should return 404 or disabled error
curl -X POST https://[PROJECT].supabase.co/functions/v1/bubble-auth-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "login", "payload": {"email": "test@example.com", "password": "test"}}'
```

---

## Related Items

### `zap-auth-user` Function

Mentioned in `docs/EDGE_FUNCTIONS_DEPLOYMENT_ANALYSIS_2025_12_06.md` as deployed on 2025-12-06 with "purpose unclear". Directory does not exist locally:
- **Status**: Investigate - may have been deployed directly without local code
- **Action**: Check Supabase Dashboard for this function

### Remaining Bubble Dependencies in `auth-user`

The `auth-user` function still routes to Bubble for:
- `logout` action - Calls Bubble `/wf/logout`
- `validate` action - Calls Bubble for token validation + fetches from Supabase

**Future Migration**: Consider migrating logout/validate to fully native Supabase Auth.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Documentation files to update | 21+ |
| Direct code references (documentation) | 60+ |
| Runtime code files (already migrated) | 2 |
| Edge Function directories | 2 (keep auth-user, deprecate bubble-auth-proxy) |
| Config file changes | 1 (config.toml) |

---

**Document Version**: 1.0
**Last Updated**: 2025-12-07
**Author**: Claude Code Analysis
