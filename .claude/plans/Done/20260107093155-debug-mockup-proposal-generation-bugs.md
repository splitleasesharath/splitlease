# Debug Analysis: Mockup Proposal Generation Bugs

**Created**: 2026-01-07 09:31:55
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Mockup Proposal Creation for New Host Listings (Edge Function)

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Edge Functions backend
- **Tech Stack**: React 18 (frontend), Supabase Edge Functions (Deno/TypeScript), PostgreSQL
- **Data Flow**: Host submits listing -> `listing` Edge Function -> `handleSubmit()` -> `handleCreateMockupProposal()` -> Proposal inserted into Supabase -> Queued for Bubble sync

### 1.2 Domain Context
- **Feature Purpose**: When a host submits their first listing, a mockup (demonstration) proposal is automatically created to help them understand the proposal review process.
- **Related Documentation**:
  - `supabase/CLAUDE.md` (Edge Functions reference)
  - `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` (pricing logic)
- **Data Model**:
  - `listing` table: Contains pricing tiers (`💰Nightly Host Rate for X nights`), rental type, available days/nights
  - `proposal` table: Contains calculated compensation, days/nights selected, duration, status
  - Junction: `user_proposals` (relates users to proposals)

### 1.3 Relevant Conventions
- **Day Indexing**:
  - JavaScript: 0-6 (Sunday=0 through Saturday=6)
  - Bubble: 1-7 (Sunday=1 through Saturday=7)
  - Database stores 0-indexed natively, but mockup proposal code explicitly uses Bubble format (1-7)
- **Pricing Fields in Listing**:
  - `💰Nightly Host Rate for 1 night` through `💰Nightly Host Rate for 7 nights`
  - Note: 6-night rate was added recently (migration `20251221_add_6_night_rate_column.sql`)
- **Layer Boundaries**: Frontend uses `getNightlyRateByFrequency.js`, Edge Functions use `getNightlyRateForNights()` in `createMockupProposal.ts`

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: Host completes listing wizard -> Clicks submit -> `listing` Edge Function receives `submit` action
- **Critical Path**: `handleSubmit()` in `supabase/functions/listing/handlers/submit.ts` calls `handleCreateMockupProposal()` after successful listing creation
- **Dependencies**:
  - `_shared/queueSync.ts` for Bubble sync
  - `_shared/jsonUtils.ts` for parsing JSON arrays
  - `_shared/junctionHelpers.ts` for user-proposal relationships

## 2. Problem Statement

Three distinct bugs in mockup proposal generation for nightly listings:

### Bug 1: Wrong Compensation Rate
- **Symptom**: Mockup proposals display 7-night rate ($224/night) when they should show the rate matching actual nights selected
- **Example**: Mon-Sun checkout = 6 nights staying -> should show 6-night rate ($232/nt), not 7-night rate ($224/nt)
- **Impact**: Hosts see incorrect pricing, creating confusion about how their listing will be priced

### Bug 2: Duration Too Short
- **Symptom**: Mockup proposals are created with 4 weeks duration
- **Expected**: Minimum 13 weeks (to match real proposal requirements)
- **Impact**: Unrealistic demonstration that doesn't reflect actual booking patterns

### Bug 3: Incorrect Night Selection Logic for "All Nights Available"
- **Symptom**: When all nights are available, the mockup selects all 7 nights (Sun-Sat)
- **Expected**: For nightly listings with all nights available, select weekdays only (Mon-Fri with checkout = 4 nights staying)
- **Impact**: Creates unrealistic proposals that don't match typical guest booking patterns

## 3. Reproduction Context
- **Environment**: Production/any environment with mockup proposal generation enabled
- **Steps to reproduce**:
  1. Create a new nightly listing with "All nights available"
  2. Set pricing tiers (e.g., 4-night rate: $240/nt, 6-night rate: $232/nt, 7-night rate: $224/nt)
  3. Submit listing
  4. Check Host Proposals page for the mockup proposal
- **Expected behavior**:
  - Night selection: Mon-Fri (check-in) = 4 nights staying, showing 4-night rate
  - Duration: 13 weeks minimum
  - Compensation: Matches actual nights in mockup
- **Actual behavior**:
  - Night selection: Sun-Sat (7 nights)
  - Duration: 4 weeks
  - Compensation: 7-night rate regardless of actual selection

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `supabase/functions/listing/handlers/createMockupProposal.ts` | **PRIMARY** - Contains all mockup generation logic |
| `supabase/functions/proposal/lib/calculations.ts` | Reference - How proposals calculate compensation |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Reference - Frontend pricing logic (has 6-night support) |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Display - How compensation is shown to users |

### 4.2 Execution Flow Trace

```
handleCreateMockupProposal() called
  │
  ├─ Step 1: Fetch mock guest user (splitleasefrederick@gmail.com)
  │
  ├─ Step 2: Fetch listing data (pricing tiers, rental type, availability)
  │
  ├─ Step 3: getDayNightConfig(rentalType, listing) <-- BUG SOURCE
  │   │
  │   ├─ For 'monthly': Returns weekdays, 13 weeks (correct)
  │   ├─ For 'weekly': Returns weekdays, 4 weeks (correct for weekly)
  │   └─ For 'nightly':
  │       ├─ IF availableNights.length > 5: Returns ALL 7 days/nights, 4 weeks <-- BUG 2 & 3
  │       └─ ELSE: Returns actual availability, 4 weeks <-- BUG 2
  │
  ├─ Step 5: calculatePricing() <-- BUG 1 SOURCE
  │   │
  │   └─ getNightlyRateForNights(listing, nightsPerWeek)
  │       │
  │       ├─ Checks rateMap for exact match (2,3,4,5,7 nights)
  │       ├─ For 6 nights: Falls back to 7-night rate <-- OUTDATED, 6-night rate now exists
  │       └─ No support for 1-night rate in rateMap
  │
  └─ Step 8: Insert proposal with calculated values
```

### 4.3 Git History Analysis

Recent commits affecting this file:
- `5ac8fa82`: Fixed host compensation pricing calculation (recent)
- `936cf010`: Removed account_host dependency
- `c9d9800d`: Refactored to remove account-host dependency

The 6-night rate column was added in migration `20251221_add_6_night_rate_column.sql`, but the `getNightlyRateForNights()` function in `createMockupProposal.ts` was not updated to use it.

## 5. Hypotheses

### Hypothesis 1: getDayNightConfig() Uses Wrong Night Selection for Nightly Full Availability (Likelihood: 95%)

**Theory**: When `availableNights.length > 5` (all nights available), the function returns all 7 days/nights instead of selecting the optimal weekday pattern.

**Supporting Evidence**:
- Code at lines 205-218 explicitly sets `nightsPerWeek: 7` when full availability
- Comment says "Full availability" but doesn't implement weekday-only logic
- Screenshots show Mon-Sun checkout being created

**Contradicting Evidence**: None

**Verification Steps**:
1. Check listing with all 7 nights available
2. Verify mockup creates Sun-Sun or similar 7-night proposal

**Potential Fix**:
```typescript
// In getDayNightConfig(), nightly case, when availableNights.length > 5:
// Instead of all 7 nights, select weekdays only (Mon-Fri checkout = 4 nights)
return {
  daysSelected: [2, 3, 4, 5, 6], // Mon-Fri (Bubble format)
  nightsSelected: [2, 3, 4, 5],  // Mon-Thu nights (4 nights staying)
  checkIn: 2,                     // Monday
  checkOut: 6,                    // Friday
  checkInDayJS: 1,               // Monday in JS
  nightsPerWeek: 4,              // 4 nights
  reservationSpanWeeks: 13,      // Minimum 13 weeks
};
```

**Convention Check**: Aligns with monthly pattern which also uses Mon-Fri weekdays with 13 weeks.

---

### Hypothesis 2: reservationSpanWeeks Hardcoded to 4 for Nightly Listings (Likelihood: 95%)

**Theory**: The `reservationSpanWeeks` is hardcoded to `4` for all nightly listings regardless of the expected minimum.

**Supporting Evidence**:
- Lines 217, 244: Both nightly branches return `reservationSpanWeeks: 4`
- Monthly correctly uses `reservationSpanWeeks: 13`
- Weekly correctly uses `reservationSpanWeeks: 4` (appropriate for weekly rentals)

**Contradicting Evidence**: None

**Verification Steps**:
1. Check proposal creation, verify `Reservation Span (Weeks)` = 4

**Potential Fix**:
Change `reservationSpanWeeks: 4` to `reservationSpanWeeks: 13` in the nightly branches (lines 217 and 244).

**Convention Check**: Matches monthly pattern and business requirement for minimum duration.

---

### Hypothesis 3: getNightlyRateForNights() Missing 6-Night Rate Support (Likelihood: 90%)

**Theory**: The `getNightlyRateForNights()` function in `createMockupProposal.ts` doesn't fetch or use the 6-night rate field that was recently added to the database.

**Supporting Evidence**:
- Lines 76-82 define `rateMap` with only: 2, 3, 4, 5, 7 night rates
- Line 91: For 6 nights, falls back to 7-night rate: `if (nightsPerWeek === 6 && rateMap[7])...`
- Migration `20251221_add_6_night_rate_column.sql` added `💰Nightly Host Rate for 6 nights`
- Frontend `getNightlyRateByFrequency.js` (line 65) correctly includes 6-night rate

**Contradicting Evidence**:
- If mockup creates 7-night proposals (per Hypothesis 1), this bug wouldn't manifest because 7-night exact match exists

**Verification Steps**:
1. Create listing with 6 nights available (not 7)
2. Verify mockup shows 7-night rate instead of 6-night rate

**Potential Fix**:
1. Add `💰Nightly Host Rate for 6 nights` to the listing query (Step 2)
2. Add `6` to the `rateMap` in `getNightlyRateForNights()`

**Convention Check**: Would align with frontend implementation which already has 6-night support.

---

### Hypothesis 4: Listing Query Missing 6-Night Rate Field (Likelihood: 85%)

**Theory**: The Supabase query that fetches listing data doesn't include the 6-night rate column.

**Supporting Evidence**:
- Lines 377-395: The listing query doesn't include `💰Nightly Host Rate for 6 nights`
- Lines 44-63: The `ListingData` interface doesn't include this field
- Recent migration added the column, but handler wasn't updated

**Contradicting Evidence**: None

**Verification Steps**:
1. Check listing data returned from query, verify 6-night rate is null/undefined

**Potential Fix**:
1. Add `"💰Nightly Host Rate for 6 nights"` to the select query at line 389
2. Add the field to the `ListingData` interface at line 44

**Convention Check**: Standard pattern for adding new columns - query and types must both be updated.

---

### Hypothesis 5: Night Count Mismatch in Full Availability Case (Likelihood: 80%)

**Theory**: When all nights are available, the code sets `nightsPerWeek: 7` but the actual proposal shows "Monday to Sunday (checkout)" which is 6 nights, not 7. The checkout day is not a "staying" night.

**Supporting Evidence**:
- Screenshot shows "Monday to Sunday (checkout)" = check-in Monday, check-out Sunday
- 6 nights staying: Mon night, Tue night, Wed night, Thu night, Fri night, Sat night
- But mockup sets `nightsPerWeek: 7` and uses 7-night rate

**Contradicting Evidence**:
- Need to verify what `checkIn: 1, checkOut: 1` actually means (both Sunday?)

**Verification Steps**:
1. Verify actual check-in/check-out days in created mockup
2. Count actual staying nights vs. `nightsPerWeek` field

**Potential Fix**:
If changing to weekday pattern (Hypothesis 1), this becomes irrelevant. Otherwise:
- Ensure `nightsPerWeek` reflects actual staying nights, not days selected

**Convention Check**: Throughout codebase, "nights" should reflect actual overnight stays, not day count.

## 6. Recommended Action Plan

### Priority 1 (Fix All Three Bugs Together)

**Files to Modify**: `supabase/functions/listing/handlers/createMockupProposal.ts`

#### Step 1: Update ListingData Interface (Lines 44-63)
Add the 6-night rate field:
```typescript
interface ListingData {
  // ... existing fields ...
  '💰Nightly Host Rate for 6 nights'?: number;  // ADD THIS
  // ... rest of fields ...
}
```

#### Step 2: Update Listing Query (Lines 377-395)
Add 6-night rate to the select:
```sql
"💰Nightly Host Rate for 6 nights",
```

#### Step 3: Update getNightlyRateForNights() (Lines 75-100)
Add 6-night rate to the rate map:
```typescript
const rateMap: Record<number, number | undefined> = {
  2: listing['💰Nightly Host Rate for 2 nights'],
  3: listing['💰Nightly Host Rate for 3 nights'],
  4: listing['💰Nightly Host Rate for 4 nights'],
  5: listing['💰Nightly Host Rate for 5 nights'],
  6: listing['💰Nightly Host Rate for 6 nights'],  // ADD THIS
  7: listing['💰Nightly Host Rate for 7 nights'],
};
```

Remove or update the fallback at lines 89-92:
```typescript
// Remove this fallback - we now have 6-night rate
// if (nightsPerWeek === 6 && rateMap[7] && rateMap[7] > 0) {
//   return rateMap[7]!;
// }
```

#### Step 4: Update getDayNightConfig() Nightly Case (Lines 205-247)

Replace the nightly case logic:
```typescript
case 'nightly':
default:
  // Check if all nights available (more than 5)
  if (availableNights.length > 5) {
    // Full availability: Use weekday pattern (Mon-Fri checkout = 4 nights)
    // This creates a realistic demonstration proposal
    return {
      daysSelected: [2, 3, 4, 5, 6],  // Mon-Fri (Bubble format)
      nightsSelected: [2, 3, 4, 5],   // Mon-Thu nights (4 staying nights)
      checkIn: 2,                      // Monday
      checkOut: 6,                     // Friday
      checkInDayJS: 1,                // Monday in JS
      nightsPerWeek: 4,
      reservationSpanWeeks: 13,       // Minimum 13 weeks
    };
  } else {
    // Limited availability: Use available nights minus one
    // (Reserve one night for flexibility)
    const nightsCount = Math.max(1, availableNights.length - 1);
    const sortedNights = availableNights.length > 0
      ? [...availableNights].sort((a, b) => a - b).slice(0, nightsCount)
      : [2, 3, 4, 5]; // Default Mon-Thu

    // Days = nights + checkout day
    const lastNight = sortedNights[sortedNights.length - 1];
    let checkOutDay = lastNight + 1;
    if (checkOutDay > 7) checkOutDay = 1;

    const sortedDays = [...sortedNights, checkOutDay].sort((a, b) => a - b);
    const checkInDay = sortedDays[0];
    const checkInDayJS = checkInDay - 1; // Convert to JS format

    return {
      daysSelected: sortedDays,
      nightsSelected: sortedNights,
      checkIn: checkInDay,
      checkOut: checkOutDay,
      checkInDayJS: checkInDayJS,
      nightsPerWeek: nightsCount,
      reservationSpanWeeks: 13,       // Minimum 13 weeks
    };
  }
```

### Priority 2 (If Priority 1 Causes Issues)

Simpler fix - just change the constants:
1. Change `reservationSpanWeeks: 4` to `reservationSpanWeeks: 13` in both nightly branches
2. Change full availability case to use `nightsPerWeek: 4` with weekday selection
3. Keep 6-night fallback but log a warning

### Priority 3 (Deeper Investigation)

If the compensation still doesn't match after Priority 1:
1. Verify `calculatePricing()` is passing correct `nightsPerWeek` to `getNightlyRateForNights()`
2. Check if `ProposalCard.jsx` is using correct field for display (`proposal nightly price` vs `host compensation`)
3. Verify the Bubble sync doesn't override the rate

## 7. Prevention Recommendations

1. **Add 6-Night Rate to All Price-Related Functions**: When new pricing tiers are added via migration, ensure ALL functions that handle pricing are updated (Edge Functions and Frontend).

2. **Create Shared Pricing Constants**: Define the available pricing tiers (1-7 nights) in a shared location to prevent mismatches.

3. **Add Logging for Mockup Creation**: Log the calculated `nightsPerWeek` and rate used so discrepancies can be easily diagnosed.

4. **Consider Business Logic Tests**: Add tests that verify:
   - Full availability creates weekday pattern with correct rate
   - Duration is always >= 13 weeks for nightly
   - Rate matches actual nights selected

5. **Update CLAUDE.md**: Document the mockup proposal logic and expected behavior for nightly listings.

## 8. Related Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/functions/listing/handlers/createMockupProposal.ts` | ALL | Primary file to modify |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | 44-63 | `ListingData` interface - add 6-night field |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | 75-100 | `getNightlyRateForNights()` - add 6-night rate |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | 158-248 | `getDayNightConfig()` - fix night selection & duration |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | 377-395 | Listing query - add 6-night field |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | 59-67 | Reference - correct pricing implementation |
| `app/src/islands/pages/proposals/ProposalCard.jsx` | 755-759 | Display - where compensation is shown |
| `supabase/migrations/20251221_add_6_night_rate_column.sql` | - | Migration that added 6-night column |

---

**Investigation Complete**: 2026-01-07 09:31
**Root Cause**: Three separate but related bugs in `getDayNightConfig()` and `getNightlyRateForNights()` functions in `createMockupProposal.ts`
**Confidence Level**: High (95%) - Code clearly shows hardcoded values and missing rate support
