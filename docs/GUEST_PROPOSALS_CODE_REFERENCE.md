# Guest Proposals - Code Reference Guide

**Purpose**: Quick reference for all files and line numbers related to day selection display

---

## Component Architecture

### Entry Point

**File**: `app/src/islands/pages/GuestProposalsPage.jsx`
**Lines**: 75-96 (main logic hook call)
**Lines**: 133-139 (ProposalCard rendering)

```javascript
// How data flows to ProposalCard
const {
  selectedProposal,
  transformedProposal,
  statusConfig,
  // ... other state
} = useGuestProposalsPageLogic();

// Passes both raw AND transformed proposal
<ProposalCard
  proposal={selectedProposal}               // Raw proposal
  transformedProposal={transformedProposal} // Transformed
  statusConfig={statusConfig}
/>
```

### Business Logic Hook

**File**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`
**Key Functions**:
- Lines 25-161: `useGuestProposalsPageLogic()` main hook
- Lines 46-61: `loadProposals()` - fetches data
- Lines 76-87: `handleProposalSelect()` - handles dropdown selection
- Lines 103-134: Derived state calculations

```javascript
// Key logic
const loadProposals = useCallback(async () => {
  const data = await fetchUserProposalsFromUrl();  // <-- Data load
  setSelectedProposal(data.selectedProposal);
}, []);

// selectedProposal is the RAW object from fetchUserProposalsFromUrl()
// It's passed directly to ProposalCard without modification
```

### Display Component (Where Day Badges Render)

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`
**Key Sections**:
- Lines 132-159: Component props and data extraction
- Lines 61-84: `getAllDaysWithSelection()` function (CRITICAL)
- Lines 224-233: Rendering the day badges

#### Day Selection Logic (Lines 61-84)

```javascript
/**
 * Get all days with selection status
 * Handles both text day names (from Supabase) and numeric indices (legacy Bubble format)
 */
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];

  // Determine if we're dealing with text day names or numeric indices
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    // Text format: ["Monday", "Tuesday", "Wednesday", etc.]
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    // Numeric format: Bubble 1-indexed [2, 3, 4, 5, 6] for Mon-Fri
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1) // Convert to Bubble 1-indexed
    }));
  }
}
```

#### Constants (Lines 15-17)

```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

#### Day Selection Extraction (Line 154)

```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
```

**Note**: Falls back to `hcDaysSelected` if `"Days Selected"` is falsy.

#### Day Badges Rendering (Lines 224-233)

```jsx
{/* Day selector badges */}
<div className="day-badges-row">
  {allDays.map((day) => (
    <div
      key={day.index}
      className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
    >
      {day.letter}
    </div>
  ))}
</div>
```

---

## Data Flow Chain

### 1. Supabase Query Layer

**File**: `app/src/lib/proposals/userProposalQueries.js`

#### Fetch User Data (Lines 23-51)

```javascript
export async function fetchUserWithProposalList(userId) {
  const { data, error } = await supabase
    .from('user')
    .select(`
      _id,
      "Name - First",
      "Name - Last",
      "Name - Full",
      "Profile Photo",
      "email as text",
      "Proposals List"
    `)
    .eq('_id', userId)
    .maybeSingle();

  return data;
}
```

#### Fetch Proposals by IDs (Lines 95-455)

**Key section - Field selection (Lines 102-136)**:

```javascript
const { data: proposals, error: proposalError } = await supabase
  .from('proposal')
  .select(`
    _id,
    "Status",
    "Deleted",
    "Guest",
    "Listing",
    "Days Selected",              // <-- THIS FIELD (line 110)
    "Nights Selected (Nights list)",
    "Reservation Span (Weeks)",
    "nights per week (num)",
    "check in day",
    "check out day",
    "Move in range start",
    "Move in range end",
    "Total Price for Reservation (guest)",
    "proposal nightly price",
    "cleaning fee",
    "damage deposit",
    "counter offer happened",
    "hc days selected",           // <-- FALLBACK FIELD (line 123)
    "hc reservation span (weeks)",
    "hc total price",
    "hc nightly price",
    "Created Date",
    "Modified Date",
    "about_yourself",
    "special_needs",
    "reason for cancellation",
    "rental application",
    "virtual meeting",
    "Is Finalized",
    "House Rules"
  `)
  .in('_id', proposalIds)
  .order('"Created Date"', { ascending: false });
```

#### Return Enriched Proposals (Lines 404-451)

```javascript
const enrichedProposals = validProposals.map((proposal) => {
  const listing = listingMap.get(proposal.Listing);
  const host = listing ? hostMap.get(listing['Host / Landlord']) : null;
  const guest = guestMap.get(proposal.Guest);
  const boroughName = listing ? boroughMap.get(listing['Location - Borough']) : null;
  const hoodName = listing ? hoodMap.get(listing['Location - Hood']) : null;
  const featuredPhotoUrl = listing ? featuredPhotoMap.get(listing._id) : null;
  const virtualMeeting = vmMap.get(proposal._id) || null;

  // Resolve house rules...
  const houseRulesResolved = proposalHouseRuleIds
    .map(id => houseRulesMap.get(id))
    .filter(Boolean);

  return {
    ...proposal,  // <-- All fields passed through unchanged
    listing: { ...listing, host, boroughName, hoodName, featuredPhotoUrl },
    guest: guest || null,
    virtualMeeting,
    houseRules: houseRulesResolved
  };
});
```

**Critical Point**: `"Days Selected"` field is NOT transformed here. It's passed through as-is.

#### Main Flow Function (Lines 463-520)

```javascript
export async function fetchUserProposalsFromUrl() {
  const userId = getUserIdFromPath();
  if (!userId) {
    throw new Error('No user ID found in URL path. Expected: /guest-proposals/{userId}');
  }

  const user = await fetchUserWithProposalList(userId);
  const proposalIds = extractProposalIds(user);

  if (proposalIds.length === 0) {
    return { user, proposals: [], selectedProposal: null };
  }

  const proposals = await fetchProposalsByIds(proposalIds);  // <-- Enriched proposals

  if (proposals.length === 0) {
    return { user, proposals: [], selectedProposal: null };
  }

  const preselectedId = getProposalIdFromQuery();
  let selectedProposal = null;

  if (preselectedId) {
    selectedProposal = proposals.find(p => p._id === preselectedId);
    if (!selectedProposal) {
      selectedProposal = proposals[0] || null;
    }
  } else {
    selectedProposal = proposals[0] || null;
  }

  return {
    user,
    proposals,
    selectedProposal  // <-- This is the raw enriched proposal
  };
}
```

### 2. Data Transformation Layer

**File**: `app/src/lib/proposals/dataTransformers.js`

#### transformProposalData (Lines 141-190)

```javascript
export function transformProposalData(rawProposal) {
  if (!rawProposal) return null;

  const rawListing = rawProposal.listing;
  const rawHost = rawListing?.host;
  const rawGuest = rawProposal.guest;
  const rawVirtualMeeting = rawProposal.virtualMeeting;

  return {
    id: rawProposal._id,
    status: rawProposal.Status,
    deleted: rawProposal.Deleted,
    daysSelected: rawProposal['Days Selected'],  // <-- NO TRANSFORMATION (line 154)
    nightsSelected: rawProposal['Nights Selected (Nights list)'],
    reservationWeeks: rawProposal['Reservation Span (Weeks)'],
    nightsPerWeek: rawProposal['nights per week (num)'],
    checkInDay: rawProposal['check in day'],
    checkOutDay: rawProposal['check out day'],
    moveInStart: rawProposal['Move in range start'],
    moveInEnd: rawProposal['Move in range end'],
    totalPrice: rawProposal['Total Price for Reservation (guest)'],
    nightlyPrice: rawProposal['proposal nightly price'],
    cleaningFee: rawProposal['cleaning fee'],
    damageDeposit: rawProposal['damage deposit'],
    counterOfferHappened: rawProposal['counter offer happened'],
    hcDaysSelected: rawProposal['hc days selected'],
    hcReservationWeeks: rawProposal['hc reservation span (weeks)'],
    hcTotalPrice: rawProposal['hc total price'],
    hcNightlyPrice: rawProposal['hc nightly price'],
    createdDate: rawProposal['Created Date'],
    modifiedDate: rawProposal['Modified Date'],
    aboutYourself: rawProposal.about_yourself,
    specialNeeds: rawProposal.special_needs,
    reasonForCancellation: rawProposal['reason for cancellation'],
    proposalStage: rawProposal['Proposal Stage'],
    rentalApplicationId: rawProposal['rental application'],
    virtualMeetingId: rawProposal['virtual meeting'],
    isFinalized: rawProposal['Is Finalized'],

    // House rules (resolved from query layer)
    houseRules: rawProposal.houseRules || [],

    // Nested transformed data
    listing: transformListingData(rawListing),
    host: transformHostData(rawHost),
    guest: transformGuestData(rawGuest),
    virtualMeeting: transformVirtualMeetingData(rawVirtualMeeting)
  };
}
```

**Issue**: `daysSelected` is a direct copy with no normalization.

---

## Styling

**File**: `app/src/styles/components/guest-proposals.css`

### Day Badges Styling (Lines 307-332)

```css
/* Day Badges Row */
.day-badges-row {
  display: flex;
  gap: 4px;
  margin-bottom: 15px;
}

.day-badge-v2 {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  background-color: #B2B2B2;  /* GRAY - unselected */
  color: #424242;
  transition: all 0.2s;
}

.day-badge-v2.selected {
  background-color: #4B47CE;  /* PURPLE - selected */
  color: white;
}
```

**Rendering Rule** (from ProposalCard line 228):
```jsx
className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
```

---

## Related Components NOT Used

### HostScheduleSelector (Not used in guest proposals)

**File**: `app/src/islands/shared/HostScheduleSelector/HostScheduleSelector.jsx`

**Why not used**: This component is for listing creation (selecting available nights for hosts), not for displaying selected proposal days.

---

## Recent Commits

### Commit: `0924b96` - "fix: handle text day names from Supabase in ProposalCard"

**Date**: Nov 30, 04:57:49 UTC

**File Modified**: `app/src/islands/pages/proposals/ProposalCard.jsx`
**Changes**: +57 lines, -9 lines

**What was fixed**: Updated `getCheckInOutRange()` and `getAllDaysWithSelection()` to handle both:
- Text format from Supabase: `"Monday"`, `"Friday"`, etc.
- Numeric format from legacy Bubble: `1=Sunday, 7=Saturday`

**Relevant commit message**:
```
This fixes the schedule-text display showing check-in/out days and the
day-badges-row showing selected days correctly from proposal data.
```

### Commit: `590f209` - "style: change day badges from circles to squircles"

**Date**: Earlier commit
**Changes**: CSS changes to border-radius for day badges

### Commit: `4c16484` - "fix: fetch house rules from proposal table instead of listing"

**Date**: Recent
**Note**: Indicates ongoing data structure changes

---

## Database Schema Reference

**Table**: `proposal`
**Field**: `"Days Selected"`
**Type**: Unknown (needs verification)
**Source**: Synced from Bubble.io

**Possible formats**:
1. JSON array: `["Monday", "Tuesday", "Wednesday"]`
2. JSON string: `'["Monday", "Tuesday", "Wednesday"]'`
3. Bubble numeric: `[2, 3, 4, 5, 6]`
4. Text string: `"Monday,Tuesday,Wednesday"`

---

## Testing & Debugging

### Quick Debug in Browser Console

```javascript
// In ProposalCard component, add:
console.log('Days Selected Raw:', proposal['Days Selected']);
console.log('Type:', typeof proposal['Days Selected']);
console.log('Is Array:', Array.isArray(proposal['Days Selected']));

if (Array.isArray(proposal['Days Selected']) && proposal['Days Selected'].length > 0) {
  console.log('First element:', proposal['Days Selected'][0]);
  console.log('First element type:', typeof proposal['Days Selected'][0]);
}

// Check the computed value
const isTextFormat =
  proposal['Days Selected']?.length > 0 &&
  typeof proposal['Days Selected'][0] === 'string';
console.log('Is Text Format:', isTextFormat);
```

### Key Questions to Answer

1. **What is the actual format of "Days Selected" in Supabase?**
   - Check the proposal table directly in Supabase Dashboard
   - Look at a sample row's "Days Selected" field

2. **Is it being fetched correctly?**
   - Log in `fetchProposalsByIds()` before returning

3. **Is the transformation working?**
   - Log in `getAllDaysWithSelection()` when ProposalCard renders

4. **Is the rendering applying the CSS class?**
   - Browser DevTools inspect `.day-badge-v2` elements
   - Check if any have the `.selected` class

---

## Files Summary Table

| Purpose | File | Key Lines |
|---------|------|-----------|
| **Entry Point** | `GuestProposalsPage.jsx` | 75-96, 133-139 |
| **Logic Hook** | `useGuestProposalsPageLogic.js` | 25-161 |
| **Data Query** | `userProposalQueries.js` | 463-520 |
| **Data Transform** | `dataTransformers.js` | 141-190 |
| **Display Logic** | `ProposalCard.jsx` | 154-155 |
| **Day Selection** | `ProposalCard.jsx` | 61-84 |
| **Rendering** | `ProposalCard.jsx` | 224-233 |
| **Styling** | `guest-proposals.css` | 307-332 |

---

## Next Steps for Investigation

1. **Check actual Supabase data format** (highest priority)
2. **Add debug logging** to ProposalCard.jsx
3. **Test with different data formats** (text vs numeric)
4. **Verify no data transformation issues** upstream
5. **Check for timing issues** with async data loading
