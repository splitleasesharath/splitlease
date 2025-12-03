# Hybrid Auth: Supabase User Creation After Bubble Signup

**Created**: 2025-12-03
**Status**: DRAFT - Awaiting Approval
**Type**: Implementation Plan

---

## Overview

Extend the existing signup flow to create a Supabase Auth user after receiving a successful response from Bubble. This enables a hybrid authentication system where:
- Bubble remains the primary user registry (existing system)
- Supabase Auth provides a parallel authentication layer for future migration

---

## Current Architecture

### Signup Flow (As-Is)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Frontend (SignUpLoginModal.jsx)                                   │
│    Collects: email, password, firstName, lastName, userType,        │
│              birthDate, phoneNumber                                  │
│    ↓                                                                 │
│ 2. auth.js → signupUser()                                           │
│    Validates input → Calls Edge Function                            │
│    ↓                                                                 │
│ 3. bubble-auth-proxy/handlers/signup.ts                              │
│    Validates → Calls Bubble /wf/signup-user                         │
│    ↓                                                                 │
│ 4. Bubble.io                                                         │
│    Creates user → Returns {token, user_id, expires}                 │
│    ↓                                                                 │
│ 5. Edge Function                                                     │
│    Returns success response to frontend                             │
│    ↓                                                                 │
│ 6. Frontend                                                          │
│    Stores token + user_id → Updates UI state                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Role |
|------|------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | UI form, collects all fields |
| `app/src/lib/auth.js` | `signupUser()` - calls Edge Function |
| `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Edge Function handler |
| `supabase/functions/_shared/errors.ts` | Error utilities |
| `supabase/functions/_shared/validation.ts` | Input validation |

---

## Proposed Architecture

### Signup Flow (To-Be)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1-4. EXISTING FLOW (unchanged)                                       │
│      Frontend → auth.js → Edge Function → Bubble                    │
│      ↓                                                               │
│ 5. Edge Function (MODIFIED - signup.ts)                              │
│    After Bubble success:                                             │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ 5a. Create Supabase Auth user                               │  │
│    │     - supabase.auth.admin.createUser()                      │  │
│    │     - Use same email, password                              │  │
│    │     - Store firstName, lastName in user_metadata            │  │
│    │     - email_confirm: true (skip verification)               │  │
│    │                                                              │  │
│    │ 5b. Link Bubble user_id to Supabase user                    │  │
│    │     - Store bubble_user_id in user_metadata                 │  │
│    │     - Enables future mapping/migration                      │  │
│    └─────────────────────────────────────────────────────────────┘  │
│    ↓                                                                 │
│ 6. Return combined response                                          │
│    {token, user_id, expires, supabase_user_id}                      │
│    ↓                                                                 │
│ 7. Frontend (auth.js - MODIFIED)                                     │
│    Store both IDs for future use                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Edge Function (signup.ts)

**File**: `supabase/functions/bubble-auth-proxy/handlers/signup.ts`

**Changes**:
1. Import Supabase Admin client
2. After Bubble signup success, create Supabase Auth user
3. Handle Supabase user creation errors gracefully (don't fail entire signup)
4. Return additional `supabase_user_id` in response

**Code Changes**:

```typescript
// Add imports at top
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// After line 129 (after Bubble success, before return)
// Create Supabase Auth user
let supabaseUserId: string | null = null;

try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('[signup] Creating Supabase Auth user...');

  const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm since Bubble already validated
    user_metadata: {
      bubble_user_id: userId,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      birth_date: birthDate,
      phone_number: phoneNumber
    }
  });

  if (supabaseError) {
    console.error('[signup] Supabase user creation failed:', supabaseError.message);
    // Don't throw - Bubble signup succeeded, log and continue
  } else {
    supabaseUserId = supabaseUser.user?.id || null;
    console.log('[signup] ✅ Supabase Auth user created:', supabaseUserId);
  }
} catch (supabaseErr) {
  console.error('[signup] Supabase user creation error:', supabaseErr);
  // Non-fatal: Bubble signup succeeded
}

// Modify return to include supabase_user_id
return {
  token,
  user_id: userId,
  expires,
  supabase_user_id: supabaseUserId
};
```

### Step 2: Update Frontend auth.js (Optional Enhancement)

**File**: `app/src/lib/auth.js`

**Changes**: Store `supabase_user_id` in secure storage for future use

```javascript
// In signupUser() after line 607, add:
if (data.data.supabase_user_id) {
  // Store Supabase user ID for future hybrid auth
  localStorage.setItem('splitlease_supabase_user_id', data.data.supabase_user_id);
  console.log('   Supabase User ID:', data.data.supabase_user_id);
}
```

### Step 3: Handle Edge Cases

**Duplicate Email in Supabase**:
- If user already exists in Supabase Auth (from previous attempt), the `createUser` will fail
- Solution: Check if user exists first, or handle the error gracefully
- Code:

```typescript
// Before createUser, check if exists
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
const existingUser = existingUsers?.users?.find(u => u.email === email);

if (existingUser) {
  console.log('[signup] Supabase user already exists, linking...');
  supabaseUserId = existingUser.id;

  // Optionally update metadata to link Bubble ID
  await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
    user_metadata: {
      ...existingUser.user_metadata,
      bubble_user_id: userId
    }
  });
} else {
  // Create new user (existing code)
}
```

### Step 4: Verify Secrets Configuration

**Required Secrets** (should already exist):
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Required for admin operations

**Verification Command**:
```bash
# Check if secrets are configured in Supabase Dashboard
# Settings > Edge Functions > Secrets
```

---

## Data Mapping

### Bubble → Supabase Auth User Metadata

| Bubble Field | Supabase Metadata Key | Notes |
|--------------|----------------------|-------|
| `user_id` (response) | `bubble_user_id` | Links accounts |
| `firstName` | `first_name` | User's first name |
| `lastName` | `last_name` | User's last name |
| `userType` | `user_type` | "Host" or "Guest" |
| `birthDate` | `birth_date` | ISO date string |
| `phoneNumber` | `phone_number` | Phone number |

### Supabase Auth User Fields

| Field | Value | Notes |
|-------|-------|-------|
| `email` | Same as Bubble | Primary identifier |
| `password` | Same as Bubble | Hashed by Supabase |
| `email_confirm` | `true` | Skip verification (Bubble handles) |
| `user_metadata` | See above | Custom fields |

---

## Error Handling Strategy

### Principle: Bubble Success = Overall Success

The Supabase user creation is **non-blocking**. If it fails:
1. Log the error for debugging
2. Return success (Bubble signup worked)
3. User can still use the system (Bubble auth)
4. Supabase user can be created later via admin tools

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Supabase connection failed | Log, continue, return null supabase_user_id |
| Email already exists in Supabase | Find existing user, link Bubble ID, return existing ID |
| Invalid password (too short for Supabase) | Log, continue (Bubble has different requirements) |
| Service role key missing | Log error, continue with Bubble-only flow |

---

## Testing Plan

### Manual Testing

1. **Happy Path**:
   - Sign up with new email
   - Verify Bubble user created
   - Verify Supabase Auth user created
   - Check user_metadata contains all fields
   - Verify response includes `supabase_user_id`

2. **Duplicate Email**:
   - Sign up with email that exists in Supabase Auth
   - Verify graceful handling
   - Verify Bubble user still created

3. **Supabase Failure**:
   - Temporarily invalidate service role key
   - Verify Bubble signup still succeeds
   - Verify response has null `supabase_user_id`

### Verification Queries

```sql
-- Check Supabase Auth users
SELECT id, email, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check for linked Bubble IDs
SELECT id, email, raw_user_meta_data->>'bubble_user_id' as bubble_id
FROM auth.users
WHERE raw_user_meta_data->>'bubble_user_id' IS NOT NULL;
```

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Comment out Supabase creation code in signup.ts
2. **Deploy**: Redeploy Edge Function
3. **Cleanup**: Optionally remove orphaned Supabase Auth users

No database migrations are required, making rollback simple.

---

## Future Considerations

### Phase 2: Supabase-First Auth
Once Supabase users are being created:
1. Add Supabase login option alongside Bubble
2. Gradually migrate validation to Supabase
3. Eventually deprecate Bubble auth

### Phase 3: Full Migration
1. Migrate existing Bubble users to Supabase Auth
2. Switch primary auth to Supabase
3. Keep Bubble for data sync only

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Add Supabase user creation logic |
| `app/src/lib/auth.js` | Store supabase_user_id (optional) |

---

## Security Considerations

1. **Service Role Key**: Only used server-side in Edge Function (never exposed to frontend)
2. **Password Handling**: Same password used for both systems (hashed separately)
3. **Email Confirmation**: Auto-confirmed since Bubble already validated the email
4. **User Metadata**: Contains only non-sensitive profile data

---

## Deployment Steps

1. Verify SUPABASE_SERVICE_ROLE_KEY is configured in Supabase Secrets
2. Update `signup.ts` with new code
3. Deploy Edge Function: `supabase functions deploy bubble-auth-proxy`
4. Test with new signup
5. Monitor logs for errors
6. (Optional) Update frontend to store supabase_user_id

---

## Summary

This plan adds Supabase Auth user creation as a **non-blocking** enhancement to the existing Bubble signup flow. Key design decisions:

- **Non-breaking**: Bubble remains primary, Supabase is additive
- **Graceful degradation**: Supabase failures don't break signup
- **Future-ready**: Enables gradual migration to Supabase Auth
- **Minimal changes**: Only 2 files modified

---

**Approval Required**: Please confirm this plan before implementation.
