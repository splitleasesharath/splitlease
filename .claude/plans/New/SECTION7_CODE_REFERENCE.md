# Section 7: Code Reference & Snippets

---

## 1. Section7Review Component

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\sections\Section7Review.tsx`

### Component Signature
```typescript
export const Section7Review: React.FC<Section7Props> = ({
  formData,
  reviewData,
  onChange,
  onSubmit,
  onBack,
  onNavigateToSection,
  isSubmitting
}) => { ... }
```

### Optional Fields Handler
```typescript
const handleChange = (field: keyof ReviewData, value: any) => {
  onChange({ ...reviewData, [field]: value });
  if (errors[field]) {
    const newErrors = { ...errors };
    delete newErrors[field];
    setErrors(newErrors);
  }
};

// Safety Features
const toggleSafetyFeature = (feature: string) => {
  const currentFeatures = reviewData.safetyFeatures || [];
  const updated = currentFeatures.includes(feature)
    ? currentFeatures.filter((f) => f !== feature)
    : [...currentFeatures, feature];
  handleChange('safetyFeatures', updated);
};

// Load Common Safety Features
const loadCommonSafetyFeatures = async () => {
  setIsLoadingSafetyFeatures(true);
  try {
    const commonFeatures = await getCommonSafetyFeatures();
    if (commonFeatures.length > 0) {
      handleChange('safetyFeatures', commonFeatures);
    }
  } catch (err) {
    console.error('Failed to load common safety features:', err);
  } finally {
    setIsLoadingSafetyFeatures(false);
  }
};
```

### Submit Handler
```typescript
const handleSubmit = () => {
  // No validation needed - button is always clickable
  // All validation happens in parent component via stageForSubmission()
  onSubmit();
};
```

### Summary Card Pattern
```typescript
// Collapsible summary card
const toggleSection = (sectionKey: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [sectionKey]: !prev[sectionKey]
  }));
};

// Each section renders like this:
<div className={`summary-card collapsible ${expandedSections['space'] ? 'expanded' : ''}`}>
  <div className="summary-card-header" onClick={() => toggleSection('space')}>
    <h3>📍 Space Details</h3>
    <div className="summary-card-header-right">
      <span className="summary-brief">
        {formData.spaceSnapshot.typeOfSpace} in {formData.spaceSnapshot.address.city || 'NYC'}
      </span>
      <span className="expand-icon">{expandedSections['space'] ? '▼' : '▶'}</span>
    </div>
  </div>
  {expandedSections['space'] && (
    <div className="summary-content">
      <p><strong>Listing Name:</strong> {formData.spaceSnapshot.listingName}</p>
      {/* ... more details ... */}
      <button type="button" className="btn-link" onClick={() => onNavigateToSection?.(1)}>
        Edit Section
      </button>
    </div>
  )}
</div>
```

---

## 2. SelfListingPage Parent Component

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\SelfListingPage.tsx`

### Auth Check
```typescript
const handleSubmit = async () => {
  console.log('[SelfListingPage] Submit clicked, checking auth status...');

  // Check current auth status
  const loggedIn = await checkAuthStatus();
  setIsLoggedIn(loggedIn);

  if (!loggedIn) {
    // User is not logged in - show auth modal
    console.log('[SelfListingPage] User not logged in, showing auth modal');
    setPendingSubmit(true);
    setShowAuthModal(true);
    return;
  }

  // User is logged in - proceed with submission
  console.log('[SelfListingPage] User is logged in, proceeding with submission');
  proceedWithSubmit();
};
```

### Data Staging & Validation
```typescript
const proceedWithSubmit = async () => {
  setIsSubmitting(true);
  markSubmitting();

  try {
    // Stage the data for submission (validates all fields)
    const { success, errors } = stageForSubmission();

    if (!success) {
      console.error('❌ Validation errors:', errors);
      alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
      setIsSubmitting(false);
      return;
    }

    // Show success modal immediately with loading state
    // This provides immediate feedback to the user
    setShowSuccessModal(true);

    console.log('[SelfListingPage] Submitting listing...');
    console.log('[SelfListingPage] Form data:', formData);

    // Submit to listing_trial table via listingService
    const newListing = await createListing(formData);

    console.log('[SelfListingPage] ✅ Listing created:', newListing);

    // Mark as submitted (clears local storage)
    markSubmitted();

    // Update modal with the listing ID (transitions from loading to success)
    setCreatedListingId(newListing.id);
  } catch (error) {
    console.error('[SelfListingPage] ❌ Error submitting listing:', error);
    markSubmissionFailed(error instanceof Error ? error.message : 'Unknown error');
    // Hide the modal on error
    setShowSuccessModal(false);
    alert(`Error submitting listing: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
  } finally {
    setIsSubmitting(false);
  }
};
```

### Post-Auth Submission
```typescript
const handleAuthSuccess = (result: { success: boolean; isNewUser?: boolean }) => {
  console.log('[SelfListingPage] Auth success callback triggered', result);
  setShowAuthModal(false);

  // Show success toast
  const isSignup = result?.isNewUser !== false;
  showToast(
    isSignup ? 'Account created successfully! Creating your listing...'
    : 'Logged in successfully! Creating your listing...',
    'success',
    4000
  );

  // User agreed to terms by signing up
  updateReview({
    ...formData.review,
    agreedToTerms: true,
  });

  // Force Header to re-render after a brief delay
  setTimeout(() => {
    setHeaderKey(prev => prev + 1);
  }, 100);

  if (pendingSubmit) {
    setPendingSubmit(false);

    // Show the success modal immediately with loading state
    setIsSubmitting(true);
    setShowSuccessModal(true);

    // Delay submission to ensure auth state is fully updated
    setTimeout(() => {
      proceedWithSubmitAfterAuth();
    }, 300);
  }
};
```

### Success Modal
```typescript
const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  listingId,
  listingName,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const handleGoToDashboard = () => {
    window.location.href = `/listing-dashboard.html?listing_id=${listingId}`;
  };

  const handleViewListing = () => {
    window.location.href = `/view-split-lease.html?listing_id=${listingId}`;
  };

  // Loading state UI
  if (isLoading) {
    return (
      <div style={successModalStyles.overlay}>
        {/* ... spinner UI ... */}
      </div>
    );
  }

  // Success state UI
  return (
    <div style={successModalStyles.overlay}>
      <div style={successModalStyles.modal}>
        <div style={successModalStyles.iconWrapper}>
          <span style={successModalStyles.icon}>✓</span>
        </div>
        <h2 style={successModalStyles.title}>Listing Created Successfully!</h2>
        <p style={successModalStyles.subtitle}>
          Your listing <span style={successModalStyles.listingName}>"{listingName}"</span>
          has been submitted and is now pending review.
        </p>
        <button style={successModalStyles.button} onClick={handleGoToDashboard}>
          Go to My Dashboard
        </button>
        <button style={{...successModalStyles.button, ...}} onClick={handleViewListing}>
          Preview Listing
        </button>
        <p style={successModalStyles.secondaryText}>
          You'll be notified once your listing is approved.
        </p>
      </div>
    </div>
  );
};
```

### Render Section 7
```typescript
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

---

## 3. Listing Service

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\listingService.js`

### Main Create Function
```javascript
export async function createListing(formData) {
  console.log('[ListingService] Creating listing in listing_trial');

  // Get current user ID
  const userId = getSessionId();
  console.log('[ListingService] Current user ID:', userId);

  // Generate a temporary listing ID for photo uploads
  const tempListingId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Step 0: Upload photos to Supabase Storage
  let uploadedPhotos = [];
  if (formData.photos?.photos?.length > 0) {
    console.log('[ListingService] Uploading photos to Supabase Storage...');
    try {
      uploadedPhotos = await uploadPhotos(formData.photos.photos, tempListingId);
      console.log('[ListingService] ✅ Photos uploaded:', uploadedPhotos.length);
    } catch (uploadError) {
      console.error('[ListingService] ⚠️ Photo upload failed:', uploadError);
      // Continue with data URLs as fallback
      uploadedPhotos = formData.photos.photos.map((p, i) => ({
        id: p.id,
        url: p.url,
        // ... fallback structure
      }));
    }
  }

  // Create form data with uploaded photo URLs
  const formDataWithPhotos = {
    ...formData,
    photos: {
      ...formData.photos,
      photos: uploadedPhotos
    }
  };

  const listingData = mapFormDataToDatabase(formDataWithPhotos, userId);

  // Step 1: Insert into Supabase listing_trial
  const { data, error } = await supabase
    .from('listing_trial')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('[ListingService] ❌ Error creating listing in Supabase:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  console.log('[ListingService] ✅ Listing created in Supabase:', data.id);

  // Step 2: Link listing to account_host
  if (userId) {
    try {
      await linkListingToHost(userId, data.id);
      console.log('[ListingService] ✅ Listing linked to host account');
    } catch (linkError) {
      console.error('[ListingService] ⚠️ Failed to link listing to host:', linkError);
    }
  }

  // Step 3: Sync to Bubble
  try {
    const bubbleId = await syncListingToBubble(data, formData);

    if (bubbleId) {
      // Update listing_trial with Bubble _id
      const { data: updatedData, error: updateError } = await supabase
        .from('listing_trial')
        .update({ _id: bubbleId })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        console.error('[ListingService] ⚠️ Failed to update Bubble _id:', updateError);
        return { ...data, _id: bubbleId };
      }

      console.log('[ListingService] ✅ Listing synced to Bubble with _id:', bubbleId);

      // Step 4: Sync to Supabase listing table (best-effort)
      try {
        const listingRecord = await syncToListingTable(updatedData, bubbleId);
        if (listingRecord) {
          console.log('[ListingService] ✅ Listing synced to Supabase listing table');
        }
      } catch (listingSyncError) {
        console.error('[ListingService] ⚠️ Supabase listing sync failed:', listingSyncError);
      }

      return updatedData;
    }
  } catch (syncError) {
    console.error('[ListingService] ⚠️ Bubble sync failed:', syncError);
  }

  return data;
}
```

### Data Transformation
```javascript
function mapFormDataToDatabase(formData, userId = null) {
  const now = new Date().toISOString();
  const uniqueId = `self_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Map available nights: {sun, mon, ...} → [1, 2, 3, ...] (1-based Bubble days)
  const daysAvailable = formData.leaseStyles?.availableNights
    ? mapAvailableNightsToArray(formData.leaseStyles.availableNights)
    : [];

  return {
    // Required fields
    _id: uniqueId,
    'Created By': userId || 'self-listing-form',
    'Host / Landlord': userId || null,
    'Created Date': now,
    'Modified Date': now,

    // Section 1: Space Snapshot
    Name: formData.spaceSnapshot?.listingName || null,
    'Features - Type of Space': formData.spaceSnapshot?.typeOfSpace || null,
    'Features - Qty Bedrooms': formData.spaceSnapshot?.bedrooms || null,
    'Features - Qty Beds': formData.spaceSnapshot?.beds || null,
    'Features - Qty Bathrooms': formData.spaceSnapshot?.bathrooms || null,
    'Kitchen Type': formData.spaceSnapshot?.typeOfKitchen || null,
    'Features - Parking type': formData.spaceSnapshot?.typeOfParking || null,

    // Address (stored as JSONB)
    'Location - Address': formData.spaceSnapshot?.address ? {
      address: formData.spaceSnapshot.address.fullAddress,
      number: formData.spaceSnapshot.address.number,
      street: formData.spaceSnapshot.address.street,
      lat: formData.spaceSnapshot.address.latitude,
      lng: formData.spaceSnapshot.address.longitude,
    } : null,
    'Location - City': formData.spaceSnapshot?.address?.city || null,
    'Location - State': formData.spaceSnapshot?.address?.state || null,
    'Location - Zip Code': formData.spaceSnapshot?.address?.zip || null,
    'Location - Coordinates': formData.spaceSnapshot?.address?.latitude ? {
      lat: formData.spaceSnapshot.address.latitude,
      lng: formData.spaceSnapshot.address.longitude,
    } : null,

    // Section 2: Features
    'Features - Amenities In-Unit': formData.features?.amenitiesInsideUnit || [],
    'Features - Amenities In-Building': formData.features?.amenitiesOutsideUnit || [],
    Description: formData.features?.descriptionOfLodging || null,

    // Section 3: Lease Styles
    'rental type': formData.leaseStyles?.rentalType || 'Monthly',
    'Days Available (List of Days)': daysAvailable,
    weekly_pattern: formData.leaseStyles?.weeklyPattern || null,

    // Section 4: Pricing
    '💰Damage Deposit': formData.pricing?.damageDeposit || 0,
    '💰Cleaning Cost / Maintenance Fee': formData.pricing?.maintenanceFee || 0,
    '💰Weekly Host Rate': formData.pricing?.weeklyCompensation || null,
    '💰Monthly Host Rate': formData.pricing?.monthlyCompensation || null,
    nightly_pricing: formData.pricing?.nightlyPricing || null,
    ...mapNightlyRatesToColumns(formData.pricing?.nightlyPricing),

    // Section 5: Rules
    'Cancellation Policy': formData.rules?.cancellationPolicy || null,
    'Preferred Gender': formData.rules?.preferredGender || 'No Preference',
    'Features - Qty Guests': formData.rules?.numberOfGuests || 2,
    'NEW Date Check-in Time': formData.rules?.checkInTime || '2:00 PM',
    'NEW Date Check-out Time': formData.rules?.checkOutTime || '11:00 AM',
    'Features - House Rules': formData.rules?.houseRules || [],

    // Section 6: Photos
    'Features - Photos': formData.photos?.photos?.map((p, index) => ({
      id: p.id,
      url: p.url || p.Photo,
      Photo: p.url || p.Photo,
      'Photo (thumbnail)': p['Photo (thumbnail)'] || p.url || p.Photo,
      caption: p.caption || '',
      displayOrder: p.displayOrder ?? index,
      SortOrder: p.SortOrder ?? p.displayOrder ?? index,
      toggleMainPhoto: p.toggleMainPhoto ?? (index === 0),
      storagePath: p.storagePath || null
    })) || [],

    // Section 7: Review
    'Features - Safety': formData.review?.safetyFeatures || [],
    'Features - SQFT Area': formData.review?.squareFootage || null,
    ' First Available': formData.review?.firstDayAvailable || null,

    // Form metadata & defaults
    form_metadata: {
      currentSection: formData.currentSection || 1,
      completedSections: formData.completedSections || [],
      isDraft: formData.isDraft !== false,
      isSubmitted: formData.isSubmitted || false,
    },
    source_type: 'self-listing-form',
    Active: false,
    Approved: false,
    Complete: formData.isSubmitted || false,
  };
}
```

### Available Nights Transformation
```javascript
function mapAvailableNightsToArray(availableNights) {
  const dayMapping = {
    sunday: 1,
    monday: 2,
    tuesday: 3,
    wednesday: 4,
    thursday: 5,
    friday: 6,
    saturday: 7,
  };

  const result = [];
  for (const [day, isSelected] of Object.entries(availableNights)) {
    if (isSelected && dayMapping[day]) {
      result.push(dayMapping[day]);
    }
  }

  return result.sort((a, b) => a - b);
}
```

### Bubble Sync
```javascript
async function syncListingToBubble(supabaseData, formData) {
  console.log('[ListingService] Syncing listing to Bubble...');

  const payload = {
    listing_name: supabaseData.Name || formData.spaceSnapshot?.listingName,
    supabase_id: supabaseData.id,
    type_of_space: supabaseData['Features - Type of Space'],
    bedrooms: supabaseData['Features - Qty Bedrooms'],
    beds: supabaseData['Features - Qty Beds'],
    bathrooms: supabaseData['Features - Qty Bathrooms'],
    city: supabaseData['Location - City'],
    state: supabaseData['Location - State'],
    zip_code: supabaseData['Location - Zip Code'],
    rental_type: supabaseData['rental type'],
    description: supabaseData.Description,
  };

  console.log('[ListingService] Bubble sync payload:', payload);

  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: {
      action: 'sync_listing_to_bubble',
      payload,
    },
  });

  if (error) {
    console.error('[ListingService] ❌ Bubble proxy error:', error);
    throw new Error(error.message || 'Failed to sync to Bubble');
  }

  if (!data.success) {
    console.error('[ListingService] ❌ Bubble sync failed:', data.error);
    throw new Error(data.error || 'Bubble sync returned error');
  }

  console.log('[ListingService] ✅ Bubble sync successful, _id:', data.data?.bubble_id);
  return data.data?.bubble_id || null;
}
```

---

## 4. Edge Function Handler

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-proxy\handlers\listingSync.ts`

### Handler Function
```typescript
export async function handleListingSyncToBubble(
  syncService: BubbleSyncService,
  payload: Record<string, unknown>,
  user: User
): Promise<{ bubble_id: string }> {
  console.log('[ListingSync Handler] ========== SYNC TO BUBBLE ==========');
  console.log('[ListingSync Handler] User:', user.email || 'guest');
  console.log('[ListingSync Handler] Payload keys:', Object.keys(payload));

  // Validate required fields
  validateRequiredFields(payload, ['listing_name', 'supabase_id']);

  const {
    listing_name,
    supabase_id,
    user_email,
    type_of_space,
    bedrooms,
    beds,
    bathrooms,
    city,
    state,
    zip_code,
    rental_type,
    description,
  } = payload as {
    listing_name: string;
    supabase_id: string;
    user_email?: string;
    type_of_space?: string;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
    city?: string;
    state?: string;
    zip_code?: string;
    rental_type?: string;
    description?: string;
  };

  console.log('[ListingSync Handler] Creating listing in Bubble with name:', listing_name);

  // Build parameters for Bubble workflow
  const bubbleParams: Record<string, unknown> = {
    listing_name: listing_name.trim(),
  };

  // Add optional fields if provided
  if (user_email) bubbleParams.user_email = user_email;
  if (type_of_space) bubbleParams.type_of_space = type_of_space;
  if (bedrooms !== undefined) bubbleParams.bedrooms = bedrooms;
  if (beds !== undefined) bubbleParams.beds = beds;
  if (bathrooms !== undefined) bubbleParams.bathrooms = bathrooms;
  if (city) bubbleParams.city = city;
  if (state) bubbleParams.state = state;
  if (zip_code) bubbleParams.zip_code = zip_code;
  if (rental_type) bubbleParams.rental_type = rental_type;
  if (description) bubbleParams.description = description;

  console.log('[ListingSync Handler] Bubble params:', JSON.stringify(bubbleParams, null, 2));

  try {
    // Trigger Bubble workflow to create listing
    const bubbleId = await syncService.triggerWorkflow(
      'listing_creation_in_code',
      bubbleParams
    );

    console.log('[ListingSync Handler] ✅ Listing created in Bubble');
    console.log('[ListingSync Handler] Bubble ID:', bubbleId);
    console.log('[ListingSync Handler] ========== SUCCESS ==========');

    return { bubble_id: bubbleId };
  } catch (error) {
    console.error('[ListingSync Handler] ========== ERROR ==========');
    console.error('[ListingSync Handler] Failed to sync to Bubble:', error);

    if (error instanceof BubbleApiError) {
      throw error;
    }

    throw new BubbleApiError(
      `Failed to create listing in Bubble: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      error
    );
  }
}
```

---

## 5. Store Methods

**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\SelfListingPage\store\useListingStore.ts`

### Hook Usage
```typescript
export function useListingStore(): UseListingStoreReturn {
  const [state, setState] = useState<StoreState>(() => listingLocalStore.getState());

  // Subscribe to store updates
  useEffect(() => {
    const initialState = listingLocalStore.initialize();
    setState(initialState);

    const unsubscribe = listingLocalStore.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Update functions (memoized)
  const updateReview = useCallback((data: ListingFormData['review']) => {
    listingLocalStore.updateReview(data);
  }, []);

  const stageForSubmission = useCallback(() => {
    return listingLocalStore.stageForSubmission();
  }, []);

  const markSubmitted = useCallback(() => {
    listingLocalStore.markSubmitted();
  }, []);

  return {
    formData: state.data,
    lastSaved: state.lastSaved,
    isDirty: state.isDirty,
    stagingStatus: state.stagingStatus,
    errors: state.errors,
    updateReview,
    stageForSubmission,
    markSubmitted,
    // ... other methods
  };
}
```

---

## 6. Key Imports

### In Section7Review.tsx
```typescript
import React, { useState } from 'react';
import type { ListingFormData, ReviewData } from '../types/listing.types';
import { SAFETY_FEATURES } from '../types/listing.types';
import { getCommonSafetyFeatures } from '../utils/safetyService';
```

### In SelfListingPage.tsx
```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Section7Review } from './sections/Section7Review';
import { useListingStore, listingLocalStore } from './store';
import { getListingById } from '../../../lib/bubbleAPI';
import { checkAuthStatus } from '../../../lib/auth';
import { createListing } from '../../../lib/listingService';
import SignUpLoginModal from '../../shared/SignUpLoginModal';
import Toast, { useToast } from '../../shared/Toast';
```

### In listingService.js
```javascript
import { supabase } from './supabase.js';
import { getSessionId } from './secureStorage.js';
import { uploadPhotos } from './photoUpload.js';
```

---

## 7. Type Definitions

### ReviewData Interface
```typescript
interface ReviewData {
  safetyFeatures?: string[];           // Safety features selected
  squareFootage?: number;              // Sq ft of space
  firstDayAvailable?: string;          // ISO date string
  previousReviewsLink?: string;        // URL to external reviews
  agreedToTerms?: boolean;             // User agreed to terms
  optionalNotes?: string;              // Additional notes
}
```

### ListingFormData Interface
```typescript
interface ListingFormData {
  spaceSnapshot: {
    listingName: string;
    typeOfSpace: string;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    typeOfKitchen: string;
    typeOfParking: string;
    address: {
      fullAddress: string;
      number: string;
      street: string;
      city: string;
      state: string;
      zip: string;
      neighborhood: string;
      latitude?: number;
      longitude?: number;
      validated: boolean;
    };
  };
  features: {
    amenitiesInsideUnit: string[];
    amenitiesOutsideUnit: string[];
    descriptionOfLodging: string;
    neighborhoodDescription?: string;
  };
  leaseStyles: {
    rentalType: 'Monthly' | 'Weekly' | 'Nightly';
    availableNights?: {
      sunday: boolean;
      monday: boolean;
      tuesday: boolean;
      wednesday: boolean;
      thursday: boolean;
      friday: boolean;
      saturday: boolean;
    };
    weeklyPattern?: string;
    subsidyAgreement?: boolean;
  };
  pricing: {
    damageDeposit: number;
    maintenanceFee: number;
    monthlyCompensation?: number;
    weeklyCompensation?: number;
    nightlyPricing?: NightlyPricing;
  };
  rules: {
    cancellationPolicy: string;
    preferredGender?: string;
    numberOfGuests: number;
    checkInTime: string;
    checkOutTime: string;
    idealMinDuration?: number;
    idealMaxDuration?: number;
    houseRules: string[];
    blockedDates?: Date[];
  };
  photos: {
    photos: Array<{
      id: string;
      url: string;
      Photo?: string;
      'Photo (thumbnail)'?: string;
      caption?: string;
      displayOrder?: number;
      SortOrder?: number;
      toggleMainPhoto?: boolean;
      storagePath?: string;
    }>;
    minRequired: number;
  };
  review: ReviewData;
  currentSection: number;
  completedSections: number[];
  isDraft: boolean;
  isSubmitted: boolean;
}
```

---

**Document Complete** - Use for quick reference while coding.
