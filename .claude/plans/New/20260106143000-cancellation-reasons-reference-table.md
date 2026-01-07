# Implementation Plan: Cancellation Reasons Reference Table

## Overview
Create a new `cancellation_reasons` table in Supabase's `reference_table` schema to store proposal cancellation reasons, then update the frontend to fetch these reasons dynamically instead of using hardcoded values in `getCancellationReasonOptions()`.

## Success Criteria
- [ ] New `reference_table.cancellation_reasons` table created with appropriate schema
- [ ] Table seeded with existing cancellation reasons
- [ ] RLS policies configured for read access
- [ ] Frontend `getCancellationReasonOptions()` refactored to return data from the table
- [ ] `CancelProposalModal` handles loading state while fetching reasons
- [ ] `dataLookups.js` includes new initialization and lookup functions for cancellation reasons
- [ ] No regression in existing cancellation flow functionality

---

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/migrations/` | Database migrations | Add new migration for table creation |
| `app/src/lib/dataLookups.js` | Reference data caching | Add cancellation reasons initialization and lookup functions |
| `app/src/lib/constants.js` | Database table constants | Add new table name constant |
| `app/src/logic/rules/proposals/proposalRules.js` | Hardcoded cancellation reasons | Refactor `getCancellationReasonOptions()` to use lookup |
| `app/src/logic/rules/index.js` | Rules exports | No change needed (already exports function) |
| `app/src/islands/modals/CancelProposalModal.jsx` | Modal using reasons | Add loading state handling |

### Related Documentation
- `app/src/lib/dataLookups.js` - Pattern for initializing and caching reference table data
- `supabase/migrations/20251214_create_get_email_template_function.sql` - Example of granting access to `reference_table` schema
- `.claude/Documentation/Database/REFERENCE_TABLES_FK_FIELDS.md` - Reference table patterns

### Existing Patterns to Follow

#### Pattern 1: Reference Table Schema Structure
All reference tables in the `reference_table` schema follow a consistent pattern with `_id` as primary key (for Bubble-compatible tables) or `id` (for native tables). The new table will use `id` since it's a new native table.

```sql
-- Example from existing tables
CREATE TABLE reference_table.os_proposal_status (
  id BIGINT PRIMARY KEY,
  display TEXT NOT NULL,
  sort_order INTEGER
);
```

#### Pattern 2: dataLookups.js Initialization Pattern
```javascript
async function initializeCancellationReasonLookups() {
  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from('TABLE_NAME')
      .select('id, column1, column2');

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(item => {
        lookupCache.cacheKey.set(item.id, {
          field1: item.column1,
          field2: item.column2
        });
      });
      console.log(`Cached ${lookupCache.cacheKey.size} items`);
    }
  } catch (error) {
    console.error('Failed to initialize lookups:', error);
  }
}
```

#### Pattern 3: Synchronous Lookup Function Pattern
```javascript
export function getCancellationReason(reasonId) {
  if (!reasonId) return null;
  const reason = lookupCache.cancellationReasons.get(reasonId);
  if (!reason) {
    console.warn(`Cancellation reason ID not found in cache: ${reasonId}`);
    return null;
  }
  return reason;
}
```

---

## Implementation Steps

### Step 1: Create Database Migration
**Files:** `supabase/migrations/YYYYMMDDHHMMSS_create_cancellation_reasons_table.sql`
**Purpose:** Create the `cancellation_reasons` table in `reference_table` schema

**Details:**
- Create table with columns: `id`, `reason` (text), `display_order` (integer), `is_active` (boolean), `created_at`
- Use `id` as primary key (BIGINT GENERATED ALWAYS AS IDENTITY)
- Add RLS policies for read access
- Seed with existing hardcoded values

```sql
-- Migration: Create cancellation_reasons reference table
-- Purpose: Store proposal cancellation reasons dynamically

-- Create the table in reference_table schema
CREATE TABLE IF NOT EXISTS reference_table.cancellation_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reason TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE reference_table.cancellation_reasons IS 'Proposal cancellation reason options for dropdown selection';

-- Grant access to roles
GRANT SELECT ON reference_table.cancellation_reasons TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE reference_table.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for all users
CREATE POLICY "Allow read access for all users"
  ON reference_table.cancellation_reasons
  FOR SELECT
  USING (true);

-- Seed with existing hardcoded values (in order of display_order)
INSERT INTO reference_table.cancellation_reasons (reason, display_order) VALUES
  ('Found another property', 1),
  ('Changed move-in dates', 2),
  ('Changed budget', 3),
  ('Changed location preference', 4),
  ('No longer need housing', 5),
  ('Host not responsive', 6),
  ('Terms not acceptable', 7),
  ('Other', 99);
```

**Validation:**
- Run migration locally with `supabase db reset`
- Query table to verify data: `SELECT * FROM reference_table.cancellation_reasons ORDER BY display_order;`

---

### Step 2: Update Constants with Table Name
**Files:** `app/src/lib/constants.js`
**Purpose:** Add the new table name to the DATABASE.TABLES constant

**Details:**
- Add `CANCELLATION_REASON: 'cancellation_reasons'` to `DATABASE.TABLES` object

**Location:** Around line 258-269 in constants.js

```javascript
// Before
export const DATABASE = {
  TABLES: {
    BOROUGH: 'zat_geo_borough_toplevel',
    // ... existing tables
    STORAGE: 'zat_features_storageoptions'
  },
  // ...
};

// After
export const DATABASE = {
  TABLES: {
    BOROUGH: 'zat_geo_borough_toplevel',
    // ... existing tables
    STORAGE: 'zat_features_storageoptions',
    CANCELLATION_REASON: 'cancellation_reasons'
  },
  // ...
};
```

**Validation:** No runtime validation needed - this is a constant definition.

---

### Step 3: Add Cancellation Reasons to dataLookups.js
**Files:** `app/src/lib/dataLookups.js`
**Purpose:** Add initialization, caching, and lookup functions for cancellation reasons

**Details:**
1. Add `cancellationReasons` to the `lookupCache` object
2. Create `initializeCancellationReasonLookups()` async function
3. Add the initialization call to `initializeLookups()`
4. Create `getCancellationReasonOption()` synchronous lookup function
5. Create `getAllCancellationReasons()` function for dropdown population
6. Update `refreshLookups()` to clear the new cache
7. Update `getCacheStats()` to include the new cache

**Additions to lookupCache (around line 23-33):**
```javascript
const lookupCache = {
  neighborhoods: new Map(),
  boroughs: new Map(),
  propertyTypes: new Map(),
  amenities: new Map(),
  safety: new Map(),
  houseRules: new Map(),
  parking: new Map(),
  cancellationPolicies: new Map(),
  storage: new Map(),
  cancellationReasons: new Map(), // NEW
  initialized: false
};
```

**New initialization function (add after `initializeStorageLookups`):**
```javascript
/**
 * Fetch and cache all cancellation reasons
 * @returns {Promise<void>}
 */
async function initializeCancellationReasonLookups() {
  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from(DATABASE.TABLES.CANCELLATION_REASON)
      .select('id, reason, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(item => {
        lookupCache.cancellationReasons.set(item.id, {
          reason: item.reason,
          displayOrder: item.display_order
        });
      });
      console.log(`Cached ${lookupCache.cancellationReasons.size} cancellation reasons`);
    }
  } catch (error) {
    console.error('Failed to initialize cancellation reason lookups:', error);
  }
}
```

**Update initializeLookups (around line 66-77):**
```javascript
await Promise.all([
  initializeBoroughLookups(),
  initializeNeighborhoodLookups(),
  initializePropertyTypeLookups(),
  initializeAmenityLookups(),
  initializeSafetyLookups(),
  initializeHouseRuleLookups(),
  initializeParkingLookups(),
  initializeCancellationPolicyLookups(),
  initializeStorageLookups(),
  initializeCancellationReasonLookups() // NEW
]);
```

**New lookup functions (add after getStorageOption):**
```javascript
/**
 * Get cancellation reason by ID (synchronous lookup from cache)
 * @param {number} reasonId - The cancellation reason ID
 * @returns {object|null} The reason data {reason, displayOrder} or null
 */
export function getCancellationReasonOption(reasonId) {
  if (!reasonId) return null;

  const reason = lookupCache.cancellationReasons.get(reasonId);
  if (!reason) {
    console.warn(`Cancellation reason ID not found in cache: ${reasonId}`);
    return null;
  }

  return reason;
}

/**
 * Get all active cancellation reasons as array (for dropdown population)
 * Returns reasons sorted by display_order
 * @returns {Array<{id: number, reason: string}>} Array of reason options
 */
export function getAllCancellationReasons() {
  const reasons = [];
  lookupCache.cancellationReasons.forEach((data, id) => {
    reasons.push({
      id,
      reason: data.reason,
      displayOrder: data.displayOrder
    });
  });
  // Sort by displayOrder (already sorted from DB, but ensure consistency)
  return reasons.sort((a, b) => a.displayOrder - b.displayOrder);
}
```

**Update refreshLookups (around line 622-632):**
```javascript
export async function refreshLookups() {
  lookupCache.neighborhoods.clear();
  lookupCache.boroughs.clear();
  lookupCache.propertyTypes.clear();
  lookupCache.amenities.clear();
  lookupCache.safety.clear();
  lookupCache.houseRules.clear();
  lookupCache.parking.clear();
  lookupCache.cancellationPolicies.clear();
  lookupCache.storage.clear();
  lookupCache.cancellationReasons.clear(); // NEW
  lookupCache.initialized = false;
  await initializeLookups();
}
```

**Update getCacheStats (around line 639-650):**
```javascript
export function getCacheStats() {
  return {
    neighborhoods: lookupCache.neighborhoods.size,
    boroughs: lookupCache.boroughs.size,
    propertyTypes: lookupCache.propertyTypes.size,
    amenities: lookupCache.amenities.size,
    safety: lookupCache.safety.size,
    houseRules: lookupCache.houseRules.size,
    parking: lookupCache.parking.size,
    cancellationPolicies: lookupCache.cancellationPolicies.size,
    storage: lookupCache.storage.size,
    cancellationReasons: lookupCache.cancellationReasons.size, // NEW
    initialized: lookupCache.initialized
  };
}
```

**Validation:**
- Check console for `Cached X cancellation reasons` on app initialization
- Verify `getCacheStats()` includes new cache count

---

### Step 4: Refactor getCancellationReasonOptions in proposalRules.js
**Files:** `app/src/logic/rules/proposals/proposalRules.js`
**Purpose:** Update the function to return data from the lookup cache instead of hardcoded array

**Details:**
- Import `getAllCancellationReasons` from dataLookups
- Refactor `getCancellationReasonOptions()` to use the cached data
- Return just the reason strings (for backward compatibility with existing dropdown)

**Updated imports (around line 16):**
```javascript
import { PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus, getActionsForStatus } from '../../../lib/constants/proposalStatuses.js';
import { getAllCancellationReasons } from '../../../lib/dataLookups.js';
```

**Updated function (replace lines 294-306):**
```javascript
/**
 * Get available cancellation reason options
 * Fetches from cached reference data (initialized via dataLookups.js)
 * Falls back to hardcoded values if cache is empty (for resilience during initialization)
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getAllCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
  // This ensures the modal works even if loaded before dataLookups initializes
  console.warn('[getCancellationReasonOptions] Cache empty, using fallback values');
  return [
    'Found another property',
    'Changed move-in dates',
    'Changed budget',
    'Changed location preference',
    'No longer need housing',
    'Host not responsive',
    'Terms not acceptable',
    'Other'
  ];
}
```

**Validation:**
- Verify dropdown still shows all 8 options
- Check console for any warning about empty cache (should not appear after initial load)

---

### Step 5: Update CancelProposalModal for Loading State (Optional Enhancement)
**Files:** `app/src/islands/modals/CancelProposalModal.jsx`
**Purpose:** Add graceful handling for when reasons are loading

**Details:**
- The current implementation calls `getCancellationReasonOptions()` synchronously on render
- Since `dataLookups.js` initializes on app startup, the cache should be populated
- The fallback in Step 4 handles edge cases, so minimal changes needed here
- Consider adding a loading placeholder if reasons array is empty

**Minor enhancement (optional, lines 26-27):**
```javascript
const reasonOptions = getCancellationReasonOptions()
const isLoadingReasons = reasonOptions.length === 0
```

**And in the select (around line 95-106):**
```jsx
<select
  value={selectedReason}
  onChange={(e) => setSelectedReason(e.target.value)}
  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  disabled={isLoadingReasons}
>
  <option value="">{isLoadingReasons ? 'Loading reasons...' : 'Select a reason...'}</option>
  {reasonOptions.map((reason) => (
    <option key={reason} value={reason}>
      {reason}
    </option>
  ))}
</select>
```

**Validation:**
- Open CancelProposalModal and verify dropdown shows all options
- Options should appear immediately (cached data)

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Cache not initialized when modal opens | Fallback to hardcoded values in `getCancellationReasonOptions()` |
| Database query fails during initialization | Log error, continue with empty cache (fallback handles it) |
| Empty table in production | Fallback values ensure functionality |
| New reasons added to table | Will appear after next `initializeLookups()` call or page refresh |

---

## Testing Considerations

### Manual Testing
- [ ] Create a new proposal and navigate to cancel it
- [ ] Verify all 8 cancellation reasons appear in dropdown
- [ ] Select each reason and verify it's captured correctly
- [ ] Cancel with "Other" and verify custom reason input appears
- [ ] Verify cancellation reason is stored in proposal record

### Edge Case Testing
- [ ] Hard refresh page and immediately open cancel modal (test race condition)
- [ ] Clear localStorage/cache and reload (simulates first-time user)
- [ ] Add a new reason to the database and verify it appears after refresh

### Console Verification
- [ ] Check for `Cached 8 cancellation reasons` log on page load
- [ ] No warnings about empty cache during normal operation

---

## Rollback Strategy

If issues arise:
1. **Frontend rollback**: Revert `proposalRules.js` to use hardcoded array (keep cache infrastructure for future)
2. **Database rollback**: Table can remain (no dependencies), just won't be used
3. **Full rollback**: Revert all changes to the 4 files modified

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Supabase `reference_table` schema access | Available | Already exposed via existing migrations |
| `dataLookups.js` initialization pattern | Available | Well-established pattern in codebase |
| Frontend caching infrastructure | Available | No additional setup needed |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cache empty during modal render | Low | Medium | Fallback to hardcoded values |
| Database migration fails | Low | Low | Test locally first, easy to fix |
| New table not accessible | Low | Medium | Follow existing `reference_table` pattern exactly |
| Breaking existing cancel flow | Low | High | Maintain exact same return format (array of strings) |

---

## Files Referenced Summary

| File Path | Purpose |
|-----------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_create_cancellation_reasons_table.sql` | New migration file to create |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\constants.js` | Add table name constant (line 268) |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\dataLookups.js` | Add cache, initialization, and lookup functions |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\rules\proposals\proposalRules.js` | Refactor getCancellationReasonOptions (lines 294-306) |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\modals\CancelProposalModal.jsx` | Optional loading state enhancement |

---

## Post-Implementation Notes

**Reminder**: After deploying the database migration:
1. Verify the table exists in Supabase Dashboard under `reference_table` schema
2. Confirm RLS policies are active
3. Test the frontend to ensure reasons load correctly
4. Consider adding admin UI in the future to manage reasons without code changes

---

**Plan Created**: 2026-01-06 14:30:00
**Plan Status**: Ready for Execution
