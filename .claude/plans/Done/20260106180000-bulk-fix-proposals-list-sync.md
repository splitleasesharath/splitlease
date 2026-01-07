# Bulk Fix: Proposals List Synchronization

**Created**: 2026-01-06 18:00:00
**Status**: Planning
**Type**: Data Integrity Fix (CLEANUP)

---

## Problem Statement

The `user."Proposals List"` column (text array) is out of sync with the actual proposals in the `proposal` table. This denormalized field should contain all proposal IDs where the user is either:
- The **Guest** (`proposal."Guest" = user._id`)
- The **Host** (`proposal."Host User" = user._id`)

### Discrepancy Statistics

| Metric | Count |
|--------|-------|
| Total users | 946 |
| Users with matching counts | 886 (93.7%) |
| Users with mismatching counts | **60 (6.3%)** |
| Users where list has MORE than actual | 13 (orphaned references) |
| Users where list has LESS than actual | 47 (missing entries) |

### Root Causes

1. **Stale data**: New proposals created without updating the user's `Proposals List`
2. **Orphaned references**: Deleted proposals still referenced in the array
3. **No synchronization mechanism**: No triggers or constraints maintain consistency

---

## Solution Strategy

### Approach: Rebuild from Source of Truth

The `proposal` table is the **authoritative source**. We will:

1. **Query all proposals** grouped by user (both Guest and Host)
2. **Aggregate proposal IDs** into arrays per user
3. **Update each user's `Proposals List`** with the correct, complete array

### Why Not Incremental Fixes?

- Incremental fixes require identifying exactly which IDs to add/remove
- A full rebuild is simpler, atomic, and guarantees correctness
- One-time bulk operation with no ongoing complexity

---

## Implementation Plan

### Phase 1: Dry Run Analysis (READ-ONLY)

Execute analysis queries to understand the full scope before making changes.

```sql
-- Query 1: Get correct proposal lists for ALL users
WITH guest_proposals AS (
  SELECT
    "Guest" as user_id,
    array_agg("_id" ORDER BY "Created Date" DESC) as proposal_ids
  FROM proposal
  WHERE "Guest" IS NOT NULL
  GROUP BY "Guest"
),
host_proposals AS (
  SELECT
    "Host User" as user_id,
    array_agg("_id" ORDER BY "Created Date" DESC) as proposal_ids
  FROM proposal
  WHERE "Host User" IS NOT NULL
  GROUP BY "Host User"
),
combined AS (
  SELECT
    COALESCE(g.user_id, h.user_id) as user_id,
    COALESCE(g.proposal_ids, ARRAY[]::text[]) as guest_ids,
    COALESCE(h.proposal_ids, ARRAY[]::text[]) as host_ids
  FROM guest_proposals g
  FULL OUTER JOIN host_proposals h ON g.user_id = h.user_id
)
SELECT
  user_id,
  -- Combine and deduplicate (user could be guest AND host on same proposal theoretically)
  ARRAY(SELECT DISTINCT unnest(guest_ids || host_ids)) as correct_proposals_list,
  array_length(ARRAY(SELECT DISTINCT unnest(guest_ids || host_ids)), 1) as correct_count
FROM combined
ORDER BY correct_count DESC NULLS LAST;
```

```sql
-- Query 2: Compare current vs correct for all affected users
WITH correct_lists AS (
  -- (same CTE as above, produces user_id -> correct_proposals_list)
  WITH guest_proposals AS (
    SELECT "Guest" as user_id, array_agg("_id") as proposal_ids
    FROM proposal WHERE "Guest" IS NOT NULL GROUP BY "Guest"
  ),
  host_proposals AS (
    SELECT "Host User" as user_id, array_agg("_id") as proposal_ids
    FROM proposal WHERE "Host User" IS NOT NULL GROUP BY "Host User"
  )
  SELECT
    COALESCE(g.user_id, h.user_id) as user_id,
    ARRAY(SELECT DISTINCT unnest(
      COALESCE(g.proposal_ids, ARRAY[]::text[]) ||
      COALESCE(h.proposal_ids, ARRAY[]::text[])
    )) as correct_list
  FROM guest_proposals g
  FULL OUTER JOIN host_proposals h ON g.user_id = h.user_id
)
SELECT
  u._id,
  u."Name - Full",
  u.email,
  COALESCE(array_length(u."Proposals List", 1), 0) as current_count,
  COALESCE(array_length(c.correct_list, 1), 0) as correct_count,
  u."Proposals List" as current_list,
  c.correct_list
FROM "user" u
LEFT JOIN correct_lists c ON u._id = c.user_id
WHERE
  -- Only show mismatches
  COALESCE(array_length(u."Proposals List", 1), 0) != COALESCE(array_length(c.correct_list, 1), 0)
  OR u."Proposals List" IS DISTINCT FROM c.correct_list
ORDER BY ABS(
  COALESCE(array_length(c.correct_list, 1), 0) -
  COALESCE(array_length(u."Proposals List", 1), 0)
) DESC;
```

### Phase 2: Backup Current State

Before making changes, export current state for rollback capability.

```sql
-- Create backup of current Proposals List values
SELECT
  _id,
  "Name - Full",
  email,
  "Proposals List" as original_proposals_list,
  NOW() as backup_timestamp
FROM "user"
WHERE "Proposals List" IS NOT NULL
  AND array_length("Proposals List", 1) > 0;
```

### Phase 3: Execute Bulk Update

```sql
-- THE FIX: Update all users with correct Proposals List
WITH guest_proposals AS (
  SELECT
    "Guest" as user_id,
    array_agg("_id") as proposal_ids
  FROM proposal
  WHERE "Guest" IS NOT NULL
  GROUP BY "Guest"
),
host_proposals AS (
  SELECT
    "Host User" as user_id,
    array_agg("_id") as proposal_ids
  FROM proposal
  WHERE "Host User" IS NOT NULL
  GROUP BY "Host User"
),
correct_lists AS (
  SELECT
    COALESCE(g.user_id, h.user_id) as user_id,
    ARRAY(SELECT DISTINCT unnest(
      COALESCE(g.proposal_ids, ARRAY[]::text[]) ||
      COALESCE(h.proposal_ids, ARRAY[]::text[])
    )) as correct_list
  FROM guest_proposals g
  FULL OUTER JOIN host_proposals h ON g.user_id = h.user_id
)
UPDATE "user" u
SET "Proposals List" = COALESCE(c.correct_list, ARRAY[]::text[])
FROM correct_lists c
WHERE u._id = c.user_id
  AND (
    u."Proposals List" IS DISTINCT FROM c.correct_list
    OR u."Proposals List" IS NULL
  );
```

### Phase 4: Verification

```sql
-- Verify: Count of users with mismatched lists should be 0
WITH guest_proposals AS (
  SELECT "Guest" as user_id, array_agg("_id") as proposal_ids
  FROM proposal WHERE "Guest" IS NOT NULL GROUP BY "Guest"
),
host_proposals AS (
  SELECT "Host User" as user_id, array_agg("_id") as proposal_ids
  FROM proposal WHERE "Host User" IS NOT NULL GROUP BY "Host User"
),
correct_lists AS (
  SELECT
    COALESCE(g.user_id, h.user_id) as user_id,
    ARRAY(SELECT DISTINCT unnest(
      COALESCE(g.proposal_ids, ARRAY[]::text[]) ||
      COALESCE(h.proposal_ids, ARRAY[]::text[])
    )) as correct_list
  FROM guest_proposals g
  FULL OUTER JOIN host_proposals h ON g.user_id = h.user_id
)
SELECT COUNT(*) as remaining_mismatches
FROM "user" u
LEFT JOIN correct_lists c ON u._id = c.user_id
WHERE u."Proposals List" IS DISTINCT FROM COALESCE(c.correct_list, ARRAY[]::text[]);
-- Expected result: 0
```

---

## Execution Checklist

- [ ] **Step 1**: Run Phase 1 queries (dry run) to confirm scope
- [ ] **Step 2**: Export backup CSV of current `Proposals List` values
- [ ] **Step 3**: Execute bulk UPDATE statement
- [ ] **Step 4**: Run verification query (expect 0 mismatches)
- [ ] **Step 5**: Spot-check 3-5 previously affected users manually

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Accidental data loss | Backup query exports current state before changes |
| Incorrect update logic | Dry run queries validate logic before UPDATE |
| Performance impact | Single bulk UPDATE is faster than row-by-row; run during low-traffic |
| Application dependency | Verify no app logic depends on specific array ordering |

---

## Future Prevention

To prevent this drift from recurring, consider:

1. **Database Trigger**: Create a trigger on `proposal` INSERT/DELETE that updates the user's `Proposals List`
2. **Remove Denormalization**: Refactor app to query `proposal` table directly instead of relying on cached array
3. **Scheduled Sync Job**: Weekly cron to detect and fix drift automatically

---

## Referenced Files

| File | Relevance |
|------|-----------|
| `supabase/functions/proposal/` | Proposal CRUD - should update user's Proposals List on create |
| `app/src/lib/supabase.js` | Supabase client |

---

## Approval Required

This plan modifies production data in the `user` table.

**Estimated affected rows**: ~60 users (direct fixes) + potentially more with subtle discrepancies

**Ready for execution?** Awaiting user approval to proceed with Phase 1 (dry run).
