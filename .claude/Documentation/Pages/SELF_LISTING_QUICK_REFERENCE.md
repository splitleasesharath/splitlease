# Self Listing Page - Quick Reference Guide

**GENERATED**: 2025-12-11
**URL**: /self-listing
**ENTRY_POINT**: `app/src/self-listing.jsx`
**HTML_PAGE**: `app/public/self-listing.html`
**MAIN_COMPONENT**: `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx`

---

## Table of Contents

1. [Page Overview](#page-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [State Management](#state-management)
5. [Section Components](#section-components)
6. [Type Definitions](#type-definitions)
7. [Services & Utilities](#services--utilities)
8. [Data Flow](#data-flow)
9. [Styling](#styling)
10. [API Integration](#api-integration)
11. [Key Patterns](#key-patterns)
12. [Common Modifications](#common-modifications)

---

## Page Overview

### Purpose
Multi-step wizard form enabling hosts to create new property listings. Implements a 7-section progressive form with:
- Draft auto-saving to localStorage (debounced 1-second delay)
- Section validation before proceeding
- AI-powered description generation via ai-gateway Edge Function
- Dynamic pricing calculations with decay algorithm
- Photo upload directly to Supabase Storage with drag-and-drop reordering
- Final submission directly to Supabase `listing` table (Bubble sync disabled)

### Core Features
| Feature | Description |
|---------|-------------|
| **7-Section Wizard** | Space Snapshot, Features, Lease Styles, Pricing, Rules, Photos, Review |
| **Draft Persistence** | Auto-saves to localStorage with 1-second debounce |
| **Google Maps Integration** | Address autocomplete restricted to NYC + Hudson County NJ |
| **AI Description Generation** | OpenAI-powered listing descriptions via ai-gateway |
| **Nightly Price Slider** | Interactive slider with decay calculation for multi-night discounts |
| **Photo Management** | Direct upload to Supabase Storage, drag-and-drop reordering |
| **Auth-Aware Submission** | Shows SignUpLoginModal for unauthenticated users |
| **Access Control** | Blocks guest users, allows hosts and logged-out users |

---

## Architecture

### Component Hierarchy

```
self-listing.jsx (entry point)
    |
    SelfListingPage.tsx (main orchestrator)
    |
    +-- Header (shared, with re-render key for auth changes)
    |
    +-- Page Header (sticky with Save Draft button)
    |
    +-- Navigation Sidebar
    |   +-- Progress Circle (circular SVG, 6 sections max)
    |   +-- Section Nav Items (clickable, with lock/complete states)
    |
    +-- Main Content (active section)
    |   |
    |   +-- Section1SpaceSnapshot.tsx
    |   |   +-- Google Maps Autocomplete (NYC + Hudson County NJ)
    |   |   +-- NYC/NJ ZIP code validation
    |   |
    |   +-- Section2Features.tsx
    |   |   +-- Dynamic amenities from Supabase zat_features_amenity
    |   |   +-- AI Description Generator (aiService.js)
    |   |   +-- Neighborhood Template Loader
    |   |
    |   +-- Section3LeaseStyles.tsx
    |   |   +-- HostScheduleSelector (for Nightly)
    |   |   +-- Weekly Pattern Selector
    |   |   +-- Monthly Subsidy Agreement
    |   |
    |   +-- Section4Pricing.tsx
    |   |   +-- NightlyPriceSlider
    |   |   +-- Weekly/Monthly Compensation inputs
    |   |
    |   +-- Section5Rules.tsx
    |   |   +-- Block Dates Calendar (range + individual modes)
    |   |   +-- House Rules Checkboxes
    |   |   +-- Duration constraints (6-52 weeks)
    |   |
    |   +-- Section6Photos.tsx
    |   |   +-- Direct upload to Supabase Storage
    |   |   +-- Drag-and-Drop Reordering
    |   |   +-- 5MB per photo limit
    |   |
    |   +-- Section7Review.tsx
    |       +-- Collapsible Summary Cards
    |       +-- Safety Features Selection
    |       +-- Optional details (sqft, availability date)
    |
    +-- Footer (shared)
    |
    +-- SignUpLoginModal (for auth during submission)
    |
    +-- SuccessModal (loading + success states)
```

### Data Flow Architecture

```
User Input
    |
    v
Section Component (onChange callback)
    |
    v
SelfListingPage (calls store update function)
    |
    v
listingLocalStore (singleton class)  <--->  localStorage ('selfListingDraft')
    |
    v
useListingStore hook (React state sync)
    |
    v
Submit: stageForSubmission() validates all fields
    |
    v
listingService.createListing()
    |
    +-- Generate Bubble-compatible _id via RPC
    |
    +-- Process photos (already in Supabase Storage)
    |
    +-- Insert directly into Supabase `listing` table
    |
    +-- Link listing to user's Listings array
    |
    v
Success: Clear localStorage, show SuccessModal
```

---

## File Structure

```
app/src/islands/pages/SelfListingPage/
|
+-- SelfListingPage.tsx          # Main orchestrator component (850 lines)
+-- index.ts                     # Barrel exports
|
+-- components/
|   +-- NightlyPriceSlider.tsx   # Interactive pricing slider
|   +-- CLAUDE.md
|
+-- sections/
|   +-- Section1SpaceSnapshot.tsx  # Property basics, address (693 lines)
|   +-- Section2Features.tsx       # Amenities, descriptions (344 lines)
|   +-- Section3LeaseStyles.tsx    # Rental type selection (301 lines)
|   +-- Section4Pricing.tsx        # Pricing configuration (229 lines)
|   +-- Section5Rules.tsx          # Rules, blocked dates (571 lines)
|   +-- Section6Photos.tsx         # Photo upload (415 lines)
|   +-- Section7Review.tsx         # Review & submit (370 lines)
|
+-- store/
|   +-- index.ts                   # Module exports
|   +-- useListingStore.ts         # React hook for store access
|   +-- listingLocalStore.ts       # Singleton store class with localStorage
|   +-- prepareListingSubmission.ts # Data transformation for API
|   +-- CLAUDE.md
|
+-- styles/
|   +-- SelfListingPage.css        # All page styles
|
+-- types/
|   +-- listing.types.ts           # TypeScript definitions + constants
|   +-- CLAUDE.md
|
+-- utils/
|   +-- amenitiesService.ts        # Supabase amenities lookup
|   +-- neighborhoodService.ts     # ZIP code neighborhood lookup
|   +-- safetyService.ts           # Safety features lookup
|   +-- CLAUDE.md

Related Files:
|
+-- app/src/lib/
|   +-- listingService.js          # Database operations (direct to listing table)
|   +-- aiService.js               # AI description generation
|   +-- supabase.js                # Supabase client
|   +-- photoUpload.js             # Photo upload utilities
|   +-- nycZipCodes.js             # NYC/NJ ZIP code validation
|
+-- app/src/islands/shared/
    +-- HostScheduleSelector/      # Night selection component
    +-- SignUpLoginModal/          # Auth modal
    +-- Header.jsx                 # Site header
    +-- Footer.jsx                 # Site footer
    +-- Toast/                     # Toast notifications
```

---

## State Management

### Store Architecture: `listingLocalStore.ts`

The store is a singleton class (not Zustand) with localStorage persistence:

```typescript
class ListingLocalStore {
  private state: StoreState;
  private listeners: Set<(state: StoreState) => void>;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null;
  private readonly AUTO_SAVE_DELAY = 1000; // 1 second debounce
}

interface StoreState {
  data: ListingFormData;
  lastSaved: Date | null;
  isDirty: boolean;
  stagingStatus: 'not_staged' | 'staged' | 'submitting' | 'submitted' | 'failed';
  errors: string[];
}
```

### Storage Keys

```typescript
const STORAGE_KEYS = {
  DRAFT: 'selfListingDraft',
  STAGED: 'selfListingStagedForSubmission',
  LAST_SAVED: 'selfListingLastSaved',
  USER_ID: 'selfListingUserId',
};
```

### React Hook: `useListingStore.ts`

```typescript
interface UseListingStoreReturn {
  // State
  formData: ListingFormData;
  lastSaved: Date | null;
  isDirty: boolean;
  stagingStatus: StoreState['stagingStatus'];
  errors: string[];

  // Update functions
  updateFormData: (data: Partial<ListingFormData>) => void;
  updateSpaceSnapshot: (data: ListingFormData['spaceSnapshot']) => void;
  updateFeatures: (data: ListingFormData['features']) => void;
  updateLeaseStyles: (data: ListingFormData['leaseStyles']) => void;
  updatePricing: (data: ListingFormData['pricing']) => void;
  updateRules: (data: ListingFormData['rules']) => void;
  updatePhotos: (data: ListingFormData['photos']) => void;
  updateReview: (data: ListingFormData['review']) => void;

  // Navigation
  setCurrentSection: (section: number) => void;
  markSectionComplete: (section: number) => void;

  // Persistence
  saveDraft: () => boolean;
  stageForSubmission: () => { success: boolean; errors: string[] };
  getStagedData: () => ListingFormData | null;

  // Submission status
  markSubmitting: () => void;
  markSubmitted: () => void;
  markSubmissionFailed: (error: string) => void;
  clearStagingError: () => void;

  // Utilities
  reset: () => void;
  validate: () => string[];
  getDebugSummary: () => object;
}
```

### Form Data Structure: `ListingFormData`

```typescript
interface ListingFormData {
  id?: string;
  userId?: string;
  spaceSnapshot: SpaceSnapshot;   // Section 1
  features: Features;             // Section 2
  leaseStyles: LeaseStylesConfig; // Section 3
  pricing: Pricing;               // Section 4
  rules: Rules;                   // Section 5
  photos: Photos;                 // Section 6
  review: ReviewData;             // Section 7

  // Status fields
  currentSection: number;
  completedSections: number[];
  isDraft: boolean;
  isSubmitted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## Section Components

### Section 1: Space Snapshot (`Section1SpaceSnapshot.tsx`)

**Purpose**: Collect basic property information and location

**Props**:
```typescript
interface Section1Props {
  data: SpaceSnapshot;
  onChange: (data: SpaceSnapshot) => void;
  onNext: () => void;
  isLoadingInitialData?: boolean;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingName` | string | Yes | Name for the listing (max 35 chars) |
| `typeOfSpace` | enum | Yes | 'Private Room', 'Shared Room', 'Entire Place' |
| `bedrooms` | number | Yes | Number of bedrooms (0 = Studio) |
| `beds` | number | No | Number of beds (1-7) |
| `bathrooms` | number | Yes | Number of bathrooms (supports .5) |
| `typeOfKitchen` | enum | Yes | Kitchen type options |
| `typeOfParking` | enum | Yes | Parking type options |
| `address` | AddressData | Yes | Full address with coordinates |

**Address Sub-structure**:
```typescript
interface AddressData {
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
}
```

**Key Features**:
- Google Maps Places Autocomplete with NYC + Hudson County NJ restriction
- Uses `isValidServiceArea()` from `nycZipCodes.js` for validation
- Auto-extracts: street number, street name, city, state, ZIP, coordinates
- Manual address entry fallback option

---

### Section 2: Features (`Section2Features.tsx`)

**Purpose**: Collect amenities and property descriptions

**Props**:
```typescript
interface Section2Props {
  data: Features;
  onChange: (data: Features) => void;
  onNext: () => void;
  onBack: () => void;
  zipCode?: string;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amenitiesInsideUnit` | string[] | No | In-unit amenities |
| `amenitiesOutsideUnit` | string[] | No | Building amenities |
| `descriptionOfLodging` | string | Yes | Main property description |
| `neighborhoodDescription` | string | No | Neighborhood description |

**Key Features**:
- Amenities fetched dynamically from Supabase `zat_features_amenity` table
- "Load Common" buttons fetch pre-set amenities (`pre-set? = true`)
- AI description generation via `generateListingDescription()` from `aiService.js`
- Neighborhood template loader based on ZIP code

**Services Used**:
- `getAllInUnitAmenities()` / `getAllBuildingAmenities()` - Full amenity lists
- `getCommonInUnitAmenities()` / `getCommonBuildingAmenities()` - Pre-set amenities
- `getNeighborhoodByZipCode(zipCode)` - Neighborhood lookup
- `generateListingDescription(listingData)` - AI generation

---

### Section 3: Lease Styles (`Section3LeaseStyles.tsx`)

**Purpose**: Configure rental frequency and availability

**Props**:
```typescript
interface Section3Props {
  data: LeaseStylesConfig;
  onChange: (data: LeaseStylesConfig) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rentalType` | 'Nightly' \| 'Weekly' \| 'Monthly' | Yes | Primary rental model |
| `availableNights` | AvailableNights | If Nightly | Which nights are available |
| `weeklyPattern` | WeeklyPattern | If Weekly | Week-on/off pattern |
| `subsidyAgreement` | boolean | If Monthly | Agreement to subsidy terms |

**AvailableNights Structure**:
```typescript
interface AvailableNights {
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
}
```

**WeeklyPattern Options**:
```typescript
type WeeklyPattern =
  | 'One week on, one week off'
  | 'Two weeks on, two weeks off'
  | 'One week on, three weeks off';
```

**Key Features**:
- Visual rental type cards (Nightly, Weekly, Monthly)
- Uses `HostScheduleSelector` component for night selection
- Converts between boolean-based nights and NightId[] array formats
- Monthly subsidy agreement with inline explanation

---

### Section 4: Pricing (`Section4Pricing.tsx`)

**Purpose**: Configure pricing based on rental type

**Props**:
```typescript
interface Section4Props {
  data: Pricing;
  rentalType: RentalType;
  onChange: (data: Pricing) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nightlyPricing` | NightlyPricing | If Nightly | Full pricing structure |
| `weeklyCompensation` | number | If Weekly | Weekly rate |
| `monthlyCompensation` | number | If Monthly | Monthly rate |
| `damageDeposit` | number | Yes | Min $500 |
| `maintenanceFee` | number | No | Monthly cleaning/maintenance |

**NightlyPricing Structure**:
```typescript
interface NightlyPricing {
  oneNightPrice: number;        // Base price (p1)
  decayPerNight: number;        // Decay factor (0.7-1.0)
  fiveNightTotal: number;       // Sum of nights 1-5
  calculatedRates: {
    night1: number;
    night2: number;
    night3: number;
    night4: number;
    night5: number;
    cumulativeNight2: number;
    cumulativeNight3: number;
    cumulativeNight4: number;
    cumulativeNight5: number;
  };
}
```

**Key Features**:
- NightlyPriceSlider component with decay algorithm: `n[k] = n[k-1] * decay`
- Default decay: 0.956 (about 4.4% discount per additional night)
- Visual slider showing night 1 and night 5 prices

---

### Section 5: Rules (`Section5Rules.tsx`)

**Purpose**: Configure house rules, check-in/out times, and blocked dates

**Props**:
```typescript
interface Section5Props {
  data: Rules;
  rentalType: RentalType;
  onChange: (data: Rules) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cancellationPolicy` | CancellationPolicy | Yes | 'Standard' or 'Additional Host Restrictions' |
| `preferredGender` | GenderPreference | No | Guest gender preference |
| `numberOfGuests` | number | No | Max guests (1-6) |
| `checkInTime` | string | No | Default '2:00 PM' |
| `checkOutTime` | string | No | Default '11:00 AM' |
| `idealMinDuration` | number | Yes | Minimum weeks (6+) |
| `idealMaxDuration` | number | Yes | Maximum weeks (up to 52) |
| `houseRules` | string[] | No | Selected house rules |
| `blockedDates` | Date[] | No | Dates when unavailable |

**Key Features**:
- Interactive calendar for blocking dates (range + individual selection modes)
- "Load Common" button for popular house rules
- Duration unit adapts based on rental type (weeks for Nightly/Weekly, months for Monthly)
- Link to standard cancellation policy

---

### Section 6: Photos (`Section6Photos.tsx`)

**Purpose**: Upload and manage property photos

**Props**:
```typescript
interface Section6Props {
  data: Photos;
  onChange: (data: Photos) => void;
  onNext: () => void;
  onBack: () => void;
}
```

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photos` | PhotoData[] | Yes | Array of photo objects |
| `minRequired` | number | Yes | Minimum photos (default 3) |

**PhotoData Structure**:
```typescript
interface PhotoData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  displayOrder: number;
  storagePath?: string;   // Supabase storage path for deletion
  isUploading?: boolean;  // Track upload state
  uploadError?: string;   // Track upload errors
}
```

**Key Features**:
- Direct upload to Supabase Storage bucket `listing-photos`
- Path format: `listings/{draftId}/{index}_{timestamp}.{ext}`
- 5MB per photo limit
- Drag-and-drop reordering
- First photo automatically marked as cover
- Draft ID generated via `generate_bubble_id` RPC or local fallback

---

### Section 7: Review (`Section7Review.tsx`)

**Purpose**: Final review and submission

**Props**:
```typescript
interface Section7Props {
  formData: ListingFormData;
  reviewData: ReviewData;
  onChange: (data: ReviewData) => void;
  onSubmit: () => void;
  onBack: () => void;
  onNavigateToSection?: (sectionNum: number) => void;
  isSubmitting: boolean;
}
```

**ReviewData Structure**:
```typescript
interface ReviewData {
  optionalNotes?: string;
  agreedToTerms: boolean;
  safetyFeatures?: string[];
  squareFootage?: number;
  firstDayAvailable?: string;
  previousReviewsLink?: string;
}
```

**Safety Features (from listing.types.ts)**:
```typescript
const SAFETY_FEATURES = [
  'Smoke Detector',
  'Carbon Monoxide Detector',
  'Fire Extinguisher',
  'First Aid Kit',
  'Fire Sprinklers',
  'Lock on Bedroom Door'
];
```

**Key Features**:
- Collapsible summary cards for each section with "Edit Section" buttons
- Optional details: safety features, square footage, availability date, review import link
- "Load Common" button for safety features from Supabase
- Fixed bottom navigation with Submit button
- Terms agreement handled via SignUpLoginModal during submission

---

## Type Definitions

### Complete Type Reference: `listing.types.ts`

**Location**: `app/src/islands/pages/SelfListingPage/types/listing.types.ts`

```typescript
// Rental Types
type RentalType = 'Nightly' | 'Weekly' | 'Monthly';
type LeaseStyle = 'traditional' | 'flex' | 'subsidy';

// Space Types
type SpaceType = 'Private Room' | 'Entire Place' | 'Shared Room';

// Kitchen Types
type KitchenType = 'Full Kitchen' | 'Kitchenette' | 'No Kitchen' | 'Kitchen Not Accessible';

// Parking Types
type ParkingType =
  | 'Street Parking'
  | 'No Parking'
  | 'Off-Street Parking'
  | 'Attached Garage'
  | 'Detached Garage'
  | 'Nearby Parking Structure';

// Policy Types
type CancellationPolicy = 'Standard' | 'Additional Host Restrictions';
type GenderPreference = 'Male' | 'Female' | 'Other/Non Defined' | 'No Preference';

// Weekly Pattern Options
type WeeklyPattern =
  | 'One week on, one week off'
  | 'Two weeks on, two weeks off'
  | 'One week on, three weeks off';
```

### Constants (from listing.types.ts)

```typescript
// In-Unit Amenities (28 items)
const AMENITIES_INSIDE = [
  'Air Conditioned', 'Bedding', 'Closet', 'Coffee Maker', 'Dedicated Workspace',
  'Dishwasher', 'Dryer', 'Fireplace', 'Hair Dryer', 'Hangers', 'Iron/Ironing Board',
  'Locked Door', 'Patio/Backyard', 'TV', 'Washer', 'WiFi', 'Microwave', 'Refrigerator',
  'Oven/Stove', 'Kitchen Utensils', 'Dishes & Silverware', 'Cooking Basics', 'Cable TV',
  'Heating', 'Hot Water', 'Essentials', 'Private Entrance', 'Lockbox'
];

// Building Amenities (24 items)
const AMENITIES_OUTSIDE = [
  'BBQ Grill', 'Bike Storage', 'Common Outdoor Space', 'Doorman', 'Elevator', 'Gym',
  'Hot Tub', 'Pool (Indoor)', 'Pool (Outdoor)', 'Laundry Room', 'Wheelchair Accessible',
  'Free Parking', 'Paid Parking', 'EV Charger', 'Security Cameras', 'Smoke Alarm',
  'Carbon Monoxide Alarm', 'Fire Extinguisher', 'First Aid Kit', 'Pets Allowed',
  'Pet Friendly Common Areas', '24-Hour Security', 'Concierge', 'Package Receiving'
];

// House Rules (30 items)
const HOUSE_RULES = [
  'Clear Common Areas', 'Conserve Water', "Don't Move Furniture", 'Flush Toilet Paper ONLY',
  'Lock Doors', 'Maximum Occupancy', 'No Access On Off Days', 'No Candles', 'No Drinking',
  'No Drugs', 'No Entertaining', 'No Food in Bedroom', 'No Guests', 'No Overnight Guests',
  'No Package Delivery', 'No Parties', 'No Pets', 'No Shoes Inside', 'No Smoking Inside',
  'No Smoking Outside', 'Quiet Hours', 'Not Suitable for Children', 'Off Limit Areas',
  'Recycle', 'Take Out Trash', 'Wash Your Dishes', 'Respect Neighbors', 'No Loud Music',
  'Clean Up After Yourself', 'Turn Off Lights'
];
```

### Default Values

```typescript
const DEFAULT_LISTING_DATA: ListingFormData = {
  spaceSnapshot: {
    listingName: '',
    typeOfSpace: '',
    bedrooms: 2,
    typeOfKitchen: '',
    beds: 2,
    typeOfParking: '',
    bathrooms: 2.5,
    address: { fullAddress: '', number: '', street: '', city: '', state: '', zip: '', neighborhood: '', validated: false }
  },
  features: { amenitiesInsideUnit: [], amenitiesOutsideUnit: [], descriptionOfLodging: '', neighborhoodDescription: '' },
  leaseStyles: { rentalType: 'Monthly', subsidyAgreement: false },
  pricing: { damageDeposit: 500, maintenanceFee: 0 },
  rules: {
    cancellationPolicy: '', preferredGender: 'No Preference', numberOfGuests: 2,
    checkInTime: '2:00 PM', checkOutTime: '11:00 AM',
    idealMinDuration: 6, idealMaxDuration: 52, houseRules: [], blockedDates: []
  },
  photos: { photos: [], minRequired: 3 },
  review: { agreedToTerms: false, safetyFeatures: [], squareFootage: undefined, firstDayAvailable: '', previousReviewsLink: '' },
  currentSection: 1, completedSections: [], isDraft: true, isSubmitted: false
};
```

---

## Services & Utilities

### AI Service (`app/src/lib/aiService.js`)

```javascript
// Generate AI-powered listing description
async function generateListingDescription(listingData) {
  // Calls ai-gateway Edge Function with 'listing-description' prompt
  // Returns: string (generated description)
}

// Extract listing data from localStorage draft
function extractListingDataFromDraft() {
  // Reads 'selfListingDraft' from localStorage
  // Returns: object with listing properties for AI generation
}
```

### Listing Service (`app/src/lib/listingService.js`)

```javascript
// Create new listing directly in listing table
async function createListing(formData) {
  // 1. Generate Bubble-compatible _id via RPC (generate_bubble_id)
  // 2. Process photos (already uploaded to Supabase Storage)
  // 3. Insert directly into listing table
  // 4. Link listing to user's Listings array
  // Returns: created listing record with _id
}

// Update existing listing
async function updateListing(listingId, formData)

// Get listing by _id
async function getListingById(listingId)

// Save draft (creates/updates listing with isDraft: true)
async function saveDraft(formData, existingId = null)

// Map form data to database columns
function mapFormDataToListingTable(formData, userId, generatedId)

// Map database record to form data
function mapDatabaseToFormData(dbRecord)
```

### Amenities Service (`utils/amenitiesService.ts`)

```typescript
// Get ALL amenities by type (for checkbox lists)
async function getAllAmenitiesByType(type: string): Promise<string[]>
  // Queries: zat_features_amenity table
  // Filters: pending = false, 'Type - Amenity Categories' = type

async function getAllInUnitAmenities(): Promise<string[]>
async function getAllBuildingAmenities(): Promise<string[]>

// Get common (pre-set) amenities
async function getCommonAmenitiesByType(type: string): Promise<string[]>
  // Filters: 'pre-set?' = true, 'Type - Amenity Categories' = type

async function getCommonInUnitAmenities(): Promise<string[]>
async function getCommonBuildingAmenities(): Promise<string[]>
```

### Neighborhood Service (`utils/neighborhoodService.ts`)

```typescript
// Get neighborhood by ZIP code
async function getNeighborhoodByZipCode(zipCode: string): Promise<Neighborhood | null>
  // Uses RPC function: get_neighborhood_by_zip
  // Returns: { neighborhood_name, description, zips }
```

### Safety Service (`utils/safetyService.ts`)

```typescript
// Get common safety features
async function getCommonSafetyFeatures(): Promise<string[]>
  // Queries: zfut_safetyfeatures table
  // Filters: 'pre-set?' = true
```

### Photo Upload (`app/src/lib/photoUpload.js`)

```javascript
// Upload photos to Supabase Storage
async function uploadPhotos(photos, listingId)

// Delete single photo from storage
async function deletePhoto(storagePath)
```

---

## Data Flow

### Form Submission Flow

```
1. User clicks "Submit Listing" in Section 7
   |
   v
2. SelfListingPage.handleSubmit() checks auth status
   |
   +-- Not logged in: Show SignUpLoginModal, set pendingSubmit
   |   |
   |   v
   |   User completes auth -> handleAuthSuccess() -> proceedWithSubmitAfterAuth()
   |
   +-- Logged in: proceedWithSubmit()
       |
       v
3. stageForSubmission() validates all fields
   |
   v
4. Show SuccessModal with loading state
   |
   v
5. listingService.createListing(formData)
   |
   +-- Generate Bubble-compatible _id via RPC
   |
   +-- Process photos (already in storage)
   |
   +-- Insert into listing table
   |
   +-- Link to user's Listings array
   |
   v
6. markSubmitted() clears localStorage
   |
   v
7. Update SuccessModal with listing ID (transitions to success)
   |
   v
8. User clicks "Go to Dashboard" or "Preview Listing"
```

### Day Indexing Convention

**CRITICAL**: Two different day indexing systems are used:

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **Internal (JS/React)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Database (Bubble-compatible)** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Conversion in listingService.js**:
```javascript
// Internal boolean object -> Database 1-based array
function mapAvailableNightsToArray(availableNights) {
  const dayMapping = {
    sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
    thursday: 5, friday: 6, saturday: 7
  };
  // Returns sorted 1-based array for database
}

// Database 1-based array -> Internal boolean object
function mapArrayToAvailableNights(daysArray) {
  const dayMapping = {
    1: 'sunday', 2: 'monday', 3: 'tuesday', 4: 'wednesday',
    5: 'thursday', 6: 'friday', 7: 'saturday'
  };
  // Returns boolean object for React
}
```

---

## Styling

### CSS File

**Location**: `app/src/islands/pages/SelfListingPage/styles/SelfListingPage.css`

### CSS Variables Used

```css
/* Primary brand colors */
--color-primary: #31135d;
--color-primary-hover: #1f0b38;
--color-secondary: #5B21B6;

/* Success modal colors */
#10B981 /* Green success icon */
#5B21B6 /* Purple buttons */
#4C1D95 /* Purple button hover */
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.self-listing-page` | Root container |
| `.listing-header` | Sticky header with Save Draft |
| `.navigation-sidebar` | Left sidebar with progress |
| `.progress-circle` | Circular SVG progress indicator |
| `.nav-item` | Section navigation button |
| `.nav-item.active` | Currently active section |
| `.nav-item.completed` | Completed section (green check) |
| `.nav-item.locked` | Locked section (lock icon) |
| `.main-content` | Main content area |
| `.section-container` | Section wrapper |
| `.section-title` | Section heading |
| `.section-subtitle` | Section description |
| `.form-group` | Form field container |
| `.form-row` | Two-column row |
| `.checkbox-grid` | Grid of checkboxes |
| `.rental-type-selector` | 3-card rental type picker |
| `.rental-type-card.selected` | Selected rental type |
| `.host-schedule-selector-wrapper` | HostScheduleSelector container |
| `.photo-gallery` | Photo grid container |
| `.photo-item` | Individual photo card |
| `.photo-item.dragging` | During drag |
| `.photo-item.drag-over` | Drop target |
| `.upload-area` | Photo upload dropzone |
| `.review-summary` | Summary cards container |
| `.summary-card.collapsible` | Expandable summary |
| `.review-fixed-navigation` | Fixed bottom nav |
| `.block-dates-layout` | Side-by-side calendar layout |
| `.date-picker-container` | Calendar modal/inline |
| `.calendar-day.in-range` | Selected date |
| `.calendar-day.blocked` | Already blocked |
| `.optional-details-section` | Optional fields section in review |
| `.optional-fields-grid` | Two-column optional fields layout |

### Responsive Breakpoints

```css
/* Desktop: > 1024px - Full side-by-side layout */
/* Tablet: 768px - 1024px - Single column with popup calendar */
/* Mobile: < 768px - Simplified single column */

@media (max-width: 1024px) {
  .listing-container { grid-template-columns: 1fr; }
  .navigation-sidebar { position: static; }
  .block-dates-layout { grid-template-columns: 1fr; }
  /* Calendar becomes popup modal on mobile */
}

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
  .rental-type-selector { grid-template-columns: 1fr; }
  .features-two-column { grid-template-columns: 1fr; }
}
```

---

## API Integration

### Supabase Tables Used

| Table | Purpose |
|-------|---------|
| `listing` | Primary storage for listings (direct insert, no Bubble sync) |
| `user` | User records (Listings array updated) |
| `zat_features_amenity` | Amenity lookup table |
| `zat_geo_hood_mediumlevel` | Neighborhood data |
| `zfut_safetyfeatures` | Safety features lookup |

### Supabase Storage

| Bucket | Purpose |
|--------|---------|
| `listing-photos` | Photo storage for listings |

### Edge Functions Called

| Function | Purpose |
|----------|---------|
| `ai-gateway` | Generate AI description via OpenAI |

### RPC Functions Used

| Function | Purpose |
|----------|---------|
| `generate_bubble_id` | Generate Bubble-compatible unique IDs |
| `get_neighborhood_by_zip` | Lookup neighborhood by ZIP code |

### Database Column Mapping (listing table)

Key column names in `listing` table:

```javascript
{
  // Identity
  '_id': 'Bubble-compatible unique ID (generated via RPC)',

  // User/Host reference
  'Created By': 'userId',
  'Host / Landlord': 'userId',

  // Section 1: Space Snapshot
  'Name': 'listingName',
  'Features - Type of Space': 'typeOfSpace',
  'Features - Qty Bedrooms': 'bedrooms',
  'Features - Qty Beds': 'beds',
  'Features - Qty Bathrooms': 'bathrooms',
  'Kitchen Type': 'typeOfKitchen',
  'Features - Parking type': 'typeOfParking',

  // Location (stored as JSONB with validated flag)
  'Location - Address': '{ address, number, street, lat, lng, validated }',
  'Location - City': 'city',
  'Location - State': 'state',
  'Location - Zip Code': 'zip',
  'neighborhood (manual input by user)': 'neighborhood',

  // Section 2: Features
  'Features - Amenities In-Unit': '[]',
  'Features - Amenities In-Building': '[]',
  'Description': 'descriptionOfLodging',
  'Description - Neighborhood': 'neighborhoodDescription',

  // Section 3: Lease Style
  'rental type': 'Nightly | Weekly | Monthly',
  'Days Available (List of Days)': '[1-7] array (1-based)',
  'Nights Available (List of Nights) ': '["Monday", "Tuesday", ...] array',
  'Weeks offered': 'weeklyPattern',

  // Section 4: Pricing
  '💰Damage Deposit': 'number',
  '💰Cleaning Cost / Maintenance Fee': 'number',
  '💰Weekly Host Rate': 'number',
  '💰Monthly Host Rate': 'number',
  '💰Nightly Host Rate for X nights': 'calculated rates (2-7 nights)',

  // Section 5: Rules
  'Cancellation Policy': 'string',
  'Preferred Gender': 'string',
  'Features - Qty Guests': 'number',
  'NEW Date Check-in Time': 'string',
  'NEW Date Check-out Time': 'string',
  'Minimum Months': 'idealMinDuration',
  'Maximum Months': 'idealMaxDuration',
  'Features - House Rules': '[]',
  'Dates - Blocked': '[]',

  // Section 6: Photos
  'Features - Photos': '[{ id, url, Photo, Photo (thumbnail), caption, displayOrder, SortOrder, toggleMainPhoto, storagePath }]',

  // Section 7: Review
  'Features - Safety': '[]',
  'Features - SQFT Area': 'number',
  ' First Available': 'date string (note leading space)',
  'Source Link': 'previousReviewsLink',

  // Status
  'Active': 'false (pending review)',
  'Approved': 'false (pending review)',
  'Complete': 'isSubmitted'
}
```

---

## Key Patterns

### 1. Section Validation Pattern

Each section implements its own validation:

```typescript
const validateForm = (): string[] => {
  const newErrors: Record<string, string> = {};
  const errorOrder: string[] = [];

  if (!data.requiredField) {
    newErrors.requiredField = 'Field is required';
    errorOrder.push('requiredField');
  }

  setErrors(newErrors);
  return errorOrder; // For scroll-to-error
};

const handleNext = () => {
  const errorKeys = validateForm();
  if (errorKeys.length === 0) {
    onNext();
  } else {
    scrollToFirstError(errorKeys);
  }
};
```

### 2. Scroll-to-Error Pattern

```typescript
const scrollToFirstError = useCallback((errorKeys: string[]) => {
  if (errorKeys.length === 0) return;
  const firstErrorKey = errorKeys[0];
  const element = document.getElementById(firstErrorKey);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus();
  }
}, []);
```

### 3. "Load Common" Pattern

Used in Sections 2, 5, and 7:

```typescript
const loadCommonItems = async () => {
  setIsLoading(true);
  try {
    const items = await getCommonItemsFromSupabase();
    if (items.length > 0) {
      handleChange('field', [...new Set([...data.field, ...items])]);
    } else {
      alert('No common items found.');
    }
  } catch (error) {
    alert('Error loading items.');
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Draft Auto-Save Pattern

In `listingLocalStore.ts`:

```typescript
private scheduleAutoSave(): void {
  if (this.autoSaveTimer) {
    clearTimeout(this.autoSaveTimer);
  }
  this.autoSaveTimer = setTimeout(() => {
    this.saveDraft();
  }, this.AUTO_SAVE_DELAY); // 1000ms
}
```

### 5. Section Component Props Pattern

All section components follow this interface:

```typescript
interface SectionProps<T> {
  data: T;
  onChange: (data: T) => void;
  onNext: () => void;
  onBack: () => void;
  // Optional additional props
  rentalType?: RentalType;
  zipCode?: string;
  isLoadingInitialData?: boolean;
}
```

### 6. Auth-Aware Submission Pattern

```typescript
const handleSubmit = async () => {
  const loggedIn = await checkAuthStatus();

  if (!loggedIn) {
    setPendingSubmit(true);
    setShowAuthModal(true);
    return;
  }

  proceedWithSubmit();
};

const handleAuthSuccess = (result) => {
  setShowAuthModal(false);
  // Set agreedToTerms since user agreed during signup
  updateReview({ ...formData.review, agreedToTerms: true });
  // Force Header re-render
  setHeaderKey(prev => prev + 1);

  if (pendingSubmit) {
    setPendingSubmit(false);
    setShowSuccessModal(true);
    setTimeout(() => proceedWithSubmitAfterAuth(), 300);
  }
};
```

---

## Common Modifications

### Adding a New Field to a Section

1. **Update types** in `listing.types.ts`
2. **Add field** to section component JSX
3. **Add validation** if required
4. **Update DEFAULT_LISTING_DATA** in `listing.types.ts`
5. **Update mapping** in `listingService.js` (`mapFormDataToListingTable`)

### Adding a New Amenity/House Rule

Amenities are now fetched from Supabase `zat_features_amenity` table. To add:
1. Add record to `zat_features_amenity` table in Supabase
2. Set `pending = false` and appropriate `Type - Amenity Categories`
3. Set `pre-set? = true` if it should appear in "Load Common"

House rules are defined in `listing.types.ts`:
```typescript
const HOUSE_RULES = [
  // ... existing
  'New Rule',
];
```

### Modifying Pricing Slider

The `NightlyPriceSlider` is in `components/NightlyPriceSlider.tsx`. Key parameters:
- `initialP1`: Starting 1-night price (default 99)
- `initialDecay`: Decay factor (default 0.956)
- `onPricesChange`: Callback with calculated prices object

### Changing Minimum Photo Requirement

In `listing.types.ts` DEFAULT_LISTING_DATA:
```typescript
photos: {
  photos: [],
  minRequired: 3, // Change this value
}
```

### Adding a New Section

1. Create `Section8NewSection.tsx` in `sections/`
2. Add type definition in `listing.types.ts`
3. Update `ListingFormData` interface
4. Update `DEFAULT_LISTING_DATA`
5. Add section to `sections` array in `SelfListingPage.tsx`
6. Update progress calculation (currently hardcoded to 6 sections)

---

## Debugging Tips

### Common Issues

1. **Address not validating**: Check Google Maps API key, verify ZIP is in NYC/Hudson County NJ
2. **AI description failing**: Check ai-gateway Edge Function logs in Supabase
3. **Photos not uploading**: Check file size (5MB limit), verify Supabase Storage bucket exists
4. **Submission failing**: Check user auth status, verify generate_bubble_id RPC exists
5. **Draft not loading**: Clear localStorage `selfListingDraft` key

### Console Logging

Key log prefixes to search for:
- `[ListingService]` - Database operations
- `[Section2Features]` - Features section
- `📂 ListingLocalStore` - Store operations
- `📦 ListingLocalStore` - Staging operations
- `💾 ListingLocalStore` - Save operations
- `[SelfListingPage]` - Main component

### LocalStorage Keys

- `selfListingDraft` - Complete form draft data
- `selfListingStagedForSubmission` - Staged data awaiting submission
- `selfListingLastSaved` - Last save timestamp
- `selfListingDraftId` - Draft ID for photo uploads
- `pendingListingName` - Temp key from CreateDuplicateListingModal

### Debug Summary

```typescript
const { getDebugSummary } = useListingStore();
console.log(getDebugSummary());
// Returns: { hasData, listingName, completedSections, currentSection, photosCount, stagingStatus, lastSaved, isDirty, errorsCount }
```

---

## Related Documentation

- [App CLAUDE.md](../../../../app/CLAUDE.md) - Frontend architecture overview
- [Supabase CLAUDE.md](../../../../supabase/CLAUDE.md) - Edge Functions documentation
- [DATABASE_SCHEMA_OVERVIEW.md](../../../../DATABASE_SCHEMA_OVERVIEW.md) - Table schemas
- [HostScheduleSelector](../../shared/HostScheduleSelector/) - Night selector component

---

## Important File Locations

| Resource | Path |
|----------|------|
| Main Component | `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` |
| Type Definitions | `app/src/islands/pages/SelfListingPage/types/listing.types.ts` |
| Store Hook | `app/src/islands/pages/SelfListingPage/store/useListingStore.ts` |
| Store Class | `app/src/islands/pages/SelfListingPage/store/listingLocalStore.ts` |
| Database Service | `app/src/lib/listingService.js` |
| AI Service | `app/src/lib/aiService.js` |
| Photo Upload | `app/src/lib/photoUpload.js` |
| NYC ZIP Validation | `app/src/lib/nycZipCodes.js` |
| CSS Styles | `app/src/islands/pages/SelfListingPage/styles/SelfListingPage.css` |
| Entry Point | `app/src/self-listing.jsx` |
| HTML Page | `app/public/self-listing.html` |

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Complete Quick Reference Guide - Updated to reflect current implementation
