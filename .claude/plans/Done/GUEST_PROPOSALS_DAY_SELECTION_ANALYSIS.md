# Guest Proposals Day Selection Display Analysis

**Date**: 2025-11-30
**Status**: Investigation Complete
**Issue**: Selected days don't display properly in the day selector component on the guest-proposals page

---

## Executive Summary

The guest-proposals page is **not using a day selector component at all**. Instead, it's displaying a **read-only day badges row** that should show which days were selected in the current proposal. The issue appears to be that the selected days are not being properly identified and marked as "selected" in the UI.

### Key Finding
The day badges are rendering, but they're all showing with the unselected styling (gray background) regardless of which days should actually be selected based on the proposal data.

---

## Architecture Overview

### Components Involved

#### 1. **GuestProposalsPage.jsx** (Entry Point)
**File**: `app/src/islands/pages/GuestProposalsPage.jsx`
- Hollow component pattern (renders only JSX)
- Receives all logic from `useGuestProposalsPageLogic` hook
- Passes `selectedProposal` to `ProposalCard` component

#### 2. **useGuestProposalsPageLogic.js** (Business Logic)
**File**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`
- Fetches user and proposals from Supabase
- Manages proposal selection
- Returns both raw `selectedProposal` and `transformedProposal`

#### 3. **ProposalCard.jsx** (Display Component)
**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`
- **This is where the day badges render**
- Contains the `getAllDaysWithSelection()` function that determines which days are "selected"
- Renders day badges in the `.day-badges-row` (lines 224-233)

#### 4. **Styling**
**File**: `app/src/styles/components/guest-proposals.css`
- `.day-badge-v2` = unselected (gray background, #B2B2B2)
- `.day-badge-v2.selected` = selected (purple background, #4B47CE)

---

## Data Flow Diagram

```
GuestProposalsPage.jsx
  ↓
useGuestProposalsPageLogic()
  ├─ fetchUserProposalsFromUrl()
  │  └─ Returns: { user, proposals, selectedProposal }
  ├─ transformProposalData(selectedProposal)
  │  └─ Returns: transformedProposal
  ↓
ProposalCard Component (receives selectedProposal)
  ├─ Extract: proposal['Days Selected'] → daysSelected (line 154)
  ├─ Call: getAllDaysWithSelection(daysSelected) (line 155)
  │  └─ Should return array of day objects with .selected property
  ├─ Map over allDays array (lines 225-232)
  └─ Apply className: day.selected ? 'selected' : '' (line 228)
```

---

## Critical Code Analysis

### 1. ProposalCard.jsx - Day Selection Logic (Lines 61-84)

**Function**: `getAllDaysWithSelection(daysSelected)`

```javascript
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
      selected: selectedSet.has(DAY_NAMES[index])  // <-- KEY LINE
    }));
  } else {
    // Numeric format: Bubble 1-indexed [2, 3, 4, 5, 6] for Mon-Fri
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1) // <-- KEY LINE: Converts 0-based to 1-based
    }));
  }
}
```

**Constants Used** (Lines 15-17):
```javascript
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
```

---

### 2. Rendering Logic (Lines 224-233)

```javascript
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

## Potential Issues Identified

### Issue 1: Data Format Mismatch
**Location**: ProposalCard.jsx, line 154

```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
```

**Problem**: The function assumes `daysSelected` will be either:
1. Text format: `["Monday", "Tuesday", "Wednesday"]`
2. Numeric format: `[2, 3, 4, 5, 6]` (Bubble 1-indexed)

**But what if it's**:
- An empty array when first loaded? → `isTextFormat` check would fail
- A different data type (object, null)?
- Database format that hasn't been transformed?

### Issue 2: Type Detection Logic (Line 65)

```javascript
const isTextFormat = days.length > 0 && typeof days[0] === 'string';
```

**Problem**: This assumes the first element indicates the format for ALL elements:
- If `days = []`, `isTextFormat = false` → falls to numeric handling
- Empty arrays would use numeric format logic, which would mark no days as selected

### Issue 3: Incomplete Data Transformation

**Location**: `userProposalQueries.js`, line 154

The query fetches `"Days Selected"` directly from the proposal table, but there's no transformation step that ensures consistent formatting before the data reaches ProposalCard.

From the data transformer (dataTransformers.js):
```javascript
export function transformProposalData(rawProposal) {
  // ...
  daysSelected: rawProposal['Days Selected'],  // <-- No transformation applied
  // ...
}
```

---

## Recent Commits (Relevant History)

### Commit: `0924b96` - "fix: handle text day names from Supabase in ProposalCard"
**Date**: Nov 30, 04:57:49
**Changes**: Updated `getCheckInOutRange()` and `getAllDaysWithSelection()` to handle both text and numeric formats

**Analysis**: This commit suggests the issue was recognized and addressed, but the fix may not be complete or may have edge cases.

### Commit: `4c16484` - "fix: fetch house rules from proposal table instead of listing"
**Recent**: Indicates data structure changes are ongoing

### Commit: `590f209` - "style: change day badges from circles to squircles"
**Recent**: CSS changes to day badge styling

---

## Actual Data Sources

### Where Days Selected Data Comes From

1. **From Bubble Proposal Table**:
   - Field: `"Days Selected"`
   - Format: Unknown (could be text array, numeric array, or JSON string)

2. **From Supabase Proposal Table**:
   - Query fetches: `"Days Selected"` and `"hc days selected"` (line 110, 123 in userProposalQueries.js)
   - These are stored as-is from Bubble

3. **Transformation Point**:
   - `fetchProposalsByIds()` returns raw proposal objects
   - No explicit transformation of the Days Selected field
   - ProposalCard must handle any format

---

## Test Scenarios

### Scenario 1: Empty Days Array
```javascript
daysSelected = []
getAllDaysWithSelection([])
// isTextFormat = false (because days.length === 0)
// Falls to numeric handling
// selectedSet = new Set([])
// All days return selected: false ❌
```

### Scenario 2: Text Format Days
```javascript
daysSelected = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
getAllDaysWithSelection([...])
// isTextFormat = true (first element is string)
// selectedSet = {"Monday", "Tuesday", ...}
// Checks: selectedSet.has(DAY_NAMES[1]) → has("Monday") → true ✓
```

### Scenario 3: Numeric Format Days
```javascript
daysSelected = [2, 3, 4, 5, 6]  // Mon-Fri in Bubble format
getAllDaysWithSelection([...])
// isTextFormat = false (first element is number)
// selectedSet = {2, 3, 4, 5, 6}
// Checks: selectedSet.has(0 + 1) → has(1) → false
// Checks: selectedSet.has(1 + 1) → has(2) → true ✓ (Monday)
```

---

## Root Cause Hypothesis

### Most Likely Cause: Empty Initial State

When the component first renders or when data is loading, `daysSelected` might be:
1. Undefined → falls through to `[]` (line 154)
2. An empty array → `isTextFormat` detection fails
3. The function correctly handles this, but the visual effect is: **all days show as unselected**

### Secondary Issue: Data Type Inconsistency

If the Supabase data is stored as a JSON string instead of an array:
```javascript
daysSelected = '["Monday", "Tuesday", "Wednesday"]'  // JSON string
typeof daysSelected[0] = 't' (character) // String, not intended type
```

This would incorrectly trigger `isTextFormat = true` with wrong data.

---

## CSS Display Rules

**File**: `app/src/styles/components/guest-proposals.css`

### Unselected Day Badge (Lines 314-326)
```css
.day-badge-v2 {
  background-color: #B2B2B2;  /* Gray */
  color: #424242;
}
```

### Selected Day Badge (Lines 329-331)
```css
.day-badge-v2.selected {
  background-color: #4B47CE;  /* Purple */
  color: white;
}
```

**Observation**: The CSS is correct. If selection wasn't working, all badges would be gray.

---

## ProposalCard Rendering Context (Line 154-155)

```javascript
// Schedule info
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
const allDays = getAllDaysWithSelection(daysSelected);
```

**Questions**:
1. What does `proposal['Days Selected']` actually contain?
2. Is `proposal.hcDaysSelected` a fallback that's being used?
3. Are these from Supabase transforms or raw Bubble data?

---

## The Day Selector Component Situation

### What's NOT Happening

The guest-proposals page is **NOT** using:
- `HostScheduleSelector` component (that's for listing creation)
- Any interactive day selector
- Any component that allows editing of selected days

### What IS Happening

The page displays:
- A **read-only display** of selected days as static badges
- Day badges are not clickable
- They're purely informational

**Implication**: The problem is purely about **displaying** which days were selected, not about selecting days.

---

## Summary Table

| Aspect | Status | Details |
|--------|--------|---------|
| **Component Used** | ✓ Correct | ProposalCard renders day badges |
| **Data Source** | ? Unclear | `proposal['Days Selected']` or fallback |
| **Format Handling** | ✓ Coded | Supports text and numeric formats |
| **Type Detection** | ⚠️ Fragile | Depends on array.length > 0 |
| **CSS Styling** | ✓ Correct | Classes apply properly when selected=true |
| **Rendering Logic** | ✓ Correct | Maps allDays correctly |
| **Edge Cases** | ❌ Risky | Empty arrays, null, undefined handling unclear |

---

## Debugging Steps

To verify the issue:

1. **Check actual proposal data**:
   ```javascript
   console.log('Days Selected:', proposal['Days Selected']);
   console.log('Type:', typeof proposal['Days Selected']);
   console.log('First element:', proposal['Days Selected']?.[0]);
   ```

2. **Log getAllDaysWithSelection output**:
   ```javascript
   const allDays = getAllDaysWithSelection(daysSelected);
   console.log('All days with selection:', allDays);
   ```

3. **Check Supabase data directly**:
   - Query the `proposal` table
   - Look at the `"Days Selected"` column value
   - Check data type and format

4. **Verify type detection**:
   ```javascript
   const isTextFormat = daysSelected.length > 0 && typeof daysSelected[0] === 'string';
   console.log('Is text format:', isTextFormat);
   ```

---

## Related Files

### Core Components
- **Display**: `app/src/islands/pages/proposals/ProposalCard.jsx`
- **Logic Hook**: `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js`
- **Page**: `app/src/islands/pages/GuestProposalsPage.jsx`

### Data Layer
- **Queries**: `app/src/lib/proposals/userProposalQueries.js`
- **Transformation**: `app/src/lib/proposals/dataTransformers.js`

### Styling
- **CSS**: `app/src/styles/components/guest-proposals.css`

### Database
- **Source**: Supabase `proposal` table, field: `"Days Selected"`

---

## Recommendations

1. **Add explicit logging** in ProposalCard to capture actual data format
2. **Add null/undefined checks** before calling `getAllDaysWithSelection()`
3. **Consider normalizing** the Days Selected format in the data transformation layer
4. **Test with different data states**:
   - Empty arrays
   - Text format arrays
   - Numeric format arrays
   - Null/undefined values
5. **Document the expected format** for Days Selected in data contract

---

## References

- **Recent commit addressing similar issue**: `0924b96` (Nov 30)
- **Day system documentation**: See `app/CLAUDE.md` - Day Indexing Convention section
  - Internal (JS): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  - Bubble: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
