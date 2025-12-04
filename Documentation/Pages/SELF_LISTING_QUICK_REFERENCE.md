# Self Listing Page - Quick Reference Guide

**GENERATED**: 2025-12-04
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
- Draft auto-saving to localStorage
- Section validation before proceeding
- AI-powered description generation
- Dynamic pricing calculations
- Photo upload with drag-and-drop reordering
- Final submission to Supabase + Bubble sync

### Core Features
| Feature | Description |
|---------|-------------|
| **7-Section Wizard** | Space Snapshot, Features, Lease Styles, Pricing, Rules, Photos, Review |
| **Draft Persistence** | Auto-saves to localStorage with debounced updates |
| **Google Maps Integration** | Address autocomplete with coordinate extraction |
| **AI Description Generation** | OpenAI-powered listing descriptions via ai-gateway |
| **Dynamic Pricing Slider** | Shadow DOM slider for nightly pricing with decay calculation |
| **Photo Management** | Upload, reorder (drag-and-drop), delete photos |
| **Dual Database Submission** | Writes to Supabase listing_trial + syncs to Bubble |

---

## Architecture

### Component Hierarchy

```
self-listing.jsx (entry point)
    |
    SelfListingPage.tsx (main orchestrator)
    |
    +-- Header (sticky with Save Draft button)
    |
    +-- Navigation Sidebar
    |   +-- Progress Circle (circular SVG)
    |   +-- Section Nav Items (clickable navigation)
    |
    +-- Main Content (active section)
        |
        +-- Section1SpaceSnapshot.tsx
        |   +-- Google Maps Autocomplete
        |
        +-- Section2Features.tsx
        |   +-- AI Description Generator (aiService.js)
        |   +-- Neighborhood Template Loader
        |
        +-- Section3LeaseStyles.tsx
        |   +-- HostScheduleSelector (for Nightly)
        |   +-- Weekly Pattern Selector
        |   +-- Monthly Agreement
        |
        +-- Section4Pricing.tsx
        |   +-- NightlyPriceSlider (Shadow DOM)
        |   +-- Weekly/Monthly Compensation
        |
        +-- Section5Rules.tsx
        |   +-- Block Dates Calendar
        |   +-- House Rules Checkboxes
        |
        +-- Section6Photos.tsx
        |   +-- File Upload
        |   +-- Drag-and-Drop Reordering
        |
        +-- Section7Review.tsx
            +-- Collapsible Summary Cards
            +-- Safety Features
            +-- Submit Button
```

### Data Flow Architecture

```
User Input
    |
    v
Section Component (onChange callback)
    |
    v
SelfListingPage (state update)
    |
    v
useListingStore (Zustand)  <--->  localStorage (listingLocalStore)
    |
    v
prepareListingSubmission.ts (data transformation)
    |
    v
listingService.js (createListing)
    |
    +--> Supabase listing_trial (primary storage)
    |
    +--> bubble-proxy Edge Function (sync to Bubble)
    |
    +--> Supabase listing table (keeps both in sync)
```

---

## File Structure

```
app/src/islands/pages/SelfListingPage/
|
+-- SelfListingPage.tsx          # Main orchestrator component
+-- index.ts                     # Barrel exports
|
+-- components/
|   +-- NightlyPriceSlider.tsx   # Shadow DOM pricing slider
|   +-- CLAUDE.md
|
+-- sections/
|   +-- Section1SpaceSnapshot.tsx  # Property basics, address
|   +-- Section2Features.tsx       # Amenities, descriptions
|   +-- Section3LeaseStyles.tsx    # Rental type selection
|   +-- Section4Pricing.tsx        # Pricing configuration
|   +-- Section5Rules.tsx          # Rules, blocked dates
|   +-- Section6Photos.tsx         # Photo upload
|   +-- Section7Review.tsx         # Review & submit
|
+-- store/
|   +-- useListingStore.ts         # Zustand store definition
|   +-- listingLocalStore.ts       # localStorage persistence
|   +-- prepareListingSubmission.ts # Data transformation
|   +-- CLAUDE.md
|
+-- styles/
|   +-- SelfListingPage.css        # All page styles
|
+-- types/
|   +-- listing.types.ts           # TypeScript definitions
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
|   +-- listingService.js          # Database operations
|   +-- aiService.js               # AI description generation
|   +-- supabase.js                # Supabase client
|
+-- app/src/islands/shared/
    +-- HostScheduleSelector/      # Night selection component
```

---

## State Management

### Zustand Store: `useListingStore.ts`

```typescript
interface ListingStore {
  // Form data
  formData: ListingFormData;

  // Navigation
  currentSection: number;
  completedSections: number[];

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;

  // Actions
  setSpaceSnapshot: (data: SpaceSnapshot) => void;
  setFeatures: (data: Features) => void;
  setLeaseStyles: (data: LeaseStylesConfig) => void;
  setPricing: (data: Pricing) => void;
  setRules: (data: Rules) => void;
  setPhotos: (data: Photos) => void;
  setReviewData: (data: ReviewData) => void;

  // Navigation actions
  setCurrentSection: (section: number) => void;
  markSectionComplete: (section: number) => void;
  goToNextSection: () => void;
  goToPrevSection: () => void;

  // Persistence
  saveDraft: () => void;
  loadDraft: () => void;
  clearDraft: () => void;

  // Submission
  submitListing: () => Promise<void>;
}
```

### localStorage Persistence: `listingLocalStore.ts`

```typescript
const STORAGE_KEY = 'selfListingDraft';

// Functions exported:
export function saveDraftToLocal(formData: ListingFormData): void
export function loadDraftFromLocal(): ListingFormData | null
export function clearDraftFromLocal(): void
export function hasDraft(): boolean
```

### Form Data Structure: `ListingFormData`

```typescript
interface ListingFormData {
  spaceSnapshot: SpaceSnapshot;   // Section 1
  features: Features;             // Section 2
  leaseStyles: LeaseStylesConfig; // Section 3
  pricing: Pricing;               // Section 4
  rules: Rules;                   // Section 5
  photos: Photos;                 // Section 6
  review: ReviewData;             // Section 7
}
```

---

## Section Components

### Section 1: Space Snapshot (`Section1SpaceSnapshot.tsx`)

**Purpose**: Collect basic property information and location

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `listingName` | string | Yes | Name for the listing |
| `typeOfSpace` | enum | Yes | 'Private Room', 'Shared Room', 'Entire Place' |
| `bedrooms` | number | Yes | Number of bedrooms (0 = Studio) |
| `beds` | number | Yes | Number of beds |
| `bathrooms` | number | Yes | Number of bathrooms (supports .5) |
| `typeOfKitchen` | enum | No | 'Full Kitchen', 'Kitchenette', 'No Kitchen', 'Shared Kitchen' |
| `typeOfParking` | enum | No | 'Street Parking', 'Driveway', 'Garage', 'None' |
| `address` | Address | Yes | Full address with coordinates |

**Address Sub-structure**:
```typescript
interface Address {
  fullAddress: string;
  number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  validated: boolean;
}
```

**Key Features**:
- Google Maps Places Autocomplete integration
- Auto-extracts: street number, street name, city, state, ZIP, coordinates
- Address validation state tracking

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section1SpaceSnapshot.tsx`

---

### Section 2: Features (`Section2Features.tsx`)

**Purpose**: Collect amenities and property descriptions

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amenitiesInsideUnit` | string[] | No | In-unit amenities |
| `amenitiesOutsideUnit` | string[] | No | Building amenities |
| `descriptionOfLodging` | string | Yes | Main property description |
| `neighborhoodDescription` | string | No | Neighborhood description |

**Amenity Constants** (from `listing.types.ts`):
```typescript
const AMENITIES_INSIDE = [
  'Air Conditioning', 'Heating', 'WiFi', 'TV', 'Washer', 'Dryer',
  'Kitchen', 'Microwave', 'Refrigerator', 'Dishwasher', 'Oven',
  'Coffee Maker', 'Iron', 'Hair Dryer', 'Desk', 'Closet',
  'Private Bathroom', 'Balcony', 'Patio'
];

const AMENITIES_OUTSIDE = [
  'Gym', 'Pool', 'Hot Tub', 'Doorman', 'Elevator', 'Laundry Room',
  'Bike Storage', 'Parking', 'Rooftop', 'BBQ Area', 'Garden',
  'Security System', 'Package Room', 'Concierge'
];
```

**Key Features**:
- "Load Common" buttons fetch pre-set amenities from Supabase
- AI description generation via `loadTemplate()` function
- Neighborhood template loader based on ZIP code

**Services Used**:
- `amenitiesService.ts` - `getCommonInUnitAmenities()`, `getCommonBuildingAmenities()`
- `neighborhoodService.ts` - `getNeighborhoodByZipCode(zipCode)`
- `aiService.js` - `generateListingDescription(listingData)`

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section2Features.tsx`

---

### Section 3: Lease Styles (`Section3LeaseStyles.tsx`)

**Purpose**: Configure rental frequency and availability

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
- HostScheduleSelector component for night selection
- Auto-complete to 7 nights when 6 are selected
- Monthly subsidy agreement with inline explanation

**Components Used**:
- `HostScheduleSelector` from `app/src/islands/shared/HostScheduleSelector/`

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section3LeaseStyles.tsx`

---

### Section 4: Pricing (`Section4Pricing.tsx`)

**Purpose**: Configure pricing based on rental type

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
- NightlyPriceSlider component (Shadow DOM for isolation)
- Real-time price calculation with decay algorithm: `n[k] = n[k-1] * decay`
- Visual slider showing night 1 and night 5 prices
- Price table showing all 7 nights with cumulative totals

**Components Used**:
- `NightlyPriceSlider` from `app/src/islands/pages/SelfListingPage/components/NightlyPriceSlider.tsx`

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section4Pricing.tsx`

---

### Section 5: Rules (`Section5Rules.tsx`)

**Purpose**: Configure house rules, check-in/out times, and blocked dates

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

**House Rules Constants**:
```typescript
const HOUSE_RULES = [
  'No Parties', 'No Smoking Inside', 'No Smoking on Property',
  'No Pets', 'Quiet Hours', 'No Overnight Guests',
  'Wash Your Dishes', 'Lock Doors', 'Remove Shoes Indoors',
  'Recycle', 'Conserve Water', 'No Cooking Strong-Smelling Foods'
];
```

**Key Features**:
- Interactive calendar for blocking dates
- Range selection mode and individual date selection mode
- "Load Common" button for popular house rules
- Link to standard cancellation policy

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section5Rules.tsx`

---

### Section 6: Photos (`Section6Photos.tsx`)

**Purpose**: Upload and manage property photos

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photos` | PhotoData[] | Yes | Array of photo objects |
| `minRequired` | number | Yes | Minimum photos (default 3) |

**PhotoData Structure**:
```typescript
interface PhotoData {
  id: string;           // Unique identifier
  url: string;          // Data URL (base64) or remote URL
  file?: File;          // Original File object (for upload)
  caption?: string;     // Optional caption
  displayOrder: number; // Sort order (0 = cover photo)
}
```

**Key Features**:
- File input accepts images (JPG, PNG, HEIC)
- Drag-and-drop reordering
- First photo automatically marked as cover
- Progress indicator showing X of Y minimum
- Mobile upload continuation option

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section6Photos.tsx`

---

### Section 7: Review (`Section7Review.tsx`)

**Purpose**: Final review and submission

**Fields** (ReviewData):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `safetyFeatures` | string[] | No | Selected safety features |
| `squareFootage` | number | No | Property size in sq ft |
| `firstDayAvailable` | string | No | ISO date string |
| `previousReviewsLink` | string | No | Link to external reviews |
| `agreedToTerms` | boolean | No | Terms agreement |
| `optionalNotes` | string | No | Additional notes |

**Safety Features Constants**:
```typescript
const SAFETY_FEATURES = [
  'Smoke Detector', 'Carbon Monoxide Detector', 'Fire Extinguisher',
  'First Aid Kit', 'Security Camera', 'Deadbolt Lock',
  'Window Locks', 'Safe', 'Emergency Exit', 'Alarm System'
];
```

**Key Features**:
- Collapsible summary cards for each section
- "Edit Section" buttons navigate back to any section
- Optional details section (safety, square footage, availability)
- Fixed bottom navigation with pulsing submit button
- Submission overlay with spinner

**Services Used**:
- `safetyService.ts` - `getCommonSafetyFeatures()`

**Code Location**: `app/src/islands/pages/SelfListingPage/sections/Section7Review.tsx`

---

## Type Definitions

### Complete Type Reference: `listing.types.ts`

**Location**: `app/src/islands/pages/SelfListingPage/types/listing.types.ts`

```typescript
// Rental Types
type RentalType = 'Nightly' | 'Weekly' | 'Monthly';
type WeeklyPattern = 'One week on, one week off' | 'Two weeks on, two weeks off' | 'One week on, three weeks off';

// Space Types
type SpaceType = 'Private Room' | 'Shared Room' | 'Entire Place';
type KitchenType = 'Full Kitchen' | 'Kitchenette' | 'No Kitchen' | 'Shared Kitchen';
type ParkingType = 'Street Parking' | 'Driveway' | 'Garage' | 'None';

// Policy Types
type CancellationPolicy = 'Standard' | 'Additional Host Restrictions';
type GenderPreference = 'No Preference' | 'Male' | 'Female' | 'Other/Non Defined';

// Night Selection
interface AvailableNights {
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
}

// Address Structure
interface Address {
  fullAddress: string;
  number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  validated: boolean;
}

// Section Data Types
interface SpaceSnapshot {
  listingName: string;
  typeOfSpace: SpaceType;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  typeOfKitchen: KitchenType;
  typeOfParking: ParkingType;
  address: Address;
}

interface Features {
  amenitiesInsideUnit: string[];
  amenitiesOutsideUnit: string[];
  descriptionOfLodging: string;
  neighborhoodDescription: string;
}

interface LeaseStylesConfig {
  rentalType: RentalType;
  availableNights?: AvailableNights;
  weeklyPattern?: WeeklyPattern;
  subsidyAgreement?: boolean;
}

interface NightlyPricing {
  oneNightPrice: number;
  decayPerNight: number;
  fiveNightTotal: number;
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

interface Pricing {
  nightlyPricing?: NightlyPricing;
  weeklyCompensation?: number;
  monthlyCompensation?: number;
  damageDeposit: number;
  maintenanceFee: number;
}

interface Rules {
  cancellationPolicy: CancellationPolicy;
  preferredGender: GenderPreference;
  numberOfGuests: number;
  checkInTime: string;
  checkOutTime: string;
  idealMinDuration: number;
  idealMaxDuration: number;
  houseRules: string[];
  blockedDates: Date[];
}

interface PhotoData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  displayOrder: number;
}

interface Photos {
  photos: PhotoData[];
  minRequired: number;
}

interface ReviewData {
  safetyFeatures: string[];
  squareFootage?: number;
  firstDayAvailable?: string;
  previousReviewsLink?: string;
  agreedToTerms: boolean;
  optionalNotes?: string;
}

// Complete Form Data
interface ListingFormData {
  spaceSnapshot: SpaceSnapshot;
  features: Features;
  leaseStyles: LeaseStylesConfig;
  pricing: Pricing;
  rules: Rules;
  photos: Photos;
  review: ReviewData;
}
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
// Create new listing (Supabase + Bubble sync)
async function createListing(formData) {
  // 1. Insert into listing_trial (Supabase)
  // 2. Sync to Bubble via bubble-proxy
  // 3. Update listing_trial with Bubble _id
  // 4. Sync to listing table
  // Returns: created listing record
}

// Update existing listing
async function updateListing(id, formData)

// Get listing by ID
async function getListingTrialById(id)

// Save draft
async function saveDraft(formData, existingId = null)

// Map form data to database columns
function mapFormDataToDatabase(formData)

// Map database record to form data
function mapDatabaseToFormData(dbRecord)
```

### Amenities Service (`utils/amenitiesService.ts`)

```typescript
// Get pre-set amenities by type
async function getCommonAmenitiesByType(type: string): Promise<string[]>
  // Queries: zat_features_amenity table
  // Filters: 'pre-set?' = true, 'Type - Amenity Categories' = type

// Get common in-unit amenities
async function getCommonInUnitAmenities(): Promise<string[]>
  // Returns amenities where type = 'In Unit'

// Get common building amenities
async function getCommonBuildingAmenities(): Promise<string[]>
  // Returns amenities where type = 'In Building'
```

### Neighborhood Service (`utils/neighborhoodService.ts`)

```typescript
// Get neighborhood by ZIP code
async function getNeighborhoodByZipCode(zipCode: string): Promise<Neighborhood | null>
  // Uses RPC function: get_neighborhood_by_zip
  // Returns: { neighborhood_name, description, zips }

// Extract ZIP from address string
function extractZipCode(address: string): string
  // Regex: /\b(\d{5})(-\d{4})?\b/
```

### Safety Service (`utils/safetyService.ts`)

```typescript
// Get common safety features
async function getCommonSafetyFeatures(): Promise<string[]>
  // Queries: zfut_safetyfeatures table
  // Filters: 'pre-set?' = true
```

---

## Data Flow

### Form Submission Flow

```
1. User clicks "Submit Listing" in Section 7
   |
   v
2. Section7Review.tsx calls onSubmit()
   |
   v
3. SelfListingPage.tsx handleSubmit()
   |
   v
4. prepareListingSubmission.ts transforms data
   |
   v
5. listingService.js createListing()
   |
   +-- Insert into Supabase listing_trial
   |
   +-- Call bubble-proxy Edge Function
   |   |
   |   +-- POST to Bubble API
   |   |
   |   +-- Return Bubble _id
   |
   +-- Update listing_trial with Bubble _id
   |
   +-- Sync to Supabase listing table
   |
   v
6. Redirect to success page or show error
```

### Day Indexing Convention

**CRITICAL**: Two different day indexing systems are used:

| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| **Internal (JS/React)** | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| **Bubble API** | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Conversion in listingService.js**:
```javascript
// Internal -> Bubble (for database storage)
function mapAvailableNightsToArray(availableNights) {
  const dayMapping = {
    sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
    thursday: 5, friday: 6, saturday: 7
  };
  // Returns 1-based array for Bubble
}

// Bubble -> Internal (for form loading)
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
/* Primary brand color */
--primary: #6b46c1;
--primary-hover: #553399;

/* From global variables.css */
--color-primary: #31135d;
--color-primary-hover: #1f0b38;
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.self-listing-page` | Root container |
| `.listing-header` | Sticky header with Save Draft |
| `.navigation-sidebar` | Left sidebar with progress |
| `.progress-circle` | Circular progress indicator |
| `.nav-item` | Section navigation button |
| `.nav-item.active` | Currently active section |
| `.nav-item.completed` | Completed section |
| `.nav-item.locked` | Locked section |
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
| `.calendar-day` | Calendar day cell |
| `.calendar-day.in-range` | Selected date |
| `.calendar-day.blocked` | Already blocked |

### Responsive Breakpoints

```css
/* Desktop: > 1024px - Full side-by-side layout */
/* Tablet: 768px - 1024px - Single column with popup calendar */
/* Mobile: < 768px - Simplified single column */

@media (max-width: 1024px) {
  .listing-container { grid-template-columns: 1fr; }
  .navigation-sidebar { position: static; }
  .block-dates-layout { grid-template-columns: 1fr; }
  /* Calendar becomes popup modal */
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
| `listing_trial` | Primary storage for self-listing submissions |
| `listing` | Main listing table (synced after Bubble) |
| `zat_features_amenity` | Amenity lookup table |
| `zat_geo_hood_mediumlevel` | Neighborhood data |
| `zfut_safetyfeatures` | Safety features lookup |

### Edge Functions Called

| Function | Action | Purpose |
|----------|--------|---------|
| `bubble-proxy` | `sync_listing_to_bubble` | Create listing in Bubble |
| `ai-gateway` | `complete` | Generate AI description |

### Database Column Mapping

Key column names in `listing_trial` / `listing`:

```javascript
{
  // Identity
  '_id': 'Bubble unique ID',
  'id': 'Supabase UUID',

  // Space
  'Name': 'listingName',
  'Features - Type of Space': 'typeOfSpace',
  'Features - Qty Bedrooms': 'bedrooms',
  'Features - Qty Beds': 'beds',
  'Features - Qty Bathrooms': 'bathrooms',
  'Kitchen Type': 'typeOfKitchen',
  'Features - Parking type': 'typeOfParking',

  // Location
  'Location - Address': 'address (JSONB)',
  'Location - City': 'city',
  'Location - State': 'state',
  'Location - Zip Code': 'zip',
  'Location - Coordinates': '{ lat, lng }',
  'neighborhood (manual input by user)': 'neighborhood',

  // Features
  'Features - Amenities In-Unit': '[]',
  'Features - Amenities In-Building': '[]',
  'Description': 'descriptionOfLodging',
  'Description - Neighborhood': 'neighborhoodDescription',

  // Lease Style
  'rental type': 'Nightly | Weekly | Monthly',
  'Days Available (List of Days)': '[1-7] array',

  // Pricing
  '=°Damage Deposit': 'number',
  '=°Cleaning Cost / Maintenance Fee': 'number',
  '=°Weekly Host Rate': 'number',
  '=°Monthly Host Rate': 'number',
  '=°Nightly Host Rate for X nights': 'calculated rates',

  // Rules
  'Cancellation Policy': 'string',
  'Preferred Gender': 'string',
  'Features - Qty Guests': 'number',
  'NEW Date Check-in Time': 'string',
  'NEW Date Check-out Time': 'string',
  'Features - House Rules': '[]',
  'Dates - Blocked': '[]',

  // Photos
  'Features - Photos': '[{ id, url, caption, displayOrder }]',

  // Review
  'Features - Safety': '[]',
  'Features - SQFT Area': 'number',
  ' First Available': 'date string',

  // Status
  'Active': 'boolean (false for new)',
  'Approved': 'boolean (false for new)',
  'Complete': 'boolean'
}
```

---

## Key Patterns

### 1. Section Validation Pattern

Each section implements its own validation:

```typescript
// Section template
const validateForm = (): string[] => {
  const newErrors: Record<string, string> = {};
  const errorOrder: string[] = [];

  // Validate fields
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
      // Merge with existing, deduplicate
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

```typescript
// In useListingStore.ts
useEffect(() => {
  // Debounced auto-save on any form change
  const timer = setTimeout(() => {
    saveDraftToLocal(formData);
  }, 1000);
  return () => clearTimeout(timer);
}, [formData]);
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
  formData?: ListingFormData;
}
```

---

## Common Modifications

### Adding a New Field to a Section

1. **Update types** in `listing.types.ts`
2. **Add field** to section component JSX
3. **Add validation** if required
4. **Update store** initial state
5. **Update mapping** in `listingService.js` for database storage

### Adding a New Amenity/House Rule

1. Edit constants in `listing.types.ts`:
```typescript
const AMENITIES_INSIDE = [
  // ... existing
  'New Amenity',
];
```

### Modifying Pricing Slider

The `NightlyPriceSlider` uses Shadow DOM for style isolation. Key parameters:
- `initialP1`: Starting 1-night price
- `initialDecay`: Decay factor (0.7-1.0)
- `onPricesChange`: Callback with calculated prices

Location: `app/src/islands/pages/SelfListingPage/components/NightlyPriceSlider.tsx`

### Changing Minimum Photo Requirement

In `SelfListingPage.tsx` initial state:
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
4. Add section to store initial state
5. Add navigation item in `SelfListingPage.tsx`
6. Update section count and progress calculation

---

## Debugging Tips

### Common Issues

1. **Address not validating**: Check Google Maps API key in `.env`
2. **AI description failing**: Check ai-gateway Edge Function logs
3. **Photos not uploading**: Check file size limits, valid image types
4. **Submission failing**: Check Supabase and Bubble API credentials
5. **Draft not loading**: Clear localStorage `selfListingDraft` key

### Console Logging

Key log prefixes to search for:
- `[ListingService]` - Database operations
- `[aiService]` - AI generation
- `[Section2Features]` - Features section
- `Supabase response` - Direct Supabase queries

### LocalStorage Keys

- `selfListingDraft` - Complete form draft data

---

## Related Documentation

- [App CLAUDE.md](../../app/CLAUDE.md) - Frontend architecture overview
- [Logic CLAUDE.md](../../app/src/logic/CLAUDE.md) - Four-layer logic system
- [Supabase CLAUDE.md](../../supabase/CLAUDE.md) - Edge Functions documentation
- [DATABASE_SCHEMA_OVERVIEW.md](../../DATABASE_SCHEMA_OVERVIEW.md) - Table schemas
- [HostScheduleSelector](../../app/src/islands/shared/HostScheduleSelector/) - Night selector component

---

## Important File Locations

| Resource | Path |
|----------|------|
| Main Component | `app/src/islands/pages/SelfListingPage/SelfListingPage.tsx` |
| Type Definitions | `app/src/islands/pages/SelfListingPage/types/listing.types.ts` |
| Zustand Store | `app/src/islands/pages/SelfListingPage/store/useListingStore.ts` |
| localStorage Helper | `app/src/islands/pages/SelfListingPage/store/listingLocalStore.ts` |
| Database Service | `app/src/lib/listingService.js` |
| AI Service | `app/src/lib/aiService.js` |
| CSS Styles | `app/src/islands/pages/SelfListingPage/styles/SelfListingPage.css` |
| Entry Point | `app/src/self-listing.jsx` |
| HTML Page | `app/public/self-listing.html` |

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Complete Quick Reference Guide
