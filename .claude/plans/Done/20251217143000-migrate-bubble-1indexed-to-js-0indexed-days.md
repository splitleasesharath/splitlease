# Implementation Plan: Migrate from Bubble 1-Indexed to JavaScript 0-Indexed Days

## Overview

This plan provides a comprehensive, phased approach to migrate the Split Lease application from Bubble's 1-indexed day system (Sun=1 through Sat=7) to JavaScript's native 0-indexed system (Sun=0 through Sat=6). Since Bubble is being phased out completely, no conversion functions need to be maintained post-migration.

## Success Criteria

- [ ] All reference tables (`os_days`, `os_nights`) use 0-6 indexing
- [ ] All existing listing day data migrated to 0-6 format
- [ ] All existing proposal day data migrated to 0-6 format
- [ ] All `adaptDays*` conversion functions removed from frontend
- [ ] All `adaptDays*` conversion functions removed from Edge Functions
- [ ] All frontend components work without conversion logic
- [ ] No data corruption during migration
- [ ] Each phase independently verifiable and reversible

---

## Context & References

### Current State Analysis

#### Database Day Fields - LISTINGS Table
| Column Name | Current Data Format | Notes |
|-------------|---------------------|-------|
| `Days Available (List of Days)` | Mixed: `[2,3,4,5,6]` (numbers 1-7), `["Monday","Tuesday",...]` (strings), stringified JSON | JSONB column |
| `Nights Available (List of Nights)` | Mixed: same inconsistency as Days | JSONB column |
| `Nights Available (numbers)` | `[2,3,4,5,6]` (1-based numbers) | JSONB column |
| `Days Not Available` | Same format as above | JSONB column |
| `Nights Not Available` | Same format as above | JSONB column |

#### Database Day Fields - PROPOSALS Table
| Column Name | Current Data Format | Notes |
|-------------|---------------------|-------|
| `Days Selected` | `[2,3,4,5,6]` (1-based) or `["Sunday",...]` (strings) | JSONB |
| `Days Available` | Same mixed format | JSONB |
| `Nights Selected (Nights list)` | `["Monday",...]` (strings) or `[2,3,4,5]` (1-based) | JSONB |
| `Complementary Days` | Same mixed format | JSONB |
| `Complementary Nights` | Same mixed format | JSONB |
| `check in day` | `"2"` (string number 1-7) or `"Monday"` (day name) | TEXT |
| `check out day` | `"7"` (string number 1-7) or `"Saturday"` (day name) | TEXT |
| `hc check in day` | Same as above (host counteroffer) | TEXT |
| `hc check out day` | Same as above | TEXT |
| `hc days selected` | Same as Days Selected | JSONB |
| `hc nights selected` | Same as Nights Selected | JSONB |

#### Reference Tables (os_days, os_nights)
Current State:
```
id | name      | display   | bubble_number
1  | sunday    | Sunday    | 1
2  | monday    | Monday    | 2
...
7  | saturday  | Saturday  | 7
```
**Issue**: `id` column is 1-7, needs to be 0-6

### Relevant Files

#### Frontend - Day Conversion Functions (TO BE REMOVED)
| File | Purpose | Action |
|------|---------|--------|
| `app/src/logic/processors/external/adaptDaysFromBubble.js` | Convert Bubble 1-7 to JS 0-6 | DELETE |
| `app/src/logic/processors/external/adaptDaysToBubble.js` | Convert JS 0-6 to Bubble 1-7 | DELETE |
| `app/src/logic/processors/external/adaptDayFromBubble.js` | Single day conversion from Bubble | DELETE |
| `app/src/logic/processors/external/adaptDayToBubble.js` | Single day conversion to Bubble | DELETE |
| `app/src/logic/processors/index.js` | Barrel exports for processors | Remove exports |
| `app/src/lib/dayUtils.js` | toBubbleDays, fromBubbleDays functions | DELETE or refactor |

#### Frontend - Files Using Day Conversion
| File | Current Usage | Changes Needed |
|------|---------------|----------------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | `adaptDaysToBubble` on line 1170 | Remove conversion |
| `app/src/islands/pages/SearchPage.jsx` | `adaptDaysToBubble` on line 2090 | Remove conversion |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | `adaptDaysToBubble` on line 911 | Remove conversion |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` | Uses `bubbleDays` mapping on line 275-276 | Remove conversion |

#### Frontend - Constants
| File | Current State | Changes Needed |
|------|---------------|----------------|
| `app/src/lib/constants.js` | `BUBBLE_DAY_NUMBERS` (1-7), `DAYS` (0-6) | Remove BUBBLE_DAY_NUMBERS |

#### Edge Functions - Day Conversion
| File | Purpose | Action |
|------|---------|--------|
| `supabase/functions/proposal/lib/dayConversion.ts` | Day conversion utilities | DELETE |
| `supabase/functions/bubble_sync/lib/transformer.ts` | Bubble data transformation | Remove day conversion logic |
| `supabase/functions/proposal/actions/suggest.ts` | Uses `adaptDaysFromBubble` | Remove conversion |

### Existing Patterns to Follow

1. **No Fallback Principle**: Fail fast on invalid data, surface errors clearly
2. **Four-Layer Logic Architecture**: calculators -> rules -> processors -> workflows
3. **Atomic Operations**: Write-Read-Write pattern for consistency
4. **Queue-Based Sync**: Operations via sync_queue table (being deprecated with Bubble)

---

## Implementation Steps

### Phase 0: Pre-Migration Analysis and Backup

**Purpose:** Create safety net before any changes

#### Step 0.1: Create Data Backup
**Files:** Database (Supabase)
**Purpose:** Full backup of affected tables
**Details:**
```sql
-- Create backup schema
CREATE SCHEMA IF NOT EXISTS migration_backup;

-- Backup os_days and os_nights
CREATE TABLE migration_backup.os_days_backup AS SELECT * FROM reference_table.os_days;
CREATE TABLE migration_backup.os_nights_backup AS SELECT * FROM reference_table.os_nights;

-- Backup listing day fields
CREATE TABLE migration_backup.listing_days_backup AS
SELECT _id,
       "Days Available (List of Days)",
       "Nights Available (List of Nights) ",
       "Nights Available (numbers)",
       "Days Not Available",
       "Nights Not Available"
FROM public.listing;

-- Backup proposal day fields
CREATE TABLE migration_backup.proposal_days_backup AS
SELECT _id,
       "Days Selected",
       "Days Available",
       "Nights Selected (Nights list)",
       "Complementary Days",
       "Complementary Nights",
       "check in day",
       "check out day",
       "hc check in day",
       "hc check out day",
       "hc days selected",
       "hc nights selected"
FROM public.proposal;
```
**Validation:** Verify row counts match between backup and original tables

#### Step 0.2: Document Current Data State
**Files:** SQL analysis
**Purpose:** Understand data distribution before migration
**Details:**
```sql
-- Analyze listing day formats
SELECT
  CASE
    WHEN "Days Available (List of Days)"::text ~ '^\[?[0-9,\s]+\]?$' THEN 'numeric_array'
    WHEN "Days Available (List of Days)"::text ~ '"[A-Za-z]' THEN 'string_array'
    ELSE 'other'
  END as format_type,
  COUNT(*) as count
FROM public.listing
WHERE "Days Available (List of Days)" IS NOT NULL
GROUP BY format_type;
```
**Validation:** Document results for comparison after migration

---

### Phase 1: Update Reference Tables (os_days, os_nights)

**Purpose:** Update lookup tables to use 0-6 indexing as source of truth

#### Step 1.1: Add New Columns for 0-Based Index
**Files:** `reference_table.os_days`, `reference_table.os_nights`
**Purpose:** Add js_index column without breaking existing code
**Details:**
```sql
-- Add js_index column to os_days
ALTER TABLE reference_table.os_days
ADD COLUMN IF NOT EXISTS js_index integer;

-- Populate with 0-based values (current id - 1)
UPDATE reference_table.os_days SET js_index = id - 1;

-- Repeat for os_nights
ALTER TABLE reference_table.os_nights
ADD COLUMN IF NOT EXISTS js_index integer;

UPDATE reference_table.os_nights SET js_index = id - 1;
```
**Validation:**
```sql
SELECT id, js_index, name, display, bubble_number FROM reference_table.os_days ORDER BY id;
-- Expected: id=1,js_index=0,name=sunday | id=2,js_index=1,name=monday | etc.
```

#### Step 1.2: Update Primary Key to 0-Based
**Files:** `reference_table.os_days`, `reference_table.os_nights`
**Purpose:** Change id column to 0-6 indexing
**Details:**
```sql
-- First, drop any foreign key constraints (check if any exist)
-- Note: These tables are referenced by name/display, not by id typically

-- Update os_days id to be 0-based
UPDATE reference_table.os_days SET id = id - 1;

-- Remove bubble_number column (no longer needed)
ALTER TABLE reference_table.os_days DROP COLUMN IF EXISTS bubble_number;
ALTER TABLE reference_table.os_days DROP COLUMN IF EXISTS bubble_number_text;
ALTER TABLE reference_table.os_days DROP COLUMN IF EXISTS js_index;

-- Update os_nights id to be 0-based
UPDATE reference_table.os_nights SET id = id - 1;

ALTER TABLE reference_table.os_nights DROP COLUMN IF EXISTS bubble_number;
ALTER TABLE reference_table.os_nights DROP COLUMN IF EXISTS bubble_number_text;
ALTER TABLE reference_table.os_nights DROP COLUMN IF EXISTS js_index;
```
**Validation:**
```sql
SELECT * FROM reference_table.os_days ORDER BY id;
-- Expected: id=0,name=sunday | id=1,name=monday | ... | id=6,name=saturday
```

**Rollback Strategy:**
```sql
-- Restore from backup
TRUNCATE reference_table.os_days;
INSERT INTO reference_table.os_days SELECT * FROM migration_backup.os_days_backup;
```

---

### Phase 2: Migrate Listing Day Data

**Purpose:** Convert all listing day/night fields from 1-7 to 0-6

#### Step 2.1: Normalize Mixed Data Formats
**Files:** `public.listing`
**Purpose:** Convert all formats to consistent numeric arrays
**Details:**
```sql
-- Create helper function for day name to 0-index conversion
CREATE OR REPLACE FUNCTION convert_day_name_to_index(day_name text)
RETURNS integer AS $$
BEGIN
  RETURN CASE LOWER(TRIM(day_name))
    WHEN 'sunday' THEN 0
    WHEN 'monday' THEN 1
    WHEN 'tuesday' THEN 2
    WHEN 'wednesday' THEN 3
    WHEN 'thursday' THEN 4
    WHEN 'friday' THEN 5
    WHEN 'saturday' THEN 6
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to convert 1-based number to 0-based
CREATE OR REPLACE FUNCTION convert_bubble_day_to_js(bubble_day integer)
RETURNS integer AS $$
BEGIN
  IF bubble_day >= 1 AND bubble_day <= 7 THEN
    RETURN bubble_day - 1;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to migrate a JSONB day array from any format to 0-indexed integers
CREATE OR REPLACE FUNCTION migrate_days_to_js_index(day_array jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  elem jsonb;
  converted integer;
BEGIN
  IF day_array IS NULL THEN
    RETURN NULL;
  END IF;

  FOR elem IN SELECT * FROM jsonb_array_elements(day_array)
  LOOP
    -- Check if element is a number (1-7 Bubble format)
    IF jsonb_typeof(elem) = 'number' THEN
      converted := convert_bubble_day_to_js((elem::text)::integer);
    -- Check if element is a string (day name)
    ELSIF jsonb_typeof(elem) = 'string' THEN
      converted := convert_day_name_to_index(elem::text);
    ELSE
      converted := NULL;
    END IF;

    IF converted IS NOT NULL THEN
      result := result || to_jsonb(converted);
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### Step 2.2: Migrate Listing Day Fields
**Files:** `public.listing`
**Purpose:** Apply conversion to all day/night fields
**Details:**
```sql
-- Migrate Days Available (List of Days)
UPDATE public.listing
SET "Days Available (List of Days)" = migrate_days_to_js_index("Days Available (List of Days)")
WHERE "Days Available (List of Days)" IS NOT NULL;

-- Migrate Nights Available (List of Nights)
UPDATE public.listing
SET "Nights Available (List of Nights) " = migrate_days_to_js_index("Nights Available (List of Nights) ")
WHERE "Nights Available (List of Nights) " IS NOT NULL;

-- Migrate Nights Available (numbers)
UPDATE public.listing
SET "Nights Available (numbers)" = migrate_days_to_js_index("Nights Available (numbers)")
WHERE "Nights Available (numbers)" IS NOT NULL;

-- Migrate Days Not Available
UPDATE public.listing
SET "Days Not Available" = migrate_days_to_js_index("Days Not Available")
WHERE "Days Not Available" IS NOT NULL;

-- Migrate Nights Not Available
UPDATE public.listing
SET "Nights Not Available" = migrate_days_to_js_index("Nights Not Available")
WHERE "Nights Not Available" IS NOT NULL;
```
**Validation:**
```sql
-- Verify conversion
SELECT _id, "Days Available (List of Days)"
FROM public.listing
WHERE "Days Available (List of Days)" IS NOT NULL
LIMIT 10;
-- Expected: All values should be arrays with integers 0-6

-- Verify no values > 6
SELECT _id, "Days Available (List of Days)"
FROM public.listing
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements("Days Available (List of Days)") AS elem
  WHERE (elem::text)::integer > 6
);
-- Expected: 0 rows
```

**Rollback Strategy:**
```sql
UPDATE public.listing l
SET
  "Days Available (List of Days)" = b."Days Available (List of Days)",
  "Nights Available (List of Nights) " = b."Nights Available (List of Nights) ",
  "Nights Available (numbers)" = b."Nights Available (numbers)",
  "Days Not Available" = b."Days Not Available",
  "Nights Not Available" = b."Nights Not Available"
FROM migration_backup.listing_days_backup b
WHERE l._id = b._id;
```

---

### Phase 3: Migrate Proposal Day Data

**Purpose:** Convert all proposal day/night fields from 1-7 to 0-6

#### Step 3.1: Create Check-in/Check-out Day Converter
**Files:** SQL function
**Purpose:** Convert check-in/out day from "2" to "1" or "Monday" to "Monday"
**Details:**
```sql
-- Function to convert check in/out day text values
CREATE OR REPLACE FUNCTION convert_check_day_to_js_index(day_value text)
RETURNS text AS $$
DECLARE
  num_value integer;
BEGIN
  IF day_value IS NULL THEN
    RETURN NULL;
  END IF;

  -- Try to parse as number
  BEGIN
    num_value := day_value::integer;
    IF num_value >= 1 AND num_value <= 7 THEN
      RETURN (num_value - 1)::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Not a number, check if it's a day name (keep as-is or convert to index)
    num_value := convert_day_name_to_index(day_value);
    IF num_value IS NOT NULL THEN
      RETURN num_value::text;
    END IF;
  END;

  -- Return original if conversion fails
  RETURN day_value;
END;
$$ LANGUAGE plpgsql;
```

#### Step 3.2: Migrate Proposal Day Fields
**Files:** `public.proposal`
**Purpose:** Apply conversion to all proposal day/night fields
**Details:**
```sql
-- Migrate JSONB array fields
UPDATE public.proposal
SET "Days Selected" = migrate_days_to_js_index("Days Selected")
WHERE "Days Selected" IS NOT NULL;

UPDATE public.proposal
SET "Days Available" = migrate_days_to_js_index("Days Available")
WHERE "Days Available" IS NOT NULL;

UPDATE public.proposal
SET "Nights Selected (Nights list)" = migrate_days_to_js_index("Nights Selected (Nights list)")
WHERE "Nights Selected (Nights list)" IS NOT NULL;

UPDATE public.proposal
SET "Complementary Days" = migrate_days_to_js_index("Complementary Days")
WHERE "Complementary Days" IS NOT NULL;

UPDATE public.proposal
SET "Complementary Nights" = migrate_days_to_js_index("Complementary Nights")
WHERE "Complementary Nights" IS NOT NULL;

UPDATE public.proposal
SET "hc days selected" = migrate_days_to_js_index("hc days selected")
WHERE "hc days selected" IS NOT NULL;

UPDATE public.proposal
SET "hc nights selected" = migrate_days_to_js_index("hc nights selected")
WHERE "hc nights selected" IS NOT NULL;

-- Migrate text check in/out fields
UPDATE public.proposal
SET "check in day" = convert_check_day_to_js_index("check in day")
WHERE "check in day" IS NOT NULL;

UPDATE public.proposal
SET "check out day" = convert_check_day_to_js_index("check out day")
WHERE "check out day" IS NOT NULL;

UPDATE public.proposal
SET "hc check in day" = convert_check_day_to_js_index("hc check in day")
WHERE "hc check in day" IS NOT NULL;

UPDATE public.proposal
SET "hc check out day" = convert_check_day_to_js_index("hc check out day")
WHERE "hc check out day" IS NOT NULL;
```
**Validation:**
```sql
-- Verify conversion
SELECT _id, "Days Selected", "check in day", "check out day"
FROM public.proposal
WHERE "Days Selected" IS NOT NULL
LIMIT 10;

-- Verify no values > 6 in arrays
SELECT _id, "Days Selected"
FROM public.proposal
WHERE "Days Selected" IS NOT NULL
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements("Days Selected") AS elem
  WHERE (elem::text)::integer > 6
);
-- Expected: 0 rows

-- Verify check in/out days are 0-6 or day names
SELECT DISTINCT "check in day" FROM public.proposal WHERE "check in day" IS NOT NULL;
-- Expected: Values should be '0' through '6' or day names
```

**Rollback Strategy:**
```sql
UPDATE public.proposal p
SET
  "Days Selected" = b."Days Selected",
  "Days Available" = b."Days Available",
  "Nights Selected (Nights list)" = b."Nights Selected (Nights list)",
  "Complementary Days" = b."Complementary Days",
  "Complementary Nights" = b."Complementary Nights",
  "check in day" = b."check in day",
  "check out day" = b."check out day",
  "hc check in day" = b."hc check in day",
  "hc check out day" = b."hc check out day",
  "hc days selected" = b."hc days selected",
  "hc nights selected" = b."hc nights selected"
FROM migration_backup.proposal_days_backup b
WHERE p._id = b._id;
```

---

### Phase 4: Update Edge Functions

**Purpose:** Remove day conversion logic from backend

#### Step 4.1: Delete Day Conversion Module
**Files:** `supabase/functions/proposal/lib/dayConversion.ts`
**Purpose:** Remove entire file
**Details:**
- Delete the file entirely
- Update any imports in other files

**Validation:** Edge function should compile without errors

#### Step 4.2: Update Suggest Action
**Files:** `supabase/functions/proposal/actions/suggest.ts`
**Purpose:** Remove adaptDaysFromBubble import and usage
**Details:**
```typescript
// REMOVE this import:
// import { adaptDaysFromBubble } from "../lib/dayConversion.ts";

// Line 152: Change from:
// const guestDaysJS = adaptDaysFromBubble(originProposal["Days Selected"] || []);
// To:
const guestDaysJS = originProposal["Days Selected"] || [];

// Line 192: Change from:
// const listingDaysJS = adaptDaysFromBubble(listing["Days Available (List of Days)"] || []);
// To:
const listingDaysJS = listing["Days Available (List of Days)"] || [];
```
**Validation:** Test suggest action with real proposal data

#### Step 4.3: Update Bubble Sync Transformer
**Files:** `supabase/functions/bubble_sync/lib/transformer.ts`
**Purpose:** Remove day conversion functions
**Details:**
- Remove `adaptDaysToBubble` function (lines 120-127)
- Remove `adaptDaysFromBubble` function (lines 133-140)
- Remove `DAY_INDEX_FIELDS` from `FIELD_TYPES` (lines 64-68)
- Update `transformFieldForBubble` to not convert day fields

**Validation:** If Bubble sync is still in use, verify transformed data is correct

**Rollback Strategy:** Revert git changes to Edge Function files

---

### Phase 5: Update Frontend Code

**Purpose:** Remove all day conversion logic from frontend

#### Step 5.1: Delete Day Conversion Files
**Files:**
- `app/src/logic/processors/external/adaptDaysFromBubble.js`
- `app/src/logic/processors/external/adaptDaysToBubble.js`
- `app/src/logic/processors/external/adaptDayFromBubble.js`
- `app/src/logic/processors/external/adaptDayToBubble.js`
**Purpose:** Remove files completely
**Validation:** Confirm files deleted

#### Step 5.2: Update Processor Index
**Files:** `app/src/logic/processors/index.js`
**Purpose:** Remove exports for deleted files
**Details:**
```javascript
// REMOVE these lines:
// export { adaptDaysToBubble } from './external/adaptDaysToBubble.js'
// export { adaptDaysFromBubble } from './external/adaptDaysFromBubble.js'
```
**Validation:** Import test passes

#### Step 5.3: Update ViewSplitLeasePage
**Files:** `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Purpose:** Remove day conversion on proposal creation
**Details:**
```javascript
// Line 37: REMOVE import
// import { adaptDaysToBubble } from '../../logic/processors/external/adaptDaysToBubble.js';

// Around line 1170: Change from:
// const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });
// To:
const daysToSubmit = daysInJsFormat; // Already 0-indexed, no conversion needed
```
**Validation:** Create a test proposal, verify days stored as 0-6

#### Step 5.4: Update SearchPage
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Remove day conversion
**Details:**
```javascript
// Line 24: REMOVE import
// import { adaptDaysToBubble } from '../../logic/processors/external/adaptDaysToBubble.js';

// Around line 2090: Change from:
// const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });
// To:
const daysToSubmit = daysInJsFormat;
```
**Validation:** Search with day filters works correctly

#### Step 5.5: Update FavoriteListingsPage
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Remove day conversion
**Details:**
```javascript
// Line 26: REMOVE import
// import { adaptDaysToBubble } from '../../../logic/processors/external/adaptDaysToBubble.js';

// Around line 911: Change from:
// const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });
// To:
const daysToSubmit = daysInJsFormat;
```
**Validation:** Create proposal from favorites works correctly

#### Step 5.6: Update PricingEditSection
**Files:** `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`
**Purpose:** Remove Bubble day mapping
**Details:**
```javascript
// Around lines 275-276: Change from:
// const bubbleDays = selectedNights.map((n) => nightMap[n]).sort();
// updates['Days Available (List of Days)'] = JSON.stringify(bubbleDays);
// To (use 0-indexed directly):
const jsDays = selectedNights.map((n) => nightMapJs[n]).sort();
updates['Days Available (List of Days)'] = JSON.stringify(jsDays);

// Update nightMap to use 0-6 instead of 1-7
```
**Validation:** Edit listing pricing, verify days saved as 0-6

#### Step 5.7: Update/Delete dayUtils.js
**Files:** `app/src/lib/dayUtils.js`
**Purpose:** Remove Bubble conversion functions
**Details:**
- Remove `toBubbleDays` function
- Remove `fromBubbleDays` function
- Remove `dayToBubble` function
- Remove `dayFromBubble` function
- Remove `isValidBubbleDaysArray` function
- Keep `isValidDaysArray` (validates 0-6)

**Validation:** No imports of removed functions

#### Step 5.8: Update Constants
**Files:** `app/src/lib/constants.js`
**Purpose:** Remove Bubble-specific constants
**Details:**
```javascript
// REMOVE lines 74-83:
// export const BUBBLE_DAY_NUMBERS = {
//   SUNDAY: 1,
//   MONDAY: 2,
//   ...
// };

// Update comments to reflect 0-based is the only standard
```
**Validation:** Grep for BUBBLE_DAY_NUMBERS returns no results

**Rollback Strategy:** Revert git changes to frontend files

---

### Phase 6: Update Documentation

**Purpose:** Remove references to day conversion in documentation

#### Step 6.1: Update Main CLAUDE.md
**Files:** `.claude/CLAUDE.md`
**Purpose:** Remove Day Indexing section or update it
**Details:**
- Remove the Day Indexing table showing Bubble vs JS
- Update to show only JavaScript 0-6 standard
- Remove references to `adaptDaysFromBubble/adaptDaysToBubble`

#### Step 6.2: Update App CLAUDE.md
**Files:** `app/CLAUDE.md`, `app/src/CLAUDE.md`
**Purpose:** Update documentation about day handling
**Details:**
- Remove CRITICAL_CONVENTIONS section about day indexing conversion
- Update to document that all days use 0-6 indexing

#### Step 6.3: Update Supabase CLAUDE.md
**Files:** `supabase/CLAUDE.md`
**Purpose:** Update documentation about day handling
**Details:**
- Remove references to day conversion at API boundaries
- Update CRITICAL_NOTES section

#### Step 6.4: Update Database Schema Documentation
**Files:** `.claude/plans/Documents/20251216120000-database-schema-structure.md`
**Purpose:** Update to reflect new day indexing
**Details:**
- Update the "Day Indexing (CRITICAL)" section
- Note that all days are now 0-6 JavaScript standard

**Validation:** Grep for "1-7" or "Bubble" day references in documentation

---

### Phase 7: Cleanup

**Purpose:** Remove migration artifacts

#### Step 7.1: Remove Helper Functions
**Files:** Database
**Purpose:** Remove migration helper functions
**Details:**
```sql
DROP FUNCTION IF EXISTS convert_day_name_to_index(text);
DROP FUNCTION IF EXISTS convert_bubble_day_to_js(integer);
DROP FUNCTION IF EXISTS migrate_days_to_js_index(jsonb);
DROP FUNCTION IF EXISTS convert_check_day_to_js_index(text);
```

#### Step 7.2: Keep Backup Tables (30 Days)
**Purpose:** Maintain rollback capability for 30 days
**Details:**
- Set calendar reminder to drop backup schema after 30 days
```sql
-- After 30 days:
DROP SCHEMA IF EXISTS migration_backup CASCADE;
```

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Null day arrays | Keep as NULL, no conversion needed |
| Empty arrays `[]` | Keep as empty array |
| Mixed formats in same array | Migration function handles all formats |
| Invalid day values (8, -1, etc.) | Migration function skips invalid values |
| Stringified JSON (`"[1,2,3]"`) | Parse JSON first, then convert |
| Day names with spaces/casing | Normalize with LOWER(TRIM()) before matching |
| Existing data with 0-indexed values | Already correct, no change needed |

---

## Testing Considerations

### Unit Tests
- Verify `isValidDaysArray` works with 0-6 range
- Verify day name to index conversion for all 7 days
- Verify proposal creation stores 0-indexed days
- Verify listing update stores 0-indexed days

### Integration Tests
1. **Proposal Creation Flow**
   - Create proposal with selected days
   - Verify days stored as 0-6 in database
   - Verify proposal displays correct days in UI

2. **Listing Edit Flow**
   - Edit listing availability days
   - Verify days stored as 0-6 in database
   - Verify listing displays correct days in search

3. **Search Filter Flow**
   - Apply day filters to search
   - Verify correct listings returned

### Regression Tests
- Full proposal creation end-to-end
- Full listing creation end-to-end
- Schedule selector component interaction
- Guest proposals page displays correctly
- Host proposals page displays correctly

---

## Rollback Strategy

### Phase 1 Rollback (Reference Tables)
```sql
TRUNCATE reference_table.os_days;
INSERT INTO reference_table.os_days SELECT * FROM migration_backup.os_days_backup;
TRUNCATE reference_table.os_nights;
INSERT INTO reference_table.os_nights SELECT * FROM migration_backup.os_nights_backup;
```

### Phase 2-3 Rollback (Data Tables)
```sql
-- Listings
UPDATE public.listing l
SET
  "Days Available (List of Days)" = b."Days Available (List of Days)",
  -- ... other fields
FROM migration_backup.listing_days_backup b
WHERE l._id = b._id;

-- Proposals
UPDATE public.proposal p
SET
  "Days Selected" = b."Days Selected",
  -- ... other fields
FROM migration_backup.proposal_days_backup b
WHERE p._id = b._id;
```

### Phase 4-5 Rollback (Code)
```bash
git revert <commit-hash-of-edge-function-changes>
git revert <commit-hash-of-frontend-changes>
```

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Database access for migrations | Required | Need admin access to Supabase |
| Bubble sync still active? | Check | If still syncing, need to coordinate cutoff |
| No active users during migration | Recommended | Schedule during low-traffic period |
| Edge Function deployment | After code changes | Requires `supabase functions deploy` |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data corruption during migration | Low | High | Backup tables, phase-by-phase validation |
| Users creating data during migration | Medium | Medium | Schedule during low-traffic, quick migration |
| Missing conversion point in code | Medium | Medium | Comprehensive grep search, testing |
| Rollback needed after partial migration | Low | High | Phase-by-phase approach with clear rollback steps |
| Performance impact from migration | Low | Low | Run during off-hours, batch updates |

---

## Execution Checklist

- [ ] Phase 0: Backup all affected tables
- [ ] Phase 0: Document current data state
- [ ] Phase 1: Add js_index to reference tables
- [ ] Phase 1: Update reference table primary keys
- [ ] Phase 2: Create migration helper functions
- [ ] Phase 2: Migrate listing day fields
- [ ] Phase 2: Validate listing migration
- [ ] Phase 3: Migrate proposal day fields
- [ ] Phase 3: Validate proposal migration
- [ ] Phase 4: Update Edge Functions
- [ ] Phase 4: Deploy Edge Functions
- [ ] Phase 5: Update frontend code
- [ ] Phase 5: Test all user flows
- [ ] Phase 6: Update documentation
- [ ] Phase 7: Schedule cleanup of backup tables

---

## Files Referenced

### Database
- `reference_table.os_days`
- `reference_table.os_nights`
- `public.listing`
- `public.proposal`

### Edge Functions
- `supabase/functions/proposal/lib/dayConversion.ts` (DELETE)
- `supabase/functions/proposal/actions/suggest.ts`
- `supabase/functions/proposal/actions/create.ts`
- `supabase/functions/bubble_sync/lib/transformer.ts`

### Frontend - Processors (DELETE)
- `app/src/logic/processors/external/adaptDaysFromBubble.js`
- `app/src/logic/processors/external/adaptDaysToBubble.js`
- `app/src/logic/processors/external/adaptDayFromBubble.js`
- `app/src/logic/processors/external/adaptDayToBubble.js`
- `app/src/logic/processors/index.js`

### Frontend - Pages
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/pages/SearchPage.jsx`
- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
- `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx`

### Frontend - Utilities
- `app/src/lib/dayUtils.js`
- `app/src/lib/constants.js`

### Frontend - Components
- `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx`
- `app/src/islands/shared/ListingScheduleSelector.jsx`
- `app/src/islands/shared/SearchScheduleSelector.jsx`
- `app/src/islands/shared/HostScheduleSelector/SimpleHostScheduleSelector.jsx`

### Documentation
- `.claude/CLAUDE.md`
- `app/CLAUDE.md`
- `app/src/CLAUDE.md`
- `supabase/CLAUDE.md`
- `.claude/plans/Documents/20251216120000-database-schema-structure.md`

---

**Plan Version:** 1.0
**Created:** 2025-12-17
**Author:** Claude (Implementation Planning Architect)
**Estimated Duration:** 4-8 hours (spread across multiple sessions recommended)
