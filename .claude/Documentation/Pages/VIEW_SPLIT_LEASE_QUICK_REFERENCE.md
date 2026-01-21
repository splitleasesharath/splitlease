# View Split Lease Page - Quick Reference Guide

**GENERATED**: 2026-01-20
**STATUS**: Comprehensive documentation reflecting current implementation
**LOC**: ~2,722 lines

---

## Page Overview

The **View Split Lease Page** is the detailed listing view where guests browse property information and create booking proposals. It displays comprehensive listing data (photos, amenities, location, pricing) and provides an interactive booking widget for selecting stay schedules.

**URL Pattern**: `/view-split-lease.html?id={listing_id}&days-selected={1-based-days}`

**Example**: `/view-split-lease.html?id=abc123&days-selected=2,3,4,5,6` (Mon-Fri selection)

---

## Architecture

### File Structure

```
app/src/
   view-split-lease.jsx                    # Entry point (React root mount)
   islands/pages/
      ViewSplitLeasePage.jsx              # Main page component (~2,722 lines)
      useViewSplitLeasePageLogic.js       # Logic hook (NOT currently used by main component)
   islands/shared/
      ListingScheduleSelector.jsx         # Day selection component
      CreateProposalFlowV2.jsx            # Multi-step proposal wizard
      ContactHostMessaging.jsx            # Host messaging modal
      GoogleMap.jsx                       # Interactive map component
      SignUpLoginModal.jsx                # Authentication modal
      InformationalText.jsx               # Tooltip component
   islands/modals/
      ProposalSuccessModal.jsx            # Success confirmation modal
   lib/
      listingDataFetcher.js               # Listing data fetching with enrichment
      dataLookups.js                      # Lookup table caching
      priceCalculations.js                # Pricing calculation utilities
      availabilityValidation.js           # Schedule validation utilities
      auth.js                             # Authentication functions
      scheduleSelector/
         dayHelpers.js                    # Day manipulation utilities
   logic/processors/external/
      adaptDaysToBubble.js                # Day index conversion
   styles/
      listing-schedule-selector.css       # Schedule selector styles
      components/toast.css                # Toast notification styles
```

### Entry Point Pattern

```jsx
// Entry Point: view-split-lease.jsx
import { createRoot } from 'react-dom/client';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';

createRoot(document.getElementById('view-split-lease-page')).render(<ViewSplitLeasePage />);
```

**Note**: The current implementation does NOT use the `useViewSplitLeasePageLogic` hook. All business logic is embedded directly in the component. The hook exists but is unused.

---

## Component Structure

### Main Page Layout (Two-Column Grid)

```

                            Header

  LEFT COLUMN (Content)                   RIGHT COLUMN (Sticky)
     Photo Gallery                          Price Display
     Listing Header                         Move-in Date
     Features Grid                          Strict Mode Toggle
     Description (expandable)               Schedule Selector
     Storage Section                        Reservation Span
     Neighborhood (expandable)              Schedule Pattern Info
     Commute Section                        Price Breakdown
     Amenities Section                      Create Proposal Btn
     House Rules
     Map (lazy loaded)
     Host Section
     Cancellation Policy

                            Footer

```

### Responsive Behavior

```
Desktop (>900px): Two-column grid, sticky booking widget
Mobile (<=900px): Single column, static booking widget
```

---

## State Management

### Core State

```javascript
// Loading & Error
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [listing, setListing] = useState(null);

// Configuration
const [zatConfig, setZatConfig] = useState(null);
const [informationalTexts, setInformationalTexts] = useState({});
```

### Booking Widget State

```javascript
// Schedule Selection
const [moveInDate, setMoveInDate] = useState(null);
const [strictMode, setStrictMode] = useState(false);
const [selectedDayObjects, setSelectedDayObjects] = useState(() => getInitialScheduleFromUrl());
const [reservationSpan, setReservationSpan] = useState(13); // 13 weeks default

// Pricing
const [priceBreakdown, setPriceBreakdown] = useState(null);

// Proposal Flow
const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
const [pendingProposalData, setPendingProposalData] = useState(null);
const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successProposalId, setSuccessProposalId] = useState(null);

// Authentication
const [showAuthModal, setShowAuthModal] = useState(false);
const [loggedInUserData, setLoggedInUserData] = useState(null);

// Toast Notifications
const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
```

### UI State

```javascript
// Modals
const [showTutorialModal, setShowTutorialModal] = useState(false);
const [showPhotoModal, setShowPhotoModal] = useState(false);
const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
const [showContactHostModal, setShowContactHostModal] = useState(false);

// Expandable Sections
const [expandedSections, setExpandedSections] = useState({
  description: false,
  neighborhood: false,
  blockedDates: false
});

// Informational Tooltips
const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);

// Responsive
const [isMobile, setIsMobile] = useState(false);
const [shouldLoadMap, setShouldLoadMap] = useState(false);
```

---

## Data Fetching

### Initialization Flow

```javascript
useEffect(() => {
  async function initialize() {
    // 1. Initialize lookup caches (boroughs, neighborhoods, amenities, etc.)
    await initializeLookups();

    // 2. Check auth and fetch user data
    const isLoggedIn = await checkAuthStatus();
    if (isLoggedIn) {
      const userData = await validateTokenAndFetchUser();
      setLoggedInUserData(userData);
    }

    // 3. Fetch ZAT price configuration
    const zatConfigData = await fetchZatPriceConfiguration();
    setZatConfig(zatConfigData);

    // 4. Fetch informational texts from Supabase
    const infoTexts = await fetchInformationalTexts();
    setInformationalTexts(infoTexts);

    // 5. Get listing ID from URL and fetch complete data
    const listingId = getListingIdFromUrl();
    const listingData = await fetchListingComplete(listingId);
    setListing(listingData);
  }

  initialize();
}, []);
```

### Listing Data Enrichment

The `fetchListingComplete()` function performs comprehensive data enrichment:

1. Fetch main listing data from Supabase
2. Fetch sorted photos from listing_photo table
3. Resolve geographic data (neighborhood, borough names)
4. Resolve property type label
5. Resolve amenities (in-unit, in-building)
6. Resolve safety features
7. Resolve house rules
8. Resolve parking option
9. Resolve cancellation policy
10. Resolve storage option
11. Fetch host data
12. Parse coordinates for map

---

## Key Components

### ListingScheduleSelector

Interactive day picker for selecting weekly stay schedule.

```jsx
<ListingScheduleSelector
  listing={scheduleSelectorListing}
  initialSelectedDays={selectedDayObjects}
  limitToFiveNights={false}
  reservationSpan={reservationSpan}
  zatConfig={zatConfig}
  onSelectionChange={handleScheduleChange}
  onPriceChange={handlePriceChange}
  showPricing={false}
/>
```

**Features**:
- 7-day grid with selectable days
- Contiguous selection enforcement
- Min/max nights validation
- Real-time price calculation
- Check-in/check-out day display

### SchedulePatternHighlight (Internal Component)

Displays schedule pattern information for alternating lease schedules.

```jsx
<SchedulePatternHighlight
  reservationSpan={reservationSpan}
  weeksOffered={listing?.['Weeks offered']}
/>
```

**Supported Patterns**:
- Every week (default)
- One week on, one week off
- Two weeks on, two weeks off
- One week on, three weeks off

### PhotoGallery (Internal Component)

Adaptive photo gallery that adjusts layout based on number of photos.

```jsx
<PhotoGallery
  photos={listing.photos}
  listingName={listing.Name}
  onPhotoClick={handlePhotoClick}
/>
```

**Layout Variants**:
- 1 photo: Single large image
- 2 photos: Two equal side-by-side
- 3 photos: Large left + 2 stacked right
- 4 photos: Large left + 3 stacked right
- 5+ photos: Classic Pinterest layout (large left + 4 smaller right)

### CreateProposalFlowV2

Multi-step proposal wizard modal.

```jsx
<CreateProposalFlowV2
  listing={listing}
  moveInDate={moveInDate}
  daysSelected={selectedDayObjects}
  nightsSelected={nightsSelected}
  reservationSpan={reservationSpan}
  pricingBreakdown={priceBreakdown}
  zatConfig={zatConfig}
  isFirstProposal={loggedInUserData?.proposalCount === 0}
  existingUserData={existingUserData}
  onClose={() => setIsProposalModalOpen(false)}
  onSubmit={handleProposalSubmit}
/>
```

### ContactHostMessaging

Modal for guests to message hosts about listings.

```jsx
<ContactHostMessaging
  isOpen={showContactHostModal}
  onClose={() => setShowContactHostModal(false)}
  listing={{
    id: listing._id,
    title: listing.Name,
    host: { name: hostName }
  }}
  userEmail={loggedInUserData?.email || ''}
  userName={loggedInUserData?.fullName || loggedInUserData?.firstName || ''}
/>
```

### InformationalText

Tooltip component for displaying contextual help.

```jsx
<InformationalText
  isOpen={activeInfoTooltip === 'moveIn'}
  onClose={() => setActiveInfoTooltip(null)}
  triggerRef={moveInInfoRef}
  title="Ideal Move-In"
  content={informationalTexts['aligned schedule with move-in'].desktop}
  expandedContent={informationalTexts['aligned schedule with move-in'].desktopPlus}
  showMoreAvailable={informationalTexts['aligned schedule with move-in'].showMore}
/>
```

---

## Event Handlers

### Schedule Change

```javascript
const handleScheduleChange = (newSelectedDays) => {
  setSelectedDayObjects(newSelectedDays);

  // Check if non-contiguous (triggers tutorial)
  const dayNumbers = newSelectedDays.map(d => d.dayOfWeek);
  if (dayNumbers.length > 0 && !isContiguousSelection(dayNumbers)) {
    setShowTutorialModal(true);
  }

  // Automatically set smart default move-in date when days are selected
  if (dayNumbers.length > 0) {
    const smartDate = calculateSmartMoveInDate(dayNumbers);
    setMoveInDate(smartDate);
  }
};
```

### Price Change

```javascript
const handlePriceChange = useCallback((newPriceBreakdown) => {
  // Only update if values actually changed to prevent infinite loops
  setPriceBreakdown((prev) => {
    if (!prev ||
        prev.fourWeekRent !== newPriceBreakdown.fourWeekRent ||
        prev.reservationTotal !== newPriceBreakdown.reservationTotal ||
        prev.nightlyRate !== newPriceBreakdown.nightlyRate) {
      return newPriceBreakdown;
    }
    return prev;
  });
}, []);
```

### Proposal Submission Flow

```javascript
// 1. User clicks Create Proposal
const handleCreateProposal = () => {
  if (!scheduleValidation?.valid) return;
  if (!moveInDate) return;
  setIsProposalModalOpen(true);
};

// 2. Proposal form submitted
const handleProposalSubmit = async (proposalData) => {
  const isLoggedIn = await checkAuthStatus();

  if (!isLoggedIn) {
    // Store pending proposal, show auth modal
    setPendingProposalData(proposalData);
    setIsProposalModalOpen(false);
    setShowAuthModal(true);
    return;
  }

  // User is logged in, submit
  await submitProposal(proposalData);
};

// 3. Submit to Edge Function
const submitProposal = async (proposalData) => {
  // Convert days to Bubble format (1-7)
  const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });

  // Call proposal Edge Function
  const { data, error } = await supabase.functions.invoke('proposal', {
    body: { action: 'create', payload: edgeFunctionPayload }
  });

  // Show success modal
  setSuccessProposalId(data.data?.proposalId);
  setShowSuccessModal(true);
};

// 4. Auth success callback
const handleAuthSuccess = async (authResult) => {
  setShowAuthModal(false);
  const userData = await validateTokenAndFetchUser();
  setLoggedInUserData(userData);

  // Submit pending proposal
  if (pendingProposalData) {
    await submitProposal(pendingProposalData);
  }
};
```

---

## URL Parameters

### Reading Parameters

```javascript
// Get listing ID from URL
const listingId = getListingIdFromUrl(); // from lib/listingDataFetcher.js

// Get initial schedule from URL (1-based indices)
// URL format: ?days-selected=2,3,4,5,6 (Mon-Fri)
function getInitialScheduleFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');

  if (!daysParam) return [];

  // Parse 1-based indices and convert to 0-based
  const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
  const zeroBased = oneBased
    .filter(d => d >= 1 && d <= 7)
    .map(d => d - 1);

  // Convert to Day objects
  return zeroBased.map(dayIndex => createDay(dayIndex, true));
}
```

---

## Modals

### 1. Tutorial Modal
- **Trigger**: Non-contiguous day selection
- **Purpose**: Explain split schedule concept
- **Actions**: Okay, Take me to FAQ

### 2. Photo Modal
- **Trigger**: Click on photo
- **Purpose**: Full-screen photo viewing with navigation
- **Features**: Previous/Next buttons, photo counter, close button

### 3. Proposal Modal (CreateProposalFlowV2)
- **Trigger**: "Create Proposal" button click
- **Purpose**: Multi-step booking proposal wizard
- **Validation**: Schedule validity, move-in date required

### 4. Auth Modal (SignUpLoginModal)
- **Trigger**: Proposal submission when not logged in
- **Purpose**: User authentication before proposal
- **Config**: `initialView="signup-step1"`, `defaultUserType="guest"`, `skipReload={true}`

### 5. Success Modal (ProposalSuccessModal)
- **Trigger**: Successful proposal submission
- **Purpose**: Confirmation with proposal ID

### 6. Contact Host Modal (ContactHostMessaging)
- **Trigger**: "Message" button in host section
- **Purpose**: Send message to host via Edge Function

### 7. Informational Tooltips (InformationalText)
- **Trigger**: Click on info icons
- **Tags**: 'moveIn', 'reservationSpan', 'flexibility'
- **Content**: Loaded from `informationaltexts` Supabase table

---

## Lazy Loading

### Map Component

The GoogleMap component is lazy-loaded using Intersection Observer:

```javascript
useEffect(() => {
  if (!mapSectionRef.current) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      });
    },
    {
      rootMargin: '200px', // Load when within 200px of viewport
      threshold: 0
    }
  );

  observer.observe(mapSectionRef.current);
  return () => observer.disconnect();
}, [listing]);
```

### Auto-Zoom on Load

```javascript
useEffect(() => {
  if (shouldLoadMap && mapRef.current && listing && !hasAutoZoomedRef.current) {
    setTimeout(() => {
      mapRef.current?.zoomToListing(listing._id);
      hasAutoZoomedRef.current = true;
    }, 600);
  }
}, [shouldLoadMap, listing]);
```

---

## Pricing System

### Price Breakdown Structure

```javascript
{
  valid: true,              // Whether pricing is valid
  pricePerNight: 120,       // Nightly rate
  nightlyRate: 120,         // Same as pricePerNight
  fourWeekRent: 2400,       // 4-week rent total
  reservationTotal: 7800,   // Full reservation total
  discount: 0,              // Any applicable discount
  markup: 0                 // Unit markup
}
```

### Smart Move-in Date Calculation

```javascript
const calculateSmartMoveInDate = useCallback((selectedDayNumbers) => {
  if (!selectedDayNumbers || selectedDayNumbers.length === 0) {
    return minMoveInDate; // 2 weeks from today
  }

  // Get first selected day (check-in day)
  const sortedDays = [...selectedDayNumbers].sort((a, b) => a - b);
  const firstDayOfWeek = sortedDays[0];

  // Calculate next occurrence of check-in day after minimum date
  const minDate = new Date(minMoveInDate);
  const minDayOfWeek = minDate.getDay();
  let daysToAdd = (firstDayOfWeek - minDayOfWeek + 7) % 7;

  if (daysToAdd === 0) return minMoveInDate;

  const smartDate = new Date(minDate);
  smartDate.setDate(minDate.getDate() + daysToAdd);
  return smartDate.toISOString().split('T')[0];
}, [minMoveInDate]);
```

### Reservation Span Options

```javascript
[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26] // weeks
```

---

## Styling

### Color Constants (from lib/constants.js)

```javascript
const COLORS = {
  PRIMARY: '#31135d',
  PRIMARY_HOVER: '#1f0b38',
  BG_LIGHT: '#f3f4f6',
  TEXT_DARK: '#111827',
  TEXT_LIGHT: '#6B7280'
};
```

### Booking Widget Styling

```javascript
{
  position: isMobile ? 'static' : 'sticky',
  top: 'calc(80px + 20px)',  // Below header
  alignSelf: 'flex-start',
  maxHeight: 'calc(100vh - 80px - 40px)',
  overflowY: 'auto',
  borderRadius: '16px',
  padding: '28px',
  background: 'white',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(10px)'
}
```

---

## Key Dependencies

### Imports

```javascript
// React
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Shared Components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import ListingScheduleSelector from '../shared/ListingScheduleSelector.jsx';
import GoogleMap from '../shared/GoogleMap.jsx';
import CreateProposalFlowV2 from '../shared/CreateProposalFlowV2.jsx';
import ContactHostMessaging from '../shared/ContactHostMessaging.jsx';
import InformationalText from '../shared/InformationalText.jsx';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
import ProposalSuccessModal from '../modals/ProposalSuccessModal.jsx';

// Data Fetchers
import { fetchListingComplete, getListingIdFromUrl, fetchZatPriceConfiguration } from '../../lib/listingDataFetcher.js';
import { initializeLookups } from '../../lib/dataLookups.js';

// Price & Validation
import { calculatePricingBreakdown, formatPrice, getPriceDisplayMessage } from '../../lib/priceCalculations.js';
import { isContiguousSelection, validateScheduleSelection, calculateCheckInOutDays, calculateNightsFromDays } from '../../lib/availabilityValidation.js';

// Auth
import { checkAuthStatus, validateTokenAndFetchUser, getSessionId } from '../../lib/auth.js';

// Constants & Helpers
import { DAY_ABBREVIATIONS, DEFAULTS, COLORS, SCHEDULE_PATTERNS } from '../../lib/constants.js';
import { createDay } from '../../lib/scheduleSelector/dayHelpers.js';
import { supabase } from '../../lib/supabase.js';

// Day Conversion
import { adaptDaysToBubble } from '../../logic/processors/external/adaptDaysToBubble.js';

// Styles
import '../../styles/listing-schedule-selector.css';
import '../../styles/components/toast.css';
```

---

## Critical Day Indexing

### JavaScript (Internal) vs Bubble API

| Day       | JS (Internal) | Bubble API | URL Param |
|-----------|---------------|------------|-----------|
| Sunday    | 0             | 1          | 1         |
| Monday    | 1             | 2          | 2         |
| Tuesday   | 2             | 3          | 3         |
| Wednesday | 3             | 4          | 4         |
| Thursday  | 4             | 5          | 5         |
| Friday    | 5             | 6          | 6         |
| Saturday  | 6             | 7          | 7         |

### Day Conversion at API Boundaries

```javascript
// When submitting proposal to Edge Function
const daysInJsFormat = proposalData.daysSelectedObjects?.map(d => d.dayOfWeek);
const daysInBubbleFormat = adaptDaysToBubble({ zeroBasedDays: daysInJsFormat });
```

### Default Selection

```javascript
// Default: Monday through Friday
const defaultDays = DEFAULTS.DEFAULT_SELECTED_DAYS.map(dayNum => createDay(dayNum, true));
// DEFAULT_SELECTED_DAYS = [1, 2, 3, 4, 5] (Mon-Fri in JS indexing)
```

---

## Validation

### Schedule Validation

```javascript
const scheduleValidation = listing
  ? validateScheduleSelection(selectedDays, listing)
  : null;

// Returns: { valid: boolean, errors: string[] }
```

### Proposal Button State

```javascript
const isButtonEnabled = scheduleValidation?.valid && pricingBreakdown?.valid;

// Button disabled conditions:
// - Non-contiguous day selection
// - Less than minimum nights
// - Invalid pricing calculation
// - Missing move-in date
```

---

## Error Handling

### Loading State

```jsx
if (loading) {
  return (
    <>
      <Header />
      <main style={{ minHeight: '70vh', paddingTop: 'calc(80px + 2rem)' }}>
        <LoadingState />
      </main>
      <Footer />
    </>
  );
}
```

### Error State

```jsx
if (error || !listing) {
  return (
    <>
      <Header />
      <main style={{ minHeight: '70vh', paddingTop: 'calc(80px + 2rem)' }}>
        <ErrorState message={error} />
      </main>
      <Footer />
    </>
  );
}
```

### Toast Notifications

```javascript
const showToast = (message, type = 'success') => {
  setToast({ show: true, message, type });
  setTimeout(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, 4000);
};

// Usage: showToast('Proposal submitted successfully!', 'success');
// Usage: showToast(error.message, 'error');
```

---

## Section References

```javascript
const mapRef = useRef(null);              // GoogleMap component ref
const mapSectionRef = useRef(null);       // Map section for lazy loading
const commuteSectionRef = useRef(null);   // Commute section navigation
const amenitiesSectionRef = useRef(null); // Amenities section navigation
const houseRulesSectionRef = useRef(null); // House rules section navigation
const hasAutoZoomedRef = useRef(false);   // Track initial map zoom

// Info tooltip refs
const moveInInfoRef = useRef(null);
const reservationSpanInfoRef = useRef(null);
const flexibilityInfoRef = useRef(null);
```

---

## Document Title

```javascript
useEffect(() => {
  if (listing?.Name) {
    document.title = `${listing.Name} | Split Lease`;
  }
}, [listing]);
```

---

## Related Files

### Core Files
- `app/src/view-split-lease.jsx` - Entry point
- `app/src/islands/pages/ViewSplitLeasePage.jsx` - Main component
- `app/src/islands/pages/useViewSplitLeasePageLogic.js` - Logic hook (unused)
- `app/src/islands/shared/ListingScheduleSelector.jsx` - Schedule selector
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Proposal wizard
- `app/src/islands/shared/ContactHostMessaging.jsx` - Host messaging
- `app/src/islands/modals/ProposalSuccessModal.jsx` - Success modal

### Data Layer
- `app/src/lib/listingDataFetcher.js` - Listing data enrichment
- `app/src/lib/dataLookups.js` - Lookup table caching
- `app/src/lib/priceCalculations.js` - Pricing utilities
- `app/src/lib/availabilityValidation.js` - Schedule validation
- `app/src/lib/scheduleSelector/dayHelpers.js` - Day manipulation

### Logic Layer
- `app/src/logic/processors/external/adaptDaysToBubble.js` - Day conversion

### Styling
- `app/src/styles/listing-schedule-selector.css` - Schedule selector styles
- `app/src/styles/components/toast.css` - Toast notification styles

---

## Testing Checklist

When modifying ViewSplitLeasePage:

- [ ] Verify listing data loads correctly with all enrichments
- [ ] Test schedule selection with min/max nights enforcement
- [ ] Verify contiguous selection validation
- [ ] Test smart move-in date calculation
- [ ] Verify pricing updates on schedule change
- [ ] Test proposal creation flow (logged in/out)
- [ ] Verify auth modal appears when not logged in
- [ ] Test proposal success modal after submission
- [ ] Test contact host messaging
- [ ] Verify map lazy loading and auto-zoom
- [ ] Test responsive behavior (desktop/mobile)
- [ ] Test all modal open/close states
- [ ] Verify informational tooltips display correctly
- [ ] Test URL parameter parsing (id, days-selected)
- [ ] Verify photo gallery and modal navigation
- [ ] Test toast notifications for success/error states

---

## Known Implementation Notes

1. **Hook Not Used**: `useViewSplitLeasePageLogic.js` exists but is NOT currently imported or used by `ViewSplitLeasePage.jsx`. All logic is embedded directly in the component.

2. **URL Parameter Format**: Days are passed as 1-based indices (1=Sunday through 7=Saturday) in the `days-selected` URL parameter.

3. **Proposal Edge Function**: Uses Supabase native `supabase.functions.invoke()` method with action-based routing (`action: 'create'`).

4. **Toast CSS**: Requires `../../styles/components/toast.css` import for toast notifications to display properly.

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Complete - reflects current implementation
