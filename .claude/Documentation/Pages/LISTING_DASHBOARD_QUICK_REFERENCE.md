# Listing Dashboard Page - Quick Reference

**GENERATED**: 2025-12-11
**PAGE_URL**: `/listing-dashboard?id={listingId}`
**ENTRY_POINT**: `app/src/listing-dashboard.jsx`

---

## ARCHITECTURE_OVERVIEW

```
listing-dashboard.jsx (Entry Point)
    |
    +-- ListingDashboardPage.jsx (Hollow Component)
            |
            +-- useListingDashboardPageLogic.js (Business Logic Hook)
            |       +-- URL parsing for listing ID (supports 'id' and 'listing_id')
            |       +-- Listing data fetching from Supabase (listing_trial or listing tables)
            |       +-- Lookup table resolution (amenities, safety, rules, etc.)
            |       +-- Tab state management
            |       +-- Edit modal state management
            |       +-- Photo management handlers (set cover, delete, reorder)
            |       +-- AI Import Assistant integration
            |       +-- Schedule Cohost modal handlers
            |       +-- Import Reviews modal handlers
            |       +-- Blocked dates management
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- NavigationHeader.jsx (Tab navigation)
                |       +-- 4 conditional tabs (All Listings, Proposals, VMs, Leases)
                |       +-- Back button
                +-- AlertBanner.jsx (Schedule Cohost CTA)
                +-- ActionCardGrid.jsx (6-card grid)
                |       +-- ActionCard.jsx (clickable cards)
                +-- SecondaryActions.jsx (AI Import button)
                +-- PropertyInfoSection.jsx (Title & import reviews)
                +-- DescriptionSection.jsx (Lodging & neighborhood)
                +-- AmenitiesSection.jsx (In-unit & building amenities)
                +-- DetailsSection.jsx (Type, parking, kitchen, storage)
                +-- PricingSection.jsx (Lease style, pricing, fees)
                |       +-- HostScheduleSelector (nights available)
                |       +-- NightlyPricingLegend
                +-- RulesSection.jsx (House rules)
                +-- AvailabilitySection.jsx (Calendar & blocked dates)
                +-- PhotosSection.jsx (Drag-and-drop photos)
                +-- CancellationPolicySection.jsx (Policy dropdown)
                +-- Footer.jsx (Site footer)
            |
            +-- Modals
                +-- EditListingDetails (Multi-section edit modal)
                +-- PricingEditSection (Full-screen pricing edit overlay)
                +-- ScheduleCohost (Co-host request modal)
                +-- ImportListingReviewsModal (Reviews import request)
                +-- AIImportAssistantModal (AI content generation)
```

---

## FILE_INVENTORY

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/listing-dashboard.jsx` | Mounts ListingDashboardPage to #root |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx` | Main hollow component |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Core business logic hook (1300+ lines) |
| `app/src/islands/pages/ListingDashboardPage/index.js` | Barrel export |
| `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` | Component documentation |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/components/NavigationHeader.jsx` | Tab navigation with conditional badges |
| `app/src/islands/pages/ListingDashboardPage/components/ActionCard.jsx` | Reusable action card button |
| `app/src/islands/pages/ListingDashboardPage/components/ActionCardGrid.jsx` | 6-card quick actions grid |
| `app/src/islands/pages/ListingDashboardPage/components/AlertBanner.jsx` | Schedule Cohost CTA banner |
| `app/src/islands/pages/ListingDashboardPage/components/SecondaryActions.jsx` | AI Import Assistant button |
| `app/src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx` | Property name & import reviews |
| `app/src/islands/pages/ListingDashboardPage/components/DescriptionSection.jsx` | Lodging & neighborhood descriptions |
| `app/src/islands/pages/ListingDashboardPage/components/AmenitiesSection.jsx` | In-unit & building amenities |
| `app/src/islands/pages/ListingDashboardPage/components/DetailsSection.jsx` | Features display (type, parking, kitchen, storage) |
| `app/src/islands/pages/ListingDashboardPage/components/PricingSection.jsx` | Pricing, lease style, HostScheduleSelector |
| `app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx` | Full-screen pricing edit overlay |
| `app/src/islands/pages/ListingDashboardPage/components/NightlyPricingLegend.jsx` | Nightly pricing legend component |
| `app/src/islands/pages/ListingDashboardPage/components/RulesSection.jsx` | House rules display |
| `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx` | Calendar & blocked dates management |
| `app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx` | Drag-and-drop photo management |
| `app/src/islands/pages/ListingDashboardPage/components/CancellationPolicySection.jsx` | Cancellation policy dropdown |
| `app/src/islands/pages/ListingDashboardPage/components/index.js` | Component barrel exports |

### Shared Components Used
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site navigation header |
| `app/src/islands/shared/Footer.jsx` | Site footer |
| `app/src/islands/shared/EditListingDetails/EditListingDetails.jsx` | Multi-section edit modal |
| `app/src/islands/shared/ScheduleCohost.jsx` | Co-host scheduling modal |
| `app/src/islands/shared/ImportListingReviewsModal.jsx` | Reviews import request modal |
| `app/src/islands/shared/AIImportAssistantModal.jsx` | AI content generation modal |
| `app/src/islands/shared/HostScheduleSelector.jsx` | Nights available selector |

### Types & Data
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/types/listing.types.ts` | TypeScript interfaces |
| `app/src/islands/pages/ListingDashboardPage/data/mockListing.js` | Mock data (legacy, not used in production) |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/listing-dashboard.css` | Complete page styling |

### HTML
| File | Purpose |
|------|---------|
| `app/public/listing-dashboard.html` | HTML entry point with DM Sans font |

---

## URL_ROUTING

```
/listing-dashboard?id={listingId}       # Specific listing by ID (UUID or Bubble ID)
/listing-dashboard?listing_id={id}      # Alternative param name
```

### URL Parser Functions
```javascript
// In useListingDashboardPageLogic.js
const getListingIdFromUrl = useCallback(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('listing_id');
}, []);
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/listing-dashboard',
  file: 'listing-dashboard.html',
  aliases: ['/listing-dashboard.html'],
  protected: true,
  cloudflareInternal: false,
  hasDynamicSegment: false,
  internalName: 'listing-dashboard-view',
}
```

---

## TAB_NAVIGATION

### Tab Types
```typescript
type TabType = 'all-listings' | 'proposals' | 'virtual-meetings' | 'leases';
```

### Tabs Configuration (`NavigationHeader.jsx`)
| Tab ID | Label | Icon | Badge | Visible |
|--------|-------|------|-------|---------|
| `all-listings` | All My Listings | ListIcon | - | Always |
| `proposals` | Proposals | FileTextIcon | counts.proposals | Only if count > 0 |
| `virtual-meetings` | Virtual Meetings | CalendarIcon | counts.virtualMeetings | Only if count > 0 |
| `leases` | Leases | FileCheckIcon | counts.leases | Only if count > 0 |

### Tab Click Behavior
```javascript
const handleTabClick = (tabId) => {
  if (tabId === 'all-listings') {
    window.location.href = '/host-overview';
  } else {
    onTabChange(tabId);
  }
};
```

---

## DATA_FETCHING

### Dual-Table Support
The hook supports fetching from both `listing_trial` (new self-listing submissions) and `listing` (Bubble-synced listings):

```javascript
// Try listing_trial first (by id column), then fall back to listing table (by _id column)
const trialResult = await supabase
  .from('listing_trial')
  .select('*')
  .eq('id', listingId)
  .maybeSingle();

if (!trialResult.data) {
  const listingResult = await supabase
    .from('listing')
    .select('*')
    .eq('_id', listingId)
    .maybeSingle();
}
```

### Lookup Tables Fetched
```javascript
async function fetchLookupTables() {
  // Fetches from:
  // - zat_features_amenity (amenities)
  // - zfut_safetyfeatures (safety features)
  // - zat_features_houserule (house rules)
  // - zat_features_listingtype (listing types)
  // - zat_features_parkingoptions (parking options)
  // - zat_features_storageoptions (storage options)
}
```

### Related Data Queries
```javascript
const [lookups, photosResult, proposalsResult, leasesResult, meetingsResult] = await Promise.all([
  fetchLookupTables(),
  supabase.from('listing_photo').select('*').eq('Listing', listingId),
  supabase.from('proposal').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
  supabase.from('bookings_leases').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
  supabase.from('virtualmeetingschedulesandlinks').select('*', { count: 'exact', head: true }).eq('Listing', listingId),
]);
```

---

## DATA_TRANSFORMATION

### Transformed Listing Structure
```javascript
{
  id: string,                    // listing_trial: 'id', listing: '_id'
  _id: string,                   // Alias for compatibility

  // Property Info
  title: string,
  description: string,
  descriptionNeighborhood: string,

  // Raw DB fields (for EditListingDetails compatibility)
  Name: string,
  Description: string,
  'Description - Neighborhood': string,
  // ... other raw field mappings

  // Location
  location: {
    id: string,
    address: string,
    hoodsDisplay: string,
    city: string,
    state: string,
    zipCode: string,
    latitude: number | null,
    longitude: number | null,
  },

  // Status
  status: 'Online' | 'Offline',
  isOnline: boolean,
  createdAt: Date | null,
  activeSince: Date | null,

  // Features
  features: {
    typeOfSpace: { id: string, label: string },
    parkingType: { id: string, label: string },
    kitchenType: { id: string, display: string },
    storageType: { id: string, label: string },
    qtyGuests: number,
    bedrooms: number,
    bathrooms: number,
    squareFootage: number,
    squareFootageRoom: number,
  },

  // Amenities (resolved from lookup tables)
  inUnitAmenities: Array<{ id: string, name: string, icon: string | null }>,
  buildingAmenities: Array<{ id: string, name: string, icon: string | null }>,
  safetyFeatures: Array<{ id: string, name: string, icon: string | null }>,
  houseRules: Array<{ id: string, name: string, icon: string | null }>,

  // Pricing
  leaseStyle: 'Nightly' | 'Monthly' | string,
  nightsPerWeekMin: number,
  nightsPerWeekMax: number,
  nightsAvailable: string[],     // ['monday', 'tuesday', ...] for HostScheduleSelector
  availableDays: number[],       // [0, 1, 2, ...] JS day indices
  pricing: {
    2: number, 3: number, 4: number, 5: number, 6: number, 7: number
  },
  weeklyCompensation: {
    2: number, 3: number, 4: number, 5: number, 6: number, 7: number
  },
  damageDeposit: number,
  maintenanceFee: number,
  monthlyHostRate: number,

  // Availability
  leaseTermMin: number,
  leaseTermMax: number,
  earliestAvailableDate: Date,
  checkInTime: string,
  checkOutTime: string,
  blockedDates: string[],        // ['2025-01-15', '2025-01-16', ...]

  // Photos
  photos: Array<{
    id: string,
    url: string,
    isCover: boolean,
    photoType: string,
  }>,

  // Other
  cancellationPolicy: string,
  virtualTourUrl: string | null,
  preferredGender: { id: string, display: string },
  maxGuests: number,
}
```

---

## STATE_MANAGEMENT

### Hook State (`useListingDashboardPageLogic.js`)
```javascript
// Core state
const [activeTab, setActiveTab] = useState('manage');
const [listing, setListing] = useState(null);
const [counts, setCounts] = useState({ proposals: 0, virtualMeetings: 0, leases: 0 });
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

// Edit modal state
const [editSection, setEditSection] = useState(null); // null or section name

// Schedule Cohost
const [showScheduleCohost, setShowScheduleCohost] = useState(false);
const [currentUser, setCurrentUser] = useState(null);

// Import Reviews
const [showImportReviews, setShowImportReviews] = useState(false);
const [isImportingReviews, setIsImportingReviews] = useState(false);

// AI Import Assistant
const [showAIImportAssistant, setShowAIImportAssistant] = useState(false);
const [aiGenerationStatus, setAiGenerationStatus] = useState({...});
const [isAIGenerating, setIsAIGenerating] = useState(false);
const [isAIComplete, setIsAIComplete] = useState(false);
const [aiGeneratedData, setAiGeneratedData] = useState({});
```

### Hook Return Value
```javascript
return {
  // State
  activeTab, listing, counts, isLoading, error, editSection,
  showScheduleCohost, showImportReviews, currentUser,

  // Core handlers
  handleTabChange, handleCardClick, handleBackClick,
  handleDescriptionChange, handleCancellationPolicyChange,
  handleCopyLink, handleAIAssistant,

  // Schedule Cohost
  handleScheduleCohost, handleCloseScheduleCohost, handleCohostRequestSubmitted,

  // Import Reviews
  handleImportReviews, handleCloseImportReviews, handleSubmitImportReviews, isImportingReviews,

  // AI Import Assistant
  showAIImportAssistant, handleCloseAIImportAssistant, handleAIImportComplete,
  handleStartAIGeneration, aiGenerationStatus, isAIGenerating, isAIComplete, aiGeneratedData,

  // Photo management
  handleSetCoverPhoto, handleDeletePhoto, handleReorderPhotos,

  // Edit modal
  handleEditSection, handleCloseEdit, handleSaveEdit, updateListing,

  // Blocked dates
  handleBlockedDatesChange,
};
```

---

## EDIT_SECTIONS

### Available Edit Sections
| Section | Modal Type | Fields Edited |
|---------|------------|---------------|
| `name` | EditListingDetails | Listing name/title |
| `description` | EditListingDetails | Lodging description |
| `neighborhood` | EditListingDetails | Neighborhood description |
| `amenities` | EditListingDetails | In-unit & building amenities |
| `details` | EditListingDetails | Type of space, bedrooms, bathrooms, kitchen, parking, storage |
| `pricing` | PricingEditSection | Lease style, nightly rates, fees, nights available |
| `rules` | EditListingDetails | House rules |
| `availability` | EditListingDetails | Lease term, first available, check-in/out times |
| `photos` | EditListingDetails | Photo upload |

---

## AI_IMPORT_ASSISTANT

### Generation Status Fields
```javascript
{
  name: 'pending' | 'loading' | 'complete',
  description: 'pending' | 'loading' | 'complete',
  neighborhood: 'pending' | 'loading' | 'complete',
  inUnitAmenities: 'pending' | 'loading' | 'complete',
  buildingAmenities: 'pending' | 'loading' | 'complete',
  houseRules: 'pending' | 'loading' | 'complete',
  safetyFeatures: 'pending' | 'loading' | 'complete',
}
```

### Generation Order (Two Phases)
**Phase 1 - Load Common Features:**
1. In-Unit Amenities (from `getCommonInUnitAmenities`)
2. Building Amenities (from `getCommonBuildingAmenities`)
3. Neighborhood Description (from `getNeighborhoodByZipCode`)
4. House Rules (from `getCommonHouseRules`)
5. Safety Features (from `getCommonSafetyFeatures`)

**Phase 2 - Generate AI Content (with enriched data):**
6. Description (via `generateListingDescription`)
7. Listing Name (via `generateListingTitle`)

---

## PHOTO_MANAGEMENT

### PhotosSection Features
- Drag-and-drop reordering
- Set cover photo (first photo is always cover)
- Delete photos (soft delete in DB)
- Photo type selection dropdown

### Photo Types
```javascript
const PHOTO_TYPES = [
  'Dining Room', 'Bathroom', 'Bedroom', 'Kitchen',
  'Living Room', 'Workspace', 'Other'
];
```

### Photo Persistence
- **listing_trial**: Photos stored inline in `Features - Photos` JSON column
- **listing**: Photos stored in `listing_photo` table

---

## AVAILABILITY_CALENDAR

### Calendar Features
- Interactive date blocking/unblocking
- Range selection mode (click two dates)
- Individual date selection mode
- Visual display of blocked dates
- Legend (Restricted Weekly, Blocked Manually, Available, First Available)

### Blocked Dates Storage
```javascript
// Stored as array of date strings: ['2025-01-15', '2025-01-16', ...]
// Persisted to 'Dates - Blocked' column as JSON
```

---

## CSS_CLASS_REFERENCE

### Main Container
| Class | Purpose |
|-------|---------|
| `.listing-dashboard` | Page wrapper with min-height and background |
| `.listing-dashboard__container` | Max-width container (1280px) |
| `.listing-dashboard__card` | White card with rounded corners |
| `.listing-dashboard__loading` | Loading state container |
| `.listing-dashboard__error` | Error state container |
| `.listing-dashboard__not-found` | Not found state container |

### Section Pattern
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-section` | Generic section container |
| `.listing-dashboard-section__header` | Section header (title + edit button) |
| `.listing-dashboard-section__title` | Section heading |
| `.listing-dashboard-section__edit` | Edit button |
| `.listing-dashboard-section__add-btn` | Add button (e.g., Add Photos) |

### Navigation Header
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-nav` | Navigation container |
| `.listing-dashboard-nav__back` | Back button container |
| `.listing-dashboard-nav__back-btn` | Back button style |
| `.listing-dashboard-nav__tabs` | Tab buttons container |
| `.listing-dashboard-nav__tab` | Individual tab button |
| `.listing-dashboard-nav__tab--active` | Active tab state |
| `.listing-dashboard-nav__badge` | Notification badge |

### Pricing Section
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-pricing` | Pricing section container |
| `.listing-dashboard-pricing__left` | Left column (lease style info) |
| `.listing-dashboard-pricing__right` | Right column (pricing info) |
| `.listing-dashboard-pricing__days` | Nights/week selector area |
| `.listing-dashboard-pricing__legend` | Availability legend |

### Availability Section
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-availability` | Availability container |
| `.listing-dashboard-availability__calendar-container` | Calendar + instructions layout |
| `.listing-dashboard-availability__calendar` | Calendar widget |
| `.listing-dashboard-availability__calendar-header` | Month navigation |
| `.listing-dashboard-availability__calendar-grid` | Date grid |
| `.listing-dashboard-availability__calendar-day` | Individual day cell |
| `.listing-dashboard-availability__calendar-day--blocked` | Blocked day styling |
| `.listing-dashboard-availability__calendar-day--selectable` | Clickable day |

### Photos Section
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-photos__grid` | Photos grid layout |
| `.listing-dashboard-photos__card` | Individual photo card |
| `.listing-dashboard-photos__card--dragging` | Currently dragged card |
| `.listing-dashboard-photos__card--drag-over` | Drop target card |
| `.listing-dashboard-photos__image-container` | Image wrapper |
| `.listing-dashboard-photos__cover-badge` | Cover photo indicator |
| `.listing-dashboard-photos__actions` | Action buttons container |
| `.listing-dashboard-photos__star-btn` | Set cover button |
| `.listing-dashboard-photos__delete-btn` | Delete button |

---

## CSS_VARIABLES

```css
:root {
  --ld-primary-contrast: #f1ffff;    /* Light cyan for tabs */
  --ld-success: #31135d;              /* Deep purple (active states) */
  --ld-background: #f7f8f9;           /* Page background */
  --ld-text-primary: #1c274c;         /* Primary text color */
  --ld-text-secondary: #6b7280;       /* Secondary text color */
  --ld-accent-purple: #6b4fbb;        /* Accent purple */
  --ld-border-color: #e5e7eb;         /* Border color */
  --ld-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);  /* Card shadow */
}
```

---

## COMPONENT_PROPS

### ListingDashboardPage (Main)
No external props - self-contained with hook.

### NavigationHeader
```jsx
<NavigationHeader
  activeTab={activeTab}
  onTabChange={handleTabChange}
  counts={counts}
  onBackClick={handleBackClick}
/>
```

### AlertBanner
```jsx
<AlertBanner onScheduleCohost={handleScheduleCohost} />
```

### ActionCardGrid
```jsx
<ActionCardGrid counts={counts} onCardClick={handleCardClick} />
```

### SecondaryActions
```jsx
<SecondaryActions onAIAssistant={handleAIAssistant} />
```

### PropertyInfoSection
```jsx
<PropertyInfoSection
  listing={listing}
  onImportReviews={handleImportReviews}
  onEdit={() => handleEditSection('name')}
/>
```

### DescriptionSection
```jsx
<DescriptionSection
  listing={listing}
  onEditLodging={() => handleEditSection('description')}
  onEditNeighborhood={() => handleEditSection('neighborhood')}
/>
```

### AmenitiesSection
```jsx
<AmenitiesSection
  listing={listing}
  onEdit={() => handleEditSection('amenities')}
/>
```

### DetailsSection
```jsx
<DetailsSection
  listing={listing}
  onEdit={() => handleEditSection('details')}
/>
```

### PricingSection
```jsx
<PricingSection
  listing={listing}
  onEdit={() => handleEditSection('pricing')}
/>
```

### RulesSection
```jsx
<RulesSection
  listing={listing}
  onEdit={() => handleEditSection('rules')}
/>
```

### AvailabilitySection
```jsx
<AvailabilitySection
  listing={listing}
  onEdit={() => handleEditSection('availability')}
  onBlockedDatesChange={handleBlockedDatesChange}
/>
```

### PhotosSection
```jsx
<PhotosSection
  listing={listing}
  onAddPhotos={() => handleEditSection('photos')}
  onDeletePhoto={handleDeletePhoto}
  onSetCover={handleSetCoverPhoto}
  onReorderPhotos={handleReorderPhotos}
/>
```

### CancellationPolicySection
```jsx
<CancellationPolicySection
  listing={listing}
  onPolicyChange={handleCancellationPolicyChange}
/>
```

---

## LOADING_STATES

### Loading State
```jsx
{isLoading && (
  <div className="listing-dashboard__loading">
    <p>Loading listing...</p>
  </div>
)}
```

### Error State
```jsx
{error && (
  <div className="listing-dashboard__error">
    <p>Error: {error}</p>
    <button onClick={() => (window.location.href = '/host-overview')}>
      Go to My Listings
    </button>
  </div>
)}
```

### Not Found State
```jsx
{!listing && (
  <div className="listing-dashboard__not-found">
    <p>Listing not found</p>
    <button onClick={() => (window.location.href = '/host-dashboard')}>
      Back to Dashboard
    </button>
  </div>
)}
```

---

## NAVIGATION_PATTERNS

### Back to All Listings
```javascript
const handleBackClick = useCallback(() => {
  window.location.href = '/host-dashboard';
}, []);
```

### Preview Listing
```javascript
window.open(`/preview-split-lease.html?id=${listing.id}`, '_blank');
```

### All My Listings Tab
```javascript
window.location.href = '/host-overview';
```

---

## DATABASE_UPDATE_PATTERN

### updateListing Function
```javascript
const updateListing = useCallback(async (listingId, updates) => {
  // Check if listing_trial or listing table
  const { data: trialCheck } = await supabase
    .from('listing_trial')
    .select('id')
    .eq('id', listingId)
    .maybeSingle();

  const tableName = trialCheck ? 'listing_trial' : 'listing';
  const idColumn = trialCheck ? 'id' : '_id';

  // Field mapping for quirky column names
  const fieldMapping = {
    'First Available': ' First Available', // DB column has leading space
  };

  const { data, error } = await supabase
    .from(tableName)
    .update(dbUpdates)
    .eq(idColumn, listingId)
    .select()
    .single();
}, []);
```

---

## KEY_IMPORTS

```javascript
// Page component
import ListingDashboardPage from './islands/pages/ListingDashboardPage';

// Hook
import useListingDashboardPageLogic from './islands/pages/ListingDashboardPage/useListingDashboardPageLogic';

// Components
import {
  NavigationHeader,
  ActionCardGrid,
  AlertBanner,
  SecondaryActions,
  PropertyInfoSection,
  DescriptionSection,
  AmenitiesSection,
  DetailsSection,
  PricingSection,
  PricingEditSection,
  RulesSection,
  AvailabilitySection,
  PhotosSection,
  CancellationPolicySection,
} from './components';

// Shared components
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { EditListingDetails } from '../../shared/EditListingDetails/EditListingDetails';
import ScheduleCohost from '../../shared/ScheduleCohost';
import ImportListingReviewsModal from '../../shared/ImportListingReviewsModal';
import AIImportAssistantModal from '../../shared/AIImportAssistantModal';

// Services
import { generateListingDescription, generateListingTitle } from '../../../lib/aiService';
import { getCommonHouseRules } from '../../shared/EditListingDetails/services/houseRulesService';
import { getCommonSafetyFeatures } from '../../shared/EditListingDetails/services/safetyFeaturesService';
import { getCommonInUnitAmenities, getCommonBuildingAmenities } from '../../shared/EditListingDetails/services/amenitiesService';
import { getNeighborhoodByZipCode } from '../../shared/EditListingDetails/services/neighborhoodService';

// Styles
import '../../../styles/components/listing-dashboard.css';
```

---

## INLINE_SVG_ICONS

The page uses inline SVG icons:

| Component | Icons |
|-----------|-------|
| NavigationHeader | ArrowLeftIcon, ListIcon, FileTextIcon, CalendarIcon, FileCheckIcon |
| ActionCardGrid | EyeIcon, LinkIcon, FileTextIcon, CalendarIcon, SettingsIcon, FileCheckIcon |
| AvailabilitySection | ChevronLeftIcon, ChevronRightIcon |
| PhotosSection | StarIcon, TrashIcon, DragHandleIcon |

---

## TROUBLESHOOTING

| Issue | Check |
|-------|-------|
| Page shows loading forever | Check Supabase connection, verify listing ID exists in DB |
| Listing not found | Check if ID is in listing_trial (UUID) or listing (_id Bubble format) |
| Tabs not showing | Verify counts object - tabs only show when count > 0 |
| Edit modal not opening | Check editSection state and handleEditSection handler |
| Photos not displaying | Check photo URL format and image URL construction |
| Blocked dates not saving | Verify onBlockedDatesChange prop is connected |
| AI generation failing | Check aiService imports and Supabase Edge Function |
| Styling broken | Verify CSS import in ListingDashboardPage.jsx |

---

## RELATED_FILES

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Component CLAUDE.md | `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Routing Guide | `.claude/Documentation/Routing/ROUTING_GUIDE.md` |
| Route Registry | `app/src/routes.config.js` |
| Host Overview Page | `app/src/islands/pages/HostOverviewPage/` |
| EditListingDetails | `app/src/islands/shared/EditListingDetails/` |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Production (fetches from Supabase, dual-table support: listing_trial and listing)
