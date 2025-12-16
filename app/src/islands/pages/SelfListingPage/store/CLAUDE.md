# SelfListingPage Store - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: State management for listing creation form

---

## QUICK_STATS

[TOTAL_FILES]: 4
[PRIMARY_LANGUAGE]: TypeScript
[KEY_PATTERNS]: Singleton store, React hook adapter, localStorage persistence, Pub/Sub

---

## FILES

### index.ts
[INTENT]: Barrel export for store module
[EXPORTS]: listingLocalStore, StoreState (type), useListingStore, prepareListingSubmission, prepareDraftPayload, preparePhotoPayload, validateBubblePayload, BubbleListingPayload (type)

### listingLocalStore.ts
[INTENT]: Singleton store class with localStorage persistence
[EXPORTS]: listingLocalStore (singleton instance), StoreState (type)
[PATTERN]: Observable store with subscriber notification
[PERSISTENCE]: localStorage with 1-second debounced auto-save
[STORAGE_KEYS]: selfListingDraft, selfListingStagedForSubmission, selfListingLastSaved, selfListingUserId

### useListingStore.ts
[INTENT]: React hook adapter for listingLocalStore
[EXPORTS]: useListingStore (custom hook)
[PATTERN]: Hook wraps singleton, subscribes to changes, triggers React re-renders
[RETURNS]: UseListingStoreReturn interface with state and methods

### prepareListingSubmission.ts
[INTENT]: Transform local form data to Bubble API payload format
[EXPORTS]: prepareListingSubmission, prepareDraftPayload, preparePhotoPayload, validateBubblePayload, BubbleListingPayload (type)
[PATTERN]: Data transformation layer between internal and external formats

---

## ARCHITECTURE

### Singleton Pattern
[IMPLEMENTATION]: Single instance of ListingLocalStore class exported as listingLocalStore
[WHY]: Form state shared across section components, avoid prop drilling
[LIFECYCLE]: Created once on module load, persists for entire session

### Pub/Sub Pattern
[SUBSCRIBERS]: React components subscribe via useListingStore()
[NOTIFICATION]: notifyListeners() called after every state change
[UNSUBSCRIBE]: Cleanup returned from subscribe() function

### React Hook Adapter
[PURPOSE]: Bridge between singleton store and React component lifecycle
[MECHANISM]: useState + useEffect + subscribe/unsubscribe
[BENEFIT]: Automatic re-renders when store changes, React-friendly API

---

## STORE_STATE

### StoreState Interface
```typescript
interface StoreState {
  data: ListingFormData;           // Complete form data
  lastSaved: Date | null;           // Last save timestamp
  isDirty: boolean;                 // Unsaved changes flag
  stagingStatus: StagingStatus;     // Submission workflow status
  errors: string[];                 // Validation errors
}
```

### StagingStatus Values
[not_staged]: Initial state, no submission attempt
[staged]: Data validated and ready for submission
[submitting]: Submission in progress
[submitted]: Submission successful, local data cleared
[failed]: Submission failed, retry available

---

## STORAGE_KEYS

### selfListingDraft
[PURPOSE]: Persistent draft storage
[FORMAT]: JSON stringified ListingFormData
[LIFECYCLE]: Created on first change, updated on auto-save, deleted on submission

### selfListingStagedForSubmission
[PURPOSE]: Validated data ready for submission
[FORMAT]: JSON stringified ListingFormData with stagedAt timestamp
[LIFECYCLE]: Created by stageForSubmission(), deleted on successful submission

### selfListingLastSaved
[PURPOSE]: Track last save time
[FORMAT]: ISO date string
[USAGE]: Displayed as "Last saved: XX:XX" indicator

### selfListingUserId
[PURPOSE]: Optional user ID tracking
[USAGE]: Currently unused, reserved for future multi-user draft support

---

## PUBLIC_METHODS

### initialize()
[INTENT]: Load draft from localStorage on store creation
[RETURNS]: StoreState
[SIDE_EFFECTS]: Restores form data, checks for staged data, notifies listeners
[SERIALIZATION]: Converts Date strings back to Date objects (rules.blockedDates)

### getData()
[INTENT]: Get current form data
[RETURNS]: Shallow copy of ListingFormData
[USAGE]: Direct access to form state

### getState()
[INTENT]: Get complete store state
[RETURNS]: Shallow copy of StoreState
[USAGE]: Access metadata (lastSaved, isDirty, errors, stagingStatus)

### updateData(partialData)
[INTENT]: Merge partial updates into form data
[SIDE_EFFECTS]: Sets isDirty=true, schedules auto-save, notifies listeners
[AUTO_SAVE]: Debounced 1 second

### updateSection(section, data)
[INTENT]: Replace entire section data
[USAGE]: updateSpaceSnapshot(), updateFeatures(), updateLeaseStyles(), etc.
[SIDE_EFFECTS]: Same as updateData()

### updateSpaceSnapshot(data)
[INTENT]: Update Section 1 data
[DELEGATES_TO]: updateSection('spaceSnapshot', data)

### updateFeatures(data)
[INTENT]: Update Section 2 data
[DELEGATES_TO]: updateSection('features', data)

### updateLeaseStyles(data)
[INTENT]: Update Section 3 data
[DELEGATES_TO]: updateSection('leaseStyles', data)

### updatePricing(data)
[INTENT]: Update Section 4 data
[DELEGATES_TO]: updateSection('pricing', data)

### updateRules(data)
[INTENT]: Update Section 5 data
[DELEGATES_TO]: updateSection('rules', data)

### updatePhotos(data)
[INTENT]: Update Section 6 data
[DELEGATES_TO]: updateSection('photos', data)

### updateReview(data)
[INTENT]: Update Section 7 data
[DELEGATES_TO]: updateSection('review', data)

### setCurrentSection(section)
[INTENT]: Update current wizard section number
[SIDE_EFFECTS]: Schedules auto-save, notifies listeners

### markSectionComplete(section)
[INTENT]: Add section to completedSections array
[LOGIC]: Uses Set to avoid duplicates, sorts result
[SIDE_EFFECTS]: Schedules auto-save, notifies listeners

### saveDraft()
[INTENT]: Manually save draft to localStorage
[RETURNS]: boolean (success/failure)
[SERIALIZATION]: Converts Date objects to strings, removes transient photo state
[TRANSIENT_FIELDS]: file, isUploading, uploadError (not saved)
[SIDE_EFFECTS]: Updates lastSaved, sets isDirty=false, notifies listeners

### stageForSubmission()
[INTENT]: Validate all fields and prepare for submission
[RETURNS]: { success: boolean, errors: string[] }
[VALIDATION]: Calls validateForSubmission()
[STORAGE]: Saves validated data to selfListingStagedForSubmission
[ERROR_HANDLING]: If localStorage quota exceeded, logs warning but continues (data in memory)
[SIDE_EFFECTS]: Sets stagingStatus='staged', clears errors, notifies listeners

### getStagedData()
[INTENT]: Retrieve staged data from localStorage
[RETURNS]: ListingFormData | null
[USAGE]: Recover staged data after page refresh before submission

### markSubmitting()
[INTENT]: Set submission in progress status
[SIDE_EFFECTS]: stagingStatus='submitting', notifies listeners

### markSubmitted()
[INTENT]: Mark submission successful
[CLEANUP]: Deletes all localStorage keys (draft, staged, lastSaved)
[SIDE_EFFECTS]: stagingStatus='submitted', isSubmitted=true, isDraft=false, notifies listeners

### markSubmissionFailed(error)
[INTENT]: Mark submission failed
[SIDE_EFFECTS]: stagingStatus='failed', appends error to errors array, notifies listeners

### clearStagingError()
[INTENT]: Reset from failed status to allow retry
[SIDE_EFFECTS]: stagingStatus='staged', clears errors, notifies listeners

### validateForSubmission()
[INTENT]: Comprehensive validation of all form fields
[RETURNS]: string[] (array of error messages)
[VALIDATION_RULES]: See VALIDATION_RULES section below

### reset()
[INTENT]: Clear all data and return to initial state
[CLEANUP]: Deletes all localStorage keys
[SIDE_EFFECTS]: Resets to DEFAULT_LISTING_DATA, notifies listeners

### subscribe(listener)
[INTENT]: Register callback for state changes
[RETURNS]: Unsubscribe function
[USAGE]: Called by useListingStore() hook

### getDebugSummary()
[INTENT]: Get debugging information
[RETURNS]: Object with key metrics (hasData, listingName, completedSections, currentSection, photosCount, stagingStatus, lastSaved, isDirty, errorsCount)

---

## VALIDATION_RULES

### Section 1: Space Snapshot
[REQUIRED]: listingName, typeOfSpace, typeOfKitchen, typeOfParking, address.fullAddress, address.validated

### Section 2: Features
[REQUIRED]: amenitiesInsideUnit.length > 0, descriptionOfLodging

### Section 3: Lease Styles
[REQUIRED]: rentalType
[CONDITIONAL]: If rentalType='Nightly', at least one availableNights value must be true
[CONDITIONAL]: If rentalType='Weekly', weeklyPattern is required

### Section 4: Pricing
[REQUIRED]: damageDeposit >= 500
[CONDITIONAL]: If rentalType='Monthly', monthlyCompensation is required
[CONDITIONAL]: If rentalType='Weekly', weeklyCompensation is required
[CONDITIONAL]: If rentalType='Nightly', nightlyPricing.oneNightPrice is required

### Section 5: Rules
[REQUIRED]: cancellationPolicy, checkInTime, checkOutTime

### Section 6: Photos
[REQUIRED]: photos.length >= minRequired (default: 3)

### Section 7: Review
[REQUIRED]: agreedToTerms = true

---

## AUTO_SAVE_MECHANISM

### Debounce Pattern
[DELAY]: 1000ms (1 second)
[TRIGGER]: Any field update via updateData() or updateSection()
[IMPLEMENTATION]: scheduleAutoSave() clears previous timer, sets new timer

### Photo Serialization
[ISSUE]: File objects are not serializable to JSON
[SOLUTION]: Only save photo metadata (id, url, caption, displayOrder, storagePath)
[EXCLUDED]: file, isUploading, uploadError (transient UI state)

### Date Serialization
[ISSUE]: Date objects lose type when stringified
[SOLUTION]: Convert to ISO strings on save, restore to Date on load
[AFFECTED_FIELDS]: rules.blockedDates

---

## PREPARE_LISTING_SUBMISSION

### prepareListingSubmission(formData)
[INTENT]: Transform internal ListingFormData to BubbleListingPayload
[RETURNS]: BubbleListingPayload
[FIELD_MAPPING]: Maps local field names to Bubble API field names

### Field Transformations

#### transformAvailableNights()
[INPUT]: { sunday: boolean, monday: boolean, ... }
[OUTPUT]: ['sunday', 'monday', ...] (array of day names where true)

#### calculateNightlyPrices()
[INPUT]: NightlyPricing interface
[OUTPUT]: { price1, price2, price3, price4, price5 } (cumulative prices)

#### transformBlockedDates()
[INPUT]: Date[] (JavaScript Date objects)
[OUTPUT]: string[] (YYYY-MM-DD format)

### prepareDraftPayload(formData)
[INTENT]: Prepare draft save payload
[RETURNS]: Partial<BubbleListingPayload> with Status='Draft', 'Is Draft'=true
[USAGE]: Save work-in-progress to Bubble

### preparePhotoPayload(formData)
[INTENT]: Extract photo metadata for Bubble
[RETURNS]: { photos: Array<{ url, caption, order }> }
[USAGE]: Associate photos with listing after submission

### validateBubblePayload(payload)
[INTENT]: Validate payload meets Bubble API requirements
[RETURNS]: { valid: boolean, errors: string[] }
[VALIDATION]: Required fields, pricing based on rentalType, damageDeposit >= 500

---

## BUBBLE_LISTING_PAYLOAD

### Interface Structure
```typescript
interface BubbleListingPayload {
  // Basic Info
  Name, 'Type of Space', Bedrooms, Beds, Bathrooms,
  'Type of Kitchen', 'Type of Parking'

  // Address
  Address, 'Street Number', Street, City, State, Zip,
  Neighborhood, Latitude, Longitude

  // Amenities
  'Amenities Inside Unit', 'Amenities Outside Unit'

  // Descriptions
  'Description of Lodging', 'Neighborhood Description'

  // Lease Style
  'Rental Type', 'Available Nights', 'Weekly Pattern'

  // Pricing
  'Damage Deposit', 'Maintenance Fee',
  'Monthly Compensation', 'Weekly Compensation',
  'Price 1 night selected', 'Price 2 nights selected', ...,
  'Nightly Decay Rate'

  // Rules
  'Cancellation Policy', 'Preferred Gender', 'Number of Guests',
  'Check-In Time', 'Check-Out Time',
  'Ideal Min Duration', 'Ideal Max Duration',
  'House Rules', 'Blocked Dates'

  // Safety & Review
  'Safety Features', 'Square Footage', 'First Day Available',
  'Previous Reviews Link', 'Optional Notes'

  // Status
  Status, 'Is Draft'
}
```

[FIELD_COUNT]: 40+ fields
[NAMING_CONVENTION]: Bubble uses 'Title Case With Spaces' for field names
[ARRAY_FIELDS]: 'Amenities Inside Unit', 'Amenities Outside Unit', 'Available Nights', 'House Rules', 'Blocked Dates', 'Safety Features'

---

## USE_LISTING_STORE_HOOK

### Purpose
[INTENT]: React hook providing reactive access to listingLocalStore
[PATTERN]: Subscribe on mount, unsubscribe on unmount
[REACTIVITY]: setState() on each store change triggers React re-render

### Initialization
[EFFECT]: Calls store.initialize() on mount
[SUBSCRIPTION]: subscribe() returns cleanup function for useEffect

### Returned API
```typescript
interface UseListingStoreReturn {
  // State
  formData: ListingFormData;
  lastSaved: Date | null;
  isDirty: boolean;
  stagingStatus: StagingStatus;
  errors: string[];

  // Update functions
  updateFormData, updateSpaceSnapshot, updateFeatures,
  updateLeaseStyles, updatePricing, updateRules,
  updatePhotos, updateReview

  // Navigation
  setCurrentSection, markSectionComplete

  // Persistence
  saveDraft, stageForSubmission, getStagedData

  // Submission status
  markSubmitting, markSubmitted, markSubmissionFailed,
  clearStagingError

  // Utilities
  reset, validate, getDebugSummary
}
```

### useCallback Memoization
[PURPOSE]: Stable function references across re-renders
[BENEFIT]: Prevents unnecessary re-renders in child components
[PATTERN]: All update functions wrapped in useCallback with empty deps

---

## USAGE_PATTERN

### In Section Components
```typescript
import { useListingStore } from './store';

function Section1SpaceSnapshot() {
  const {
    formData,
    updateSpaceSnapshot,
    markSectionComplete
  } = useListingStore();

  const handleChange = (field, value) => {
    updateSpaceSnapshot({
      ...formData.spaceSnapshot,
      [field]: value
    });
  };

  const handleNext = () => {
    markSectionComplete(1);
    // Navigate to section 2
  };

  return (/* JSX */);
}
```

### In Main Component (SelfListingPage)
```typescript
import { useListingStore } from './store';

export const SelfListingPage = () => {
  const {
    formData,
    saveDraft,
    stageForSubmission,
    markSubmitting,
    markSubmitted
  } = useListingStore();

  const handleSubmit = async () => {
    const { success, errors } = stageForSubmission();
    if (!success) {
      alert(errors.join('\n'));
      return;
    }

    markSubmitting();
    const listing = await createListing(formData);
    markSubmitted();
  };

  return (/* JSX */);
};
```

---

## INTEGRATION_POINTS

### listingService
[FUNCTION]: createListing(formData)
[TRANSFORM]: Uses prepareListingSubmission() to convert to Bubble payload
[DESTINATION]: Supabase listing table

### Section Components
[CONSUMERS]: Section1SpaceSnapshot through Section7Review
[PATTERN]: Each section receives data via formData.{section}, updates via update{Section}()

### SelfListingPage
[ORCHESTRATOR]: Main component coordinating wizard flow
[RESPONSIBILITIES]: Section navigation, validation gates, submission handling

---

## DEBUGGING

### Console Logs
[PREFIX]: 📂 (loading), 💾 (saving), 📦 (staging), ✅ (success), ❌ (errors)

### getDebugSummary() Output
```typescript
{
  hasData: boolean,
  listingName: string,
  completedSections: number[],
  currentSection: number,
  photosCount: number,
  stagingStatus: string,
  lastSaved: string,
  isDirty: boolean,
  errorsCount: number
}
```

---

## CRITICAL_NOTES

### Singleton vs React State
[DECISION]: Use singleton instead of React Context
[WHY_1]: Avoids prop drilling through 7 section components
[WHY_2]: Automatic localStorage persistence without Context boilerplate
[WHY_3]: Can access store outside React (future CLI tools, tests)
[TRADEOFF]: Must use hook adapter for React reactivity

### localStorage Quota
[ISSUE]: Photos as data URLs would exceed localStorage quota
[SOLUTION]: Upload photos to Supabase Storage immediately, store only URLs
[FALLBACK]: If staging to localStorage fails (quota), continue with in-memory data

### Date Objects
[ISSUE]: JSON.stringify loses Date type
[SOLUTION]: Serialize to ISO string on save, parse back to Date on load
[AFFECTED]: rules.blockedDates

---

**FILE_COUNT**: 4
**TOTAL_LINES**: ~900
**PATTERN**: Singleton + Pub/Sub + React Hook Adapter
