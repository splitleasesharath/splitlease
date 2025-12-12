# Implementation Plan: Create Proposal Flow on Favorite Listings Page

## Overview
Replace the redirect-to-view behavior of the "Create Proposal" button on the Favorite Listings page with an inline modal that displays the complete proposal creation flow (CreateProposalFlowV2). The flow must guide users sequentially through all steps rather than redirecting to the listing page.

## Success Criteria
- [ ] "Create Proposal" button opens CreateProposalFlowV2 modal inline on Favorite Listings page
- [ ] Modal includes all four steps: User Details -> Move-in -> Days Selection -> Review
- [ ] Users cannot skip steps or jump to review early
- [ ] Data persists through the flow steps via localStorage draft system
- [ ] Modal closes on cancel or successful submission
- [ ] Existing "View Proposal" button behavior remains unchanged
- [ ] All pricing calculations work correctly (via ListingScheduleSelector)
- [ ] Authentication check occurs before submission
- [ ] Toast notifications display on success/error

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Main page component | Add modal state, import CreateProposalFlowV2, add modal rendering, add handlers |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Multi-step proposal wizard component | No changes - reuse as-is |
| `app/src/islands/shared/CreateProposalFlowV2Components/UserDetailsSection.jsx` | User info step | No changes |
| `app/src/islands/shared/CreateProposalFlowV2Components/MoveInSection.jsx` | Move-in/reservation step | No changes |
| `app/src/islands/shared/CreateProposalFlowV2Components/DaysSelectionSection.jsx` | Days selection step | No changes |
| `app/src/islands/shared/CreateProposalFlowV2Components/ReviewSection.jsx` | Review step | No changes |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | Page styles | May need minor adjustments for modal overlay |
| `app/src/styles/create-proposal-flow-v2.css` | Proposal flow styles | Already imported via component |
| `app/src/islands/modals/ProposalSuccessModal.jsx` | Success modal after submission | Import and use |
| `app/src/islands/shared/SignUpLoginModal.jsx` | Auth modal for non-logged-in users | May be needed for auth flow |

### Related Documentation
- [FAVORITE_LISTINGS_QUICK_REFERENCE.md](./../Documentation/Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md) - Page architecture
- [largeCLAUDE.md](./../Documentation/largeCLAUDE.md) - Full project context

### Existing Patterns to Follow
- **ViewSplitLeasePage Modal Pattern**: The proposal modal is already implemented on ViewSplitLeasePage (lines 2671-2689). Follow the same pattern for state management, props, and handlers.
- **Hollow Component Pattern**: Keep logic in component state, not in separate hooks (FavoriteListingsPage doesn't use a separate logic hook).
- **Toast Notification Pattern**: Page already has `showToast` function implemented.
- **Auth Check Pattern**: Use `checkAuthStatus()` from `lib/auth.js` before submission.

## Implementation Steps

### Step 1: Add Required Imports
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Import CreateProposalFlowV2 and related components for the inline modal
**Details:**
- Add import for `CreateProposalFlowV2` from `../../shared/CreateProposalFlowV2.jsx`
- Add import for `ProposalSuccessModal` from `../../modals/ProposalSuccessModal.jsx`
- Add import for `SignUpLoginModal` from `../../shared/SignUpLoginModal.jsx` (if not already imported)
- Add import for `fetchZatPriceConfiguration` from `../../../lib/listingDataFetcher.js`
- Add import for `adaptDaysToBubble` from `../../../logic/processors/external/adaptDaysToBubble.js`
- Add import for `createDay` from `../../../lib/scheduleSelector/dayHelpers.js`
**Validation:** Ensure no import errors by checking the file compiles

### Step 2: Add Modal State Management
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Add state variables to control the proposal creation modal
**Details:**
Add the following state variables in the FavoriteListingsPage component:
```javascript
// Proposal modal state
const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
const [selectedListingForProposal, setSelectedListingForProposal] = useState(null);
const [zatConfig, setZatConfig] = useState(null);
const [moveInDate, setMoveInDate] = useState(null);
const [selectedDayObjects, setSelectedDayObjects] = useState([]);
const [reservationSpan, setReservationSpan] = useState(13);
const [priceBreakdown, setPriceBreakdown] = useState(null);
const [pendingProposalData, setPendingProposalData] = useState(null);
const [loggedInUserData, setLoggedInUserData] = useState(null);
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successProposalId, setSuccessProposalId] = useState(null);
const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
const [showAuthModal, setShowAuthModal] = useState(false);
```
**Validation:** No runtime errors when component mounts

### Step 3: Fetch ZAT Configuration on Mount
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Load pricing configuration needed for accurate price calculations
**Details:**
Add a useEffect to fetch ZAT config when component mounts:
```javascript
useEffect(() => {
  const loadZatConfig = async () => {
    try {
      const config = await fetchZatPriceConfiguration();
      setZatConfig(config);
    } catch (error) {
      console.warn('Failed to load ZAT config:', error);
    }
  };
  loadZatConfig();
}, []);
```
**Validation:** ZatConfig state is populated after component mounts

### Step 4: Fetch Logged-In User Data for Prefilling
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Load user profile data for prefilling proposal form
**Details:**
Modify the existing `initializePage` useEffect to also fetch user's proposal data:
```javascript
// Inside the existing initializePage function, after getting userData:
if (userData) {
  // Existing code for setCurrentUser...

  // Also fetch user's proposal count and profile info for prefilling
  try {
    const { data: userProposalData, error: propError } = await supabase
      .from('user')
      .select('"About Me", "Need for Space", "Special Needs", "Proposal Count"')
      .eq('_id', sessionId)
      .single();

    if (!propError && userProposalData) {
      setLoggedInUserData({
        aboutMe: userProposalData['About Me'] || '',
        needForSpace: userProposalData['Need for Space'] || '',
        specialNeeds: userProposalData['Special Needs'] || '',
        proposalCount: userProposalData['Proposal Count'] || 0
      });
    }
  } catch (e) {
    console.warn('Failed to fetch user proposal data:', e);
  }
}
```
**Validation:** loggedInUserData is populated for logged-in users

### Step 5: Add Handler to Open Proposal Modal
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Create handler function that sets up the modal with listing data
**Details:**
Add the following handler function:
```javascript
// Handler to open proposal creation modal for a specific listing
const handleOpenProposalModal = async (listing) => {
  // Get default schedule from URL params or use default weekdays
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');

  let initialDays = [];
  if (daysParam) {
    try {
      const oneBased = daysParam.split(',').map(d => parseInt(d.trim(), 10));
      initialDays = oneBased
        .filter(d => d >= 1 && d <= 7)
        .map(d => d - 1)
        .map(dayIndex => createDay(dayIndex, true));
    } catch (e) {
      console.warn('Failed to parse days from URL:', e);
    }
  }

  // Default to weekdays (Mon-Fri) if no URL selection
  if (initialDays.length === 0) {
    initialDays = [1, 2, 3, 4, 5].map(dayIndex => createDay(dayIndex, true));
  }

  // Calculate default move-in date (2 weeks from now on the first selected day)
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);

  // Find the next occurrence of the first selected day after 2 weeks
  const firstSelectedDay = initialDays[0]?.dayOfWeek ?? 1;
  while (twoWeeksFromNow.getDay() !== firstSelectedDay) {
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 1);
  }

  setSelectedListingForProposal(listing);
  setSelectedDayObjects(initialDays);
  setMoveInDate(twoWeeksFromNow.toISOString().split('T')[0]);
  setReservationSpan(13);
  setPriceBreakdown(null); // Will be calculated by ListingScheduleSelector
  setIsProposalModalOpen(true);
};
```
**Validation:** Modal opens when button is clicked, listing data is correctly passed

### Step 6: Add Proposal Submission Handler
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Handle the proposal submission flow including auth check
**Details:**
Add submission handlers (mirroring ViewSplitLeasePage pattern):
```javascript
// Submit proposal to backend
const submitProposal = async (proposalData) => {
  setIsSubmittingProposal(true);

  try {
    const guestId = getSessionId();
    if (!guestId) {
      throw new Error('User session not found');
    }

    // Convert days to Bubble format (1-7)
    const bubbleDays = adaptDaysToBubble({
      jsDays: proposalData.daysSelectedObjects.map(d => d.dayOfWeek)
    });

    // Build payload
    const payload = {
      listingId: selectedListingForProposal._id || selectedListingForProposal.id,
      guestId: guestId,
      moveInDate: proposalData.moveInDate,
      checkInDay: proposalData.checkInDay,
      checkOutDay: proposalData.checkOutDay,
      daysSelected: bubbleDays,
      reservationSpan: proposalData.reservationSpan,
      pricePerNight: proposalData.pricePerNight,
      totalPrice: proposalData.totalPrice,
      needForSpace: proposalData.needForSpace,
      aboutYourself: proposalData.aboutYourself,
      hasUniqueRequirements: proposalData.hasUniqueRequirements,
      uniqueRequirements: proposalData.uniqueRequirements || '',
      moveInRange: proposalData.moveInRange || ''
    };

    console.log('Submitting proposal:', payload);

    const { data, error } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'create',
        payload
      }
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || 'Failed to submit proposal');
    }

    console.log('Proposal submitted successfully:', data);

    setIsProposalModalOpen(false);
    setPendingProposalData(null);
    setSuccessProposalId(data.data?.proposalId);
    setShowSuccessModal(true);

    // Update proposals map to show "View Proposal" instead of "Create Proposal"
    if (data.data?.proposalId && selectedListingForProposal) {
      setProposalsByListingId(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedListingForProposal.id, { _id: data.data.proposalId });
        return newMap;
      });
    }

    showToast('Proposal submitted successfully!', 'success');

  } catch (error) {
    console.error('Error submitting proposal:', error);
    showToast(error.message || 'Failed to submit proposal. Please try again.', 'error');
  } finally {
    setIsSubmittingProposal(false);
  }
};

// Handle proposal submission - checks auth first
const handleProposalSubmit = async (proposalData) => {
  console.log('Proposal submission initiated:', proposalData);

  const isAuthenticated = await checkAuthStatus();

  if (!isAuthenticated) {
    console.log('User not logged in, showing auth modal');
    setPendingProposalData(proposalData);
    setIsProposalModalOpen(false);
    setShowAuthModal(true);
    return;
  }

  await submitProposal(proposalData);
};
```
**Validation:** Proposal submits successfully for logged-in users

### Step 7: Add Auth Completion Handler
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Handle the case where user completes auth after starting proposal
**Details:**
Add handler for auth modal completion:
```javascript
// Handle auth success - continue with pending proposal
const handleAuthSuccess = async (userData) => {
  console.log('Auth successful, user data:', userData);
  setShowAuthModal(false);

  // Update user state
  setIsLoggedIn(true);
  if (userData) {
    setCurrentUser({
      id: userData._id || getSessionId(),
      name: userData.fullName || userData.firstName || '',
      email: userData.email || '',
      userType: userData.userType || 'GUEST',
      avatarUrl: userData.profilePhoto || null
    });
  }

  // If there's pending proposal data, submit it
  if (pendingProposalData) {
    await submitProposal(pendingProposalData);
  }
};
```
**Validation:** After login, pending proposal is submitted automatically

### Step 8: Update PropertyCard Create Proposal Button
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Change the button to open the modal instead of redirecting
**Details:**
Modify the `PropertyCard` component's Create Proposal button onClick handler. Currently at around line 300-319:

Change from:
```javascript
<button
  className="create-proposal-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to listing page to create proposal
    const urlParams = new URLSearchParams(window.location.search);
    const daysSelected = urlParams.get('days-selected');
    const url = daysSelected
      ? `/view-split-lease/${listingId}?days-selected=${daysSelected}&create-proposal=true`
      : `/view-split-lease/${listingId}?create-proposal=true`;
    window.location.href = url;
  }}
>
```

To:
```javascript
<button
  className="create-proposal-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenProposalModal(listing);
  }}
>
```

Also update the `PropertyCard` props to accept `onOpenProposalModal`:
```javascript
function PropertyCard({
  listing,
  onLocationClick,
  onOpenContactModal,
  onOpenInfoModal,
  onOpenProposalModal,  // Add this new prop
  isLoggedIn,
  isFavorited,
  onToggleFavorite,
  userId,
  proposalForListing
}) {
```

And pass it from `ListingsGrid`:
```javascript
<PropertyCard
  key={listing.id}
  listing={listing}
  // ... existing props ...
  onOpenProposalModal={onOpenProposalModal}
/>
```

And from the main component to `ListingsGrid`:
```javascript
<ListingsGrid
  listings={listings}
  // ... existing props ...
  onOpenProposalModal={handleOpenProposalModal}
/>
```
**Validation:** Clicking "Create Proposal" opens modal instead of redirecting

### Step 9: Render CreateProposalFlowV2 Modal
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Add the modal component rendering
**Details:**
Add the modal rendering before the closing `</div>` of the main return statement (similar to ViewSplitLeasePage lines 2671-2689):

```javascript
{/* Create Proposal Modal */}
{isProposalModalOpen && selectedListingForProposal && (
  <CreateProposalFlowV2
    listing={{
      ...selectedListingForProposal,
      // Map the transformed listing fields to the expected format
      _id: selectedListingForProposal.id,
      Name: selectedListingForProposal.title,
      'Minimum Nights': 2,
      'Maximum Nights': 7,
      'rental type': 'Nightly',
      'Weeks offered': selectedListingForProposal.weeks_offered || 'Every week',
      '💰Unit Markup': 0,
      '💰Nightly Host Rate for 2 nights': selectedListingForProposal['Price 2 nights selected'],
      '💰Nightly Host Rate for 3 nights': selectedListingForProposal['Price 3 nights selected'],
      '💰Nightly Host Rate for 4 nights': selectedListingForProposal['Price 4 nights selected'],
      '💰Nightly Host Rate for 5 nights': selectedListingForProposal['Price 5 nights selected'],
      '💰Nightly Host Rate for 7 nights': selectedListingForProposal['Price 7 nights selected'],
      '💰Damage Deposit': 0,
      '💰Cleaning Cost / Maintenance Fee': 0
    }}
    moveInDate={moveInDate}
    daysSelected={selectedDayObjects}
    nightsSelected={selectedDayObjects.length > 0 ? selectedDayObjects.length - 1 : 0}
    reservationSpan={reservationSpan}
    pricingBreakdown={priceBreakdown}
    zatConfig={zatConfig}
    isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
    existingUserData={loggedInUserData ? {
      needForSpace: loggedInUserData.needForSpace || '',
      aboutYourself: loggedInUserData.aboutMe || '',
      hasUniqueRequirements: !!loggedInUserData.specialNeeds,
      uniqueRequirements: loggedInUserData.specialNeeds || ''
    } : null}
    onClose={() => {
      setIsProposalModalOpen(false);
      setSelectedListingForProposal(null);
    }}
    onSubmit={handleProposalSubmit}
  />
)}
```
**Validation:** Modal renders correctly with all sections

### Step 10: Render Success Modal
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Show success confirmation after proposal submission
**Details:**
Add ProposalSuccessModal rendering:
```javascript
{/* Proposal Success Modal */}
{showSuccessModal && (
  <ProposalSuccessModal
    isOpen={showSuccessModal}
    onClose={() => setShowSuccessModal(false)}
    proposalId={successProposalId}
  />
)}
```
**Validation:** Success modal shows after successful submission

### Step 11: Render Auth Modal
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Handle auth flow for unauthenticated users attempting to submit
**Details:**
Add SignUpLoginModal rendering:
```javascript
{/* Auth Modal for Proposal Submission */}
{showAuthModal && (
  <SignUpLoginModal
    isOpen={showAuthModal}
    onClose={() => {
      setShowAuthModal(false);
      setPendingProposalData(null);
    }}
    onSuccess={handleAuthSuccess}
    defaultTab="login"
    returnUrl={window.location.href}
  />
)}
```
**Validation:** Auth modal shows for non-logged-in users, handles login correctly

### Step 12: Ensure CSS is Properly Loaded
**Files:** `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`
**Purpose:** Verify modal styles are available
**Details:**
The CreateProposalFlowV2 component imports its own CSS (`../../styles/create-proposal-flow-v2.css`), so no additional CSS imports should be needed in FavoriteListingsPage. Verify the modal overlay renders correctly with proper z-index.

If needed, add to FavoriteListingsPage.css:
```css
/* Ensure proposal modal renders above other elements */
.favorites-page .create-proposal-popup {
  z-index: 1001;
}
```
**Validation:** Modal displays correctly with proper styling and overlay

## Edge Cases & Error Handling
- **No days selected**: Default to weekdays (Mon-Fri) pattern
- **No move-in date**: Calculate default as 2 weeks from now on first selected day
- **Network error on submission**: Show toast error, keep modal open for retry
- **User session expired**: Show auth modal, resume submission after re-auth
- **Listing data missing pricing fields**: Use fallback values (0) for missing pricing

## Testing Considerations
- Test opening modal from different listings
- Test full flow: User Details -> Move-in -> Days -> Review -> Submit
- Test closing modal at each step (should preserve draft via localStorage)
- Test submission with logged-in user
- Test submission with logged-out user (auth flow)
- Test mobile responsive layout of modal
- Verify pricing calculations display correctly
- Verify toast notifications on success/error

## Rollback Strategy
- Revert changes to FavoriteListingsPage.jsx
- The CreateProposalFlowV2 component is shared and unchanged, so no risk there
- Keep a backup of the original file before changes

## Dependencies & Blockers
- None - all required components (CreateProposalFlowV2, ProposalSuccessModal, SignUpLoginModal) already exist
- ZAT configuration must be fetchable from Supabase
- Proposal Edge Function must be operational

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pricing calculation errors | Low | Medium | Use existing ListingScheduleSelector which is battle-tested |
| Modal z-index conflicts | Low | Low | Modal has fixed positioning with high z-index |
| Auth flow interruption | Low | Medium | Store pending data, resume after auth |
| Mobile layout issues | Medium | Low | Modal is already responsive, test thoroughly |

---

## Files Referenced Summary

### Files to Modify:
1. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx` - Main changes

### Files to Reference (No Changes):
2. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2.jsx` - Modal component to import
3. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\UserDetailsSection.jsx` - Section component
4. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\MoveInSection.jsx` - Section component
5. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\DaysSelectionSection.jsx` - Section component
6. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2Components\ReviewSection.jsx` - Section component
7. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\modals\ProposalSuccessModal.jsx` - Success modal
8. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx` - Auth modal
9. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` - Reference implementation (lines 596-612, 1051-1186, 2671-2720)
10. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\listingDataFetcher.js` - fetchZatPriceConfiguration
11. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\processors\external\adaptDaysToBubble.js` - Day conversion
12. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\scheduleSelector\dayHelpers.js` - createDay helper
13. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\auth.js` - Auth utilities
14. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\create-proposal-flow-v2.css` - Modal styles
15. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.css` - Page styles

---

**VERSION**: 1.0
**CREATED**: 2025-12-12 23:25:00
**STATUS**: Ready for Implementation
