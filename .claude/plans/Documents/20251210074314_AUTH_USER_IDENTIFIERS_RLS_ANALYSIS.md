# Auth-User Edge Function: User Identifiers and RLS Analysis

**GENERATED**: 2025-12-10
**AUTHOR**: Claude (Analysis)
**STATUS**: Analysis Complete

---

## Executive Summary

The `auth-user` Edge Function **does provide user-level identifiers** suitable for RLS (Row Level Security) policies. However, the current implementation has a **dual-identity system** that requires careful consideration for RLS implementation.

---

## Identifiers Returned by auth-user

### 1. Login Response (`handlers/login.ts:110-123`)

| Identifier | Description | RLS Suitability |
|------------|-------------|-----------------|
| `user_id` | Bubble-style `_id` from `public.user` table | **PRIMARY** - Use for RLS |
| `supabase_user_id` | UUID from `auth.users` table | **SECONDARY** - Native Supabase auth |
| `host_account_id` | Reference to `account_host._id` | For host-specific RLS |
| `guest_account_id` | Reference to `account_guest._id` | For guest-specific RLS |
| `user_type` | "Host" or "Guest" | For role-based filtering |
| `access_token` | JWT from Supabase Auth | **Session validation** |

### 2. Signup Response (`handlers/signup.ts:340-349`)

Same structure as login, with all IDs generated via `generate_bubble_id()` RPC:
- `user_id` - Generated for `public.user._id`
- `host_account_id` - Generated for `account_host._id`
- `guest_account_id` - Generated for `account_guest._id`
- `supabase_user_id` - UUID from `auth.admin.createUser()`

### 3. Validate Response (`handlers/validate.ts:128-147`)

| Identifier | Source |
|------------|--------|
| `userId` | From `public.user._id` or Supabase Auth metadata |
| `supabaseUserId` | From `auth.users.id` (UUID) |
| `accountHostId` | From `public.user."Account - Host / Landlord"` |

---

## The Dual-Identity Challenge

### Two User ID Systems

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE AUTH (auth.users)                                       │
│ ├── id: UUID (e.g., "a1b2c3d4-e5f6-...")                        │
│ ├── email: "user@example.com"                                    │
│ └── user_metadata: {                                             │
│       user_id: "1734826...",        ← Bubble-style ID            │
│       host_account_id: "1734826...",                             │
│       guest_account_id: "1734826..."                             │
│     }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (References via metadata)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PUBLIC.USER TABLE                                                │
│ ├── _id: "1734826..." (Bubble-style, PRIMARY KEY)               │
│ ├── email: "user@example.com"                                    │
│ ├── "Account - Host / Landlord": "1734826..."                   │
│ └── "Account - Guest": "1734826..."                             │
└─────────────────────────────────────────────────────────────────┘
```

### Why Two Systems Exist

1. **Legacy Bubble Users**: Have Bubble-generated `_id` values (synced to Supabase)
2. **Native Supabase Users**: Have both:
   - Supabase Auth UUID (`auth.users.id`)
   - Generated Bubble-style `_id` (from `generate_bubble_id()`)

---

## Current Frontend Storage Pattern

From `app/src/lib/secureStorage.js` and `app/src/lib/auth.js`:

```javascript
// Secure Storage Keys
SESSION_ID: '__sl_sid__'    // Stores user_id (Bubble-style _id)
AUTH_TOKEN: '__sl_at__'     // Stores access_token (JWT)

// Public State Keys
USER_ID: 'sl_user_id'       // Non-sensitive user_id reference
USER_TYPE: 'sl_user_type'   // "Host" or "Guest"

// Also stored
'splitlease_supabase_user_id'  // UUID for reference
```

The frontend **primarily uses `user_id`** (Bubble-style `_id`) for:
- Session identification
- URL parameters (e.g., `/account-profile/{user_id}`)
- Querying user-owned resources

---

## RLS Implementation Options

### Option A: Use Bubble-style `_id` (Recommended)

**Rationale**: All existing data relationships use Bubble-style IDs.

```sql
-- Example RLS Policy for proposals table
CREATE POLICY "Users can view their own proposals"
ON proposal
FOR SELECT
USING (
  -- Check if current user's _id matches the proposal's Guest field
  "Guest" IN (
    SELECT ag."_id"
    FROM account_guest ag
    JOIN public.user u ON u."Account - Guest" = ag."_id"
    WHERE u.email = auth.jwt() ->> 'email'
  )
);
```

**Challenges**:
- Requires joining through tables to get from JWT to Bubble `_id`
- More complex policy definitions

### Option B: Store Supabase UUID in user_metadata

**Approach**: Link `auth.users.id` to `public.user` via a new column.

```sql
-- Add supabase_auth_id column to user table
ALTER TABLE public.user
ADD COLUMN supabase_auth_id UUID REFERENCES auth.users(id);

-- Simpler RLS Policy
CREATE POLICY "Users can view their own data"
ON public.user
FOR SELECT
USING (supabase_auth_id = auth.uid());
```

**Benefits**:
- Direct relationship between auth and data
- Simpler RLS policies using `auth.uid()`

### Option C: Use Email as Bridge (Current Hybrid)

The validate handler already does this:
```typescript
// handlers/validate.ts:86-90
const { data: userByEmail } = await supabase
  .from('user')
  .select('_id, ...')
  .eq('email', authUser.email)
  .maybeSingle();
```

**RLS Policy**:
```sql
CREATE POLICY "Users can view their own profile"
ON public.user
FOR SELECT
USING (email = auth.jwt() ->> 'email');
```

---

## Current Identifiers Available for RLS

| Identifier | Available From | RLS Function |
|------------|---------------|--------------|
| Email | `auth.jwt() ->> 'email'` | Direct matching |
| Supabase UUID | `auth.uid()` | Direct if column exists |
| Bubble `_id` | Via email/metadata lookup | Indirect via join |
| User Type | `auth.jwt() -> 'user_metadata' ->> 'user_type'` | Role-based filtering |

---

## Recommendation

### Short-Term: Use Email-Based RLS

Email is unique and already linked between `auth.users` and `public.user`:

```sql
-- Enable RLS on tables
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "user_own_data"
ON public.user
FOR ALL
USING (email = auth.jwt() ->> 'email');
```

### Long-Term: Add `supabase_auth_id` Column

1. Add `supabase_auth_id` column to `public.user`
2. Backfill for existing users
3. Update signup handler to populate it
4. Use `auth.uid()` for cleaner RLS policies

---

## Files Analyzed

| File | Purpose | Line References |
|------|---------|-----------------|
| `supabase/functions/auth-user/index.ts` | Router for auth actions | 1-161 |
| `supabase/functions/auth-user/handlers/login.ts` | Login via Supabase Auth | 110-123 (return values) |
| `supabase/functions/auth-user/handlers/signup.ts` | Signup via Supabase Auth | 340-349 (return values) |
| `supabase/functions/auth-user/handlers/validate.ts` | Session validation | 128-147 (return values) |
| `app/src/lib/auth.js` | Frontend auth utilities | 500-560 (login handling) |
| `app/src/lib/secureStorage.js` | Token storage | 24-39 (storage keys) |

---

## Conclusion

**Yes**, the `auth-user` Edge Function provides identifiers suitable for RLS:

1. **`user_id`** (Bubble-style `_id`) - Primary identifier for data relationships
2. **`supabase_user_id`** (UUID) - Available but requires schema update for direct RLS
3. **Email** - Bridge between auth and data, usable for RLS today

The recommended approach is to use **email-based RLS policies** immediately, with a migration path to **UUID-based policies** via a new `supabase_auth_id` column.
