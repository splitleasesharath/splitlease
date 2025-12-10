# Section 7: Listing Creation Process - Complete Analysis

**Date**: 2025-12-06
**Scope**: Self-listing page Section 7 implementation, submission logic, and backend integration
**Status**: Analysis Complete - Ready for Implementation/Troubleshooting

---

## Executive Summary

Section 7 (Review & Submit) is the final step in the self-listing form wizard. It displays a comprehensive review of all entered data across 6 sections and provides optional fields for additional details. When users submit, the form data flows through an auth check, validation, local storage persistence, Supabase database insertion, and finally Bubble API sync.

---

## 1. Section 7 Component Implementation

### File Location
**C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\sections\Section7Review.tsx**

### Component Structure

```tsx
export const Section7Review: React.FC<Section7Props>
```

**Props Interface** (lines 6-14):
```typescript
interface Section7Props {
  formData: ListingFormData;        // Full form data from all 6 sections
  reviewData: ReviewData;           // Optional fields (safety, sqft, first day, reviews link)
  onChange: (data: ReviewData) => void;
  onSubmit: () => void;             // Submission handler
  onBack: () => void;               // Navigate to Section 6
  onNavigateToSection?: (sectionNum: number) => void;  // Jump to any section
  isSubmitting: boolean;            // Loading state during submission
}
```

### Key Sections

#### 1.1 Optional Details Section (Lines 77-175)

**Purpose**: Collect additional information not required but beneficial for listing quality.

**Fields**:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| Safety Features | Checkboxes | No | Select from predefined safety features (fire alarm, security camera, etc.) |
| Square Footage | Number | No | Approximate size in sq ft |
| First Day Available | Date | No | When guests can start booking (defaults to today) |
| Previous Reviews Link | URL | No | Link to Airbnb/VRBO reviews to import credibility |

**Key Feature** (Lines 29-41):
- "Load Common" button calls `getCommonSafetyFeatures()` to pre-populate common safety features from database
- Async operation with loading state
- Graceful error handling (logs but continues)

#### 1.2 Review Summary Cards (Lines 177-332)

**Collapsible Summary Cards** for each section:

| Section | Card (Line) | Summary Displays | Edit Link |
|---------|-------------|------------------|-----------|
| Space Details | 180 | Type + City + Bedrooms/Bathrooms | Navigates to Section 1 |
| Features | 201 | Number of amenities + description preview | Section 2 |
| Lease Style | 220 | Rental type + pattern/nights available | Section 3 |
| Pricing | 249 | Primary rate (monthly/weekly/nightly) | Section 4 |
| Rules | 283 | Cancellation policy + rules count | Section 5 |
| Photos | 304 | Photo count + thumbnail grid (first 4) | Section 6 |

**Implementation Pattern** (Line 43-48):
- Uses `expandedSections` state to track which cards are open
- Click header to toggle visibility
- Shows brief summary when collapsed, full details when expanded
- "Edit Section" button allows jumping to any section for quick corrections

#### 1.3 Important Information Box (Lines 334-344)

Pre-submission checklist:
- Listing reviewed within 24-48 hours
- Email notification on approval
- Can edit after submission
- Contact info remains private
- Must agree to Terms during signup

#### 1.4 Fixed Bottom Navigation (Lines 346-366)

```tsx
<button className="btn-back" onClick={onBack} disabled={isSubmitting}>
  Back
</button>
<button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit Listing'}
</button>
```

**Logic** (Lines 67-70):
```typescript
const handleSubmit = () => {
  // No validation needed - button is always clickable
  onSubmit();
};
```

Note: **No validation in Section 7 itself** - all validation happens in parent component and in `stageForSubmission()` method.

---

## 2. Parent Component: SelfListingPage

### File Location
**C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\SelfListingPage.tsx**

### Key Section Rendering (Lines 754-764)

```tsx
{currentSection === 7 && (
  <Section7Review
    formData={formData}
    reviewData={formData.review}
    onChange={updateReview}
    onSubmit={handleSubmit}
    onBack={handleBack}
    onNavigateToSection={handleSectionChange}
    isSubmitting={isSubmitting}
  />
)}
```

### Submit Flow in Parent (Lines 517-579)

#### Phase 1: Authorization Check (Lines 561-579)
```typescript
const handleSubmit = async () => {
  // 1. Check if user is logged in
  const loggedIn = await checkAuthStatus();
  setIsLoggedIn(loggedIn);

  if (!loggedIn) {
    // 2. Show auth modal if NOT logged in
    setPendingSubmit(true);
    setShowAuthModal(true);
    return;
  }

  // 3. User is logged in - proceed
  proceedWithSubmit();
};
```

#### Phase 2: Data Staging & Validation (Lines 517-558)
```typescript
const proceedWithSubmit = async () => {
  setIsSubmitting(true);
  markSubmitting();

  try {
    // Stage and validate all form data
    const { success, errors } = stageForSubmission();

    if (!success) {
      console.error('❌ Validation errors:', errors);
      alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
      setIsSubmitting(false);
      return;
    }

    // Show loading modal immediately
    setShowSuccessModal(true);

    // Submit to Supabase
    const newListing = await createListing(formData);

    console.log('[SelfListingPage] ✅ Listing created:', newListing);

    // Mark as submitted (clears local storage)
    markSubmitted();

    // Update modal with listing ID (transition from loading to success)
    setCreatedListingId(newListing.id);
  } catch (error) {
    // Hide modal on error
    setShowSuccessModal(false);
    alert(`Error submitting listing: ...`);
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Phase 3: Post-Auth Submission (Lines 476-514)
When user signs up/logs in via modal, `handleAuthSuccess` is triggered:

```typescript
const handleAuthSuccess = (result: { success: boolean; isNewUser?: boolean }) => {
  setShowAuthModal(false);

  // Show success toast
  showToast(
    isSignup ? 'Account created successfully! Creating your listing...'
    : 'Logged in successfully! Creating your listing...',
    'success',
    4000
  );

  // Mark terms as agreed (user agreed by signing up)
  updateReview({
    ...formData.review,
    agreedToTerms: true,
  });

  if (pendingSubmit) {
    setPendingSubmit(false);

    // Show loading modal immediately
    setIsSubmitting(true);
    setShowSuccessModal(true);

    // Delay submission to ensure auth state is updated
    setTimeout(() => {
      proceedWithSubmitAfterAuth();
    }, 300);
  }
};
```

### Success Modal Component (Lines 24-213)

**Two States**:

1. **Loading State** (Lines 146-168)
   - Shows spinner + "Creating Your Listing..." message
   - Displays listing name being created
   - Triggered while `isSubmitting && !createdListingId`

2. **Success State** (Lines 170-212)
   - Shows checkmark + "Listing Created Successfully!"
   - Two action buttons:
     - "Go to My Dashboard" → `/listing-dashboard.html?listing_id=${listingId}`
     - "Preview Listing" → `/view-split-lease.html?listing_id=${listingId}`
   - Secondary text: "You'll be notified once your listing is approved."

**Usage**:
```tsx
<SuccessModal
  isOpen={showSuccessModal}
  listingId={createdListingId}
  listingName={formData.spaceSnapshot.listingName}
  isLoading={isSubmitting && !createdListingId}
/>
```

---

## 3. Data Flow: Form → Database

### 3.1 Store Management (useListingStore)

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\store\useListingStore.ts`

**Key Methods**:

```typescript
// Get current form state
const formData = state.data;

// Update any section
updateSpaceSnapshot(data)
updateFeatures(data)
updateLeaseStyles(data)
updatePricing(data)
updateRules(data)
updatePhotos(data)
updateReview(data)

// Persist to localStorage
saveDraft(): boolean

// Prepare for submission
const { success, errors } = stageForSubmission()
// Returns: { success: boolean; errors: string[] }
```

**Behind the Scenes** (Lines 115-116):
```typescript
const stageForSubmission = useCallback(() => {
  return listingLocalStore.stageForSubmission();
}, []);
```

### 3.2 Data Transformation: Form → Database Schema

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\listingService.js`

**Function**: `mapFormDataToDatabase(formData, userId)` (Lines 499-632)

**Transformation Pattern**:

```javascript
// Input: Nested React form structure
const formData = {
  spaceSnapshot: { listingName, typeOfSpace, address: { ... } },
  features: { amenitiesInsideUnit, descriptionOfLodging, ... },
  leaseStyles: { rentalType, availableNights: { sun, mon, ... } },
  pricing: { damageDeposit, monthlyCompensation, ... },
  rules: { cancellationPolicy, checkInTime, ... },
  photos: { photos: [...] },
  review: { safetyFeatures, squareFootage, ... }
}

// Output: Flat database column names
const dbRecord = {
  'Name': formData.spaceSnapshot.listingName,
  'Features - Type of Space': formData.spaceSnapshot.typeOfSpace,
  'Location - Address': { address, lat, lng, ... },
  'Location - City': formData.spaceSnapshot.address.city,
  'Features - Amenities In-Unit': formData.features.amenitiesInsideUnit,
  'Days Available (List of Days)': [2, 3, 4, 5, 6],  // 1-based Bubble days
  'Cancellation Policy': formData.rules.cancellationPolicy,
  // ... 60+ columns total
}
```

**Key Transformations**:

| React Field | DB Column | Transformation |
|-------------|-----------|-----------------|
| `spaceSnapshot.address.fullAddress` | `Location - Address` | JSONB with address, lat, lng |
| `leaseStyles.availableNights` | `Days Available (List of Days)` | Convert object to 1-based day array |
| `pricing.nightlyPricing` | Multiple columns | Map individual rates to `💰Nightly Host Rate for X nights` |
| `photos.photos[].url` | `Features - Photos` | Array of photo objects with metadata |
| All sections | `form_metadata` | Store currentSection, completedSections, isDraft |

### 3.3 Photo Upload (Lines 38-59)

Photos are uploaded to Supabase Storage BEFORE inserting the listing record:

```javascript
if (formData.photos?.photos?.length > 0) {
  try {
    uploadedPhotos = await uploadPhotos(formData.photos.photos, tempListingId);
    console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
  } catch (uploadError) {
    // Continue with data URLs as fallback
    uploadedPhotos = formData.photos.photos.map(p => ({
      url: p.url,
      Photo: p.url,
      // ... fallback structure
    }));
  }
}
```

---

## 4. Database Operations

### 4.1 Supabase Insertion (Lines 72-84)

```javascript
const { data, error } = await supabase
  .from('listing_trial')
  .insert(listingData)
  .select()
  .single();

// On success: Returns { id: uuid, created_at, ... }
// On error: Throws error
```

**Table**: `listing_trial` (new listings in Supabase)

**Created Columns** (from mapFormDataToDatabase):
- Core: Name, Features-*, Location-*, Kitchen Type, Parking type
- Features: Amenities, Description, Photos
- Lease: rental type, Days Available, weekly_pattern
- Pricing: 💰Damage Deposit, 💰Monthly Host Rate, etc.
- Rules: Cancellation Policy, House Rules, Check-in/out times
- Review: Safety features, SQFT, First Available
- Metadata: form_metadata (JSON), source_type, status flags

### 4.2 Host Linking (Lines 87-95)

Links the new listing to the user's host account:

```javascript
async function linkListingToHost(userId, listingId) {
  // Get current Listings array from account_host
  const { data: hostData } = await supabase
    .from('account_host')
    .select('_id, Listings')
    .eq('User', userId)
    .maybeSingle();

  // Append new listing ID
  const currentListings = hostData.Listings || [];
  currentListings.push(listingId);

  // Update account_host record
  await supabase
    .from('account_host')
    .update({ Listings: currentListings })
    .eq('_id', hostData._id);
}
```

**Result**: User can see listing in their dashboard

### 4.3 Bubble Sync (Lines 98-135)

After Supabase insertion, listing is synced to Bubble via Edge Function:

```javascript
async function syncListingToBubble(supabaseData, formData) {
  const payload = {
    listing_name: supabaseData.Name,
    supabase_id: supabaseData.id,
    type_of_space, bedrooms, beds, bathrooms,
    city, state, zip_code, rental_type, description
  };

  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: {
      action: 'sync_listing_to_bubble',
      payload,
    },
  });

  // Returns { bubble_id: '...' }
  return data.data?.bubble_id;
}
```

**Flow Diagram**:
```
Step 1: Insert to listing_trial (Supabase)
         ↓
Step 2: Link to account_host (Supabase)
         ↓
Step 3: Call bubble-proxy with sync_listing_to_bubble action
         ↓
Step 4: Edge Function creates in Bubble (via workflow)
         ↓
Step 5: Edge Function returns Bubble _id
         ↓
Step 6: Update listing_trial with _id
         ↓
Step 7: Sync to main listing table (best-effort)
         ↓
SUCCESS: Return listing with both Supabase id and Bubble _id
```

---

## 5. Edge Function: bubble-proxy Handler

### File Location
**C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-proxy\handlers\listingSync.ts**

### Handler: handleListingSyncToBubble (Lines 27-121)

**Invocation**:
```typescript
await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'sync_listing_to_bubble',
    payload: {
      listing_name: string;
      supabase_id: string;
      user_email?: string;
      type_of_space?: string;
      bedrooms?: number;
      // ... optional fields
    }
  }
})
```

**Validation** (Lines 36-37):
- Required: `listing_name`, `supabase_id`
- Optional: user_email, type_of_space, bedrooms, beds, bathrooms, city, state, zip_code, rental_type, description

**Execution** (Lines 92-105):
```typescript
try {
  // Trigger Bubble workflow: listing_creation_in_code
  const bubbleId = await syncService.triggerWorkflow(
    'listing_creation_in_code',
    bubbleParams
  );

  console.log('[ListingSync Handler] ✅ Listing created in Bubble');
  return { bubble_id: bubbleId };
} catch (error) {
  console.error('[ListingSync Handler] Failed to sync to Bubble:', error);
  throw new BubbleApiError(
    `Failed to create listing in Bubble: ${error.message}`,
    500,
    error
  );
}
```

**No Fallback**: If Bubble creation fails, the edge function throws an error. The Supabase listing_trial record exists but remains without a Bubble _id.

### Service: BubbleSyncService

**Used by handler**:
```typescript
const syncService = new BubbleSyncService(
  bubbleBaseUrl,           // BUBBLE_API_BASE_URL secret
  bubbleApiKey,            // BUBBLE_API_KEY secret
  supabaseUrl,             // VITE_SUPABASE_URL
  supabaseServiceKey       // SUPABASE_SERVICE_ROLE_KEY secret
);

await syncService.triggerWorkflow(
  'listing_creation_in_code',  // Bubble workflow name
  bubbleParams                  // Workflow input params
);
// Returns: Bubble object _id as string
```

**Critical Path**:
1. Auth check (if required, uses JWT from Authorization header)
2. Validate payload fields
3. Call BubbleSyncService.triggerWorkflow()
4. Return { bubble_id: string }

---

## 6. Validation Logic

### 6.1 Section Completion Validation (SelfListingPage.tsx, Lines 337-380)

Determines if a section can be marked complete:

```typescript
const isSectionComplete = (sectionNum: number): boolean => {
  switch (sectionNum) {
    case 1: // Space Snapshot
      return !!(
        formData.spaceSnapshot.listingName &&
        formData.spaceSnapshot.typeOfSpace &&
        formData.spaceSnapshot.typeOfKitchen &&
        formData.spaceSnapshot.typeOfParking &&
        formData.spaceSnapshot.address.fullAddress &&
        formData.spaceSnapshot.address.validated  // Must pass Google validation
      );
    case 2: // Features
      return !!(
        formData.features.amenitiesInsideUnit.length > 0 &&
        formData.features.descriptionOfLodging
      );
    case 3: // Lease Styles
      return !!(
        formData.leaseStyles.rentalType &&
        (rentalType !== 'Nightly' || nights selected) &&
        (rentalType !== 'Weekly' || pattern selected)
      );
    case 4: // Pricing
      return !!(
        (Monthly && monthlyCompensation) ||
        (Weekly && weeklyCompensation) ||
        (Nightly && oneNightPrice)
      );
    case 5: // Rules
      return !!(
        formData.rules.cancellationPolicy &&
        formData.rules.checkInTime &&
        formData.rules.checkOutTime
      );
    case 6: // Photos
      return formData.photos.photos.length >= formData.photos.minRequired;  // >= 3
    case 7: // Review
      return true;  // Always accessible
  }
};
```

**Key Rule**: Section 7 has NO validation - always returns true. All validation happens in store's `stageForSubmission()` method.

### 6.2 Store Submission Validation (useListingStore.ts)

When `stageForSubmission()` is called:

```typescript
const stageForSubmission = useCallback(() => {
  return listingLocalStore.stageForSubmission();
}, []);
```

This calls `listingLocalStore.stageForSubmission()` which:
1. Validates all required fields across all 7 sections
2. Builds error array
3. Returns `{ success: boolean; errors: string[] }`

**Errors are then shown to user**:
```typescript
if (!success) {
  alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
  return;
}
```

---

## 7. Error Handling

### 7.1 Authentication Failure

```typescript
const handleSubmit = async () => {
  const loggedIn = await checkAuthStatus();

  if (!loggedIn) {
    // Show SignUpLoginModal
    setShowAuthModal(true);
    return;
  }
  // ... continue
};
```

### 7.2 Validation Failure

```typescript
const { success, errors } = stageForSubmission();

if (!success) {
  alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
  setIsSubmitting(false);
  return;
}
```

### 7.3 Submission Failure

```typescript
try {
  const newListing = await createListing(formData);
  // success
} catch (error) {
  setShowSuccessModal(false);  // Hide loading modal
  alert(`Error submitting listing: ${error.message}`);
}
```

### 7.4 Photo Upload Failure (Graceful Degradation)

```javascript
try {
  uploadedPhotos = await uploadPhotos(formData.photos.photos, tempListingId);
} catch (uploadError) {
  console.error('[ListingService] ⚠️ Photo upload failed:', uploadError);
  // Continue with data URLs as fallback
  uploadedPhotos = formData.photos.photos.map(p => ({
    url: p.url,
    // ... fallback
  }));
}
```

### 7.5 Bubble Sync Failure (Best-Effort)

```javascript
try {
  const bubbleId = await syncListingToBubble(data, formData);
  // Update with _id
} catch (syncError) {
  console.error('[ListingService] ⚠️ Bubble sync failed:', syncError);
  // Continue - listing exists in Supabase
  // Can retry sync later
  return data;  // Without _id
}
```

---

## 8. State Management Flow

```
User navigates to Section 7
  ↓
Parent loads formData from useListingStore
  ↓
Section7Review renders with formData + reviewData
  ↓
User fills optional fields (safety features, sqft, etc.)
  ↓
onChange() callbacks → updateReview() → store updates
  ↓
User clicks "Submit Listing"
  ↓
handleSubmit() → checkAuthStatus()
  ├─ If not logged in: Show auth modal
  │  └─ User signs up/logs in → handleAuthSuccess() → proceedWithSubmitAfterAuth()
  └─ If logged in: proceedWithSubmit()
  ↓
stageForSubmission() → validate all sections
  ├─ If errors: Show alert, return
  └─ If valid: Continue
  ↓
Show SuccessModal with loading state (spinner)
  ↓
createListing(formData)
  ├─ Upload photos to Supabase Storage
  ├─ Insert to listing_trial table
  ├─ Link to account_host
  ├─ Sync to Bubble (via edge function)
  ├─ Update listing_trial with Bubble _id
  └─ Sync to main listing table (best-effort)
  ↓
markSubmitted() → Clear localStorage
  ↓
setCreatedListingId(newListing.id) → Transition modal to success state
  ↓
Show "Go to Dashboard" and "Preview Listing" buttons
```

---

## 9. Key Files Summary

| File | Purpose | Key Functions/Components |
|------|---------|--------------------------|
| `Section7Review.tsx` | Section 7 UI component | `Section7Review`, optional fields, summary cards |
| `SelfListingPage.tsx` | Parent orchestrator | `handleSubmit`, `proceedWithSubmit`, `SuccessModal` |
| `listingService.js` | Database operations | `createListing`, `mapFormDataToDatabase`, photo upload |
| `useListingStore.ts` | Store hook | `stageForSubmission`, `markSubmitted`, form updates |
| `listingLocalStore.ts` | Store implementation | localStorage persistence, validation |
| `listingSync.ts` (Edge Function) | Bubble sync | `handleListingSyncToBubble`, workflow trigger |

---

## 10. Critical Paths & Line Numbers

### Flow: Submit → Database

| Step | File | Lines | Action |
|------|------|-------|--------|
| 1 | SelfListingPage.tsx | 561-579 | Check auth, show modal if needed |
| 2 | SelfListingPage.tsx | 437-474 | Handle auth success (signup/login) |
| 3 | SelfListingPage.tsx | 517-558 | Validate & submit |
| 4 | listingService.js | 28-138 | Create listing (orchestrator) |
| 5 | listingService.js | 70-84 | Insert to listing_trial |
| 6 | listingService.js | 148-186 | Link to account_host |
| 7 | listingService.js | 303-342 | Sync to Bubble via edge function |
| 8 | listingSync.ts (Edge) | 27-121 | Call Bubble workflow |
| 9 | listingService.js | 102-114 | Update listing_trial with _id |

---

## 11. Database Schema References

### listing_trial Table
- `id` (UUID, primary key)
- `Name` (string) - Listing name
- `Features - *` (multiple columns)
- `Location - *` (multiple columns)
- `Cancellation Policy` (string)
- `Features - Photos` (JSON array)
- `Features - Safety` (array)
- `form_metadata` (JSON)
- `_id` (string) - Bubble ID (set after sync)
- `created_at`, `updated_at` (timestamps)

### account_host Table
- `_id` (Bubble ID)
- `User` (Bubble user ID)
- `Listings` (array of listing IDs)

---

## 12. Critical Business Rules

1. **No Fallback on Errors**: Section 7 submission validates all sections. If any section has missing required fields, submission fails with error alert.

2. **Photo Upload is Optional**: If photo upload fails, listing continues with data URLs as fallback.

3. **Bubble Sync is Best-Effort**: If Bubble sync fails after Supabase insertion, listing still exists in Supabase. Sync can be retried.

4. **Auth is Required**: Users must be logged in to submit. If not logged in, auth modal appears.

5. **Terms Agreement**: When user signs up via modal, they implicitly agree to terms (modal shows "By signing up... you agree to...").

6. **Day Indexing**: Form uses 0-based days (JavaScript), database stores 1-based days (Bubble compatibility).

---

## 13. Testing Checklist

- [ ] Section 7 renders all summary cards correctly
- [ ] Optional fields (safety features, sqft, reviews link) save properly
- [ ] Clicking "Edit Section" navigates to that section
- [ ] Clicking "Back" goes to Section 6
- [ ] Submit without auth shows auth modal
- [ ] Submit with missing required fields shows error alert
- [ ] Submit with complete form:
  - [ ] Shows loading modal with spinner
  - [ ] Uploads photos to Supabase Storage
  - [ ] Inserts to listing_trial table
  - [ ] Links to account_host record
  - [ ] Calls bubble-proxy edge function
  - [ ] Updates listing_trial with Bubble _id
  - [ ] Transitions modal to success state
  - [ ] Success modal shows listing ID
  - [ ] "Go to Dashboard" button navigates to /listing-dashboard.html?listing_id=...
  - [ ] "Preview Listing" button navigates to /view-split-lease.html?listing_id=...

---

## 14. Potential Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| "Listing created but no _id" | Bubble sync failed | Listing still exists in Supabase; check Edge Function logs |
| "Photos not uploaded" | Storage failure | Check storagePath; fall back to data URLs; check bucket permissions |
| "User not linked to listing" | account_host link failed | Listing still exists; manually update account_host Listings array |
| "Auth modal doesn't dismiss" | Token not stored | Check secureStorage.js; verify token is persisted |
| "Validation errors not showing" | stageForSubmission() doesn't catch issue | Add debug logging to validation functions |

---

**Document Complete** - Ready for reference during implementation or debugging.
