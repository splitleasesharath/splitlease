# Debug Analysis: Host Counteroffer 400 Error

**Created**: 2026-01-21 16:35:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Host Proposals Page - Counteroffer Submission

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18 (frontend), Supabase Edge Functions (Deno/TypeScript backend)
- **Data Flow**:
  1. User edits proposal in `HostEditingProposal` component
  2. `onCounteroffer` callback is invoked with edited values
  3. `useHostProposalsPageLogic.handleCounteroffer()` transforms data and calls Edge Function
  4. `/proposal` Edge Function with `action: 'update'` processes the counteroffer

### 1.2 Domain Context
- **Feature Purpose**: Allow hosts to modify proposal terms (schedule, duration, move-in date) and submit counteroffers to guests
- **Related Documentation**:
  - `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md`
  - `supabase/CLAUDE.md`
- **Data Model**: `proposal` table with `hc_*` fields for host counteroffer data

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-based (0=Sunday through 6=Saturday) - both frontend and Edge Function expect this format
- **Edge Function Pattern**: `{ action, payload }` request format
- **Field Naming**: Edge Function expects snake_case with `hc_` prefix for counteroffer fields

### 1.4 Entry Points and Dependencies
- **User Entry Point**: `/host-proposals` page -> Click proposal card -> HostEditingProposal modal -> Edit terms -> Submit
- **Critical Path**: `HostEditingProposal.handleConfirmProceed()` -> `onCounteroffer(data)` -> `useHostProposalsPageLogic.handleCounteroffer()` -> `supabase.functions.invoke('proposal', ...)`
- **Dependencies**:
  - `HostEditingProposal.jsx` - UI component for editing
  - `useHostProposalsPageLogic.js` - Logic hook with `handleCounteroffer`
  - `proposal/index.ts` - Edge Function router
  - `proposal/actions/update.ts` - Update handler
  - `proposal/lib/validators.ts` - Input validation

## 2. Problem Statement

When a host submits a counteroffer from the HostEditingProposal component, the Edge Function returns a 400 error. The console shows:
- `[useHostProposalsPageLogic] Sending counteroffer payload: Object`
- `Failed to load resource: the server responded with a status of 400 ()`
- `Failed to send counteroffer: FunctionsHttpError: Edge Function returned a non-2xx status code`

The issue is that the payload transformation in `handleCounteroffer` does not correctly handle the data format coming from `HostEditingProposal`.

## 3. Reproduction Context
- **Environment**: Production (Supabase Edge Functions)
- **Steps to reproduce**:
  1. Log in as a host
  2. Go to `/host-proposals`
  3. Click on a proposal card
  4. Click "Edit Proposal Terms"
  5. Make any change (e.g., change number of weeks)
  6. Click "Update Proposal" then "Submit Edits"
  7. Observe 400 error in console
- **Expected behavior**: Counteroffer should be saved, proposal status should change to "Host Counteroffer Submitted / Awaiting Guest Review"
- **Actual behavior**: 400 error, proposal unchanged
- **Error messages**: `FunctionsHttpError: Edge Function returned a non-2xx status code`

## 4. Investigation Summary

### 4.1 Files Examined
| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Contains `handleCounteroffer` - transforms data and calls Edge Function |
| `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx` | UI component that generates counteroffer data object |
| `app/src/islands/shared/HostEditingProposal/types.js` | Day/night conversion utilities |
| `supabase/functions/proposal/index.ts` | Edge Function router |
| `supabase/functions/proposal/actions/update.ts` | Update action handler |
| `supabase/functions/proposal/lib/validators.ts` | Input validation including `hasUpdateFields()` |
| `supabase/functions/proposal/lib/types.ts` | TypeScript interfaces for expected payload |

### 4.2 Execution Flow Trace

1. **HostEditingProposal.jsx:399-409** - User clicks "Submit Edits", `onCounteroffer` is called with:
   ```javascript
   {
     proposal,                    // Original proposal object
     numberOfWeeks: 8,            // Number
     reservationSpan: {...},      // Object with value/label/weeks
     checkIn: 'Monday',           // STRING (day name, not index!)
     checkOut: 'Friday',          // STRING (day name, not index!)
     nightsSelected: ['Monday Night', 'Tuesday Night', ...],  // STRINGS (night names!)
     daysSelected: ['Monday', 'Tuesday', ...],  // STRINGS (day names!)
     newHouseRules: [...],        // Array of rule objects
     moveInDate: Date             // Date object
   }
   ```

2. **useHostProposalsPageLogic.js:778-850** - `handleCounteroffer` receives this data and attempts to transform it:
   ```javascript
   // Current transformation logic:
   if (checkIn !== undefined) {
     // checkIn is a day object like { index: 1, display: 'Monday' }
     payload.hc_check_in = typeof checkIn === 'object' ? checkIn.index : checkIn;
   }
   ```

   **BUG**: The comment says "checkIn is a day object" but HostEditingProposal sends a STRING ('Monday'), not an object. So `typeof checkIn === 'object'` is false, and it passes the string 'Monday' directly to the Edge Function.

3. **validators.ts:216-382** - `validateUpdateProposalInput` expects:
   - `hc_check_in`: **number** (0-6)
   - `hc_check_out`: **number** (0-6)
   - `hc_nights_selected`: **number[]** (array of indices 0-6)
   - `hc_days_selected`: **number[]** (array of indices 0-6)

4. **The validation fails** because strings are being passed where numbers are expected.

### 4.3 Git History Analysis

| Commit | Date | Description |
|--------|------|-------------|
| `c7704760` | 2026-01-21 12:35 | "fix: Transform counteroffer field names to match Edge Function format" - Attempted fix but incomplete |

The commit c7704760 was a partial fix - it correctly identified the field naming issue (camelCase vs hc_snake_case) but did not address the data format issue (strings vs numbers).

## 5. Hypotheses

### Hypothesis 1: Data Type Mismatch in handleCounteroffer (Likelihood: 95%)

**Theory**: The `handleCounteroffer` function assumes `checkIn`/`checkOut` are objects with `.index` property or numbers, but `HostEditingProposal` sends day NAMES as strings ('Monday', 'Friday'). Similarly, `nightsSelected` and `daysSelected` are sent as arrays of strings, not arrays of numbers.

**Supporting Evidence**:
1. HostEditingProposal.jsx line 403-406 clearly sends string values:
   ```javascript
   checkIn: editedCheckInDay,      // String like 'Monday'
   checkOut: editedCheckOutDay,    // String like 'Friday'
   nightsSelected: editedNightsSelected,  // String[] like ['Monday Night', ...]
   daysSelected: editedDaysSelected,      // String[] like ['Monday', ...]
   ```
2. The types.js file shows `editedCheckInDay` and `editedCheckOutDay` are initialized as strings from extraction functions
3. The Edge Function validators.ts explicitly requires numbers

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log in handleCounteroffer to show exact types being received
2. Check browser console for the logged payload before sending

**Potential Fix**: Convert string day names to 0-based indices before sending to Edge Function:
```javascript
const dayNameToIndex = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
const nightNameToIndex = { 'Sunday Night': 0, 'Monday Night': 1, 'Tuesday Night': 2, 'Wednesday Night': 3, 'Thursday Night': 4, 'Friday Night': 5, 'Saturday Night': 6 };

if (checkIn !== undefined) {
  payload.hc_check_in = typeof checkIn === 'number' ? checkIn : dayNameToIndex[checkIn];
}
if (checkOut !== undefined) {
  payload.hc_check_out = typeof checkOut === 'number' ? checkOut : dayNameToIndex[checkOut];
}
if (nightsSelected !== undefined && Array.isArray(nightsSelected)) {
  payload.hc_nights_selected = nightsSelected.map(n => typeof n === 'number' ? n : nightNameToIndex[n]);
}
if (daysSelected !== undefined && Array.isArray(daysSelected)) {
  payload.hc_days_selected = daysSelected.map(d => typeof d === 'number' ? d : dayNameToIndex[d]);
}
```

**Convention Check**: This aligns with the documented day indexing convention (JS 0-based) stored in the database.

---

### Hypothesis 2: Edge Function Validation Too Strict (Likelihood: 5%)

**Theory**: The Edge Function validation could be rejecting valid payloads due to overly strict type checking.

**Supporting Evidence**: None - the validation is standard and correct.

**Contradicting Evidence**:
- The validators.ts correctly requires numbers for day indices
- The ProposalData interface uses numbers for all day-related fields
- This is consistent with the documented day indexing convention

**Verification Steps**: Review validators.ts error messages in Edge Function logs

**Convention Check**: Validation matches documented patterns.

---

## 6. Recommended Action Plan

### Priority 1 (Try First) - Fix Data Type Transformation

**File**: `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`
**Function**: `handleCounteroffer` (lines 778-850)

**Changes Required**:

1. Add day name to index conversion maps at the top of the function:
```javascript
const handleCounteroffer = useCallback(async (counterofferData) => {
  try {
    // Day name to 0-based index conversion (matches JS Date.getDay())
    const dayNameToIndex = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const nightNameToIndex = {
      'Sunday Night': 0, 'Monday Night': 1, 'Tuesday Night': 2,
      'Wednesday Night': 3, 'Thursday Night': 4, 'Friday Night': 5,
      'Saturday Night': 6
    };

    // ... existing destructuring ...
```

2. Update the checkIn conversion (around line 803):
```javascript
if (checkIn !== undefined) {
  // checkIn can be: number, string day name, or object { index, display }
  if (typeof checkIn === 'number') {
    payload.hc_check_in = checkIn;
  } else if (typeof checkIn === 'object' && checkIn.index !== undefined) {
    payload.hc_check_in = checkIn.index;
  } else if (typeof checkIn === 'string' && dayNameToIndex[checkIn] !== undefined) {
    payload.hc_check_in = dayNameToIndex[checkIn];
  }
}
```

3. Update the checkOut conversion (around line 807):
```javascript
if (checkOut !== undefined) {
  // checkOut can be: number, string day name, or object { index, display }
  if (typeof checkOut === 'number') {
    payload.hc_check_out = checkOut;
  } else if (typeof checkOut === 'object' && checkOut.index !== undefined) {
    payload.hc_check_out = checkOut.index;
  } else if (typeof checkOut === 'string' && dayNameToIndex[checkOut] !== undefined) {
    payload.hc_check_out = dayNameToIndex[checkOut];
  }
}
```

4. Update nightsSelected conversion (around line 809):
```javascript
if (nightsSelected !== undefined && Array.isArray(nightsSelected)) {
  // nightsSelected can be array of numbers or array of night names
  payload.hc_nights_selected = nightsSelected.map(n => {
    if (typeof n === 'number') return n;
    if (typeof n === 'string' && nightNameToIndex[n] !== undefined) {
      return nightNameToIndex[n];
    }
    return null;
  }).filter(n => n !== null);
}
```

5. Update daysSelected conversion (around line 813):
```javascript
if (daysSelected !== undefined && Array.isArray(daysSelected)) {
  // daysSelected can be array of numbers or array of day names
  payload.hc_days_selected = daysSelected.map(d => {
    if (typeof d === 'number') return d;
    if (typeof d === 'string' && dayNameToIndex[d] !== undefined) {
      return dayNameToIndex[d];
    }
    return null;
  }).filter(d => d !== null);
}
```

### Priority 2 (If Priority 1 Fails) - Check HostEditingProposal Output

If the fix doesn't work, add comprehensive logging in HostEditingProposal:

**File**: `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx`
**Function**: `handleConfirmProceed` (around line 398)

Add logging before calling onCounteroffer:
```javascript
const counterofferPayload = {
  proposal,
  numberOfWeeks: editedWeeks,
  reservationSpan: editedReservationSpan,
  checkIn: editedCheckInDay,
  checkOut: editedCheckOutDay,
  nightsSelected: editedNightsSelected,
  daysSelected: editedDaysSelected,
  newHouseRules: editedHouseRules,
  moveInDate: editedMoveInDate
};
console.log('[HostEditingProposal] Counteroffer payload:', JSON.stringify(counterofferPayload, null, 2));
await onCounteroffer(counterofferPayload);
```

### Priority 3 (Deeper Investigation) - Alternative: Fix at Source

Instead of converting in `handleCounteroffer`, store day indices in HostEditingProposal state from the beginning. This would be a larger refactor but more architecturally consistent.

**Files to modify**:
- `HostEditingProposal.jsx` - Change state to use indices
- `HostEditingProposal/types.js` - Already has conversion utilities
- `ScheduleSelector.jsx` - May need to accept/return indices

## 7. Prevention Recommendations

1. **Type Consistency Documentation**: Document the expected data types at the boundary between HostEditingProposal and the page logic hook. Consider adding TypeScript or JSDoc types.

2. **Unit Tests**: Add tests for `handleCounteroffer` that verify the payload transformation works with various input formats (strings, numbers, objects).

3. **Validation at Source**: Consider validating/transforming data in HostEditingProposal before passing to onCounteroffer, ensuring consistent output format.

4. **Edge Function Error Logging**: Enhance Edge Function error responses to include which field failed validation and why.

## 8. Related Files Reference

| File | Lines | Notes |
|------|-------|-------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | 778-850 | `handleCounteroffer` - needs fixes |
| `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx` | 398-429 | `handleConfirmProceed` - source of counteroffer data |
| `app/src/islands/shared/HostEditingProposal/types.js` | 1-238 | Day/night utilities - has conversion functions |
| `supabase/functions/proposal/actions/update.ts` | 1-395 | Update handler - expects hc_* fields |
| `supabase/functions/proposal/lib/validators.ts` | 216-382 | `validateUpdateProposalInput` - validates types |
| `supabase/functions/proposal/lib/types.ts` | 71-99 | `UpdateProposalInput` interface |
