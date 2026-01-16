# Code Refactoring Plan - app

Date: 2026-01-15
Audit Type: general

~~~~~

## PAGE GROUP: ALL PAGES (Chunks: 1, 2, 3)

### CHUNK 1: Remove duplicate backup files
**File:** Multiple files with "(1)" suffix
**Line:** N/A (entire files)
**Issue:** 12 duplicate/backup files exist in the codebase with "(1)" suffix, causing confusion and potential import issues. These are likely accidentally committed backup files.
**Affected Pages:** AUTO

**Current Code:**
```
Files to delete:
- app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx
- app/src/islands/modals/EditPhoneNumberModal (1).jsx
- app/src/islands/modals/NotificationSettingsModal (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx
- app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx
- app/src/lib/proposalDataFetcher (1).js
- app/src/lib/secureStorage (1).js
- app/src/lib/SECURE_AUTH_README (1).md
- app/src/styles/components/create-listing-modal (1) (1).css
- app/src/styles/components/create-listing-modal (1).css
- app/src/islands/shared/CreateDuplicateListingModal (1).README.md
- app/src/islands/shared/CreateDuplicateListingModal (1).jsx
```

**Refactored Code:**
```bash
# Delete all backup files
rm "app/src/islands/modals/EditPhoneNumberModal (1) (1).jsx"
rm "app/src/islands/modals/EditPhoneNumberModal (1).jsx"
rm "app/src/islands/modals/NotificationSettingsModal (1).jsx"
rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1) (1).jsx"
rm "app/src/islands/shared/AuthAwareSearchScheduleSelector (1).jsx"
rm "app/src/lib/proposalDataFetcher (1).js"
rm "app/src/lib/secureStorage (1).js"
rm "app/src/lib/SECURE_AUTH_README (1).md"
rm "app/src/styles/components/create-listing-modal (1) (1).css"
rm "app/src/styles/components/create-listing-modal (1).css"
rm "app/src/islands/shared/CreateDuplicateListingModal (1).README.md"
rm "app/src/islands/shared/CreateDuplicateListingModal (1).jsx"
```

**Testing:**
- [ ] Verify original files still exist and work
- [ ] Run build to confirm no import errors
- [ ] Test affected modals still function

~~~~~

### CHUNK 2: Remove excessive console.log statements in production code
**File:** app/src/lib/supabaseUtils.js
**Line:** 56-57, 63-64, 72-75, 83-84, 100
**Issue:** 15+ console.log/debug statements in production utility code. These should use the centralized logger service or be removed for production.
**Affected Pages:** /search, /view-split-lease, /favorite-listings, /host-overview, / (homepage), /why-split-lease

**Current Code:**
```javascript
export async function fetchPhotoUrls(photoIds) {
  console.log('🔍 fetchPhotoUrls called with', photoIds?.length || 0, 'photo IDs');

  if (!photoIds || photoIds.length === 0) {
    console.log('⚠️ fetchPhotoUrls: No photo IDs provided, returning empty map');
    return {};
  }

  console.log('🔍 fetchPhotoUrls: Sample IDs:', photoIds.slice(0, 3));

  try {
    console.log('🔍 fetchPhotoUrls: Querying listing_photo table...');
    const { data, error } = await supabase
      .from('listing_photo')
      .select('_id, Photo')
      .in('_id', photoIds);

    console.log('🔍 fetchPhotoUrls: Query completed', {
      dataLength: data?.length || 0,
      error: error?.message || null
    });
    // ...
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

export async function fetchPhotoUrls(photoIds) {
  logger.debug('fetchPhotoUrls called', { count: photoIds?.length || 0 });

  if (!photoIds || photoIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('listing_photo')
      .select('_id, Photo')
      .in('_id', photoIds);

    if (error) {
      logger.error('Error fetching photos:', error);
      return {};
    }
    // ...
```

**Testing:**
- [ ] Verify logger import exists
- [ ] Test photo fetching still works on SearchPage
- [ ] Confirm debug logs only appear in development

~~~~~

### CHUNK 3: Replace setTimeout Promise patterns with utility function
**File:** app/src/lib/auth.js
**Line:** 162, 578, 801, 885
**Issue:** Multiple `await new Promise(resolve => setTimeout(resolve, X))` patterns scattered across the codebase. This should be a reusable utility function for consistency and testability.
**Affected Pages:** AUTO (auth affects all authenticated pages)

**Current Code:**
```javascript
// In lib/auth.js line 162
await new Promise(resolve => setTimeout(resolve, 200));

// In lib/auth.js line 578
await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms

// In lib/auth.js line 801
await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms

// In lib/auth.js line 885
await new Promise(resolve => setTimeout(resolve, 200));
```

**Refactored Code:**
```javascript
// Add to lib/utils.js or create lib/timing.js
/**
 * Async delay utility - replaces manual setTimeout Promise patterns
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Then in auth.js
import { delay } from './utils.js';

// Replace all occurrences:
await delay(200);
await delay(100);
```

**Testing:**
- [ ] Create delay utility function
- [ ] Replace all occurrences in auth.js
- [ ] Test login/logout flows still work with proper timing

~~~~~

## PAGE GROUP: /search (Chunks: 4, 5)

### CHUNK 4: Extract FilterPanel into separate component file
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** 42-192 (internal components)
**Issue:** SearchPage.jsx is 3,477 lines - far too large. Internal components like NeighborhoodCheckboxList and NeighborhoodDropdownFilter should be extracted to separate files. This monolithic file hurts maintainability and load times.
**Affected Pages:** /search

**Current Code:**
```javascript
// In SearchPage.jsx - internal component definitions
function NeighborhoodCheckboxList({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  id
}) {
  // 30+ lines of implementation
}

function NeighborhoodDropdownFilter({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange,
  searchInputId
}) {
  // 100+ lines of implementation
}
```

**Refactored Code:**
```javascript
// Create new file: app/src/islands/pages/SearchPage/components/NeighborhoodFilters.jsx
export function NeighborhoodCheckboxList({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  id
}) {
  // ... same implementation
}

export function NeighborhoodDropdownFilter({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange,
  searchInputId
}) {
  // ... same implementation
}

// In SearchPage.jsx:
import { NeighborhoodCheckboxList, NeighborhoodDropdownFilter } from './SearchPage/components/NeighborhoodFilters.jsx';
```

**Testing:**
- [ ] Create components directory structure
- [ ] Extract components with same props interface
- [ ] Verify search page filtering still works
- [ ] Run build to confirm no import errors

~~~~~

### CHUNK 5: Deduplicate photo fetching logic in useSearchPageLogic
**File:** app/src/islands/pages/useSearchPageLogic.js
**Line:** 219-253 and 375-408
**Issue:** Photo fetching logic is duplicated in fetchAllActiveListings and fetchListings functions. This should be extracted into a reusable helper to reduce code duplication.
**Affected Pages:** /search

**Current Code:**
```javascript
// In fetchAllActiveListings (lines 219-253)
const allPhotoIds = new Set()
data.forEach((listing) => {
  const photosField = listing['Features - Photos']
  if (Array.isArray(photosField)) {
    photosField.forEach((id) => allPhotoIds.add(id))
  } else if (typeof photosField === 'string') {
    try {
      const parsed = JSON.parse(photosField)
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => allPhotoIds.add(id))
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
})

// Same exact code duplicated in fetchListings (lines 375-408)
```

**Refactored Code:**
```javascript
// Add helper function at top of file
function extractPhotoIdsFromListings(listings) {
  const photoIds = new Set();
  listings.forEach((listing) => {
    const photosField = listing['Features - Photos'];
    const parsed = parseJsonArray(photosField); // Use existing utility
    parsed.forEach((id) => photoIds.add(id));
  });
  return Array.from(photoIds);
}

// In fetchAllActiveListings:
const photoIdsArray = extractPhotoIdsFromListings(data);
const photoMap = await fetchPhotoUrls(photoIdsArray);

// In fetchListings:
const photoIdsArray = extractPhotoIdsFromListings(data);
const photoMap = await fetchPhotoUrls(photoIdsArray);
```

**Testing:**
- [ ] Create extractPhotoIdsFromListings helper
- [ ] Update both fetch functions
- [ ] Test search page shows listing photos correctly

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 6, 7)

### CHUNK 6: Resolve duplicate ViewSplitLeasePage files
**File:** app/src/islands/pages/ViewSplitLeasePage.jsx AND app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
**Line:** N/A (entire files)
**Issue:** Two ViewSplitLeasePage implementations exist - one at root (2,558 lines) and one in subdirectory (3,012 lines). This is confusing and one should be removed or consolidated.
**Affected Pages:** /view-split-lease

**Current Code:**
```
app/src/islands/pages/ViewSplitLeasePage.jsx (2,558 lines)
app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx (3,012 lines)
app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js
```

**Refactored Code:**
```
# Determine which is the active version by checking view-split-lease.jsx entry point
# Then remove the unused version

# If subdirectory version is correct:
rm app/src/islands/pages/ViewSplitLeasePage.jsx
rm app/src/islands/pages/useViewSplitLeasePageLogic.js  # If also duplicated

# Keep:
app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
app/src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js
```

**Testing:**
- [ ] Check which file is imported in view-split-lease.jsx entry point
- [ ] Remove duplicate file(s)
- [ ] Test view-split-lease page loads correctly
- [ ] Verify booking flow works

~~~~~

### CHUNK 7: Reduce useState calls in useViewSplitLeasePageLogic
**File:** app/src/islands/pages/useViewSplitLeasePageLogic.js
**Line:** 30-59
**Issue:** 21 separate useState calls at the top of the hook. Related state should be grouped into objects to reduce re-renders and improve readability.
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
// Core data state
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [listing, setListing] = useState(null)
const [zatConfig, setZatConfig] = useState(null)
const [informationalTexts, setInformationalTexts] = useState({})

// Booking widget state
const [moveInDate, setMoveInDate] = useState(null)
const [strictMode, setStrictMode] = useState(false)
const [selectedDayObjects, setSelectedDayObjects] = useState([])
const [reservationSpan, setReservationSpan] = useState(13)
const [priceBreakdown, setPriceBreakdown] = useState(null)

// UI state
const [showTutorialModal, setShowTutorialModal] = useState(false)
const [showPhotoModal, setShowPhotoModal] = useState(false)
// ... more states
```

**Refactored Code:**
```javascript
// Group related state with useReducer or grouped useState
const [pageData, setPageData] = useState({
  loading: true,
  error: null,
  listing: null,
  zatConfig: null,
  informationalTexts: {}
});

const [bookingState, setBookingState] = useState({
  moveInDate: null,
  strictMode: false,
  selectedDayObjects: [],
  reservationSpan: 13,
  priceBreakdown: null
});

const [modals, setModals] = useState({
  tutorial: false,
  photo: false,
  contactHost: false,
  proposal: false
});

// Helper to update nested state
const updateBookingState = useCallback((updates) => {
  setBookingState(prev => ({ ...prev, ...updates }));
}, []);
```

**Testing:**
- [ ] Create grouped state objects
- [ ] Update all setters to use grouped update pattern
- [ ] Test all modal open/close flows
- [ ] Test booking flow still calculates prices correctly

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 8, 9)

### CHUNK 8: Resolve TODO comments in useListingDashboardPageLogic
**File:** app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js
**Line:** 622, 629, 648
**Issue:** Three unresolved TODO comments indicate incomplete functionality: navigation to meetings, navigation to leases, and debounced saving.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// Line 622
// TODO: Navigate to meetings or scroll to section

// Line 629
// TODO: Navigate to leases or scroll to section

// Line 648
// TODO: Debounce and save to backend
```

**Refactored Code:**
```javascript
// Line 622 - Implement meeting navigation
const handleViewMeetings = useCallback(() => {
  // Option 1: Scroll to meetings section
  document.getElementById('meetings-section')?.scrollIntoView({ behavior: 'smooth' });
  // Option 2: Open meetings modal
  // setShowMeetingsModal(true);
}, []);

// Line 629 - Implement leases navigation
const handleViewLeases = useCallback(() => {
  document.getElementById('leases-section')?.scrollIntoView({ behavior: 'smooth' });
}, []);

// Line 648 - Implement debounced save
import { useMemo } from 'react';
import { debounce } from '../../lib/utils.js';

const debouncedSave = useMemo(
  () => debounce(async (data) => {
    await saveListingData(data);
  }, 1000),
  []
);
```

**Testing:**
- [ ] Implement scrollIntoView for meetings section
- [ ] Implement scrollIntoView for leases section
- [ ] Add debounce utility if not exists
- [ ] Test auto-save on listing edits

~~~~~

### CHUNK 9: Extract PricingEditSection (1,055 lines) into smaller components
**File:** app/src/islands/pages/ListingDashboardPage/components/PricingEditSection.jsx
**Line:** 1-1055
**Issue:** PricingEditSection.jsx is 1,055 lines - a single component file should not be this large. Should be broken into PricingForm, PricingPreview, NightlyRateCalculator, etc.
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
// One massive 1055-line component file
export default function PricingEditSection({
  listing,
  onUpdate,
  // ... many props
}) {
  // All pricing logic, forms, and UI in one file
}
```

**Refactored Code:**
```javascript
// Create directory structure:
// components/PricingEditSection/
//   index.jsx (main component, ~200 lines)
//   PricingForm.jsx (~300 lines)
//   NightlyRateDisplay.jsx (~150 lines)
//   PricingPreview.jsx (~200 lines)
//   usePricingLogic.js (~200 lines)

// In index.jsx:
import { PricingForm } from './PricingForm.jsx';
import { NightlyRateDisplay } from './NightlyRateDisplay.jsx';
import { PricingPreview } from './PricingPreview.jsx';
import { usePricingLogic } from './usePricingLogic.js';

export default function PricingEditSection({ listing, onUpdate }) {
  const pricingLogic = usePricingLogic(listing);

  return (
    <div className="pricing-edit-section">
      <PricingForm {...pricingLogic} />
      <NightlyRateDisplay rates={pricingLogic.nightlyRates} />
      <PricingPreview breakdown={pricingLogic.breakdown} />
    </div>
  );
}
```

**Testing:**
- [ ] Create PricingEditSection directory
- [ ] Extract sub-components maintaining props interface
- [ ] Test pricing edits save correctly
- [ ] Test pricing preview updates live

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 10)

### CHUNK 10: Resolve TODO comments in useHostProposalsPageLogic
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 686, 777
**Issue:** Two unresolved TODO comments for messaging navigation and rental app request API.
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// Line 686
// TODO: Navigate to messaging or open message modal

// Line 777
// TODO: Call API to send rental app request notification to guest
```

**Refactored Code:**
```javascript
// Line 686 - Navigate to messaging
const handleOpenMessaging = useCallback((proposalId, guestId) => {
  // Use existing navigation workflow
  navigateToMessaging({
    proposalId,
    recipientId: guestId,
    listingId: selectedListing?.id
  });
}, [selectedListing]);

// Line 777 - Send rental app request
const handleRequestRentalApp = useCallback(async (proposalId, guestId) => {
  try {
    await supabase.functions.invoke('proposal', {
      body: {
        action: 'request_rental_application',
        payload: { proposalId, guestId }
      }
    });
    showToast('Rental application request sent!', 'success');
  } catch (error) {
    showToast('Failed to send request', 'error');
  }
}, []);
```

**Testing:**
- [ ] Implement messaging navigation using existing workflow
- [ ] Implement rental app request API call
- [ ] Test message button opens correct thread
- [ ] Test rental app request shows toast

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 11)

### CHUNK 11: Complete TODO in ProposalCard cancel handler
**File:** app/src/islands/pages/proposals/ProposalCard.jsx
**Line:** 1025
**Issue:** TODO comment for implementing cancel API call - functionality may be incomplete.
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
// Line 1025
// TODO: Implement actual cancel API call here
```

**Refactored Code:**
```javascript
// Use existing cancel workflow
import { executeDeleteProposal } from '../../../logic/workflows/proposals/cancelProposalWorkflow.js';

const handleCancelProposal = useCallback(async (proposalId, reason) => {
  try {
    setIsCancelling(true);
    await executeDeleteProposal({
      proposalId,
      cancellationReason: reason,
      userId: currentUserId
    });
    showToast('Proposal cancelled successfully', 'success');
    // Refresh proposals list
    onProposalCancelled?.(proposalId);
  } catch (error) {
    showToast('Failed to cancel proposal', 'error');
  } finally {
    setIsCancelling(false);
  }
}, [currentUserId, onProposalCancelled]);
```

**Testing:**
- [ ] Verify executeDeleteProposal is imported
- [ ] Test cancel button triggers API call
- [ ] Verify cancelled proposal removed from list
- [ ] Test error handling shows toast

~~~~~

## PAGE GROUP: /messages (Chunks: 12)

### CHUNK 12: Implement unread count in useMessagingPageLogic
**File:** app/src/islands/pages/MessagingPage/useMessagingPageLogic.js
**Line:** 473
**Issue:** TODO comment indicates unread count is hardcoded to 0 and needs implementation.
**Affected Pages:** /messages

**Current Code:**
```javascript
// Line 473
unread_count: 0, // TODO: Implement unread count if needed
```

**Refactored Code:**
```javascript
// Add unread count calculation from thread data
const calculateUnreadCount = useCallback((thread, currentUserId) => {
  if (!thread.messages || !currentUserId) return 0;

  return thread.messages.filter(msg =>
    msg.sender_id !== currentUserId &&
    !msg.read_at
  ).length;
}, []);

// In thread transformation:
{
  // ...other properties
  unread_count: calculateUnreadCount(threadData, currentUserId)
}
```

**Testing:**
- [ ] Implement unread count calculation
- [ ] Test unread badge shows correct number
- [ ] Test count decreases when thread is opened

~~~~~

## PAGE GROUP: /account-profile (Chunks: 13)

### CHUNK 13: Complete TODO for cover photo upload
**File:** app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
**Line:** 906
**Issue:** TODO comment indicates cover photo upload is not implemented.
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// Line 906
// TODO: Implement cover photo upload
```

**Refactored Code:**
```javascript
const handleCoverPhotoUpload = useCallback(async (file) => {
  if (!file || !userId) return;

  try {
    setIsUploadingCover(true);

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/cover-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL and update user record
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    await supabase
      .from('user')
      .update({ 'Cover Photo': publicUrl })
      .eq('_id', userId);

    setCoverPhotoUrl(publicUrl);
    showToast('Cover photo updated!', 'success');
  } catch (error) {
    showToast('Failed to upload cover photo', 'error');
  } finally {
    setIsUploadingCover(false);
  }
}, [userId]);
```

**Testing:**
- [ ] Implement cover photo upload handler
- [ ] Test file selection triggers upload
- [ ] Verify photo appears after upload
- [ ] Test error handling

~~~~~

## PAGE GROUP: AUTO / Shared Components (Chunks: 14, 15, 16)

### CHUNK 14: Complete TODO in GoogleMap hover effects
**File:** app/src/islands/shared/GoogleMap.jsx
**Line:** 1000
**Issue:** TODO comment about hover effects bug that was disabled.
**Affected Pages:** /search, /favorite-listings, /view-split-lease

**Current Code:**
```javascript
// Line 1000
// TODO: Re-implement hover effects after fixing positioning bug
```

**Refactored Code:**
```javascript
// In marker creation, add proper hover handling
const handleMarkerHover = useCallback((listing, isEntering) => {
  if (!listing || !googleMapRef.current) return;

  const marker = markersRef.current.find(m => m.listingId === listing.id);
  if (!marker) return;

  if (isEntering) {
    // Scale up marker
    marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
    // Show info window or tooltip
    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(renderMarkerTooltip(listing));
      infoWindowRef.current.open(googleMapRef.current, marker);
    }
  } else {
    // Reset marker
    marker.setZIndex(null);
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }
}, []);
```

**Testing:**
- [ ] Implement hover effect with z-index change
- [ ] Test hover shows tooltip/info window
- [ ] Verify no positioning bugs on hover
- [ ] Test on search page map

~~~~~

### CHUNK 15: Complete TODO in AiSignupMarketReport topic detection
**File:** app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx
**Line:** 662
**Issue:** TODO(human) comment indicates topic detection logic needs implementation.
**Affected Pages:** /search (AI Research modal)

**Current Code:**
```javascript
// Line 662
// TODO(human): Implement the topic detection logic
```

**Refactored Code:**
```javascript
// Implement topic detection from user query
const detectTopicFromQuery = (query) => {
  const lowerQuery = query.toLowerCase();

  // Topic patterns
  const topicPatterns = {
    pricing: /price|cost|rent|budget|afford|cheap|expensive/i,
    neighborhood: /neighborhood|area|location|where|live/i,
    amenities: /amenity|feature|gym|pool|parking|laundry/i,
    commute: /commute|transit|subway|bus|train|walk/i,
    safety: /safe|crime|security|family/i,
    comparison: /compare|vs|versus|better|difference/i
  };

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(lowerQuery)) {
      return topic;
    }
  }

  return 'general';
};
```

**Testing:**
- [ ] Implement topic detection function
- [ ] Test with various query types
- [ ] Verify correct topic is detected
- [ ] Test in AI Research modal

~~~~~

### CHUNK 16: Complete TODO in WhyThisProposal summary display
**File:** app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx
**Line:** 13
**Issue:** TODO(human) comment indicates summary display logic needs implementation.
**Affected Pages:** Pages using SuggestedProposals component

**Current Code:**
```javascript
// Line 13
// TODO(human): Implement the summary display logic
```

**Refactored Code:**
```javascript
// Implement summary display based on proposal data
const WhyThisProposal = ({ proposal, listing }) => {
  const reasons = useMemo(() => {
    const reasonsList = [];

    // Schedule match
    if (proposal.daysMatch === 'perfect') {
      reasonsList.push('Your schedule matches perfectly');
    } else if (proposal.daysMatch === 'partial') {
      reasonsList.push(`${proposal.matchingDays} days match your availability`);
    }

    // Price comparison
    if (proposal.priceComparison === 'below_market') {
      reasonsList.push('Below market rate for this area');
    }

    // Location match
    if (proposal.neighborhoodMatch) {
      reasonsList.push(`In ${proposal.neighborhood}, one of your preferred areas`);
    }

    return reasonsList;
  }, [proposal]);

  return (
    <div className="why-this-proposal">
      <h4>Why this listing?</h4>
      <ul>
        {reasons.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>
    </div>
  );
};
```

**Testing:**
- [ ] Implement reason generation logic
- [ ] Test with various proposal types
- [ ] Verify reasons display correctly
- [ ] Test styling matches design

~~~~~

## PAGE GROUP: /self-listing-v2 (Chunks: 17)

### CHUNK 17: Complete TODO for SMS edge function call
**File:** app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx
**Line:** 2098
**Issue:** TODO comment indicates SMS notification for continue-on-phone is not implemented.
**Affected Pages:** /self-listing-v2

**Current Code:**
```javascript
// Line 2098
// TODO: Call edge function to send SMS with continueOnPhoneLink
```

**Refactored Code:**
```javascript
const sendContinueOnPhoneSMS = async (phoneNumber, continueLink) => {
  try {
    const { data, error } = await supabase.functions.invoke('notifications', {
      body: {
        action: 'send_sms',
        payload: {
          to: phoneNumber,
          template: 'continue_listing',
          variables: {
            link: continueLink
          }
        }
      }
    });

    if (error) throw error;

    showToast('SMS sent! Check your phone to continue.', 'success');
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    showToast('Failed to send SMS. Please try again.', 'error');
    return false;
  }
};
```

**Testing:**
- [ ] Implement SMS edge function call
- [ ] Test with valid phone number
- [ ] Verify SMS is received
- [ ] Test error handling

~~~~~

## Summary

### Issues Found by Category

| Category | Count | Priority |
|----------|-------|----------|
| Duplicate/Backup Files | 12 files | High |
| Unresolved TODO Comments | 20+ | Medium |
| Excessive Console Logs | 298 statements | Medium |
| Large Files (>1000 lines) | 25 files | Medium |
| Duplicate Code Patterns | 5 instances | Medium |
| Missing Implementations | 8 | High |

### Files by Size (Top 10 Largest)

1. SearchPage.jsx - 3,477 lines
2. ViewSplitLeasePage/ViewSplitLeasePage.jsx - 3,012 lines
3. ViewSplitLeasePage.jsx - 2,558 lines (DUPLICATE)
4. SignUpLoginModal.jsx - 2,496 lines
5. auth.js - 1,976 lines
6. PreviewSplitLeasePage.jsx - 1,928 lines
7. AiSignupMarketReport.jsx - 1,843 lines
8. FavoriteListingsPage.jsx - 1,763 lines
9. SearchPageTest.jsx - 1,730 lines
10. useListingDashboardPageLogic.js - 1,604 lines

### Additional Issues Found (Background Audit Agent)

#### React Anti-Patterns - Array Index as Key (50+ occurrences)

| File | Line(s) | Affected Pages |
|------|---------|----------------|
| GuestEditingProposalModal.jsx | 497 | /guest-proposals |
| BookTimeSlot.jsx | 188, 212, 240, 290 | /guest-proposals, /host-proposals |
| WhySplitLeasePage.jsx | 448 | /why-split-lease |
| HomePage.jsx | 144, 306, 463 | / |
| LocalJourneySection.jsx | 218, 236 | / |
| ListWithUsPageV2.jsx | 271, 437 | /list-with-us-v2 |
| SearchPage.jsx | 689, 794, 2776 | /search |
| FavoriteListingsPage.jsx | 415 | /favorite-listings |
| ProposalCard.jsx | 1182 | /guest-proposals |

#### Inline Function Handlers in Render (100+ occurrences)

| File | Count | Affected Pages |
|------|-------|----------------|
| ViewSplitLeasePage.jsx | 39+ | /view-split-lease |
| FavoriteListingsPage.jsx | 17+ | /favorite-listings |
| WhySplitLeasePage.jsx | 3 | /why-split-lease |

#### Excessive Inline Styles (1,097 total)

| File | Count | Affected Pages |
|------|-------|----------------|
| ViewSplitLeasePage/ViewSplitLeasePage.jsx | 205 | /view-split-lease |
| SignUpLoginModal.jsx | 202 | ALL pages |
| PreviewSplitLeasePage.jsx | 159 | /preview-split-lease |

#### Missing React.memo (Only 2 usages found)

Components that would benefit: `FilterPanel`, `NeighborhoodCheckboxList`, `ListingCardForMap`, `ProposalCard`

#### Duplicate Logic Files (Architecture Issue)

| File 1 | File 2 | Issue |
|--------|--------|-------|
| logic/processors/proposal/processProposalData.js | logic/processors/proposals/processProposalData.js | Same processor in 2 folders |
| logic/workflows/proposals/cancelProposalWorkflow.js | logic/workflows/booking/cancelProposalWorkflow.js | Same workflow in 2 folders |

---

### Recommended Implementation Order

1. **Phase 1 - Cleanup (Chunks 1-3)**
   - Remove duplicate backup files
   - Standardize logging
   - Create utility functions

2. **Phase 2 - SearchPage (Chunks 4-5)**
   - Extract components
   - Deduplicate code

3. **Phase 3 - ViewSplitLease (Chunks 6-7)**
   - Resolve duplicate files
   - Consolidate state management

4. **Phase 4 - Dashboard (Chunks 8-9)**
   - Complete TODO items
   - Break up large components

5. **Phase 5 - Proposals (Chunks 10-11)**
   - Complete missing API implementations

6. **Phase 6 - Shared Components (Chunks 14-17)**
   - Complete TODO items in shared utilities

7. **Phase 7 - React Anti-Patterns (NEW)**
   - Replace array index keys with stable IDs
   - Add useCallback for inline handlers
   - Add React.memo to list item components
   - Consolidate duplicate logic files
