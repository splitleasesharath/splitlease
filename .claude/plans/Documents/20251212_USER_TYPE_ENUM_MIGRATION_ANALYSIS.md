# User Type Fields TEXT to ENUM Migration Analysis

**Date**: 2025-12-12
**Status**: Research Complete
**Risk Level**: HIGH

---

## Executive Summary

Converting `Type_User_Signup` and `Typ_User_Current` fields in the Supabase `user` table from TEXT to ENUM type is **technically possible but carries significant risk** due to widespread substring matching logic, Bubble API coupling, and hardcoded default values throughout the codebase.

---

## Current State

### Database Schema

| Field | Current Type | Nullable | Purpose |
|-------|--------------|----------|---------|
| `Type - User Current` | TEXT | YES | Current user type (links to `os_user_type`) |
| `Type - User Signup` | TEXT | YES | Original signup type choice |

### Existing Option Set: `os_user_type`

| ID | Name | Display |
|----|------|---------|
| 1 | host | A Host (I have a space available to rent) |
| 2 | guest | A Guest (I would like to rent a space) |
| 3 | split_lease | Split Lease |
| 4 | trial_host | Trial Host |

### Current Values in Database

The TEXT fields currently store **display strings**, not programmatic names:
- `"Guest"` or `"A Guest (I would like to rent a space)"`
- `"Host"` or `"A Host (I have a space available to rent)"`
- `"Trial Host"`
- `"Split Lease"`

---

## Impact Analysis

### Frontend Code References

| File | Usage | Breaking Risk |
|------|-------|---------------|
| `app/src/lib/auth.js` | Reads from session metadata, stores via `setUserType()` | HIGH |
| `app/src/logic/rules/users/isHost.js` | Uses `.includes('Host')` substring match | **CRITICAL** |
| `app/src/logic/rules/users/isGuest.js` | Uses `.includes('Guest')` substring match | **CRITICAL** |
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | Reads `Type - User Current` | MEDIUM |
| `app/src/logic/workflows/auth/validateTokenWorkflow.js` | Reads `Type - User Current` | HIGH |

### Edge Functions References

| File | Usage | Breaking Risk |
|------|-------|---------------|
| `supabase/functions/auth-user/handlers/signup.ts` | Defaults to `'Guest'`, writes to both fields | HIGH |
| `supabase/functions/auth-user/handlers/validate.ts` | Queries and returns `Type - User Current` | HIGH |
| `supabase/functions/auth-user/handlers/resetPassword.ts` | Reads `Type - User Current` | MEDIUM |
| `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts` | Copies TEXT values directly to Bubble | **CRITICAL** |

---

## Critical Breaking Points

### 1. Substring Matching Logic (CRITICAL)

```javascript
// isHost.js line 38
return type.includes('Host')  // Will FAIL if value is "1" (enum ID)

// isGuest.js line 37
return type.includes('Guest')  // Will FAIL if value is "2" (enum ID)
```

These rules use `.includes()` to check for user type, expecting strings containing "Host" or "Guest". Enum IDs or programmatic names would cause silent failures.

### 2. Hardcoded Default Values (HIGH)

```typescript
// signup.ts line 59
userType = 'Guest'  // Expects string, not enum ID

// signup.ts line 232-234
'Type - User Current': userType || 'Guest'
'Type - User Signup': userType || 'Guest'
```

### 3. Bubble Sync Pipeline (CRITICAL)

```typescript
// syncSignupAtomic.ts lines 144-145
'Type - User Current': userRecord['Type - User Current'],
'Type - User Signup': userRecord['Type - User Signup'],
```

Bubble Data API expects human-readable TEXT values. Changing to enum IDs will break:
- Bubble workflows
- Bubble reports and filters
- Bidirectional data sync

### 4. Supabase Auth Metadata (HIGH)

```typescript
// signup.ts line 155
user_metadata: {
  user_type: userType,  // Currently stores string
}
```

Session tokens store user type as string. All frontend validation reads from this metadata.

---

## Affected Files Summary

### Frontend (14+ files)
- `app/src/lib/auth.js`
- `app/src/logic/rules/users/isHost.js`
- `app/src/logic/rules/users/isGuest.js`
- `app/src/logic/workflows/auth/validateTokenWorkflow.js`
- `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js`
- All pages that check user type for routing/permissions

### Edge Functions (4+ files)
- `supabase/functions/auth-user/handlers/signup.ts`
- `supabase/functions/auth-user/handlers/validate.ts`
- `supabase/functions/auth-user/handlers/resetPassword.ts`
- `supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts`

---

## Migration Blockers

| Blocker | Severity | Resolution Required |
|---------|----------|---------------------|
| Substring matching in isHost/isGuest | CRITICAL | Rewrite to exact enum comparison |
| Hardcoded string defaults | HIGH | Replace with enum lookups |
| Bubble sync expects TEXT | CRITICAL | Add mapping/translation layer |
| Auth metadata string storage | HIGH | Update all session handling |
| Case sensitivity mismatch | MEDIUM | Data cleanup required |
| No abstraction layer | MEDIUM | Create centralized mapping service |

---

## Data Integrity Concerns

**Case Mismatch**:
- Stored values: `"Guest"`, `"Host"` (Title Case)
- os_user_type names: `"guest"`, `"host"` (lowercase)

**Format Inconsistency**:
- Some records: `"Guest"`
- Some records: `"A Guest (I would like to rent a space)"`

---

## Recommended Approach

### Option A: Full Migration (High Risk)

1. Create PostgreSQL ENUM type
2. Update ALL code references (14+ files)
3. Add Bubble translation layer
4. Migrate existing data
5. Update auth metadata handling

**Estimated Impact**: 50+ code changes, 3-5 days work, high regression risk

### Option B: Transition Strategy (Recommended)

1. Keep TEXT columns for Bubble compatibility
2. Add new ENUM columns (`user_type_enum`, `signup_type_enum`)
3. Create mapping functions in `app/src/lib/userTypeMapping.js`
4. Gradually migrate code to use new columns
5. Deprecate TEXT columns after 6+ months

**Estimated Impact**: Lower risk, parallel systems, gradual rollout

### Option C: Standardize Values Only (Lowest Risk)

1. Keep TEXT type
2. Standardize to use programmatic names only (`"guest"`, `"host"`)
3. Update comparison logic to use exact matches
4. Add validation at write points

**Estimated Impact**: Moderate changes, maintains compatibility

---

## Files Requiring Changes (Full Migration)

```
app/src/lib/auth.js
app/src/logic/rules/users/isHost.js
app/src/logic/rules/users/isGuest.js
app/src/logic/workflows/auth/validateTokenWorkflow.js
app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js
supabase/functions/auth-user/handlers/signup.ts
supabase/functions/auth-user/handlers/validate.ts
supabase/functions/auth-user/handlers/resetPassword.ts
supabase/functions/bubble_sync/handlers/syncSignupAtomic.ts
+ Any page using user type for routing/permissions
```

---

## Conclusion

The TEXT to ENUM migration is a **"breaks everything silently"** change. The current architecture has no abstraction layer for user type handling, with direct field access throughout frontend and backend code.

**Recommendation**: Implement Option B (Transition Strategy) or Option C (Standardize Values Only) to minimize risk while achieving standardization goals.

---

## Related Documentation

- [DATABASE_TABLES_DETAILED.md](../Documentation/Database/DATABASE_TABLES_DETAILED.md)
- [OPTION_SETS_DETAILED.md](../Documentation/Database/OPTION_SETS_DETAILED.md)
- [AUTH_USER_EDGE_FUNCTION.md](../Documentation/Auth/AUTH_USER_EDGE_FUNCTION.md)
