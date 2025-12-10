# Guest Proposals Day Selection - Investigation Summary

**Date**: November 30, 2025
**Investigation Status**: Complete
**Finding**: The day selector component code is correct; the issue is likely with data format or edge case handling

---

## Quick Facts

### What the User Sees
- Guest proposals page displays day badges (S M T W T F S)
- All badges appear in gray (unselected) color
- No badges appear in purple (selected) color
- The display should show which days were selected in the proposal

### What Should Happen
- Days that were selected for the proposal should show in purple (#4B47CE)
- Days that were not selected should show in gray (#B2B2B2)
- Example: If Mon-Fri were selected, badges should be: S(gray) M(purple) T(purple) W(purple) T(purple) F(purple) S(gray)

### What's Actually Happening
All badges show gray, regardless of the proposal data.

---

## Component Architecture

```
GuestProposalsPage.jsx
    ↓
useGuestProposalsPageLogic.js
    ├─ Calls: fetchUserProposalsFromUrl()
    ├─ Sets: selectedProposal (raw)
    └─ Transforms: transformedProposal
    ↓
ProposalCard.jsx
    ├─ Uses: proposal['Days Selected']
    ├─ Calls: getAllDaysWithSelection(daysSelected)
    │   ├─ Detects: isTextFormat = days.length > 0 && typeof days[0] === 'string'
    │   ├─ Branch A (text): Maps using DAY_NAMES lookup
    │   └─ Branch B (numeric): Converts 0-based to 1-based indexing
    ├─ Maps: allDays array with .selected boolean
    └─ Renders: .day-badge-v2 with conditional .selected class
    ↓
CSS Styling (guest-proposals.css)
    ├─ .day-badge-v2 (gray, unselected)
    └─ .day-badge-v2.selected (purple, selected)
```

---

## Critical Code Locations

### 1. Day Selection Logic (WORKS CORRECTLY)

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`, Lines 61-84

This function correctly handles TWO data formats:

```javascript
// Format 1: Text days ["Monday", "Tuesday", ...]
// Format 2: Numeric days [2, 3, 4, 5, 6] (Bubble 1-indexed)
```

The logic is sound and handles both formats properly.

### 2. Data Extraction (POTENTIAL ISSUE)

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`, Line 154

```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
```

**Fallback chain**:
1. Primary: `proposal['Days Selected']`
2. Secondary: `proposal.hcDaysSelected`
3. Tertiary: `[]` (empty array)

If both are falsy, defaults to empty array, which shows all days as unselected.

### 3. Format Detection (FRAGILE)

**File**: `app/src/islands/pages/proposals/ProposalCard.jsx`, Line 65

```javascript
const isTextFormat = days.length > 0 && typeof days[0] === 'string';
```

**Edge case**: If array is empty:
- `days.length > 0` → false
- Falls through to numeric handling
- Empty numeric handling returns all `selected: false`

### 4. Database Query (NO TRANSFORMATION)

**File**: `app/src/lib/proposals/userProposalQueries.js`, Line 110

Raw field is fetched and passed through unchanged:
```javascript
"Days Selected"  // <- Fetched as-is
```

No transformation happens. Whatever format Supabase returns is what ProposalCard receives.

---

## Root Causes (In Priority Order)

### 1. MOST LIKELY: Data Format Mismatch

**Problem**: Supabase might be returning a format that neither branch handles correctly.

**Possible formats**:
- JSON string: `'["Monday", "Tuesday"]'` (string, not array)
- Mixed format: `["Monday", 2, 3]` (mixed types)
- Other format not anticipated

**Evidence**: The code was recently updated (commit `0924b96`) to handle "text day names from Supabase", suggesting this was a known issue.

### 2. LIKELY: Empty Array Default

**Problem**: If `proposal['Days Selected']` is falsy (null, undefined, empty), it defaults to `[]`.

**What happens**:
```javascript
daysSelected = []  // Empty array
isTextFormat = false  // because days.length === 0
// Falls to numeric handling
// Returns all selected: false
```

**Impact**: All badges show gray.

### 3: POSSIBLE: Data Not Fully Loaded

**Problem**: Timing issue where component renders before proposal data is available.

**Scenario**:
- Component mounts
- `daysSelected = proposal['Days Selected']` → undefined
- Falls to `proposal.hcDaysSelected` → also undefined
- Uses default `[]`
- All badges gray

### 4: UNLIKELY: CSS Not Applied

**Problem**: The `.selected` class isn't being added to the DOM.

**Why unlikely**:
- CSS is correct (verified)
- Rendering logic looks correct
- Recent commits suggest focus was on data handling, not CSS

---

## Investigation Evidence

### Recent Commits Show This Was Addressed

**Commit `0924b96`** (Nov 30, 04:57:49):
```
fix: handle text day names from Supabase in ProposalCard

Updated getCheckInOutRange and getAllDaysWithSelection to handle both:
- Text format from Supabase: "Monday", "Friday", etc.
- Numeric format from legacy Bubble: 1=Sunday, 7=Saturday
```

This commit suggests:
1. The issue was identified
2. A fix was implemented to handle both formats
3. The focus was on ProposalCard component

**However**: If the issue persists, the fix may not be complete or there's an edge case not covered.

### Code Quality Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| **Logic Structure** | ✓ Sound | Correctly handles two known formats |
| **Edge Cases** | ⚠️ Weak | Empty arrays fall through silently |
| **Type Checking** | ⚠️ Fragile | Depends on first element being representative |
| **Data Transformation** | ❌ Missing | No normalization upstream |
| **Error Handling** | ❌ None | Silent failures on unexpected formats |
| **Logging** | ❌ None | No debug output to diagnose issues |

---

## Data Flow Verification Checklist

### ✓ Verified as Correct
- [x] Component receives proposal object
- [x] Line 154 extracts `proposal['Days Selected']`
- [x] Function `getAllDaysWithSelection()` is implemented
- [x] Both text and numeric formats are handled
- [x] CSS classes are defined correctly
- [x] Rendering logic applies classes correctly

### ? Needs Verification
- [ ] What format does Supabase actually return?
- [ ] Is `proposal['Days Selected']` populated?
- [ ] Is the fallback `proposal.hcDaysSelected` being used?
- [ ] Are empty arrays being treated as no selection?
- [ ] Is there a timing issue with async data loading?

### ❌ Known Issues
- No debug logging in ProposalCard
- No validation of data format
- Silent failure on unexpected formats
- Type detection is fragile (depends on array.length > 0)

---

## The Real Mystery: Supabase Data Format

**The core question is: What format does "Days Selected" have in Supabase?**

### Expected Formats (Handled by Code)

**Format A - Text Array**:
```javascript
["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
```
Expected behavior: ✓ Works correctly

**Format B - Numeric Array (Bubble 1-indexed)**:
```javascript
[2, 3, 4, 5, 6]
```
Expected behavior: ✓ Works correctly

### Unexpected Formats (Not Handled)

**Format C - JSON String**:
```javascript
"[\"Monday\", \"Tuesday\", \"Wednesday\"]"  // String, not array
```
Expected behavior: ❌ Would fail (typeof string[0] !== 'string' as expected)

**Format D - Single String**:
```javascript
"Monday"  // Not an array
```
Expected behavior: ❌ Would fail (not iterable)

**Format E - Numeric with Different Indexing**:
```javascript
[0, 1, 2, 3, 4]  // 0-indexed, not Bubble format
```
Expected behavior: ❌ Would fail (0+1=1 wouldn't match Bubble's 1 for Sunday)

**Format F - Empty/Null**:
```javascript
null | undefined | []
```
Expected behavior: ⚠️ All badges show unselected (by design, but may not be intended)

---

## Probable Scenarios

### Scenario 1: Data is Text Format but Empty

```
proposal['Days Selected'] = []
proposal.hcDaysSelected = []  or undefined

Result:
- daysSelected = []
- isTextFormat = false  (because length === 0)
- All days return selected: false
- All badges are gray ❌
```

### Scenario 2: Data is String Instead of Array

```
proposal['Days Selected'] = '["Monday", "Tuesday", "Wednesday"]'

Result:
- daysSelected = '["Monday", "Tuesday", "Wednesday"]'
- isTextFormat = false  (typeof '['  !== 'string')
- Tries numeric lookup
- All days return selected: false
- All badges are gray ❌
```

### Scenario 3: Data is Not Set

```
proposal['Days Selected'] = null | undefined
proposal.hcDaysSelected = null | undefined

Result:
- daysSelected = []  (by fallback)
- isTextFormat = false
- All days return selected: false
- All badges are gray ❌
```

---

## How to Verify

### Step 1: Check Actual Data in Supabase

1. Open Supabase Dashboard
2. Navigate to `proposal` table
3. Look at a sample proposal row
4. Check the `"Days Selected"` field
5. Note the type and value

### Step 2: Add Debug Logging to ProposalCard

Add to component (around line 154):

```javascript
useEffect(() => {
  console.log('=== PROPOSAL CARD DEBUG ===');
  console.log('proposal["Days Selected"]:', proposal['Days Selected']);
  console.log('proposal.hcDaysSelected:', proposal.hcDaysSelected);
  console.log('typeof first:', typeof proposal['Days Selected']?.[0]);
  console.log('daysSelected:', daysSelected);
  console.log('allDays:', allDays);
}, [proposal, daysSelected, allDays]);
```

### Step 3: Test in Browser

1. Open guest proposals page
2. Check browser console
3. Examine the logged data
4. Determine format and issue

---

## Solution Approach

### If Data is Empty Array
**Fix**: Check why Days Selected isn't being populated. May need to verify:
1. Supabase query is fetching the field correctly
2. Data is actually stored in proposal table
3. Proposal object is being constructed properly

### If Data is JSON String
**Fix**: Add parsing step in ProposalCard or in data transformation layer:

```javascript
let daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];

// Handle JSON string format
if (typeof daysSelected === 'string') {
  try {
    daysSelected = JSON.parse(daysSelected);
  } catch (e) {
    console.warn('Failed to parse Days Selected:', e);
    daysSelected = [];
  }
}
```

### If Data is Unexpected Format
**Fix**: Add validation and normalization in data transformation layer (`dataTransformers.js`):

```javascript
daysSelected: normalizeDaysFormat(rawProposal['Days Selected']),
```

---

## File Modifications Needed

### Option 1: Fix in ProposalCard.jsx (Component Level)
**Pro**: Fixes immediately
**Con**: Doesn't address root cause

**Add to line 154**:
```javascript
let daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];

// Normalize format
if (typeof daysSelected === 'string') {
  try {
    daysSelected = JSON.parse(daysSelected);
  } catch (e) {
    daysSelected = [];
  }
}

// Ensure array type
if (!Array.isArray(daysSelected)) {
  daysSelected = [];
}

const allDays = getAllDaysWithSelection(daysSelected);
```

### Option 2: Fix in dataTransformers.js (Data Layer)
**Pro**: Normalizes data upstream
**Con**: Requires understanding all data sources

**Modify line 154 in dataTransformers.js**:
```javascript
function normalizeDaysSelected(daysRaw) {
  if (!daysRaw) return [];
  if (typeof daysRaw === 'string') {
    try {
      daysRaw = JSON.parse(daysRaw);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(daysRaw) ? daysRaw : [];
}

// Then in transformProposalData:
daysSelected: normalizeDaysSelected(rawProposal['Days Selected']),
```

---

## Summary

| Aspect | Status | Confidence |
|--------|--------|-----------|
| **Component Logic is Correct** | ✓ Verified | High |
| **CSS is Applied Properly** | ✓ Verified | High |
| **Data Loading Chain is Correct** | ✓ Verified | High |
| **Issue is in Data Format or Edge Case** | ✓ Likely | High |
| **Exact Format Unknown** | ❌ Missing Info | - |
| **Solution Requires Debugging** | ✓ True | High |

---

## Next Steps

1. **PRIORITY 1**: Check Supabase directly for actual "Days Selected" format
2. **PRIORITY 2**: Add debug logging to ProposalCard
3. **PRIORITY 3**: Run with sample proposals to see logged data
4. **PRIORITY 4**: Implement fix based on findings
5. **PRIORITY 5**: Test with multiple proposals to ensure consistency

---

## Related Documentation

- **Main Analysis**: `docs/GUEST_PROPOSALS_DAY_SELECTION_ANALYSIS.md`
- **Data Flow Details**: `docs/GUEST_PROPOSALS_DATA_FLOW_DETAILED.md`
- **Code Reference**: `docs/GUEST_PROPOSALS_CODE_REFERENCE.md`
- **Related Commit**: `0924b96` (handled text day names from Supabase)
- **Recent Changes**: `4c16484` (house rules fetching)

---

## Questions for Product Owner

1. **What behavior is expected when Days Selected is empty?**
   - Show all days as unselected? (Current)
   - Show an error message?
   - Show a placeholder?

2. **Are there edge cases we should handle?**
   - What if proposal was created with incomplete data?
   - What if proposal is old and doesn't have Days Selected?

3. **Can we check a working proposal in Supabase?**
   - Need to see actual data format
   - Need to confirm Bubble sync is working

4. **Should this be an interactive selector or read-only display?**
   - Currently: Read-only display of selected days
   - Should it allow editing? (Different component needed)

---

**Investigation Date**: 2025-11-30
**Investigator**: Claude Code
**Status**: Complete - Awaiting Data Verification
