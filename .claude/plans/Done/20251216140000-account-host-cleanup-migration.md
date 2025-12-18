# Account Host Cleanup Migration Plan

**Created**: 2025-12-16 14:00:00
**Status**: In Progress
**Purpose**: Migrate host references from legacy `account_host` IDs to direct `user._id` references, rename columns, and remove deprecated fields.

---

## Executive Summary

The `account_host` table is deprecated. All host-related data has been migrated to the `user` table. This plan completes the cleanup by:
1. Converting ~990 legacy host references to `user._id` format
2. Renaming host columns to `"Host User"` for clarity
3. Removing the deprecated `user."Account - Host / Landlord"` column
4. Updating all Edge Functions and Frontend code

---

## Current State Analysis

### Tables with Host/Landlord Columns

| Table | Column Name | Legacy Records | New Pattern | No Match | Total |
|-------|-------------|----------------|-------------|----------|-------|
| `listing` | `"Host / Landlord"` | 261 | 1 | 11 | 273 |
| `proposal` | `"Host - Account"` | 703 | 4 | 4 | 711 |
| `co_hostrequest` | `"Host - Landlord"` | 26 | 0 | 0 | 26 |

### Pattern Definitions

- **Legacy Pattern**: Value matches `user."Account - Host / Landlord"` (points to old account_host._id)
- **New Pattern**: Value matches `user._id` directly
- **No Match**: Value doesn't match either pattern (orphaned/invalid data)

---

## Phase 1: Data Migration

### Step 1.1: Migrate `listing."Host / Landlord"` to `user._id`

```sql
-- Migrate listing."Host / Landlord" from legacy account_host IDs to user._id
UPDATE listing l
SET "Host / Landlord" = u._id,
    "Modified Date" = NOW()
FROM "user" u
WHERE l."Host / Landlord" = u."Account - Host / Landlord"
  AND l."Host / Landlord" IS NOT NULL
  AND u."Account - Host / Landlord" IS NOT NULL;
```

**Expected Impact**: ~261 records updated

### Step 1.2: Migrate `proposal."Host - Account"` to `user._id`

```sql
-- Migrate proposal."Host - Account" from legacy account_host IDs to user._id
UPDATE proposal p
SET "Host - Account" = u._id,
    "Modified Date" = NOW()
FROM "user" u
WHERE p."Host - Account" = u."Account - Host / Landlord"
  AND p."Host - Account" IS NOT NULL
  AND u."Account - Host / Landlord" IS NOT NULL;
```

**Expected Impact**: ~703 records updated

### Step 1.3: Migrate `co_hostrequest."Host - Landlord"` to `user._id`

```sql
-- Migrate co_hostrequest."Host - Landlord" from legacy account_host IDs to user._id
UPDATE co_hostrequest c
SET "Host - Landlord" = u._id
FROM "user" u
WHERE c."Host - Landlord" = u."Account - Host / Landlord"
  AND c."Host - Landlord" IS NOT NULL
  AND u."Account - Host / Landlord" IS NOT NULL;
```

**Expected Impact**: ~26 records updated

---

## Phase 2: Column Renames

### Step 2.1: Rename `listing."Host / Landlord"` to `"Host User"`

```sql
ALTER TABLE listing RENAME COLUMN "Host / Landlord" TO "Host User";
```

### Step 2.2: Rename `proposal."Host - Account"` to `"Host User"`

```sql
ALTER TABLE proposal RENAME COLUMN "Host - Account" TO "Host User";
```

### Step 2.3: Rename `co_hostrequest."Host - Landlord"` to `"Host User"`

```sql
ALTER TABLE co_hostrequest RENAME COLUMN "Host - Landlord" TO "Host User";
```

---

## Phase 3: Column Deletion

### Step 3.1: Delete `user."Account - Host / Landlord"`

```sql
ALTER TABLE "user" DROP COLUMN IF EXISTS "Account - Host / Landlord";
```

**Warning**: This is irreversible. Ensure all migrations in Phase 1 are verified before executing.

---

## Phase 4: Code Updates

### Edge Functions to Update

| Function | File | Changes Needed |
|----------|------|----------------|
| `auth-user` | `supabase/functions/auth-user/handlers/signup.ts` | Update column name references |
| `listing` | `supabase/functions/listing/handlers/create.ts` | Change `"Host / Landlord"` → `"Host User"` |
| `listing` | `supabase/functions/listing/handlers/get.ts` | Change `"Host / Landlord"` → `"Host User"` |
| `listing` | `supabase/functions/listing/handlers/update.ts` | Change `"Host / Landlord"` → `"Host User"` |
| `listing` | `supabase/functions/listing/handlers/createMockupProposal.ts` | Change column name, remove legacy pattern support |
| `proposal` | `supabase/functions/proposal/actions/create.ts` | Change `"Host - Account"` → `"Host User"` |
| `proposal` | `supabase/functions/proposal/actions/get.ts` | Change `"Host - Account"` → `"Host User"` |
| `proposal` | `supabase/functions/proposal/actions/update.ts` | Change `"Host - Account"` → `"Host User"` |
| `virtual-meeting` | `supabase/functions/virtual-meeting/handlers/create.ts` | Change `"Host - Account"` → `"Host User"`, remove dual pattern |

### Frontend Files to Update

| File | Changes Needed |
|------|----------------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Update column references |
| `app/src/islands/pages/HostOverviewPageV2/useHostOverviewPageV2Logic.js` | Update column references |
| `app/src/islands/pages/SelfListingPageV2/useSelfListingPageV2Logic.js` | Update column references |

### RPC Functions to Update

| Function | Changes Needed |
|----------|----------------|
| `get_host_listings` | Change `"Host / Landlord"` → `"Host User"` |

---

## Phase 5: Cleanup (Post-Migration)

### Step 5.1: Delete `account_host` Table

```sql
DROP TABLE IF EXISTS account_host;
```

**Note**: Only execute after verifying all code updates are deployed and working.

---

## Rollback Plan

### If Phase 1 (Data Migration) fails:
- No structural changes made
- Data can be restored from backup if needed

### If Phase 2 (Column Renames) fails:
- Rename columns back to original names
- Update code to use original column names

### If Phase 3 (Column Deletion) fails:
- Cannot be rolled back
- Ensure Phase 1 verification is complete before proceeding

---

## Verification Queries

### Post-Phase 1 Verification

```sql
-- Verify listing migration (should return 0 legacy records)
SELECT COUNT(*) as legacy_count
FROM listing l
WHERE l."Host / Landlord" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user" u WHERE u._id = l."Host / Landlord"
  )
  AND EXISTS (
    SELECT 1 FROM "user" u WHERE u."Account - Host / Landlord" = l."Host / Landlord"
  );

-- Verify proposal migration (should return 0 legacy records)
SELECT COUNT(*) as legacy_count
FROM proposal p
WHERE p."Host - Account" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user" u WHERE u._id = p."Host - Account"
  )
  AND EXISTS (
    SELECT 1 FROM "user" u WHERE u."Account - Host / Landlord" = p."Host - Account"
  );

-- Verify co_hostrequest migration (should return 0 legacy records)
SELECT COUNT(*) as legacy_count
FROM co_hostrequest c
WHERE c."Host - Landlord" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "user" u WHERE u._id = c."Host - Landlord"
  )
  AND EXISTS (
    SELECT 1 FROM "user" u WHERE u."Account - Host / Landlord" = c."Host - Landlord"
  );
```

---

## Execution Order (CRITICAL)

1. ✅ **Backup**: Export current state (already done)
2. ⏳ **Phase 1**: Data Migration (convert legacy IDs to user._id)
3. ⏳ **Phase 1 Verification**: Run verification queries
4. ⏳ **Phase 2**: Column Renames
5. ⏳ **Phase 4**: Code Updates (Edge Functions + Frontend)
6. ⏳ **Deploy**: Deploy updated Edge Functions
7. ⏳ **Test**: Verify application functionality
8. ⏳ **Phase 3**: Column Deletion (user."Account - Host / Landlord")
9. ⏳ **Phase 5**: Delete account_host table

---

## Referenced Files

### Edge Functions
- [supabase/functions/auth-user/handlers/signup.ts](../../../supabase/functions/auth-user/handlers/signup.ts)
- [supabase/functions/listing/handlers/create.ts](../../../supabase/functions/listing/handlers/create.ts)
- [supabase/functions/listing/handlers/get.ts](../../../supabase/functions/listing/handlers/get.ts)
- [supabase/functions/listing/handlers/update.ts](../../../supabase/functions/listing/handlers/update.ts)
- [supabase/functions/listing/handlers/createMockupProposal.ts](../../../supabase/functions/listing/handlers/createMockupProposal.ts)
- [supabase/functions/proposal/actions/create.ts](../../../supabase/functions/proposal/actions/create.ts)
- [supabase/functions/proposal/actions/get.ts](../../../supabase/functions/proposal/actions/get.ts)
- [supabase/functions/proposal/actions/update.ts](../../../supabase/functions/proposal/actions/update.ts)
- [supabase/functions/virtual-meeting/handlers/create.ts](../../../supabase/functions/virtual-meeting/handlers/create.ts)

### Frontend Files
- [app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js](../../../app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js)
- [app/src/islands/pages/HostOverviewPageV2/useHostOverviewPageV2Logic.js](../../../app/src/islands/pages/HostOverviewPageV2/useHostOverviewPageV2Logic.js)
- [app/src/islands/pages/SelfListingPageV2/useSelfListingPageV2Logic.js](../../../app/src/islands/pages/SelfListingPageV2/useSelfListingPageV2Logic.js)

### Database Functions
- RPC: `get_host_listings`
