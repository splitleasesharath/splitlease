# Implementation Plan: Auth-User Name Trimming Validation

## Overview

Add input validation to the auth-user Edge Function that trims whitespace from `first_name` and `last_name` fields before updating the User table. This prevents storing names with leading or trailing spaces, ensuring data consistency across signups (both standard and OAuth).

## Success Criteria

- [ ] All `first_name` and `last_name` values are trimmed before database insertion
- [ ] Trimming applies to both standard signup and OAuth signup handlers
- [ ] Trimming function is implemented as a pure function following FP patterns
- [ ] User metadata in Supabase Auth also receives trimmed values
- [ ] Empty strings after trimming are converted to null (matching existing pattern)
- [ ] No fallback mechanisms - just direct trimming

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/functions/auth-user/handlers/signup.ts` | Standard email/password signup | Apply trimming to firstName/lastName before use |
| `supabase/functions/auth-user/handlers/oauthSignup.ts` | OAuth provider signup | Apply trimming to firstName/lastName before use |
| `supabase/functions/_shared/validation.ts` | Input validation utilities | Add new `trimString` pure function |

### Related Documentation

- [supabase/CLAUDE.md](../../supabase/CLAUDE.md) - Edge Functions patterns and FP architecture
- [.claude/Documentation/Backend(EDGE - Functions)/AUTH_USER.md](../../.claude/Documentation/Backend(EDGE%20-%20Functions)/AUTH_USER.md) - Auth user function reference

### Existing Patterns to Follow

1. **Pure Function Pattern**: The codebase uses pure functions for transformations (see `supabase/functions/_shared/fp/result.ts`)
2. **No Fallback Principle**: Direct operations without default values or fallback logic
3. **Validation in _shared**: Validation utilities are centralized in `_shared/validation.ts`
4. **Empty to Null Pattern**: Both handlers convert empty strings to null for database fields (e.g., `firstName || null`)

## Implementation Steps

### Step 1: Add trimString Pure Function to Validation Module

**Files:** `supabase/functions/_shared/validation.ts`

**Purpose:** Create a reusable pure function for trimming string values

**Details:**
- Add a new exported function `trimString(value: string | undefined | null): string | null`
- Function should:
  - Return null if input is null or undefined
  - Trim leading and trailing whitespace from strings
  - Return null if the result is an empty string (consistent with existing pattern)
- Follow FP pattern: pure, no side effects, explicit return type

**Code Pattern:**
```typescript
/**
 * Trim whitespace from a string value
 * Pure function: no side effects, returns null for empty/undefined values
 *
 * @param value - String to trim (may be null/undefined)
 * @returns Trimmed string, or null if empty/undefined
 */
export function trimString(value: string | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
```

**Validation:** Import and test the function returns expected values:
- `trimString('  hello  ')` returns `'hello'`
- `trimString('  ')` returns `null`
- `trimString(null)` returns `null`
- `trimString(undefined)` returns `null`

### Step 2: Apply Trimming in Standard Signup Handler

**Files:** `supabase/functions/auth-user/handlers/signup.ts`

**Purpose:** Ensure firstName and lastName are trimmed before database insertion and Auth metadata

**Details:**
1. Import `trimString` from `../../_shared/validation.ts`
2. Apply trimming immediately after extracting from additionalData (around line 69-76)
3. Use trimmed values throughout the handler (user record, auth metadata, logging)

**Current Code (lines 69-76):**
```typescript
const {
  firstName = '',
  lastName = '',
  userType = 'Guest',
  birthDate = '',
  phoneNumber = ''
}: SignupAdditionalData = additionalData || {};
```

**New Code:**
```typescript
import { trimString } from '../../_shared/validation.ts';

// ... inside handleSignup function, after extracting additionalData:

const rawAdditionalData: SignupAdditionalData = additionalData || {};

// Trim name fields to prevent storing whitespace
const firstName = trimString(rawAdditionalData.firstName) ?? '';
const lastName = trimString(rawAdditionalData.lastName) ?? '';
const userType = rawAdditionalData.userType || 'Guest';
const birthDate = rawAdditionalData.birthDate || '';
const phoneNumber = rawAdditionalData.phoneNumber || '';
```

**Note:** We use `?? ''` after trimString because the existing code expects empty strings for some downstream operations (like fullName construction). The actual database insertion already handles the null conversion with `firstName || null`.

**Validation:**
- Test signup with names containing leading/trailing spaces
- Verify database record has trimmed values
- Verify Supabase Auth user_metadata has trimmed values

### Step 3: Apply Trimming in OAuth Signup Handler

**Files:** `supabase/functions/auth-user/handlers/oauthSignup.ts`

**Purpose:** Ensure firstName and lastName from OAuth providers are trimmed

**Details:**
1. Import `trimString` from `../../_shared/validation.ts`
2. Apply trimming immediately after destructuring payload (around line 54-64)
3. Use trimmed values throughout the handler

**Current Code (lines 54-64):**
```typescript
const {
  email,
  firstName = '',
  lastName = '',
  userType = 'Guest',
  provider,
  supabaseUserId,
  access_token,
  refresh_token,
  profilePhoto = null,
} = payload;
```

**New Code:**
```typescript
import { trimString } from '../../_shared/validation.ts';

// ... inside handleOAuthSignup function:

const {
  email,
  firstName: rawFirstName = '',
  lastName: rawLastName = '',
  userType = 'Guest',
  provider,
  supabaseUserId,
  access_token,
  refresh_token,
  profilePhoto = null,
} = payload;

// Trim name fields to prevent storing whitespace
const firstName = trimString(rawFirstName) ?? '';
const lastName = trimString(rawLastName) ?? '';
```

**Validation:**
- Test OAuth signup with names containing leading/trailing spaces
- Verify database record has trimmed values
- Verify Supabase Auth user_metadata has trimmed values

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Name is only whitespace (e.g., `"   "`) | trimString returns null, stored as null in database |
| Name is undefined | trimString returns null, stored as null in database |
| Name is null | trimString returns null, stored as null in database |
| Name has internal spaces (e.g., `"Mary Jane"`) | Only leading/trailing spaces trimmed, internal preserved |
| Name has tabs or newlines | All whitespace characters trimmed (uses String.trim()) |

## Testing Considerations

### Manual Testing Scenarios

1. **Standard Signup with Whitespace:**
   - Sign up with firstName = `"  John  "` and lastName = `"  Doe  "`
   - Verify database shows `"John"` and `"Doe"`
   - Verify Supabase Auth user_metadata shows trimmed values

2. **OAuth Signup with Whitespace:**
   - Mock OAuth payload with whitespace in names
   - Verify database shows trimmed values

3. **Edge Cases:**
   - Sign up with only-whitespace name (`"   "`)
   - Verify null stored in database
   - Verify fullName computed correctly

4. **Normal Names (Regression):**
   - Sign up with normal names (no extra whitespace)
   - Verify no change in behavior

### Verification Queries

```sql
-- Check for any names with leading/trailing whitespace
SELECT _id, "Name - First", "Name - Last"
FROM "user"
WHERE "Name - First" LIKE ' %'
   OR "Name - First" LIKE '% '
   OR "Name - Last" LIKE ' %'
   OR "Name - Last" LIKE '% ';

-- Should return 0 rows after fix is deployed
```

## Rollback Strategy

If issues arise:
1. Remove the import of `trimString` from both handlers
2. Revert the destructuring changes to use original variable names
3. Redeploy the auth-user function
4. The trimString function in validation.ts can remain (unused code, no harm)

## Dependencies & Blockers

- None - this is a self-contained change within the auth-user function

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Trimming breaks downstream logic | Low | Low | Existing code already handles empty/null names |
| Performance impact from trimming | Very Low | Very Low | String.trim() is O(n) and names are short |
| OAuth providers sending trimmed names already | Medium | None | No harm in double-trimming |

## Deployment Notes

After implementation:
- Deploy auth-user Edge Function: `supabase functions deploy auth-user`
- No database migration needed
- No frontend changes needed
- Existing users with whitespace names are NOT affected (this only affects new signups)

---

## Files Referenced Summary

| File Path | Action |
|-----------|--------|
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\validation.ts` | ADD trimString function |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\signup.ts` | MODIFY to use trimString |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\oauthSignup.ts` | MODIFY to use trimString |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\index.ts` | NO CHANGES (reference only) |
| `c:\Users\Split Lease\Documents\Split Lease\supabase\functions\_shared\fp\result.ts` | NO CHANGES (pattern reference) |
