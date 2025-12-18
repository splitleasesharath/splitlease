# User Junction Tables - Comprehensive Implementation Plan

**Created**: 2025-12-16 17:00:00
**Status**: READY FOR IMPLEMENTATION
**Type**: DATABASE NORMALIZATION
**Target Schema**: `junctions`

---

## Executive Summary

This plan normalizes the `public.user` table by converting embedded JSONB array fields into proper junction tables within the `junctions` schema. All reference tables have been verified and are populated with data.

### Scope
- **10 junction tables** to create in `junctions` schema
- **4 reference tables** confirmed in `reference_table` schema
- **~1,700 junction records** to migrate from JSONB fields
- **No breaking changes** - original columns preserved during migration

---

## Current State Analysis

### Reference Tables (Verified & Populated)

| Schema | Table | Row Count | Primary Key | Key Column |
|--------|-------|-----------|-------------|------------|
| `reference_table` | `zat_storage` | 17 | `_id` (text) | `Name` |
| `reference_table` | `zat_geo_hood_mediumlevel` | 293 | `_id` (text) | `Display` |
| `reference_table` | `zat_goodguestreasons` | 12 | `_id` (text) | `name` |
| `reference_table` | `os_rental_type` | 3 | `id` (bigint) | `name`, `display` |

### User Table JSONB Field Usage

| User Field | Users with Data | JSONB Format | Reference Table |
|------------|-----------------|--------------|-----------------|
| `About - Commonly Stored Items` | 72 | Bubble IDs (text[]) | `zat_storage` |
| `Preferred Hoods` | 6 | Bubble IDs (text[]) | `zat_geo_hood_mediumlevel` |
| `Reasons to Host me` | 58 | Bubble IDs (text[]) | `zat_goodguestreasons` |
| `recent rental type search` | 2 | Display names (text[]) | `os_rental_type` |
| `Chat - Threads` | 340 | Bubble IDs (text[]) | `public.thread` |
| `Favorited Listings` | 127 | Bubble IDs (text[]) | `public.listing` |
| `Proposals List` | 920 | Bubble IDs (text[]) | `public.proposal` |
| `Leases` | 95 | Bubble IDs (text[]) | `public.bookings_leases` |
| `Users with permission...` | 80 | Bubble IDs (text[]) | `public.user` |

### JSONB Data Format Examples

**Bubble ID Arrays** (most fields):
```json
["1676043957679x806705915443127800", "1676564754867x112618724298301440"]
```

**Display Name Arrays** (`recent rental type search` only):
```json
["Monthly", "Weekly", "Nightly"]
```

### Fields NOT in User Table (Clarification)
- ❌ `List of Visits` - Column does not exist in user table
- ❌ `Reservations` - Same as `Leases` (use `Leases` junction)
- ❌ `filtered search results` - Transient data, junction not recommended

---

## Junction Table Definitions

### Schema Setup

```sql
-- Ensure junctions schema exists (already confirmed)
CREATE SCHEMA IF NOT EXISTS junctions;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA junctions TO authenticated;
GRANT USAGE ON SCHEMA junctions TO service_role;
```

---

### 1. `junctions.user_storage_item`
**Purpose**: Links users to their commonly stored items
**Source Field**: `user."About - Commonly Stored Items"`
**Reference**: `reference_table.zat_storage`

```sql
CREATE TABLE junctions.user_storage_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    storage_id text NOT NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_storage_item_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_storage_item_storage
        FOREIGN KEY (storage_id) REFERENCES reference_table.zat_storage("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_storage_item UNIQUE (user_id, storage_id)
);

CREATE INDEX idx_user_storage_item_user ON junctions.user_storage_item(user_id);
CREATE INDEX idx_user_storage_item_storage ON junctions.user_storage_item(storage_id);

COMMENT ON TABLE junctions.user_storage_item IS 'Junction: User commonly stored items from "About - Commonly Stored Items"';
```

---

### 2. `junctions.user_preferred_hood`
**Purpose**: Links users to their preferred neighborhoods
**Source Field**: `user."Preferred Hoods"`
**Reference**: `reference_table.zat_geo_hood_mediumlevel`

```sql
CREATE TABLE junctions.user_preferred_hood (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    hood_id text NOT NULL,
    preference_order int,  -- Optional: track order of preference
    created_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_preferred_hood_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_preferred_hood_hood
        FOREIGN KEY (hood_id) REFERENCES reference_table.zat_geo_hood_mediumlevel("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_preferred_hood UNIQUE (user_id, hood_id)
);

CREATE INDEX idx_user_preferred_hood_user ON junctions.user_preferred_hood(user_id);
CREATE INDEX idx_user_preferred_hood_hood ON junctions.user_preferred_hood(hood_id);

COMMENT ON TABLE junctions.user_preferred_hood IS 'Junction: User preferred neighborhoods from "Preferred Hoods"';
```

---

### 3. `junctions.user_guest_reason`
**Purpose**: Links users to their "reasons to host me"
**Source Field**: `user."Reasons to Host me"`
**Reference**: `reference_table.zat_goodguestreasons`

```sql
CREATE TABLE junctions.user_guest_reason (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    reason_id text NOT NULL,
    created_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_guest_reason_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_guest_reason_reason
        FOREIGN KEY (reason_id) REFERENCES reference_table.zat_goodguestreasons("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_guest_reason UNIQUE (user_id, reason_id)
);

CREATE INDEX idx_user_guest_reason_user ON junctions.user_guest_reason(user_id);
CREATE INDEX idx_user_guest_reason_reason ON junctions.user_guest_reason(reason_id);

COMMENT ON TABLE junctions.user_guest_reason IS 'Junction: User good guest reasons from "Reasons to Host me"';
```

---

### 4. `junctions.user_rental_type_search`
**Purpose**: Links users to their recent rental type searches
**Source Field**: `user."recent rental type search"`
**Reference**: `reference_table.os_rental_type`

**⚠️ Special Handling**: JSONB stores display names (`"Monthly"`), not IDs. Must map via `display` column.

```sql
CREATE TABLE junctions.user_rental_type_search (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    rental_type_id bigint NOT NULL,  -- References os_rental_type.id (bigint)
    searched_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_rental_type_search_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_rental_type_search_type
        FOREIGN KEY (rental_type_id) REFERENCES reference_table.os_rental_type(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_rental_type_search UNIQUE (user_id, rental_type_id)
);

CREATE INDEX idx_user_rental_type_search_user ON junctions.user_rental_type_search(user_id);
CREATE INDEX idx_user_rental_type_search_type ON junctions.user_rental_type_search(rental_type_id);

COMMENT ON TABLE junctions.user_rental_type_search IS 'Junction: User recent rental type searches from "recent rental type search"';
```

---

### 5. `junctions.user_thread`
**Purpose**: Links users to their chat threads
**Source Field**: `user."Chat - Threads"`
**Reference**: `public.thread`

```sql
CREATE TABLE junctions.user_thread (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    thread_id text NOT NULL,
    role text CHECK (role IN ('participant', 'host', 'guest')),
    joined_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_thread_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_thread_thread
        FOREIGN KEY (thread_id) REFERENCES public.thread("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_thread UNIQUE (user_id, thread_id)
);

CREATE INDEX idx_user_thread_user ON junctions.user_thread(user_id);
CREATE INDEX idx_user_thread_thread ON junctions.user_thread(thread_id);

COMMENT ON TABLE junctions.user_thread IS 'Junction: User chat threads from "Chat - Threads"';
```

---

### 6. `junctions.user_listing_favorite`
**Purpose**: Links users to their favorited listings
**Source Field**: `user."Favorited Listings"`
**Reference**: `public.listing`

```sql
CREATE TABLE junctions.user_listing_favorite (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    listing_id text NOT NULL,
    favorited_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_listing_favorite_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_listing_favorite_listing
        FOREIGN KEY (listing_id) REFERENCES public.listing("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_listing_favorite UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_user_listing_favorite_user ON junctions.user_listing_favorite(user_id);
CREATE INDEX idx_user_listing_favorite_listing ON junctions.user_listing_favorite(listing_id);

COMMENT ON TABLE junctions.user_listing_favorite IS 'Junction: User favorited listings from "Favorited Listings"';
```

---

### 7. `junctions.user_proposal`
**Purpose**: Links users to their proposals
**Source Field**: `user."Proposals List"`
**Reference**: `public.proposal`

```sql
CREATE TABLE junctions.user_proposal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    proposal_id text NOT NULL,
    role text CHECK (role IN ('guest', 'host')),
    created_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_proposal_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_proposal_proposal
        FOREIGN KEY (proposal_id) REFERENCES public.proposal("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_proposal UNIQUE (user_id, proposal_id)
);

CREATE INDEX idx_user_proposal_user ON junctions.user_proposal(user_id);
CREATE INDEX idx_user_proposal_proposal ON junctions.user_proposal(proposal_id);

COMMENT ON TABLE junctions.user_proposal IS 'Junction: User proposals from "Proposals List"';
```

---

### 8. `junctions.user_lease`
**Purpose**: Links users to their leases/reservations
**Source Field**: `user."Leases"` (also covers "Reservations")
**Reference**: `public.bookings_leases`

```sql
CREATE TABLE junctions.user_lease (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    lease_id text NOT NULL,
    role text CHECK (role IN ('guest', 'host', 'participant')),
    created_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_lease_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_lease_lease
        FOREIGN KEY (lease_id) REFERENCES public.bookings_leases("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_lease_role UNIQUE (user_id, lease_id, role)
);

CREATE INDEX idx_user_lease_user ON junctions.user_lease(user_id);
CREATE INDEX idx_user_lease_lease ON junctions.user_lease(lease_id);

COMMENT ON TABLE junctions.user_lease IS 'Junction: User leases/reservations from "Leases"';
```

---

### 9. `junctions.user_permission`
**Purpose**: Links users who have permission to see another user's sensitive info
**Source Field**: `user."Users with permission to see sensitive info"`
**Reference**: `public.user` (self-referencing)

```sql
CREATE TABLE junctions.user_permission (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_user_id text NOT NULL,  -- User who granted permission
    grantee_user_id text NOT NULL,  -- User who received permission
    permission_type text DEFAULT 'sensitive_info',
    granted_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user_permission_grantor
        FOREIGN KEY (grantor_user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT fk_user_permission_grantee
        FOREIGN KEY (grantee_user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT uq_user_permission UNIQUE (grantor_user_id, grantee_user_id, permission_type),
    CONSTRAINT chk_no_self_permission CHECK (grantor_user_id != grantee_user_id)
);

CREATE INDEX idx_user_permission_grantor ON junctions.user_permission(grantor_user_id);
CREATE INDEX idx_user_permission_grantee ON junctions.user_permission(grantee_user_id);

COMMENT ON TABLE junctions.user_permission IS 'Junction: User permissions from "Users with permission to see sensitive info"';
```

---

### 10. `junctions.thread_participant` (Bonus)
**Purpose**: Normalize the thread.Participants JSONB field
**Source Field**: `thread."Participants"`
**Reference**: `public.user`

```sql
CREATE TABLE junctions.thread_participant (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id text NOT NULL,
    user_id text NOT NULL,
    role text CHECK (role IN ('host', 'guest', 'participant')),
    joined_at timestamptz DEFAULT now(),

    CONSTRAINT fk_thread_participant_thread
        FOREIGN KEY (thread_id) REFERENCES public.thread("_id") ON DELETE CASCADE,
    CONSTRAINT fk_thread_participant_user
        FOREIGN KEY (user_id) REFERENCES public."user"("_id") ON DELETE CASCADE,
    CONSTRAINT uq_thread_participant UNIQUE (thread_id, user_id)
);

CREATE INDEX idx_thread_participant_thread ON junctions.thread_participant(thread_id);
CREATE INDEX idx_thread_participant_user ON junctions.thread_participant(user_id);

COMMENT ON TABLE junctions.thread_participant IS 'Junction: Thread participants from thread."Participants"';
```

---

## Data Migration Scripts

### Migration Order (Respects Foreign Keys)

1. Reference table junctions first (no cross-dependencies)
2. Public table junctions second

---

### 1. Migrate `user_storage_item`

```sql
-- Migrate About - Commonly Stored Items
INSERT INTO junctions.user_storage_item (user_id, storage_id)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."About - Commonly Stored Items"::jsonb)) AS storage_id
FROM public."user" u
WHERE u."About - Commonly Stored Items" IS NOT NULL
  AND u."About - Commonly Stored Items" != ''
  AND u."About - Commonly Stored Items" != '[]'
ON CONFLICT (user_id, storage_id) DO NOTHING;
```

---

### 2. Migrate `user_preferred_hood`

```sql
-- Migrate Preferred Hoods
INSERT INTO junctions.user_preferred_hood (user_id, hood_id)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Preferred Hoods"::jsonb)) AS hood_id
FROM public."user" u
WHERE u."Preferred Hoods" IS NOT NULL
  AND u."Preferred Hoods" != ''
  AND u."Preferred Hoods" != '[]'
ON CONFLICT (user_id, hood_id) DO NOTHING;
```

---

### 3. Migrate `user_guest_reason`

```sql
-- Migrate Reasons to Host me
INSERT INTO junctions.user_guest_reason (user_id, reason_id)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Reasons to Host me"::jsonb)) AS reason_id
FROM public."user" u
WHERE u."Reasons to Host me" IS NOT NULL
  AND u."Reasons to Host me" != ''
  AND u."Reasons to Host me" != '[]'
ON CONFLICT (user_id, reason_id) DO NOTHING;
```

---

### 4. Migrate `user_rental_type_search` (Special: Name Mapping)

```sql
-- Migrate recent rental type search (maps display names to IDs)
INSERT INTO junctions.user_rental_type_search (user_id, rental_type_id)
SELECT
    u."_id" AS user_id,
    rt.id AS rental_type_id
FROM public."user" u
CROSS JOIN LATERAL jsonb_array_elements_text(u."recent rental type search"::jsonb) AS search_value
JOIN reference_table.os_rental_type rt
    ON LOWER(TRIM(BOTH '"' FROM search_value)) = LOWER(rt.display)
WHERE u."recent rental type search" IS NOT NULL
  AND u."recent rental type search" != ''
  AND u."recent rental type search" != '[]'
ON CONFLICT (user_id, rental_type_id) DO NOTHING;
```

---

### 5. Migrate `user_thread`

```sql
-- Migrate Chat - Threads
INSERT INTO junctions.user_thread (user_id, thread_id, role)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Chat - Threads"::jsonb)) AS thread_id,
    'participant' AS role
FROM public."user" u
WHERE u."Chat - Threads" IS NOT NULL
  AND u."Chat - Threads" != ''
  AND u."Chat - Threads" != '[]'
ON CONFLICT (user_id, thread_id) DO NOTHING;
```

---

### 6. Migrate `user_listing_favorite`

```sql
-- Migrate Favorited Listings
INSERT INTO junctions.user_listing_favorite (user_id, listing_id)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Favorited Listings"::jsonb)) AS listing_id
FROM public."user" u
WHERE u."Favorited Listings" IS NOT NULL
  AND u."Favorited Listings" != ''
  AND u."Favorited Listings" != '[]'
ON CONFLICT (user_id, listing_id) DO NOTHING;
```

---

### 7. Migrate `user_proposal`

```sql
-- Migrate Proposals List (handles both JSONB and text[] formats)
-- First, check the actual data type and migrate accordingly

-- For JSONB format:
INSERT INTO junctions.user_proposal (user_id, proposal_id, role)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Proposals List"::jsonb)) AS proposal_id,
    CASE
        WHEN p."Guest" = u."_id" THEN 'guest'
        WHEN p."Host - Account" = u."_id" THEN 'host'
        ELSE 'guest'  -- Default
    END AS role
FROM public."user" u
CROSS JOIN LATERAL jsonb_array_elements_text(u."Proposals List"::jsonb) AS prop_id
LEFT JOIN public.proposal p ON p."_id" = TRIM(BOTH '"' FROM prop_id)
WHERE u."Proposals List" IS NOT NULL
  AND u."Proposals List"::text != ''
  AND u."Proposals List"::text != '[]'
ON CONFLICT (user_id, proposal_id) DO NOTHING;
```

---

### 8. Migrate `user_lease`

```sql
-- Migrate Leases
INSERT INTO junctions.user_lease (user_id, lease_id, role)
SELECT
    u."_id" AS user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Leases"::jsonb)) AS lease_id,
    CASE
        WHEN bl."Guest" = u."_id" THEN 'guest'
        WHEN bl."Host" = u."_id" THEN 'host'
        ELSE 'participant'
    END AS role
FROM public."user" u
CROSS JOIN LATERAL jsonb_array_elements_text(u."Leases"::jsonb) AS lease_val
LEFT JOIN public.bookings_leases bl ON bl."_id" = TRIM(BOTH '"' FROM lease_val)
WHERE u."Leases" IS NOT NULL
  AND u."Leases" != ''
  AND u."Leases" != '[]'
ON CONFLICT (user_id, lease_id, role) DO NOTHING;
```

---

### 9. Migrate `user_permission`

```sql
-- Migrate Users with permission to see sensitive info
INSERT INTO junctions.user_permission (grantor_user_id, grantee_user_id, permission_type)
SELECT
    u."_id" AS grantor_user_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Users with permission to see sensitive info"::jsonb)) AS grantee_user_id,
    'sensitive_info' AS permission_type
FROM public."user" u
WHERE u."Users with permission to see sensitive info" IS NOT NULL
  AND u."Users with permission to see sensitive info" != ''
  AND u."Users with permission to see sensitive info" != '[]'
  -- Exclude self-references
  AND u."_id" != TRIM(BOTH '"' FROM jsonb_array_elements_text(u."Users with permission to see sensitive info"::jsonb))
ON CONFLICT (grantor_user_id, grantee_user_id, permission_type) DO NOTHING;
```

---

### 10. Migrate `thread_participant`

```sql
-- Migrate Thread Participants
INSERT INTO junctions.thread_participant (thread_id, user_id, role)
SELECT
    t."_id" AS thread_id,
    TRIM(BOTH '"' FROM jsonb_array_elements_text(t."Participants"::jsonb)) AS user_id,
    'participant' AS role
FROM public.thread t
WHERE t."Participants" IS NOT NULL
  AND t."Participants" != ''
  AND t."Participants" != '[]'
ON CONFLICT (thread_id, user_id) DO NOTHING;
```

---

## Verification Queries

### Row Count Verification

```sql
-- Compare JSONB array counts vs junction table counts
SELECT
    'user_storage_item' AS junction,
    (SELECT SUM(jsonb_array_length("About - Commonly Stored Items"::jsonb))
     FROM "user"
     WHERE "About - Commonly Stored Items" IS NOT NULL
       AND "About - Commonly Stored Items" != '[]') AS expected_rows,
    (SELECT COUNT(*) FROM junctions.user_storage_item) AS actual_rows

UNION ALL

SELECT
    'user_preferred_hood',
    (SELECT SUM(jsonb_array_length("Preferred Hoods"::jsonb))
     FROM "user"
     WHERE "Preferred Hoods" IS NOT NULL
       AND "Preferred Hoods" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_preferred_hood)

UNION ALL

SELECT
    'user_guest_reason',
    (SELECT SUM(jsonb_array_length("Reasons to Host me"::jsonb))
     FROM "user"
     WHERE "Reasons to Host me" IS NOT NULL
       AND "Reasons to Host me" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_guest_reason)

UNION ALL

SELECT
    'user_rental_type_search',
    (SELECT SUM(jsonb_array_length("recent rental type search"::jsonb))
     FROM "user"
     WHERE "recent rental type search" IS NOT NULL
       AND "recent rental type search" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_rental_type_search)

UNION ALL

SELECT
    'user_thread',
    (SELECT SUM(jsonb_array_length("Chat - Threads"::jsonb))
     FROM "user"
     WHERE "Chat - Threads" IS NOT NULL
       AND "Chat - Threads" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_thread)

UNION ALL

SELECT
    'user_listing_favorite',
    (SELECT SUM(jsonb_array_length("Favorited Listings"::jsonb))
     FROM "user"
     WHERE "Favorited Listings" IS NOT NULL
       AND "Favorited Listings" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_listing_favorite)

UNION ALL

SELECT
    'user_proposal',
    (SELECT SUM(jsonb_array_length("Proposals List"::jsonb))
     FROM "user"
     WHERE "Proposals List" IS NOT NULL
       AND "Proposals List"::text != '[]'),
    (SELECT COUNT(*) FROM junctions.user_proposal)

UNION ALL

SELECT
    'user_lease',
    (SELECT SUM(jsonb_array_length("Leases"::jsonb))
     FROM "user"
     WHERE "Leases" IS NOT NULL
       AND "Leases" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_lease)

UNION ALL

SELECT
    'user_permission',
    (SELECT SUM(jsonb_array_length("Users with permission to see sensitive info"::jsonb))
     FROM "user"
     WHERE "Users with permission to see sensitive info" IS NOT NULL
       AND "Users with permission to see sensitive info" != '[]'),
    (SELECT COUNT(*) FROM junctions.user_permission);
```

### Foreign Key Integrity Check

```sql
-- Check for orphaned references (IDs in junction not in reference table)
SELECT 'user_storage_item orphans' AS check_name, COUNT(*) AS orphan_count
FROM junctions.user_storage_item j
LEFT JOIN reference_table.zat_storage r ON j.storage_id = r."_id"
WHERE r."_id" IS NULL

UNION ALL

SELECT 'user_preferred_hood orphans', COUNT(*)
FROM junctions.user_preferred_hood j
LEFT JOIN reference_table.zat_geo_hood_mediumlevel r ON j.hood_id = r."_id"
WHERE r."_id" IS NULL

UNION ALL

SELECT 'user_guest_reason orphans', COUNT(*)
FROM junctions.user_guest_reason j
LEFT JOIN reference_table.zat_goodguestreasons r ON j.reason_id = r."_id"
WHERE r."_id" IS NULL

UNION ALL

SELECT 'user_thread orphans', COUNT(*)
FROM junctions.user_thread j
LEFT JOIN public.thread t ON j.thread_id = t."_id"
WHERE t."_id" IS NULL

UNION ALL

SELECT 'user_listing_favorite orphans', COUNT(*)
FROM junctions.user_listing_favorite j
LEFT JOIN public.listing l ON j.listing_id = l."_id"
WHERE l."_id" IS NULL

UNION ALL

SELECT 'user_proposal orphans', COUNT(*)
FROM junctions.user_proposal j
LEFT JOIN public.proposal p ON j.proposal_id = p."_id"
WHERE p."_id" IS NULL

UNION ALL

SELECT 'user_lease orphans', COUNT(*)
FROM junctions.user_lease j
LEFT JOIN public.bookings_leases b ON j.lease_id = b."_id"
WHERE b."_id" IS NULL;
```

---

## RLS Policies

### Standard Pattern for Junction Tables

```sql
-- Enable RLS on all junction tables
ALTER TABLE junctions.user_storage_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_preferred_hood ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_guest_reason ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_rental_type_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_listing_favorite ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_lease ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.user_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE junctions.thread_participant ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for Edge Functions)
CREATE POLICY "Service role full access" ON junctions.user_storage_item
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Repeat for each junction table...

-- User can see their own junction records
CREATE POLICY "Users see own storage items" ON junctions.user_storage_item
    FOR SELECT TO authenticated
    USING (user_id = (SELECT "_id" FROM public."user" WHERE auth_id = auth.uid()));

-- Repeat pattern for each junction table...
```

---

## Implementation Checklist

### Phase 1: Schema & Table Creation
- [ ] Verify `junctions` schema exists
- [ ] Create all 10 junction tables
- [ ] Create all indexes
- [ ] Add table comments

### Phase 2: Data Migration
- [ ] Run migration for `user_storage_item`
- [ ] Run migration for `user_preferred_hood`
- [ ] Run migration for `user_guest_reason`
- [ ] Run migration for `user_rental_type_search`
- [ ] Run migration for `user_thread`
- [ ] Run migration for `user_listing_favorite`
- [ ] Run migration for `user_proposal`
- [ ] Run migration for `user_lease`
- [ ] Run migration for `user_permission`
- [ ] Run migration for `thread_participant`

### Phase 3: Verification
- [ ] Run row count verification query
- [ ] Run foreign key integrity check
- [ ] Investigate and resolve any orphans

### Phase 4: RLS & Security
- [ ] Enable RLS on all junction tables
- [ ] Create service_role policies
- [ ] Create authenticated user policies

### Phase 5: Application Updates (Future)
- [ ] Update Edge Functions to write to junction tables
- [ ] Update frontend queries to use junction tables
- [ ] Monitor for issues

---

## File References

| File | Purpose |
|------|---------|
| [DATABASE_SCHEMA_OVERVIEW.md](../../../DATABASE_SCHEMA_OVERVIEW.md) | Current schema documentation |
| [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) | Edge function patterns |
| [app/src/lib/supabase.js](../../../app/src/lib/supabase.js) | Supabase client |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Junction tables to create | 10 |
| Reference tables used | 4 |
| Public tables referenced | 5 |
| Estimated junction records | ~1,700 |
| Users with JSONB data | ~920 (Proposals List is largest) |

---

**Plan Status**: ~~READY FOR IMPLEMENTATION~~ **IMPLEMENTED**
**Next Action**: ~~Execute Phase 1 (Schema & Table Creation)~~ Frontend read migration (Phase 5b)

---

## Implementation Changelog

### 2025-12-16 - Phase 1-4 Complete: Junction Tables & Dual-Write Implementation

#### Database Changes (via Supabase Migrations)

**Migrations Applied:**
1. `create_junctions_schema` - Created `junctions` schema with permissions
2. `create_user_storage_item_junction` - User commonly stored items
3. `create_user_preferred_hood_junction` - User preferred neighborhoods
4. `create_user_guest_reason_junction` - User good guest reasons
5. `create_user_rental_type_search_junction` - User rental type searches
6. `create_user_thread_junction` - User chat threads
7. `create_user_listing_favorite_junction` - User favorited listings
8. `create_user_proposal_junction` - User proposals (guest/host roles)
9. `create_user_lease_junction` - User leases (guest/host/participant roles)
10. `create_user_permission_junction` - User sensitive info permissions
11. `create_thread_participant_junction` - Thread participants
12. `enable_rls_junction_tables` - RLS policies for all junction tables

**Data Migrated:**
| Junction Table | Rows |
|----------------|------|
| thread_participant | 1,570 |
| user_thread | 1,518 |
| user_proposal | 1,262 |
| user_guest_reason | 204 |
| user_storage_item | 191 |
| user_lease | 162 |
| user_permission | 140 |
| user_listing_favorite | 46 |
| user_preferred_hood | 13 |
| user_rental_type_search | 6 |
| **TOTAL** | **5,112** |

#### Edge Function Changes (Dual-Write Pattern)

**New Shared Module:**
- `supabase/functions/_shared/junctionHelpers.ts` - Helper functions for junction table operations

**Updated Edge Functions:**

| File | Changes |
|------|---------|
| `supabase/functions/proposal/actions/create.ts` | Added dual-write to `user_proposal` (guest + host) and `user_listing_favorite` |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Added dual-write to `user_proposal` (host) |
| `supabase/functions/bubble-proxy/handlers/favorites.ts` | Added dual-write to `user_listing_favorite` (add/remove) |
| `supabase/functions/ai-parse-profile/index.ts` | Added dual-write to `user_listing_favorite`, `user_preferred_hood`, `user_storage_item` |
| `supabase/functions/bubble-proxy/handlers/parseProfile.ts` | Added dual-write to `user_listing_favorite`, `user_preferred_hood`, `user_storage_item` |

#### Files Modified

```
supabase/functions/_shared/junctionHelpers.ts (NEW)
supabase/functions/proposal/actions/create.ts
supabase/functions/listing/handlers/createMockupProposal.ts
supabase/functions/bubble-proxy/handlers/favorites.ts
supabase/functions/ai-parse-profile/index.ts
supabase/functions/bubble-proxy/handlers/parseProfile.ts
```

#### Verification Results

- **FK Integrity**: All 5,112 junction records have valid foreign key references
- **Orphan Count**: 0 (stale JSONB references were filtered during migration)
- **RLS Status**: All 10 junction tables have RLS enabled with service_role and authenticated policies

#### Pending Work (Phase 5b)

**Frontend READ Migration** - Update frontend queries to read from junction tables:

| File | Fields to Migrate |
|------|-------------------|
| `app/src/lib/proposals/userProposalQueries.js` | `Proposals List` |
| `app/src/lib/proposalDataFetcher.js` | `Proposals List` |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | `Favorited Listings`, `Proposals List` |
| `app/src/islands/pages/SearchPage.jsx` | `Favorited Listings`, `Proposals List` |
| `app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js` | `Favorited Listings`, `Proposals List` |
| `supabase/functions/bubble-proxy/handlers/getFavorites.ts` | `Favorited Listings` |
| `supabase/functions/auth-user/handlers/validate.ts` | `Proposals List` |

**Recommended Approach for Frontend Migration:**
1. Create SQL views or RPC functions that query junction tables
2. Update frontend queries to use new views/RPCs
3. Test thoroughly before removing JSONB reads
4. Eventually deprecate JSONB columns (Phase 6)

---

**Implementation Completed By**: Claude Code
**Date**: 2025-12-16
**Commit**: See git history for junction table implementation commits
