# Guest Proposals Page - Quick Reference Guide

## File Locations

| Component | Path | Purpose |
|-----------|------|---------|
| **Main Page** | `app/src/islands/pages/GuestProposalsPage.jsx` | Entry component (hollow pattern) |
| **Logic Hook** | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | All business logic |
| **Proposal Card** | `app/src/islands/pages/proposals/ProposalCard.jsx` | Displays proposal details + day badges |
| **Selector** | `app/src/islands/pages/proposals/ProposalSelector.jsx` | Dropdown for proposal switching |
| **CSS** | `app/src/styles/components/guest-proposals.css` | All styling |
| **Data Queries** | `app/src/lib/proposals/userProposalQueries.js` | Supabase queries |
| **Transformers** | `app/src/lib/proposals/dataTransformers.js` | Data normalization |

## Day Badges Component

### HTML Rendering
**File**: `ProposalCard.jsx:176-186`
```jsx
<div className="day-badges-row">
  {allDays.map((day) => (
    <div className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}>
      {day.letter}
    </div>
  ))}
</div>
```

### Day Logic Function
**File**: `ProposalCard.jsx:37-44`
```javascript
function getAllDaysWithSelection(daysSelected) {
  const selectedSet = new Set(daysSelected || []);
  return DAY_LETTERS.map((letter, index) => ({
    index,
    letter,
    selected: selectedSet.has(index + 1)  // ← Bubble day (1-indexed)
  }));
}
```

**Key**: Converts Bubble 1-indexed days to JS 0-indexed display

### CSS Classes

| Class | Unselected | Selected |
|-------|-----------|----------|
| `.day-badge-v2` | Gray (#B2B2B2) | Purple (#4B47CE) |
| `.day-badges-row` | Flex, gap 4px | - |

## Data Flow

```
URL: /guest-proposals/{userId}
    ↓
fetchUserProposalsFromUrl()
    ├→ fetchUserWithProposalList(userId)
    ├→ extractProposalIds(user['Proposals List'])
    └→ fetchProposalsByIds(proposalIds)
         └→ Enrich with listings, hosts, guests, photos
    ↓
useGuestProposalsPageLogic hook
    └→ transformProposalData()
    ↓
ProposalCard component
    ├→ Extract: proposal['Days Selected']  [1,2,3,4,5]
    ├→ Call: getAllDaysWithSelection()
    └→ Render: day badges with selected/unselected states
```

## Day Indexing

### Critical: Two Systems

| Format | Sunday | Monday | Tuesday | ... | Saturday |
|--------|--------|--------|---------|-----|----------|
| **Bubble** (stored) | 1 | 2 | 3 | ... | 7 |
| **JavaScript** (display) | 0 | 1 | 2 | ... | 6 |

### Conversion in Code
```javascript
// Bubble data: [2, 3, 4, 5, 6]  (Mon-Fri)
// Display: M T W T F            (0-indexed check in getAllDaysWithSelection)

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];  // 0-indexed for display

// getAllDaysWithSelection checks: selectedSet.has(index + 1)
// index=0, check has(1)  → Bubble Sunday
// index=1, check has(2)  → Bubble Monday
// etc.
```

## Colors

```css
/* Unselected badge */
background-color: #B2B2B2;
color: #424242;

/* Selected badge */
background-color: #4B47CE;  /* Deep purple */
color: white;
```

## Proposal Fields Used

| Field | Purpose | Example |
|-------|---------|---------|
| `Days Selected` | Recurring days (Bubble 1-indexed) | `[2,3,4,5,6]` = Mon-Fri |
| `hcDaysSelected` | Counteroffer days (fallback) | `[2,3,4,5,6]` |
| `check in day` | Specific check-in (Bubble format) | `5` = Friday |
| `check out day` | Specific check-out (Bubble format) | `2` = Monday |
| `Move in range start` | Move-in date | `"2025-01-15"` |
| `counter offer happened` | Host made counteroffer? | `true/false` |

## Proposal Status

When displaying a proposal, check:
```javascript
const isCounteroffer = proposal['counter offer happened'];
const daysToShow = isCounteroffer
  ? proposal.hcDaysSelected
  : proposal['Days Selected'];
```

## Component Props

### ProposalCard
```javascript
<ProposalCard
  proposal={selectedProposal}              // Raw Bubble data
  transformedProposal={transformedProposal} // Normalized data
  statusConfig={statusConfig}              // Status colors/labels
/>
```

### ProposalSelector
```javascript
<ProposalSelector
  proposals={proposalOptions}  // Array of {id, label}
  selectedId={selectedProposal?._id}
  onSelect={handleProposalSelect}
  count={proposals.length}
/>
```

## Common Tasks

### Add New Day Badge Feature
1. Modify `getAllDaysWithSelection()` in ProposalCard.jsx
2. Update CSS in guest-proposals.css
3. Test with Mon-Fri, weekends, and single days

### Change Badge Colors
1. Edit `.day-badge-v2` background/color in guest-proposals.css (lines 314-327)
2. Edit `.day-badge-v2.selected` in guest-proposals.css (lines 329-332)

### Fix Missing Days
1. Check proposal['Days Selected'] is populated
2. Check getAllDaysWithSelection() is called with correct data
3. Verify Set conversion logic (index + 1)

### Debug Day Display
```javascript
// Add to ProposalCard.jsx temporarily
console.log('daysSelected:', daysSelected);
console.log('allDays:', allDays);
```

## Testing

### Test Data

**Monday-Friday**
```javascript
'Days Selected': [2, 3, 4, 5, 6]
// Display: S M T W T F S
//             ✓ ✓ ✓ ✓ ✓
```

**Weekends Only**
```javascript
'Days Selected': [1, 7]
// Display: S M T W T F S
//          ✓             ✓
```

**All Days**
```javascript
'Days Selected': [1, 2, 3, 4, 5, 6, 7]
// Display: S M T W T F S
//          ✓ ✓ ✓ ✓ ✓ ✓ ✓
```

## Error Handling

### No Days Selected
```javascript
const daysSelected = proposal['Days Selected'] || [];
// Shows all badges in gray (unselected)
```

### Counteroffer Logic
```javascript
const isCounteroffer = proposal['counter offer happened'];
const daysToDisplay = isCounteroffer
  ? proposal.hcDaysSelected
  : proposal['Days Selected'];
```

## Performance Notes

- Day badges use React keys (day.index)
- Set lookup is O(1) for determining selected state
- Memoization not needed (small array, simple component)

## Related Statuses

| Status | Stage | usualOrder | Action |
|--------|-------|------------|--------|
| `Pending` | 1 | 1 | View Proposal |
| `Host Review` | 3 | 2 | Remind Split Lease |
| `Proposal Submitted by guest - Awaiting Rental Application` | 1 | 3 | Complete Application |
| `Rental Application Submitted` | 2 | 3 | Awaiting Host Review |
| `Host Counteroffer Submitted / Awaiting Guest Review` | 3 | 4 | Review Counteroffer |
| `Proposal or Counteroffer Accepted / Drafting Lease Documents` | 4 | 5 | Remind Split Lease |
| `Lease Documents Sent for Review` | 5 | 6 | Review Documents |
| `Initial Payment Submitted / Lease activated` | 6 | 7 | Go to Leases |
| `Proposal Cancelled by *` | null | 99 | Delete Proposal |

### usualOrder Values (Bubble Ordering)
- **1**: Pending
- **2**: Host Review
- **3**: Proposal Submitted, Rental App Submitted, Pending Confirmation
- **4**: Host Counteroffer
- **5**: Accepted/Drafting, Reviewing Documents
- **6**: Lease Documents
- **7**: Initial Payment/Activated
- **99**: Cancelled, Rejected, Expired
- **0**: Draft, Unknown

### Status Banner Visibility Rule
```javascript
// Banner shows when usualOrder >= 3 OR status is "Proposal Submitted..."
import { shouldShowStatusBanner } from 'logic/constants/proposalStatuses';

if (shouldShowStatusBanner(status)) {
  // Show banner
}
```

## Conditional Patterns (Cascading Overrides)

### Pattern: "Bottom Wins" (CSS-like)
Similar to CSS specificity where later rules override earlier ones, conditionals can be structured so **the last matching condition wins**.

#### Status Banner Example
**File**: `ProposalCard.jsx:100-131`

The `STATUS_BANNERS` object uses exact key matching. If you need override behavior, structure checks from general to specific:

```javascript
// Conceptual pattern - NOT in code
let bannerConfig = null;

// General conditions first
if (isAccepted) bannerConfig = { text: 'Accepted', color: 'green' };

// More specific conditions AFTER (override previous)
if (isAccepted && isDrafting) bannerConfig = { text: 'Drafting', color: 'blue' };

// Most specific condition LAST (final override)
if (isAccepted && isDrafting && hasIssue) bannerConfig = { text: 'Issue', color: 'red' };
```

#### VM Button State Example
**File**: `ProposalCard.jsx:385-409`

The current implementation uses **early return** (first match wins):
```javascript
const getVmButtonState = () => {
  if (vmDeclined) return { label: 'Declined' };     // Check 1
  if (vmConfirmed) return { label: 'Confirmed' };   // Check 2
  if (vmBooked) return { label: 'Accepted' };       // Check 3
  return { label: 'Request' };                      // Default
};
```

To use **"bottom wins"** pattern instead:
```javascript
const getVmButtonState = () => {
  let state = { label: 'Request', disabled: false };  // Default

  if (vmBooked) state = { label: 'Accepted', disabled: true };     // Override 1
  if (vmConfirmed) state = { label: 'Confirmed', disabled: true }; // Override 2
  if (vmDeclined) state = { label: 'Declined', disabled: false };  // Override 3 (wins)

  return state;
};
```

### When to Use Each Pattern

| Pattern | Use When | Example |
|---------|----------|---------|
| **Early Return** (first wins) | Conditions are mutually exclusive | VM lifecycle states |
| **Bottom Wins** (last wins) | Conditions can overlap, need override | Feature flags, permissions |
| **Object Lookup** | Exact key mapping | Status banners, color themes |

### JSX Conditional Rendering

Multiple independent conditions can render multiple elements:
```jsx
{/* All matching conditions render their elements */}
{!isTerminal && <VMButton />}           {/* Renders if active */}
{status?.includes('Drafting') && <RemindButton />}  {/* Renders if drafting */}
{!isTerminal && <SeeDetailsButton />}   {/* Renders if active */}
{!isTerminal && <CancelButton />}       {/* Renders if active */}
```

Use ternary chains for **mutually exclusive** options:
```jsx
{isTerminal ? (
  <DeleteButton />
) : hasCounteroffer ? (
  <RejectTermsButton />
) : (
  <CancelButton />
)}
```

### Adding New Override Conditions

When adding new button states or banners that should override existing ones:

1. **Identify the override hierarchy** (most general → most specific)
2. **Place more specific conditions AFTER general ones**
3. **Test with overlapping conditions** to verify override behavior
4. **Document the hierarchy** in comments

Example adding a new VM state:
```javascript
// Existing checks...
if (vmBooked) state = { label: 'Accepted' };

// NEW: Add override for special case (place AFTER booked check)
if (vmBooked && vmNeedsReschedule) state = { label: 'Reschedule Needed' };
```

---

**Last Updated**: 2025-11-30
**Status**: Ready for implementation/modification
