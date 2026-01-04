# Implementation Plan: Rental Application Data Fetching on Page Load

## Overview

Add functionality to fetch and populate saved rental application data when a user returns to the rental application page after having previously submitted an application. Currently, the page only shows 44% progress with basic user data because it never queries the `rentalapplication` table - it only reads from localStorage (which is cleared after submission).

## Success Criteria

- [ ] When user navigates to rental application page and has a saved application, all form fields are populated
- [ ] Progress percentage reflects the actual saved data (should show 100% for submitted applications)
- [ ] Occupants are restored correctly from the database
- [ ] Verification status is restored
- [ ] Special requirements (pets, smoking, parking) are correctly displayed
- [ ] Employment details are correctly populated based on employment status
- [ ] The form allows viewing of submitted applications (read-only or edit mode TBD)
- [ ] Edge case: New user with no prior application works as before (fresh form)
- [ ] Edge case: localStorage draft vs submitted application handled correctly

## Context & References

### Database Schema

#### `user` table (relevant fields)
| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Primary key (Bubble ID) |
| `Rental Application` | text | FK to rentalapplication._id |
| `supabase_user_id` | text | Supabase Auth UUID |

#### `rentalapplication` table (46 columns)
| Column | Type | Form Field Mapping |
|--------|------|-------------------|
| `_id` | text | (primary key) |
| `Created By` | text | (user reference) |
| `name` | text | `fullName` |
| `DOB` | text | `dob` |
| `email` | text | `email` |
| `phone number` | text | `phone` |
| `permanent address` | jsonb | `currentAddress` (extract `.address`) |
| `apartment number` | text | `apartmentUnit` |
| `length resided` | text | `lengthResided` |
| `renting` | boolean | `renting` ('yes'/'no'/'' from boolean) |
| `employment status` | text | `employmentStatus` |
| `employer name` | text | `employerName` |
| `employer phone number` | text | `employerPhone` |
| `job title` | text | `jobTitle` |
| `Monthly Income` | integer | `monthlyIncome` (as string) |
| `business legal name` | text | `businessName` |
| `year business was created?` | integer | `businessYear` (as string) |
| `state business registered` | text | `businessState` |
| `occupants list` | jsonb | `occupants` array |
| `pets` | boolean | `hasPets` ('yes'/'no'/'' from boolean) |
| `smoking` | boolean | `isSmoker` ('yes'/'no'/'' from boolean) |
| `parking` | boolean | `needsParking` ('yes'/'no'/'' from boolean) |
| `references` | jsonb | `references` (extract first element if array) |
| `signature` | text | `signature` |
| `signature (text)` | text | `signature` (alternate) |
| `submitted` | boolean | Track submission status |
| `percentage % done` | integer | Progress indicator |

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/useRentalApplicationPageLogic.js` | Main hook with business logic | Add fetch effect, field mapping |
| `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts` | Local store class | Add `loadFromDatabase()` method |
| `app/src/islands/pages/RentalApplicationPage/store/useRentalApplicationStore.ts` | React hook for store | Export new `loadFromDatabase` function |
| `app/src/islands/pages/RentalApplicationPage/store/index.ts` | Store exports | No changes needed |
| `supabase/functions/rental-application/index.ts` | Edge Function router | Add `get` action |
| `supabase/functions/rental-application/handlers/submit.ts` | Submit handler (reference) | No changes, reference for field names |

### Related Documentation
- [Supabase CLAUDE.md](../supabase/CLAUDE.md) - Edge Function patterns
- [app/src/islands/pages/CLAUDE.md](../app/src/islands/pages/CLAUDE.md) - Page component patterns

### Existing Patterns to Follow

**Edge Function Action Pattern** (from rental-application/index.ts):
```typescript
const ALLOWED_ACTIONS = ["submit", "get"] as const; // Add "get"
// Route to handler based on action
switch (body.action) {
  case "get":
    result = await handleGet(body.payload, supabaseAdmin, userId);
    break;
}
```

**Data Pre-population Pattern** (from useRentalApplicationPageLogic.js lines 370-454):
```javascript
// Only run once
if (hasPrePopulated.current) return;
// ... fetch data ...
const updates = {};
if (!formData.fullName && fullName) updates.fullName = fullName;
// ... update form ...
updateFormData(updates);
```

## Implementation Steps

### Step 1: Create `get` Handler for Rental Application Edge Function

**Files:** `supabase/functions/rental-application/handlers/get.ts` (new file)
**Purpose:** Fetch rental application data by user ID

**Details:**
- Create new handler file following the pattern from submit.ts
- Accept user_id from payload OR from JWT authentication
- Query `rentalapplication` table by `_id` (passed directly OR looked up from user's `Rental Application` field)
- Return all fields needed for form population
- Handle case where user has no rental application (return null/empty)

**Code Pattern:**
```typescript
export async function handleGet(
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string
): Promise<RentalApplicationData | null> {
  // 1. Determine if userId is Supabase UUID or Bubble ID
  // 2. Fetch user record to get "Rental Application" ID
  // 3. If no rental application, return null
  // 4. Fetch full rental application record
  // 5. Transform database fields to form field names
  // 6. Return transformed data
}
```

**Validation:** Test via curl/REST client with valid user ID

---

### Step 2: Register `get` Action in Edge Function Router

**Files:** `supabase/functions/rental-application/index.ts`
**Purpose:** Route `get` action to handler

**Details:**
- Add "get" to `ALLOWED_ACTIONS` array
- Add "get" to `PUBLIC_ACTIONS` array (allows legacy Bubble token users)
- Add case statement in switch block
- Import `handleGet` from handlers/get.ts

**Changes:**
```typescript
// Line 30: Add "get" to allowed actions
const ALLOWED_ACTIONS = ["submit", "get"] as const;

// Line 32: Add "get" to public actions
const PUBLIC_ACTIONS: string[] = ["submit", "get"];

// Import (after line 24)
import { handleGet } from "./handlers/get.ts";

// In switch block (after line 154)
case "get":
  const getUserId = userId || (body.payload.user_id as string);
  if (!getUserId) {
    throw new AuthenticationError("User ID required for get action");
  }
  result = await handleGet(body.payload, supabaseAdmin, getUserId);
  break;
```

**Validation:** Call Edge Function with `{ action: "get", payload: { user_id: "..." } }`

---

### Step 3: Add `loadFromDatabase` Method to Local Store

**Files:** `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts`
**Purpose:** Allow loading external data into the store (from database)

**Details:**
- Add new method `loadFromDatabase(data: Partial<RentalApplicationFormData>, occupants?: Occupant[], verificationStatus?: Partial<VerificationStatus>)`
- This overwrites store state with database values
- Marks store as NOT dirty (data came from database, not user input)
- Does NOT save to localStorage (we want database to be source of truth for submitted apps)

**Code Pattern:**
```typescript
/**
 * Load data from database (for returning users with submitted applications)
 * This overwrites current store state and marks as not dirty
 */
loadFromDatabase(
  formData: Partial<RentalApplicationFormData>,
  occupants?: Occupant[],
  verificationStatus?: Partial<VerificationStatus>
): void {
  this.state.formData = { ...DEFAULT_FORM_DATA, ...formData };
  if (occupants) {
    this.state.occupants = occupants;
  }
  if (verificationStatus) {
    this.state.verificationStatus = { ...DEFAULT_VERIFICATION_STATUS, ...verificationStatus };
  }
  this.state.isDirty = false;
  this.state.lastSaved = null; // No local save - data from DB
  console.log('[RentalAppStore] Loaded data from database');
  this.notifyListeners();
}
```

**Validation:** Unit test the method with mock data

---

### Step 4: Export `loadFromDatabase` from React Hook

**Files:** `app/src/islands/pages/RentalApplicationPage/store/useRentalApplicationStore.ts`
**Purpose:** Expose `loadFromDatabase` to React components

**Details:**
- Add `loadFromDatabase` to the hook's return interface
- Create memoized callback that delegates to store method

**Changes:**
```typescript
// In interface (around line 43)
loadFromDatabase: (
  formData: Partial<RentalApplicationFormData>,
  occupants?: Occupant[],
  verificationStatus?: Partial<VerificationStatus>
) => void;

// Create callback (around line 100)
const loadFromDatabase = useCallback((
  formData: Partial<RentalApplicationFormData>,
  occupants?: Occupant[],
  verificationStatus?: Partial<VerificationStatus>
) => {
  rentalApplicationLocalStore.loadFromDatabase(formData, occupants, verificationStatus);
}, []);

// In return object
loadFromDatabase,
```

**Validation:** Import and call from test component

---

### Step 5: Create Field Mapping Utility

**Files:** `app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts` (new file)
**Purpose:** Transform database field names to form field names

**Details:**
- Create bidirectional mapping between database column names and form field names
- Handle special cases: boolean-to-string, jsonb address extraction, integer-to-string

**Field Mapping Table:**
```typescript
// Database → Form mapping
const DB_TO_FORM_MAP = {
  'name': 'fullName',
  'DOB': 'dob',
  'email': 'email',
  'phone number': 'phone',
  'permanent address': 'currentAddress', // Extract .address from jsonb
  'apartment number': 'apartmentUnit',
  'length resided': 'lengthResided',
  'renting': 'renting', // boolean → 'yes'/'no'/''
  'employment status': 'employmentStatus',
  'employer name': 'employerName',
  'employer phone number': 'employerPhone',
  'job title': 'jobTitle',
  'Monthly Income': 'monthlyIncome', // integer → string
  'business legal name': 'businessName',
  'year business was created?': 'businessYear', // integer → string
  'state business registered': 'businessState',
  'pets': 'hasPets', // boolean → 'yes'/'no'/''
  'smoking': 'isSmoker', // boolean → 'yes'/'no'/''
  'parking': 'needsParking', // boolean → 'yes'/'no'/''
  'references': 'references', // jsonb array → first element
  'signature': 'signature',
  'signature (text)': 'signature', // fallback
  'occupants list': 'occupants', // jsonb → Occupant[]
};

export function mapDatabaseToFormData(dbRecord: Record<string, unknown>): {
  formData: Partial<RentalApplicationFormData>;
  occupants: Occupant[];
} {
  // Transform each field with type conversions
}
```

**Validation:** Unit test with sample database record

---

### Step 6: Update useRentalApplicationPageLogic to Fetch Saved Application

**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Purpose:** Add effect to fetch and populate saved rental application data

**Details:**
- Add new effect that runs on mount (after existing pre-population effect)
- Check if user has `Rental Application` field populated
- If yes, call Edge Function to fetch full application
- Transform response using field mapper
- Call `loadFromDatabase` to populate store
- Skip if localStorage already has data (draft in progress)

**Placement:** After line 454 (after existing fetchAndPopulateUserData effect)

**Code Pattern:**
```javascript
// Track if application data has been loaded from database
const hasLoadedFromDatabase = useRef(false);

// Fetch saved rental application if user has one
useEffect(() => {
  async function fetchSavedRentalApplication() {
    // Only run once
    if (hasLoadedFromDatabase.current) return;

    try {
      // Check if user is authenticated
      const isAuthenticated = await checkAuthStatus();
      if (!isAuthenticated) return;

      const userId = getSessionId();
      if (!userId) return;

      // Check if localStorage already has substantial data (draft in progress)
      // If user has been filling out form, don't overwrite with database
      const hasLocalDraft = formData.fullName && formData.signature;
      if (hasLocalDraft && isDirty) {
        console.log('[RentalApplication] Local draft exists, skipping database fetch');
        return;
      }

      // Fetch user record to check for existing rental application
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('_id, "Rental Application"')
        .eq('_id', userId)
        .single();

      if (userError || !userData || !userData['Rental Application']) {
        console.log('[RentalApplication] No saved rental application found');
        return;
      }

      console.log('[RentalApplication] Found saved rental application:', userData['Rental Application']);

      // Fetch full rental application via Edge Function
      const token = getAuthToken();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'get',
          payload: { user_id: userId },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        console.error('[RentalApplication] Failed to fetch application:', result.error);
        return;
      }

      console.log('[RentalApplication] Loaded rental application data:', result.data);

      // Transform database fields to form fields
      const { formData: mappedFormData, occupants: mappedOccupants } = mapDatabaseToFormData(result.data);

      // Load into store (this will NOT save to localStorage)
      loadFromDatabase(mappedFormData, mappedOccupants);

      hasLoadedFromDatabase.current = true;

    } catch (error) {
      console.error('[RentalApplication] Error fetching saved application:', error);
    }
  }

  fetchSavedRentalApplication();
}, [formData.fullName, formData.signature, isDirty, loadFromDatabase]);
```

**Validation:**
1. User with saved application: form populated with all fields
2. User without saved application: fresh form
3. User with localStorage draft: draft preserved

---

### Step 7: Add Loading State for Database Fetch

**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Purpose:** Show loading state while fetching saved application

**Details:**
- Add `isLoadingFromDatabase` state variable
- Set true before fetch, false after
- Return in hook's public API
- UI can show loading indicator

**Changes:**
```javascript
// Add state (around line 133)
const [isLoadingFromDatabase, setIsLoadingFromDatabase] = useState(true);

// In fetch effect
setIsLoadingFromDatabase(true);
try {
  // ... fetch logic ...
} finally {
  setIsLoadingFromDatabase(false);
}

// In return object (around line 659)
isLoadingFromDatabase,
```

**Validation:** UI shows loading spinner while fetching

---

### Step 8: Add `isSubmitted` Flag for View/Edit Mode

**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Purpose:** Track whether user is viewing a submitted application

**Details:**
- Add `isSubmitted` state variable
- Set based on `submitted` field from database
- Can be used to disable form fields or show "Edit" button

**Changes:**
```javascript
// Add state
const [isSubmitted, setIsSubmitted] = useState(false);

// In fetch effect, after loading data
if (result.data.submitted) {
  setIsSubmitted(true);
}

// In return object
isSubmitted,
```

**Validation:** Form shows correct mode based on submission status

---

## Edge Cases & Error Handling

### Edge Case 1: New User (No Prior Application)
- **Behavior:** Form starts empty (existing behavior)
- **Detection:** `userData['Rental Application']` is null
- **Handling:** Skip database fetch, let pre-population effect run

### Edge Case 2: localStorage Draft Exists + Submitted Application in DB
- **Behavior:** Prioritize localStorage draft (user was in middle of editing)
- **Detection:** `formData.fullName && formData.signature && isDirty`
- **Handling:** Skip database fetch, preserve local changes

### Edge Case 3: Failed Database Fetch
- **Behavior:** Graceful degradation to empty form
- **Detection:** Edge Function returns error
- **Handling:** Log error, don't block form usage

### Edge Case 4: Partial Data in Database
- **Behavior:** Fill available fields, leave others empty
- **Detection:** Some fields null in database
- **Handling:** Field mapper handles null/undefined values

### Edge Case 5: Boolean-to-String Conversion
- **Behavior:** Database stores `true`/`false`, form uses 'yes'/'no'/''
- **Detection:** Field type in mapping
- **Handling:** Explicit conversion in field mapper

## Testing Considerations

### Unit Tests
- Field mapper transforms database record correctly
- Boolean-to-string conversion works for all cases
- JSONB address extraction handles null/missing
- Occupants array parsing handles edge cases

### Integration Tests
- Edge Function returns correct data structure
- Frontend correctly populates form from API response
- Progress percentage recalculates correctly
- localStorage draft vs database precedence works

### Manual Test Scenarios
1. **Fresh user:** Navigate to rental application - should see empty form
2. **User with submitted app:** Navigate to rental application - should see all saved data
3. **User mid-draft:** Fill out half the form, leave page, return - should see draft
4. **User mid-draft + submitted app:** Has draft in localStorage but also submitted - should see draft
5. **User with partial app data:** Some fields null in DB - should show available fields

## Rollback Strategy

1. **Edge Function:** Deploy old version without `get` action
2. **Frontend:** Remove database fetch effect (lines TBD)
3. **Store:** Remove `loadFromDatabase` method (optional, harmless to keep)

The changes are additive - existing functionality (localStorage draft, basic pre-population) remains untouched.

## Dependencies & Blockers

- None identified - all required infrastructure exists

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Field mapping errors | Medium | Medium | Comprehensive unit tests, logging |
| Boolean/string conversion bugs | Low | Low | Explicit conversion functions |
| Performance (extra DB query) | Low | Low | Query is simple, single record |
| localStorage/DB data conflict | Medium | Medium | Clear precedence rules documented |

---

## File References Summary

### Files to Create (2)
- `supabase/functions/rental-application/handlers/get.ts`
- `app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts`

### Files to Modify (4)
- `supabase/functions/rental-application/index.ts`
- `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts`
- `app/src/islands/pages/RentalApplicationPage/store/useRentalApplicationStore.ts`
- `app/src/islands/pages/useRentalApplicationPageLogic.js`

### Files for Reference Only (2)
- `supabase/functions/rental-application/handlers/submit.ts` (field name reference)
- `app/src/islands/pages/RentalApplicationPage/store/index.ts` (no changes needed)

---

**DOCUMENT VERSION**: 1.0
**CREATED**: 2025-12-22T17:00:00
**ESTIMATED EFFORT**: 3-4 hours
