# Cleanup Plan: Convert user.proposal_list from JSONB to TEXT ARRAY

**Created**: 2025-12-13T15:00:00Z
**Type**: CLEANUP - Database Schema Migration
**Status**: Ready for Execution

---

## 1. Executive Summary

### What is being cleaned up
The `user` table's `"Proposals List"` column is currently stored as a `jsonb` type containing a double-encoded JSON string (a JSONB value that holds a string representation of a JSON array). This needs to be converted to a proper `text[]` (PostgreSQL TEXT ARRAY) type to:
1. Enable establishing a foreign key relationship to the `proposal` table's `_id` primary key
2. Eliminate the double-encoding anti-pattern
3. Improve query performance and data integrity
4. Simplify application code that currently must parse the double-encoded value

### Scope and Boundaries
- **Table affected**: `public.user`
- **Column affected**: `"Proposals List"`
- **Current type**: `jsonb` (storing a JSON string containing a JSON array)
- **Target type**: `text[]` (native PostgreSQL text array)
- **Foreign key target**: `proposal._id` (text primary key)
- **Records affected**: 312 users have non-empty proposal lists containing 1,195 total references
- **Data integrity**: All 1,195 proposal references are valid (0 orphaned references)

### Expected Outcomes and Benefits
1. **Data Integrity**: Foreign key constraint ensures referential integrity
2. **Performance**: Native array operations vs JSON parsing
3. **Simplicity**: Remove double-decoding logic from application code
4. **Type Safety**: PostgreSQL enforces array element types
5. **Query Capability**: Use native array operators (`@>`, `&&`, `ANY()`)

---

## 2. Current State Analysis

### Database Schema
```sql
-- Current column definition
Column: "Proposals List"
Type: jsonb
Nullable: YES
Default: null
```

### Data Format Analysis
The current data is **double-encoded**:
1. The column type is `jsonb`
2. The JSONB value contains a **string** (not an array)
3. That string is itself a JSON array when parsed

**Example current value**:
```
JSONB column value: "[\"1751909850688x497596602218314500\", \"1751909859603x836859246246899300\"]"
                     ^-- This is a JSONB string, not a JSONB array

When extracted: ["1751909850688x497596602218314500", "1751909859603x836859246246899300"]
                ^-- After #>> '{}' extraction and re-parsing as JSON
```

### Statistics
| Metric | Value |
|--------|-------|
| Total users in table | 913 |
| Users with proposal_list column populated | 312 |
| Total proposal references | 1,195 |
| Orphaned references (invalid proposal IDs) | 0 |
| Valid references | 1,195 |
| Total proposals in proposal table | 709 |

### Affected Files Inventory

#### Frontend (app/)
| File Path | Usage | Required Changes |
|-----------|-------|------------------|
| `app/src/lib/proposals/userProposalQueries.js` | Lines 59-86: `extractProposalIds()` function parses JSONB | Simplify to handle native array |

**Code Reference - userProposalQueries.js (lines 59-86)**:
```javascript
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];

  if (!proposalsList) {
    console.warn('extractProposalIds: User has no Proposals List field');
    return [];
  }

  // Handle JSONB array parsing
  let proposalIds = [];

  if (Array.isArray(proposalsList)) {
    proposalIds = proposalsList;
  } else if (typeof proposalsList === 'string') {
    try {
      proposalIds = JSON.parse(proposalsList);
    } catch (e) {
      console.error('extractProposalIds: Failed to parse Proposals List:', e);
      return [];
    }
  } else {
    console.error('extractProposalIds: Proposals List is not an array or string:', typeof proposalsList);
    return [];
  }

  console.log(`extractProposalIds: Extracted ${proposalIds.length} proposal IDs from user's Proposals List`);
  return proposalIds;
}
```

#### Backend Edge Functions (supabase/functions/)
| File Path | Usage | Required Changes |
|-----------|-------|------------------|
| `supabase/functions/proposal/actions/create.ts` | Lines 107, 143, 174, 343, 383, 388 | Update to use native arrays |
| `supabase/functions/proposal/lib/types.ts` | Lines 210, 232 | Update type definitions |
| `supabase/functions/auth-user/handlers/validate.ts` | Lines 68, 147-148 | Update to handle native array |

**Code Reference - create.ts (lines 170-176, 340-344, 382-388)**:
```typescript
// Line 174: Uses parseJsonArray to handle JSONB string
const existingProposals = parseJsonArray<string>(guestData["Proposals List"], "Proposals List");

// Lines 341-343: Updates the column
const updatedGuestProposals = [...existingProposals, proposalId];
guestUpdates["Proposals List"] = updatedGuestProposals;

// Lines 383-388: Host update
const hostProposals = parseJsonArray<string>(hostUserData["Proposals List"], "Host Proposals List");
const { error: hostUpdateError } = await supabase
  .from("user")
  .update({
    "Proposals List": [...hostProposals, proposalId],
    // ...
  })
```

**Code Reference - types.ts (lines 206-216, 229-233)**:
```typescript
// GuestData interface
export interface GuestData {
  _id: string;
  email: string;
  "Rental Application": string | null;
  "Proposals List": string[];  // <-- Already typed as string[], but runtime receives JSONB
  // ...
}

// HostUserData interface
export interface HostUserData {
  _id: string;
  email: string;
  "Proposals List": string[];  // <-- Same issue
}
```

**Code Reference - validate.ts (lines 68, 147-148)**:
```typescript
// Line 68: Selects the column
const userSelectFields = '..., "Proposals List"';

// Lines 147-148: Parses the value
const proposalsList = userData['Proposals List'];
// Then uses it (implicitly handles parsing somewhere)
```

### Dependencies and Relationships
```
user."Proposals List" (text[])
    │
    └──> proposal._id (text, PRIMARY KEY)
         Contains: Bubble-style IDs like "1751909850688x497596602218314500"
```

### Existing Constraints on user table
| Constraint Name | Type | Column |
|-----------------|------|--------|
| user_pkey | PRIMARY KEY | _id |
| user_bubble_id_key | UNIQUE | bubble_id |
| user_email_key | UNIQUE | email |

### No Dependencies Found
- No views reference `"Proposals List"`
- No functions reference `"Proposals List"`
- No triggers on the column

---

## 3. Target State Definition

### Desired End State
```sql
-- Target column definition
Column: "Proposals List"
Type: text[]
Nullable: YES
Default: '{}'::text[]

-- Foreign key constraint (ELEMENT-level)
-- NOTE: PostgreSQL does not support native FK constraints on array elements
-- Alternative: Use a trigger or application-level validation
```

### Important Constraint Limitation
**PostgreSQL does not support foreign key constraints on array elements**. The target state will use one of these alternatives:
1. **Option A (Recommended)**: Application-level validation + periodic integrity checks
2. **Option B**: Trigger-based validation on INSERT/UPDATE
3. **Option C**: Junction table (requires more extensive refactoring)

For this cleanup, we will use **Option A** since:
- All current references are already valid (0 orphaned)
- The application already creates proposals first, then updates user lists
- We can add a periodic integrity check function

### Target Patterns

**Database Query (after migration)**:
```sql
-- Direct array operations instead of JSONB parsing
SELECT * FROM "user"
WHERE 'proposal_id_here' = ANY("Proposals List");

-- Array contains check
SELECT * FROM "user"
WHERE "Proposals List" @> ARRAY['proposal_id']::text[];
```

**Frontend Code (after migration)**:
```javascript
// Simplified - no parsing needed
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];
  // Supabase returns text[] as JavaScript array directly
  return Array.isArray(proposalsList) ? proposalsList : [];
}
```

**Backend Code (after migration)**:
```typescript
// Direct array spread - no parseJsonArray needed
const existingProposals = guestData["Proposals List"] || [];
const updatedGuestProposals = [...existingProposals, proposalId];
```

### Success Criteria
1. Column type is `text[]`
2. All 1,195 existing proposal references preserved
3. Application code simplified (no JSON parsing)
4. Integrity validation function exists
5. All tests pass
6. No runtime errors in proposal creation flow

---

## 4. File-by-File Action Plan

### File: Database Migration (NEW FILE)
**Full Path**: `supabase/migrations/YYYYMMDDHHMMSS_convert_proposals_list_to_text_array.sql`

**Current State**: Does not exist

**Required Changes**: Create migration file with:
1. Add new `text[]` column
2. Migrate data from JSONB to text[]
3. Drop old column
4. Rename new column
5. Create integrity check function

**Code to Add**:
```sql
-- Migration: Convert user."Proposals List" from JSONB to TEXT ARRAY
-- Purpose: Enable proper array operations and prepare for referential integrity

-- Step 1: Add new column with text[] type
ALTER TABLE public."user"
ADD COLUMN "Proposals List_new" text[] DEFAULT '{}'::text[];

-- Step 2: Migrate data from JSONB string to text array
-- Handle the double-encoded format: JSONB containing a JSON string
UPDATE public."user"
SET "Proposals List_new" = CASE
  WHEN "Proposals List" IS NULL THEN '{}'::text[]
  WHEN jsonb_typeof("Proposals List") = 'string' THEN
    -- Extract string from JSONB, parse as JSON array, convert to text[]
    ARRAY(SELECT jsonb_array_elements_text(("Proposals List" #>> '{}')::jsonb))
  WHEN jsonb_typeof("Proposals List") = 'array' THEN
    -- Direct JSONB array (edge case)
    ARRAY(SELECT jsonb_array_elements_text("Proposals List"))
  ELSE '{}'::text[]
END;

-- Step 3: Verify migration (should return 0 rows if successful)
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM public."user"
  WHERE "Proposals List" IS NOT NULL
    AND jsonb_typeof("Proposals List") = 'string'
    AND "Proposals List" #>> '{}' != '[]'
    AND array_length("Proposals List_new", 1) IS NULL;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migration verification failed: % records have data loss', mismatch_count;
  END IF;
END $$;

-- Step 4: Drop old column and rename new column
ALTER TABLE public."user" DROP COLUMN "Proposals List";
ALTER TABLE public."user" RENAME COLUMN "Proposals List_new" TO "Proposals List";

-- Step 5: Create integrity check function
CREATE OR REPLACE FUNCTION check_proposals_list_integrity()
RETURNS TABLE (
  user_id text,
  orphaned_proposal_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u._id as user_id,
    unnest(u."Proposals List") as orphaned_proposal_id
  FROM public."user" u
  WHERE u."Proposals List" IS NOT NULL
    AND array_length(u."Proposals List", 1) > 0
  EXCEPT
  SELECT
    u._id as user_id,
    p._id as orphaned_proposal_id
  FROM public."user" u
  CROSS JOIN LATERAL unnest(u."Proposals List") as proposal_id
  JOIN public.proposal p ON p._id = proposal_id
  WHERE u."Proposals List" IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comment documenting the column
COMMENT ON COLUMN public."user"."Proposals List" IS 'Array of proposal IDs referencing proposal._id. Integrity checked via check_proposals_list_integrity()';
```

**Dependencies**: None
**Verification**: Run `SELECT check_proposals_list_integrity();` - should return 0 rows

---

### File: `app/src/lib/proposals/userProposalQueries.js`
**Full Path**: `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\proposals\userProposalQueries.js`

**Current State**: Complex parsing logic for double-encoded JSONB (lines 59-86)

**Required Changes**: Simplify `extractProposalIds()` function

**Code Reference (current, lines 59-86)**:
```javascript
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];

  if (!proposalsList) {
    console.warn('extractProposalIds: User has no Proposals List field');
    return [];
  }

  // Handle JSONB array parsing
  let proposalIds = [];

  if (Array.isArray(proposalsList)) {
    proposalIds = proposalsList;
  } else if (typeof proposalsList === 'string') {
    try {
      proposalIds = JSON.parse(proposalsList);
    } catch (e) {
      console.error('extractProposalIds: Failed to parse Proposals List:', e);
      return [];
    }
  } else {
    console.error('extractProposalIds: Proposals List is not an array or string:', typeof proposalsList);
    return [];
  }

  console.log(`extractProposalIds: Extracted ${proposalIds.length} proposal IDs from user's Proposals List`);
  return proposalIds;
}
```

**Target Code**:
```javascript
/**
 * STEP 2: Extract proposal IDs from user's Proposals List
 *
 * After migration, Proposals List is a native text[] array.
 * Supabase client returns text[] as JavaScript array directly.
 *
 * @param {Object} user - User object with Proposals List
 * @returns {Array<string>} Array of proposal IDs
 */
export function extractProposalIds(user) {
  const proposalsList = user['Proposals List'];

  if (!proposalsList || !Array.isArray(proposalsList)) {
    console.warn('extractProposalIds: User has no Proposals List or invalid format');
    return [];
  }

  console.log(`extractProposalIds: Extracted ${proposalsList.length} proposal IDs from user's Proposals List`);
  return proposalsList;
}
```

**Dependencies**: Migration must complete first
**Verification**: Test guest-proposals page loads correctly

---

### File: `supabase/functions/proposal/actions/create.ts`
**Full Path**: `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\actions\create.ts`

**Current State**: Uses `parseJsonArray()` to handle JSONB string parsing

**Required Changes**: Remove `parseJsonArray()` calls for Proposals List

**Code Changes**:

1. **Line 174** - Change from:
```typescript
const existingProposals = parseJsonArray<string>(guestData["Proposals List"], "Proposals List");
```
To:
```typescript
const existingProposals: string[] = guestData["Proposals List"] || [];
```

2. **Line 383** - Change from:
```typescript
const hostProposals = parseJsonArray<string>(hostUserData["Proposals List"], "Host Proposals List");
```
To:
```typescript
const hostProposals: string[] = hostUserData["Proposals List"] || [];
```

**Note**: Keep `parseJsonArray` import and usage for OTHER JSONB fields like `"Favorited Listings"` and `"Tasks Completed"` which may still be JSONB.

**Dependencies**: Migration must complete first
**Verification**: Create a new proposal and verify user's Proposals List is updated

---

### File: `supabase/functions/proposal/lib/types.ts`
**Full Path**: `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\proposal\lib\types.ts`

**Current State**: Types are already `string[]` but runtime receives JSONB

**Required Changes**: Add clarifying comment (types already correct)

**Code Changes at lines 206-216**:
```typescript
/**
 * Guest user data fetched from database
 */
export interface GuestData {
  _id: string;
  email: string;
  "Rental Application": string | null;
  "Proposals List": string[];  // Native text[] array from PostgreSQL
  "Favorited Listings": string[];  // Still JSONB - requires parseJsonArray
  "About Me / Bio"?: string;
  "need for Space"?: string;
  "special needs"?: string;
  "Tasks Completed"?: string[];  // Still JSONB - requires parseJsonArray
}
```

**Code Changes at lines 229-233**:
```typescript
/**
 * Host user data fetched from database
 */
export interface HostUserData {
  _id: string;
  email: string;
  "Proposals List": string[];  // Native text[] array from PostgreSQL
}
```

**Dependencies**: None (types already match target)
**Verification**: TypeScript compilation passes

---

### File: `supabase/functions/auth-user/handlers/validate.ts`
**Full Path**: `C:\Users\Split Lease\Documents\Split Lease\supabase\functions\auth-user\handlers\validate.ts`

**Current State**: Reads Proposals List and counts proposals

**Required Changes**: Update any parsing logic (if present)

**Code Reference (lines 147-148)**:
```typescript
// Get proposal count from user's "Proposals List" array
const proposalsList = userData['Proposals List'];
```

**Analysis**: The validate handler appears to just read the value and count length. After migration, it will receive a native array which JavaScript can handle the same way. No changes needed if the code just does:
```typescript
const proposalCount = (proposalsList || []).length;
```

**Dependencies**: Migration must complete first
**Verification**: Token validation returns correct proposal count

---

## 5. Execution Order

### Phase 1: Database Migration (CRITICAL - Do First)
| Step | Action | Rollback |
|------|--------|----------|
| 1.1 | Create backup of user table | N/A |
| 1.2 | Apply migration SQL | Restore from backup |
| 1.3 | Verify data integrity | Restore from backup |
| 1.4 | Run integrity check function | N/A |

### Phase 2: Backend Edge Function Updates
| Step | Action | Dependency |
|------|--------|------------|
| 2.1 | Update `proposal/actions/create.ts` | Phase 1 complete |
| 2.2 | Update `proposal/lib/types.ts` comments | None |
| 2.3 | Deploy Edge Functions | 2.1, 2.2 |

### Phase 3: Frontend Updates
| Step | Action | Dependency |
|------|--------|------------|
| 3.1 | Update `userProposalQueries.js` | Phase 1 complete |
| 3.2 | Test guest-proposals page | 3.1 |

### Phase 4: Verification & Cleanup
| Step | Action | Dependency |
|------|--------|------------|
| 4.1 | Run full test suite | Phase 2, 3 |
| 4.2 | Create new proposal (end-to-end test) | 4.1 |
| 4.3 | Verify proposal count in avatar dropdown | 4.2 |
| 4.4 | Update DATABASE_SCHEMA_OVERVIEW.md | 4.3 |

### Safe Stopping Points
- After Phase 1: Database migrated, old code still works (graceful degradation)
- After Phase 2: Backend updated, frontend may need deployment
- After Phase 3: Full migration complete

---

## 6. Risk Assessment

### Potential Breaking Changes
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Verify count before/after, backup table |
| Application code breaks | Medium | Medium | Deploy backend first, then frontend |
| Supabase returns unexpected format | Low | Medium | Test locally before production |

### Edge Cases to Watch
1. **Empty arrays**: Ensure `'{}'::text[]` is handled as empty array
2. **Null values**: Ensure null is distinct from empty array
3. **Concurrent updates**: During migration window, a proposal creation could fail

### Rollback Considerations
1. **Database**: Keep backup of original column for 7 days
2. **Code**: Can revert to parsing logic if needed (backwards compatible)
3. **Full rollback**: Restore table from backup, redeploy old code

---

## 7. Verification Checklist

### Database Verification
- [ ] Migration completes without errors
- [ ] `SELECT COUNT(*) FROM "user" WHERE "Proposals List" IS NOT NULL` returns 312
- [ ] `SELECT SUM(array_length("Proposals List", 1)) FROM "user"` returns 1195
- [ ] `SELECT * FROM check_proposals_list_integrity()` returns 0 rows
- [ ] Column type is `text[]` in information_schema

### Application Verification
- [ ] Guest proposals page loads all proposals
- [ ] Host proposals page loads all proposals
- [ ] Creating a new proposal adds ID to user's Proposals List
- [ ] Avatar dropdown shows correct proposal count
- [ ] No console errors related to Proposals List parsing

### Definition of Done
1. Column type changed from `jsonb` to `text[]`
2. All proposal data preserved (1,195 references)
3. Integrity check function created and returns empty
4. Application code simplified
5. All verification tests pass
6. Documentation updated

---

## 8. Reference Appendix

### All File Paths Mentioned
```
# Database
supabase/migrations/YYYYMMDDHHMMSS_convert_proposals_list_to_text_array.sql (NEW)

# Frontend
app/src/lib/proposals/userProposalQueries.js

# Backend Edge Functions
supabase/functions/proposal/actions/create.ts
supabase/functions/proposal/lib/types.ts
supabase/functions/auth-user/handlers/validate.ts

# Documentation
DATABASE_SCHEMA_OVERVIEW.md (or .claude/plans/Done/DATABASE_SCHEMA_OVERVIEW.md)
```

### Key Code Patterns

**Before (JSONB parsing)**:
```javascript
// Frontend
if (typeof proposalsList === 'string') {
  proposalIds = JSON.parse(proposalsList);
}

// Backend
const existingProposals = parseJsonArray<string>(guestData["Proposals List"], "Proposals List");
```

**After (native array)**:
```javascript
// Frontend
return Array.isArray(proposalsList) ? proposalsList : [];

// Backend
const existingProposals: string[] = guestData["Proposals List"] || [];
```

### SQL Verification Queries
```sql
-- Check column type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'Proposals List';

-- Count references
SELECT SUM(array_length("Proposals List", 1)) FROM public."user";

-- Check integrity
SELECT * FROM check_proposals_list_integrity();
```

### Related Documentation
- [DATABASE_SCHEMA_OVERVIEW.md](.claude/plans/Done/DATABASE_SCHEMA_OVERVIEW.md) - Table schemas
- [supabase/CLAUDE.md](../../supabase/CLAUDE.md) - Edge Function patterns
- [app/src/lib/proposals/](../../app/src/lib/proposals/) - Proposal utilities

---

## Notes on Foreign Key Constraint

**Why FK on array elements is not possible in PostgreSQL**:
PostgreSQL foreign key constraints work on scalar column values, not array elements. The standard SQL approach would be a junction table:

```sql
-- Alternative design (NOT implementing in this cleanup)
CREATE TABLE user_proposals (
  user_id text REFERENCES "user"(_id),
  proposal_id text REFERENCES proposal(_id),
  PRIMARY KEY (user_id, proposal_id)
);
```

This cleanup maintains the array design for backwards compatibility with Bubble.io's data model. The `check_proposals_list_integrity()` function provides periodic validation.

---

**Plan Version**: 1.0
**Author**: cleanup-planner agent
**Ready for Execution**: Yes
