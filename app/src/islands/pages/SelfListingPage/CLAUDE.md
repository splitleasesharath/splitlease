# SelfListingPage Module - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Multi-section listing creation wizard for hosts

---

## QUICK_STATS

[TOTAL_FILES]: 22
[PRIMARY_LANGUAGE]: TypeScript/TSX
[KEY_PATTERNS]: Wizard pattern, localStorage persistence, Shadow DOM components
[ENTRY_POINT]: src/self-listing.jsx

---

## DIRECTORY_STRUCTURE

### components/
[FILES]: 1
[INTENT]: Reusable UI components for listing form

### sections/
[FILES]: 7
[INTENT]: Wizard step components (Section1-Section7)

### store/
[FILES]: 4
[INTENT]: Local memory store with localStorage persistence

### styles/
[FILES]: 1
[INTENT]: CSS styling for listing page

### types/
[FILES]: 1
[INTENT]: TypeScript type definitions

### utils/
[FILES]: 3
[INTENT]: Service modules for data fetching

---

## FILES

### index.ts
[INTENT]: Barrel export for SelfListingPage module
[EXPORTS]: SelfListingPage, all types from listing.types

### SelfListingPage.tsx
[INTENT]: Main wizard orchestrator with 7-section form
[IMPORTS]: All sections, store, shared components
[STATE]: currentSection, isSubmitting, showAuthModal, showSuccessModal
[PATTERN]: Controlled wizard with validation gates
[AUTH_GUARD]: Redirects Guest users to index, allows logged-out and Host users
[KEY_FEATURES]: Section locking, draft saving, success modal with loading state
[SUBMISSION_FLOW]: Check auth → Show modal if logged out → Validate → Create listing → Show success

### styles/SelfListingPage.css
[INTENT]: Page-specific styles for wizard UI
[DEPENDS_ON]: Global CSS variables

---

## WIZARD_FLOW

```
Section 1: Space Snapshot → Address, bedrooms, kitchen, parking
Section 2: Features → Amenities, descriptions
Section 3: Lease Styles → Nightly/Weekly/Monthly rental type
Section 4: Pricing → Rate configuration per rental type
Section 5: Rules → Check-in, house rules, cancellation policy
Section 6: Photos → Upload images to Supabase storage
Section 7: Review → Preview and submit
```

[VALIDATION]: Each section must be completed before next unlocks
[PROGRESS]: Circular progress indicator shows X/6 completed
[NAVIGATION]: Sidebar with section icons, locked sections show lock icon

---

## DATA_FLOW

```
User Input
    ↓
Section Component (onChange callback)
    ↓
useListingStore hook
    ↓
listingLocalStore (singleton)
    ↓
localStorage (auto-save with 1s debounce)
    ↓
Submit → prepareListingSubmission → listingService → Supabase listing_trial
```

[AUTO_SAVE]: 1 second debounce after field changes
[STORAGE_KEYS]: selfListingDraft, selfListingStagedForSubmission, selfListingLastSaved
[PERSISTENCE]: Form data survives page refresh

---

## SUBMISSION_FLOW

```
1. User clicks Submit (Section 7)
2. Check auth status
3. IF not logged in:
   - Show SignUpLoginModal with defaultUserType="host"
   - Set agreedToTerms=true after signup (modal shows terms)
   - Show success modal in loading state
   - Proceed with submission after 300ms delay
4. IF logged in:
   - Validate all sections via stageForSubmission()
   - Show success modal in loading state immediately
   - Call createListing() via listingService
   - Transition modal to success state with listing ID
   - Clear localStorage on success
```

[AUTH_MODAL]: SignUpLoginModal with skipReload=true, onAuthSuccess callback
[SUCCESS_MODAL]: Two states - loading (spinner) and success (checkmark + CTAs)
[ERROR_HANDLING]: Alert on validation errors, hide modal on submission errors

---

## KEY_COMPONENTS

### SuccessModal
[INTENT]: Modal showing loading state during submission, success state after
[PROPS]: isOpen, listingId, listingName, isLoading
[STATES]: Loading (spinner + "Creating...") and Success (checkmark + CTAs)
[ACTIONS]: "Go to My Dashboard", "Preview Listing"

### Navigation Sidebar
[INTENT]: Section navigation with progress indicator
[FEATURES]: Circular progress chart, section status badges, lock/check icons
[STATUS_CLASSES]: active, completed, pending, locked

### Section Validation
[FUNCTION]: isSectionComplete(sectionNum)
[LOGIC]: Returns boolean based on required fields per section
[SECTION_LOCKING]: isSectionLocked() checks if previous section is complete

---

## SECTION_REQUIREMENTS

### Section 1 (Space Snapshot)
[REQUIRED]: listingName, typeOfSpace, typeOfKitchen, typeOfParking, address.validated

### Section 2 (Features)
[REQUIRED]: amenitiesInsideUnit.length > 0, descriptionOfLodging

### Section 3 (Lease Styles)
[REQUIRED]: rentalType, (availableNights if Nightly), (weeklyPattern if Weekly)

### Section 4 (Pricing)
[REQUIRED]: damageDeposit >= 500, compensation based on rentalType

### Section 5 (Rules)
[REQUIRED]: cancellationPolicy, checkInTime, checkOutTime

### Section 6 (Photos)
[REQUIRED]: photos.length >= minRequired (default: 3)

### Section 7 (Review)
[REQUIRED]: agreedToTerms = true

---

## STORE_ARCHITECTURE

[PATTERN]: Singleton store with React hook adapter
[FILES]: listingLocalStore.ts (core), useListingStore.ts (React hook)
[STATE]: data (ListingFormData), lastSaved, isDirty, stagingStatus, errors
[METHODS]: updateSpaceSnapshot, updateFeatures, updateLeaseStyles, etc.
[VALIDATION]: validateForSubmission() checks all required fields
[STAGING]: stageForSubmission() validates and saves to localStorage

---

## SPECIAL_FEATURES

### URL-Based Editing
[TRIGGER]: ?listing_id=XXX in URL
[BEHAVIOR]: Fetches listing from Bubble API, preloads listingName into form
[USE_CASE]: Edit existing listing or duplicate listing

### Pending Listing Name
[TRIGGER]: localStorage.getItem('pendingListingName')
[BEHAVIOR]: Preloads listing name from CreateDuplicateListingModal
[CLEANUP]: Removes key after use

### Access Control
[CHECK]: On mount, checks if logged in user is Guest
[ACTION]: Redirects Guest users to index page
[ALLOW]: Logged-out users and Host users

### Header Re-render
[MECHANISM]: headerKey state increments after auth success
[PURPOSE]: Forces Header component to re-render with new auth state

---

## INTEGRATION_POINTS

### SignUpLoginModal
[PROPS]: isOpen, onClose, initialView="signup", defaultUserType="host", skipReload=true, onAuthSuccess
[CALLBACK]: onAuthSuccess sets agreedToTerms=true, updates header, triggers submission

### Toast Notifications
[HOOK]: useToast() from shared/Toast
[USAGE]: Shows success message after auth: "Account created successfully! Creating your listing..."

### listingService
[FUNCTION]: createListing(formData)
[RETURNS]: { id, ...listing data }
[DESTINATION]: Supabase listing_trial table

### bubbleAPI
[FUNCTION]: getListingById(listingId)
[USAGE]: Fetches existing listing data for editing

---

## DEBUGGING

### Console Logs
[PREFIX]: 🏠 (component lifecycle), 📡 (API calls), ✅ (success), ❌ (errors)
[DEBUG_SUMMARY]: getDebugSummary() returns object with key metrics

### State Inspection
[METHOD]: listingLocalStore.getDebugSummary()
[OUTPUT]: hasData, listingName, completedSections, currentSection, photosCount, stagingStatus, lastSaved, isDirty, errorsCount

---

## USAGE_PATTERN

```typescript
// Import page
import { SelfListingPage } from 'islands/pages/SelfListingPage';

// Mount to DOM (in self-listing.jsx)
const root = createRoot(document.getElementById('root'));
root.render(<SelfListingPage />);

// Access store in sections
const { formData, updateSpaceSnapshot } = useListingStore();
```

---

**SUBDIRECTORY_COUNT**: 6
**COMPONENT_COUNT**: 1 page + 7 sections + 1 UI component
**TOTAL_LINES**: ~2800 across all files
