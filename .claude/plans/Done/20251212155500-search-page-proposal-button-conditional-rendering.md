# Implementation Plan: Search Page Create Proposal Button Conditional Rendering

## Overview
Add conditional rendering logic to the Create Proposal button on the Search Page to show different states based on user authentication and proposal history: hidden for logged-out users, "Create Proposal" for logged-in guests with 1+ proposals (but not for the specific listing), and "View Proposal" with navigation to guest proposals page for users who already have a proposal for that specific listing.

## Success Criteria
- [ ] Button is completely hidden for logged-out users
- [ ] Button shows "Create Proposal" only for logged-in guests who have at least 1 proposal total (and no proposal for the specific listing)
- [ ] Button shows "View Proposal" and navigates to guest proposals page when user has an existing proposal for that specific listing
- [ ] No performance regression from fetching proposal data
- [ ] Consistent styling with FavoriteListingsPage implementation

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Main search page component with PropertyCard | Add `proposalsByListingId` state, pass to PropertyCard, update conditional rendering |
| `app/src/lib/proposalDataFetcher.js` | Utility for fetching proposals by guest | Already has `fetchProposalsByGuest` - reuse this |
| `app/src/styles/components/listings.css` | Button styling | Add `.view-proposal-btn` styles |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Reference implementation | Use as pattern for proposal checking |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.css` | Reference CSS | Copy `.view-proposal-btn` styles |

### Related Documentation
- [miniCLAUDE.md](.claude/Documentation/miniCLAUDE.md) - Architecture patterns
- [SEARCH_QUICK_REFERENCE.md](.claude/Documentation/Pages/SEARCH_QUICK_REFERENCE.md) - Search page specifics
- [GUEST_PROPOSALS_QUICK_REFERENCE.md](.claude/Documentation/Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) - Proposal navigation

### Existing Patterns to Follow
- **FavoriteListingsPage Pattern**: Uses `proposalsByListingId` Map to track proposals per listing, fetches via `fetchProposalsByGuest`, and conditionally renders "Create Proposal" vs "View Proposal" buttons
- **Hollow Component Pattern**: SearchPage delegates logic to component, data fetched in initialization effect
- **Session-based user identification**: Use `getSessionId()` from `lib/secureStorage.js`

## Implementation Steps

### Step 1: Add Import for fetchProposalsByGuest
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Import the existing proposal fetching utility
**Details:**
- Add import statement: `import { fetchProposalsByGuest } from '../../lib/proposalDataFetcher.js';`
- Place near other lib imports (around line 14)
**Validation:** No syntax errors, file compiles

### Step 2: Add State for proposalsByListingId
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Track which listings the user has existing proposals for
**Details:**
- Add new state variable: `const [proposalsByListingId, setProposalsByListingId] = useState(new Map());`
- Place in the State Management section (around line 891-900 where other useState hooks are)
**Validation:** State variable is accessible in component

### Step 3: Fetch User Proposals After Auth Check
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Load user's existing proposals when logged in as a guest
**Details:**
- In the existing auth check useEffect (around line 900-960), after setting currentUser with proposalCount, add:
```javascript
// Fetch user's proposals to check if any exist for specific listings
if (userIsGuest && userId) {
  try {
    const proposals = await fetchProposalsByGuest(userId);
    console.log(`[SearchPage] Loaded ${proposals.length} proposals for user`);

    // Create a map of listing ID to proposal (only include non-terminal proposals)
    const proposalsMap = new Map();
    proposals.forEach(proposal => {
      const listingId = proposal.Listing;
      if (listingId) {
        // If multiple proposals exist for same listing, keep the most recent one
        // (proposals are already sorted by Created Date descending)
        if (!proposalsMap.has(listingId)) {
          proposalsMap.set(listingId, proposal);
        }
      }
    });

    setProposalsByListingId(proposalsMap);
    console.log(`[SearchPage] Mapped ${proposalsMap.size} listings with proposals`);
  } catch (proposalErr) {
    console.warn('[SearchPage] Failed to fetch proposals (non-critical):', proposalErr);
    // Don't fail the page if proposals can't be loaded - just show Create Proposal for all
  }
}
```
- This should be added after the `setCurrentUser` call (around line 950-960)
**Validation:** Console shows proposal fetch logs, no errors on page load

### Step 4: Update showCreateProposalButton Logic
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Keep existing logic for overall visibility, but button type depends on per-listing check
**Details:**
- The existing `showCreateProposalButton` useMemo (around line 1978-1985) stays as-is for determining if ANY proposal button should show
- The per-listing check will happen inside PropertyCard
**Validation:** No changes to existing behavior for button visibility logic

### Step 5: Pass proposalsByListingId to ListingsGrid
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Make proposal data available to PropertyCard components
**Details:**
- Find the ListingsGrid component render (around line 2160-2180)
- Add new prop: `proposalsByListingId={proposalsByListingId}`
**Validation:** ListingsGrid receives the prop without errors

### Step 6: Update ListingsGrid Component Signature
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Accept new proposalsByListingId prop
**Details:**
- Find ListingsGrid function definition (around line 676)
- Add `proposalsByListingId` to destructured props
- Pass down to PropertyCard: `proposalForListing={proposalsByListingId?.get(listing.id) || null}`
**Validation:** Props flow through correctly

### Step 7: Update PropertyCard Component Signature
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Accept proposalForListing prop for conditional rendering
**Details:**
- Find PropertyCard function definition (around line 520)
- Add `proposalForListing` to destructured props
**Validation:** PropertyCard receives the prop

### Step 8: Update PropertyCard Button Conditional Rendering
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Show "View Proposal" or "Create Proposal" based on existing proposal
**Details:**
- Find the existing Create Proposal button block (around lines 629-647)
- Replace the single button with conditional rendering:
```jsx
{/* Proposal CTAs - Show Create or View based on existing proposal */}
{showCreateProposalButton && (
  proposalForListing ? (
    <button
      className="view-proposal-btn"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `/guest-proposals?proposal=${proposalForListing._id}`;
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      View Proposal
    </button>
  ) : (
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
  )
)}
```
**Validation:** Button renders correctly based on proposal existence

### Step 9: Add View Proposal Button CSS
**Files:** `app/src/styles/components/listings.css`
**Purpose:** Style the new View Proposal button consistently
**Details:**
- Add after the existing `.create-proposal-btn` styles (around line 582):
```css
/* View Proposal Button - For listings with existing proposals */
.listing-host-row .view-proposal-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
    white-space: nowrap;
    min-width: 100px;
}

.listing-host-row .view-proposal-btn:hover {
    background: #047857;
    box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.listing-host-row .view-proposal-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}
```
- Also add to the stacked variant (around line 612):
```css
.listing-host-row--stacked .view-proposal-btn {
    padding: 6px 12px;
    font-size: 12px;
    min-width: auto;
}
```
**Validation:** Button appears with green styling, distinct from purple Create Proposal button

### Step 10: Update Proposal Map After Successful Submission
**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Immediately show "View Proposal" after user creates a proposal
**Details:**
- Find handleCreateProposalSubmit function (around line 1860)
- After successful submission, update the proposals map:
```javascript
const handleCreateProposalSubmit = async (proposalData) => {
  console.log('Creating proposal from Search page:', proposalData);
  // Close the modal and show a success toast
  setIsCreateProposalModalOpen(false);

  // Update proposals map to show "View Proposal" instead of "Create Proposal"
  if (proposalData?.proposalId && selectedListingForProposal) {
    setProposalsByListingId(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedListingForProposal.id, { _id: proposalData.proposalId });
      return newMap;
    });
  }

  setSelectedListingForProposal(null);
  showToast('Proposal submitted successfully!', 'success');
};
```
**Validation:** After creating a proposal, the button immediately switches to "View Proposal"

## Edge Cases & Error Handling
- **User logs out mid-session**: proposalsByListingId should be cleared when auth state changes to logged-out
- **Proposal fetch fails**: Non-critical failure - show Create Proposal button for all listings (graceful degradation)
- **User is a Host, not a Guest**: Button remains hidden (existing logic handles this)
- **Listing ID mismatch**: Ensure proposal.Listing matches listing.id (same format, no type coercion issues)
- **Multiple proposals for same listing**: Keep only the most recent (non-deleted) proposal

## Testing Considerations
- Test as logged-out user: Button should not appear
- Test as logged-in Guest with 0 proposals: Button should not appear
- Test as logged-in Guest with 1+ proposals but none for displayed listings: "Create Proposal" should show
- Test as logged-in Guest with existing proposal for a specific listing: "View Proposal" should show and navigate correctly
- Test as logged-in Host: Button should not appear
- Test creating a new proposal: Button should switch from "Create Proposal" to "View Proposal"
- Verify navigation to `/guest-proposals?proposal={id}` works correctly

## Rollback Strategy
- Revert all changes to SearchPage.jsx
- Revert CSS additions to listings.css
- No database changes required

## Dependencies & Blockers
- Requires `fetchProposalsByGuest` from `lib/proposalDataFetcher.js` (already exists)
- Requires authenticated session with user ID
- No external API changes needed

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance impact from additional API call | Low | Low | Parallel fetch with existing user data, cached in Map |
| Race condition with auth state | Low | Medium | Fetch proposals only after auth is confirmed |
| UI flash when proposals load | Medium | Low | Button only shows after auth check completes |

---

## Referenced Files Summary

### Files to Modify
1. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx`
   - Add import for fetchProposalsByGuest
   - Add proposalsByListingId state
   - Fetch proposals in auth useEffect
   - Pass proposalsByListingId through ListingsGrid to PropertyCard
   - Update PropertyCard button conditional rendering
   - Update handleCreateProposalSubmit

2. `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\listings.css`
   - Add .view-proposal-btn styles
   - Add .view-proposal-btn:hover styles
   - Add .view-proposal-btn svg styles
   - Add stacked variant styles

### Files for Reference (No Changes)
- `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\proposalDataFetcher.js` - fetchProposalsByGuest function
- `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx` - Pattern reference
- `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.css` - CSS reference

---

**Plan Version**: 1.0
**Created**: 2025-12-12
**Author**: Claude (Implementation Planning Architect)
