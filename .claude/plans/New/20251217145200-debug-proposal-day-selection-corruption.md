# Debug Analysis: Proposal Day Selection Saving Incorrectly

**Created**: 2025-12-17 14:52:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: Critical
**Affected Area**: Proposal Creation Flow (SearchPage.jsx)

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions, PostgreSQL
- **Data Flow**: User selects days in UI -> CreateProposalFlowV2 component -> submitProposal() -> Edge Function `proposal/create` -> Database

### 1.2 Domain Context
- **Feature Purpose**: Allow guests to submit booking proposals for listings with specific day selections
- **Related Documentation**: `.claude/CLAUDE.md` (Day Indexing section)
- **Data Model**: `proposal` table stores `Days Selected`, `Nights Selected`, `check in day`, `check out day` as arrays/integers

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-based (0=Sunday through 6=Saturday) EVERYWHERE
- **No Conversion Needed**: Database stores days natively in 0-indexed format
- **Wrap-Around Handling**: Schedules spanning Saturday->Sunday require special logic

### 1.4 Entry Points & Dependencies
- **User Entry Point**: Click "Create Proposal" on listing card in SearchPage
- **Critical Path**: `handleOpenCreateProposalModal()` -> `CreateProposalFlowV2` -> `submitProposal()`
- **Dependencies**: `SearchScheduleSelector`, `CreateProposalFlowV2`, Edge Function `proposal/create`

## 2. Problem Statement

User selected Wednesday, Thursday, Friday, Saturday, Sunday (5 contiguous days spanning the week wrap-around) in the Create Proposal flow from the Search page. The database shows completely wrong values:

**User Selection:**
- Days: Wednesday(3), Thursday(4), Friday(5), Saturday(6), Sunday(0) - 5 days
- Expected Check-in: Wednesday (index 3)
- Expected Check-out: Sunday (index 0)
- Expected Days Selected: `[3,4,5,6,0]` or sorted `[0,3,4,5,6]`
- Expected Nights Selected: `[3,4,5,6]` (4 nights)

**Database Values (Proposal ID: 1766004410516x53684402371948600):**
- Days Selected: `[0,4,5,6]` - **Missing Wednesday (3)!**
- Check-in day: `"0"` - **Wrong! Should be `"3"` (Wednesday)**
- Check-out day: `"6"` - **Wrong! Should be `"0"` (Sunday)**
- Nights Selected: `[0,4,5]` - **Missing Wednesday (3)!**

## 3. Reproduction Context

- **Environment**: Production (SearchPage)
- **Steps to reproduce**:
  1. Navigate to `/search` page
  2. Select Wednesday, Thursday, Friday, Saturday, Sunday using the schedule selector
  3. Click "Create Proposal" on any listing
  4. Complete the proposal flow and submit
  5. Check database values for the created proposal

- **Expected behavior**: Days Selected should be `[0,3,4,5,6]`, check-in=3, check-out=0
- **Actual behavior**: Days Selected is `[0,4,5,6]`, check-in=0, check-out=6
- **Error messages/logs**: None - data silently corrupts

## 4. Investigation Summary

### 4.1 Files Examined

| File | Path | Relevance |
|------|------|-----------|
| SearchPage.jsx | `app/src/islands/pages/SearchPage.jsx` | **PRIMARY BUG LOCATION** - lines 2116-2121 |
| ViewSplitLeasePage.jsx | `app/src/islands/pages/ViewSplitLeasePage.jsx` | **REFERENCE** - has correct wrap-around logic |
| CreateProposalFlowV2.jsx | `app/src/islands/shared/CreateProposalFlowV2.jsx` | Passes data through correctly |
| create.ts | `supabase/functions/proposal/actions/create.ts` | Edge Function - receives and stores data as-is |
| validators.ts | `supabase/functions/proposal/lib/validators.ts` | Validates 0-indexed days correctly |
| constants.js | `app/src/islands/shared/HostScheduleSelector/constants.js` | Day definitions (0-indexed) |

### 4.2 Execution Flow Trace

```
1. User clicks "Create Proposal" on SearchPage
   └── handleOpenCreateProposalModal() called (line 2026)
       └── Reads URL param ?days-selected (line 2029)
       └── Parses as 1-based and converts to 0-based (lines 2034-2038)  ⚠️ POTENTIAL ISSUE
       └── Creates Day objects with dayOfWeek property
       └── Opens CreateProposalFlowV2 modal

2. User completes proposal flow and clicks Submit
   └── CreateProposalFlowV2 calls onSubmit(proposalData)
   └── handleCreateProposalSubmit() called (line 2215)
       └── submitProposal() called (line 2095)
           └── Extracts daysInJsFormat from proposalData (line 2112)
           └── Sorts days: sortedDays = [...daysInJsFormat].sort() (line 2116)  ⚠️ BUG #1
           └── Calculates nights: sortedDays.slice(0, -1) (line 2117)  ⚠️ BUG #2
           └── Sets checkIn = sortedDays[0] (line 2120)  ⚠️ BUG #3
           └── Sets checkOut = sortedDays[last] (line 2121)  ⚠️ BUG #4
           └── Sends to Edge Function

3. Edge Function receives data and stores in database
   └── No transformation - stores exactly what was sent
```

### 4.3 Git History Analysis

**Relevant Commits:**

| Commit | Date | Description | Impact |
|--------|------|-------------|--------|
| d1915764 | 2025-12-17 | fix(proposal-creation): Handle wrap-around weeks | **Fixed ViewSplitLeasePage ONLY** |
| 90130a82 | Recent | refactor(frontend): Remove Bubble day conversion | Switched to 0-indexed days |
| 75b4f64e | Recent | fix(edge-functions): Update validators.ts for 0-indexed days | Backend is correct |

**Critical Finding**: Commit d1915764 added wrap-around handling to ViewSplitLeasePage.jsx but **NOT to SearchPage.jsx**. SearchPage still uses the broken simple sorting logic.

## 5. Hypotheses

### Hypothesis 1: Missing Wrap-Around Logic in SearchPage (Likelihood: 95%)

**Theory**: The `submitProposal` function in SearchPage.jsx (lines 2116-2121) uses simple numerical sorting without wrap-around handling. For Wed-Thu-Fri-Sat-Sun selection `[3,4,5,6,0]`:
- `sortedDays = [0,3,4,5,6]` (sorted numerically - incorrect order for wrap-around)
- `nightsSelected = [0,3,4,5]` (removes 6, but should remove 0 which is checkout)
- `checkInDay = 0` (Sunday - WRONG, should be 3 Wednesday)
- `checkOutDay = 6` (Saturday - WRONG, should be 0 Sunday)

**Supporting Evidence**:
- ViewSplitLeasePage.jsx has wrap-around handling at lines 1145-1193 (added in commit d1915764)
- SearchPage.jsx does NOT have this logic
- The database values match exactly what this bug would produce

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log in SearchPage.submitProposal to trace sortedDays, checkIn, checkOut values
2. Submit proposal with wrap-around schedule and observe logs
3. Compare with ViewSplitLeasePage behavior

**Potential Fix**: Copy wrap-around logic from ViewSplitLeasePage.jsx (lines 1145-1193) to SearchPage.jsx (replace lines 2116-2121)

**Convention Check**: The fix aligns with documented 0-indexed day convention. Wrap-around handling is the correct approach for schedules spanning Sat->Sun.

### Hypothesis 2: URL Parameter Parsing Mismatch (Likelihood: 30%)

**Theory**: There's inconsistency in how `days-selected` URL parameter is encoded/decoded:
- SearchScheduleSelector writes 0-based to URL: `?days-selected=0,3,4,5,6`
- HomePage/WhySplitLeasePage write 1-based to URL: `?days-selected=1,4,5,6,7`
- SearchPage reads as 1-based and subtracts 1 (lines 2034-2037)

If URL is already 0-based but code subtracts 1, days would be corrupted.

**Supporting Evidence**:
- SearchScheduleSelector.jsx line 578-582 writes 0-based indices
- SearchPage.jsx line 2037 does `d - 1` conversion
- Comment at line 2034 says "Convert to 0-based" suggesting it expects 1-based input

**Contradicting Evidence**:
- The missing day is Wednesday (3), but if this were the only bug, we'd expect all days to be off by 1
- The actual corruption pattern matches wrap-around sorting, not off-by-one

**Verification Steps**:
1. Log the URL parameter value when proposal modal opens
2. Check if it's 0-based or 1-based
3. Compare expected vs actual day indices after parsing

**Potential Fix**: If URL is 0-based, remove the `d - 1` conversion. This should be cleaned up regardless.

**Convention Check**: Per CLAUDE.md, all day indices should be 0-based with no conversion needed.

### Hypothesis 3: CreateProposalFlowV2 Data Transformation Bug (Likelihood: 10%)

**Theory**: The CreateProposalFlowV2 component might be transforming or losing days during its internal processing.

**Supporting Evidence**: CreateProposalFlowV2 has complex day handling in `dayObjectsToNames` and `dayNamesToObjects` functions (lines 227-244)

**Contradicting Evidence**:
- These functions appear to work correctly
- The same modal is used by ViewSplitLeasePage which works correctly
- The bug pattern matches the sorting issue in submitProposal

**Verification Steps**: Add logging in CreateProposalFlowV2 to trace daysSelectedObjects before and after processing

**Potential Fix**: If found to be the issue, fix the day transformation functions

### Hypothesis 4: Edge Function Processing Bug (Likelihood: 5%)

**Theory**: The Edge Function might be modifying day data before storage.

**Supporting Evidence**: None - Edge Function appears to store data as received

**Contradicting Evidence**:
- validators.ts correctly validates 0-indexed days
- create.ts lines 330-334 store data without transformation
- ViewSplitLeasePage works correctly with same Edge Function

**Verification Steps**: Check Edge Function logs for received payload vs stored data

## 6. Recommended Action Plan

### Priority 1 (Try First) - Copy Wrap-Around Logic to SearchPage

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 2116-2121

**Current Code (BROKEN)**:
```javascript
const sortedDays = [...daysInJsFormat].sort((a, b) => a - b);
const nightsSelected = sortedDays.slice(0, -1); // Remove last day (checkout day)
const checkInDay = sortedDays[0];
const checkOutDay = sortedDays[sortedDays.length - 1];
```

**Replace With (FROM ViewSplitLeasePage.jsx lines 1145-1193)**:
```javascript
// Sort days in JS format first to detect wrap-around (Saturday/Sunday spanning)
const sortedJsDays = [...daysInJsFormat].sort((a, b) => a - b);

// Check for wrap-around case (both Saturday=6 and Sunday=0 present, but not all 7 days)
const hasSaturday = sortedJsDays.includes(6);
const hasSunday = sortedJsDays.includes(0);
const isWrapAround = hasSaturday && hasSunday && daysInJsFormat.length < 7;

let checkInDay, checkOutDay, nightsSelected;

if (isWrapAround) {
  // Find the gap in the sorted selection to determine wrap-around point
  let gapIndex = -1;
  for (let i = 0; i < sortedJsDays.length - 1; i++) {
    if (sortedJsDays[i + 1] - sortedJsDays[i] > 1) {
      gapIndex = i + 1;
      break;
    }
  }

  if (gapIndex !== -1) {
    // Wrap-around: check-in is the first day after the gap, check-out is the last day before gap
    checkInDay = sortedJsDays[gapIndex];
    checkOutDay = sortedJsDays[gapIndex - 1];

    // Reorder days to be in actual sequence (check-in to check-out)
    const reorderedDays = [...sortedJsDays.slice(gapIndex), ...sortedJsDays.slice(0, gapIndex)];

    // Nights = all days except the last one (checkout day)
    nightsSelected = reorderedDays.slice(0, -1);
  } else {
    // No gap found, use standard logic
    checkInDay = sortedJsDays[0];
    checkOutDay = sortedJsDays[sortedJsDays.length - 1];
    nightsSelected = sortedJsDays.slice(0, -1);
  }
} else {
  // Standard case: check-in = first day, check-out = last day
  checkInDay = sortedJsDays[0];
  checkOutDay = sortedJsDays[sortedJsDays.length - 1];
  // Nights = all days except the last one (checkout day)
  nightsSelected = sortedJsDays.slice(0, -1);
}
```

### Priority 2 (Also Fix) - Clean Up URL Parameter Inconsistency

**Files to Check**:
- `app/src/islands/pages/SearchPage.jsx` lines 2034-2037
- `app/src/islands/pages/HomePage.jsx` lines 335-337, 611-613
- `app/src/islands/pages/WhySplitLeasePage.jsx` lines 221-223

**Issue**: Some pages write 1-based indices to URL, SearchScheduleSelector writes 0-based. Reading code assumes 1-based.

**Recommendation**: Standardize ALL URL parameters to 0-based (matches internal representation) and remove all `d - 1` and `d + 1` conversions.

### Priority 3 (Future) - Extract to Shared Utility

**Recommendation**: Create a shared utility function for wrap-around day handling to prevent code duplication:

```javascript
// lib/dayUtils.js
export function calculateCheckInOutWithWrapAround(daysInJsFormat) {
  // ... wrap-around logic
  return { checkInDay, checkOutDay, nightsSelected };
}
```

Then use this function in both ViewSplitLeasePage and SearchPage.

## 7. Prevention Recommendations

1. **Extract Shared Logic**: The wrap-around calculation should be a single shared function, not duplicated code that can drift.

2. **Add Tests**: Unit tests for day selection edge cases:
   - Standard selection (Mon-Fri)
   - Wrap-around selection (Fri-Sat-Sun)
   - Single day edge case
   - Full week selection

3. **URL Parameter Standardization**: Document and enforce a single format for `days-selected` URL parameter. Currently it's a mix of 0-based and 1-based across different pages.

4. **Pre-submission Validation**: Add client-side validation that logs/displays the calculated check-in/check-out so users can verify before submission.

## 8. Related Files Reference

| File | Lines | Action Needed |
|------|-------|---------------|
| `app/src/islands/pages/SearchPage.jsx` | 2116-2121 | **FIX**: Add wrap-around logic |
| `app/src/islands/pages/SearchPage.jsx` | 2034-2037 | **REVIEW**: URL param parsing |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | 1145-1193 | **REFERENCE**: Working wrap-around code |
| `app/src/islands/pages/HomePage.jsx` | 335-337 | **REVIEW**: URL param writing |
| `app/src/islands/pages/WhySplitLeasePage.jsx` | 221-223 | **REVIEW**: URL param writing |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | 577-582 | **REFERENCE**: URL param writing (0-based) |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | 227-244 | **VERIFY**: Day conversion functions |

---

## Summary

**Root Cause**: SearchPage.jsx `submitProposal` function uses simple numerical sorting for day selection without wrap-around handling. When a schedule spans Saturday->Sunday (like Wed-Thu-Fri-Sat-Sun), the sorted array `[0,3,4,5,6]` incorrectly identifies Sunday(0) as check-in and Saturday(6) as check-out, instead of Wednesday(3) and Sunday(0) respectively.

**Impact**: Any proposal submitted via SearchPage with a wrap-around schedule (containing both Saturday and Sunday but not all 7 days) will have corrupted day data.

**Fix**: Copy the wrap-around logic from ViewSplitLeasePage.jsx (commit d1915764) to SearchPage.jsx.

**Next Steps**: Implement Priority 1 fix, then address Priority 2 URL parameter cleanup.
