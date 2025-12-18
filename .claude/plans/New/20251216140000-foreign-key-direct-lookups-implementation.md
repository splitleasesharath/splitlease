# Foreign Key Direct Lookups Implementation Plan

**Created**: 2025-12-16
**Status**: Ready for Implementation
**Type**: CLEANUP / REFACTORING
**Complexity**: HIGH (Multi-file, multi-table changes)

---

## Executive Summary

This plan outlines the migration from **multi-step nested lookups** to **direct foreign key joins** across the `listing`, `user`, and `proposal` tables. The goal is to reduce database round trips from 8+ queries to 1-2 queries per data fetch operation.

---

## Current Foreign Key Relations (From Supabase)

### `listing` Table Foreign Keys

| Column | References | Schema |
|--------|------------|--------|
| `Cancellation Policy` | `zat_features_cancellationpolicy._id` | `reference_table` |
| `Features - Type of Space` | `zat_features_listingtype._id` | `reference_table` |
| `Features - Secure Storage Option` | `zat_features_storageoptions._id` | `reference_table` |
| `Features - Parking type` | `zat_features_parkingoptions._id` | `reference_table` |
| `Kitchen Type` | `os_kitchen_type.display` | `reference_table` |
| `Location - State` | `os_us_states.display` | `reference_table` |
| `Location - City` | `zat_location._id` | `reference_table` |
| `Location - Borough` | `zat_geo_borough_toplevel._id` | `reference_table` |
| `Location - Hood` | `zat_geo_hood_mediumlevel._id` | `reference_table` |
| `rental type` | `os_rental_type.display` | `reference_table` |
| `Host / Landlord` | `account_host._id` | `public` (TEXT FK, not enforced) |

### Tables Referencing `listing`

| Table | Column | Target |
|-------|--------|--------|
| `external_reviews` | `listing_id` | `listing._id` |
| `bookings_leases` | `Listing` | `listing._id` |
| `listing_photo` | `Listing` | `listing._id` (TEXT FK, not enforced) |
| `proposal` | `Listing` | `listing._id` (TEXT FK, not enforced) |

### `user` Table Relationships

| Relationship | Direction | Details |
|--------------|-----------|---------|
| `account_host.User` | → `user._id` | FK enforced |
| `ai_parsing_queue.user_id` | → `user._id` | FK enforced |
| `bookings_leases."Created By"` | → `user._id` | FK enforced |
| `notification_preferences.user_id` | → `user._id` | FK enforced |
| `user."Account - Host / Landlord"` | → `account_host._id` | TEXT FK (not enforced) |

### `proposal` Table Relationships

| Column | References | Type |
|--------|------------|------|
| `Listing` | `listing._id` | TEXT FK (not enforced) |
| `Guest` | `user._id` | TEXT FK (not enforced) |
| `Host - Account` | `account_host._id` | TEXT FK (not enforced) |
| `Created By` | `user._id` | TEXT FK (not enforced) |

### Tables Referencing `proposal`

| Table | Column | Target |
|-------|--------|--------|
| `bookings_leases` | `Proposal` | `proposal._id` |
| `virtualmeetingschedulesandlinks` | `proposal` | `proposal._id` |

---

## Current Multi-Step Query Patterns (Problems)

### 1. `userProposalQueries.js:fetchProposalsByIds` (8+ queries)

```
Current Flow:
1. Fetch proposals by IDs
2. Extract listing IDs → Fetch listings
3. Extract photo IDs → Fetch photos (or use embedded)
4. Extract borough/hood IDs → Fetch from reference_table
5. Extract house rule IDs → Fetch from reference_table
6. Extract host account IDs → Fetch users via "Account - Host / Landlord"
7. Extract guest IDs → Fetch users
8. Fetch virtual meetings by proposal IDs
9. Manual JOIN via JavaScript Maps
```

**Lines 81-490** in [userProposalQueries.js](../../../app/src/lib/proposals/userProposalQueries.js)

### 2. `listingDataFetcher.js:fetchListingComplete` (4+ queries)

```
Current Flow:
1. Fetch listing
2. Fetch photos from listing_photo table (if legacy format)
3. Resolve neighborhood/borough via cache (not DB query)
4. Fetch host user (filtered by "Account - Host / Landlord" = listing["Host / Landlord"])
5. Fetch reviews via .in() on JSONB array
```

**Lines 60-394** in [listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js)

### 3. `supabaseUtils.js:fetchHostData` (2-step query)

```
Current Flow:
1. Fetch account_host records by IDs
2. Extract User IDs from account_host
3. Fetch user records by User IDs
4. Create map keyed by account_host._id
```

**Lines 113-184** in [supabaseUtils.js](../../../app/src/lib/supabaseUtils.js)

### 4. `proposal/actions/get.ts` (4-step query)

```
Current Flow:
1. Fetch proposal
2. Fetch listing by proposal.Listing
3. Fetch guest by proposal.Guest
4. Fetch host: account_host by proposal["Host - Account"] → user by account_host.User
```

**Lines 42-153** in [proposal/actions/get.ts](../../../supabase/functions/proposal/actions/get.ts)

### 5. `proposal/actions/create.ts` (6 separate queries)

```
Current Flow:
1. Fetch listing by listingId
2. Fetch guest user by guestId
3. Fetch host account by listing["Host / Landlord"]
4. Fetch host user by hostAccount.User
5. Fetch rental application (optional)
6. Insert proposal + update guest + update host
```

**Lines 43-468** in [proposal/actions/create.ts](../../../supabase/functions/proposal/actions/create.ts)

---

## Implementation Plan by Table

### PHASE 1: Database Schema Updates (Migrations Required)

Before using Supabase's nested select syntax (`select('*, related_table(*)')`), we need actual foreign key constraints in PostgreSQL.

#### 1.1 Add FK Constraints for `proposal` Table

```sql
-- Migration: add_proposal_foreign_keys

-- proposal.Listing → listing._id
ALTER TABLE public.proposal
ADD CONSTRAINT fk_proposal_listing
FOREIGN KEY ("Listing") REFERENCES public.listing(_id)
ON DELETE SET NULL;

-- proposal.Guest → user._id
ALTER TABLE public.proposal
ADD CONSTRAINT fk_proposal_guest
FOREIGN KEY ("Guest") REFERENCES public."user"(_id)
ON DELETE SET NULL;

-- proposal."Host - Account" → account_host._id
ALTER TABLE public.proposal
ADD CONSTRAINT fk_proposal_host_account
FOREIGN KEY ("Host - Account") REFERENCES public.account_host(_id)
ON DELETE SET NULL;

-- proposal."Created By" → user._id
ALTER TABLE public.proposal
ADD CONSTRAINT fk_proposal_created_by
FOREIGN KEY ("Created By") REFERENCES public."user"(_id)
ON DELETE SET NULL;
```

#### 1.2 Add FK Constraints for `listing` Table

```sql
-- Migration: add_listing_foreign_keys

-- listing."Host / Landlord" → account_host._id
ALTER TABLE public.listing
ADD CONSTRAINT fk_listing_host
FOREIGN KEY ("Host / Landlord") REFERENCES public.account_host(_id)
ON DELETE SET NULL;
```

#### 1.3 Add FK Constraint for `user` Table

```sql
-- Migration: add_user_foreign_keys

-- user."Account - Host / Landlord" → account_host._id
ALTER TABLE public."user"
ADD CONSTRAINT fk_user_host_account
FOREIGN KEY ("Account - Host / Landlord") REFERENCES public.account_host(_id)
ON DELETE SET NULL;
```

#### 1.4 Add FK Constraint for `account_host` Table

```sql
-- Migration: add_account_host_foreign_keys

-- account_host.User → user._id (likely already exists, verify)
ALTER TABLE public.account_host
ADD CONSTRAINT fk_account_host_user
FOREIGN KEY ("User") REFERENCES public."user"(_id)
ON DELETE SET NULL;
```

---

### PHASE 2: Listing Table Updates

#### 2.1 Update `listingDataFetcher.js`

**Current** (Lines 274-296):
```javascript
// 8. Fetch host data - query user table directly via Account - Host / Landlord FK
let hostData = null;
if (listingData['Host / Landlord']) {
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('_id, "Name - First", "Name - Last", "Profile Photo", "email as text", "Account - Host / Landlord"')
    .filter('"Account - Host / Landlord"', 'eq', listingData['Host / Landlord'])
    .maybeSingle();
  // ...
}
```

**Target** (Direct FK join):
```javascript
// After FK constraints are added, use nested select:
const { data: listingData, error } = await supabase
  .from('listing')
  .select(`
    *,
    host:account_host!fk_listing_host(
      _id,
      user:user!fk_account_host_user(
        _id,
        "Name - First",
        "Name - Last",
        "Profile Photo",
        "email as text"
      )
    )
  `)
  .eq('_id', listingId)
  .single();
```

**Files to Update**:
- [app/src/lib/listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js) - Lines 60-394

---

### PHASE 3: Proposal Table Updates

#### 3.1 Update `userProposalQueries.js:fetchProposalsByIds`

**Current** (Lines 81-490): 8+ sequential queries with manual Map joins

**Target**: Single query with nested selects:

```javascript
const { data: proposals, error } = await supabase
  .from('proposal')
  .select(`
    *,
    listing:listing!fk_proposal_listing(
      _id,
      Name,
      Description,
      "Location - Address",
      "Location - slightly different address",
      "Location - Borough",
      "Location - Hood",
      "Features - Photos",
      "Features - House Rules",
      "NEW Date Check-in Time",
      "NEW Date Check-out Time",
      "Host / Landlord",
      "House manual",
      host:account_host!fk_listing_host(
        _id,
        user:user!fk_account_host_user(
          _id,
          "Name - First",
          "Name - Last",
          "Name - Full",
          "Profile Photo",
          "About Me / Bio",
          "Verify - Linked In ID",
          "Verify - Phone",
          "user verified?"
        )
      )
    ),
    guest:user!fk_proposal_guest(
      _id,
      "Name - First",
      "Name - Last",
      "Name - Full",
      "Profile Photo",
      "About Me / Bio",
      "Verify - Linked In ID",
      "Verify - Phone",
      "user verified?",
      "ID documents submitted?"
    )
  `)
  .in('_id', proposalIds)
  .order('"Created Date"', { ascending: false });
```

**Files to Update**:
- [app/src/lib/proposals/userProposalQueries.js](../../../app/src/lib/proposals/userProposalQueries.js) - Lines 81-490

#### 3.2 Update `proposal/actions/get.ts`

**Current** (Lines 86-123): 4 separate queries

**Target**: Single query with joins:

```typescript
const { data: proposal, error } = await supabase
  .from("proposal")
  .select(`
    *,
    listing:listing!fk_proposal_listing(_id, Name, "Location - Address"),
    guest:user!fk_proposal_guest(_id, "Name - Full", email),
    host_account:account_host!fk_proposal_host_account(
      _id,
      user:user!fk_account_host_user(_id, "Name - Full", email)
    )
  `)
  .eq("_id", input.proposal_id)
  .single();
```

**Files to Update**:
- [supabase/functions/proposal/actions/get.ts](../../../supabase/functions/proposal/actions/get.ts) - Lines 42-153

#### 3.3 Update `proposal/actions/create.ts`

**Current** (Lines 63-165): 6 separate queries

**Target**: Reduce to 2-3 queries using joins:

```typescript
// Fetch listing with host in one query
const { data: listing, error: listingError } = await supabase
  .from("listing")
  .select(`
    _id,
    "Host / Landlord",
    "rental type",
    "Features - House Rules",
    "💰Cleaning Cost / Maintenance Fee",
    "💰Damage Deposit",
    "Weeks offered",
    "Days Available (List of Days)",
    "Nights Available (List of Nights) ",
    "Location - Address",
    "Location - slightly different address",
    "💰Weekly Host Rate",
    "💰Nightly Host Rate for 2 nights",
    "💰Nightly Host Rate for 3 nights",
    "💰Nightly Host Rate for 4 nights",
    "💰Nightly Host Rate for 5 nights",
    "💰Nightly Host Rate for 7 nights",
    "💰Monthly Host Rate",
    host:account_host!fk_listing_host(
      _id,
      User,
      user:user!fk_account_host_user(_id, email, "Proposals List")
    )
  `)
  .eq("_id", input.listingId)
  .single();

// Fetch guest user separately (still needed)
const { data: guest, error: guestError } = await supabase
  .from("user")
  .select(`...`)
  .eq("_id", input.guestId)
  .single();
```

**Files to Update**:
- [supabase/functions/proposal/actions/create.ts](../../../supabase/functions/proposal/actions/create.ts) - Lines 43-468

---

### PHASE 4: User Table Updates

#### 4.1 Update `supabaseUtils.js:fetchHostData`

**Current** (Lines 113-184): 2-step query (account_host → user)

**Target**: Single query with join:

```javascript
export async function fetchHostData(hostIds) {
  if (!hostIds || hostIds.length === 0) {
    return {};
  }

  const { data: accountHosts, error } = await supabase
    .from('account_host')
    .select(`
      _id,
      user:user!fk_account_host_user(
        _id,
        "Name - Full",
        "Profile Photo"
      )
    `)
    .in('_id', hostIds);

  if (error) {
    console.error('Error fetching host data:', error);
    return {};
  }

  // Create host map keyed by account_host ID
  const hostMap = {};
  accountHosts.forEach(account => {
    if (account.user) {
      hostMap[account._id] = {
        name: account.user['Name - Full'] || null,
        image: account.user['Profile Photo'] || null,
        verified: false
      };
    }
  });

  return hostMap;
}
```

**Files to Update**:
- [app/src/lib/supabaseUtils.js](../../../app/src/lib/supabaseUtils.js) - Lines 113-184

---

### PHASE 5: Reference Table Lookups (Optional Optimization)

The reference table lookups for borough, neighborhood, amenities, etc. are currently handled by a **cached lookup system** in `dataLookups.js`. This is actually an efficient pattern since:

1. Reference data rarely changes
2. Caching avoids repeated queries
3. Cross-schema FK joins have performance implications

**Recommendation**: Keep the current caching approach for reference tables. Only use direct FK joins for `public` schema tables.

**Files (No Changes Needed)**:
- [app/src/lib/dataLookups.js](../../../app/src/lib/dataLookups.js)

---

## Items NOT Suitable for FK Joins

These patterns cannot be converted to FK joins and should remain as-is:

| Pattern | Reason | Location |
|---------|--------|----------|
| `Proposals List` (JSONB array of IDs) | Array-based, requires `.in()` queries | `user` table |
| `Favorited Listings` (JSONB array of IDs) | Array-based, requires `.in()` queries | `user` table |
| `Features - Photos` (embedded objects) | New format has objects, not FKs | `listing` table |
| `Reviews` (JSONB array of IDs) | Array-based, requires `.in()` queries | `listing` table |
| `House Rules` (JSONB array of IDs) | Reference table IDs, cached | `proposal` table |
| Virtual meetings | Separate table with `proposal` FK | Keep separate query |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Database Migrations (1-2 hours)                        │
│ ├─ 1.1 Add proposal FK constraints                              │
│ ├─ 1.2 Add listing FK constraints                               │
│ ├─ 1.3 Add user FK constraints                                  │
│ └─ 1.4 Verify account_host FK constraints                       │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 2: Test FK Joins in Isolation (1 hour)                    │
│ └─ Verify nested selects work with new constraints              │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 3: Update Edge Functions (2-3 hours)                      │
│ ├─ 3.1 proposal/actions/get.ts                                  │
│ └─ 3.2 proposal/actions/create.ts                               │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 4: Update Frontend Data Fetchers (3-4 hours)              │
│ ├─ 4.1 supabaseUtils.js:fetchHostData                           │
│ ├─ 4.2 listingDataFetcher.js:fetchListingComplete               │
│ └─ 4.3 userProposalQueries.js:fetchProposalsByIds               │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 5: Testing & Verification (2 hours)                       │
│ ├─ Test proposal creation flow                                  │
│ ├─ Test listing view page                                       │
│ ├─ Test proposals page                                          │
│ └─ Verify all nested data resolves correctly                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Expected Performance Improvements

| Operation | Current Queries | Target Queries | Reduction |
|-----------|-----------------|----------------|-----------|
| `fetchProposalsByIds` | 8-9 | 2 | 75-80% |
| `fetchListingComplete` | 4-5 | 2 | 50-60% |
| `fetchHostData` | 2 | 1 | 50% |
| `proposal:get` | 4 | 1 | 75% |
| `proposal:create` (reads) | 5 | 2 | 60% |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FK constraint fails on existing bad data | Medium | High | Run validation query first |
| Nested select syntax issues | Low | Medium | Test in isolation |
| Performance regression on large joins | Low | Medium | Monitor query times |
| Breaking existing functionality | Medium | High | Thorough testing per phase |

---

## Validation Queries (Run Before Migrations)

```sql
-- Check for orphaned proposal.Listing references
SELECT p._id, p."Listing"
FROM public.proposal p
LEFT JOIN public.listing l ON p."Listing" = l._id
WHERE p."Listing" IS NOT NULL AND l._id IS NULL;

-- Check for orphaned proposal.Guest references
SELECT p._id, p."Guest"
FROM public.proposal p
LEFT JOIN public."user" u ON p."Guest" = u._id
WHERE p."Guest" IS NOT NULL AND u._id IS NULL;

-- Check for orphaned listing."Host / Landlord" references
SELECT l._id, l."Host / Landlord"
FROM public.listing l
LEFT JOIN public.account_host ah ON l."Host / Landlord" = ah._id
WHERE l."Host / Landlord" IS NOT NULL AND ah._id IS NULL;

-- Check for orphaned account_host.User references
SELECT ah._id, ah."User"
FROM public.account_host ah
LEFT JOIN public."user" u ON ah."User" = u._id
WHERE ah."User" IS NOT NULL AND u._id IS NULL;
```

---

## Files Reference Summary

### To Be Modified

| File | Phase | Changes |
|------|-------|---------|
| [app/src/lib/proposals/userProposalQueries.js](../../../app/src/lib/proposals/userProposalQueries.js) | 4.3 | Major refactor of `fetchProposalsByIds` |
| [app/src/lib/listingDataFetcher.js](../../../app/src/lib/listingDataFetcher.js) | 4.2 | Refactor host fetching |
| [app/src/lib/supabaseUtils.js](../../../app/src/lib/supabaseUtils.js) | 4.1 | Refactor `fetchHostData` |
| [supabase/functions/proposal/actions/get.ts](../../../supabase/functions/proposal/actions/get.ts) | 3.1 | Use nested selects |
| [supabase/functions/proposal/actions/create.ts](../../../supabase/functions/proposal/actions/create.ts) | 3.2 | Use nested selects for reads |

### No Changes Needed

| File | Reason |
|------|--------|
| [app/src/lib/dataLookups.js](../../../app/src/lib/dataLookups.js) | Caching is optimal for reference tables |
| [app/src/lib/supabase.js](../../../app/src/lib/supabase.js) | Client configuration unchanged |

---

## Acceptance Criteria

- [ ] All FK constraints added without errors
- [ ] Validation queries return zero orphaned records
- [ ] `proposal:create` reduces from 5 read queries to 2
- [ ] `proposal:get` reduces from 4 queries to 1
- [ ] `fetchProposalsByIds` reduces from 8+ queries to 2
- [ ] `fetchListingComplete` reduces from 4+ queries to 2
- [ ] All existing functionality works correctly
- [ ] No performance regressions

---

**Next Step**: Execute Phase 1 migrations after user approval.
