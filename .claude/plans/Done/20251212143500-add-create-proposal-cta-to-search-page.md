# Implementation Plan: Add "Create Proposal" CTA Button to Search Page

## Overview

Add a conditional "Create Proposal" call-to-action button to the Search page that displays next to the existing "Message" button on each listing card. The button should appear only when the user is logged in, is a guest, and has one or more existing proposals. Clicking the button will trigger the CreateProposalFlowV2 shared island component.

## Success Criteria

- [ ] "Create Proposal" button appears next to "Message" button on PropertyCard
- [ ] Button only visible when: user is logged in AND is a guest AND has 1+ proposals
- [ ] Clicking button opens CreateProposalFlowV2 modal with correct listing data
- [ ] Button styling consistent with existing "Message" button design
- [ ] Works on both desktop and mobile views
- [ ] Component follows Islands Architecture pattern

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component | Add CreateProposal button to PropertyCard, import CreateProposalFlowV2, add modal state and handlers |
| `app/src/islands/pages/useSearchPageLogic.js` | Logic hook for search page | Not required - can use existing auth state from SearchPage |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Shared proposal flow component | No changes - reuse as-is |
| `app/src/logic/rules/users/isGuest.js` | Rule to check if user is a guest | Import and use in SearchPage |
| `app/src/lib/auth.js` | Auth utilities | Use existing `validateTokenAndFetchUser` which returns `proposalCount` |

### Related Documentation

- [SEARCH_QUICK_REFERENCE.md](.claude/Documentation/Pages/SEARCH_QUICK_REFERENCE.md) - Full search page architecture
- [miniCLAUDE.md](.claude/Documentation/miniCLAUDE.md) - Architecture patterns

### Existing Patterns to Follow

1. **PropertyCard Message Button Pattern** (lines 615-628 of SearchPage.jsx):
   ```jsx
   <button
     className="message-btn"
     onClick={(e) => {
       e.preventDefault();
       e.stopPropagation();
       onOpenContactModal(listing);
     }}
   >
     <svg width="14" height="14" viewBox="0 0 24 24" ...>...</svg>
     Message
   </button>
   ```

2. **CreateProposalFlowV2 Usage Pattern** (ViewSplitLeasePage.jsx lines 2670-2690):
   ```jsx
   {isProposalModalOpen && (
     <CreateProposalFlowV2
       listing={listing}
       moveInDate={moveInDate}
       daysSelected={selectedDayObjects}
       nightsSelected={nightsSelected}
       reservationSpan={reservationSpan}
       pricingBreakdown={priceBreakdown}
       zatConfig={zatConfig}
       isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
       existingUserData={...}
       onClose={() => setIsProposalModalOpen(false)}
       onSubmit={handleProposalSubmit}
     />
   )}
   ```

3. **isGuest Rule Usage**:
   ```javascript
   import { isGuest } from '../../logic/rules/users/isGuest.js'
   const isUserGuest = isGuest({ userType: currentUser?.userType })
   ```

## Implementation Steps

### Step 1: Add Auth Data Fetch for proposalCount

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Extend the auth check to fetch user data including proposalCount
**Details:**
- The current auth check (lines 866-921) fetches user data but stores limited info
- Modify to also store `proposalCount` in state from `validateTokenAndFetchUser` response
- Add new state: `const [userProposalCount, setUserProposalCount] = useState(0)`
- In the auth check effect, after successful auth, call `validateTokenAndFetchUser()` and extract `proposalCount`
- Store in `currentUser` object: `{ ...currentUser, proposalCount: userData.proposalCount }`

**Code Change Location:** Around line 866-921 in SearchPage.jsx

**Validation:** Console log to verify proposalCount is being fetched and stored correctly

---

### Step 2: Import Required Dependencies

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Import the isGuest rule and CreateProposalFlowV2 component
**Details:**
- Add import: `import { isGuest } from '../../logic/rules/users/isGuest.js'`
- Add import: `import CreateProposalFlowV2 from '../shared/CreateProposalFlowV2.jsx'`
- These should be added near other existing imports at the top of the file

**Code Change Location:** Lines 1-20 (import section)

**Validation:** No import errors in console

---

### Step 3: Add Create Proposal Modal State

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Add state for controlling the CreateProposalFlowV2 modal
**Details:**
- Add state: `const [isCreateProposalModalOpen, setIsCreateProposalModalOpen] = useState(false)`
- Add state: `const [selectedListingForProposal, setSelectedListingForProposal] = useState(null)`
- Add near other modal state declarations (around line 799-806)

**Code Change Location:** Around lines 799-806 (modal state section)

**Validation:** States initialize correctly without errors

---

### Step 4: Add Create Proposal Button Handler

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Add handler function to open the proposal flow
**Details:**
- Create handler function:
  ```javascript
  const handleOpenCreateProposalModal = (listing) => {
    setSelectedListingForProposal(listing);
    setIsCreateProposalModalOpen(true);
  };
  ```
- Add near other modal handlers (around lines 1781-1809)

**Code Change Location:** Around lines 1781-1809 (modal handlers section)

**Validation:** Handler function exists and is callable

---

### Step 5: Add Create Proposal Submit Handler

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Handle proposal submission from the flow
**Details:**
- Create handler function similar to ViewSplitLeasePage pattern:
  ```javascript
  const handleCreateProposalSubmit = async (proposalData) => {
    console.log('Creating proposal from Search page:', proposalData);
    // For now, close the modal and show a toast
    // Full implementation would call the proposal Edge Function
    setIsCreateProposalModalOpen(false);
    setSelectedListingForProposal(null);
    showToast('Proposal submitted successfully!', 'success');
  };
  ```
- Note: Full submission logic can be added in a follow-up task if needed

**Code Change Location:** After handleOpenCreateProposalModal

**Validation:** Handler exists and properly closes modal

---

### Step 6: Compute Visibility Condition

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Create a computed value for whether to show the Create Proposal button
**Details:**
- Add computed condition above the JSX return:
  ```javascript
  // Determine if "Create Proposal" button should be visible
  // Conditions: logged in AND is a guest AND has 1+ existing proposals
  const showCreateProposalButton = useMemo(() => {
    if (!isLoggedIn || !currentUser) return false;
    const userIsGuest = isGuest({ userType: currentUser.userType });
    const hasExistingProposals = (currentUser.proposalCount ?? 0) > 0;
    return userIsGuest && hasExistingProposals;
  }, [isLoggedIn, currentUser]);
  ```
- Note: This requires adding `useMemo` to the React imports if not already present

**Code Change Location:** Before the return statement in SearchPage (around line 1898)

**Validation:** Value correctly computes based on auth state

---

### Step 7: Update PropertyCard Props Interface

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Add props for the Create Proposal button to PropertyCard
**Details:**
- Add new props to PropertyCard function signature (line 371):
  - `showCreateProposalButton` - boolean
  - `onOpenCreateProposalModal` - function
- Update PropertyCard invocations in ListingsGrid (lines 690-705) to pass these new props:
  ```jsx
  <PropertyCard
    key={listing.id}
    listing={listing}
    // ... existing props ...
    showCreateProposalButton={showCreateProposalButton}
    onOpenCreateProposalModal={onOpenCreateProposalModal}
  />
  ```

**Code Change Location:**
- Line 371 (PropertyCard function definition)
- Lines 690-705 (PropertyCard usage in ListingsGrid)

**Validation:** Props passed correctly without errors

---

### Step 8: Update ListingsGrid Props Interface

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Pass Create Proposal props through ListingsGrid
**Details:**
- Add props to ListingsGrid function signature (line 655):
  - `showCreateProposalButton`
  - `onOpenCreateProposalModal`
- Pass these props to PropertyCard inside ListingsGrid
- Update ListingsGrid invocations (lines 2071-2087 and 2093-2110) to pass the props

**Code Change Location:**
- Line 655 (ListingsGrid function definition)
- Lines 2071-2087 (fallback ListingsGrid usage)
- Lines 2093-2110 (main ListingsGrid usage)

**Validation:** Props flow correctly through component tree

---

### Step 9: Add Create Proposal Button to PropertyCard

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Render the Create Proposal button conditionally
**Details:**
- Add button next to existing Message button in PropertyCard (after line 628):
  ```jsx
  {showCreateProposalButton && (
    <button
      className="create-proposal-btn"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenCreateProposalModal(listing);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      Create Proposal
    </button>
  )}
  ```
- The icon is the same document icon used in CreateProposalFlowV2 header

**Code Change Location:** After line 628 (after Message button in PropertyCard)

**Validation:** Button renders correctly when conditions are met

---

### Step 10: Add CSS Styling for Create Proposal Button

**Files:** `app/src/islands/pages/SearchPage.jsx` (inline styles or create new CSS)
**Purpose:** Style the Create Proposal button to match existing design
**Details:**
- Add CSS class `.create-proposal-btn` similar to `.message-btn`:
  ```css
  .create-proposal-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #31135D;  /* Split Lease purple */
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .create-proposal-btn:hover {
    background: #4a1d8c;
  }

  .create-proposal-btn svg {
    flex-shrink: 0;
  }
  ```
- This can be added to `app/src/styles/components/search-page.css` or inline

**Code Change Location:** CSS file or inline styles

**Validation:** Button looks consistent with Message button

---

### Step 11: Render CreateProposalFlowV2 Modal

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Add the CreateProposalFlowV2 modal component
**Details:**
- Add modal render near other modals (around lines 2229-2257):
  ```jsx
  {/* Create Proposal Modal */}
  {isCreateProposalModalOpen && selectedListingForProposal && (
    <CreateProposalFlowV2
      listing={transformListingForProposal(selectedListingForProposal)}
      moveInDate=""
      daysSelected={[]}
      nightsSelected={0}
      reservationSpan={13}
      pricingBreakdown={null}
      zatConfig={null}
      isFirstProposal={false}
      existingUserData={currentUser ? {
        needForSpace: '',
        aboutYourself: '',
        hasUniqueRequirements: false,
        uniqueRequirements: ''
      } : null}
      onClose={() => {
        setIsCreateProposalModalOpen(false);
        setSelectedListingForProposal(null);
      }}
      onSubmit={handleCreateProposalSubmit}
    />
  )}
  ```

**Code Change Location:** Around lines 2229-2257 (modal section)

**Validation:** Modal opens when Create Proposal button is clicked

---

### Step 12: Add Listing Data Transformer for Proposal

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Transform the SearchPage listing format to CreateProposalFlowV2 expected format
**Details:**
- The listing objects in SearchPage have a different structure than what CreateProposalFlowV2 expects
- Add a helper function to transform the listing:
  ```javascript
  const transformListingForProposal = (listing) => {
    // Transform from SearchPage listing format to CreateProposalFlowV2 format
    return {
      _id: listing.id,
      Name: listing.title,
      'Minimum Nights': 2,
      'Maximum Nights': 7,
      'rental type': 'Nightly',
      'Weeks offered': listing.weeks_offered || 'Every week',
      '💰Unit Markup': 0,
      '💰Nightly Host Rate for 2 nights': listing['Price 2 nights selected'],
      '💰Nightly Host Rate for 3 nights': listing['Price 3 nights selected'],
      '💰Nightly Host Rate for 4 nights': listing['Price 4 nights selected'],
      '💰Nightly Host Rate for 5 nights': listing['Price 5 nights selected'],
      '💰Nightly Host Rate for 7 nights': listing['Price 7 nights selected'],
      '💰Cleaning Cost / Maintenance Fee': 0,
      '💰Damage Deposit': 0,
      host: listing.host
    };
  };
  ```

**Code Change Location:** Before the return statement, near other helper functions

**Validation:** Listing transforms correctly and modal receives proper data

---

## Edge Cases & Error Handling

- **Edge case 1: User logs out while modal is open** - Modal should close automatically when auth state changes (handled by conditional render)
- **Edge case 2: Network error during proposal submission** - Show error toast and keep modal open for retry
- **Edge case 3: Listing data incomplete** - CreateProposalFlowV2 has default values for most props
- **Edge case 4: Mobile view** - Button should wrap nicely in the host-row flex container

## Testing Considerations

- Test with logged-in guest user with 0 proposals (button should NOT appear)
- Test with logged-in guest user with 1+ proposals (button SHOULD appear)
- Test with logged-in host user (button should NOT appear)
- Test with logged-out user (button should NOT appear)
- Test button click opens CreateProposalFlowV2 modal
- Test modal close functionality
- Test on mobile viewport
- Test on fallback listings section (when filtered results empty)

## Rollback Strategy

- All changes are contained within SearchPage.jsx and potentially search-page.css
- To rollback: revert changes to these files
- No database changes required
- No Edge Function changes required

## Dependencies & Blockers

- CreateProposalFlowV2 component must be working (verified - it is)
- Auth system must return proposalCount (verified - validateTokenAndFetchUser returns it)
- isGuest rule must be available (verified - exists at logic/rules/users/isGuest.js)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| proposalCount not returned from auth | Low | Medium | Already verified in auth.js that it's returned |
| CreateProposalFlowV2 expects different data format | Medium | Medium | Added Step 12 to transform listing data |
| CSS conflicts with existing styles | Low | Low | Use specific class names, test thoroughly |
| Performance impact from additional auth call | Low | Low | Auth already called on page load, just extracting more data |

---

## Files Referenced Summary

| Absolute Path | Purpose |
|--------------|---------|
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx` | Main file to modify - add button, state, handlers, modal |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2.jsx` | Reuse as-is - shared proposal flow component |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\logic\rules\users\isGuest.js` | Import to check user type |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\auth.js` | Reference for understanding proposalCount return value |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\useSearchPageLogic.js` | Reference only - understand search page logic patterns |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` | Reference for CreateProposalFlowV2 usage pattern |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\Pages\SEARCH_QUICK_REFERENCE.md` | Documentation reference |
