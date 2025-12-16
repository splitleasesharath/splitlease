# Debug Analysis: Self Listing V2 Host Type Pre-selection Not Using Saved Value

**Created**: 2025-12-16 23:30:45
**Status**: Analysis Complete - Pending Implementation
**Severity**: Medium
**Affected Area**: Self Listing V2 Page - Edit Mode Host Type Selection

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, TypeScript (TSX), Vite, Supabase for database
- **Data Flow**:
  - User navigates to `/self-listing-v2?id=<listingId>`
  - Page loads listing data via `getListingById()` from `listingService.js`
  - Listing data returned from Supabase `listing` table with column `host_type`
  - Form state should be pre-populated with existing listing data

### 1.2 Domain Context
- **Feature Purpose**: Allow hosts to edit existing listings via the Self Listing V2 page
- **Related Documentation**:
  - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\miniCLAUDE.md`
  - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\Database\DATABASE_TABLES_DETAILED.md`
- **Data Model**:
  - `listing` table has `host_type` column (text, nullable)
  - Valid values: `resident`, `liveout`, `coliving`, `agent`

### 1.3 Relevant Conventions
- **Key Patterns**: Form data uses camelCase (`hostType`), database uses snake_case (`host_type`)
- **Layer Boundaries**: Frontend accesses DB via `listingService.js` which uses Supabase client
- **Shared Utilities**: `getListingById()` returns raw database record

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: User navigates to `/self-listing-v2?id=1765903819382x37591297676601672`
- **Critical Path**:
  1. `useEffect` hook detects `?id=` URL parameter
  2. `getListingById(listingId)` fetches listing from Supabase
  3. `setFormData()` should populate form with listing data including `host_type`
- **Dependencies**: `listingService.js`, Supabase client

## 2. Problem Statement

When a user with an existing listing (ID: `1765903819382x37591297676601672`, host_type: `liveout`) accesses the Self Listing V2 page via the `?id=` parameter, the "Who are you?" field in Step 1 displays the **first option ("resident")** instead of the **saved host type ("liveout")**.

**User Expectation**: The form should pre-select their saved host type from the listing database record.

**Actual Behavior**: The form hardcodes `hostType: 'agent'` for all edit mode scenarios, ignoring the actual saved value.

## 3. Reproduction Context

- **Environment**: Production (Cloudflare Pages + Supabase)
- **Steps to reproduce**:
  1. User has an existing listing with ID `1765903819382x37591297676601672`
  2. The listing's `host_type` column contains `liveout`
  3. User navigates to `/self-listing-v2?id=1765903819382x37591297676601672`
  4. Step 1 ("Who are you?") shows "resident" as selected instead of "liveout"
- **Expected behavior**: The "liveout" option should be pre-selected
- **Actual behavior**: Either "resident" (default) or the code attempts to set "agent" (hardcoded)
- **Error messages/logs**: None - the page loads without errors

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx` | **Primary** - Contains the bug in edit mode URL parameter handling |
| `app/src/lib/listingService.js` | Returns listing data with `host_type` field |
| `.claude/plans/Done/20251216194523-self-listing-v2-preselect-host-type.md` | Previous implementation plan that introduced the hardcoded value |
| `.claude/plans/Done/20251216194523-self-listing-v2-preselect-host-type-changelog.md` | Confirms hardcoded implementation |

### 4.2 Execution Flow Trace

1. **Line 358-396**: `useEffect` with `loadDraftFromUrl` async function
2. **Line 361**: `const listingId = urlParams.get('id');` - Gets listing ID from URL
3. **Line 367**: `if (listingId) {` - Enters edit mode block
4. **Line 373**: `const existingListing = await getListingById(listingId);` - Fetches listing
5. **Line 375**: `if (existingListing) {` - Listing exists check
6. **Lines 380-383**: **THE BUG**:
   ```typescript
   setFormData(prev => ({
     ...prev,
     hostType: 'agent', // Last option in HOST_TYPES - pre-select for edit mode
   }));
   ```
   The code HARDCODES `hostType: 'agent'` instead of using `existingListing.host_type`

### 4.3 Git History Analysis

- **Commit 3709c67** (`chore(deployment): Deploy proposal Edge Function to production`): Contains the problematic edit mode implementation
- **Plan file**: `.claude/plans/Done/20251216194523-self-listing-v2-preselect-host-type.md` shows the original requirement was misinterpreted:
  - Plan stated: "Pre-select host type option (agent) for editing"
  - Should have been: "Pre-select host type from existing listing data"

## 5. Hypotheses

### Hypothesis 1: Hardcoded Value Instead of Database Value (Likelihood: 99%)

**Theory**: The implementation on lines 380-383 hardcodes `hostType: 'agent'` instead of reading from `existingListing.host_type`. This is the definitive root cause.

**Supporting Evidence**:
- Code explicitly sets `hostType: 'agent'` on line 382
- Comment says "Last option in HOST_TYPES - pre-select for edit mode" indicating intent to use a fixed value
- The `existingListing` object is fetched but its `host_type` property is never used

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log to display `existingListing.host_type` value
2. Confirm the database record has `host_type = 'liveout'`

**Potential Fix**:
```typescript
setFormData(prev => ({
  ...prev,
  hostType: existingListing.host_type || prev.hostType, // Use saved value or keep default
}));
```

**Convention Check**: The fix follows the camelCase form data convention while reading from snake_case database column.

### Hypothesis 2: Race Condition with localStorage (Likelihood: 5%)

**Theory**: Even though localStorage is cleared on line 377, the earlier `useEffect` (lines 309-326) that loads from localStorage might run after the edit mode logic, overwriting the value.

**Supporting Evidence**:
- There are two `useEffect` hooks that modify `formData`
- Lines 309-326 load from localStorage and could potentially overwrite

**Contradicting Evidence**:
- The localStorage useEffect runs on mount (empty dependency array implied)
- The edit mode useEffect also runs on mount
- The edit mode useEffect clears localStorage before setting form data
- React batches state updates, so this should not cause issues

**Verification Steps**:
1. Add logging to both useEffects to verify execution order
2. Check if localStorage is successfully cleared

**Potential Fix**: Not needed if Hypothesis 1 is correct

**Convention Check**: N/A

### Hypothesis 3: Type Mismatch or Null Value (Likelihood: 1%)

**Theory**: The `host_type` column in the database might be null or contain an unexpected value that doesn't match the `FormData['hostType']` TypeScript type.

**Supporting Evidence**:
- TypeScript type is `'resident' | 'liveout' | 'coliving' | 'agent'`
- Database column is nullable text

**Contradicting Evidence**:
- User reports the listing has `host_type = 'liveout'` which is a valid value
- The code doesn't even attempt to read the database value

**Verification Steps**:
1. Query the database: `SELECT host_type FROM listing WHERE _id = '1765903819382x37591297676601672'`

**Potential Fix**: Add validation/fallback when reading from database:
```typescript
const validHostTypes = ['resident', 'liveout', 'coliving', 'agent'] as const;
const savedHostType = validHostTypes.includes(existingListing.host_type)
  ? existingListing.host_type
  : 'resident';
```

**Convention Check**: Aligns with "no fallback" philosophy - but validation is different from fallback

## 6. Recommended Action Plan

### Priority 1 (Try First) - Fix the Hardcoded Value

**Location**: `app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx`
**Lines**: 379-386

**Current Code**:
```typescript
if (existingListing) {
  // Clear localStorage draft to prevent conflicts
  localStorage.removeItem(STORAGE_KEY);

  // Pre-select the last host type option ("agent") for editing
  setFormData(prev => ({
    ...prev,
    hostType: 'agent', // Last option in HOST_TYPES - pre-select for edit mode
  }));

  console.log('[SelfListingPageV2] Listing loaded, hostType pre-set to "agent"');
}
```

**Fixed Code**:
```typescript
if (existingListing) {
  // Clear localStorage draft to prevent conflicts
  localStorage.removeItem(STORAGE_KEY);

  // Pre-select the saved host type from the existing listing
  // Database column is snake_case: host_type
  // Form data is camelCase: hostType
  const savedHostType = existingListing.host_type;

  // Validate the saved value is a valid option, otherwise keep default
  const validHostTypes: FormData['hostType'][] = ['resident', 'liveout', 'coliving', 'agent'];
  const hostTypeToUse = validHostTypes.includes(savedHostType)
    ? savedHostType
    : prev.hostType;

  setFormData(prev => ({
    ...prev,
    hostType: hostTypeToUse,
  }));

  console.log('[SelfListingPageV2] Listing loaded, hostType pre-set to:', hostTypeToUse);
}
```

**Simpler Alternative Fix** (if validation is considered over-engineering):
```typescript
if (existingListing) {
  // Clear localStorage draft to prevent conflicts
  localStorage.removeItem(STORAGE_KEY);

  // Pre-select the saved host type from the existing listing
  setFormData(prev => ({
    ...prev,
    hostType: existingListing.host_type || prev.hostType,
  }));

  console.log('[SelfListingPageV2] Listing loaded, hostType:', existingListing.host_type);
}
```

### Priority 2 (If Priority 1 Fails) - Verify Database Value

If the fix doesn't work, verify the database value:

1. Query the Supabase database:
   ```sql
   SELECT _id, host_type, "Host / Landlord", Name
   FROM listing
   WHERE _id = '1765903819382x37591297676601672';
   ```

2. Check if `host_type` column exists in the listing table schema

### Priority 3 (Deeper Investigation) - Full Form Data Population

Consider whether the entire edit mode should populate more form fields from the existing listing, not just `hostType`. The current implementation only sets `hostType` but ignores all other listing data. This may be intentional for a "clone" workflow, but if it's an "edit" workflow, more fields should be populated.

## 7. Prevention Recommendations

1. **Code Review Process**: When implementing features that read from database, ensure the implementation actually READS from the database rather than using hardcoded values
2. **Acceptance Criteria Clarity**: The original plan's success criteria was ambiguous - "pre-selected to the last option" could mean different things
3. **Testing with Real Data**: Test edit mode with actual listings that have different `host_type` values
4. **Add Type Safety**: Consider using a mapping function that explicitly converts database columns to form data fields

## 8. Related Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx` | 379-386 | **PRIMARY FIX LOCATION** - Replace hardcoded value with database value |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx` | 61 | TypeScript type definition for `hostType` |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx` | 97 | Default form data with `hostType: 'resident'` |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPageV2\SelfListingPageV2.tsx` | 134-139 | `HOST_TYPES` array definition |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingService.js` | 915-940 | `getListingById()` function that returns listing with `host_type` |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingService.js` | 625 | Shows `host_type` is saved as snake_case in database |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingService.js` | 1295 | Shows mapping: `hostType: dbRecord.host_type || null` |
