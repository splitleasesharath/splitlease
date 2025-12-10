# Section 7: Data Flow Diagram & Architecture

---

## 1. User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-LISTING PAGE (SelfListingPage.tsx)      │
│                                                                 │
│  SECTION 1: Space Snapshot                                     │
│  SECTION 2: Features                                           │
│  SECTION 3: Lease Styles                                       │
│  SECTION 4: Pricing                                            │
│  SECTION 5: Rules                                              │
│  SECTION 6: Photos                                             │
│  ┌────────────────────────────────────────────────────────────┐│
│  │          SECTION 7: REVIEW & SUBMIT (Section7Review.tsx)  ││
│  │                                                            ││
│  │  Optional Fields (Top):                                    ││
│  │  - Safety Features (checkboxes + load common button)       ││
│  │  - Square Footage (number input)                           ││
│  │  - First Day Available (date picker)                       ││
│  │  - Previous Reviews Link (URL input)                       ││
│  │                                                            ││
│  │  Summary Cards (Collapsible):                              ││
│  │  - Space Details (Edit → Section 1)                        ││
│  │  - Features (Edit → Section 2)                             ││
│  │  - Lease Style (Edit → Section 3)                          ││
│  │  - Pricing (Edit → Section 4)                              ││
│  │  - Rules (Edit → Section 5)                                ││
│  │  - Photos (Edit → Section 6)                               ││
│  │                                                            ││
│  │  Important Info Box:                                       ││
│  │  - 24-48 hour review timeline                              ││
│  │  - Email notification on approval                          ││
│  │  - Can edit after submission                               ││
│  │  - Contact info stays private                              ││
│  │                                                            ││
│  │  [Back Button] ──────────── [Submit Listing Button]        ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ User clicks "Submit Listing"
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHECK AUTHENTICATION STATUS                         │
│         (handleSubmit @ SelfListingPage.tsx:561)                │
│                                                                 │
│  await checkAuthStatus()                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──────────── NOT LOGGED IN ─────────────┐
         │                                        │
         │                                        ▼
         │                           ┌─────────────────────────┐
         │                           │   SignUpLoginModal      │
         │                           │  (Overlay Component)    │
         │                           │                         │
         │                           │ - Signup Form (Host)    │
         │                           │ - Login Form            │
         │                           │ - User Type Selector    │
         │                           │                         │
         │                           │ "By signing up or       │
         │                           │  logging in, you agree" │
         │                           └──────────┬──────────────┘
         │                                      │
         │                                      │ User signs up/logs in
         │                                      ▼
         │                           handleAuthSuccess()
         │                           (SelfListingPage.tsx:437)
         │                           │
         │                           ├─ setShowAuthModal(false)
         │                           ├─ showToast('success')
         │                           ├─ updateReview({agreedToTerms: true})
         │                           ├─ setIsSubmitting(true)
         │                           ├─ setShowSuccessModal(true)
         │                           └─ setTimeout → proceedWithSubmitAfterAuth()
         │
         └──────────── LOGGED IN ──────────────┐
                                               │
                                               ▼
                            proceedWithSubmit() / proceedWithSubmitAfterAuth()
                            (SelfListingPage.tsx:517 / 476)
                               │
                               ├─ markSubmitting()
                               ├─ stageForSubmission() ← VALIDATION HAPPENS HERE
                               │
                               ▼
                    ┌──────────────────────────┐
                    │   VALIDATION CHECK        │
                    │                          │
                    │ All 7 sections must have  │
                    │ required fields filled    │
                    │                          │
                    │ Returns:                  │
                    │ {                         │
                    │   success: boolean,       │
                    │   errors: string[]        │
                    │ }                         │
                    └──────────┬───────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                │ VALIDATION FAILED           │ VALIDATION PASSED
                ▼                             ▼
        Show error alert              setShowSuccessModal(true)
        Return early                  (Show loading spinner modal)
                                            │
                                            ▼
                                  createListing(formData)
```

---

## 2. Data Submission Pipeline

```
SECTION 7 "Submit" Button
          │
          ▼
┌─────────────────────────────────────────────────┐
│ createListing(formData)                         │
│ (app/src/lib/listingService.js:28)              │
└──────────────────┬──────────────────────────────┘
                   │
                   ├─ STEP 0: Upload Photos (Optional)
                   │           ├─ uploadPhotos(photos, tempListingId)
                   │           └─ Maps URLs: { id, url, Photo, caption, ... }
                   │
                   ├─ STEP 1: Transform Data
                   │           ├─ mapFormDataToDatabase(formData, userId)
                   │           │   │
                   │           │   ├─ Flatten nested structure
                   │           │   ├─ Convert days: {sun, mon, ...} → [1, 2, 3, ...]
                   │           │   ├─ Build database columns
                   │           │   └─ Returns: { Name, 'Features - *', 'Location - *', ... }
                   │           │
                   │           └─ Returns: listingData (flat DB structure)
                   │
                   ├─ STEP 2: Insert to Supabase
                   │           │
                   │           ├─ supabase.from('listing_trial').insert(listingData)
                   │           │
                   │           ├─ Success: { id: uuid, created_at, ... }
                   │           └─ Failure: Throw error → show alert
                   │
                   ├─ STEP 3: Link to account_host (Best Effort)
                   │           │
                   │           ├─ SELECT Listings FROM account_host WHERE User = userId
                   │           ├─ APPEND listing_id to Listings array
                   │           ├─ UPDATE account_host SET Listings = [...]
                   │           │
                   │           └─ If fails: Log warning, continue
                   │
                   ├─ STEP 4: Sync to Bubble
                   │           │
                   │           ├─ syncListingToBubble(supabaseData, formData)
                   │           │   │
                   │           │   ├─ Build payload:
                   │           │   │   {
                   │           │   │     listing_name: string,
                   │           │   │     supabase_id: uuid,
                   │           │   │     type_of_space, bedrooms, beds, bathrooms,
                   │           │   │     city, state, zip_code, rental_type, description
                   │           │   │   }
                   │           │   │
                   │           │   └─ Call Edge Function:
                   │           │       supabase.functions.invoke('bubble-proxy', {
                   │           │         body: {
                   │           │           action: 'sync_listing_to_bubble',
                   │           │           payload
                   │           │         }
                   │           │       })
                   │           │
                   │           └─ EDGE FUNCTION FLOW ──────────────────────────────┐
                   │               (supabase/functions/bubble-proxy/                │
                   │                handlers/listingSync.ts:27)                    │
                   │                                                               │
                   │               ┌─ Validate required fields                      │
                   │               │   (listing_name, supabase_id)                  │
                   │               │                                               │
                   │               ├─ Call BubbleSyncService.triggerWorkflow()      │
                   │               │   │                                           │
                   │               │   ├─ Workflow: 'listing_creation_in_code'      │
                   │               │   ├─ Params: { listing_name, ... }            │
                   │               │   │                                           │
                   │               │   └─ Bubble API Call:                         │
                   │               │       POST /wf/listing_creation_in_code       │
                   │               │       Returns: listing_id                      │
                   │               │                                               │
                   │               └─ Return { bubble_id: listing_id }              │
                   │                                                               │
                   │           └─ SUCCESS: { bubble_id: '...' }
                   │               FAILURE: Throw BubbleApiError
                   │
                   ├─ STEP 5: Update listing_trial with Bubble _id
                   │           │
                   │           ├─ supabase.from('listing_trial').update({_id: bubbleId})
                   │           │
                   │           └─ Returns: Updated listing record
                   │
                   ├─ STEP 6: Sync to main listing table (Best Effort)
                   │           │
                   │           ├─ syncToListingTable(updatedData, bubbleId)
                   │           │   │
                   │           │   ├─ Map listing_trial → listing columns
                   │           │   ├─ supabase.from('listing').upsert(listingData)
                   │           │   │   (onConflict: '_id')
                   │           │   │
                   │           │   └─ Sets: Active: false, Approved: false, Complete: true
                   │           │
                   │           └─ If fails: Log warning, continue
                   │
                   ├─ STEP 7: Clear localStorage
                   │           │
                   │           └─ markSubmitted()
                   │               └─ listingLocalStore.reset()
                   │
                   └─ STEP 8: Return to UI
                       │
                       └─ setCreatedListingId(newListing.id)
                           └─ Triggers SuccessModal state change:
                               From loading (spinner) → success (checkmark)
```

---

## 3. SuccessModal State Transitions

```
User clicks "Submit"
         │
         ▼
setIsSubmitting(true)
setShowSuccessModal(true)
         │
         ▼
┌──────────────────────────────────────┐
│   SuccessModal Loading State          │
│   (isSubmitting && !createdListingId) │
│                                      │
│   ┌────────────────────────────────┐ │
│   │  🔄 Spinner                    │ │
│   └────────────────────────────────┘ │
│                                      │
│   Creating Your Listing...            │
│   Please wait while we set up         │
│   "Listing Name"                      │
│   This may take a moment.             │
└──────────────────────────────────────┘
         │
         │ createListing() completes successfully
         │
         ▼
setCreatedListingId(newListing.id)
         │
         ▼
┌──────────────────────────────────────┐
│   SuccessModal Success State          │
│   (createdListingId exists)           │
│                                      │
│   ┌────────────────────────────────┐ │
│   │  ✓ Checkmark (green circle)    │ │
│   └────────────────────────────────┘ │
│                                      │
│   Listing Created Successfully!       │
│   Your listing "Listing Name" has     │
│   been submitted and is now pending   │
│   review.                             │
│                                      │
│   [Go to My Dashboard] [Preview]      │
│   You'll be notified once your        │
│   listing is approved.                │
└──────────────────────────────────────┘
         │
         ├─ User clicks "Go to My Dashboard"
         │  └─ window.location.href = `/listing-dashboard.html?listing_id=${listingId}`
         │
         └─ User clicks "Preview Listing"
            └─ window.location.href = `/view-split-lease.html?listing_id=${listingId}`
```

---

## 4. Data Structure Transformations

### 4.1 React Form → Zustand Store

```
Section7Review Component
         │
         ├─ User inputs: safety features, sqft, etc.
         │
         ├─ onChange(field, value)
         │
         ├─ updateReview({ ...reviewData, [field]: value })
         │
         ▼
useListingStore Hook
         │
         ├─ formData.review.safetyFeatures = [...]
         ├─ formData.review.squareFootage = 1500
         ├─ formData.review.firstDayAvailable = '2025-12-10'
         ├─ formData.review.previousReviewsLink = 'https://...'
         │
         └─ Auto-saves to localStorage ('sl-listing-draft')
```

### 4.2 Zustand Store → Database Format

```
formData (Zustand)
         │
         ├─ spaceSnapshot: {
         │    listingName: "Cozy Brooklyn Apt"
         │    typeOfSpace: "Entire Place"
         │    bedrooms: 2
         │    bathrooms: 1.5
         │    address: {
         │      fullAddress: "123 Main St, Brooklyn, NY 11201"
         │      city: "Brooklyn"
         │      zip: "11201"
         │      validated: true
         │    }
         │  }
         │
         ├─ leaseStyles: {
         │    rentalType: "Nightly"
         │    availableNights: {
         │      sunday: false
         │      monday: true
         │      tuesday: true
         │      wednesday: true
         │      thursday: true
         │      friday: true
         │      saturday: false
         │    }
         │  }
         │
         └─ photos: { photos: [{...}, {...}] }

              │
              │ mapFormDataToDatabase(formData)
              │
              ▼

Database Format (Flat Columns)
         │
         ├─ Name: "Cozy Brooklyn Apt"
         ├─ 'Features - Type of Space': "Entire Place"
         ├─ 'Features - Qty Bedrooms': 2
         ├─ 'Features - Qty Bathrooms': 1.5
         ├─ 'Location - Address': {
         │    address: "123 Main St, Brooklyn, NY 11201"
         │    lat: 40.6782
         │    lng: -73.9442
         │  }
         ├─ 'Location - City': "Brooklyn"
         ├─ 'Location - Zip Code': "11201"
         │
         ├─ 'Days Available (List of Days)': [2, 3, 4, 5, 6, 7]
         │  (NOTE: 1-based Bubble days: 1=Sun, 2=Mon, ..., 7=Sat)
         │
         ├─ 'Features - Photos': [
         │    {
         │      id: "photo_1",
         │      url: "https://storage.supabase.co/...",
         │      Photo: "https://...",
         │      'Photo (thumbnail)': "https://...",
         │      displayOrder: 0,
         │      SortOrder: 0,
         │      toggleMainPhoto: true
         │    },
         │    ...
         │  ]
         │
         └─ form_metadata: {
              currentSection: 7,
              completedSections: [1, 2, 3, 4, 5, 6],
              isDraft: false,
              isSubmitted: true
            }
```

### 4.3 Database → Bubble Sync Payload

```
listing_trial record
         │
         ├─ id: "550e8400-e29b-41d4-a716-446655440000" (UUID)
         ├─ Name: "Cozy Brooklyn Apt"
         ├─ 'Features - Type of Space': "Entire Place"
         ├─ 'Location - City': "Brooklyn"
         │ ...

         │
         │ syncListingToBubble()
         │
         ▼
Edge Function Payload
         │
         └─ {
              listing_name: "Cozy Brooklyn Apt",
              supabase_id: "550e8400-e29b-41d4-a716-446655440000",
              type_of_space: "Entire Place",
              bedrooms: 2,
              beds: 2,
              bathrooms: 1.5,
              city: "Brooklyn",
              state: "New York",
              zip_code: "11201",
              rental_type: "Nightly",
              description: "..."
            }

            │
            │ Edge Function (bubble-proxy/handlers/listingSync.ts)
            │
            ▼
Bubble Workflow Params
            │
            └─ {
                 listing_name: "Cozy Brooklyn Apt",
                 type_of_space: "Entire Place",
                 bedrooms: 2,
                 ...
               }

               │
               │ BubbleSyncService.triggerWorkflow()
               │
               ▼
Bubble API Call
               │
               └─ POST /wf/listing_creation_in_code
                  Params: { listing_name, ... }
                  Returns: listing_id (Bubble _id)
```

---

## 5. Database Table Relationships

```
┌────────────────────────────┐
│    listing_trial (NEW)     │  ← Supabase table for self-listings
├────────────────────────────┤
│ id (UUID) [PK]             │
│ _id (string) [FK to Bubble]│  ← Populated after sync
│ Name                       │
│ Features - *               │
│ Location - *               │
│ Pricing - *                │
│ form_metadata (JSON)       │
│ created_at, updated_at     │
└────┬───────────────────────┘
     │
     │ Link via Host/user_id
     │
     ▼
┌────────────────────────────┐
│  account_host              │  ← Host account record
├────────────────────────────┤
│ _id (Bubble ID) [PK]       │
│ User (Bubble user ID) [FK] │
│ Listings (array of IDs)    │  ← Appended with listing_trial.id
│ ... other fields           │
└────────────────────────────┘
     │
     │ Sync via Bubble _id
     │
     ▼
┌────────────────────────────┐
│    listing (main table)    │  ← Synced from listing_trial
├────────────────────────────┤
│ _id (Bubble ID) [PK]       │
│ Name                       │
│ Features - *               │
│ Location - *               │
│ Active: false              │  ← Start inactive
│ Approved: false            │  ← Pending review
│ Complete: true             │
│ ... 60+ columns            │
└────────────────────────────┘

FLOW:
listing_trial (created)
     ↓
account_host.Listings← [listing_trial.id]
     ↓
Sync to Bubble (via edge function)
     ↓
Update listing_trial._id = bubble_id
     ↓
Sync to listing table (upsert by _id)
```

---

## 6. Authentication Flow in Section 7

```
User clicks "Submit Listing"
         │
         ▼
checkAuthStatus()
         │
    ┌────┴────┐
    │          │
    │ TRUE     │ FALSE
    ▼          ▼
  Logged in   Not logged in
    │          │
    │          ├─ setPendingSubmit(true)
    │          ├─ setShowAuthModal(true)
    │          │
    │          ▼
    │       SignUpLoginModal appears
    │          │
    │          ├─ User enters email/password
    │          ├─ User selects "Host" user type
    │          ├─ User clicks Sign Up or Log In
    │          │
    │          ▼
    │       bubble-auth-proxy Edge Function
    │          │
    │          ├─ POST /wf/signup-user or login-user
    │          ├─ Bubble validates credentials
    │          ├─ Returns: { token, user_id, expires }
    │          │
    │          ▼
    │       Auth stored in secureStorage
    │          │
    │          ├─ splitlease_auth_token (encrypted)
    │          ├─ splitlease_session_id (encrypted)
    │          ├─ splitlease_user_type = "Host"
    │          │
    │          ▼
    │       handleAuthSuccess() called
    │          │
    │          ├─ setShowAuthModal(false)
    │          ├─ showToast('Account created successfully!')
    │          ├─ updateReview({ agreedToTerms: true })
    │          ├─ setPendingSubmit(false)
    │          ├─ setIsSubmitting(true)
    │          ├─ setShowSuccessModal(true)
    │          │
    │          ├─ setTimeout 300ms
    │          │
    │          ▼
    │       proceedWithSubmitAfterAuth()
    │          │
    └──────────┤
               │
    ┌──────────┘
    │
    ▼
proceedWithSubmit() or proceedWithSubmitAfterAuth()
         │
         ├─ stageForSubmission() [VALIDATION]
         │
         ├─ Show success modal (loading)
         │
         ├─ createListing(formData)
         │   ├─ Insert to listing_trial
         │   ├─ Link to account_host
         │   ├─ Sync to Bubble
         │   └─ Update listing_trial with _id
         │
         ├─ setCreatedListingId(newListing.id)
         │   └─ Modal transitions to success state
         │
         └─ User sees "Go to Dashboard" and "Preview" buttons
```

---

## 7. Error Handling Tree

```
User clicks Submit
         │
         ▼
checkAuthStatus() fails?
    YES → Can't determine auth status → Show alert
         │
    NO → Continue
         │
         ▼
User logged in?
    NO → Show SignUpLoginModal
         │ (Auth happens in modal)
         │
    YES → Continue
         │
         ▼
stageForSubmission() returns errors?
    YES → Show alert with error list → STOP
         │  "Please fix the following errors:
         │   - Section 1: Address must be validated
         │   - Section 4: Pricing is required"
         │
    NO → Continue
         │
         ▼
Show loading modal (spinner)
         │
         ▼
uploadPhotos() fails?
    YES → Continue with data URLs as fallback
         │
    NO → Continue
         │
         ▼
Insert to listing_trial fails?
    YES → Hide modal, show alert, STOP
         │  "Error submitting listing: {error message}"
         │
    NO → Continue
         │
         ▼
linkListingToHost() fails?
    YES → Log warning, continue (listing still exists)
         │
    NO → Continue
         │
         ▼
syncListingToBubble() fails?
    YES → Return listing without _id (can retry later)
         │  Log warning: "Bubble sync failed"
         │
    NO → Continue
         │
         ▼
updateListingTrialWithId() fails?
    YES → Return listing, Bubble sync happened but _id not stored
         │
    NO → Continue
         │
         ▼
syncToListingTable() fails?
    YES → Log warning, continue (listing exists in listing_trial + Bubble)
         │
    NO → Continue
         │
         ▼
markSubmitted()
         │
         ▼
setCreatedListingId(newListing.id)
         │
         ▼
SuccessModal transitions to success state
         │
         ▼
User sees success modal with Dashboard/Preview buttons
```

---

**Document Complete** - Use as reference for understanding complete data flow through Section 7.
