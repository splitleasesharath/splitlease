# Listing Dashboard Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/listing-dashboard?id={listingId}`
**ENTRY_POINT**: `app/src/listing-dashboard.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
listing-dashboard.jsx (Entry Point)
    |
    +-- ListingDashboardPage.jsx (Hollow Component)
            |
            +-- useListingDashboardPageLogic.js (Business Logic Hook)
            |       +-- URL parsing for listing ID
            |       +-- Listing data fetching (mock data)
            |       +-- Tab state management
            |       +-- Action card handlers
            |       +-- Form change handlers
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- NavigationHeader.jsx (Tab navigation)
                |       +-- 5 tabs with badges
                |       +-- Back button
                +-- AlertBanner.jsx (Expandable promo)
                +-- ActionCardGrid.jsx (6-card grid)
                |       +-- ActionCard.jsx (clickable cards)
                +-- SecondaryActions.jsx (Utility bar)
                |       +-- Copy link
                |       +-- AI Import Assistant
                +-- PropertyInfoSection.jsx (Description)
                |       +-- Description textarea
                |       +-- Address display
                |       +-- Status indicator
                |       +-- Import reviews
                +-- DetailsSection.jsx (Features)
                |       +-- Features grid (4 items)
                |       +-- Safety features grid
                |       +-- Cancellation policy dropdown
                |       +-- House Manual CTA
                +-- Footer.jsx (Site footer)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/listing-dashboard.jsx` | Mounts ListingDashboardPage to #root |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx` | Main hollow component |
| `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` | Core business logic hook |
| `app/src/islands/pages/ListingDashboardPage/index.js` | Barrel export |
| `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` | Component documentation |

### Sub-Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/components/NavigationHeader.jsx` | Tab navigation with badges |
| `app/src/islands/pages/ListingDashboardPage/components/ActionCard.jsx` | Reusable action card button |
| `app/src/islands/pages/ListingDashboardPage/components/ActionCardGrid.jsx` | 6-card quick actions grid |
| `app/src/islands/pages/ListingDashboardPage/components/AlertBanner.jsx` | Expandable co-host promo |
| `app/src/islands/pages/ListingDashboardPage/components/SecondaryActions.jsx` | Copy link & AI buttons |
| `app/src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx` | Property description form |
| `app/src/islands/pages/ListingDashboardPage/components/DetailsSection.jsx` | Features & safety display |
| `app/src/islands/pages/ListingDashboardPage/components/index.js` | Component barrel exports |

### Types & Data
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListingDashboardPage/types/listing.types.ts` | TypeScript interfaces |
| `app/src/islands/pages/ListingDashboardPage/data/mockListing.ts` | Mock data for development |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/listing-dashboard.css` | Complete page styling (677 lines) |

### HTML
| File | Purpose |
|------|---------|
| `app/public/listing-dashboard.html` | HTML entry point with DM Sans font |

---

## ### URL_ROUTING ###

```
/listing-dashboard                  # Default (uses mock data in dev)
/listing-dashboard?id={listingId}   # Specific listing by ID
```

### URL Parser Functions
```javascript
// In useListingDashboardPageLogic.js
const getListingIdFromUrl = useCallback(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}, []);
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/listing-dashboard',
  file: 'listing-dashboard.html',
  aliases: ['/listing-dashboard.html'],
  protected: true,        // Requires authentication
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

---

## ### TAB_NAVIGATION ###

### Tab Types (`listing.types.ts`)
```typescript
type TabType = 'preview' | 'manage' | 'proposals' | 'virtual-meetings' | 'leases';
```

### Tabs Configuration (`NavigationHeader.jsx`)
| Tab ID | Label | Icon | Badge |
|--------|-------|------|-------|
| `preview` | Preview Listing | EyeIcon | - |
| `manage` | Manage Listing | FileTextIcon | - |
| `proposals` | Proposals | FileTextIcon | counts.proposals |
| `virtual-meetings` | Virtual Meetings | CalendarIcon | counts.virtualMeetings |
| `leases` | Leases | FileCheckIcon | counts.leases |

### Tab Click Behavior
```javascript
const handleTabChange = useCallback((tab) => {
  setActiveTab(tab);
  switch (tab) {
    case 'preview':
      window.open(`/view-split-lease?id=${listing.id}`, '_blank');
      break;
    case 'proposals':
    case 'virtual-meetings':
    case 'leases':
      // Future: Navigate to section or page
      break;
    default:
      // Stay on manage tab
      break;
  }
}, [listing]);
```

---

## ### ACTION_CARDS ###

### 6-Card Grid (`ActionCardGrid.jsx`)
| Card ID | Label | Icon | Badge Condition |
|---------|-------|------|-----------------|
| `preview` | Preview Listing | EyeIcon | - |
| `copy-link` | Copy Listing Link | LinkIcon | - |
| `proposals` | Proposals | FileTextIcon | counts.proposals > 0 |
| `meetings` | Virtual Meetings | CalendarIcon | counts.virtualMeetings > 0 |
| `manage` | Manage Listing | SettingsIcon | true (always) |
| `leases` | Leases | FileCheckIcon | counts.leases > 0 |

### Card Click Handler
```javascript
const handleCardClick = useCallback((cardId) => {
  switch (cardId) {
    case 'preview':
      window.open(`/view-split-lease?id=${listing.id}`, '_blank');
      break;
    case 'copy-link':
      // Handled by SecondaryActions
      break;
    case 'proposals':
      setActiveTab('proposals');
      break;
    case 'meetings':
      setActiveTab('virtual-meetings');
      break;
    case 'manage':
      setActiveTab('manage');
      break;
    case 'leases':
      setActiveTab('leases');
      break;
  }
}, [listing]);
```

---

## ### DATA_TYPES ###

### Listing (Main Entity)
```typescript
interface Listing {
  id: string;
  location: Location;
  features: Features;
  rentalType: RentalType;
  preferredGender: PreferredGender;
  houseManual?: HouseManual;
  hostRestrictions?: HostRestrictions;
  isOnline: boolean;
  activeSince: Date;
  monthlyHostRate: number;
  damageDeposit: number;
  cleaningCost: number;
  minimumNights: number;
  maximumNights: number;
  idealLeaseMonthsMin: number;
  idealLeaseMonthsMax: number;
  idealLeaseWeeksMin: number;
  idealLeaseWeeksMax: number;
  earliestRentDate: Date;
  checkInTime: string;
  checkOutTime: string;
  description: string;
  descriptionNeighborhood: string;
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
  videos: Video[];
  amenities: Amenity[];
  safetyFeatures: SafetyFeature[];
  blockedDates: BlockedDate[];
}
```

### ListingCounts (Badge Data)
```typescript
interface ListingCounts {
  proposals: number;
  virtualMeetings: number;
  leases: number;
}
```

### Location
```typescript
interface Location {
  id: string;
  address: string;
  hoodsDisplay: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}
```

### Features
```typescript
interface Features {
  id: string;
  typeOfSpace: TypeOfSpace;
  parkingType: ParkingType;
  kitchenType: KitchenType;
  qtyGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
}
```

### Option Set Types
```typescript
interface RentalType { id: string; display: string; }
interface PreferredGender { id: string; display: string; }
interface TypeOfSpace { id: string; label: string; }
interface ParkingType { id: string; label: string; }
interface KitchenType { id: string; display: string; }
```

### Related Entities
```typescript
interface Photo {
  id: string;
  listingId: string;
  photoType: PhotoType;
  isCoverPhoto: boolean;
  imageUrl: string;
  orderIndex: number;
  createdAt: Date;
}

interface Amenity {
  id: string;
  name: string;
  category: 'in_unit' | 'building';
  icon?: string;
}

interface SafetyFeature {
  id: string;
  name: string;
  icon?: string;
}

interface BlockedDate {
  id: string;
  listingId: string;
  blockedDate: Date;
  status: 'restricted_weekly' | 'blocked_manually' | 'available';
  createdAt: Date;
}
```

---

## ### STATE_MANAGEMENT ###

### Hook State (`useListingDashboardPageLogic.js`)
```javascript
const [activeTab, setActiveTab] = useState('manage');
const [listing, setListing] = useState(null);
const [counts, setCounts] = useState({ proposals: 0, virtualMeetings: 0, leases: 0 });
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
```

### Hook Return Value
```javascript
return {
  // State
  activeTab,
  listing,
  counts,
  isLoading,
  error,

  // Handlers
  handleTabChange,
  handleCardClick,
  handleBackClick,
  handleDescriptionChange,
  handleCancellationPolicyChange,
  handleCopyLink,
  handleAIAssistant,
};
```

---

## ### UI_SECTIONS ###

### AlertBanner
- Expandable/collapsible info banner
- Co-host specialist promotion
- Dismissible with close button
- State: `isVisible`, `isExpanded`

### SecondaryActions
- Copy Listing Link button (uses Clipboard API)
- "create chatgpt suggestions" divider text
- AI Import Assistant button
- "CHOOSE A SECTION" label

### PropertyInfoSection
- Section title: "Property Info"
- Description textarea (editable)
- Import reviews button
- Address display: `{address} - {hoodsDisplay}`
- Status indicator: online/offline
- Active since date
- "Show my reviews" button

### DetailsSection
- Section title: "Details" (with cyan top border)
- Features grid (4 cards):
  - Type of Space
  - Transit
  - Parking
  - Kitchen
- Safety Features grid
- Cancellation Policy dropdown (Flexible/Moderate/Strict)
- "Complete House Manual" CTA button

---

## ### CSS_CLASS_REFERENCE ###

### Main Container
| Class | Purpose |
|-------|---------|
| `.listing-dashboard` | Page wrapper with min-height and background |
| `.listing-dashboard__container` | Max-width container (1280px) |
| `.listing-dashboard__card` | White card with rounded corners |
| `.listing-dashboard__loading` | Loading state container |
| `.listing-dashboard__error` | Error state container |
| `.listing-dashboard__not-found` | Not found state container |

### Navigation Header
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-nav` | Navigation container |
| `.listing-dashboard-nav__back` | Back button container |
| `.listing-dashboard-nav__back-btn` | Back button style |
| `.listing-dashboard-nav__tabs` | Tab buttons container |
| `.listing-dashboard-nav__tab` | Individual tab button |
| `.listing-dashboard-nav__tab--active` | Active tab state |
| `.listing-dashboard-nav__badge` | Red notification badge |

### Alert Banner
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-alert` | Alert container (blue dashed border) |
| `.listing-dashboard-alert__icon` | Purple info icon circle |
| `.listing-dashboard-alert__content` | Text content wrapper |
| `.listing-dashboard-alert__text` | Main alert text |
| `.listing-dashboard-alert__expanded` | Expandable content |
| `.listing-dashboard-alert__toggle` | Show more/less button |
| `.listing-dashboard-alert__close` | Red close button |

### Action Cards
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-action-grid` | Responsive grid container |
| `.listing-dashboard-action-card` | Individual card button |
| `.listing-dashboard-action-card__badge` | Red dot indicator |
| `.listing-dashboard-action-card__icon` | Icon container (64x64) |
| `.listing-dashboard-action-card__label` | Card text label |

### Secondary Actions
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-secondary` | Flex container |
| `.listing-dashboard-secondary__link-btn` | Copy link button |
| `.listing-dashboard-secondary__divider` | Center divider text |
| `.listing-dashboard-secondary__ai-btn` | AI assistant button (pill shape) |
| `.listing-dashboard-secondary__label` | Section label |

### Property Info
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-property` | Section container |
| `.listing-dashboard-property__title` | Section heading |
| `.listing-dashboard-property__input-wrapper` | Textarea container |
| `.listing-dashboard-property__textarea` | Description textarea |
| `.listing-dashboard-property__import-btn` | Import reviews link |
| `.listing-dashboard-property__details` | Address details container |
| `.listing-dashboard-property__address` | Address paragraph |
| `.listing-dashboard-property__address-text` | Bold address part |
| `.listing-dashboard-property__hood` | Hood name (gray) |
| `.listing-dashboard-property__status` | Status row |
| `.listing-dashboard-property__status-label` | "Status:" label |
| `.listing-dashboard-property__status-value--online` | Green online status |
| `.listing-dashboard-property__status-value--offline` | Red offline status |
| `.listing-dashboard-property__active-since` | Active date paragraph |
| `.listing-dashboard-property__date` | Bold date |
| `.listing-dashboard-property__reviews` | Reviews section |
| `.listing-dashboard-property__reviews-btn` | Show reviews button |

### Details Section
| Class | Purpose |
|-------|---------|
| `.listing-dashboard-details` | Section container |
| `.listing-dashboard-details__header` | Header with cyan top border |
| `.listing-dashboard-details__title` | Section heading |
| `.listing-dashboard-details__subtitle` | Sub-section heading |
| `.listing-dashboard-details__features` | Features grid |
| `.listing-dashboard-details__feature` | Individual feature card |
| `.listing-dashboard-details__feature-icon` | Feature icon (purple) |
| `.listing-dashboard-details__feature-content` | Feature text |
| `.listing-dashboard-details__feature-label` | Feature name |
| `.listing-dashboard-details__feature-value` | Feature value |
| `.listing-dashboard-details__safety` | Safety section |
| `.listing-dashboard-details__safety-grid` | Safety features grid |
| `.listing-dashboard-details__safety-item` | Safety feature tag |
| `.listing-dashboard-details__policy` | Cancellation policy section |
| `.listing-dashboard-details__select` | Policy dropdown |
| `.listing-dashboard-details__cta` | CTA section |
| `.listing-dashboard-details__cta-btn` | House Manual button (gradient) |

---

## ### CSS_VARIABLES ###

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

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `>= 1024px` | Action grid 3 columns, features grid 4 columns, safety grid 3 columns |
| `>= 768px` | Action grid 2 columns, features grid 2 columns, safety grid 2 columns |
| `< 768px` | Single column layouts |
| `< 640px` | Reduced padding, smaller tabs, vertical secondary actions |

### Mobile Adjustments (< 640px)
- Page padding: 16px 8px
- Card border-radius: 16px
- Tab padding: 10px 12px, font-size: 13px
- Action grid gap: 12px
- Action card padding: 24px
- Secondary actions: vertical layout
- Property/details padding: 16px
- Policy dropdown: 100% width

---

## ### DATA_FLOW ###

### 1. Initialize on Mount
```javascript
useEffect(() => {
  const listingId = getListingIdFromUrl();
  if (listingId) {
    fetchListing(listingId);
  } else {
    // Use mock data if no ID (development)
    setListing(mockListing);
    setCounts(mockCounts);
    setIsLoading(false);
  }
}, [fetchListing, getListingIdFromUrl]);
```

### 2. Fetch Listing (TODO: Replace with API)
```javascript
const fetchListing = useCallback(async (listingId) => {
  setIsLoading(true);
  setError(null);

  try {
    // TODO: Replace with actual API call to Supabase Edge Function
    await new Promise((resolve) => setTimeout(resolve, 500));

    setListing(mockListing);
    setCounts(mockCounts);
  } catch (err) {
    console.error('L Error fetching listing:', err);
    setError(err.message || 'Failed to load listing');
  } finally {
    setIsLoading(false);
  }
}, []);
```

### 3. Update Description
```javascript
const handleDescriptionChange = useCallback((newDescription) => {
  setListing((prev) => ({
    ...prev,
    description: newDescription,
  }));
  // TODO: Debounce and save to backend
}, []);
```

### 4. Copy Link
```javascript
const handleCopyLink = () => {
  const listingUrl = listingId
    ? `${window.location.origin}/view-split-lease?id=${listingId}`
    : window.location.href;

  navigator.clipboard.writeText(listingUrl).then(() => {
    alert('Listing link copied to clipboard!');
    onCopyLink?.();
  });
};
```

---

## ### COMPONENT_PROPS ###

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

### ActionCardGrid
```jsx
<ActionCardGrid
  counts={counts}
  onCardClick={handleCardClick}
/>
```

### ActionCard
```jsx
<ActionCard
  icon={<EyeIcon />}
  label="Preview Listing"
  onClick={() => handleClick('preview')}
  badge={false}
/>
```

### AlertBanner
No props - self-contained state.

### SecondaryActions
```jsx
<SecondaryActions
  listingId={listing.id}
  onCopyLink={handleCopyLink}
  onAIAssistant={handleAIAssistant}
/>
```

### PropertyInfoSection
```jsx
<PropertyInfoSection
  listing={listing}
  onDescriptionChange={handleDescriptionChange}
/>
```

### DetailsSection
```jsx
<DetailsSection
  listing={listing}
  onCancellationPolicyChange={handleCancellationPolicyChange}
/>
```

---

## ### LOADING_STATES ###

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
    <button onClick={() => window.location.reload()}>Retry</button>
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

## ### NAVIGATION_PATTERNS ###

### Back to All Listings
```javascript
const handleBackClick = useCallback(() => {
  window.location.href = '/host-dashboard';
}, []);
```

### Preview Listing
```javascript
window.open(`/view-split-lease?id=${listing.id}`, '_blank');
```

---

## ### TODO_FOR_PRODUCTION ###

1. Replace mock data with Supabase Edge Function calls
2. Implement actual navigation for tab clicks (proposals, VMs, leases)
3. Connect to authentication system (protected route)
4. Add form validation and auto-save with debouncing
5. Implement AI Import Assistant feature
6. Add listing ID validation and proper error handling
7. Connect description changes to backend
8. Connect cancellation policy changes to backend
9. Implement "Import reviews from other sites" feature
10. Implement "Show my reviews" feature
11. Implement "Complete House Manual" workflow

---

## ### KEY_IMPORTS ###

```javascript
// Page component
import ListingDashboardPage from './islands/pages/ListingDashboardPage';
import { useListingDashboardPageLogic } from './islands/pages/ListingDashboardPage';

// Components
import {
  NavigationHeader,
  ActionCardGrid,
  AlertBanner,
  SecondaryActions,
  PropertyInfoSection,
  DetailsSection,
} from './components';

// Shared components
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';

// Styles
import '../../../styles/components/listing-dashboard.css';

// Mock data (development)
import { mockListing, mockCounts } from './data/mockListing';
```

---

## ### LOGIC_LAYER_DEPENDENCIES ###

### Processors (Available for Listing Data)
| File | Purpose |
|------|---------|
| `app/src/logic/processors/listing/extractListingCoordinates.js` | Extract lat/lng from JSONB fields |
| `app/src/logic/processors/listing/parseJsonArrayField.js` | Parse JSON array fields |

### Note on Logic Layer
The Listing Dashboard page currently uses mock data and does not yet integrate with:
- Rules layer (no permission checks implemented)
- Workflows layer (no multi-step processes)
- Calculators layer (no pricing calculations on this page)

These integrations will be needed when implementing production features.

---

## ### INLINE_SVG_ICONS ###

The page uses inline SVG icons instead of external dependencies:

| Component | Icons |
|-----------|-------|
| NavigationHeader | ArrowLeftIcon, EyeIcon, FileTextIcon, CalendarIcon, FileCheckIcon |
| ActionCardGrid | EyeIcon, LinkIcon, FileTextIcon, CalendarIcon, SettingsIcon, FileCheckIcon |
| AlertBanner | InfoIcon, CloseIcon |
| SecondaryActions | LinkIcon, SparklesIcon |
| PropertyInfoSection | DownloadIcon, StarIcon |
| DetailsSection | HomeIcon, TrainIcon, CarIcon, KitchenIcon |

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Page shows loading forever | Check fetchListing timeout, verify mock data import |
| Tabs not switching | Verify handleTabChange is connected to onTabChange |
| Badges not showing | Check counts object structure, verify badge > 0 |
| Copy link not working | Check clipboard API permissions, verify listingId |
| Description not saving | handleDescriptionChange only updates local state (TODO) |
| Styling broken | Verify CSS import in ListingDashboardPage.jsx |
| 404 on page load | Check routes.config.js entry, verify HTML file exists |
| Authentication redirect | Page is protected: true - verify auth status |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Component CLAUDE.md | `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` |
| Logic CLAUDE.md | `app/src/logic/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database Tables Detailed | `Documentation/DATABASE_TABLES_DETAILED.md` |
| Option Sets | `Documentation/OPTION_SETS_DETAILED.md` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |
| Route Registry | `app/src/routes.config.js` |
| Host Overview Page | `app/src/islands/pages/HostOverviewPage/` |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Development (using mock data, awaiting production API integration)
