# Debug Analysis: Host Sees Wrong Nightly Rate in Proposal Details

**Created**: 2025-12-17 22:30:00
**Status**: Analysis Complete - Pending Implementation
**Severity**: High
**Affected Area**: HostProposalsPage/ProposalDetailsModal.jsx

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**:
  1. `useHostProposalsPageLogic.js` fetches proposals from Supabase `proposal` table
  2. Proposals include both guest-facing prices and host compensation fields
  3. `ProposalDetailsModal.jsx` renders proposal details including nightly rate
  4. Host-facing displays should show `host compensation` (per-night host rate), not `proposal nightly price` (guest rate)

### 1.2 Domain Context
- **Feature Purpose**: Show hosts their compensation details for proposals received on their listings
- **Related Documentation**:
  - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\plans\Done\20251217185500-display-host-compensation-on-proposal-cards.md`
  - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\.claude\plans\Done\20251216183524-fix-host-compensation-pricing.md`
- **Data Model**:
  - `proposal` table contains TWO different nightly rate fields:
    - `"proposal nightly price"` - Guest-facing nightly rate (e.g., $207)
    - `"host compensation"` - Host's per-night compensation rate (lower than guest rate due to Split Lease fees)
  - `"Total Compensation (proposal - host)"` - Total host compensation = host rate * nights * weeks

### 1.3 Relevant Conventions
- **Key Patterns**:
  - Hollow Component Pattern: `ProposalDetailsModal.jsx` (UI only) receives data from parent
  - Four-Layer Logic: Pricing calculators in `app/src/logic/calculators/pricing/`
- **Layer Boundaries**:
  - Frontend reads from Supabase `proposal` table
  - `useHostProposalsPageLogic.js` fetches and passes data to modal
- **Shared Utilities**:
  - `formatCurrency` from `formatters.js`
  - `getActiveDays`, `getStatusTagInfo` from `types.js`

### 1.4 Entry Points & Dependencies
- **User/Request Entry Point**: Host clicks on proposal card -> `handleProposalClick` -> opens `ProposalDetailsModal`
- **Critical Path**:
  1. Host lands on `/host-proposals`
  2. `useHostProposalsPageLogic.js` fetches proposals with `fetchProposalsForListing()`
  3. Host clicks proposal card
  4. Modal opens showing proposal details
  5. **BUG**: Nightly rate shows guest rate instead of host compensation rate
- **Dependencies**:
  - `types.js` for status/day helpers
  - `formatters.js` for currency formatting
  - `DayIndicator.jsx` for schedule display

## 2. Problem Statement

Host sees the guest-facing nightly rate ($207) in the "Compensation per Night" field instead of their actual compensation rate. The totals display correctly ($4602 for host vs $5384 for guest), but the per-night breakdown is wrong.

**Specific Issue**:
- Line 92 in `ProposalDetailsModal.jsx` uses `compensationPerNight` which maps to `"proposal nightly price"` (guest rate)
- Line 211 displays this value: `${formatCurrency(compensationPerNight)}/night`
- This is the GUEST nightly rate, not the HOST compensation per night

## 3. Reproduction Context
- **Environment**: Production (reported bug with real proposal)
- **Steps to reproduce**:
  1. Log in as host
  2. Navigate to `/host-proposals`
  3. Click on any proposal card
  4. View "Compensation per Night" in the modal
- **Expected behavior**:
  - Host should see their compensation per night: `totalCompensation / (nightsPerWeek * weeks)`
  - For proposal 1765983089224x54668137791583080: $4602 / 26 nights = ~$177/night (if 26 weeks * 1 night each, needs verification)
- **Actual behavior**:
  - Host sees $207/night (the guest-facing rate)
- **Error messages/logs**: None - this is a display logic bug, not a runtime error

## 4. Investigation Summary

### 4.1 Files Examined
| File | Relevance |
|------|-----------|
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | **PRIMARY** - Contains the bug |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Fetches data - includes correct fields |
| `app/src/islands/pages/HostProposalsPage/types.js` | Status/day helpers - not related to bug |
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | Shows correct total (uses `totalCompensation`) |
| `.claude/plans/Done/20251216183524-fix-host-compensation-pricing.md` | Documents the distinction between fields |

### 4.2 Execution Flow Trace

1. **Data Fetch** (`useHostProposalsPageLogic.js` lines 252-284):
   ```javascript
   const { data: proposals, error } = await supabase
     .from('proposal')
     .select(`
       "proposal nightly price",      // Guest-facing rate
       "Total Compensation (proposal - host)",  // Host total
       "host compensation",            // Host per-night rate
       ...
     `)
   ```
   - Correctly fetches both `"proposal nightly price"` AND `"host compensation"`

2. **Data Display** (`ProposalDetailsModal.jsx` lines 88-92):
   ```javascript
   // "host compensation" is the per-night HOST rate (from listing pricing tiers)
   // "Total Compensation (proposal - host)" is the total = per-night rate * nights * weeks
   const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || 0;
   const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || 0;
   const compensationPerNight = proposal.compensationPerNight || proposal['proposal nightly price'] || proposal['Compensation Per Night'] || 0;
   ```
   - **BUG HERE**: `compensationPerNight` is set to `"proposal nightly price"` which is the GUEST rate
   - The comment on line 88 even states `"host compensation" is the per-night HOST rate` but then line 92 uses the wrong field!

3. **Rendering** (`ProposalDetailsModal.jsx` lines 205-213):
   ```jsx
   <div className="detail-row">
     <span className="detail-label">Compensation per Night</span>
     <span className="detail-value">
       {counterOfferHappened && (
         <span className="original-value">${hostCompensation}</span>
       )}
       ${formatCurrency(compensationPerNight)}/night
     </span>
   </div>
   ```
   - Uses `compensationPerNight` (wrong - guest rate) for the main display
   - Only shows `hostCompensation` (correct - host rate) when there's a counteroffer, as the "original" crossed-out value

### 4.3 Git History Analysis
- Recent commits fixed related issues:
  - `5e627de5` - "fix(host-proposals): Show 'Contact Split Lease' when compensation is 0"
  - `3506ea52` - "fix(host-proposals): Fix progress bar step order and visual continuity"
  - `c9f0cd49` - "feat(host-proposals): Display total host compensation on all proposal cards"
- The total compensation was fixed to show correctly, but the per-night rate was never addressed

## 5. Hypotheses

### Hypothesis 1: Wrong Field Used for Per-Night Display (Likelihood: 95%)

**Theory**: The `compensationPerNight` variable is incorrectly mapped to `"proposal nightly price"` (guest rate) instead of using `"host compensation"` (host rate) or calculating it from the total.

**Supporting Evidence**:
1. Line 92 explicitly maps to `proposal['proposal nightly price']`
2. The comment on line 88-89 correctly documents that `"host compensation"` is the per-night HOST rate
3. The `hostCompensation` variable is already correctly extracted on line 90 but NOT used for the per-night display
4. Total shows correctly ($4602) while per-night is wrong ($207)

**Contradicting Evidence**: None - this is clearly the bug.

**Verification Steps**:
1. Check proposal data in Supabase for proposal ID 1765983089224x54668137791583080
2. Verify `"host compensation"` contains the correct per-night host rate
3. Verify `"proposal nightly price"` contains the guest rate ($207)

**Potential Fix**:
Replace line 92:
```javascript
// OLD (BUG):
const compensationPerNight = proposal.compensationPerNight || proposal['proposal nightly price'] || proposal['Compensation Per Night'] || 0;

// NEW (FIX):
// Host's per-night compensation - use "host compensation" field directly
// "proposal nightly price" is the GUEST-facing rate, not host compensation
const compensationPerNight = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || hostCompensation || 0;
```

**Convention Check**: This aligns with documented patterns. The `.claude/plans/Done/20251216183524-fix-host-compensation-pricing.md` plan clearly states:
- `"host compensation"` = per-night host rate (e.g., $142)
- `"proposal nightly price"` = guest-facing nightly price (higher, includes fees)

### Hypothesis 2: Data Not Fetched Correctly (Likelihood: 5%)

**Theory**: The `"host compensation"` field might not be fetched or might be null in the data.

**Supporting Evidence**: None - `useHostProposalsPageLogic.js` line 270 clearly includes `"host compensation"` in the SELECT query.

**Contradicting Evidence**:
1. The field IS in the select query
2. The `hostCompensation` variable IS being extracted on line 90
3. The total compensation displays correctly, suggesting data is complete

**Verification Steps**:
1. Add console.log to check if `proposal['host compensation']` has a value
2. Check Supabase data directly for the proposal

**Potential Fix**: N/A - this is not the issue.

**Convention Check**: Data fetching follows standard Supabase query patterns.

### Hypothesis 3: Variable Name Confusion Leading to Copy-Paste Error (Likelihood: 75% as root cause explanation)

**Theory**: The developer confused `compensationPerNight` with `hostCompensation` during implementation, or copy-pasted the wrong field mapping.

**Supporting Evidence**:
1. The comments correctly explain the fields
2. `hostCompensation` is extracted correctly
3. But then a NEW variable `compensationPerNight` is created with the WRONG source

**Contradicting Evidence**: N/A - this explains WHY the bug exists.

**Verification Steps**: Code review confirms this pattern.

**Potential Fix**: Same as Hypothesis 1 - fix the field mapping.

**Convention Check**: This is a simple implementation error, not a convention violation.

## 6. Recommended Action Plan

### Priority 1 (Try First) - Fix Field Mapping

**File**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\ProposalDetailsModal.jsx`

**Change at line 92**:
```javascript
// CURRENT (BUG):
const compensationPerNight = proposal.compensationPerNight || proposal['proposal nightly price'] || proposal['Compensation Per Night'] || 0;

// FIXED:
// Host's per-night compensation rate - use "host compensation" field
// NOTE: "proposal nightly price" is the GUEST-facing rate, not host compensation
const compensationPerNight = hostCompensation; // Already extracted on line 90
```

**Alternative implementation** (if we want to keep the variable extraction separate):
```javascript
// Line 90-93 should be:
const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || proposal['Host Compensation'] || 0;
const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || 0;
// Use host compensation for the per-night display, as this is the HOST-facing page
const compensationPerNight = hostCompensation;
```

### Priority 2 (If Priority 1 Fails) - Calculate from Total

If `"host compensation"` field is somehow null/zero but total is correct:

```javascript
// Calculate per-night from total if host compensation field is missing
const nightsPerWeek = proposal['nights per week (num)'] || proposal.nightsPerWeek || 4;
const weeks = reservationSpanWeeks;
const calculatedPerNight = (totalCompensation > 0 && weeks > 0 && nightsPerWeek > 0)
  ? Math.round(totalCompensation / (nightsPerWeek * weeks))
  : 0;
const compensationPerNight = hostCompensation || calculatedPerNight;
```

### Priority 3 (Deeper Investigation)

If both approaches fail:
1. Query Supabase directly for proposal 1765983089224x54668137791583080
2. Verify all pricing fields are populated correctly
3. Check if there's a data migration issue

## 7. Prevention Recommendations

1. **Naming Convention**: Consider renaming variables to be more explicit:
   - `guestNightlyRate` for `"proposal nightly price"`
   - `hostNightlyRate` for `"host compensation"`
   - This prevents confusion about which rate is being used

2. **Code Review Focus**: When displaying pricing on host-facing pages, always verify:
   - Is this the guest rate or host rate?
   - Are we using the correct field for the audience?

3. **Test Cases**: Add tests that verify:
   - Host pages show host compensation rates
   - Guest pages show guest-facing rates
   - The math works out: `hostNightlyRate * nights * weeks = totalCompensation`

4. **Documentation**: The comments in the code (lines 88-89) are correct but the implementation is wrong. Consider adding a more explicit warning comment or extracting this logic into a named function.

## 8. Related Files Reference

### Files to Modify
| File | Line(s) | Change |
|------|---------|--------|
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | 92 | Change `compensationPerNight` to use `hostCompensation` instead of `"proposal nightly price"` |

### Files for Context (Read-Only)
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Data fetching - verify fields are selected |
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | Reference for how total compensation is correctly displayed |
| `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` | Understand host rate calculation from listing |
| `supabase/functions/proposal/lib/calculations.ts` | Understand how host compensation is calculated on creation |

### Database Reference
| Table | Column | Purpose |
|-------|--------|---------|
| `proposal` | `"host compensation"` | Per-night host rate |
| `proposal` | `"proposal nightly price"` | Per-night guest rate |
| `proposal` | `"Total Compensation (proposal - host)"` | Total host compensation |

## 9. Test Verification

After fix, verify with proposal 1765983089224x54668137791583080:
1. Total should still show $4602
2. Per-night should show calculated host rate (not $207)
3. If total is $4602 and there are 26 nights, per-night should be ~$177
4. Cross-check: Per-night * total nights should approximately equal total (within rounding)
