# Plan: Migrate Listing Creation to listing_trial Table

## Objective
Completely isolate the self-listing creation flow from Bubble by:
1. Adding all self-listing form fields to `listing_trial` table
2. Removing all local Bubble API/edge function calls for listing operations
3. Inserting new listings directly into `listing_trial` via Supabase

---

## Phase 1: Database Schema Update

### 1.1 Add Missing Columns to `listing_trial`

The `listing_trial` table already has the Bubble-synced columns. We need to add columns for the NEW self-listing form fields that don't exist in the original schema.

**New columns to add:**

| Column | Type | Source Section | Notes |
|--------|------|----------------|-------|
| `type_of_kitchen` | TEXT | Section 1 | Full Kitchen, Kitchenette, etc. |
| `type_of_parking` | TEXT | Section 1 | Street Parking, Garage, etc. |
| `address_number` | TEXT | Section 1 | Street number |
| `address_street` | TEXT | Section 1 | Street name |
| `address_neighborhood` | TEXT | Section 1 | Neighborhood name |
| `address_latitude` | NUMERIC | Section 1 | GPS latitude |
| `address_longitude` | NUMERIC | Section 1 | GPS longitude |
| `address_validated` | BOOLEAN | Section 1 | Google validation flag |
| `amenities_inside_unit` | JSONB | Section 2 | Array of amenity strings |
| `amenities_outside_unit` | JSONB | Section 2 | Array of amenity strings |
| `neighborhood_description` | TEXT | Section 2 | Host's neighborhood description |
| `weekly_pattern` | TEXT | Section 3 | "One week on, one week off", etc. |
| `subsidy_agreement` | BOOLEAN | Section 3 | Monthly subsidy agreement |
| `nightly_pricing` | JSONB | Section 4 | {oneNightPrice, decayPerNight, calculatedRates} |
| `weekly_compensation` | NUMERIC | Section 4 | Weekly rental price |
| `monthly_compensation` | NUMERIC | Section 4 | Monthly rental price |
| `preferred_gender` | TEXT | Section 5 | Male, Female, No Preference, etc. |
| `number_of_guests` | INTEGER | Section 5 | Max guests allowed |
| `check_in_time` | TEXT | Section 5 | "2:00 PM" format |
| `check_out_time` | TEXT | Section 5 | "11:00 AM" format |
| `ideal_min_duration` | INTEGER | Section 5 | Min stay in months |
| `ideal_max_duration` | INTEGER | Section 5 | Max stay in months |
| `blocked_dates` | JSONB | Section 5 | Array of blocked date ranges |
| `photos` | JSONB | Section 6 | Array of {id, url, caption, displayOrder} |
| `agreed_to_terms` | BOOLEAN | Section 7 | Terms acceptance |
| `optional_notes` | TEXT | Section 7 | Additional host notes |
| `safety_features` | JSONB | Section 7 | Array of safety feature strings |
| `square_footage` | INTEGER | Section 7 | Property size |
| `first_day_available` | DATE | Section 7 | Availability start date |
| `previous_reviews_link` | TEXT | Section 7 | External reviews URL |
| `form_metadata` | JSONB | Internal | {currentSection, completedSections, isDraft, isSubmitted} |

---

## Phase 2: Remove Local Bubble API References

### 2.1 Files to Modify

| File | Current State | Action |
|------|---------------|--------|
| `app/src/lib/bubbleAPI.js` | Contains `createListingInCode()`, `getListingById()` | Comment out listing functions, keep file for other potential uses |
| `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx` | Import already commented | No change needed |
| `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | Import already commented | No change needed |

### 2.2 Functions to Remove/Comment

In `bubbleAPI.js`:
- `createListingInCode()` (lines 38-73) - Comment out
- `getListingById()` (lines 83-116) - Comment out

---

## Phase 3: Create Supabase Insert Function

### 3.1 New File: `app/src/lib/listingService.js`

Create a new service file for listing operations that directly uses Supabase:

```javascript
import { supabase } from './supabase.js';

/**
 * Insert a new listing into listing_trial table
 * @param {object} formData - The complete form data from SelfListingPage
 * @returns {object} The created listing with id
 */
export async function createListing(formData) {
  // Map formData to database columns
  const listingData = mapFormDataToDatabase(formData);

  const { data, error } = await supabase
    .from('listing_trial')
    .insert(listingData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing listing in listing_trial table
 * @param {string} id - UUID of the listing
 * @param {object} formData - Updated form data
 */
export async function updateListing(id, formData) {
  const listingData = mapFormDataToDatabase(formData);

  const { data, error } = await supabase
    .from('listing_trial')
    .update(listingData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a listing by UUID
 */
export async function getListingById(id) {
  const { data, error } = await supabase
    .from('listing_trial')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Map SelfListingPage form data to database columns
 */
function mapFormDataToDatabase(formData) {
  return {
    // Generate a placeholder _id for Bubble compatibility (not synced)
    _id: `local_${Date.now()}x${Math.random().toString(36).substr(2, 9)}`,

    // Section 1: Space Snapshot
    "Name": formData.spaceSnapshot.listingName,
    "Features - Type of Space": formData.spaceSnapshot.typeOfSpace,
    "Features - Qty Bedrooms": formData.spaceSnapshot.bedrooms,
    "Features - Qty Beds": formData.spaceSnapshot.beds,
    "Features - Qty Bathrooms": formData.spaceSnapshot.bathrooms,
    "type_of_kitchen": formData.spaceSnapshot.typeOfKitchen,
    "type_of_parking": formData.spaceSnapshot.typeOfParking,

    // Address fields
    "Location - Address": {
      fullAddress: formData.spaceSnapshot.address.fullAddress,
      number: formData.spaceSnapshot.address.number,
      street: formData.spaceSnapshot.address.street,
      city: formData.spaceSnapshot.address.city,
      state: formData.spaceSnapshot.address.state,
      zip: formData.spaceSnapshot.address.zip,
    },
    "Location - City": formData.spaceSnapshot.address.city,
    "Location - State": formData.spaceSnapshot.address.state,
    "Location - Zip Code": formData.spaceSnapshot.address.zip,
    "address_neighborhood": formData.spaceSnapshot.address.neighborhood,
    "address_latitude": formData.spaceSnapshot.address.latitude,
    "address_longitude": formData.spaceSnapshot.address.longitude,
    "address_validated": formData.spaceSnapshot.address.validated,

    // Section 2: Features
    "amenities_inside_unit": formData.features.amenitiesInsideUnit,
    "amenities_outside_unit": formData.features.amenitiesOutsideUnit,
    "Description": formData.features.descriptionOfLodging,
    "neighborhood_description": formData.features.neighborhoodDescription,

    // Section 3: Lease Styles
    "rental type": formData.leaseStyles.rentalType,
    "Days Available (List of Days)": formData.leaseStyles.availableNights
      ? Object.entries(formData.leaseStyles.availableNights)
          .filter(([_, v]) => v)
          .map(([day]) => day)
      : [],
    "weekly_pattern": formData.leaseStyles.weeklyPattern,
    "subsidy_agreement": formData.leaseStyles.subsidyAgreement,

    // Section 4: Pricing
    "💰Damage Deposit": formData.pricing.damageDeposit,
    "💰Cleaning Cost / Maintenance Fee": formData.pricing.maintenanceFee,
    "nightly_pricing": formData.pricing.nightlyPricing,
    "weekly_compensation": formData.pricing.weeklyCompensation,
    "monthly_compensation": formData.pricing.monthlyCompensation,

    // Section 5: Rules
    "Cancellation Policy": formData.rules.cancellationPolicy,
    "preferred_gender": formData.rules.preferredGender,
    "Features - Qty Guests": formData.rules.numberOfGuests,
    "NEW Date Check-in Time": formData.rules.checkInTime,
    "NEW Date Check-out Time": formData.rules.checkOutTime,
    "ideal_min_duration": formData.rules.idealMinDuration,
    "ideal_max_duration": formData.rules.idealMaxDuration,
    "Features - House Rules": formData.rules.houseRules,
    "blocked_dates": formData.rules.blockedDates,

    // Section 6: Photos
    "photos": formData.photos.photos.map(p => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      displayOrder: p.displayOrder
    })),

    // Section 7: Review
    "agreed_to_terms": formData.review?.agreedToTerms,
    "optional_notes": formData.review?.optionalNotes,
    "safety_features": formData.review?.safetyFeatures,
    "square_footage": formData.review?.squareFootage,
    "first_day_available": formData.review?.firstDayAvailable,
    "previous_reviews_link": formData.review?.previousReviewsLink,

    // Metadata
    "form_metadata": {
      currentSection: formData.currentSection,
      completedSections: formData.completedSections,
      isDraft: formData.isDraft,
      isSubmitted: formData.isSubmitted,
    },

    // Required fields with defaults
    "Created By": "self-listing-form",
    "Created Date": new Date().toISOString(),
    "Modified Date": new Date().toISOString(),
    "Active": false,
    "Approved": false,
    "Complete": false,
    "Features - Trial Periods Allowed": false,
    "Maximum Weeks": 52,
    "Minimum Nights": 1,
    "Preferred Gender": formData.rules?.preferredGender || "No Preference",
    "Weeks offered": "All",
    "Nights Available (List of Nights) ": [],
  };
}
```

---

## Phase 4: Update SelfListingPage Submission

### 4.1 Modify `handleSubmit` in SelfListingPage.tsx

Replace the simulated submission with actual Supabase insert:

```typescript
import { createListing } from '../../../lib/listingService.js';

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    const newListing = await createListing(formData);

    console.log('Listing created:', newListing);

    // Mark as submitted
    setFormData({ ...formData, isSubmitted: true, isDraft: false });

    // Clear draft from localStorage
    localStorage.removeItem('selfListingDraft');

    // Show success and redirect
    alert('Listing submitted successfully!');
    window.location.href = `/view-split-lease.html?id=${newListing.id}`;

  } catch (error) {
    console.error('Error submitting listing:', error);
    alert('Error submitting listing. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Phase 5: Implementation Checklist

### Step-by-step execution order:

- [ ] **5.1** Apply database migration to add new columns to `listing_trial`
- [ ] **5.2** Create `app/src/lib/listingService.js` with CRUD functions
- [ ] **5.3** Comment out `createListingInCode()` and `getListingById()` in `bubbleAPI.js`
- [ ] **5.4** Update `SelfListingPage.tsx` to use `createListing()` from listingService
- [ ] **5.5** Test end-to-end: Create listing via modal → Fill form → Submit → Verify in database
- [ ] **5.6** Commit changes

---

## Files Changed Summary

| File | Action |
|------|--------|
| Supabase `listing_trial` table | Add ~25 new columns via migration |
| `app/src/lib/listingService.js` | NEW FILE - Supabase CRUD operations |
| `app/src/lib/bubbleAPI.js` | Comment out listing functions |
| `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` | Use new listingService |

---

## Rollback Plan

If issues arise:
1. Uncomment `bubbleAPI.js` functions
2. Revert `SelfListingPage.tsx` to use simulated submission
3. `listing_trial` table changes are isolated and don't affect production `listing` table

---

## Notes

- The `listing_trial` table is completely isolated from Bubble sync
- The `_id` field will contain locally-generated IDs (not Bubble IDs)
- Photos are stored as JSONB (URLs only) - actual file upload is separate concern
- This is a proof-of-concept; production would need photo storage solution
