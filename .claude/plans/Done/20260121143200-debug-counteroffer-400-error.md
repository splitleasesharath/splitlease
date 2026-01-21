# Debug Analysis: Counteroffer 400 Error - Host Proposals Page

**Created**: 2026-01-21 14:32:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Host Proposals Page / Proposal Edge Function

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions (Deno/TypeScript), Supabase PostgreSQL
- **Data Flow**: Frontend (`useHostProposalsPageLogic.js`) -> Supabase Edge Function (`proposal/index.ts`) -> Handler (`proposal/actions/update.ts`)

### 1.2 Domain Context
- **Feature Purpose**: Allow hosts to submit counteroffers on guest proposals, modifying terms like schedule, duration, and move-in date
- **Related Documentation**:
  - `supabase/CLAUDE.md` - Edge Functions reference
  - `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md` - Proposal function documentation
- **Data Model**:
  - `proposal` table with host counteroffer fields (`hc_*` prefixed)
  - Day indices use JavaScript 0-based format (0=Sunday through 6=Saturday)

### 1.3 Relevant Conventions
- **Day Indexing**: JavaScript 0-6 format internally; Bubble uses 1-7
- **Action-Based Edge Functions**: All requests use `{ action, payload }` pattern
- **Hollow Components**: Page logic in `useHostProposalsPageLogic.js`, UI in page component

### 1.4 Entry Points & Dependencies
- **User Entry Point**: Host clicks "Submit Edits" button on HostEditingProposal component
- **Critical Path**:
  1. `HostEditingProposal.jsx` -> `onCounteroffer` callback (line 398-409)
  2. `useHostProposalsPageLogic.js` -> `handleCounteroffer` (line 778-850)
  3. Edge Function `proposal` with action `update`
  4. Handler `proposal/actions/update.ts` -> `handleUpdate`
- **Dependencies**:
  - `HostEditingProposal/types.js` - Day/night utilities
  - `proposal/lib/validators.ts` - Input validation
  - `proposal/lib/types.ts` - TypeScript interfaces

## 2. Problem Statement

When a host attempts to submit a counteroffer from the Host Proposals page, the proposal Edge Function returns a 400 (Bad Request) error. The error occurs during input validation in the `handleUpdate` function.

**Symptoms**:
- Frontend log shows: `[useHostProposalsPageLogic] Sending counteroffer payload: Object`
- Edge Function returns: 400 status code
- Counteroffer is not saved to database

**Impact**: Hosts cannot modify proposal terms, blocking a critical negotiation workflow.

## 3. Reproduction Context

- **Environment**: Production/Development (both affected)
- **Steps to reproduce**:
  1. Log in as a host
  2. Navigate to Host Proposals page (`/host-proposals`)
  3. Click on a proposal card to open details
  4. Click "Modify Proposal" to open HostEditingProposal
  5. Make changes to schedule (e.g., change check-in/check-out days)
  6. Click "Submit Edits"
- **Expected behavior**: Counteroffer saved, proposal status changes to "Host Counteroffer Submitted / Awaiting Guest Review"
- **Actual behavior**: 400 error returned, no changes saved
- **Error messages/logs**: "Edge Function returned a non-2xx status code (400)"

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | **PRIMARY** - Contains `handleCounteroffer` that builds payload |
| `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx` | Source of counteroffer data passed to hook |
| `app/src/islands/shared/HostEditingProposal/types.js` | Day/night conversion utilities |
| `supabase/functions/proposal/index.ts` | Edge function router |
| `supabase/functions/proposal/actions/update.ts` | Update handler with validation |
| `supabase/functions/proposal/lib/validators.ts` | Input validation logic |
| `supabase/functions/proposal/lib/types.ts` | TypeScript interfaces defining expected payload |

### 4.2 Execution Flow Trace

```
1. HostEditingProposal.jsx (line 398-409)
   User clicks "Submit Edits" -> onCounteroffer called with:
   {
     proposal,
     numberOfWeeks: 8,
     checkIn: "Monday",           // STRING - day name
     checkOut: "Friday",          // STRING - day name
     nightsSelected: ["Monday Night", "Tuesday Night", ...],  // STRING ARRAY
     daysSelected: ["Monday", "Tuesday", ...],  // STRING ARRAY
     moveInDate: Date object
   }

2. useHostProposalsPageLogic.js handleCounteroffer (line 778-850)
   Transforms data to payload:
   {
     proposal_id: "...",
     status: "Host Counteroffer Submitted / Awaiting Guest Review",
     hc_reservation_span_weeks: 8,
     hc_check_in: "Monday",       // STILL STRING - not converted!
     hc_check_out: "Friday",      // STILL STRING - not converted!
     hc_nights_selected: ["Monday Night", ...],  // STILL STRINGS!
     hc_days_selected: ["Monday", ...],  // STILL STRINGS!
     hc_move_in_date: "2026-02-01"
   }

3. Edge Function proposal/actions/update.ts
   validateUpdateProposalInput(input) called

4. validators.ts validateUpdateProposalInput (line 312-342)
   Checks hc_days_selected:
   - if (!Array.isArray(input.hc_days_selected)) -> PASS (it is array)
   - if (input.hc_days_selected.length > 0 && !validateDayIndices(input.hc_days_selected)) -> FAIL!

5. validators.ts validateDayIndices (line 16-19)
   return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
   "Monday" -> Number.isInteger("Monday") -> false -> VALIDATION FAILS
```

### 4.3 Git History Analysis

Relevant commits:
- `c7704760` - "fix: Transform counteroffer field names to match Edge Function format"
  - This commit attempted to fix field naming but did NOT add day name to index conversion

The fix in `c7704760` changed:
```javascript
// Before: Used wrong field names
payload.hc_check_in_day = checkIn;

// After: Uses correct field names
payload.hc_check_in = typeof checkIn === 'object' ? checkIn.index : checkIn;
```

However, the fix assumed `checkIn` might be an object with `.index` property, but it's actually a **string** like `'Monday'`. The check `typeof checkIn === 'object'` is false, so the string passes through unchanged.

## 5. Hypotheses

### Hypothesis 1: String-to-Index Conversion Missing (Likelihood: 95%)

**Theory**: The `handleCounteroffer` function in `useHostProposalsPageLogic.js` receives day/night names as strings from `HostEditingProposal` but does not convert them to numeric indices before sending to the Edge Function. The validators expect numeric values (0-6) and reject the string values.

**Supporting Evidence**:
- `HostEditingProposal.jsx` line 402-406 passes string values: `checkIn: editedCheckInDay` where `editedCheckInDay` is initialized as string (line 185-188)
- `validators.ts` line 16-19 explicitly checks `Number.isInteger(d) && d >= 0 && d <= 6`
- The transformation logic at line 803-807 has incorrect assumption about data format

**Contradicting Evidence**: None

**Verification Steps**:
1. Add console.log to show payload before sending
2. Confirm `checkIn` is string 'Monday' not number 1

**Potential Fix**:
```javascript
// In useHostProposalsPageLogic.js handleCounteroffer
import { DAYS_OF_WEEK, nightNamesToIndices } from '../../../islands/shared/HostEditingProposal/types.js';

// Convert day name to index
const dayNameToIndex = (dayName) => {
  if (typeof dayName === 'number') return dayName;
  const day = DAYS_OF_WEEK.find(d => d.name === dayName);
  return day?.dayIndex ?? null;
};

// In payload construction:
if (checkIn !== undefined) {
  payload.hc_check_in = dayNameToIndex(checkIn);
}
if (checkOut !== undefined) {
  payload.hc_check_out = dayNameToIndex(checkOut);
}
if (nightsSelected !== undefined && Array.isArray(nightsSelected)) {
  payload.hc_nights_selected = nightNamesToIndices(nightsSelected);
}
if (daysSelected !== undefined && Array.isArray(daysSelected)) {
  payload.hc_days_selected = daysSelected.map(dayNameToIndex).filter(d => d !== null);
}
```

**Convention Check**: This aligns with documented day indexing convention (JavaScript 0-6 format) in CLAUDE.md.

### Hypothesis 2: HostEditingProposal Should Return Indices (Likelihood: 30%)

**Theory**: The `HostEditingProposal` component should be updated to return numeric indices instead of string names in its `onCounteroffer` callback.

**Supporting Evidence**:
- The component already imports and uses `nightNamesToIndices` utility
- Internal state uses indices in some places

**Contradicting Evidence**:
- Component is designed for human readability with string names
- Would require changes to multiple form inputs and state variables
- More invasive change with higher regression risk

**Verification Steps**: Review if other consumers of HostEditingProposal expect strings

**Potential Fix**: Update `handleConfirmProceed` to convert values before calling callback

**Convention Check**: Either approach is valid; converting at the boundary (in the hook) is cleaner per "Convert at API boundaries" principle.

### Hypothesis 3: Validation Should Accept Strings (Likelihood: 5%)

**Theory**: The Edge Function validators could be updated to accept both string names and numeric indices.

**Supporting Evidence**: Would make API more flexible

**Contradicting Evidence**:
- Violates existing contract
- Increases complexity
- Day name strings are locale-dependent
- All other clients send numeric indices

**Verification Steps**: Review all clients of the update action

**Potential Fix**: Add string-to-index conversion in validators

**Convention Check**: This contradicts the documented convention of using numeric indices.

## 6. Recommended Action Plan

### Priority 1 (Try First) - Convert Strings to Indices in Hook

**Implementation Details**:

1. **File**: `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`

2. **Add import at top** (around line 18):
```javascript
import { DAYS_OF_WEEK, nightNamesToIndices } from '../../shared/HostEditingProposal/types.js';
```

3. **Add helper function** (before `handleCounteroffer`):
```javascript
/**
 * Convert day name to 0-based day index
 * @param {string|number} dayName - Day name ('Monday') or index (1)
 * @returns {number|null} 0-based day index or null if invalid
 */
const dayNameToIndex = (dayName) => {
  if (typeof dayName === 'number') return dayName;
  if (typeof dayName !== 'string') return null;
  const day = DAYS_OF_WEEK.find(d =>
    d.name.toLowerCase() === dayName.toLowerCase()
  );
  return day?.dayIndex ?? null;
};
```

4. **Update payload construction** in `handleCounteroffer` (lines 798-822):
```javascript
// Only include fields that were actually provided/changed
if (numberOfWeeks !== undefined) {
  payload.hc_reservation_span_weeks = numberOfWeeks;
}
if (checkIn !== undefined) {
  // Convert day name to index
  const checkInIndex = dayNameToIndex(checkIn);
  if (checkInIndex !== null) {
    payload.hc_check_in = checkInIndex;
  }
}
if (checkOut !== undefined) {
  // Convert day name to index
  const checkOutIndex = dayNameToIndex(checkOut);
  if (checkOutIndex !== null) {
    payload.hc_check_out = checkOutIndex;
  }
}
if (nightsSelected !== undefined && Array.isArray(nightsSelected)) {
  // Convert night names to indices
  payload.hc_nights_selected = nightNamesToIndices(nightsSelected);
}
if (daysSelected !== undefined && Array.isArray(daysSelected)) {
  // Convert day names to indices
  payload.hc_days_selected = daysSelected
    .map(dayNameToIndex)
    .filter(idx => idx !== null);
}
if (moveInDate !== undefined) {
  // moveInDate should be ISO string
  payload.hc_move_in_date = moveInDate instanceof Date
    ? moveInDate.toISOString().split('T')[0]
    : moveInDate;
}
```

5. **Add debug logging** (temporarily):
```javascript
console.log('[useHostProposalsPageLogic] Counteroffer input:', {
  checkIn, checkOut, nightsSelected, daysSelected
});
console.log('[useHostProposalsPageLogic] Converted payload:', payload);
```

### Priority 2 (If Priority 1 Fails) - Debug Backend Validation

If the fix doesn't work:
1. Check Edge Function logs for exact validation error
2. Verify `nightNamesToIndices` returns correct format
3. Ensure status transition is valid

### Priority 3 (Deeper Investigation) - Full Integration Test

1. Test with Playwright:
   - Login as host
   - Navigate to host-proposals
   - Modify proposal terms
   - Submit counteroffer
   - Verify database update

## 7. Prevention Recommendations

1. **Type Safety**: Consider TypeScript for `useHostProposalsPageLogic.js` to catch type mismatches at compile time

2. **Input Validation at Boundary**: Add client-side validation before sending to Edge Function:
```javascript
if (!Number.isInteger(payload.hc_check_in)) {
  console.error('hc_check_in must be numeric');
  throw new Error('Invalid check-in day format');
}
```

3. **Integration Tests**: Add E2E test for counteroffer flow covering:
   - Standard counteroffer
   - Counteroffer with only schedule change
   - Counteroffer with only date change

4. **Documentation**: Update `HostEditingProposal` component docs to clarify output format of `onCounteroffer` callback

## 8. Related Files Reference

| File | Lines to Modify | Purpose |
|------|-----------------|---------|
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\HostProposalsPage\useHostProposalsPageLogic.js` | 18-19 (import), ~775 (helper), 798-822 (payload) | Add day name to index conversion |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\HostEditingProposal\types.js` | N/A | Reference for `DAYS_OF_WEEK`, `nightNamesToIndices` |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\proposal\actions\update.ts` | N/A | No changes needed |
| `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\proposal\lib\validators.ts` | N/A | No changes needed |

---

**Analysis Completed By**: Claude (debug-analyst)
**Confidence Level**: High (95% confident in root cause)
**Estimated Fix Time**: 30 minutes
