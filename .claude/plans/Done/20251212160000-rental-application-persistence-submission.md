# Implementation Plan: Rental Application Form Persistence and Submission Workflow

## Overview
This plan implements localStorage-based form data persistence (mirroring the SelfListingPage pattern) for the Rental Application page, and adds a complete submission workflow that creates a rental application record in Supabase, links it to the user, and batch-updates all existing proposals to reference the new rental application.

## Success Criteria
- [ ] Form data persists in localStorage as user types (debounced auto-save)
- [ ] Form data survives page refreshes until explicitly submitted
- [ ] localStorage is cleared upon successful submission
- [ ] New rental application record is created in Supabase `rentalapplication` table
- [ ] User record is updated with reference to new rental application (`Rental Application` field)
- [ ] All existing proposals by the user are batch-updated with `rental application` field
- [ ] Bubble sync is queued for all created/updated records (INSERT for rental app, UPDATE for user and proposals)

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/useRentalApplicationPageLogic.js` | Business logic hook for rental application | Add enhanced localStorage store, submission workflow |
| `app/src/islands/pages/RentalApplicationPage.jsx` | UI component | Minor - may need loading state for submission |
| `supabase/functions/bubble-proxy/index.ts` | Edge Function entry point | Add new `submit_rental_application` action handler |
| `supabase/functions/bubble-proxy/handlers/` | Handler directory | Create new `submitRentalApplication.ts` handler |
| `supabase/functions/_shared/queueSync.ts` | Queue-based sync utility | Reference only - already exists |

### Database Schema

#### `rentalapplication` Table (exists)
Key fields used in form:
- `_id` (text, NOT NULL) - Bubble-compatible ID
- `Created By` (text, NOT NULL) - User ID
- `name` (text) - Full name
- `DOB` (text) - Date of birth
- `email` (text) - Email
- `phone number` (text) - Phone
- `permanent address` (jsonb) - Address
- `apartment number` (text) - Unit number
- `length resided` (text) - Duration at address
- `renting` (boolean) - Currently renting
- `employment status` (text) - Employment type
- `employer name`, `employer phone number`, `job title` (text) - Employment fields
- `Monthly Income` (integer) - Income
- `business legal name`, `year business was created?`, `state business registered` (text/int) - Business fields
- `occupants list` (jsonb) - Additional occupants
- `pets`, `smoking`, `parking` (boolean) - Special requirements
- `references` (jsonb) - References
- `signature`, `signature (text)` (text) - Signature
- `submitted` (boolean) - Submission status
- `percentage % done` (integer) - Progress

#### `user` Table (exists)
Key field:
- `Rental Application` (text, nullable) - Reference to rental application `_id`

#### `proposal` Table (exists)
Key field:
- `rental application` (text, nullable) - Reference to rental application `_id`

### Existing Patterns to Follow

#### Pattern 1: SelfListingPage localStorage Store
Location: `app/src/islands/pages/SelfListingPage/store/listingLocalStore.ts`

Key concepts:
- Singleton class with Pub/Sub pattern
- 1-second debounced auto-save
- Storage keys for draft and timestamp
- `initialize()` loads from localStorage on mount
- `saveDraft()` serializes and saves
- `reset()` clears all localStorage keys
- React hook adapter (`useListingStore.ts`) provides reactive access

#### Pattern 2: Edge Function Record Creation
Location: `supabase/functions/listing/handlers/create.ts` and `supabase/functions/proposal/actions/create.ts`

Key concepts:
1. Generate Bubble-compatible ID via `supabase.rpc('generate_bubble_id')`
2. Insert record into Supabase table
3. Queue Bubble sync via `enqueueBubbleSync()`
4. Trigger queue processing via `triggerQueueProcessing()`
5. Return created record data

#### Pattern 3: Queue-based Bubble Sync
Location: `supabase/functions/_shared/queueSync.ts`

Key concepts:
- `enqueueBubbleSync()` adds items to `sync_queue` table
- Items have `operation` (INSERT, UPDATE, DELETE)
- `triggerQueueProcessing()` fires and forgets
- Non-blocking - errors don't fail main operation

## Implementation Steps

### Step 1: Create Rental Application Local Store
**Files:** `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts`
**Purpose:** Implement localStorage persistence pattern for rental application form data

**Details:**
- Create new `RentalApplicationPage/` directory structure mirroring SelfListingPage
- Create `rentalApplicationLocalStore.ts` as singleton class
- Storage keys: `rentalApplicationDraft`, `rentalApplicationLastSaved`
- Implement debounced auto-save (1 second delay)
- Handle serialization of complex fields (occupants array, verification status)
- Implement `initialize()`, `saveDraft()`, `updateData()`, `reset()` methods
- Add Pub/Sub pattern for React integration

**Key implementation details:**
```typescript
const STORAGE_KEYS = {
  DRAFT: 'rentalApplicationDraft',
  LAST_SAVED: 'rentalApplicationLastSaved',
} as const;

interface RentalApplicationFormData {
  // Personal
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  // Address
  currentAddress: string;
  apartmentUnit: string;
  lengthResided: string;
  renting: string;
  // Employment
  employmentStatus: string;
  employerName: string;
  employerPhone: string;
  jobTitle: string;
  monthlyIncome: string;
  businessName: string;
  businessYear: string;
  businessState: string;
  // Special requirements
  hasPets: string;
  isSmoker: string;
  needsParking: string;
  // References
  references: string;
  // Signature
  signature: string;
  // Meta
  occupants: Occupant[];
  verificationStatus: VerificationStatus;
}
```

**Validation:** Test that form data persists after page refresh

### Step 2: Create React Hook Adapter for Store
**Files:** `app/src/islands/pages/RentalApplicationPage/store/useRentalApplicationStore.ts`
**Purpose:** Provide reactive React hook interface to the singleton store

**Details:**
- Mirror `useListingStore.ts` pattern
- Subscribe to store updates in useEffect
- Call `initialize()` on mount
- Return memoized update functions via useCallback
- Return state values (formData, lastSaved, isDirty)

**Validation:** Test that React component re-renders when store updates

### Step 3: Integrate Store into Page Logic Hook
**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Purpose:** Replace inline state management with localStorage-backed store

**Details:**
- Import and use `useRentalApplicationStore` hook
- Remove existing `useState` for `formData` and `occupants`
- Keep `verificationStatus` in local state (or include in store)
- Keep `uploadedFiles` in local state (files cannot be serialized)
- Update all handlers to use store methods
- Keep existing validation logic intact
- Keep existing progress calculation intact
- Clear localStorage on successful submission (`store.reset()`)

**Key changes to handleInputChange:**
```javascript
// Before
const handleInputChange = useCallback((fieldName, value) => {
  setFormData(prev => ({ ...prev, [fieldName]: value }));
  setIsDirty(true);
}, []);

// After
const handleInputChange = useCallback((fieldName, value) => {
  store.updateData({ [fieldName]: value });
}, [store]);
```

**Validation:** Test that typing in form fields persists to localStorage

### Step 4: Create Edge Function Handler for Rental Application Submission
**Files:** `supabase/functions/bubble-proxy/handlers/submitRentalApplication.ts`
**Purpose:** Create rental application record and update related records

**Details:**
- Validate required fields (name, email, signature)
- Generate Bubble-compatible ID via `supabase.rpc('generate_bubble_id')`
- Build rental application data object mapping form fields to database columns
- Insert record into `rentalapplication` table
- Update user record with `Rental Application` field
- Fetch all user's proposals and batch update `rental application` field
- Queue Bubble sync for all operations (INSERT rental app, UPDATE user, UPDATE each proposal)
- Return success response with rental application ID

**Database field mappings:**
```typescript
const rentalAppData = {
  _id: newId,
  'Created By': userId,
  name: payload.fullName,
  DOB: payload.dob,
  email: payload.email,
  'phone number': payload.phone,
  'permanent address': { address: payload.currentAddress },
  'apartment number': payload.apartmentUnit,
  'length resided': payload.lengthResided,
  renting: payload.renting === 'yes',
  'employment status': payload.employmentStatus,
  'employer name': payload.employerName,
  'employer phone number': payload.employerPhone,
  'job title': payload.jobTitle,
  'Monthly Income': parseInt(payload.monthlyIncome) || null,
  'business legal name': payload.businessName,
  'year business was created?': parseInt(payload.businessYear) || null,
  'state business registered': payload.businessState,
  'occupants list': payload.occupants,
  pets: payload.hasPets === 'yes',
  smoking: payload.isSmoker === 'yes',
  parking: payload.needsParking === 'yes',
  references: payload.references ? [payload.references] : null,
  signature: payload.signature,
  'signature (text)': payload.signature,
  submitted: true,
  'percentage % done': 100,
  'Created Date': now,
  'Modified Date': now,
};
```

**Validation:** Test Edge Function with mock data via curl

### Step 5: Register Handler in Bubble Proxy Index
**Files:** `supabase/functions/bubble-proxy/index.ts`
**Purpose:** Wire up the new action handler

**Details:**
- Import `handleSubmitRentalApplication` from handlers
- Add case for `submit_rental_application` action
- Pass payload and supabase client to handler

**Code addition:**
```typescript
import { handleSubmitRentalApplication } from './handlers/submitRentalApplication.ts';

// In switch statement
case 'submit_rental_application':
  return await handleSubmitRentalApplication(payload, supabase, userId);
```

**Validation:** Test that action routes correctly

### Step 6: Update handleSubmit in Page Logic
**Files:** `app/src/islands/pages/useRentalApplicationPageLogic.js`
**Purpose:** Call Edge Function on form submission

**Details:**
- Replace simulated API call with actual fetch to Edge Function
- Call `POST /functions/v1/bubble-proxy` with action `submit_rental_application`
- Include auth token in Authorization header
- Pass form data as payload
- Handle success: clear localStorage via `store.reset()`, show success modal
- Handle errors: display error message, keep form data

**Key implementation:**
```javascript
const handleSubmit = useCallback(async (event) => {
  if (event) event.preventDefault();

  const isValid = validateAllFields();
  if (!isValid) {
    setSubmitError('Please fill in all required fields correctly.');
    return;
  }

  setIsSubmitting(true);
  setSubmitError(null);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bubble-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        action: 'submit_rental_application',
        payload: {
          ...formData,
          occupants,
          verificationStatus,
        }
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Submission failed');
    }

    // Clear localStorage on success
    store.reset();
    setSubmitSuccess(true);
    setIsDirty(false);
  } catch (error) {
    console.error('Submission failed:', error);
    setSubmitError(error.message || 'Failed to submit application. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
}, [formData, occupants, verificationStatus, validateAllFields, store]);
```

**Validation:** Test full submission flow end-to-end

### Step 7: Update User Proposals with Rental Application Reference
**Files:** `supabase/functions/bubble-proxy/handlers/submitRentalApplication.ts` (same as Step 4)
**Purpose:** Batch update all user proposals to reference the new rental application

**Details:**
- Query all proposals where `Guest` equals the user ID
- Collect proposal IDs for batch update
- Update each proposal's `rental application` field with new rental app ID
- Queue UPDATE operations for each proposal to Bubble sync

**Implementation:**
```typescript
// Fetch user's proposals
const { data: userProposals, error: proposalsFetchError } = await supabase
  .from('proposal')
  .select('_id')
  .eq('Guest', userId);

if (userProposals && userProposals.length > 0) {
  // Batch update proposals
  const proposalIds = userProposals.map(p => p._id);

  const { error: proposalsUpdateError } = await supabase
    .from('proposal')
    .update({
      'rental application': rentalAppId,
      'Modified Date': now
    })
    .in('_id', proposalIds);

  // Queue Bubble sync for each proposal
  for (const proposal of userProposals) {
    syncItems.push({
      sequence: syncItems.length + 1,
      table: 'proposal',
      recordId: proposal._id,
      operation: 'UPDATE',
      payload: { 'rental application': rentalAppId },
    });
  }
}
```

**Validation:** Verify proposals are updated in database after submission

## Edge Cases & Error Handling

### localStorage Quota Exceeded
- If localStorage quota is exceeded, log warning but continue (form still works in memory)
- Mimic the SelfListingPage pattern: catch error in `saveDraft()`, log but don't fail

### User Not Authenticated
- Check auth status before submission
- Redirect to login or show auth modal if not authenticated
- Form data remains in localStorage for after login

### Existing Rental Application
- Check if user already has a rental application before creating new one
- Option A: Update existing application (UPSERT behavior)
- Option B: Prevent submission with message "You already have a rental application"
- Recommended: Option A - allow updates to existing application

### Proposal Update Failures
- Log but don't fail entire submission if some proposals fail to update
- Proposals without rental application reference will still function
- Bubble sync will retry failed items

### Partial Submission Failure
- If rental application insert succeeds but user update fails:
  - Still return success (rental app exists)
  - Bubble sync will eventually propagate
  - User can link application manually if needed

## Testing Considerations

### Unit Tests
- Store methods: `initialize()`, `saveDraft()`, `updateData()`, `reset()`
- Field validation functions
- Progress calculation with various field combinations

### Integration Tests
- localStorage persistence across page refreshes
- Auto-save debouncing (verify 1 second delay)
- Form submission with various employment statuses
- Proposal batch update verification

### E2E Tests
- Complete flow: Fill form -> Submit -> Verify database records
- Error handling: Network failure during submission
- localStorage cleared after successful submission

## Rollback Strategy

### Frontend Rollback
- Revert `useRentalApplicationPageLogic.js` to remove store integration
- Delete new store files in `RentalApplicationPage/store/`
- localStorage keys will remain but be unused (harmless)

### Backend Rollback
- Remove `submit_rental_application` case from bubble-proxy index
- Delete `submitRentalApplication.ts` handler
- Database records created are valid and don't need rollback
- Bubble sync queue items will fail gracefully if handler removed

## Dependencies & Blockers

### Dependencies
- Supabase Edge Functions must be deployed after handler is added
- `generate_bubble_id` RPC function must exist (already verified)
- `rentalapplication` table must exist (already verified)

### Blockers
- None identified

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| localStorage quota exceeded | Low | Low | Graceful degradation, form still works |
| Bubble sync queue backup | Low | Medium | pg_cron runs every 5 minutes as fallback |
| Concurrent submission | Low | Medium | Use database constraints, check existing app |
| Network failure mid-submit | Medium | Low | Show error, form data preserved in localStorage |

## Files Referenced Summary

### Files to Create
1. `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts`
2. `app/src/islands/pages/RentalApplicationPage/store/useRentalApplicationStore.ts`
3. `app/src/islands/pages/RentalApplicationPage/store/index.ts`
4. `supabase/functions/bubble-proxy/handlers/submitRentalApplication.ts`

### Files to Modify
1. `app/src/islands/pages/useRentalApplicationPageLogic.js`
2. `supabase/functions/bubble-proxy/index.ts`

### Reference Files (read-only)
1. `app/src/islands/pages/SelfListingPage/store/listingLocalStore.ts` - Pattern reference
2. `app/src/islands/pages/SelfListingPage/store/useListingStore.ts` - Pattern reference
3. `supabase/functions/proposal/actions/create.ts` - Record creation pattern
4. `supabase/functions/listing/handlers/create.ts` - Record creation pattern
5. `supabase/functions/_shared/queueSync.ts` - Sync utility reference

### Database Tables
1. `rentalapplication` - New records created
2. `user` - `Rental Application` field updated
3. `proposal` - `rental application` field updated on existing records

---
**Plan Version**: 1.0
**Created**: 2025-12-12
**Author**: Claude Code (implementation-planner)
