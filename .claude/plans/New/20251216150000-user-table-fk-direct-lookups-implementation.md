# User Table Foreign Key Direct Lookups Implementation Plan

**Created**: 2025-12-16
**Status**: Ready for Implementation
**Type**: CLEANUP / REFACTORING
**Scope**: `public.user` table FK relations

---

## Executive Summary

This plan documents all foreign key relations on the `public.user` table and provides a systematic approach to migrate from nested lookups (where we lookup ID then lookup reference table) to direct FK-based queries using Supabase's nested select syntax.

---

## Current Foreign Key Relations on `public.user`

### Outgoing FKs (user → reference tables)

| User Column | Referenced Table | Referenced Column | FK Constraint Name |
|-------------|------------------|-------------------|-------------------|
| `Preferred Borough` | `reference_table.zat_geo_borough_toplevel` | `_id` | `user_Preferred Borough_fkey` |
| `Preferred weekly schedule` | `reference_table.os_weekly_selection_options` | `display` | `user_Preferred weekly schedule_fkey` |
| `Price Tier` | `reference_table.os_price_filter` | `display` | `user_Price Tier_fkey` |
| `Type - User Current` | `reference_table.os_user_type` | `display` | `fk_user_type_current` |
| `Type - User Signup` | `reference_table.os_user_type` | `display` | `fk_user_type_signup` |

### Incoming FKs (other tables → user)

| Source Table | Source Column | Target | FK Constraint Name |
|--------------|---------------|--------|-------------------|
| `ai_parsing_queue` | `user_id` | `user._id` | `ai_parsing_queue_user_id_fkey` |
| `bookings_leases` | `Created By` | `user._id` | `fk_bookings_leases_created_by` |
| `notification_preferences` | `user_id` | `user._id` | `notification_preferences_user_id_fkey` |

### Potential FK Columns (Currently No Constraint)

| Column | Data Type | Likely References |
|--------|-----------|-------------------|
| `Account - Host / Landlord` | text | `account_host._id` |
| `Preferred Hoods` | jsonb | Array of `zat_geo_hood_mediumlevel._id` |
| `User Sub Type` | text | Possibly `os_user_type.display` |

---

## Key Insight: FK Reference Types

`✶ Important Pattern ─────────────────────────────────────`

The user table has **two types of FK references**:

1. **ID-based FKs** (point to `_id` column):
   - `Preferred Borough` → `zat_geo_borough_toplevel._id`
   - These store an ID, requiring a lookup to get the display name

2. **Display-based FKs** (point to `display` column):
   - `Type - User Current` → `os_user_type.display`
   - `Type - User Signup` → `os_user_type.display`
   - `Preferred weekly schedule` → `os_weekly_selection_options.display`
   - `Price Tier` → `os_price_filter.display`
   - These **already store the human-readable value** - no nested lookup needed!

`─────────────────────────────────────────────────────────`

---

## Current CRUD Operations Analysis

### READ Operations

#### 1. `validateTokenWorkflow.js` (Lines 84-103)
**File**: [app/src/logic/workflows/auth/validateTokenWorkflow.js](../../../app/src/logic/workflows/auth/validateTokenWorkflow.js)

```javascript
// Current: Returns raw value from Type - User Current
userType = userData['Type - User Current'] || null
```

**Status**: ✅ No change needed - the FK already stores the display value.

---

#### 2. `useLoggedInAvatarData.js` (Lines 150-241)
**File**: [app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js)

```javascript
// Current: Reads Type - User Current, then normalizes via normalizeUserType()
let rawUserType = userData?.['Type - User Current'] || '';
normalizedType = normalizeUserType(rawUserType);
```

**Analysis**: The `normalizeUserType()` function handles both:
- Legacy Bubble format: `"A Host (I have a space available to rent)"`
- Supabase Auth format: `"Host"`

**Status**: ✅ No change needed - normalization handles the display value directly.

---

#### 3. `useAccountProfilePageLogic.js` (Lines 247-250)
**File**: [app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js](../../../app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js)

```javascript
// Current: Reads Type - User Signup to determine if host
const userType = profileData?.['Type - User Signup'];
return isHost({ userType });
```

**Status**: ✅ No change needed - uses display value directly.

---

#### 4. `ai-parse-profile/index.ts` (Lines 148-196, 429-434)
**File**: [supabase/functions/ai-parse-profile/index.ts](../../../supabase/functions/ai-parse-profile/index.ts)

```typescript
// Current: Looks up borough ID, then queries reference table for name
async function matchBoroughId(supabase, boroughName): Promise<string | null> {
  const { data } = await supabase
    .schema('reference_table')
    .from('zat_geo_borough_toplevel')
    .select('_id')
    .ilike('"Display Borough"', `%${firstBorough}%`)
    .limit(1)
    .maybeSingle();
  return data?._id || null;
}
```

**Issue**: When updating user profile, we store `boroughId` but never retrieve the display name in one query.

**Opportunity**: Could use FK join when reading user to get borough name:
```typescript
// Target: Get user with borough display name in one query
const { data } = await supabase
  .from('user')
  .select(`
    *,
    borough:zat_geo_borough_toplevel!"Preferred Borough"(
      _id,
      "Display Borough"
    )
  `)
  .eq('_id', userId)
  .single();
```

---

#### 5. `dataLookups.js` (Lines 91-110, 116-135)
**File**: [app/src/lib/dataLookups.js](../../../app/src/lib/dataLookups.js)

```javascript
// Current: Pre-caches all reference data at app startup
async function initializeBoroughLookups() {
  const { data } = await supabase
    .schema('reference_table')
    .from('zat_geo_borough_toplevel')
    .select('_id, "Display Borough"');
  // Stores in Map for synchronous lookups
}
```

**Status**: ✅ **Keep as-is** - Caching is optimal for reference data:
- Reference data rarely changes
- Avoids repeated queries
- Enables synchronous lookups in render functions
- Cross-schema FK joins have performance implications

---

### WRITE Operations

#### 1. `signup.ts` (Lines 48-90, 276-277)
**File**: [supabase/functions/auth-user/handlers/signup.ts](../../../supabase/functions/auth-user/handlers/signup.ts)

```typescript
// Current: Maps simple userType to display value for FK constraint
const userTypeDisplayMap: Record<string, string> = {
  'Host': 'A Host (I have a space available to rent)',
  'Guest': 'A Guest (I would like to rent a space)',
  // ...
};
const userTypeDisplay = userTypeDisplayMap[userType] ?? 'A Guest...';

// Writes to user table
'Type - User Current': userTypeDisplay,
'Type - User Signup': userTypeDisplay,
```

**Status**: ✅ Correct pattern - ensures FK constraint is satisfied with valid display value.

**Improvement Opportunity**: Could validate against reference table before insert:
```typescript
// Target: Validate userType exists in reference table
const { data: validType } = await supabase
  .schema('reference_table')
  .from('os_user_type')
  .select('display')
  .eq('display', userTypeDisplay)
  .single();

if (!validType) {
  throw new ValidationError(`Invalid user type: ${userTypeDisplay}`);
}
```

---

#### 2. `ai-parse-profile/index.ts` (Lines 469-479)
**File**: [supabase/functions/ai-parse-profile/index.ts](../../../supabase/functions/ai-parse-profile/index.ts)

```typescript
// Current: Writes Preferred weekly schedule directly
if (extractedData.preferredWeeklySchedule) {
  userUpdate['Preferred weekly schedule'] = extractedData.preferredWeeklySchedule;
}
if (boroughId) {
  userUpdate['Preferred Borough'] = boroughId;
}
```

**Issue**: No validation that `preferredWeeklySchedule` matches a valid FK value in `os_weekly_selection_options.display`.

**Improvement**: Add validation before update:
```typescript
// Target: Validate weekly schedule exists in reference table
if (extractedData.preferredWeeklySchedule) {
  const { data: validSchedule } = await supabase
    .schema('reference_table')
    .from('os_weekly_selection_options')
    .select('display')
    .eq('display', extractedData.preferredWeeklySchedule)
    .maybeSingle();

  if (validSchedule) {
    userUpdate['Preferred weekly schedule'] = extractedData.preferredWeeklySchedule;
  } else {
    console.warn(`Invalid weekly schedule: ${extractedData.preferredWeeklySchedule}`);
  }
}
```

---

## Implementation Plan

### PHASE 1: Validation Helpers (Edge Functions)

Create a shared validation module for FK constraint validation.

**New File**: `supabase/functions/_shared/fkValidation.ts`

```typescript
/**
 * FK Validation Helpers
 * Validates values against reference tables before write operations
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validate user type against os_user_type reference table
 */
export async function validateUserType(
  supabase: SupabaseClient,
  userType: string
): Promise<boolean> {
  const { data } = await supabase
    .schema('reference_table')
    .from('os_user_type')
    .select('display')
    .eq('display', userType)
    .maybeSingle();
  return !!data;
}

/**
 * Validate weekly schedule against os_weekly_selection_options
 */
export async function validateWeeklySchedule(
  supabase: SupabaseClient,
  schedule: string
): Promise<boolean> {
  const { data } = await supabase
    .schema('reference_table')
    .from('os_weekly_selection_options')
    .select('display')
    .eq('display', schedule)
    .maybeSingle();
  return !!data;
}

/**
 * Validate price tier against os_price_filter
 */
export async function validatePriceTier(
  supabase: SupabaseClient,
  priceTier: string
): Promise<boolean> {
  const { data } = await supabase
    .schema('reference_table')
    .from('os_price_filter')
    .select('display')
    .eq('display', priceTier)
    .maybeSingle();
  return !!data;
}

/**
 * Validate borough ID against zat_geo_borough_toplevel
 */
export async function validateBoroughId(
  supabase: SupabaseClient,
  boroughId: string
): Promise<boolean> {
  const { data } = await supabase
    .schema('reference_table')
    .from('zat_geo_borough_toplevel')
    .select('_id')
    .eq('_id', boroughId)
    .maybeSingle();
  return !!data;
}
```

---

### PHASE 2: Update Write Operations

#### 2.1 Update `signup.ts`

**File**: [supabase/functions/auth-user/handlers/signup.ts](../../../supabase/functions/auth-user/handlers/signup.ts)

**Changes**:
1. Import validation helper
2. Validate userType before insert

```typescript
// Add import
import { validateUserType } from '../../_shared/fkValidation.ts';

// Before inserting user record (around line 264):
const isValidUserType = await validateUserType(supabaseAdmin, userTypeDisplay);
if (!isValidUserType) {
  console.error('[signup] Invalid user type:', userTypeDisplay);
  throw new BubbleApiError('Invalid user type specified', 400);
}
```

---

#### 2.2 Update `ai-parse-profile/index.ts`

**File**: [supabase/functions/ai-parse-profile/index.ts](../../../supabase/functions/ai-parse-profile/index.ts)

**Changes**:
1. Import validation helpers
2. Validate `preferredWeeklySchedule` before update
3. Validate `boroughId` before update

```typescript
// Add imports
import { validateWeeklySchedule, validateBoroughId } from '../_shared/fkValidation.ts';

// In processJob function, around line 469:
if (extractedData.preferredWeeklySchedule) {
  const isValid = await validateWeeklySchedule(supabase, extractedData.preferredWeeklySchedule);
  if (isValid) {
    userUpdate['Preferred weekly schedule'] = extractedData.preferredWeeklySchedule;
  } else {
    console.warn('[ai-parse-profile] Invalid weekly schedule, skipping:', extractedData.preferredWeeklySchedule);
  }
}

if (boroughId) {
  const isValid = await validateBoroughId(supabase, boroughId);
  if (isValid) {
    userUpdate['Preferred Borough'] = boroughId;
  } else {
    console.warn('[ai-parse-profile] Invalid borough ID, skipping:', boroughId);
  }
}
```

---

### PHASE 3: Add FK Join for User Reads (Optional Enhancement)

When reading user data where we need the borough display name, use nested select.

**Example in `ai-parse-profile/index.ts`** (Line 264-273):

```typescript
// Current:
const { data: userData } = await supabase
  .from('user')
  .select('"Favorited Listings"')
  .eq('_id', userId)
  .single();

// Target: Include borough name if needed
const { data: userData } = await supabase
  .from('user')
  .select(`
    "Favorited Listings",
    "Preferred Borough",
    preferred_borough:reference_table.zat_geo_borough_toplevel!"Preferred Borough"(
      "Display Borough"
    )
  `)
  .eq('_id', userId)
  .single();

// Access: userData.preferred_borough?.['Display Borough']
```

**Note**: Cross-schema FK joins (`reference_table` schema) may have performance implications. The existing caching approach in `dataLookups.js` is likely more efficient for high-traffic pages.

---

### PHASE 4: Frontend - No Major Changes Needed

The frontend files already handle the FK values correctly:

| File | Current Behavior | Change Needed |
|------|------------------|---------------|
| `validateTokenWorkflow.js` | Returns display value directly | None |
| `useLoggedInAvatarData.js` | Normalizes display value | None |
| `useAccountProfilePageLogic.js` | Uses display value with `isHost()` | None |
| `dataLookups.js` | Caches reference data | None (optimal) |

---

## Files Reference

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/fkValidation.ts` | Shared FK validation helpers |

### Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| [supabase/functions/auth-user/handlers/signup.ts](../../../supabase/functions/auth-user/handlers/signup.ts) | 2.1 | Add userType validation |
| [supabase/functions/ai-parse-profile/index.ts](../../../supabase/functions/ai-parse-profile/index.ts) | 2.2 | Add weeklySchedule and borough validation |

### Files to Keep As-Is

| File | Reason |
|------|--------|
| [app/src/lib/dataLookups.js](../../../app/src/lib/dataLookups.js) | Caching is optimal for reference data |
| [app/src/logic/workflows/auth/validateTokenWorkflow.js](../../../app/src/logic/workflows/auth/validateTokenWorkflow.js) | Already uses display value directly |
| [app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js](../../../app/src/islands/shared/LoggedInAvatar/useLoggedInAvatarData.js) | Normalization handles both formats |
| [app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js](../../../app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js) | Uses display value correctly |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Create Validation Helpers (30 mins)                    │
│ └─ Create supabase/functions/_shared/fkValidation.ts            │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 2: Update Edge Functions (1 hour)                         │
│ ├─ 2.1 Update signup.ts - add userType validation               │
│ └─ 2.2 Update ai-parse-profile/index.ts - add FK validations    │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 3: Optional - Add FK Joins for Reads (30 mins)            │
│ └─ Only if specific use cases require it                        │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 4: Testing (1 hour)                                       │
│ ├─ Test signup with valid/invalid user types                    │
│ ├─ Test ai-parse-profile with various inputs                    │
│ └─ Verify FK constraints are enforced                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] `fkValidation.ts` created with validation functions
- [ ] `signup.ts` validates userType before insert
- [ ] `ai-parse-profile/index.ts` validates weeklySchedule and boroughId
- [ ] Invalid FK values are logged and skipped (not causing insert failures)
- [ ] Existing functionality continues to work
- [ ] Edge Functions deploy successfully

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Validation queries add latency | Low | Low | Queries are simple single-row lookups |
| Breaking existing data | Very Low | High | Validation is additive, not destructive |
| Cross-schema join performance | Medium | Medium | Keep caching for frontend, use joins sparingly |

---

## Notes

1. **Display-based FKs are already optimal**: The `Type - User Current`, `Type - User Signup`, `Preferred weekly schedule`, and `Price Tier` fields already store human-readable values because they FK to `display` columns.

2. **ID-based FKs benefit from validation**: The `Preferred Borough` field stores an ID, so validation ensures we don't write orphaned IDs.

3. **Caching remains optimal for frontend**: The `dataLookups.js` approach of pre-caching reference data is more efficient than FK joins for high-traffic pages.

4. **Edge Functions need validation**: Server-side writes should validate FK values to prevent constraint violations.

---

**Next Step**: Execute Phase 1 to create the validation helpers.
