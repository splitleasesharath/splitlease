# User Table Junction Normalization Plan

**Created**: 2025-12-16 16:45:00
**Status**: PENDING REVIEW
**Type**: DATABASE NORMALIZATION

---

## Executive Summary

This plan outlines the conversion of embedded JSONB array fields in `public.user` to proper junction tables for many-to-many relationships. The analysis identified **16 fields** requiring junction tables, with **11 having valid target tables** and **5 missing reference tables** that need manual attention.

---

## Field Mapping Analysis

### Legend
| Status | Meaning |
|--------|---------|
| ✅ | Target table exists, ready for junction |
| ⚠️ | Target table missing, needs Bubble sync or manual creation |
| 🔄 | Already handled via foreign key in target table |

---

### Complete Field Mapping

| # | User Field (from request) | Actual Column Name | Data Type | Target Table | Status |
|---|---------------------------|-------------------|-----------|--------------|--------|
| 1 | About - Commonly Stored Items | `About - Commonly Stored Items` | jsonb | `zat_storages` | ⚠️ MISSING |
| 2 | Chat - Threads | `Chat - Threads` | jsonb | `thread` | ✅ EXISTS |
| 3 | Favorited Listings | `Favorited Listings` | jsonb | `listing` | ✅ EXISTS |
| 4 | filtered search results | `filtered search results` | jsonb | `listing` | ✅ EXISTS |
| 5 | ideal schedule (company suggested) | `ideal schedule (company suggested)` | jsonb | N/A (day values 1-7) | 🔄 ENUM VALUES |
| 6 | Leases | `Leases` | jsonb | `bookings_leases` | ✅ EXISTS |
| 7 | List of Visits | `List of Visits` | jsonb | `visit` | ✅ EXISTS |
| 8 | Message Forwarding Preference(list) | `Message Forwarding Preference(list)` | jsonb | N/A (enum values) | 🔄 ENUM VALUES |
| 9 | Preferred Hoods | `Preferred Hoods` | jsonb | `geo_hood` | ⚠️ MISSING |
| 10 | Proposal List | `Proposals List` | text[] | `proposal` | ✅ EXISTS |
| 11 | Reasons to Host me | `Reasons to Host me` | jsonb | `good_guest_reasons` | ⚠️ MISSING |
| 12 | Recent Days Selected | `Recent Days Selected` | jsonb | N/A (day values 1-7) | 🔄 ENUM VALUES |
| 13 | recent rental type search | `recent rental type search` | jsonb | `rental_types` | ⚠️ MISSING |
| 14 | Reservations | `Reservations` | jsonb | `bookings_leases` | ✅ EXISTS (same as Leases) |
| 15 | Reviews given (AS GUEST) | N/A - derived | N/A | `mainreview` | 🔄 FK EXISTS |
| 16 | Reviews received (AS GUEST) | N/A - derived | N/A | `mainreview` | 🔄 FK EXISTS |
| 17 | Users with permission to see sensitive info | `Users with permission to see sensitive info` | jsonb | `user` | ✅ EXISTS |

---

## Missing Reference Tables (Require Manual Action)

These Bubble Option Sets are referenced but NOT synced to Supabase:

### 1. `zat_storages` (Commonly Stored Items)
- **Bubble Source**: `reference_table: zat-storages`
- **Used By**: `user."About - Commonly Stored Items"`
- **Action Required**: Sync option set from Bubble OR create manually
- **Sample Values Needed**: What storage types exist? (e.g., "Furniture", "Boxes", "Seasonal Items")

### 2. `geo_hood` (Neighborhoods/Hoods)
- **Bubble Source**: `os-zat-geo-hood-medium-level`
- **Used By**: `user."Preferred Hoods"`, `listing."Location - Hoods (new)"`
- **Action Required**: Sync option set from Bubble OR create manually
- **Note**: This is likely a geographic hierarchy table

### 3. `good_guest_reasons` (Reasons to Host)
- **Bubble Source**: `os-zat-good-guest-reasons`
- **Used By**: `user."Reasons to Host me"`
- **Action Required**: Sync option set from Bubble OR create manually
- **Sample Values Needed**: What reasons exist? (e.g., "Clean", "Quiet", "Professional")

### 4. `rental_types` (Rental Type Categories)
- **Bubble Source**: `os-Rental-types`
- **Used By**: `user."recent rental type search"`
- **Action Required**: Sync option set from Bubble OR create manually
- **Sample Values Needed**: What rental types exist? (e.g., "Short-term", "Long-term", "Flexible")

### 5. `house_rules` (House Rules)
- **Bubble Source**: Option set for house rules
- **Used By**: `listing."Features - House Rules"`, `proposal."Proposal - House Rules Selected"`
- **Action Required**: Sync option set from Bubble OR create manually
- **Note**: Already identified in listing/proposal analysis

---

## Junction Tables to Create

### Priority 1: Core User Relationships (High Impact)

#### 1.1 `user_thread` - User's Chat Threads
```sql
CREATE TABLE public.user_thread (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    thread_id text NOT NULL REFERENCES public.thread("_id") ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, thread_id)
);

CREATE INDEX idx_user_thread_user ON public.user_thread(user_id);
CREATE INDEX idx_user_thread_thread ON public.user_thread(thread_id);
```

#### 1.2 `user_listing_favorite` - User's Favorited Listings
```sql
CREATE TABLE public.user_listing_favorite (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    listing_id text NOT NULL REFERENCES public.listing("_id") ON DELETE CASCADE,
    favorited_at timestamptz DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_user_listing_favorite_user ON public.user_listing_favorite(user_id);
CREATE INDEX idx_user_listing_favorite_listing ON public.user_listing_favorite(listing_id);
```

#### 1.3 `user_proposal` - User's Proposals
```sql
CREATE TABLE public.user_proposal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    proposal_id text NOT NULL REFERENCES public.proposal("_id") ON DELETE CASCADE,
    role text CHECK (role IN ('guest', 'host')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, proposal_id)
);

CREATE INDEX idx_user_proposal_user ON public.user_proposal(user_id);
CREATE INDEX idx_user_proposal_proposal ON public.user_proposal(proposal_id);
```

#### 1.4 `user_lease` - User's Leases/Reservations
```sql
CREATE TABLE public.user_lease (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    lease_id text NOT NULL REFERENCES public.bookings_leases("_id") ON DELETE CASCADE,
    role text CHECK (role IN ('guest', 'host', 'participant')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, lease_id, role)
);

CREATE INDEX idx_user_lease_user ON public.user_lease(user_id);
CREATE INDEX idx_user_lease_lease ON public.user_lease(lease_id);
```

#### 1.5 `user_visit` - User's Visits
```sql
CREATE TABLE public.user_visit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    visit_id text NOT NULL REFERENCES public.visit("_id") ON DELETE CASCADE,
    role text CHECK (role IN ('creator', 'guest')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, visit_id, role)
);

CREATE INDEX idx_user_visit_user ON public.user_visit(user_id);
CREATE INDEX idx_user_visit_visit ON public.user_visit(visit_id);
```

### Priority 2: Permission Relationships

#### 2.1 `user_permission` - Users with Sensitive Info Access
```sql
CREATE TABLE public.user_permission (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    grantee_user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    permission_type text DEFAULT 'sensitive_info',
    granted_at timestamptz DEFAULT now(),
    UNIQUE(grantor_user_id, grantee_user_id, permission_type)
);

CREATE INDEX idx_user_permission_grantor ON public.user_permission(grantor_user_id);
CREATE INDEX idx_user_permission_grantee ON public.user_permission(grantee_user_id);
```

### Priority 3: Preference/Reference Relationships (Pending Reference Tables)

#### 3.1 `user_preferred_hood` - Neighborhood Preferences
```sql
-- BLOCKED: Requires geo_hood table to be created first
CREATE TABLE public.user_preferred_hood (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    hood_id text NOT NULL, -- REFERENCES public.geo_hood("_id") when created
    preference_order int,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, hood_id)
);
```

#### 3.2 `user_storage_item` - Commonly Stored Items
```sql
-- BLOCKED: Requires zat_storages table to be created first
CREATE TABLE public.user_storage_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    storage_id text NOT NULL, -- REFERENCES public.zat_storages("_id") when created
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, storage_id)
);
```

#### 3.3 `user_guest_reason` - Reasons to Host
```sql
-- BLOCKED: Requires good_guest_reasons table to be created first
CREATE TABLE public.user_guest_reason (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    reason_id text NOT NULL, -- REFERENCES public.good_guest_reasons("_id") when created
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, reason_id)
);
```

### Priority 4: Search/Filter Relationships (Lower Priority)

#### 4.1 `user_filtered_listing` - Filtered Search Results
```sql
-- Note: This may be transient data, consider if junction is needed
CREATE TABLE public.user_filtered_listing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public."user"("_id") ON DELETE CASCADE,
    listing_id text NOT NULL REFERENCES public.listing("_id") ON DELETE CASCADE,
    filter_context text, -- What filter produced this result
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz, -- For cleanup of stale results
    UNIQUE(user_id, listing_id)
);
```

---

## Fields NOT Requiring Junction Tables

These fields store enum/value data, not foreign key references:

| Field | Reason | Recommendation |
|-------|--------|----------------|
| `ideal schedule (company suggested)` | Stores day values (1-7) | Keep as JSONB array of integers |
| `Recent Days Selected` | Stores day values (1-7) | Keep as JSONB array of integers |
| `Message Forwarding Preference(list)` | Stores enum values | Keep as JSONB or convert to text[] |

---

## Review Relationships (Already Handled)

The `mainreview` table already has proper foreign key columns:

| Review Field | mainreview Column | Relationship |
|--------------|-------------------|--------------|
| Reviews given (AS GUEST) | `Reviewer` | mainreview.Reviewer → user._id |
| Reviews received (AS GUEST) | `Reviewee/Target` | mainreview."Reviewee/Target" → user._id |

**No junction table needed** - Query reviews using the existing FK columns:
```sql
-- Reviews given by user
SELECT * FROM mainreview WHERE "Reviewer" = 'user_id';

-- Reviews received by user
SELECT * FROM mainreview WHERE "Reviewee/Target" = 'user_id';
```

---

## Data Migration Strategy

### Phase 1: Create Junction Tables (No Data Loss)
1. Create all junction tables with foreign key constraints
2. Do NOT drop original JSONB columns yet

### Phase 2: Migrate Data
```sql
-- Example: Migrate user_thread data
INSERT INTO user_thread (user_id, thread_id)
SELECT
    u."_id" as user_id,
    jsonb_array_elements_text(u."Chat - Threads") as thread_id
FROM "user" u
WHERE u."Chat - Threads" IS NOT NULL
  AND jsonb_typeof(u."Chat - Threads") = 'array'
ON CONFLICT (user_id, thread_id) DO NOTHING;
```

### Phase 3: Verify Data Integrity
```sql
-- Verify migration completeness
SELECT
    (SELECT COUNT(*) FROM "user" WHERE "Chat - Threads" IS NOT NULL) as users_with_threads,
    (SELECT COUNT(DISTINCT user_id) FROM user_thread) as migrated_users,
    (SELECT COUNT(*) FROM user_thread) as total_junction_rows;
```

### Phase 4: Update Application Code
- Update queries to use junction tables
- Update Edge Functions to maintain junction tables

### Phase 5: Deprecate JSONB Columns (Future)
- Only after application fully migrated
- Keep columns nullable for rollback capability

---

## Action Items for User

### Immediate (Before Implementation)

1. **Provide Missing Reference Table Data**:
   - [ ] `zat_storages`: List of storage item types with IDs
   - [ ] `geo_hood`: List of neighborhoods with IDs
   - [ ] `good_guest_reasons`: List of "reasons to host" with IDs
   - [ ] `rental_types`: List of rental types with IDs

2. **Confirm Field Mappings**:
   - [ ] Is `Leases` the same relationship as `Reservations`?
   - [ ] Should `filtered search results` be persisted or is it transient?
   - [ ] Are there additional list fields not mentioned?

3. **Decide on Priority**:
   - [ ] Which junction tables are most critical for queries?
   - [ ] Any performance issues with current JSONB approach?

### Post-Implementation

4. **Edge Function Updates**:
   - [ ] Update any Edge Functions that write to these JSONB fields
   - [ ] Add junction table maintenance to Bubble sync

5. **RLS Policies**:
   - [ ] Define access policies for each junction table

---

## File References

| File | Purpose |
|------|---------|
| [DATABASE_SCHEMA_OVERVIEW.md](../../../DATABASE_SCHEMA_OVERVIEW.md) | Current schema documentation |
| [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) | Edge function patterns |
| [Documentation/Database/](../../../Documentation/Database/) | Database documentation |

---

## Appendix: Current JSONB Data Format

All list fields store Bubble.io IDs as JSON arrays:
```json
["1743793293505x519315459590621950", "1743202662454x900071645405928600"]
```

The IDs follow Bubble's format: `{timestamp}x{random}` (total ~32 characters)

---

## Next Steps

1. User reviews this plan and provides missing reference table data
2. Create missing reference tables (manual or Bubble sync)
3. Execute junction table creation (Priority 1 first)
4. Run data migration scripts
5. Update application queries
6. Verify and monitor

