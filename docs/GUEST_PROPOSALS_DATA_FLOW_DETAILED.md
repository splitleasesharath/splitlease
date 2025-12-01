# Guest Proposals - Detailed Data Flow & Code Analysis

**Date**: 2025-11-30
**Purpose**: Deep dive into data transformation pipeline for guest proposals page

---

## Complete Data Pipeline

### Step 1: Load Phase (`useGuestProposalsPageLogic` → `fetchUserProposalsFromUrl`)

**File**: `app/src/lib/proposals/userProposalQueries.js:463-520`

```javascript
export async function fetchUserProposalsFromUrl() {
  const userId = getUserIdFromPath();
  const user = await fetchUserWithProposalList(userId);
  const proposalIds = extractProposalIds(user);
  const proposals = await fetchProposalsByIds(proposalIds);

  // Returns enriched proposals with listing, host, guest data
  return { user, proposals, selectedProposal };
}
```

### Step 2: Data Enrichment Phase (`fetchProposalsByIds`)

**File**: `app/src/lib/proposals/userProposalQueries.js:95-455`

#### Key Fields Fetched (Line 103-136):
```javascript
const { data: proposals, error: proposalError } = await supabase
  .from('proposal')
  .select(`
    _id,
    "Status",
    "Deleted",
    "Guest",
    "Listing",
    "Days Selected",              // <-- THIS FIELD
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
    "hc days selected",           // <-- FALLBACK FIELD
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

#### Return Structure (Line 405-451):
```javascript
const enrichedProposals = validProposals.map((proposal) => {
  return {
    ...proposal,  // <-- ALL original fields preserved
    listing: { ...listing, host, boroughName, hoodName, featuredPhotoUrl },
    guest: guest || null,
    virtualMeeting,
    houseRules: houseRulesResolved
  };
});
```

**CRITICAL**: The raw `"Days Selected"` field is passed through unchanged. It comes directly from Supabase.

### Step 3: Selection Phase (`handleProposalSelect`)

**File**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js:76-87`

```javascript
const handleProposalSelect = useCallback((proposalId) => {
  const proposal = proposals.find(p => p._id === proposalId);
  if (proposal) {
    setSelectedProposal(proposal);  // <-- Raw proposal with all fields
    const userId = getUserIdFromPath();
    if (userId) {
      updateUrlWithProposal(userId, proposalId);
    }
  }
}, [proposals]);
```

**Note**: No transformation here. The proposal object passed is the raw enriched object from Step 2.

### Step 4: Transformation Phase (`transformProposalData`)

**File**: `app/src/lib/proposals/dataTransformers.js:141-190`

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
    daysSelected: rawProposal['Days Selected'],  // <-- NO TRANSFORMATION
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
    // ... more fields ...
    listing: transformListingData(rawListing),
    host: transformHostData(rawHost),
    guest: transformGuestData(rawGuest),
    virtualMeeting: transformVirtualMeetingData(rawVirtualMeeting)
  };
}
```

**Issue Identified**: `daysSelected` is copied directly without any normalization or type checking.

### Step 5: Component Passing Phase

**File**: `app/src/islands/pages/GuestProposalsPage.jsx:75-96`

```javascript
export default function GuestProposalsPage() {
  const {
    // Raw data
    user,
    proposals,
    selectedProposal,      // <-- Raw proposal from Step 3

    // Transformed/derived data
    transformedProposal,   // <-- Transformed proposal (daysSelected from Step 4)
    statusConfig,
    currentStage,
    formattedStages,
    proposalOptions,

    // UI state
    isLoading,
    error,

    // Handlers
    handleProposalSelect,
    handleRetry
  } = useGuestProposalsPageLogic();

  return (
    <>
      {/* ... */}
      {selectedProposal && (
        <ProposalCard
          proposal={selectedProposal}               // <-- Raw proposal
          transformedProposal={transformedProposal} // <-- Transformed
          statusConfig={statusConfig}
        />
      )}
    </>
  );
}
```

**Note**: Both raw AND transformed proposals are passed to ProposalCard.

### Step 6: Display Phase (`ProposalCard`)

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx:132-159`

```javascript
export default function ProposalCard({ proposal, transformedProposal, statusConfig }) {
  if (!proposal) {
    return null;
  }

  // ... extract data from RAW proposal object ...

  // Schedule info
  const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
  const allDays = getAllDaysWithSelection(daysSelected);

  // ... rendering uses daysSelected ...
}
```

**Critical**: ProposalCard uses the RAW proposal object, not the transformed one!

---

## The Day Selection Logic - Deep Dive

### Function: `getAllDaysWithSelection` (Lines 61-84)

```javascript
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];  // Step 1: Fallback to empty array

  // Step 2: Determine format
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    // Branch A: Text format ["Monday", "Tuesday", ...]
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    // Branch B: Numeric format [2, 3, 4, 5, 6] (Bubble 1-indexed)
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1)  // Convert 0-based to 1-based
    }));
  }
}
```

### Constants (Lines 15-17)

```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

### Rendering Logic (Lines 224-232)

```jsx
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

## Detailed Format Analysis

### Format 1: Text Format (Supabase stored as text array)

```
Input: daysSelected = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

Step 1: isTextFormat check
  days.length > 0? YES (5 elements)
  typeof days[0] === 'string'? YES ("Monday")
  isTextFormat = TRUE

Step 2: Create selection set
  selectedSet = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}

Step 3: Map through DAY_LETTERS
  index=0 ('S'): selectedSet.has(DAY_NAMES[0]='Sunday')    → false ✓
  index=1 ('M'): selectedSet.has(DAY_NAMES[1]='Monday')    → true  ✓
  index=2 ('T'): selectedSet.has(DAY_NAMES[2]='Tuesday')   → true  ✓
  index=3 ('W'): selectedSet.has(DAY_NAMES[3]='Wednesday') → true  ✓
  index=4 ('T'): selectedSet.has(DAY_NAMES[4]='Thursday')  → true  ✓
  index=5 ('F'): selectedSet.has(DAY_NAMES[5]='Friday')    → true  ✓
  index=6 ('S'): selectedSet.has(DAY_NAMES[6]='Saturday')  → false ✓

Output: [
  { index: 0, letter: 'S', selected: false },
  { index: 1, letter: 'M', selected: true },
  { index: 2, letter: 'T', selected: true },
  { index: 3, letter: 'W', selected: true },
  { index: 4, letter: 'T', selected: true },
  { index: 5, letter: 'F', selected: true },
  { index: 6, letter: 'S', selected: false }
]
```

### Format 2: Numeric Format (Bubble 1-indexed)

```
Input: daysSelected = [2, 3, 4, 5, 6]  (Monday through Friday in Bubble format)

Step 1: isTextFormat check
  days.length > 0? YES (5 elements)
  typeof days[0] === 'string'? NO (2 is number)
  isTextFormat = FALSE

Step 2: Create selection set
  selectedSet = {2, 3, 4, 5, 6}

Step 3: Map through DAY_LETTERS
  index=0 ('S'): selectedSet.has(0+1=1) → false ✓
  index=1 ('M'): selectedSet.has(1+1=2) → true  ✓
  index=2 ('T'): selectedSet.has(2+1=3) → true  ✓
  index=3 ('W'): selectedSet.has(3+1=4) → true  ✓
  index=4 ('T'): selectedSet.has(4+1=5) → true  ✓
  index=5 ('F'): selectedSet.has(5+1=6) → true  ✓
  index=6 ('S'): selectedSet.has(6+1=7) → false ✓

Output: (same as Format 1)
```

### Format 3: Empty Array (PROBLEM CASE)

```
Input: daysSelected = []

Step 1: isTextFormat check
  days.length > 0? NO (0 elements)
  isTextFormat = FALSE  ❌ Falls through to numeric handling

Step 2: Create selection set
  selectedSet = {} (empty set)

Step 3: Map through DAY_LETTERS
  index=0: selectedSet.has(1) → false
  index=1: selectedSet.has(2) → false
  index=2: selectedSet.has(3) → false
  index=3: selectedSet.has(4) → false
  index=4: selectedSet.has(5) → false
  index=5: selectedSet.has(6) → false
  index=6: selectedSet.has(7) → false

Output: [
  { index: 0, letter: 'S', selected: false },
  { index: 1, letter: 'M', selected: false },
  { index: 2, letter: 'T', selected: false },
  { index: 3, letter: 'W', selected: false },
  { index: 4, letter: 'T', selected: false },
  { index: 5, letter: 'F', selected: false },
  { index: 6, letter: 'S', selected: false }
]
```

**This matches the described problem: all badges are gray (unselected)!**

---

## Supabase Data Format Questions

Based on the code, we need to determine:

1. **How is "Days Selected" stored in Supabase?**
   - As JSON array: `["Monday", "Tuesday", "Wednesday"]`
   - As text string: `'["Monday", "Tuesday", "Wednesday"]'`
   - As Bubble numeric array: `[2, 3, 4, 5, 6]`
   - Something else?

2. **Where does it come from?**
   - Synced from Bubble API as-is?
   - Transformed by an Edge Function?
   - Stored from a form submission?

3. **Is there fallback to "hc days selected"?**
   - Line 154: `proposal['Days Selected'] || proposal.hcDaysSelected`
   - When would "hc days selected" be used?
   - Does it have the same format?

---

## CSS Classes & Styling

**File**: `app/src/styles/components/guest-proposals.css`

```css
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
  background-color: #B2B2B2;    /* GRAY - unselected */
  color: #424242;
  transition: all 0.2s;
}

.day-badge-v2.selected {
  background-color: #4B47CE;    /* PURPLE - selected */
  color: white;
}
```

**Rendering Rule**:
```jsx
className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
```

If `day.selected === false`, class is just `.day-badge-v2` (gray).
If `day.selected === true`, class is `.day-badge-v2.selected` (purple).

---

## Function Call Chain

```
ProposalCard(proposal)
  ├─ Extract: daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || []
  ├─ Call: getAllDaysWithSelection(daysSelected)
  │  ├─ Check: isTextFormat = daysSelected.length > 0 && typeof daysSelected[0] === 'string'
  │  ├─ If true: Map using DAY_NAMES lookup
  │  └─ If false: Map using numeric 0→1 conversion
  ├─ Map over returned allDays array
  │  ├─ Apply className based on .selected property
  │  └─ Render <div> with day letter
  └─ Result: Day badges with correct purple/gray styling (if logic works)
```

---

## Potential Edge Cases

| Input | Format Check | Expected Behavior | Actual Behavior |
|-------|--------------|-------------------|-----------------|
| `[]` | `isTextFormat = false` | Handle as empty | Uses numeric mode, all false ✓ |
| `null` | Error | Should fallback | `daysSelected \|\| []` handles ✓ |
| `undefined` | Error | Should fallback | `daysSelected \|\| []` handles ✓ |
| `["Monday", ...]` | `isTextFormat = true` | Use DAY_NAMES lookup | Correct ✓ |
| `[2, 3, 4, 5, 6]` | `isTextFormat = false` | Convert 0→1 | Correct ✓ |
| `"Monday"` (string) | `isTextFormat = false` | Undefined | Likely fails ❌ |
| `[[2, 3, 4]]` (nested) | `isTextFormat = false` | Undefined | Likely fails ❌ |
| `{2, 3, 4}` (object) | `isTextFormat = false` | Undefined | Likely fails ❌ |

---

## The Real Problem: Data Format Unknown

**The core issue is: We don't know what format Supabase is returning for "Days Selected".**

The code handles two formats:
1. Text array: `["Monday", "Tuesday", ...]`
2. Numeric array: `[2, 3, 4, 5, 6]`

But if Supabase returns something else, the detection fails silently and all badges appear unselected.

---

## Debugging Output Needed

Add to ProposalCard.jsx to understand the actual data:

```javascript
useEffect(() => {
  console.log('=== DAYS SELECTED DEBUG ===');
  console.log('Raw daysSelected:', proposal['Days Selected']);
  console.log('Type:', typeof proposal['Days Selected']);
  console.log('Is Array:', Array.isArray(proposal['Days Selected']));

  if (Array.isArray(proposal['Days Selected']) && proposal['Days Selected'].length > 0) {
    console.log('First element:', proposal['Days Selected'][0]);
    console.log('First element type:', typeof proposal['Days Selected'][0]);
  }

  if (proposal.hcDaysSelected) {
    console.log('HC Days Selected:', proposal.hcDaysSelected);
    console.log('HC Type:', typeof proposal.hcDaysSelected);
  }

  console.log('isTextFormat would be:',
    proposal['Days Selected']?.length > 0 &&
    typeof proposal['Days Selected'][0] === 'string'
  );

  console.log('Final allDays:', allDays);
}, [proposal, allDays]);
```

---

## Summary of Data Flow

```
Supabase (proposal table)
  ↓
  Contains: "Days Selected" field (format unknown)
  ↓
fetchProposalsByIds() — No transformation
  ↓
enrichedProposals[...] — Raw field passed through
  ↓
selectedProposal (raw) → passed to ProposalCard
  ↓
ProposalCard extracts: proposal['Days Selected']
  ↓
getAllDaysWithSelection(daysSelected)
  ├─ If empty: all badges unselected ❌
  ├─ If text: looks up in DAY_NAMES ✓
  └─ If numeric: converts 0→1 ✓
  ↓
Maps to allDays array with .selected boolean
  ↓
Renders: className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
  ├─ selected=true: purple (#4B47CE)
  └─ selected=false: gray (#B2B2B2)
```

---

## Key Insight

**The ProposalCard component is correct and handles both data formats properly.**

**The issue is not in the day selector logic itself, but likely in:**
1. The actual data format from Supabase being unexpected
2. Edge cases with empty/null/undefined values
3. Timing issues with data loading
4. Type coercion issues during data transformation

The fix requires investigating the actual Supabase data format and ensuring consistent type handling upstream.
