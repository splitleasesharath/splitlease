# Legacy User Password Reset Migration Plan

**CREATED**: 2025-12-07
**STATUS**: Pending Implementation
**PRIORITY**: High

---

## Executive Summary

With the migration from Bubble.io authentication to native Supabase Auth, **861 legacy users** exist in `public.user` but have no corresponding entry in `auth.users`. These users cannot log in with the current system because `signInWithPassword()` requires an `auth.users` record.

This plan implements a graceful migration path: detect legacy users at login, display a user-friendly message explaining their account needs activation, and guide them through password reset which will create their Supabase Auth account.

---

## Current State Analysis

| Table | Count | Description |
|-------|-------|-------------|
| `auth.users` | 16 | Users created via new Supabase Auth signup |
| `public.user` (legacy) | 861 | Users created via Bubble, not in auth.users |
| `public.user` (total) | 892 | All users (includes nulls + both systems) |

### Why Legacy Users Cannot Login

1. User enters email/password in `SignUpLoginModal`
2. `loginUser()` calls Edge Function `auth-user` with action `login`
3. `handleLogin()` calls `supabase.auth.signInWithPassword()`
4. Supabase Auth looks up user in `auth.users` table
5. User not found → "Invalid login credentials" error
6. **User blocked** - no way to know they're a legacy user needing migration

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW (Modified)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User enters email + password                                        │
│              │                                                       │
│              ▼                                                       │
│  ┌──────────────────────────────────────┐                           │
│  │  1. Try signInWithPassword()         │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ├─── SUCCESS ──────────────────▶ Login complete         │
│              │                                                       │
│              ▼ (FAILURE)                                             │
│  ┌──────────────────────────────────────┐                           │
│  │  2. Check if email exists in         │                           │
│  │     public.user table                 │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ├─── NOT FOUND ────────────▶ "Invalid credentials"      │
│              │                                                       │
│              ▼ (FOUND in public.user)                                │
│  ┌──────────────────────────────────────┐                           │
│  │  3. Check if email exists in         │                           │
│  │     auth.users table                  │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ├─── FOUND ────────────────▶ "Invalid credentials"      │
│              │     (wrong password)                                  │
│              │                                                       │
│              ▼ (NOT in auth.users = LEGACY USER)                     │
│  ┌──────────────────────────────────────┐                           │
│  │  4. Return LEGACY_USER_MIGRATION     │                           │
│  │     error code with user details      │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ▼                                                       │
│  ┌──────────────────────────────────────┐                           │
│  │  5. Frontend shows special message:  │                           │
│  │     "Your account was created before │                           │
│  │      our system upgrade. Please      │                           │
│  │      reset your password to regain   │                           │
│  │      access."                        │                           │
│  │     [Reset Password] button          │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Password Reset Flow for Legacy Users

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PASSWORD RESET FLOW (Enhanced)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User clicks "Reset Password"                                        │
│              │                                                       │
│              ▼                                                       │
│  ┌──────────────────────────────────────┐                           │
│  │  1. Check if email exists in         │                           │
│  │     auth.users                        │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ├─── EXISTS ───────────────▶ Standard Supabase reset    │
│              │                                                       │
│              ▼ (NOT in auth.users)                                   │
│  ┌──────────────────────────────────────┐                           │
│  │  2. Check if email exists in         │                           │
│  │     public.user (legacy user)         │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ├─── NOT FOUND ────────────▶ Silent success (security)  │
│              │                                                       │
│              ▼ (FOUND = LEGACY USER)                                 │
│  ┌──────────────────────────────────────┐                           │
│  │  3. Create auth.users entry with     │                           │
│  │     - email from public.user          │                           │
│  │     - Temporary random password       │                           │
│  │     - user_metadata linking to        │                           │
│  │       EXISTING public.user._id        │                           │
│  │       (NO new account_host/guest)     │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ▼                                                       │
│  ┌──────────────────────────────────────┐                           │
│  │  4. Send password reset email via    │                           │
│  │     Supabase Auth                     │                           │
│  └──────────────────────────────────────┘                           │
│              │                                                       │
│              ▼                                                       │
│  ┌──────────────────────────────────────┐                           │
│  │  5. User clicks link, sets password  │                           │
│  │     → Now has auth.users entry       │                           │
│  │     → Linked to existing user/_id    │                           │
│  │     → Can login normally             │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Point**: We only create an `auth.users` entry. The `public.user`, `account_host`, and `account_guest` records already exist for legacy users - we just link to them via `user_metadata`.

---

## Implementation Tasks

### Task 1: Modify Login Handler (`auth-user/handlers/login.ts`)

**File**: `supabase/functions/auth-user/handlers/login.ts`

**Changes**:
1. After `signInWithPassword()` fails, check if email exists in `public.user`
2. If found in `public.user` but not in `auth.users`, return special error code
3. Include user info (first name, email) for personalized messaging

```typescript
// After signInWithPassword fails:

// Check if this is a legacy user (exists in public.user but not auth.users)
const { data: legacyUser, error: legacyCheckError } = await supabaseAdmin
  .from('user')
  .select('_id, email, "Name - First", "Name - Full"')
  .eq('email', email.toLowerCase())
  .maybeSingle();

if (legacyUser) {
  // User exists in public.user - check if they're in auth.users
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existsInAuth = authUsers?.users?.some(
    u => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!existsInAuth) {
    // LEGACY USER - needs password reset migration
    throw new BubbleApiError(
      'Your account was created before our system upgrade. Please reset your password to regain access.',
      401,
      'LEGACY_USER_REQUIRES_MIGRATION'
    );
  }
}

// If not legacy user, it's truly invalid credentials
throw new BubbleApiError('Invalid email or password. Please try again.', 401);
```

### Task 2: Modify Error Response Structure

**File**: `supabase/functions/_shared/errors.ts`

Add a new error code for legacy user detection:

```typescript
export const ErrorCodes = {
  LEGACY_USER_REQUIRES_MIGRATION: 'LEGACY_USER_REQUIRES_MIGRATION',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // ... other codes
};
```

**Response format for legacy users**:
```json
{
  "success": false,
  "error": "Your account was created before our system upgrade. Please reset your password to regain access.",
  "code": "LEGACY_USER_REQUIRES_MIGRATION",
  "data": {
    "email": "user@example.com",
    "firstName": "John"
  }
}
```

### Task 3: Enhance Password Reset Handler (`auth-user/handlers/resetPassword.ts`)

**File**: `supabase/functions/auth-user/handlers/resetPassword.ts`

**Changes**:
1. Before calling `resetPasswordForEmail`, check if user exists in `auth.users`
2. If not in `auth.users` but in `public.user`, create the auth.users entry first
3. Link to existing `public.user._id` (account_host and account_guest already exist)
4. Then send password reset email

```typescript
// Check if email exists in auth.users
const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
const existingAuthUser = authUsers?.users?.find(
  u => u.email?.toLowerCase() === email.toLowerCase()
);

if (!existingAuthUser) {
  // Check if legacy user exists in public.user
  const { data: legacyUser } = await supabaseAdmin
    .from('user')
    .select('_id, "Name - First", "Name - Last", "Type - User Current", "Account - Host / Landlord", "Account - Guest"')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (legacyUser) {
    console.log('[reset-password] Migrating legacy user to auth.users:', email);

    // Create auth.users entry with temporary password
    // Links to EXISTING public.user._id - no new records created
    const tempPassword = crypto.randomUUID();

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        // Link to existing records - DO NOT create new ones
        user_id: legacyUser._id,
        host_account_id: legacyUser['Account - Host / Landlord'],
        guest_account_id: legacyUser['Account - Guest'],
        user_type: legacyUser['Type - User Current'] || 'Guest',
        first_name: legacyUser['Name - First'] || '',
        last_name: legacyUser['Name - Last'] || '',
        migrated_from_bubble: true,
        migration_date: new Date().toISOString()
      }
    });

    if (createError) {
      console.error('[reset-password] Failed to migrate legacy user:', createError.message);
      // Continue anyway - don't reveal if user exists
    } else {
      console.log('[reset-password] ✅ Legacy user added to auth.users');
      console.log('[reset-password]    Linked to existing user._id:', legacyUser._id);
    }
  }
}

// Now send password reset email (works for both new and legacy users)
const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
  redirectTo: resetRedirectUrl
});
```

### Task 4: Update Frontend Error Handling (`auth.js`)

**File**: `app/src/lib/auth.js`

**Changes**:
Modify `loginUser()` to detect and return the legacy user case:

```javascript
// In loginUser function, after receiving error from Edge Function:

if (error.context?.body) {
  try {
    const errorBody = typeof error.context.body === 'string'
      ? JSON.parse(error.context.body)
      : error.context.body;

    // Check for legacy user migration error
    if (errorBody?.code === 'LEGACY_USER_REQUIRES_MIGRATION') {
      return {
        success: false,
        error: errorBody.error,
        isLegacyUser: true,
        email: errorBody.data?.email,
        firstName: errorBody.data?.firstName
      };
    }
  } catch (parseErr) {
    // Fall through to default error handling
  }
}
```

### Task 5: Update SignUpLoginModal UI

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`

**Changes**:
1. Add new state for legacy user detection
2. Render special message and reset button for legacy users

```jsx
// New state
const [isLegacyUser, setIsLegacyUser] = useState(false);
const [legacyEmail, setLegacyEmail] = useState('');
const [legacyFirstName, setLegacyFirstName] = useState('');

// In handleLoginSubmit:
const result = await loginUser(loginData.email, loginData.password);

if (result.isLegacyUser) {
  setIsLegacyUser(true);
  setLegacyEmail(result.email || loginData.email);
  setLegacyFirstName(result.firstName || '');
  setError(''); // Clear generic error
  return;
}

// New render section for legacy users:
{isLegacyUser && (
  <div style={styles.legacyUserBox}>
    <div style={styles.legacyUserIcon}>🔄</div>
    <h3 style={styles.legacyUserTitle}>
      {legacyFirstName ? `Hi ${legacyFirstName}!` : 'Welcome back!'}
    </h3>
    <p style={styles.legacyUserMessage}>
      Your account was created before our recent system upgrade.
      To continue using Split Lease, please reset your password.
    </p>
    <p style={styles.legacyUserSubtext}>
      This is a one-time process that will activate your account
      on our new, more secure system.
    </p>
    <button
      type="button"
      onClick={() => {
        setResetEmail(legacyEmail);
        goToPasswordReset();
        setIsLegacyUser(false);
      }}
      style={styles.buttonPrimary}
    >
      Reset Password to Continue
    </button>
    <button
      type="button"
      onClick={() => {
        setIsLegacyUser(false);
        setLoginData({ email: '', password: '' });
      }}
      style={styles.goBackBtn}
    >
      <ArrowLeftIcon /> Use a Different Email
    </button>
  </div>
)}
```

### Task 6: Add Legacy User Box Styles

**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (styles object)

```javascript
legacyUserBox: {
  backgroundColor: '#FEF3C7', // Warm yellow background
  border: '1px solid #F59E0B',
  borderRadius: '12px',
  padding: '1.5rem',
  textAlign: 'center',
  marginBottom: '1rem'
},
legacyUserIcon: {
  fontSize: '2.5rem',
  marginBottom: '0.5rem'
},
legacyUserTitle: {
  fontSize: '1.25rem',
  fontWeight: '700',
  color: '#92400E',
  margin: '0 0 0.75rem 0'
},
legacyUserMessage: {
  fontSize: '0.9375rem',
  color: '#78350F',
  margin: '0 0 0.5rem 0',
  lineHeight: 1.5
},
legacyUserSubtext: {
  fontSize: '0.8125rem',
  color: '#A16207',
  margin: '0 0 1rem 0',
  lineHeight: 1.4
}
```

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `supabase/functions/auth-user/handlers/login.ts` | Add legacy user detection after auth failure | High |
| `supabase/functions/auth-user/handlers/resetPassword.ts` | Create auth.users for legacy users before reset | High |
| `supabase/functions/_shared/errors.ts` | Add LEGACY_USER_REQUIRES_MIGRATION code | Medium |
| `app/src/lib/auth.js` | Detect and return isLegacyUser flag | High |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Add legacy user UI state and messaging | High |

---

## Testing Checklist

### Unit Tests
- [ ] Legacy user detected when login fails but email exists in public.user
- [ ] Regular invalid credentials still return normal error
- [ ] Password reset creates auth.users for legacy user
- [ ] user_metadata correctly links to existing public.user._id

### Integration Tests
- [ ] End-to-end: Legacy user login → sees migration message → resets password → can login
- [ ] End-to-end: New user signup → immediate login works
- [ ] End-to-end: Existing auth.users login → works normally

### Manual Testing
- [ ] Use a known legacy user email (e.g., squartemont@gmail.com)
- [ ] Verify migration message appears with correct styling
- [ ] Verify reset password email is received
- [ ] Verify password reset link works
- [ ] Verify user can login after reset
- [ ] Verify user profile data is preserved

---

## Security Considerations

1. **Email Enumeration Prevention**: Error messages should not reveal whether an email exists
   - Solution: Use same message for legacy users and non-existent emails after password reset request

2. **Temporary Password**: Legacy user auth.users entries are created with random UUID passwords
   - User cannot login until they complete password reset
   - Password reset link is only valid for 24 hours

3. **user_metadata Linking**: Ensure migrated users have correct IDs linked
   - `user_id` → public.user._id
   - `host_account_id` → account_host._id
   - `guest_account_id` → account_guest._id

4. **Migration Flag**: Add `migrated_from_bubble: true` to identify migrated users
   - Useful for analytics and debugging

---

## Rollback Plan

If issues arise:
1. Revert Edge Function changes (login.ts, resetPassword.ts)
2. Revert frontend changes (auth.js, SignUpLoginModal.jsx)
3. Legacy users continue to see "Invalid credentials" (status quo)
4. No data loss as public.user records are never modified

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Legacy users successfully migrated | 100% of those who attempt login |
| Migration completion rate | >80% of users who see migration message |
| Support tickets for "can't login" | Decrease by 90% |
| Average migration time | <2 minutes (email → login) |

---

## Future Enhancements

1. **Bulk Migration Email Campaign**: Proactively email all 861 legacy users asking them to reset password
2. **Auto-Migration**: If Bubble password hashes are accessible, auto-migrate without user action
3. **Migration Dashboard**: Admin view showing migration progress and statistics

---

## Important Files Reference

### Edge Functions
- `supabase/functions/auth-user/index.ts` - Router (line 38-160)
- `supabase/functions/auth-user/handlers/login.ts` - Login handler (line 24-139)
- `supabase/functions/auth-user/handlers/resetPassword.ts` - Reset handler (line 23-81)
- `supabase/functions/_shared/errors.ts` - Error classes

### Frontend
- `app/src/lib/auth.js` - loginUser() function (line 423-549)
- `app/src/islands/shared/SignUpLoginModal.jsx` - Modal component (line 374-1202)

### Documentation
- `Documentation/Auth/LOGIN_FLOW.md` - Login flow docs
- `Documentation/Auth/SIGNUP_FLOW.md` - Signup flow docs

---

**DOCUMENT_VERSION**: 1.0
**AUTHOR**: Claude Code
**ESTIMATED_EFFORT**: 4-6 hours implementation + testing
