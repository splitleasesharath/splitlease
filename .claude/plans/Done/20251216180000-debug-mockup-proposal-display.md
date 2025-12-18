# Debug Analysis: Mockup Proposal Display - Missing Guest Name and Calculations

**Created**: 2025-12-16 18:00:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: Host Proposals Page | ProposalCard Component | Data Field Mapping

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**:
  1. `useHostProposalsPageLogic.js` fetches proposals from Supabase
  2. Guest user data is enriched via a second query
  3. `ProposalCard.jsx` displays the proposal with guest info and calculations

### 1.2 Domain Context
- **Feature Purpose**: Display mockup proposal for first-time hosts to understand proposal review process
- **Related Documentation**:
  - `.claude/plans/Done/20251213175500-mockup-proposal-edge-function.md`
  - `.claude/Documentation/Backend(EDGE - Functions)/PROPOSAL.md`
- **Data Model**:
  - `proposal` table - stores proposal with pricing and schedule fields
  - `user` table - stores guest info including name fields
  - `listing` table - the property listing associated with proposal

### 1.3 Relevant Conventions
- **Key Patterns**:
  - Hollow Component Pattern - ProposalCard is presentational only
  - Database column names use various formats ("Name - First", "Move in range start")
  - Components handle multiple field name formats via fallback chains
- **Layer Boundaries**:
  - `useHostProposalsPageLogic.js` - data fetching and enrichment
  - `ProposalCard.jsx` - presentation only, expects pre-processed data

### 1.4 Entry Points & Dependencies
- **User Entry Point**: Host navigates to `/host-proposals`
- **Critical Path**:
  1. Auth check -> 2. loadHostData() -> 3. fetchProposalsForListing() -> 4. ProposalCard render
- **Dependencies**: Supabase client, user table, proposal table

## 2. Problem Statement

The mockup proposal (ID: `1765901049901x59991363028420456`) displays on the host proposals page with:
1. **Empty guest name** - Shows "'s Proposal" instead of "Leo(Mockup)'s Proposal"
2. **Empty calculation fields** - Duration shows "0 weeks", move-in date is empty, check-in/out days show defaults

The data EXISTS correctly in the database:
- Proposal has all pricing fields populated (nightly price: 142, 4 week rent: 2840, etc.)
- Guest user has name: "Name - First" = "Leo(Mockup)", "Name - Full" = "Leo Di Caprio"

The issue is **field name mapping mismatches** between database columns and component expectations.

## 3. Reproduction Context

- **Environment**: Production
- **Mockup Proposal ID**: `1765901049901x59991363028420456`
- **Listing ID**: `1765901048170x64855832289573808`
- **Mock Guest ID**: `1697550315775x613621430341750000`

### Database Values (Verified via SQL)
```sql
-- Proposal fields (actual values)
"Move in range start": "2026-01-05T16:04:09.880Z"
"Reservation Span (Weeks)": 4
"proposal nightly price": "142"
"4 week rent": "2840"
"Total Compensation (proposal - host)": "2840"

-- Guest user fields (actual values)
"Name - First": "Leo(Mockup)"
"Name - Full": "Leo Di Caprio"
"Profile Photo": "https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/..."
```

### Expected Behavior
- Guest name: "Leo(Mockup)'s Proposal"
- Duration: "4 weeks"
- Move-in: "1/5/26"
- Check-in/out days should show correct days (Monday through Saturday based on proposal)

### Actual Behavior
- Guest name: "'s Proposal" (empty)
- Duration: "0 weeks"
- Move-in: empty
- Days indicator may show defaults

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | **CRITICAL** - Data fetching logic |
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | **CRITICAL** - Field name expectations |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | Same field name issues |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Reference for field names used in DB |

### 4.2 Execution Flow Trace

```
1. Host navigates to /host-proposals
   ├── useHostProposalsPageLogic() hook initializes
   └── useEffect triggers checkAuth()

2. checkAuth() validates host and calls loadHostData(userId)
   └── Fetches user.userId

3. loadHostData(userId)
   ├── fetchHostListings(userId) - via RPC get_host_listings
   └── fetchProposalsForListing(listingId)
       ├── Queries proposal table with SELECT
       │   - Selects: "Move in range start", "Reservation Span (Weeks)", etc.
       │   - Note: Uses correct casing for most fields
       ├── Queries user table for guests
       │   - Selects: "Name - Full", "Name - First", "Name - Last", "Profile Photo"
       └── Attaches guest object to proposal.guest

4. ProposalCard.jsx renders with proposal data
   ├── Line 52-53: Guest extraction
   │   const guest = proposal.guest || proposal.Guest || ...
   │   const guestName = guest.firstName || guest['First Name'] || guest.first_name || ''
   │   ❌ PROBLEM: Database has "Name - First", not "First Name"
   │
   ├── Line 62-63: Schedule extraction
   │   const moveInRangeStart = proposal.moveInRangeStart || proposal['Move In Range Start'] || ...
   │   ❌ PROBLEM: Database has "Move in range start" (lowercase 'i' and 's')
   │
   └── Line 63: Duration extraction
       const reservationSpanWeeks = proposal['Reservation Span (weeks)'] || ...
       ❌ PROBLEM: Database has "Reservation Span (Weeks)" (capital W)
```

### 4.3 Git History Analysis

- Recent mockup proposal implementation in commit chain around 2025-12-13
- ProposalCard was created earlier with different field name expectations
- No synchronization between mockup creation fields and display component expectations

## 5. Hypotheses

### Hypothesis 1: Guest Name Field Mapping Mismatch (Likelihood: 99%)

**Theory**: The ProposalCard looks for `guest['First Name']` but the database stores `"Name - First"`.

**Supporting Evidence**:
1. Database query at line 295 fetches `"Name - First"`, `"Name - Last"`, `"Name - Full"`
2. ProposalCard line 53: `const guestName = guest.firstName || guest['First Name'] || guest.first_name || ''`
3. None of these match the actual database column name `"Name - First"`

**Contradicting Evidence**: None

**Verification Steps**:
1. Add `console.log(guest)` in ProposalCard to see actual guest object structure
2. Verify the fallback chain doesn't include `"Name - First"`

**Potential Fix**: Add `guest['Name - First']` to the fallback chain in ProposalCard

**Convention Check**: The codebase has inconsistent field naming - some use "Name - X" format, others use "First Name" format. Both should be supported.

### Hypothesis 2: Proposal Field Name Case Sensitivity (Likelihood: 95%)

**Theory**: ProposalCard expects different casing than what's in the database.

**Supporting Evidence**:
1. ProposalCard line 62: `proposal['Move In Range Start']` - capital I, capital R, capital S
2. Database stores: `"Move in range start"` - lowercase i, r, s
3. ProposalCard line 63: `proposal['Reservation Span (weeks)']` - lowercase w
4. Database stores: `"Reservation Span (Weeks)"` - capital W

**Contradicting Evidence**: None

**Verification Steps**:
1. Check exact column names in database schema
2. Add console.log to see actual proposal object keys

**Potential Fix**: Add additional fallback options with correct casing

### Hypothesis 3: Guest Avatar/Photo Field Mismatch (Likelihood: 90%)

**Theory**: Profile photo may also not display due to field name mismatch.

**Supporting Evidence**:
1. ProposalCard line 74: `guest.avatar || guest.Avatar || guest['Profile Picture']`
2. Database stores: `"Profile Photo"`

**Contradicting Evidence**: None

**Potential Fix**: Add `guest['Profile Photo']` to the fallback chain

### Hypothesis 4: Check-in/Check-out Day Field Issues (Likelihood: 85%)

**Theory**: Check-in and check-out days may be stored as Bubble day indices (1-7) rather than day names.

**Supporting Evidence**:
1. Mockup proposal stores `"check in day": 2, "check out day": 7` (Bubble format)
2. ProposalCard line 60-61 expects day names like "Monday", "Friday"
3. getActiveDays() expects string day names

**Contradicting Evidence**: The proposal data shows Status = "Host Review" (a string), suggesting some fields ARE strings

**Potential Fix**: Convert numeric day indices to day names, or update component to handle both formats

## 6. Recommended Action Plan

### Priority 1: Fix Guest Name Field Mapping (Try First)

**File**: `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`

**Line 53 - Current**:
```javascript
const guestName = guest.firstName || guest['First Name'] || guest.first_name || '';
```

**Change to**:
```javascript
const guestName = guest.firstName || guest['Name - First'] || guest['First Name'] || guest.first_name || '';
```

**Same fix needed in ProposalDetailsModal.jsx line 54**

---

### Priority 2: Fix Proposal Field Casing

**File**: `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`

**Line 62 - Current**:
```javascript
const moveInRangeStart = proposal.moveInRangeStart || proposal['Move In Range Start'] || proposal.move_in_range_start;
```

**Change to**:
```javascript
const moveInRangeStart = proposal.moveInRangeStart || proposal['Move in range start'] || proposal['Move In Range Start'] || proposal.move_in_range_start;
```

**Line 63 - Current**:
```javascript
const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (weeks)'] || proposal.reservation_span_weeks || 0;
```

**Change to**:
```javascript
const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (Weeks)'] || proposal['Reservation Span (weeks)'] || proposal.reservation_span_weeks || 0;
```

---

### Priority 3: Fix Guest Avatar Field Mapping

**File**: `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`

**Line 74 - Current**:
```javascript
const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Picture'];
```

**Change to**:
```javascript
const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Photo'] || guest['Profile Picture'];
```

---

### Priority 4: Fix ProposalDetailsModal Field Mappings

Apply the same fixes to `ProposalDetailsModal.jsx`:

**Guest name (line 54-55)**:
```javascript
const guestName = guest.firstName || guest['Name - First'] || guest['First Name'] || guest.first_name || 'Guest';
const guestLastName = guest.lastName || guest['Name - Last'] || guest['Last Name'] || guest.last_name || '';
```

**Move-in dates (lines 71-72)**:
```javascript
const moveInRangeStart = proposal.moveInRangeStart || proposal['Move in range start'] || proposal['Move In Range Start'];
const moveInRangeEnd = proposal.moveInRangeEnd || proposal['Move in range end'] || proposal['Move In Range End'];
```

**Duration (line 73)**:
```javascript
const reservationSpanWeeks = proposal.reservationSpanWeeks || proposal['Reservation Span (Weeks)'] || proposal['Reservation Span (weeks)'] || 0;
```

**Avatar (line 57)**:
```javascript
const guestAvatar = guest.avatar || guest.Avatar || guest['Profile Photo'] || guest['Profile Picture'];
```

---

### Priority 5: Add Check-in/Check-out Day Conversion (If Needed)

**File**: `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`

If check-in/check-out days are stored as Bubble indices (1-7), add conversion:

```javascript
// Add helper at top of component
const bubbleDayToName = (bubbleDay) => {
  const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return typeof bubbleDay === 'number' ? dayNames[bubbleDay] || 'Monday' : bubbleDay;
};

// Update lines 60-61
const checkInDayRaw = proposal.checkInDay || proposal['check in day'] || proposal['Check In Day'] || 'Monday';
const checkOutDayRaw = proposal.checkOutDay || proposal['check out day'] || proposal['Check Out Day'] || 'Friday';
const checkInDay = bubbleDayToName(checkInDayRaw);
const checkOutDay = bubbleDayToName(checkOutDayRaw);
```

## 7. Prevention Recommendations

1. **Create a Data Normalization Layer**: Instead of having each component handle multiple field name formats, create a processor function that normalizes proposal and guest data to a consistent format.

   ```javascript
   // logic/processors/proposal/normalizeProposalData.js
   export function normalizeProposalData(rawProposal, rawGuest) {
     return {
       // Normalize to consistent camelCase
       guestName: rawGuest?.['Name - First'] || rawGuest?.['First Name'] || '',
       guestLastName: rawGuest?.['Name - Last'] || rawGuest?.['Last Name'] || '',
       moveInRangeStart: rawProposal?.['Move in range start'] || rawProposal?.['Move In Range Start'],
       reservationSpanWeeks: rawProposal?.['Reservation Span (Weeks)'] || rawProposal?.['Reservation Span (weeks)'] || 0,
       // ... etc
     };
   }
   ```

2. **Add TypeScript Types**: Define interfaces for proposal and guest data that document the expected field names.

3. **Standardize Database Column Names**: Consider a migration to standardize column names (e.g., all lowercase with underscores or all Title Case).

4. **Add Integration Tests**: Test the proposal display flow with actual database data to catch field name mismatches.

## 8. Related Files Reference

### Files Requiring Modification

| File | Line Numbers | Change Required |
|------|--------------|-----------------|
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | 53, 60-63, 74 | Add field name fallbacks |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 54-55, 57, 71-73 | Add field name fallbacks |

### Files for Reference (No Changes Needed)

| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Shows field names used in queries |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Shows field names used when creating mockup |
| `app/src/islands/pages/HostProposalsPage/types.js` | Status and day type definitions |
| `app/src/islands/pages/HostProposalsPage/formatters.js` | Formatting utilities |

---

**Plan Version**: 1.0
**Created**: 2025-12-16 18:00:00
**Author**: Claude Debug Analyst
**Status**: Ready for Execution

---

## Quick Implementation Summary

The root cause is **field name mismatches** between what the database stores and what the display components expect. The fixes are all additive - adding more fallback options to handle the actual database column names:

1. Guest name: Add `guest['Name - First']` to fallback chain
2. Move-in date: Add `proposal['Move in range start']` to fallback chain
3. Duration weeks: Add `proposal['Reservation Span (Weeks)']` to fallback chain
4. Avatar: Add `guest['Profile Photo']` to fallback chain

No database changes needed. No Edge Function changes needed.
