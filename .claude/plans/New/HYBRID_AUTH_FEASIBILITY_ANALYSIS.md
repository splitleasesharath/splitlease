# Hybrid Bubble + Supabase Auth Feasibility Analysis

**Date**: December 3, 2025
**Status**: Complete Investigation
**Recommendation**: Hybrid approach is feasible with phased migration strategy

---

## Executive Summary

Converting the existing "user" table to work with Supabase native auth while maintaining a hybrid approach with Bubble.io authentication is **technically feasible**. The recommended approach is a **rolling migration strategy** that maintains zero downtime by running both auth systems in parallel, gradually migrating users to Supabase Auth.

---

## Current State Analysis

### Existing User Table Structure (From Supabase)

The project currently stores Bubble-synced user data in the `public` schema with tables like:
- `account_guest` (652 rows) - Guest user data
- `account_host` (847 rows) - Host user data
- Reference tables for user metadata, listings, and relationships

**Key Finding**: No native Supabase `auth.users` table currently in use. All user authentication is delegated to Bubble.io.

### Current Authentication Flow

1. Frontend calls Bubble API endpoints via Edge Functions (bubble-auth-proxy, bubble-proxy)
2. Bubble manages all authentication logic (signup, login, password hashing, tokens)
3. User data is synced back to Supabase PostgreSQL tables
4. RLS policies control access based on foreign keys to Bubble user IDs (stored as text)

---

## Supabase Auth Architecture (Key Findings)

### auth.users Table Structure

Supabase provides a dedicated `auth` schema with the `auth.users` table containing:

**Required Fields**:
- `id` (UUID primary key) - User identifier
- `email` (varchar) - User email
- `encrypted_password` (varchar) - Bcrypt/Argon2 hashed passwords
- `email_confirmed_at` (timestamptz) - Email verification status
- `created_at`, `updated_at` (timestamptz) - Timestamps
- `role` (varchar) - Auth role
- `aud` (varchar) - Audience claim
- `is_super_admin`, `is_anonymous` (boolean) - Flags

**Metadata Fields**:
- `raw_user_meta_data` (JSONB) - User-editable metadata (name, avatar, etc.)
- `raw_app_meta_data` (JSONB) - App-managed metadata (roles, permissions, etc.)

**Session Management**:
- Multiple related tables: `auth.sessions`, `auth.refresh_tokens`, `auth.identities`, `auth.mfa_factors`
- Full session lifecycle management with tokens

### Key Architectural Differences

| Aspect | Bubble.io | Supabase Auth |
|--------|-----------|---------------|
| **Password Storage** | Managed by Bubble | PostgreSQL `auth.users.encrypted_password` |
| **User ID Format** | Text (Bubble's format) | UUID v4 |
| **Metadata** | Custom columns in `public` tables | `raw_user_meta_data` and `raw_app_meta_data` (JSONB) |
| **Session Management** | Bubble tokens | JWT-based with refresh tokens |
| **MFA Support** | Limited (via Bubble) | TOTP, WebAuthn, SMS |
| **Email Confirmation** | Bubble handles | Supabase manages via `email_confirmed_at` |
| **RLS Integration** | Via foreign keys | Native `auth.uid()` function in RLS policies |

---

## Migration Challenges Identified

### 1. **User ID Format Change** (CRITICAL)

**Challenge**: Bubble uses text-based user IDs; Supabase Auth uses UUID v4.

**Impact**:
- All foreign key relationships in `public` schema reference Bubble user IDs
- RLS policies currently use string comparisons
- Would require massive schema migration

**Solution**:
- During hybrid phase: Maintain mapping table (`bubble_id_to_supabase_id`)
- RLS policies can use `CASE` statements or a function to map IDs
- Eventually: Create new UUID-based user records, migrate data in batches

### 2. **Password Hash Incompatibility** (MEDIUM)

**Challenge**: Bubble uses proprietary hashing; need to preserve user passwords.

**Options**:
- ✅ Export password hashes from Bubble (if compatible with bcrypt/argon2)
- ✅ Require password reset on first Supabase login
- ✅ Implement fallback: Try Supabase Auth first, fall back to Bubble

**Recommended**: Fallback strategy during rolling migration

### 3. **Metadata Mapping** (LOW)

**Challenge**: User metadata spread across multiple tables.

**Current State**:
- Guest profiles: `account_guest` table
- Host profiles: `account_host` table
- Linked via Bubble user IDs

**Solution**:
- Map to `raw_user_meta_data` and `raw_app_meta_data` in `auth.users`
- Create triggers to sync between tables during migration phase
- Keep `public` tables for backward compatibility

### 4. **RLS Policy Rewrite** (MEDIUM)

**Challenge**: Current RLS uses string-based Bubble IDs; need to support UUID-based auth.uid().

**Current Pattern**:
```sql
WHERE user_id = '<bubble_id_string>'
```

**New Pattern**:
```sql
WHERE user_id = (auth.uid())::text  -- Maps Supabase UUID to string
-- OR uses a mapping function
```

**Solution**: Phased RLS updates using `CASE` logic to support both auth systems

---

## Recommended Hybrid Approach: Rolling Migration

### Phase 1: Parallel Systems (Weeks 1-4)

**Goals**: Run both auth systems simultaneously, zero downtime

**Implementation**:

1. **Create Identity Mapping Table**
   ```sql
   CREATE TABLE public.user_id_mapping (
     bubble_id TEXT PRIMARY KEY,
     supabase_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     migrated_at TIMESTAMPTZ
   );
   ```

2. **Create Auth Routing Function**
   ```sql
   CREATE FUNCTION get_current_user_id()
   RETURNS TEXT AS $$
   BEGIN
     -- Check if user is authenticated via Supabase
     IF auth.uid() IS NOT NULL THEN
       RETURN (SELECT bubble_id FROM public.user_id_mapping
               WHERE supabase_id = auth.uid());
     END IF;
     -- Fallback to session-based Bubble ID
     RETURN current_setting('app.bubble_user_id', true);
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

3. **Update RLS Policies**
   ```sql
   -- Example: Update existing policy to use mapping function
   ALTER POLICY "Users can update own profile" ON public.account_guest
   USING (get_current_user_id() = "User");
   ```

4. **New Signup Flow**
   ```
   User Signs Up
   ├─> Create auth.users record (Supabase)
   ├─> Extract email, metadata
   ├─> Create mapping entry
   ├─> Trigger: Create corresponding guest/host record in public schema
   └─> Issue Supabase JWT
   ```

5. **Existing User Login Flow**
   ```
   User Logs In
   ├─> Check Supabase Auth first
   │   └─> If found: Use Supabase session
   ├─> Fallback: Authenticate via Bubble
   │   └─> On success: Auto-create Supabase user + mapping
   └─> Return appropriate token
   ```

### Phase 2: Gradual Migration (Weeks 5-12)

**Goals**: Migrate active users to Supabase Auth

**Strategy**: Background job processes users in batches

1. **Identify Users for Migration**
   - Prioritize recently active users
   - Skip users that haven't logged in for >1 year
   - Check for password hash compatibility

2. **Batch Migration Script**
   ```typescript
   // Edge Function: Migrate user batch
   async function migrateUserBatch(batch_size = 100) {
     // Query Bubble for next batch of users
     // For each user:
     // 1. Create auth.users record (if password available)
     // 2. Create mapping entry
     // 3. Mark as migrated
     // 4. Send notification to user (optional)
   }
   ```

3. **User-Triggered Migration**
   - Add "Upgrade to new auth" button in settings
   - Users can opt-in to migrate immediately
   - Saves new Supabase password after verification

4. **Fallback for Inactive Users**
   - At end of phase 2, remaining users still use Bubble
   - Can maintain indefinitely or force migration with notice

### Phase 3: Cleanup & Decommission (Week 13+)

**Goals**: Remove Bubble dependency, complete migration

**Steps**:
1. Verify all active users migrated
2. Remove auth routing logic (use only Supabase)
3. Archive Bubble authentication tables
4. Update RLS policies to use native `auth.uid()`
5. Optionally delete `user_id_mapping` table

---

## Implementation Details: Key Mechanisms

### 1. Custom Access Token Hook

Supabase supports Custom Access Token Hooks to add custom claims to JWT.

**Use Case**: Add Bubble user ID to token for backward compatibility

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  bubble_id text;
BEGIN
  -- Fetch the bubble user ID for this Supabase user
  SELECT mapping.bubble_id INTO bubble_id
  FROM public.user_id_mapping mapping
  WHERE mapping.supabase_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Add bubble_id as custom claim if available
  IF bubble_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{bubble_id}', to_jsonb(bubble_id));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

### 2. Database Triggers for Sync

Automatically create auth entries when public profile records are updated.

```sql
CREATE OR REPLACE FUNCTION handle_account_guest_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metadata in auth.users if mapping exists
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{quick_message}',
    to_jsonb(NEW."Quick Message")
  )
  WHERE id = (
    SELECT supabase_id FROM public.user_id_mapping
    WHERE bubble_id = NEW."User"
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guest_profile_sync
AFTER UPDATE ON public.account_guest
FOR EACH ROW
EXECUTE FUNCTION handle_account_guest_sync();
```

### 3. Sync Edge Function

Periodic edge function to backfill missing mappings.

```typescript
// supabase/functions/sync-auth-mapping/index.ts
Deno.serve(async (req) => {
  // Find Supabase users without mappings
  const unmappedUsers = await supabase
    .from('auth_users')
    .select('id, email')
    .not('id', 'in',
      '(SELECT supabase_id FROM user_id_mapping)'
    );

  // Try to find corresponding Bubble users by email
  for (const user of unmappedUsers.data) {
    const bubbleUser = await supabase
      .from('account_guest')
      .select('User')
      .eq('Email', user.email)
      .single();

    if (bubbleUser.data) {
      // Create mapping
      await supabase
        .from('user_id_mapping')
        .insert({
          bubble_id: bubbleUser.data.User,
          supabase_id: user.id
        });
    }
  }

  return new Response('Sync complete', { status: 200 });
});
```

---

## RLS Policy Strategy During Hybrid Phase

### Approach: Polymorphic RLS Functions

Support both authentication methods in policies:

```sql
-- Helper function to check if user owns record
CREATE OR REPLACE FUNCTION can_access_user_data(target_user_id text)
RETURNS boolean AS $$
DECLARE
  current_user_id text;
BEGIN
  -- Get current user ID (supports both auth methods)
  current_user_id := get_current_user_id();

  RETURN current_user_id = target_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Applied in RLS policy
CREATE POLICY "Users can select own data" ON public.account_guest
  FOR SELECT
  TO authenticated
  USING (can_access_user_data("User"));
```

### Gradual RLS Update Plan

1. **Month 1**: Deploy polymorphic functions, update critical tables
2. **Months 2-3**: Migrate remaining tables to new patterns
3. **Month 4+**: Once all users migrated, simplify to native `auth.uid()` patterns

---

## Custom Claims & JWT Tokens

### Adding User Metadata to JWT

Supabase JWTs can include custom claims via hooks:

```json
{
  "iss": "https://project.supabase.co/auth/v1",
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "app_metadata": {
    "roles": ["guest", "host"],
    "bubble_id": "bubble-user-id"
  },
  "user_metadata": {
    "full_name": "John Doe",
    "avatar_url": "https://..."
  },
  "role": "authenticated"
}
```

### Key Points

- `app_metadata`: App-managed claims (roles, permissions) - cannot be changed by user
- `user_metadata`: User-modifiable claims (profile info)
- Both available in custom access token hook
- Both exposed in JWT claims
- Can be used in RLS policies via `auth.jwt()`

---

## Data Sync Strategy

### Option 1: Event-Driven (Recommended)

Triggers automatically sync data when records change.

**Pros**: Real-time consistency, no cron jobs needed
**Cons**: Adds trigger overhead

### Option 2: Periodic Batch Sync

Edge function runs on schedule (e.g., every 1 hour).

**Pros**: Reduces database load
**Cons**: Eventual consistency, potential gaps

### Option 3: Webhooks

Bubble webhooks notify Supabase of changes.

**Pros**: Bubble as source of truth
**Cons**: External dependency, network latency

### Recommended: Hybrid (Event + Periodic)

- Triggers for critical data (passwords, emails)
- Periodic batch job to catch missed updates
- Webhook fallback for edge cases

---

## Testing & Validation Strategy

### Phase 1 Testing (Parallel Systems)

```bash
# Test cases needed:
1. New user signup via Supabase Auth
   - Verify mapping created
   - Verify public profile record created
   - Verify RLS policies work

2. Existing user login via Bubble (fallback)
   - Verify user found in Bubble
   - Verify mapping created automatically
   - Verify JWT issued correctly

3. JWT verification
   - Verify custom claims present
   - Verify auth.uid() works in RLS
   - Verify backward compatibility
```

### Phase 2 Testing (Migration)

```bash
1. Batch migration
   - Verify password handling
   - Verify data consistency
   - Verify user can still login

2. User-triggered migration
   - Test reset password flow
   - Test email verification
   - Test MFA setup (if applicable)

3. Fallback scenarios
   - What if mapping creation fails?
   - What if user logs in from multiple devices?
   - What if Bubble API is down?
```

---

## Critical Success Factors

### 1. **Zero Downtime Requirement**
- Phased approach essential
- Run both auth systems in parallel
- No forced migration at cutover

### 2. **Data Integrity**
- Maintain user_id_mapping table religiously
- Regular audit of unmapped users
- Backup public schema before major changes

### 3. **User Experience**
- Silent migration where possible
- Clear messaging if user action needed
- Support team trained on both systems

### 4. **Fallback Strategy**
- Always allow Bubble login as fallback
- Auto-create Supabase records on demand
- Don't force password reset unless necessary

---

## Timeline Estimate

| Phase | Duration | Key Activities |
|-------|----------|-----------------|
| **Phase 1: Preparation** | 1 week | Design schema changes, write mapping table, plan RLS updates |
| **Phase 1: Deployment** | 1 week | Deploy new functions, update RLS, run initial mappings |
| **Phase 1: Testing** | 2 weeks | Test all scenarios, monitor for issues |
| **Phase 2: Migration** | 8 weeks | Migrate users in batches, fix issues |
| **Phase 3: Cleanup** | 2 weeks | Remove fallback logic, decommission Bubble auth |
| **Buffer** | 2 weeks | Account for issues, unforeseen complexity |
| **Total** | ~16 weeks | ~4 months to complete transition |

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Password hash incompatibility | Users locked out | Export hashes before migration, test subset first |
| RLS policy breaks | Data leakage or access denied | Extensive testing on staging environment |
| Mapping table corruption | Loss of auth path | Regular backups, audit scripts |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Performance degradation | Slow auth operations | Profile queries, optimize RLS functions |
| Dual-authentication confusion | User support burden | Clear documentation, test thoroughly |
| Data sync failures | Inconsistency | Monitoring, automated alerts |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Unused Edge Functions | Technical debt | Archive at end of migration |
| Bubble API deprecation | Dependency risk | Already planned for, acceptable |

---

## Files & Codebase References

### Affected Files

1. **Authentication Flow**
   - `/supabase/functions/bubble-auth-proxy/` - Will add Supabase fallback
   - `/supabase/functions/bubble-proxy/` - No changes needed

2. **Database Schema**
   - Need to create: `public.user_id_mapping` table
   - Need to create: `public.get_current_user_id()` function
   - Need to create: Custom access token hook function

3. **RLS Policies**
   - Update all policies in: `public.account_guest`, `public.account_host`, etc.
   - Add polymorphic access control function

4. **Frontend**
   - `/app/src/logic/` - Auth logic (minimal changes with wrapper)
   - Authentication pages - Show migration status

5. **Documentation**
   - Create: `docs/HYBRID_AUTH_IMPLEMENTATION.md` (detailed steps)
   - Create: `docs/AUTH_MIGRATION_RUNBOOK.md` (operational guide)
   - Update: `CLAUDE.md` with new patterns

### Supabase Resources

- `auth.users` table structure (in auth schema)
- Custom Access Token Hooks documentation
- RLS policy patterns
- JWT claims and metadata handling

### Key Dependencies

- Supabase client library (@supabase/supabase-js)
- pg_net extension (already available in Supabase)
- Deno runtime for Edge Functions

---

## Conclusion

Converting to hybrid Bubble + Supabase Auth is **feasible and recommended** as a phased migration. The rolling migration approach allows:

✅ **Zero downtime** - Both systems run in parallel
✅ **User choice** - Gradual opt-in migration
✅ **Data integrity** - Mapping table maintains consistency
✅ **Fallback safety** - Always can use Bubble auth
✅ **Clear path** - Eventually reach Supabase-only state

**Next Steps**:
1. Review this analysis with team
2. Create detailed implementation plan (Phase 1 focus)
3. Set up staging environment to test mapping approach
4. Begin Phase 1 development with 4-week timeline

---

**Document Version**: 1.0
**Last Updated**: December 3, 2025
**Status**: Ready for implementation planning
