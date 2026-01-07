# Implementation Plan: Cancellation Reasons Reference Table

## Overview
Create a new `cancellation_reasons` table in Supabase's `reference_table` schema to store proposal cancellation/rejection reasons for **both guests and hosts**, using a `user_type` column to differentiate. Update the frontend to fetch these reasons dynamically instead of using hardcoded values.

## Success Criteria
- [ ] New `reference_table.cancellation_reasons` table created with `user_type` column
- [ ] Table seeded with existing guest cancellation reasons (8) and host rejection reasons (4)
- [ ] RLS policies configured for read access
- [ ] Frontend `getCancellationReasonOptions()` refactored to return guest reasons from the table
- [ ] Frontend `HostEditingProposal` refactored to use host reasons from the table
- [ ] `dataLookups.js` includes new initialization and lookup functions with user_type filtering
- [ ] No regression in existing cancellation/rejection flow functionality

---

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `supabase/migrations/` | Database migrations | Add new migration for table creation |
| `app/src/lib/dataLookups.js` | Reference data caching | Add cancellation reasons initialization and lookup functions |
| `app/src/lib/constants.js` | Database table constants | Add new table name constant |
| `app/src/logic/rules/proposals/proposalRules.js` | Hardcoded guest cancellation reasons | Refactor `getCancellationReasonOptions()` to use lookup |
| `app/src/islands/modals/CancelProposalModal.jsx` | Guest cancellation modal | Minor loading state handling |
| `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx` | Host rejection reasons (hardcoded) | Refactor `REJECTION_REASONS` to use lookup |

### Current Hardcoded Values

**Guest Cancellation Reasons** (in `proposalRules.js` lines 295-306):
```javascript
[
  'Found another property',
  'Changed move-in dates',
  'Changed budget',
  'Changed location preference',
  'No longer need housing',
  'Host not responsive',
  'Terms not acceptable',
  'Other'
]
```

**Host Rejection Reasons** (in `HostEditingProposal.jsx` lines 216-220):
```javascript
const REJECTION_REASONS = [
  { id: 'another_guest', label: 'Already have another guest' },
  { id: 'price_change', label: 'Decided to change the price of my listing for that time frame' },
  { id: 'different_schedule', label: 'Want a different schedule' },
  { id: 'other', label: 'Other / Do not want to say' }
];
```

### Related Documentation
- `app/src/lib/dataLookups.js` - Pattern for initializing and caching reference table data
- `supabase/migrations/20251214_create_get_email_template_function.sql` - Example of granting access to `reference_table` schema

---

## Implementation Steps

### Step 1: Create Database Migration
**Files:** `supabase/migrations/YYYYMMDDHHMMSS_create_cancellation_reasons_table.sql`
**Purpose:** Create the `cancellation_reasons` table with `user_type` column

**Details:**
- Create table with columns: `id`, `user_type` (guest/host), `reason` (text), `display_order`, `is_active`, `created_at`
- Use `id` as primary key (BIGINT GENERATED ALWAYS AS IDENTITY)
- Add composite unique constraint on (user_type, reason)
- Add CHECK constraint on user_type
- Add RLS policies for read access
- Seed with all 12 existing reasons (8 guest + 4 host)

```sql
-- Migration: Create cancellation_reasons reference table
-- Purpose: Store proposal cancellation/rejection reasons for both guests and hosts

-- Create the table in reference_table schema
CREATE TABLE IF NOT EXISTS reference_table.cancellation_reasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('guest', 'host')),
  reason TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_type, reason)
);

-- Add comment for documentation
COMMENT ON TABLE reference_table.cancellation_reasons IS 'Proposal cancellation/rejection reason options for dropdown selection, segmented by user type (guest or host)';

-- Grant access to roles
GRANT SELECT ON reference_table.cancellation_reasons TO anon, authenticated, service_role;

-- Enable RLS
ALTER TABLE reference_table.cancellation_reasons ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for all users
CREATE POLICY "Allow read access for all users"
  ON reference_table.cancellation_reasons
  FOR SELECT
  USING (true);

-- Create index for efficient filtering by user_type
CREATE INDEX idx_cancellation_reasons_user_type
  ON reference_table.cancellation_reasons (user_type, display_order);

-- Seed with existing guest cancellation reasons
INSERT INTO reference_table.cancellation_reasons (user_type, reason, display_order) VALUES
  ('guest', 'Found another property', 1),
  ('guest', 'Changed move-in dates', 2),
  ('guest', 'Changed budget', 3),
  ('guest', 'Changed location preference', 4),
  ('guest', 'No longer need housing', 5),
  ('guest', 'Host not responsive', 6),
  ('guest', 'Terms not acceptable', 7),
  ('guest', 'Other', 99);

-- Seed with existing host rejection reasons
INSERT INTO reference_table.cancellation_reasons (user_type, reason, display_order) VALUES
  ('host', 'Already have another guest', 1),
  ('host', 'Decided to change the price of my listing for that time frame', 2),
  ('host', 'Want a different schedule', 3),
  ('host', 'Other / Do not want to say', 99);
```

**Validation:**
- Run migration locally with `supabase db reset`
- Query table to verify data:
  ```sql
  SELECT * FROM reference_table.cancellation_reasons ORDER BY user_type, display_order;
  ```

---

### Step 2: Update Constants with Table Name
**Files:** `app/src/lib/constants.js`
**Purpose:** Add the new table name to the DATABASE.TABLES constant

**Details:**
- Add `CANCELLATION_REASON: 'cancellation_reasons'` to `DATABASE.TABLES` object

**Location:** Around line 268 in constants.js

```javascript
// Add to DATABASE.TABLES object
CANCELLATION_REASON: 'cancellation_reasons'
```

**Validation:** No runtime validation needed - this is a constant definition.

---

### Step 3: Add Cancellation Reasons to dataLookups.js
**Files:** `app/src/lib/dataLookups.js`
**Purpose:** Add initialization, caching, and lookup functions for cancellation reasons

**Details:**
1. Add TWO caches to `lookupCache`: `guestCancellationReasons` and `hostCancellationReasons`
2. Create `initializeCancellationReasonLookups()` async function that fetches all reasons and filters by user_type
3. Add the initialization call to `initializeLookups()`
4. Create `getGuestCancellationReasons()` function for guest dropdown
5. Create `getHostRejectionReasons()` function for host dropdown
6. Update `refreshLookups()` to clear both new caches
7. Update `getCacheStats()` to include both new caches

**Additions to lookupCache:**
```javascript
const lookupCache = {
  // ... existing caches
  guestCancellationReasons: new Map(),
  hostCancellationReasons: new Map(),
  initialized: false
};
```

**New initialization function:**
```javascript
/**
 * Fetch and cache all cancellation/rejection reasons for both guests and hosts
 * @returns {Promise<void>}
 */
async function initializeCancellationReasonLookups() {
  try {
    const { data, error } = await supabase
      .schema('reference_table')
      .from(DATABASE.TABLES.CANCELLATION_REASON)
      .select('id, user_type, reason, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (data && Array.isArray(data)) {
      data.forEach(item => {
        const cacheData = {
          id: item.id,
          reason: item.reason,
          displayOrder: item.display_order
        };

        if (item.user_type === 'guest') {
          lookupCache.guestCancellationReasons.set(item.id, cacheData);
        } else if (item.user_type === 'host') {
          lookupCache.hostCancellationReasons.set(item.id, cacheData);
        }
      });
      console.log(`Cached ${lookupCache.guestCancellationReasons.size} guest cancellation reasons`);
      console.log(`Cached ${lookupCache.hostCancellationReasons.size} host rejection reasons`);
    }
  } catch (error) {
    console.error('Failed to initialize cancellation reason lookups:', error);
  }
}
```

**Update initializeLookups Promise.all:**
```javascript
await Promise.all([
  // ... existing initializers
  initializeCancellationReasonLookups()
]);
```

**New lookup functions:**
```javascript
/**
 * Get all active guest cancellation reasons as array (for dropdown population)
 * Returns reasons sorted by display_order
 * @returns {Array<{id: number, reason: string}>} Array of reason options
 */
export function getGuestCancellationReasons() {
  const reasons = [];
  lookupCache.guestCancellationReasons.forEach((data, id) => {
    reasons.push({
      id,
      reason: data.reason,
      displayOrder: data.displayOrder
    });
  });
  return reasons.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get all active host rejection reasons as array (for dropdown population)
 * Returns reasons sorted by display_order
 * @returns {Array<{id: number, reason: string}>} Array of reason options
 */
export function getHostRejectionReasons() {
  const reasons = [];
  lookupCache.hostCancellationReasons.forEach((data, id) => {
    reasons.push({
      id,
      reason: data.reason,
      displayOrder: data.displayOrder
    });
  });
  return reasons.sort((a, b) => a.displayOrder - b.displayOrder);
}
```

**Update refreshLookups:**
```javascript
lookupCache.guestCancellationReasons.clear();
lookupCache.hostCancellationReasons.clear();
```

**Update getCacheStats:**
```javascript
guestCancellationReasons: lookupCache.guestCancellationReasons.size,
hostCancellationReasons: lookupCache.hostCancellationReasons.size,
```

**Validation:**
- Check console for cache logs on app initialization
- Verify `getCacheStats()` includes both new cache counts

---

### Step 4: Refactor getCancellationReasonOptions in proposalRules.js
**Files:** `app/src/logic/rules/proposals/proposalRules.js`
**Purpose:** Update the function to return data from the lookup cache

**Details:**
- Import `getGuestCancellationReasons` from dataLookups
- Refactor `getCancellationReasonOptions()` to use the cached data
- Maintain backward compatibility (return array of strings)

**Updated imports:**
```javascript
import { getGuestCancellationReasons } from '../../../lib/dataLookups.js';
```

**Updated function (replace lines 294-306):**
```javascript
/**
 * Get available cancellation reason options for guests
 * Fetches from cached reference data (initialized via dataLookups.js)
 * Falls back to hardcoded values if cache is empty (for resilience during initialization)
 *
 * @returns {Array<string>} Array of reason option strings
 */
export function getCancellationReasonOptions() {
  const cachedReasons = getGuestCancellationReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => r.reason);
  }

  // Fallback for initial render before cache is populated
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
- Verify dropdown still shows all 8 guest options
- Check console for any warning about empty cache

---

### Step 5: Refactor REJECTION_REASONS in HostEditingProposal.jsx
**Files:** `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx`
**Purpose:** Replace hardcoded host rejection reasons with cached data

**Details:**
- Import `getHostRejectionReasons` from dataLookups
- Replace the hardcoded `REJECTION_REASONS` constant
- Maintain the same structure (id, label) for compatibility with existing UI

**Updated imports (add to existing imports around line 14):**
```javascript
import { getHostRejectionReasons } from '../../../lib/dataLookups.js';
```

**Replace REJECTION_REASONS constant (lines 216-220) with a function call:**
```javascript
// Inside the component function, replace the hardcoded REJECTION_REASONS

// Helper to get rejection reasons from cache with fallback
const getReasonOptions = () => {
  const cachedReasons = getHostRejectionReasons();

  if (cachedReasons.length > 0) {
    return cachedReasons.map(r => ({
      id: String(r.id),
      label: r.reason
    }));
  }

  // Fallback for initial render before cache is populated
  console.warn('[HostEditingProposal] Cache empty, using fallback rejection reasons');
  return [
    { id: 'another_guest', label: 'Already have another guest' },
    { id: 'price_change', label: 'Decided to change the price of my listing for that time frame' },
    { id: 'different_schedule', label: 'Want a different schedule' },
    { id: 'other', label: 'Other / Do not want to say' }
  ];
};

const REJECTION_REASONS = getReasonOptions();
```

**Update rejectReason default (line 213):**
```javascript
// Change from 'other' to first option's id, or keep 'other' as fallback
const [rejectReason, setRejectReason] = useState('');
```

**Validation:**
- Verify host rejection dropdown shows all 4 options
- Test rejection flow end-to-end

---

### Step 6: Update CancelProposalModal for Loading State (Optional)
**Files:** `app/src/islands/modals/CancelProposalModal.jsx`
**Purpose:** Add graceful handling for when reasons are loading

**Details:**
- The fallback in Step 4 handles edge cases
- Minor enhancement for UX during rare race condition

**Minor enhancement (optional):**
```javascript
const reasonOptions = getCancellationReasonOptions()
const isLoadingReasons = reasonOptions.length === 0
```

**Validation:**
- Open CancelProposalModal and verify dropdown shows all options

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Cache not initialized when modal opens | Fallback to hardcoded values |
| Database query fails during initialization | Log error, fallback handles it |
| Empty table in production | Fallback values ensure functionality |
| New reasons added to table | Will appear after page refresh |
| User type filter returns no results | Fallback to hardcoded values |

---

## Testing Considerations

### Manual Testing - Guest Flow
- [ ] Create a new proposal and navigate to cancel it
- [ ] Verify all 8 guest cancellation reasons appear in dropdown
- [ ] Select each reason and verify it's captured correctly
- [ ] Cancel with "Other" and verify custom reason input appears
- [ ] Verify cancellation reason is stored in proposal record

### Manual Testing - Host Flow
- [ ] Navigate to Host Proposals page
- [ ] Open a proposal and click "Reject Proposal"
- [ ] Verify all 4 host rejection reasons appear as radio buttons
- [ ] Select each reason and verify the flow works
- [ ] Verify rejection reason is stored in proposal record

### Console Verification
- [ ] Check for `Cached 8 guest cancellation reasons` log on page load
- [ ] Check for `Cached 4 host rejection reasons` log on page load
- [ ] No warnings about empty cache during normal operation

---

## Rollback Strategy

If issues arise:
1. **Frontend rollback**: Revert `proposalRules.js` and `HostEditingProposal.jsx` to use hardcoded arrays
2. **Database rollback**: Table can remain (no dependencies), just won't be used
3. **Full rollback**: Revert all changes to the 5 files modified

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
| Database migration fails | Low | Low | Test locally first |
| Breaking guest cancel flow | Low | High | Maintain exact return format |
| Breaking host reject flow | Low | High | Maintain component structure |

---

## Files Referenced Summary

| File Path | Purpose |
|-----------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_create_cancellation_reasons_table.sql` | New migration file to create |
| [app/src/lib/constants.js](app/src/lib/constants.js) | Add table name constant |
| [app/src/lib/dataLookups.js](app/src/lib/dataLookups.js) | Add cache, initialization, and lookup functions |
| [app/src/logic/rules/proposals/proposalRules.js](app/src/logic/rules/proposals/proposalRules.js) | Refactor `getCancellationReasonOptions()` (lines 294-306) |
| [app/src/islands/modals/CancelProposalModal.jsx](app/src/islands/modals/CancelProposalModal.jsx) | Optional loading state |
| [app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx](app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx) | Refactor `REJECTION_REASONS` (lines 216-220) |

---

## Post-Implementation Notes

**Reminder**: After deploying the database migration:
1. Verify the table exists in Supabase Dashboard under `reference_table` schema
2. Confirm RLS policies are active
3. Query to verify both user types: `SELECT user_type, COUNT(*) FROM reference_table.cancellation_reasons GROUP BY user_type;`
4. Test both guest and host flows
5. Consider adding admin UI in the future to manage reasons without code changes

---

**Plan Created**: 2026-01-06 14:30:00
**Plan Updated**: 2026-01-06 (Added user_type column for guest/host differentiation)
**Plan Status**: Ready for Execution
