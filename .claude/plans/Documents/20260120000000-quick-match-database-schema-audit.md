# Quick Match Database Schema Audit Report

**Date**: 2026-01-20
**Purpose**: Audit existing Supabase schema to inform Quick Match feature implementation
**Database**: Supabase Development (supabase-dev)

---

## Executive Summary

The audit reveals a legacy Bubble.io-replicated schema with minimal foreign key constraints. Key findings:

1. **Core tables exist**: `proposal`, `listing`, `user`, `rentalapplication`
2. **No existing match table**: `proposal_match` table does not exist (ready for creation)
3. **Minimal FK constraints**: Tables use text-based IDs without enforced referential integrity
4. **Rich data available**: Extensive fields for matching criteria (location, schedule, pricing)
5. **JSONB fields**: Heavy use of JSONB for arrays/lists (days, nights, amenities, etc.)

---

## Table Analysis

### 1. Proposal Table

**Primary Key**: `_id` (text)

#### Key Fields for Quick Match

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `_id` | text | NO | Primary key (proposal ID) |
| `Guest` | text | YES | FK to user._id (guest) |
| `Listing` | text | YES | FK to listing._id (original listing) |
| `Guest email` | text | NO | Guest email (fallback identifier) |
| `Host User` | text | YES | FK to user._id (host) |
| `rental application` | text | YES | FK to rentalapplication._id |
| `Status` | text | YES | Proposal status |
| `Deleted` | boolean | YES | Soft delete flag |
| `pending` | boolean | YES | Bubble sync pending flag (default: false) |

#### Location Fields
- `Location - Address` (jsonb)
- `Location - Address slightly different` (jsonb)

#### Schedule/Timing Fields
- `Move in range start` (text) - NOT NULL
- `Move in range end` (text) - NOT NULL
- `Move-out` (text)
- `Reservation Span` (text) - NOT NULL
- `Reservation Span (Weeks)` (integer) - NOT NULL
- `Days Selected` (jsonb)
- `Nights Selected (Nights list)` (jsonb)
- `check in day` (text)
- `check out day` (text)
- `nights per week (num)` (numeric) - NOT NULL
- `flexible move in?` (boolean)
- `Guest flexibility` (text)

#### Pricing Fields
- `Total Price for Reservation (guest)` (numeric) - NOT NULL
- `4 week rent` (numeric) - NOT NULL
- `proposal nightly price` (numeric)
- `cleaning fee` (numeric)
- `damage deposit` (numeric)

#### Preferences
- `preferred gender` (text)
- `need for space` (text)
- `rental type` (text)

#### Counter-Offer Fields (hc prefix)
Many fields prefixed with `hc` (host counter) for counter-offer tracking:
- `hc days selected` (jsonb)
- `hc nights selected` (jsonb)
- `hc total price` (numeric)
- `hc move in date` (timestamp with time zone)
- etc.

#### Timestamps
- `Created Date` (timestamptz) - NOT NULL
- `Modified Date` (timestamptz) - NOT NULL
- `created_at` (timestamptz) - default: now()
- `updated_at` (timestamptz) - default: now()

#### Other Notable Fields
- `bubble_id` (text) - Legacy Bubble.io ID (unique index exists)
- `Comment` (text) - Guest comment
- `about_yourself` (text)
- `special_needs` (text)

**Indexes**:
- `proposal_pkey` on `_id` (unique)
- `proposal_bubble_id_key` on `bubble_id` (unique)
- `idx_proposal_created_date` on `Created Date`
- `idx_proposal_modified_date` on `Modified Date`

---

### 2. Listing Table

**Primary Key**: `_id` (text)

#### Key Fields for Quick Match

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `_id` | text | NO | Primary key (listing ID) |
| `Host User` | text | YES | FK to user._id (host) |
| `Name` | text | YES | Listing name/title |
| `Active` | boolean | YES | Is listing active? |
| `Deleted` | boolean | YES | Soft delete flag (default: false) |
| `Complete` | boolean | YES | Is listing profile complete? |
| `Approved` | boolean | YES | Admin approval status |
| `pending` | boolean | YES | Bubble sync pending flag (default: false) |

#### Location Fields
- `Location - Borough` (text) - Indexed
- `Location - Hood` (text) - Indexed
- `Location - City` (text)
- `Location - State` (text)
- `Location - Zip Code` (text)
- `Location - Address` (jsonb)
- `Location - Coordinates` (jsonb)
- `Location - Hoods (new)` (jsonb)

#### Space/Features Fields
- `Features - Type of Space` (text)
- `Features - Qty Bedrooms` (integer)
- `Features - Qty Bathrooms` (numeric)
- `Features - Qty Beds` (integer)
- `Features - Qty Guests` (integer)
- `Features - SQFT Area` (integer)
- `Features - SQFT of Room` (integer)
- `Features - Amenities In-Unit` (jsonb)
- `Features - Amenities In-Building` (jsonb)
- `Features - Safety` (jsonb)
- `Features - House Rules` (jsonb)
- `Features - Photos` (jsonb)
- `Features - Parking type` (text)
- `Features - Secure Storage Option` (text)
- `Features - Trial Periods Allowed` (boolean) - NOT NULL
- `Kitchen Type` (text)

#### Availability/Schedule Fields
- `Days Available (List of Days)` (jsonb) - NOT NULL
- `Days Not Available` (jsonb)
- `Nights Available (List of Nights)` (jsonb) - NOT NULL
- `Nights Available (numbers)` (jsonb)
- `Nights Not Available` (jsonb)
- `Dates - Blocked` (jsonb)
- `# of nights available` (integer)
- `First Available` (text)
- `Last Available` (text)
- `Weeks offered` (text) - NOT NULL
- `weeks out to available` (integer)

#### Duration/Stay Length Fields
- `Minimum Nights` (integer) - NOT NULL
- `Maximum Nights` (integer)
- `Minimum Weeks` (integer)
- `Maximum Weeks` (integer) - NOT NULL
- `Minimum Months` (integer)
- `Maximum Months` (integer)

#### Pricing Fields
- `Standarized Minimum Nightly Price (Filter)` (numeric) - Indexed
- `💰Nightly Host Rate for 1 night` (numeric)
- `💰Nightly Host Rate for 2 nights` (numeric)
- `💰Nightly Host Rate for 3 nights` (numeric)
- `💰Nightly Host Rate for 4 nights` (numeric)
- `💰Nightly Host Rate for 5 nights` (numeric)
- `💰Nightly Host Rate for 6 nights` (numeric)
- `💰Nightly Host Rate for 7 nights` (numeric)
- `💰Weekly Host Rate` (numeric)
- `💰Monthly Host Rate` (integer)
- `💰Damage Deposit` (integer) - NOT NULL
- `💰Cleaning Cost / Maintenance Fee` (integer)
- `💰Extra Charges` (integer)
- `💰Price Override` (integer)
- `💰Unit Markup` (integer)
- `Price number (for map)` (text)
- `pricing_list` (text)

#### Check-in/Check-out
- `NEW Date Check-in Time` (text) - NOT NULL
- `NEW Date Check-out Time` (text) - NOT NULL

#### Preferences/Restrictions
- `Preferred Gender` (text) - NOT NULL
- `host restrictions` (text)
- `allow alternating roommates?` (boolean)
- `rental type` (text)

#### Timestamps
- `Created Date` (timestamptz) - NOT NULL
- `Modified Date` (timestamptz) - NOT NULL
- `created_at` (timestamptz) - default: now()
- `updated_at` (timestamptz) - default: now()

#### Other Fields
- `Description` (text)
- `Description - Neighborhood` (text)
- `bubble_id` (text) - Legacy Bubble.io ID (unique index exists)
- `host_type` (text)
- `market_strategy` (text) - default: 'private'
- `Cancellation Policy` (text)
- `Cancellation Policy - Additional Restrictions` (text)

**Indexes**:
- `listing_pkey` on `_id` (unique)
- `listing_bubble_id_key` on `bubble_id` (unique)
- `idx_listing_created_date` on `Created Date`
- `idx_listing_modified_date` on `Modified Date`
- `idx_listing_borough_filter` on `Location - Borough` (filtered: Active=true, isForUsability=false)
- `idx_listing_hood_filter` on `Location - Hood` (filtered)
- `idx_listing_price_filter` on `Standarized Minimum Nightly Price (Filter)` (filtered)
- `idx_listing_active_usability` on `Active`, `isForUsability` (filtered)
- `idx_listing_not_deleted` on `Deleted` (filtered: Deleted=false)

---

### 3. User Table

**Primary Key**: `_id` (text)

#### Key Fields for Quick Match

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `_id` | text | NO | Primary key (user ID) |
| `email` | text | YES | Email (unique index exists) |
| `email as text` | text | YES | Duplicate email field |
| `Name - Full` | text | YES | Full name |
| `Name - First` | text | YES | First name |
| `Name - Last` | text | YES | Last name |
| `Type - User Current` | text | YES | Current user type (guest/host) |
| `Type - User Signup` | text | YES | Signup user type |
| `email_verified` | boolean | YES | Email verification status (default: false, indexed) |
| `pending` | boolean | YES | Bubble sync pending flag (default: false) |

#### Guest Preferences (for matching)
- `Preferred Borough` (text)
- `Preferred Hoods` (jsonb)
- `Preferred Searched Address` (jsonb)
- `Preferred weekly schedule` (text)
- `Price Tier` (text)
- `Split Schedule Preference` (text)
- `reservation span` (text)
- `need for Space` (text)
- `ideal schedule (company suggested)` (jsonb)
- `ideal schedule night selector type` (text)
- `Recent Days Selected` (jsonb)
- `flexibility (last known)` (text)
- `transportation medium` (text[]) - PostgreSQL array

#### Profile Information
- `About Me / Bio` (text)
- `Profile Photo` (text)
- `Date of Birth` (timestamptz)
- `Phone Number (as text)` (text)
- `Rental Application` (text) - FK to rentalapplication._id
- `special needs` (text)

#### Activity/Engagement
- `Favorited Listings` (jsonb)
- `Proposals List` (text[]) - PostgreSQL array
- `Listings` (jsonb) - Host's listings
- `Search Log` (jsonb)
- `login counter` (integer)

#### Timestamps
- `Created Date` (timestamptz)
- `Modified Date` (timestamptz) - NOT NULL
- `created_at` (timestamptz) - default: now()
- `updated_at` (timestamptz) - default: now()

#### Other Fields
- `bubble_id` (text) - Legacy Bubble.io ID (unique index exists)
- `user_signed_up` (boolean) - NOT NULL
- `Toggle - Is Admin` (boolean)

**Indexes**:
- `user_pkey` on `_id` (unique)
- `user_email_key` on `email` (unique)
- `user_bubble_id_key` on `bubble_id` (unique)
- `idx_user_created_date` on `Created Date`
- `idx_user_modified_date` on `Modified Date`
- `idx_user_email_verified` on `email_verified` (filtered: email_verified=false)

**Foreign Keys**:
- `Notification Settings OS(lisits)` → `notificationsettingsos_lists_._id`

---

### 4. Rental Application Table

**Primary Key**: `_id` (text)

#### Key Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `_id` | text | NO | Primary key |
| `Created By` | text | NO | FK to user._id |
| `email` | text | YES | Email |
| `name` | text | YES | Full name |
| `job title` | text | YES | Job title |
| `employment status` | text | YES | Employment status |
| `employer name` | text | YES | Employer name |
| `Monthly Income` | integer | YES | Monthly income |
| `credit score` | text | YES | Credit score |
| `submitted` | boolean | YES | Submission status |
| `pending` | boolean | YES | Bubble sync pending flag (default: false) |

#### Timestamps
- `Created Date` (timestamptz) - NOT NULL
- `Modified Date` (timestamptz) - NOT NULL
- `created_at` (timestamptz) - default: now()
- `updated_at` (timestamptz) - default: now()

#### Other Fields
- `bubble_id` (text) - Legacy Bubble.io ID

---

## Foreign Key Constraint Analysis

**Critical Finding**: The database has **minimal foreign key constraints**. Only 1 FK found:
- `user."Notification Settings OS(lisits)"` → `notificationsettingsos_lists_._id`

**What's Missing**:
- `proposal.Guest` → `user._id` (no FK constraint)
- `proposal.Listing` → `listing._id` (no FK constraint)
- `proposal."Host User"` → `user._id` (no FK constraint)
- `proposal."rental application"` → `rentalapplication._id` (no FK constraint)
- `listing."Host User"` → `user._id` (no FK constraint)
- `user."Rental Application"` → `rentalapplication._id` (no FK constraint)

**Implication**: The schema relies on application-level referential integrity. This is a legacy pattern from Bubble.io migration.

**Recommendation for `proposal_match` table**: Follow existing pattern - use text-based IDs without FK constraints for consistency, but document the relationships clearly.

---

## Recommended Schema for `proposal_match` Table

Based on the audit findings, here's the recommended CREATE TABLE statement:

```sql
CREATE TABLE proposal_match (
    -- Primary Key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core References (text-based IDs, no FK constraints - following existing pattern)
    proposal_id text NOT NULL,           -- References proposal._id
    matched_listing_id text NOT NULL,    -- References listing._id
    original_listing_id text,            -- References listing._id (the listing the proposal was originally for)
    guest_id text,                       -- References user._id (denormalized from proposal for quick access)
    matched_by_user_id text,             -- References user._id (admin/system user who created the match)

    -- Match Metadata
    match_reason text,                   -- Why this listing was matched (e.g., "same_borough_lower_price")
    match_score numeric(5,2),            -- Algorithmic match score (0.00 to 100.00)
    match_type text DEFAULT 'manual',    -- 'manual' | 'ai' | 'system'

    -- Status Tracking
    status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'viewed' | 'accepted' | 'rejected' | 'expired'
    viewed_at timestamptz,               -- When guest viewed this match
    responded_at timestamptz,            -- When guest took action (accept/reject)

    -- Comparison Data (snapshot at match time for reference)
    original_price numeric,              -- Price of original listing at match time
    matched_price numeric,               -- Price of matched listing at match time
    price_difference numeric,            -- Difference in price

    -- Notes
    admin_notes text,                    -- Internal notes about why this match was suggested
    guest_notes text,                    -- Guest's notes/feedback on this match

    -- Timestamps
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz,              -- Optional expiration for time-sensitive matches

    -- Bubble.io Sync (following existing pattern)
    bubble_id text UNIQUE,               -- Legacy Bubble.io ID if needed
    pending boolean DEFAULT false,       -- Bubble sync pending flag

    -- Soft Delete
    deleted boolean DEFAULT false,       -- Soft delete flag
    deleted_at timestamptz,              -- When deleted

    -- Uniqueness: Prevent duplicate matches
    CONSTRAINT unique_proposal_listing_match
        UNIQUE (proposal_id, matched_listing_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_proposal_match_proposal_id ON proposal_match(proposal_id)
    WHERE deleted = false;

CREATE INDEX idx_proposal_match_matched_listing_id ON proposal_match(matched_listing_id)
    WHERE deleted = false;

CREATE INDEX idx_proposal_match_status ON proposal_match(status)
    WHERE deleted = false;

CREATE INDEX idx_proposal_match_created_at ON proposal_match(created_at);

CREATE INDEX idx_proposal_match_guest_id ON proposal_match(guest_id)
    WHERE deleted = false AND status = 'pending';

-- Composite index for common query: "get all pending matches for a proposal"
CREATE INDEX idx_proposal_match_proposal_status ON proposal_match(proposal_id, status)
    WHERE deleted = false;

-- Index for cleanup/expiration queries
CREATE INDEX idx_proposal_match_expires_at ON proposal_match(expires_at)
    WHERE deleted = false AND status = 'pending' AND expires_at IS NOT NULL;

-- Updated_at trigger (following existing pattern)
CREATE TRIGGER update_proposal_match_updated_at
    BEFORE UPDATE ON proposal_match
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Assumes update_updated_at_column() function exists (check with existing tables)

-- Row Level Security (RLS) - placeholder, adjust based on auth requirements
ALTER TABLE proposal_match ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust as needed):
-- Allow admins full access
CREATE POLICY "Admins can do everything on proposal_match"
    ON proposal_match
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "user"
            WHERE _id = auth.uid()::text
            AND "Toggle - Is Admin" = true
        )
    );

-- Allow guests to view their own matches
CREATE POLICY "Guests can view their own matches"
    ON proposal_match
    FOR SELECT
    TO authenticated
    USING (guest_id = auth.uid()::text);
```

### Schema Design Decisions

1. **UUID Primary Key**: Using `uuid` for `id` (modern pattern) while keeping text-based references for consistency with existing tables.

2. **No FK Constraints**: Following the existing pattern in the database. All relationships are documented but not enforced at the DB level.

3. **Denormalized `guest_id`**: Copied from proposal for faster guest-centric queries without joins.

4. **Match Metadata**: Tracking `match_reason`, `match_score`, and `match_type` for analytics and explainability.

5. **Status Workflow**: Clear status progression: `pending` → `viewed` → `accepted`/`rejected`/`expired`.

6. **Price Snapshot**: Storing prices at match time to preserve historical context (listing prices may change).

7. **Soft Delete**: Using `deleted` boolean flag (consistent with `proposal` and `listing` tables).

8. **Bubble Sync Fields**: Including `bubble_id` and `pending` for consistency with migration pattern.

9. **Indexes**: Filtered indexes on `deleted = false` for query performance (following existing patterns like `idx_listing_not_deleted`).

10. **Unique Constraint**: Preventing duplicate matches for the same proposal-listing pair.

---

## Data Type Observations

### JSONB Usage
The schema heavily uses JSONB for:
- **Arrays/Lists**: `Days Available`, `Nights Available`, `Features - Amenities`, etc.
- **Structured Objects**: `Location - Address`, `Location - Coordinates`
- **History/Logs**: `History`, `Search Log`

**For Quick Match**: Consider whether match criteria/metadata should be JSONB or separate columns. Recommendation: Use separate columns for searchable/filterable fields (status, scores), JSONB for metadata.

### Text-Based IDs
All primary keys and foreign keys use `text` type (legacy from Bubble.io UUID format).

**For Quick Match**: The new `proposal_match.id` uses native PostgreSQL UUID, but reference fields (`proposal_id`, `matched_listing_id`, etc.) use `text` for compatibility.

### Timestamp Fields
Two sets of timestamps exist:
- **Bubble.io fields**: `Created Date`, `Modified Date` (timestamptz, NOT NULL)
- **Supabase fields**: `created_at`, `updated_at` (timestamptz, default: now())

**For Quick Match**: Use the Supabase pattern (`created_at`, `updated_at`) as primary timestamps.

---

## Matching Criteria Available in Schema

### Location Matching
**Listing Fields**:
- `Location - Borough` (indexed)
- `Location - Hood` (indexed)
- `Location - Coordinates` (jsonb)

**Proposal Fields**:
- `Location - Address` (jsonb)

**User Preference Fields**:
- `Preferred Borough`
- `Preferred Hoods` (jsonb)

### Schedule Matching
**Listing Fields**:
- `Days Available (List of Days)` (jsonb)
- `Nights Available (List of Nights)` (jsonb)
- `Weeks offered` (text)

**Proposal Fields**:
- `Days Selected` (jsonb)
- `Nights Selected (Nights list)` (jsonb)
- `nights per week (num)` (numeric)
- `Reservation Span (Weeks)` (integer)

### Pricing Matching
**Listing Fields**:
- `Standarized Minimum Nightly Price (Filter)` (numeric, indexed)
- `💰Nightly Host Rate for X nights` (various)
- `💰Weekly Host Rate` (numeric)

**Proposal Fields**:
- `Total Price for Reservation (guest)` (numeric)
- `4 week rent` (numeric)
- `proposal nightly price` (numeric)

**User Preference Fields**:
- `Price Tier` (text)

### Space/Features Matching
**Listing Fields**:
- `Features - Type of Space`
- `Features - Qty Bedrooms`
- `Features - Qty Bathrooms`
- `Features - Qty Guests`
- `Features - Amenities In-Unit` (jsonb)
- `Features - House Rules` (jsonb)

**Proposal Fields**:
- Limited features data in proposal itself

### Duration Matching
**Listing Fields**:
- `Minimum Nights`, `Maximum Nights`
- `Minimum Weeks`, `Maximum Weeks`
- `Minimum Months`, `Maximum Months`

**Proposal Fields**:
- `Reservation Span (Weeks)` (integer)
- `duration in months` (numeric)

---

## Concerns and Considerations

### 1. No Referential Integrity
**Concern**: Without FK constraints, orphaned records are possible (e.g., `proposal_match` referencing deleted proposals/listings).

**Mitigation**:
- Implement application-level validation
- Add soft-delete checks in queries (`WHERE deleted = false`)
- Consider periodic cleanup jobs for orphaned matches

### 2. Text-Based IDs
**Concern**: Text IDs from Bubble.io may not follow UUID format consistently.

**Mitigation**:
- Validate ID format in application layer
- Use indexed lookups for performance

### 3. JSONB Field Querying
**Concern**: Querying JSONB fields (days, nights, amenities) for matching may be complex and slow.

**Mitigation**:
- Use GIN indexes on JSONB fields if needed
- Consider denormalizing frequently-queried JSONB data into separate columns
- Cache match calculations

### 4. Data Consistency
**Concern**: Prices and availability in listings may change after matches are created.

**Mitigation**:
- Store snapshot data in `proposal_match` (already included in schema)
- Add `expires_at` field to invalidate stale matches
- Implement revalidation logic

### 5. Bubble.io Sync
**Concern**: The `pending` flag pattern suggests ongoing Bubble sync. Quick Match may need to participate.

**Mitigation**:
- Check if `proposal_match` needs Bubble.io sync
- If yes, implement sync queue integration
- If no, document that this table is Supabase-native only

### 6. Performance at Scale
**Concern**: Matching algorithm may need to scan many listings.

**Mitigation**:
- Use filtered indexes on match criteria
- Implement match caching/materialized views
- Consider background job processing for match generation

---

## Next Steps

1. **Verify Update Trigger**: Check if `update_updated_at_column()` function exists:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE '%updated_at%';
   ```

2. **Review RLS Policies**: Examine existing RLS policies on `proposal` and `listing` tables to align `proposal_match` security.

3. **Test ID Compatibility**: Verify that text-based IDs from `proposal` and `listing` can be reliably used in `proposal_match`.

4. **Plan Migration Path**:
   - Create table in dev environment
   - Test with sample data
   - Add to migration scripts
   - Deploy to production

5. **Build Matching Logic**: Develop algorithm to populate `proposal_match` based on criteria overlap.

6. **UI Integration**: Design guest-facing interface to view/accept/reject matches.

---

## Appendix: Sample Queries

### Query 1: Find all pending matches for a proposal
```sql
SELECT
    pm.*,
    l."Name" as listing_name,
    l."Location - Borough" as listing_borough,
    l."Standarized Minimum Nightly Price (Filter)" as listing_price
FROM proposal_match pm
JOIN listing l ON pm.matched_listing_id = l._id
WHERE pm.proposal_id = 'proposal_id_here'
    AND pm.status = 'pending'
    AND pm.deleted = false
    AND l."Deleted" = false
    AND l."Active" = true
ORDER BY pm.match_score DESC, pm.created_at DESC;
```

### Query 2: Get match statistics for a guest
```sql
SELECT
    guest_id,
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_matches,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_matches,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_matches,
    AVG(match_score) as avg_match_score
FROM proposal_match
WHERE guest_id = 'user_id_here'
    AND deleted = false
GROUP BY guest_id;
```

### Query 3: Find expired matches for cleanup
```sql
SELECT id, proposal_id, matched_listing_id, expires_at
FROM proposal_match
WHERE status = 'pending'
    AND deleted = false
    AND expires_at IS NOT NULL
    AND expires_at < now();
```

---

## Conclusion

The Supabase schema is ready for the `proposal_match` table. The recommended schema follows existing patterns (text IDs, soft deletes, Bubble sync fields) while introducing modern features (UUID primary key, comprehensive indexing, status workflow).

**Key Recommendation**: Proceed with the CREATE TABLE statement above, then implement application-level validation to compensate for the lack of FK constraints.

**Schema Compatibility**: ✅ All referenced fields exist in `proposal`, `listing`, and `user` tables.

**Missing Fields**: None identified. The schema provides rich data for matching.

**Final Schema Modifications Needed**: None - the tables are suitable as-is for Quick Match integration.
