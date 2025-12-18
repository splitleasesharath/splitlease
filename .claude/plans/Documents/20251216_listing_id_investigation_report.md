# Listing ID Investigation Report

**Date**: 2025-12-16
**Listing ID**: `1764973043780x52847445415716824`
**Status**: FOUND in `listing_trial` table

---

## Summary

The listing ID `1764973043780x52847445415716824` exists in the **`listing_trial`** table, NOT in the main `listing` table. This is a self-listing (v2) that was created but never promoted to the main listing table.

---

## Database Findings

### Table Structure Discovery

Split Lease has three listing-related tables with different ID column patterns:

| Table | Primary Key Column | Additional ID Columns |
|-------|-------------------|---------------------|
| `listing` | `_id` (text) | `bubble_id` (text) |
| `listing_trial` | `id` (text) | `_id` (text), `bubble_id` (text) |
| `listing_drafts` | `id` (uuid) | None |

**Key Insight**: The `listing_trial` table uses `id` as its primary key (containing Bubble-style IDs like `1764973043780x52847445415716824`), while `_id` contains the internal Split Lease ID format (like `self_1764973043425_nkzixvohd`).

### Listing Record Details

```sql
-- Record found in listing_trial table
id: 1764973043780x52847445415716824
_id: self_1764973043425_nkzixvohd
bubble_id: null
Name: "Charming Private Room with Ample Closet Space"
Created Date: 2025-12-05 22:17:23.425+00
Modified Date: 2025-12-05 22:17:23.425+00
Created By: 1764872273875x945857300898573600
Active: false
Complete: true
Approved: false
progress: null
source_type: "self-listing-v2"
host_type: "resident"
market_strategy: "private"
pending: false
```

### Status Analysis

**Critical Findings**:
1. ✅ `Complete: true` - The listing form is fully filled out
2. ❌ `Approved: false` - The listing has NOT been approved
3. ❌ `Active: false` - The listing is NOT active
4. ❌ **Not in main `listing` table** - This listing never graduated from trial to production

**No Associated Proposals**: No proposals exist referencing either the `id` or `_id` of this listing.

---

## Architecture Understanding

### Listing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     LISTING LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. listing_drafts (Draft/In-Progress)                          │
│     └─> User is actively filling out the form                  │
│                                                                 │
│  2. listing_trial (Submitted for Review)                        │
│     └─> Form is complete, awaiting approval                    │
│     └─> id: Bubble-style ID (1764973043780x52847445415716824)  │
│     └─> _id: Internal ID (self_1764973043425_nkzixvohd)        │
│                                                                 │
│  3. listing (Live/Approved)                 ◄─── THIS MISSING  │
│     └─> Approved and searchable                                │
│     └─> _id: Internal ID (primary key)                         │
│     └─> bubble_id: Bubble sync ID (if applicable)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Current Status**: This listing is stuck at stage 2 (`listing_trial`) and never progressed to stage 3 (`listing`).

### ID Mapping Pattern

When a listing_trial is approved and promoted:
- `listing_trial.id` (Bubble-style) → *Not directly copied*
- `listing_trial._id` (Internal ID) → `listing._id` (Primary key in main table)
- `listing_trial.bubble_id` → `listing.bubble_id` (if sync'd with Bubble)

---

## Frontend Implications

### Where the ID is Used

The listing ID `1764973043780x52847445415716824` is referenced in the frontend, likely in:

1. **URL parameters** (e.g., `/listing/1764973043780x52847445415716824`)
2. **API calls** expecting this ID format
3. **State management** storing this ID

### The Problem

**Frontend expects**: Listing with ID `1764973043780x52847445415716824`
**Database reality**:
- ✅ Exists in `listing_trial` (unapproved staging table)
- ❌ Does NOT exist in `listing` (production table)
- ❌ No proposals created for this listing

### Why Frontend Might Fail

If the frontend is querying the `listing` table (production listings only), it will NOT find this record because:
1. The listing never graduated from `listing_trial` to `listing`
2. The `listing` table doesn't use `id` as a column (uses `_id` instead)
3. Even searching by `_id` in the `listing` table returns empty

---

## Recommended Solutions

### Option 1: Query the Correct Table (listing_trial)

Update frontend/backend logic to check `listing_trial` for in-review listings:

```sql
-- Check listing_trial first
SELECT * FROM listing_trial WHERE id = :listing_id;

-- If not found, check main listing table
SELECT * FROM listing WHERE _id = :listing_id OR bubble_id = :listing_id;
```

### Option 2: Promote the Listing

If this listing should be live, manually promote it:

```sql
-- Copy from listing_trial to listing (would need proper migration logic)
INSERT INTO listing (...)
SELECT _id, ... FROM listing_trial WHERE id = '1764973043780x52847445415716824';
```

### Option 3: Fix Frontend ID Handling

Ensure frontend:
1. Understands different ID formats (`id` vs `_id`)
2. Checks `listing_trial` table for pending/unapproved listings
3. Shows appropriate UI for trial listings (e.g., "Pending Approval" badge)

---

## Related Files to Investigate

Based on the Split Lease architecture, check these files:

### Backend (Edge Functions)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\data-api\index.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\_shared\bubbleDataApi.js`

### Frontend (Pages & Logic)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\pages\Listing\index.jsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\workflows\*` (listing-related workflows)

### Database Queries
Search for queries that reference:
- `listing.id` (WRONG - this column doesn't exist)
- `listing._id` (CORRECT for main table)
- `listing_trial.id` (CORRECT for trial table)

---

## Next Steps

1. **Identify the Frontend Code Path**
   - Where is `1764973043780x52847445415716824` being used?
   - Is it in a URL, API call, or state variable?

2. **Determine Intended Behavior**
   - Should this listing be live (Option 2)?
   - Should frontend show trial listings (Option 1)?
   - Is there a bug in ID handling (Option 3)?

3. **Implement Fix**
   - Update queries to check both `listing_trial` and `listing` tables
   - OR promote approved trial listings to main table
   - OR fix frontend to understand listing lifecycle stages

---

## SQL Queries for Reference

```sql
-- Find listing in listing_trial
SELECT id, _id, bubble_id, "Name", "Active", "Complete", "Approved"
FROM listing_trial
WHERE id = '1764973043780x52847445415716824';

-- Check if it exists in main listing table
SELECT _id, bubble_id, "Name", "Active", "Complete", "Approved"
FROM listing
WHERE _id = 'self_1764973043425_nkzixvohd';

-- Search for all trial listings by a user
SELECT id, _id, "Name", "Complete", "Approved", "Created Date"
FROM listing_trial
WHERE "Created By" = '1764872273875x945857300898573600'
ORDER BY "Created Date" DESC;
```

---

**Report Generated**: 2025-12-16
**Investigation Status**: Complete
**Action Required**: Determine intended behavior and implement appropriate fix
