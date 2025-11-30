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

| Status | Stage | Action |
|--------|-------|--------|
| `PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP` | 1 | Awaiting rental app |
| `RENTAL_APP_SUBMITTED_AWAITING_HOST_REVIEW` | 2 | Host reviewing |
| `PROPOSAL_APPROVED_BY_HOST` | 3 | Approved (progress tracker updates) |
| `COUNTEROFFER_SUBMITTED_AWAITING_...` | 2 | Show hcDaysSelected instead |

---

**Last Updated**: 2025-11-30
**Status**: Ready for implementation/modification
