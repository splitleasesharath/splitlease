# Listing Dashboard Page - Complete Context Documentation

**SOURCE**: React Implementation (`app/src/islands/pages/ListingDashboardPage/`)
**UPDATED**: December 11, 2025
**STATUS**: Production-Ready (fetches from Supabase database)

---

## Page Overview

The Listing Dashboard is a **host-facing page** for managing individual property listings. It displays comprehensive information about a listing and provides edit capabilities for each section.

**URL Pattern**: `/listing-dashboard?id={listing_id}` or `/listing-dashboard?listing_id={listing_id}`
**Entry Point**: `app/src/listing-dashboard.jsx`
**Main Component**: `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx`

---

## Architecture

### Component Pattern: Hollow Component

The page follows the **Hollow Component Pattern** where all business logic is delegated to a custom hook:

```jsx
// ListingDashboardPage.jsx - Pure rendering, no business logic
export default function ListingDashboardPage() {
  const {
    listing,
    counts,
    isLoading,
    error,
    handleEditSection,
    // ... all state and handlers from hook
  } = useListingDashboardPageLogic();

  return (/* JSX */);
}
```

### File Structure

```
ListingDashboardPage/
├── ListingDashboardPage.jsx         # Main page component
├── useListingDashboardPageLogic.js  # Business logic hook (1300+ lines)
├── index.js                         # Barrel export
├── CLAUDE.md                        # Component documentation
├── components/
│   ├── index.js                     # Barrel exports
│   ├── NavigationHeader.jsx         # Tab navigation with badges
│   ├── ActionCard.jsx               # Reusable action card
│   ├── ActionCardGrid.jsx           # Quick actions grid
│   ├── AlertBanner.jsx              # Dismissible info banner
│   ├── SecondaryActions.jsx         # AI Assistant button
│   ├── PropertyInfoSection.jsx      # Title, address, status
│   ├── DescriptionSection.jsx       # Lodging & neighborhood descriptions
│   ├── AmenitiesSection.jsx         # In-unit & building amenities
│   ├── DetailsSection.jsx           # Property specs & safety features
│   ├── PricingSection.jsx           # Lease style, pricing, fees
│   ├── PricingEditSection.jsx       # Full-screen pricing editor
│   ├── NightlyPricingLegend.jsx     # Pricing tier display
│   ├── RulesSection.jsx             # House rules & guest restrictions
│   ├── AvailabilitySection.jsx      # Lease terms, dates, calendar
│   ├── PhotosSection.jsx            # Photo grid with drag-drop
│   └── CancellationPolicySection.jsx # Policy selector
├── data/
│   └── mockListing.js               # Mock data (deprecated)
└── types/
    └── listing.types.ts             # TypeScript interfaces
```

---

## 1. NAVIGATION HEADER

### NavigationHeader Component
**File**: `components/NavigationHeader.jsx`

**Features**:
- Back button ("All Listings") - navigates to `/host-overview`
- Tab navigation with dynamic visibility based on counts:
  - "All My Listings" - always visible
  - "Proposals" - visible when `counts.proposals > 0`, shows badge
  - "Virtual Meetings" - visible when `counts.virtualMeetings > 0`, shows badge
  - "Leases" - visible when `counts.leases > 0`, shows badge
- Active tab styling

**Props**:
```typescript
interface NavigationHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { proposals: number; virtualMeetings: number; leases: number };
  onBackClick: () => void;
}
```

---

## 2. ALERT BANNER

### AlertBanner Component
**File**: `components/AlertBanner.jsx`

**Features**:
- Purple info banner with CTA
- Text: "Need help setting up? Ask a Specialist Co-host!"
- Dismissible (X button)
- Opens Schedule Cohost modal on click

**Props**:
```typescript
interface AlertBannerProps {
  onScheduleCohost: () => void;
}
```

---

## 3. ACTION CARD GRID

### ActionCardGrid Component
**File**: `components/ActionCardGrid.jsx`

**Features**:
- Responsive grid of quick action cards
- Cards with conditional visibility:
  - "Preview Listing" - always visible
  - "Copy Listing Link" - always visible
  - "Proposals" - visible when `counts.proposals > 0`
  - "Virtual Meetings" - visible when `counts.virtualMeetings > 0`
  - "Manage Listing" - always visible
  - "Leases" - visible when `counts.leases > 0`
- Each card has icon + label
- Badge indicator for items with counts

**Props**:
```typescript
interface ActionCardGridProps {
  counts: { proposals: number; virtualMeetings: number; leases: number };
  onCardClick: (cardId: string) => void;
}
```

---

## 4. SECONDARY ACTIONS

### SecondaryActions Component
**File**: `components/SecondaryActions.jsx`

**Features**:
- AI Import Assistant button - opens modal to auto-generate listing content
- Additional utility actions

**Props**:
```typescript
interface SecondaryActionsProps {
  onAIAssistant: () => void;
}
```

---

## 5. PROPERTY INFO SECTION

### PropertyInfoSection Component
**File**: `components/PropertyInfoSection.jsx`

**Features**:
- Listing title display with edit button
- Import reviews button (opens modal)
- Address display with neighborhood
- Status indicator (Online/Offline with color coding)
- Active since date
- "Show my reviews" button

**Props**:
```typescript
interface PropertyInfoSectionProps {
  listing: Listing;
  onImportReviews: () => void;
  onEdit: () => void;
}
```

**Data Displayed**:
- `listing.title` - Property title
- `listing.location.address` - Full address
- `listing.location.hoodsDisplay` - Neighborhood
- `listing.isOnline` - Status indicator
- `listing.activeSince` - Date formatted

---

## 6. DESCRIPTION SECTION

### DescriptionSection Component
**File**: `components/DescriptionSection.jsx`

**Features**:
- Two subsections with individual edit buttons:
  1. "Description of Lodging" - property description
  2. "Neighborhood Description" - area description
- Plain text display

**Props**:
```typescript
interface DescriptionSectionProps {
  listing: Listing;
  onEditLodging: () => void;
  onEditNeighborhood: () => void;
}
```

---

## 7. AMENITIES SECTION

### AmenitiesSection Component
**File**: `components/AmenitiesSection.jsx`

**Features**:
- Two-column layout:
  1. In-unit amenities (WiFi, TV, Air Conditioned, etc.)
  2. Building/Neighborhood amenities (Doorman, Elevator, etc.)
- Icon mapping for common amenities
- Grid display with icon + label for each amenity

**Props**:
```typescript
interface AmenitiesSectionProps {
  listing: Listing;
  onEdit: () => void;
}
```

**Data Structure**:
```typescript
{
  inUnitAmenities: Array<{ id: string; name: string; icon?: string }>;
  buildingAmenities: Array<{ id: string; name: string; icon?: string }>;
}
```

---

## 8. DETAILS SECTION

### DetailsSection Component
**File**: `components/DetailsSection.jsx`

**Features**:
- Property specs row:
  - Type of Space (Entire Place, Private Room, etc.)
  - Bedrooms count with icon
  - Bathrooms count with icon
  - Square footage with icon
- Additional features row:
  - Storage type with icon
  - Parking type with icon
  - Kitchen type with icon
- Safety features grid with icons

**Props**:
```typescript
interface DetailsSectionProps {
  listing: Listing;
  onEdit: () => void;
}
```

---

## 9. PRICING SECTION

### PricingSection Component
**File**: `components/PricingSection.jsx`

**Features**:
- Left column - Lease style info:
  - Selected lease style (Nightly/Monthly)
  - Nights per week range (for nightly)
  - HostScheduleSelector component (display-only, shows available nights)
- Right column - Pricing info:
  - For monthly: Monthly host rate
  - For nightly: NightlyPricingLegend component with tiered pricing
  - Additional charges (Damage Deposit, Maintenance Fee)
- Edit button opens PricingEditSection full-screen overlay

**Props**:
```typescript
interface PricingSectionProps {
  listing: Listing;
  onEdit: () => void;
}
```

### PricingEditSection Component
**File**: `components/PricingEditSection.jsx`

**Features**:
- Full-screen overlay editor
- Editable pricing tiers
- Night selection
- Save/Cancel functionality

---

## 10. RULES SECTION

### RulesSection Component
**File**: `components/RulesSection.jsx`

**Features**:
- House rules grid with icons:
  - Take Out Trash
  - No Food In Sink
  - Lock Doors
  - Wash Your Dishes
  - No Smoking Inside
  - No Candles
- Guest restrictions:
  - Gender Preferred (with icon)
  - Max guests allowed (with icon)

**Props**:
```typescript
interface RulesSectionProps {
  listing: Listing;
  onEdit: () => void;
}
```

---

## 11. AVAILABILITY SECTION

### AvailabilitySection Component
**File**: `components/AvailabilitySection.jsx`

**Features**:
Two availability sub-sections:

**Settings Section**:
- Lease term range inputs (6-52 weeks)
- Earliest available date picker
- Check-in/Check-out time dropdowns

**Calendar Section**:
- Left side:
  - Instructions text
  - Mode toggle (Range / Individual dates)
  - Range start indicator when selecting
  - List of blocked dates with remove buttons
  - "Show more/less" for long lists
- Right side:
  - Interactive calendar with month navigation
  - Clickable dates for current/future months
  - Visual indicators for blocked dates
  - Legend (Restricted Weekly, Blocked Manually, Available, First Available)

**Props**:
```typescript
interface AvailabilitySectionProps {
  listing: Listing;
  onEdit: () => void;
  onBlockedDatesChange: (dates: string[]) => void;
}
```

**State Management**:
- `blockedDates` - Array of date strings (YYYY-MM-DD format)
- `dateSelectionMode` - 'range' or 'individual'
- `rangeStart` - Date for range selection start
- Changes persist to database via `handleBlockedDatesChange`

---

## 12. PHOTOS SECTION

### PhotosSection Component
**File**: `components/PhotosSection.jsx`

**Features**:
- "Add Photos" button (opens edit modal)
- Drag hint text (when multiple photos)
- Photo grid with drag-and-drop reordering
- Each photo card has:
  - Drag handle icon
  - Image preview (with error handling)
  - Cover Photo badge (first photo)
  - Star button (set as cover)
  - Delete button (trash icon)
  - Photo type dropdown (Bedroom, Kitchen, etc.)
- Empty state with CTA

**Props**:
```typescript
interface PhotosSectionProps {
  listing: Listing;
  onAddPhotos: () => void;
  onDeletePhoto: (photoId: string) => void;
  onSetCover: (photoId: string) => void;
  onReorderPhotos: (fromIndex: number, toIndex: number) => void;
}
```

**Photo Types**:
- Dining Room, Bathroom, Bedroom, Kitchen, Living Room, Workspace, Other

---

## 13. CANCELLATION POLICY SECTION

### CancellationPolicySection Component
**File**: `components/CancellationPolicySection.jsx`

**Features**:
- Policy dropdown selector:
  - Standard
  - Additional Host Restrictions
- Link to full policy page

**Props**:
```typescript
interface CancellationPolicySectionProps {
  listing: Listing;
  onPolicyChange: (policy: string) => void;
}
```

---

## DATA FETCHING

### Hook: useListingDashboardPageLogic

**Data Sources**:
- Primary: `listing_trial` table (for new self-listings)
- Fallback: `listing` table (for Bubble-synced listings)

**Fetch Flow**:
1. Get listing ID from URL params
2. Try `listing_trial` table by `id` column
3. If not found, try `listing` table by `_id` column
4. Fetch lookup tables in parallel (amenities, safety features, house rules, etc.)
5. Fetch related data (photos, proposals count, leases count, meetings count)
6. Transform data to component-friendly format

**Lookup Tables Fetched**:
- `zat_features_amenity` - Amenities with names and icons
- `zfut_safetyfeatures` - Safety features
- `zat_features_houserule` - House rules
- `zat_features_listingtype` - Property types
- `zat_features_parkingoptions` - Parking options
- `zat_features_storageoptions` - Storage options

**Related Data Counts**:
- `proposal` - Proposals for this listing
- `bookings_leases` - Active leases
- `virtualmeetingschedulesandlinks` - Scheduled meetings

---

## LISTING DATA TRANSFORMATION

### transformListingData Function

Converts database fields to component-friendly format:

```javascript
{
  // Identifiers
  id: string,                    // listing_trial.id or listing._id
  _id: string,                   // Alias for compatibility

  // Property Info
  title: string,                 // Name field
  description: string,           // Description field
  descriptionNeighborhood: string,

  // Location
  location: {
    id: string,
    address: string,
    hoodsDisplay: string,        // Neighborhood name
    city: string,
    state: string,
    zipCode: string,
    latitude: number,
    longitude: number,
  },

  // Status
  status: 'Online' | 'Offline',
  isOnline: boolean,
  createdAt: Date,
  activeSince: Date,

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
  },

  // Arrays (resolved from IDs to objects with names)
  inUnitAmenities: Array<{ id: string, name: string, icon?: string }>,
  buildingAmenities: Array<{ id: string, name: string, icon?: string }>,
  safetyFeatures: Array<{ id: string, name: string, icon?: string }>,
  houseRules: Array<{ id: string, name: string, icon?: string }>,

  // Guest Preferences
  preferredGender: { id: string, display: string },
  maxGuests: number,

  // Pricing
  leaseStyle: 'Nightly' | 'Monthly',
  nightsPerWeekMin: number,
  nightsPerWeekMax: number,
  availableDays: number[],       // 0-6 (JS format)
  nightsAvailable: string[],     // Night IDs for HostScheduleSelector
  pricing: { [nights: number]: number },
  weeklyCompensation: { [nights: number]: number },
  damageDeposit: number,
  maintenanceFee: number,
  monthlyHostRate: number,

  // Availability
  leaseTermMin: number,          // Weeks
  leaseTermMax: number,          // Weeks
  earliestAvailableDate: Date,
  checkInTime: string,
  checkOutTime: string,
  blockedDates: string[],        // YYYY-MM-DD format

  // Cancellation
  cancellationPolicy: string,

  // Media
  photos: Array<{
    id: string,
    url: string,
    isCover: boolean,
    photoType: string,
  }>,
  virtualTourUrl: string,
}
```

---

## EDIT FUNCTIONALITY

### Edit Modal System

The page uses the shared `EditListingDetails` component for most sections:

```jsx
<EditListingDetails
  listing={/* mapped listing data */}
  editSection={editSection}  // 'name', 'description', 'amenities', etc.
  onClose={handleCloseEdit}
  onSave={handleSaveEdit}
  updateListing={updateListing}
/>
```

**Edit Sections**:
- `name` - Property title
- `description` - Lodging description
- `neighborhood` - Neighborhood description
- `amenities` - In-unit and building amenities
- `details` - Property specs, safety features
- `pricing` - Uses PricingEditSection (full-screen overlay)
- `rules` - House rules, guest restrictions
- `availability` - Lease terms, dates
- `photos` - Photo management

### updateListing Function

Saves changes to database:
- Determines correct table (`listing_trial` or `listing`)
- Maps UI field names to database column names
- Handles quirky column names (e.g., leading space in ` First Available`)

---

## AI IMPORT ASSISTANT

### Feature Overview

The AI Import Assistant auto-generates listing content in sequence:

**Generation Order**:
1. Load Common In-Unit Amenities
2. Load Common Building Amenities
3. Load Neighborhood Description (by zip code)
4. Load Common House Rules
5. Load Common Safety Features
6. Generate AI Description (with enriched data)
7. Generate AI Title (with enriched data)

**State**:
```javascript
{
  showAIImportAssistant: boolean,
  aiGenerationStatus: {
    name: 'pending' | 'loading' | 'complete',
    description: 'pending' | 'loading' | 'complete',
    neighborhood: 'pending' | 'loading' | 'complete',
    inUnitAmenities: 'pending' | 'loading' | 'complete',
    buildingAmenities: 'pending' | 'loading' | 'complete',
    houseRules: 'pending' | 'loading' | 'complete',
    safetyFeatures: 'pending' | 'loading' | 'complete',
  },
  isAIGenerating: boolean,
  isAIComplete: boolean,
  aiGeneratedData: object,
}
```

---

## MODALS

### Schedule Cohost Modal
- Component: `ScheduleCohost`
- Opens from Alert Banner
- Allows hosts to request specialist co-host assistance

### Import Listing Reviews Modal
- Component: `ImportListingReviewsModal`
- Opens from Property Info section
- Sends request to Slack via Edge Function

### AI Import Assistant Modal
- Component: `AIImportAssistantModal`
- Opens from Secondary Actions
- Shows generation progress with status indicators

---

## STYLING

**File**: `app/src/styles/components/listing-dashboard.css`

### CSS Class Naming
- BEM convention with `listing-dashboard-*` prefix
- Modifier classes use `--` pattern

### Key Classes
```css
.listing-dashboard                    /* Main container */
.listing-dashboard__container         /* Content wrapper */
.listing-dashboard__card              /* Card container */
.listing-dashboard-nav                /* Navigation header */
.listing-dashboard-nav__tab           /* Tab button */
.listing-dashboard-nav__badge         /* Notification badge */
.listing-dashboard-section            /* Section container */
.listing-dashboard-section__header    /* Section header with title + edit */
.listing-dashboard-section__title     /* Section title */
.listing-dashboard-section__edit      /* Edit button */
.listing-dashboard-section__add-btn   /* Add button (purple) */
```

### Color Variables
```css
--ld-primary-contrast: #f1ffff
--ld-success: #31135d
--ld-background: #f7f8f9
--ld-text-primary: #1c274c
--ld-text-secondary: #6b7280
--ld-accent-purple: #6b4fbb
```

### Responsive Breakpoints
- Mobile-first approach
- `768px` - Tablet
- `1024px` - Desktop

---

## IMPLEMENTATION STATUS

### Fully Implemented
- Header with navigation
- Footer
- Navigation tabs with dynamic badges
- Action cards grid with conditional visibility
- Property Info section with edit
- Description sections (Lodging + Neighborhood) with edit
- Amenities section (In-unit + Building) with edit
- Details section (specs + safety) with edit
- Pricing section (Nightly + Monthly) with edit
- Rules section (house rules + restrictions) with edit
- Availability section (settings + interactive calendar)
- Photos section (grid, drag-drop, cover photo, delete)
- Cancellation Policy dropdown
- Edit modal integration (EditListingDetails)
- Pricing edit full-screen overlay
- Real data fetching from Supabase (listing + listing_trial)
- Lookup table resolution for IDs to names
- Photo management (set cover, delete, reorder)
- Blocked dates management with persistence
- AI Import Assistant modal
- Import Reviews modal (sends to Slack)
- Schedule Cohost modal

### Not Yet Implemented
- Virtual Tour section (video upload)
- Reviews display section
- Tab navigation to Proposals/Meetings/Leases pages

---

**DOCUMENT VERSION**: 2.0
**STATUS**: Production Implementation Documentation

