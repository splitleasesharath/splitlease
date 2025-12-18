# Fix: Host Compensation Pricing in Proposals

**Created**: 2025-12-16 18:35:24
**Status**: Implemented
**Commits**:
- `5ac8fa82` - fix(host-proposals): Properly calculate and display host compensation pricing

---

## Problem

When creating proposals (both regular and mockup), the host compensation values were showing as 0 on the host proposals page. The mockup proposal for listing `1765901048170x64855832289573808` was displaying:
- Guest name: Empty (fixed in previous commit)
- All pricing/compensation values: 0

## Root Cause Analysis

After analyzing the Bubble workflow document (`CORE-create_proposal-NEW`), I discovered:

### How Bubble Workflow Works

1. **`host compensation`** is a **PARAMETER** passed to the workflow, representing the **per-night host rate** from the listing's pricing tiers (e.g., "💰Nightly Host Rate for 4 nights")

2. **`Total Compensation (proposal - host)`** is **CALCULATED** as:
   - **Nightly**: `host_compensation * nights_selected_count * actual_weeks`
   - **Weekly**: `weekly_rate * weeks`
   - **Monthly**: `monthly_rate * months`

### What Was Wrong

| Field | Previous Behavior | Correct Behavior |
|-------|-------------------|------------------|
| `host compensation` | Set to total (4-week rent) | Per-night host rate from listing pricing tiers |
| `Total Compensation` | Used guest-facing `proposalPrice` | Use host's nightly rate * nights * weeks |

The Edge Function was using `input.proposalPrice` (guest-facing price) instead of the host's nightly rate from the listing's pricing tiers.

---

## Solution

### 1. Edge Functions (Already Committed Previously)

**`supabase/functions/proposal/lib/calculations.ts`**:
- Updated `calculateCompensation()` to accept `hostNightlyRate` parameter
- Returns `host_compensation_per_night` in the result object
- Uses host rate (not guest price) for all calculations

**`supabase/functions/proposal/lib/types.ts`**:
- Added `host_compensation_per_night` to `CompensationResult` interface

**`supabase/functions/proposal/actions/create.ts`**:
- Uses `getNightlyRateForNights(listingData, nightsPerWeek)` to get host rate
- Sets `"host compensation": compensation.host_compensation_per_night`

### 2. Mockup Proposal (This Commit)

**`supabase/functions/listing/handlers/createMockupProposal.ts`**:
- Updated `calculatePricing()` to return both:
  - `hostCompensationPerNight` - per-night rate
  - `totalHostCompensation` - total compensation
- Fixed proposal data to use correct fields

### 3. Frontend Display (This Commit)

**`app/src/islands/pages/HostProposalsPage/ProposalCard.jsx`**:
- Added field name fallbacks for lowercase database columns
- `proposal['host compensation']` and `proposal['Total Compensation (proposal - host)']`

**`app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx`**:
- Same fallback additions for pricing fields

**`app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js`**:
- Added missing pricing fields to the Supabase query:
  - `"host compensation"`
  - `"4 week compensation"`
  - `"cleaning fee"`
  - `"damage deposit"`

---

## Verification

After this fix:
- `"host compensation"` = per-night host rate (e.g., $142)
- `"Total Compensation (proposal - host)"` = $142 * 4 nights * 4 weeks = $2,272

---

## Related Files

| File | Change |
|------|--------|
| `supabase/functions/proposal/lib/calculations.ts` | Updated calculation logic |
| `supabase/functions/proposal/lib/types.ts` | Added `host_compensation_per_night` type |
| `supabase/functions/proposal/actions/create.ts` | Use host nightly rate |
| `supabase/functions/listing/handlers/createMockupProposal.ts` | Fixed mockup pricing |
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | Field name fallbacks |
| `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` | Field name fallbacks |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Query additional fields |

---

## Reminder

**Edge Functions need manual deployment** to take effect:
```bash
supabase functions deploy proposal
supabase functions deploy listing
```
