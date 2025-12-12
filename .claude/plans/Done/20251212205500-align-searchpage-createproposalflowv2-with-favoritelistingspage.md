# Implementation Plan: Align SearchPage CreateProposalFlowV2 with FavoriteListingsPage

## Overview

The SearchPage currently invokes CreateProposalFlowV2 without the `useFullFlow={true}` prop, causing it to use the SHORT flow (User Details -> Review) rather than the FULL flow (User Details -> Reservation Section -> Days Selection -> Review). This plan aligns SearchPage with FavoriteListingsPage to ensure identical proposal creation behavior.

## Success Criteria

- [ ] SearchPage passes `useFullFlow={true}` to CreateProposalFlowV2
- [ ] SearchPage passes complete `existingUserData` prop (matching FavoriteListingsPage)
- [ ] SearchPage fetches and passes `zatConfig` for accurate pricing calculations
- [ ] Section order is identical: User Info -> Reservation Section (Move-in) -> Days Selection -> Review
- [ ] Price calculations work correctly with no pre-selections (starts fresh)
- [ ] Both pages show identical behavior for first-time and returning users

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SearchPage.jsx` | Target page - needs alignment | Add `useFullFlow={true}`, `zatConfig`, `existingUserData` props |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Reference implementation | None (already correct) |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Comparison - DIFFERENT behavior | None (intentionally different - has pre-selections) |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Shared component | None (already supports both flows) |

### Current Differences

#### FavoriteListingsPage (Reference - CORRECT)
```jsx
<CreateProposalFlowV2
  listing={{
    ...selectedListingForProposal,
    _id: selectedListingForProposal.id || selectedListingForProposal._id,
    Name: selectedListingForProposal.title || selectedListingForProposal.Name,
    host: selectedListingForProposal.host || null
  }}
  moveInDate={moveInDate}
  daysSelected={selectedDayObjects}
  nightsSelected={selectedDayObjects.length > 0 ? selectedDayObjects.length - 1 : 0}
  reservationSpan={reservationSpan}
  pricingBreakdown={priceBreakdown}
  zatConfig={zatConfig}
  isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
  useFullFlow={true}  // <-- KEY DIFFERENCE
  existingUserData={loggedInUserData ? {
    needForSpace: loggedInUserData.needForSpace || '',
    aboutYourself: loggedInUserData.aboutMe || '',
    hasUniqueRequirements: !!loggedInUserData.specialNeeds,
    uniqueRequirements: loggedInUserData.specialNeeds || ''
  } : null}
  onClose={...}
  onSubmit={handleProposalSubmit}
/>
```

#### SearchPage (Current - NEEDS FIX)
```jsx
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  daysSelected={[]}
  nightsSelected={0}
  reservationSpan={13}
  pricingBreakdown={null}
  zatConfig={null}  // <-- MISSING zatConfig
  isFirstProposal={(currentUser?.proposalCount ?? 0) === 0}
  existingUserData={null}  // <-- MISSING existingUserData
  // useFullFlow NOT PASSED (defaults to false)  // <-- MISSING useFullFlow={true}
  onClose={handleCloseCreateProposalModal}
  onSubmit={handleCreateProposalSubmit}
/>
```

#### ViewSplitLeasePage (Different by Design - DO NOT REPLICATE)
```jsx
<CreateProposalFlowV2
  listing={listing}
  moveInDate={moveInDate}  // Pre-selected
  daysSelected={selectedDayObjects}  // Pre-selected from ListingScheduleSelector
  nightsSelected={nightsSelected}  // Pre-calculated
  reservationSpan={reservationSpan}
  pricingBreakdown={priceBreakdown}  // Pre-calculated
  zatConfig={zatConfig}
  isFirstProposal={!loggedInUserData || (loggedInUserData.proposalCount === 0 && !loggedInUserData.needForSpace && !loggedInUserData.aboutMe)}
  // useFullFlow NOT PASSED (defaults to false) - INTENTIONAL for ViewSplitLeasePage
  existingUserData={loggedInUserData ? {...} : null}
  onClose={...}
  onSubmit={handleProposalSubmit}
/>
```

### Existing Patterns to Follow

1. **FavoriteListingsPage Pattern**: Fetches `zatConfig` via `fetchZatPriceConfiguration()` on mount
2. **FavoriteListingsPage Pattern**: Fetches `loggedInUserData` with user profile fields for prefilling
3. **Full Flow Pattern**: `useFullFlow={true}` activates the `FULL_FIRST_PROPOSAL_FLOW = [2, 3, 4, 1]` which is:
   - Section 2: User Details
   - Section 3: Move-in (Reservation Section)
   - Section 4: Days Selection
   - Section 1: Review

## Implementation Steps

### Step 1: Add zatConfig State and Fetch Logic

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Enable accurate pricing calculations in CreateProposalFlowV2

**Details:**
1. Import `fetchZatPriceConfiguration` from `../../lib/listingDataFetcher.js`
2. Add state variable: `const [zatConfig, setZatConfig] = useState(null);`
3. Add useEffect to fetch zatConfig on mount:
```jsx
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

**Validation:** Console log shows zatConfig is fetched successfully

---

### Step 2: Add loggedInUserData State and Fetch Logic

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Enable user profile data prefilling in CreateProposalFlowV2

**Details:**
1. Add state variable: `const [loggedInUserData, setLoggedInUserData] = useState(null);`
2. In the existing auth check useEffect (where `currentUser` is set), add a query to fetch additional user profile fields:
```jsx
// After setting currentUser, fetch additional profile data
try {
  const { data: userProposalData, error: propError } = await supabase
    .from('user')
    .select('"About Me / Bio", "need for Space", "special needs", "Proposals List"')
    .eq('_id', sessionId)
    .single();

  if (!propError && userProposalData) {
    const proposalsList = userProposalData['Proposals List'];
    const proposalCount = Array.isArray(proposalsList) ? proposalsList.length : 0;
    setLoggedInUserData({
      aboutMe: userProposalData['About Me / Bio'] || '',
      needForSpace: userProposalData['need for Space'] || '',
      specialNeeds: userProposalData['special needs'] || '',
      proposalCount: proposalCount
    });
  }
} catch (e) {
  console.warn('Failed to fetch user proposal data:', e);
}
```

**Validation:** Console log shows loggedInUserData is populated for authenticated users

---

### Step 3: Update CreateProposalFlowV2 Invocation

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Pass all required props for full flow behavior

**Details:**
Update the CreateProposalFlowV2 component invocation (around line 2424) from:
```jsx
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  daysSelected={[]}
  nightsSelected={0}
  reservationSpan={13}
  pricingBreakdown={null}
  zatConfig={null}
  isFirstProposal={(currentUser?.proposalCount ?? 0) === 0}
  existingUserData={null}
  onClose={handleCloseCreateProposalModal}
  onSubmit={handleCreateProposalSubmit}
/>
```

To:
```jsx
<CreateProposalFlowV2
  listing={transformListingForProposal(selectedListingForProposal)}
  moveInDate=""
  daysSelected={[]}
  nightsSelected={0}
  reservationSpan={13}
  pricingBreakdown={null}
  zatConfig={zatConfig}
  isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}
  useFullFlow={true}
  existingUserData={loggedInUserData ? {
    needForSpace: loggedInUserData.needForSpace || '',
    aboutYourself: loggedInUserData.aboutMe || '',
    hasUniqueRequirements: !!loggedInUserData.specialNeeds,
    uniqueRequirements: loggedInUserData.specialNeeds || ''
  } : null}
  onClose={handleCloseCreateProposalModal}
  onSubmit={handleCreateProposalSubmit}
/>
```

**Key Changes:**
1. `zatConfig={zatConfig}` - passes the fetched ZAT price configuration
2. `useFullFlow={true}` - enables full flow: User Details -> Move-in -> Days -> Review
3. `isFirstProposal={!loggedInUserData || loggedInUserData.proposalCount === 0}` - matches FavoriteListingsPage logic
4. `existingUserData={...}` - passes user profile data for prefilling

**Validation:**
- Open SearchPage, click "Create Proposal" on a listing
- Flow should be: User Details -> Move-in (Reservation Section) -> Days Selection -> Review
- User profile fields should be prefilled if user has existing data

---

### Step 4: Add Import Statement

**Files:** `app/src/islands/pages/SearchPage.jsx`
**Purpose:** Import the required function

**Details:**
Add to the imports section (around line 21):
```jsx
import { fetchZatPriceConfiguration } from '../../lib/listingDataFetcher.js';
```

**Validation:** No import errors on page load

---

## Edge Cases & Error Handling

1. **zatConfig fetch fails**: Warning logged, CreateProposalFlowV2 handles null zatConfig gracefully (uses default pricing)
2. **loggedInUserData fetch fails**: Warning logged, existingUserData will be null, form fields start empty
3. **User not logged in**: loggedInUserData is null, isFirstProposal is true, existingUserData is null - flow works correctly
4. **User has no prior proposals**: isFirstProposal is true, uses sequential flow starting at User Details

## Testing Considerations

### Manual Testing Checklist
- [ ] **First-time guest user**: Flow should be User Details -> Move-in -> Days -> Review
- [ ] **Returning guest user with proposals**: Same flow (useFullFlow=true ignores isFirstProposal for flow selection)
- [ ] **Returning guest user with profile data**: Profile fields should be prefilled
- [ ] **Guest not logged in**: Should still work, shows User Details first
- [ ] **Price calculations**: Should update correctly when days are selected
- [ ] **Mobile view**: Flow should work correctly on mobile devices

### Comparison Testing
- [ ] Open FavoriteListingsPage and SearchPage side by side
- [ ] Create a proposal from each page for the same listing
- [ ] Verify identical section order and behavior
- [ ] Verify pricing calculations match when same days are selected

## Rollback Strategy

If issues arise:
1. Remove `useFullFlow={true}` prop to revert to short flow
2. Remove `zatConfig` state and prop (defaults to null which is handled)
3. Remove `existingUserData` state and prop (defaults to null which is handled)
4. Remove `loggedInUserData` state and related fetch logic

## Dependencies & Blockers

- **None**: All required components and utilities already exist
- FavoriteListingsPage serves as a working reference implementation
- CreateProposalFlowV2 already supports both flows via the `useFullFlow` prop

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Price calculation errors | Low | Medium | zatConfig fallback to null is already handled |
| User data fetch failure | Low | Low | Graceful degradation - form works with empty fields |
| Breaking existing SearchPage functionality | Low | High | Changes are additive, not modifying existing logic |
| Performance impact from additional data fetches | Low | Low | zatConfig and user data are small payloads |

---

## Summary of Changes

### Files to Modify

1. **`app/src/islands/pages/SearchPage.jsx`**
   - Add import for `fetchZatPriceConfiguration`
   - Add `zatConfig` state and fetch useEffect
   - Add `loggedInUserData` state and fetch logic in auth useEffect
   - Update CreateProposalFlowV2 invocation with new props

### Files Unchanged (Reference Only)

- `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` - Reference implementation
- `app/src/islands/pages/ViewSplitLeasePage.jsx` - Intentionally different (has pre-selections)
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Already supports both flows

---

**Plan Version:** 1.0
**Created:** 2025-12-12T20:55:00
**Author:** Implementation Planner

## Referenced Files Summary

| File Path | Lines Referenced | Purpose |
|-----------|------------------|---------|
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SearchPage.jsx` | 1-700, 2420-2440 | Target file for changes |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\FavoriteListingsPage\FavoriteListingsPage.jsx` | Full file | Reference implementation |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ViewSplitLeasePage.jsx` | 2670-2695 | Comparison (different by design) |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\CreateProposalFlowV2.jsx` | Full file | Shared component documentation |
| `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\Documentation\miniCLAUDE.md` | Full file | Architecture patterns |
