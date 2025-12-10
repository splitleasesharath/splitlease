# Guest Proposals Page Implementation Analysis

**Document Created**: 2025-11-30
**Status**: Complete - Ready for Implementation
**Focus**: Day-Badges-Row component and day selection display

---

## 1. Architecture Overview

### Page Structure
The Guest Proposals page follows a **Hollow Component Pattern** with clear separation of concerns:

```
GuestProposalsPage.jsx (Pure JSX rendering only)
    ↓
useGuestProposalsPageLogic.js (All business logic)
    ├── Data loading via fetchUserProposalsFromUrl()
    ├── Proposal selection handling
    ├── Status transformation via getStatusConfig()
    └── Stage calculation via getStageFromStatus()
```

### Component Hierarchy
```
GuestProposalsPage
├── Header
├── Main Content
│   ├── LoadingState | ErrorState | EmptyState
│   └── Content (when proposals exist)
│       ├── ProposalSelector (dropdown)
│       └── ProposalCard
│           ├── Left Column (details)
│           │   ├── Title + Location
│           │   ├── Action Buttons
│           │   ├── Schedule Info
│           │   ├── Day Badges Row  <-- TARGET COMPONENT
│           │   ├── Check-in/Out Times
│           │   ├── Move-in Date
│           │   └── House Rules Link
│           ├── Right Column (photo + host)
│           ├── Pricing Bar
│           └── Progress Tracker
└── Footer
```

---

## 2. Day Badges Row Implementation

### Location & Files
- **Component**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\pages\proposals\ProposalCard.jsx`
- **Styling**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\styles\components\guest-proposals.css`
- **Line Range (JSX)**: Lines 176-186 (ProposalCard.jsx)
- **Line Range (CSS)**: Lines 307-332 (guest-proposals.css)

### HTML Structure
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

### Data Structure
The day badges display selected days from the proposal's `Days Selected` field:

```javascript
// From ProposalCard.jsx lines 114-115
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
const allDays = getAllDaysWithSelection(daysSelected);
```

### Helper Function: `getAllDaysWithSelection()`
Located in ProposalCard.jsx (lines 37-44):

```javascript
function getAllDaysWithSelection(daysSelected) {
  const selectedSet = new Set(daysSelected || []);
  return DAY_LETTERS.map((letter, index) => ({
    index,
    letter,
    selected: selectedSet.has(index + 1) // Convert to Bubble 1-indexed
  }));
}
```

**Key Point**: The function converts from JavaScript 0-based indexing to Bubble 1-based indexing:
- JS day 0 (Sunday) → Bubble day 1
- JS day 1 (Monday) → Bubble day 2
- etc.

### Day Letter Mapping
From ProposalCard.jsx (lines 15-16):
```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

### CSS Styling

**Container** (Lines 308-312):
```css
.day-badges-row {
  display: flex;
  gap: 4px;
  margin-bottom: 15px;
}
```

**Individual Badge** (Lines 314-327):
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
  background-color: #B2B2B2;        /* Gray default */
  color: #424242;
  transition: all 0.2s;
}
```

**Selected State** (Lines 329-332):
```css
.day-badge-v2.selected {
  background-color: #4B47CE;         /* Deep blue when selected */
  color: white;
}
```

**Responsive** (Lines 687-696):
```css
@media (max-width: 480px) {
  .day-badges-row {
    justify-content: space-between;
  }

  .day-badge-v2 {
    width: 36px;
    height: 36px;
    font-size: 12px;
    border-radius: 10px;
  }
}
```

---

## 3. Data Flow: From Bubble to Display

### Step 1: User ID from URL
```
URL: /guest-proposals/{userId}
     ↓
getUserIdFromPath() → extracts {userId}
```

### Step 2: Fetch User + Proposals List
**File**: `userProposalQueries.js` (lines 23-51)
```javascript
fetchUserWithProposalList(userId)
  ↓
Queries Supabase 'user' table for:
  - _id, Name, Profile Photo
  - "Proposals List"  (JSONB array of proposal IDs)
```

### Step 3: Extract Proposal IDs
**File**: `userProposalQueries.js` (lines 59-86)
```javascript
extractProposalIds(user)
  ↓
Parses user['Proposals List'] as JSON array
  ↓
Returns: ['prop_123', 'prop_456', 'prop_789', ...]
```

### Step 4: Fetch Proposals with All Related Data
**File**: `userProposalQueries.js` (lines 95-393)
```javascript
fetchProposalsByIds(proposalIds)
  ↓
SELECT * FROM proposal WHERE _id IN (...)
  Fields fetched:
    - _id
    - Status
    - Days Selected      <-- CRITICAL: Bubble 1-indexed array
    - check in day
    - check out day
    - Move in range start
    - Total Price for Reservation
    - proposal nightly price
    - counter offer happened
    - hc* fields (for counteroffers)
    - ... (+ 10 more fields)
```

### Step 5: Enrich with Listing & Host Data
Lookup maps are created for:
- Listings (by listing ID)
- Hosts (by host account ID)
- Guests (by guest ID)
- Boroughs & neighborhoods (by ID)
- Featured photos (by listing ID)
- Virtual meetings (by proposal ID)

Result structure:
```javascript
{
  // Proposal data
  _id: 'prop_123',
  Status: 'PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP',
  'Days Selected': [1, 2, 3, 4, 5],  // Bubble format (1=Sun, 7=Sat)
  // ... other fields

  // Nested objects
  listing: { ... },
  host: { ... },
  guest: { ... },
  virtualMeeting: { ... }
}
```

### Step 6: Transform for Display
**File**: `dataTransformers.js` (lines 141-190)
```javascript
transformProposalData(rawProposal)
  ↓
Creates normalized object with cleaner field names
  daysSelected: proposal['Days Selected']  // Kept as-is (Bubble format)
  checkInDay: proposal['check in day']
  checkOutDay: proposal['check out day']
  // ... (+ 30 more fields)
```

### Step 7: Render in ProposalCard
**File**: `ProposalCard.jsx` (lines 114-186)
```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
const allDays = getAllDaysWithSelection(daysSelected);

// Convert: [1, 2, 3, 4, 5] → displayed as S M T W T
// because getAllDaysWithSelection() checks: selected.has(index + 1)
// where index is 0-based

return (
  <div className="day-badges-row">
    {allDays.map((day) => (
      <div className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}>
        {day.letter}
      </div>
    ))}
  </div>
)
```

---

## 4. Critical Day Indexing Logic

### Problem: Two Day Systems
| System | Sunday | Monday | Tuesday | ... | Saturday |
|--------|--------|--------|---------|-----|----------|
| Bubble (stored) | 1 | 2 | 3 | ... | 7 |
| JavaScript (display) | 0 | 1 | 2 | ... | 6 |

### Solution in getAllDaysWithSelection()
```javascript
function getAllDaysWithSelection(daysSelected) {
  const selectedSet = new Set(daysSelected || []);  // Create Set from Bubble days: [1,2,3,4,5]

  return DAY_LETTERS.map((letter, index) => ({
    index,                              // 0, 1, 2, 3, 4, 5, 6
    letter,                             // S, M, T, W, T, F, S
    selected: selectedSet.has(index + 1) // Check if Bubble day exists
  }));

  // Example:
  // index=0 (Sunday), checks selectedSet.has(1)    → true if daysSelected includes 1
  // index=1 (Monday), checks selectedSet.has(2)    → true if daysSelected includes 2
  // etc.
}
```

### Data Examples

**Example 1: Monday-Friday proposal**
```javascript
proposal['Days Selected'] = [2, 3, 4, 5, 6]  // Bubble format (Mon-Fri)

getAllDaysWithSelection([2, 3, 4, 5, 6])
→ [
    { index: 0, letter: 'S', selected: false },  // No 1 in set
    { index: 1, letter: 'M', selected: true  },  // Has 2 in set
    { index: 2, letter: 'T', selected: true  },  // Has 3 in set
    { index: 3, letter: 'W', selected: true  },  // Has 4 in set
    { index: 4, letter: 'T', selected: true  },  // Has 5 in set
    { index: 5, letter: 'F', selected: true  },  // Has 6 in set
    { index: 6, letter: 'S', selected: false }   // No 7 in set
  ]

Rendered: S [M] [T] [W] [T] [F] S  (blue badges for selected)
```

**Example 2: Weekend proposal**
```javascript
proposal['Days Selected'] = [1, 7]  // Bubble format (Sun, Sat)

getAllDaysWithSelection([1, 7])
→ [
    { index: 0, letter: 'S', selected: true  },  // Has 1 in set
    { index: 1, letter: 'M', selected: false },  // No 2 in set
    { index: 2, letter: 'T', selected: false },  // No 3 in set
    { index: 3, letter: 'W', selected: false },  // No 4 in set
    { index: 4, letter: 'T', selected: false },  // No 5 in set
    { index: 5, letter: 'F', selected: false },  // No 6 in set
    { index: 6, letter: 'S', selected: true  }   // Has 7 in set
  ]

Rendered: [S] M T W T F [S]  (blue badges for selected)
```

---

## 5. Supporting Components & Functions

### ProposalSelector Component
**File**: `ProposalSelector.jsx`
- Simple dropdown for switching between multiple proposals
- Props: `proposals`, `selectedId`, `onSelect`, `count`
- Calls `onSelect(proposalId)` which updates selected proposal in parent

### useGuestProposalsPageLogic Hook
**File**: `useGuestProposalsPageLogic.js`
- Manages all page state and data loading
- Key functions:
  - `loadProposals()` - Triggers fetchUserProposalsFromUrl()
  - `handleProposalSelect()` - Changes selected proposal
  - `handleRetry()` - Retries on error
- Returns: user, proposals, selectedProposal, transformedProposal, statusConfig, etc.

### Status Configuration
**File**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\logic\constants\proposalStatuses.js`
- Defines status labels, colors, and stages
- Used for progress tracker color/state

### Progress Tracker
**File**: `ProposalCard.jsx` (lines 50-86)
- Horizontal timeline showing 6 stages
- Currently hardcoded to stage 3 (line 140)
- Renders below pricing bar

---

## 6. CSS Color Reference

### Day Badges
| State | Background | Text | CSS Class |
|-------|------------|------|-----------|
| Unselected | #B2B2B2 (gray) | #424242 (dark) | `.day-badge-v2` |
| Selected | #4B47CE (purple) | white | `.day-badge-v2.selected` |

### Other Colors (for context)
```css
Primary: #6B4EFF (purple)
Secondary: #4F46E5 (indigo)
Text Primary: #424242 (dark gray)
Text Secondary: #6B7280 (medium gray)
Border: #D4D4D4 (light gray)
Background: rgb(244, 244, 248) (off-white)
```

---

## 7. Edge Cases & Known Issues

### 1. Fallback Fields for Counteroffers
ProposalCard.jsx uses fallback logic (lines 114, 122-127):
```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
const nightlyPrice = isCounteroffer
  ? proposal['hc nightly price']
  : proposal['proposal nightly price'];
```
If counteroffer was made, displays `hc*` fields instead.

### 2. Move-in Date Formatting
```javascript
const moveInStart = proposal['Move in range start'];
const anticipatedMoveIn = formatDate(moveInStart);
// formatDate() converts to "Jan 15, 2025" format
```

### 3. Check-in/Out Days (Different from Selection)
```javascript
// These are specific days, not recurring pattern
const checkInDay = proposal['check in day'];     // e.g., 5 (Friday)
const checkOutDay = proposal['check out day'];   // e.g., 2 (Monday)
getCheckInOutRange(proposal) → "Friday to Monday"
```

### 4. Orphaned Proposals
- If proposal ID exists in user's "Proposals List" but not in proposal table
- Filtered out in fetchProposalsByIds() (lines 145-155)
- Also filters: Deleted proposals, "Cancelled by Guest" proposals

---

## 8. File Dependencies & Import Graph

```
GuestProposalsPage.jsx
├── Header.jsx
├── Footer.jsx
├── useGuestProposalsPageLogic.js
│   ├── fetchUserProposalsFromUrl (from userProposalQueries.js)
│   │   ├── fetchUserWithProposalList
│   │   ├── extractProposalIds
│   │   ├── fetchProposalsByIds
│   │   │   └── [Supabase queries to multiple tables]
│   │   ├── getUserIdFromPath (from urlParser.js)
│   │   └── getProposalIdFromQuery (from urlParser.js)
│   ├── transformProposalData (from dataTransformers.js)
│   ├── getStatusConfig (from proposalStatuses.js)
│   ├── getStageFromStatus (from proposalStatuses.js)
│   └── getAllStagesFormatted (from proposalStages.js)
├── ProposalSelector.jsx
└── ProposalCard.jsx
    ├── formatPrice (from dataTransformers.js)
    ├── formatDate (from dataTransformers.js)
    └── [Inline helper functions: getCheckInOutRange, getAllDaysWithSelection]
```

---

## 9. Proposal Status Flow

```
PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP
    ↓
RENTAL_APP_SUBMITTED_AWAITING_HOST_REVIEW
    ↓
┌─────────────────────────────────────────┐
│ HOST DECISION                           │
│ ├─ REJECTED_BY_HOST                     │
│ ├─ COUNTEROFFER_SUBMITTED_AWAITING_...  │
│ └─ PROPOSAL_APPROVED_BY_HOST            │
└─────────────────────────────────────────┘
    ↓
AWAITING_DOCUMENTS_AND_INITIAL_PAYMENT
    ↓
INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED

Terminal States:
├─ CANCELLED_BY_GUEST
├─ CANCELLED_BY_SPLITLEASE
└─ EXPIRED
```

---

## 10. Key Insights for Implementation

### What Already Works
1. **Day display logic** is correct - properly converts Bubble 1-indexed days to JS 0-indexed for display
2. **CSS styling** matches design spec - gray default, purple when selected
3. **Data fetching** is comprehensive - includes all nested data (listings, hosts, guests, etc.)
4. **Transformation layer** normalizes field names for consistency

### Assumptions Made
1. `Days Selected` field always contains Bubble 1-indexed days [1-7]
2. For counteroffers, uses `hcDaysSelected` instead
3. Check-in/out days are separate from recurring schedule days
4. Move-in date is a single date, not a range

### Things to Verify Before Using
1. Does `Days Selected` field always exist in Bubble API responses?
2. Are orphaned proposals (IDs without records) common?
3. Should progress tracker stage be calculated from status, not hardcoded?
4. Are all price fields populated, or can they be null?

---

## 11. Testing Scenarios

### Scenario 1: Weekday Recurring
```javascript
proposal = {
  'Days Selected': [2, 3, 4, 5, 6],  // Mon-Fri
  'Reservation Span (Weeks)': 4,
  'check in day': 2,                 // Friday
  'check out day': 5                 // Monday
}
Expected: M T W T F badges shown in blue, S and S in gray
```

### Scenario 2: Weekend Only
```javascript
proposal = {
  'Days Selected': [1, 7],            // Sun, Sat
  'Reservation Span (Weeks)': 8,
  'check in day': 7,
  'check out day': 2
}
Expected: S and S shown in blue, M-F in gray
```

### Scenario 3: Counteroffer
```javascript
proposal = {
  'counter offer happened': true,
  'hcDaysSelected': [2, 3, 4, 5, 6], // Host counteroffer: Mon-Fri
  'Days Selected': [3, 4, 5, 6, 7],   // Original: Tue-Sat
}
Expected: Display hcDaysSelected (Mon-Fri in blue)
```

---

## Summary

The Guest Proposals page successfully displays day badges for recurring rental schedules. The key implementation is in:

1. **ProposalCard.jsx** - Component rendering (lines 176-186)
2. **guest-proposals.css** - Styling (lines 307-332)
3. **getAllDaysWithSelection()** - Day logic (ProposalCard.jsx lines 37-44)
4. **Data flow** - Bubble 1-indexed days properly converted to JS 0-indexed for display

The day indexing conversion is correct and follows the project's established pattern for handling the Bubble/JavaScript day system difference.
