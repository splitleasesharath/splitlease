# Quick Match Scoring Heuristics - Data Model Analysis

**Date:** 2026-01-20
**Type:** Technical Analysis
**Related Plan:** `.claude/plans/New/20260120143000-quick-match-migration-plan.md`
**Status:** Complete

---

## Executive Summary

This document provides a comprehensive analysis of the Quick Match scoring heuristics and their adaptation to Split Lease's actual data model. The Quick Match tool uses a 7-criteria scoring system (0-100 points) to match guest proposals against alternative listings when the original listing is unavailable.

**Key Findings:**
- 5 of 7 heuristics can be implemented with existing data
- 2 heuristics require new database fields or workarounds
- Split Lease's schedule/availability system differs from the original Quick Match assumptions
- All heuristics can leverage existing business logic in `app/src/logic/`

---

## Original Heuristics (Source: quick-match repo)

The original Quick Match tool used these 7 scoring criteria:

| Criterion | Points | Original Logic |
|-----------|--------|----------------|
| `interesting_borough` | 25 | Borough match or adjacent borough |
| `close_in_price` | 20 | Price within 15% of original |
| `overlapping_nights` | 20 | Availability overlaps with proposal dates |
| `seven_nights_possible` | 15 | Listing supports weekly stays |
| `duration_match` | 10 | Listing's min nights matches proposal |
| `price_drop` | 5 | Listing recently reduced price |
| `responsive_landlord` | 5 | Host has high response rate |

**Total:** 100 points

---

## Split Lease Data Model

### Proposal Data Structure

From `app/src/logic/processors/proposals/processProposalData.js`:

```javascript
{
  // Schedule - Original proposal terms
  daysSelected: [], // 0-indexed days: [1,2,3,4,5] = Mon-Fri
  nightsSelected: [], // Night indices matching daysSelected
  reservationWeeks: 0, // Total reservation span in weeks
  nightsPerWeek: 0, // Nights per week (2-7)
  checkInDay: null, // Check-in day index (0-6)
  checkOutDay: null, // Check-out day index (0-6)
  moveInStart: null, // Move-in range start date
  moveInEnd: null, // Move-in range end date

  // Pricing - Original proposal terms
  totalPrice: 0,
  nightlyPrice: 0,
  cleaningFee: 0,
  damageDeposit: 0,

  // Nested data
  listing: {
    borough: null, // Borough name or ID
    boroughName: null, // Resolved borough name
    address: null,
    hoodName: null
  },
  host: {
    firstName: null,
    fullName: null
  }
}
```

### Listing Data Structure

From `app/src/lib/listingDataFetcher.js` and observed patterns:

```javascript
{
  _id: string,
  Name: string,
  Description: string,

  // Location
  "Location - Borough": string, // Borough ID or name
  "Location - Hood": string, // Neighborhood ID
  boroughName: string, // Resolved from lookup
  hoodName: string, // Resolved from lookup
  "Location - Address": object/string, // JSONB with {address, coordinates}

  // Pricing (per night count)
  "💰Nightly Host Rate for 2 nights": number,
  "💰Nightly Host Rate for 3 nights": number,
  "💰Nightly Host Rate for 4 nights": number,
  "💰Nightly Host Rate for 5 nights": number,
  "💰Nightly Host Rate for 6 nights": number,
  "💰Nightly Host Rate for 7 nights": number,
  "💰Cleaning Cost / Maintenance Fee": number,
  "💰Damage Deposit": number,

  // Availability & Scheduling
  "Schedule days available": [], // 0-indexed days [0,1,2,3,4,5,6]
  "Blocked Dates": [], // Array of blocked date strings
  "Minimum Nights": number,
  // Note: "Maximum Nights" field may not exist

  // Features
  "Features - Qty Bedrooms": number,
  "Features - Qty Bathrooms": number,
  "Features - Amenities In-Unit": [],
  "Features - Photos": [],

  // Host reference
  "Host User": string // Host user ID
}
```

### Host/User Data Structure

From `app/src/logic/processors/proposals/processProposalData.js`:

```javascript
{
  _id: string,
  "Name - First": string,
  "Name - Last": string,
  "Name - Full": string,
  "Profile Photo": string,
  "About Me / Bio": string,

  // Verification
  "Verify - Linked In ID": boolean,
  "Verify - Phone": boolean,
  "user verified?": boolean,

  // Response metrics (MAY NOT EXIST)
  // response_rate: number (NEEDS VERIFICATION)
  // average_response_time: number (NEEDS VERIFICATION)
}
```

---

## Heuristic-by-Heuristic Analysis

### 1. Borough Match (25 points) - **READY**

**Intent:** Prioritize listings in the same borough or nearby boroughs as the original proposal.

**Original Logic:**
```javascript
interesting_borough: isInterestingBorough(listing.borough, proposal.listing.borough)
```

**Split Lease Implementation:**

```javascript
// app/src/logic/rules/matching/isBoroughMatch.js

/**
 * Check if candidate listing borough matches or is near proposal borough.
 * @param {object} params
 * @param {string} params.candidateBorough - Candidate listing borough
 * @param {string} params.proposalBorough - Original proposal borough
 * @returns {boolean} True if match or nearby
 */
export function isBoroughMatch({ candidateBorough, proposalBorough }) {
  if (!candidateBorough || !proposalBorough) return false;

  // Normalize to lowercase for comparison
  const candidate = candidateBorough.toLowerCase();
  const proposal = proposalBorough.toLowerCase();

  // Exact match
  if (candidate === proposal) return true;

  // Adjacent boroughs (NYC geography)
  const adjacencies = {
    'manhattan': ['brooklyn', 'queens', 'bronx'],
    'brooklyn': ['manhattan', 'queens'],
    'queens': ['manhattan', 'brooklyn', 'bronx'],
    'bronx': ['manhattan', 'queens'],
    'staten island': [] // Staten Island is isolated
  };

  return adjacencies[proposal]?.includes(candidate) || false;
}
```

**Data Sources:**
- `listing['Location - Borough']` or `listing.boroughName`
- `proposal.listing.borough` or `proposal.listing.boroughName`

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculateBoroughScore.js

export function calculateBoroughScore({ candidateListing, proposal }) {
  const candidateBorough = candidateListing.boroughName || candidateListing['Location - Borough'];
  const proposalBorough = proposal.listing?.boroughName || proposal.listing?.borough;

  const isMatch = isBoroughMatch({
    candidateBorough,
    proposalBorough
  });

  return isMatch ? 25 : 0;
}
```

---

### 2. Price Proximity (20 points) - **READY**

**Intent:** Prioritize listings with similar pricing to the original proposal (within 15%).

**Original Logic:**
```javascript
close_in_price: Math.abs(listing.price - proposal.listing.price) <= proposal.listing.price * 0.15
```

**Split Lease Implementation:**

```javascript
// app/src/logic/calculators/matching/calculatePriceProximity.js

/**
 * Calculate price proximity between candidate and proposal.
 * @param {object} params
 * @param {object} params.candidateListing - Candidate listing
 * @param {object} params.proposal - Proposal object
 * @returns {number} Price difference as decimal (0.0 to 1.0+)
 */
export function calculatePriceProximity({ candidateListing, proposal }) {
  const nightsPerWeek = proposal.nightsPerWeek || proposal.daysSelected?.length || 4;

  // Get nightly rate for same frequency
  const candidateRate = getNightlyRateByFrequency({
    listing: candidateListing,
    nightsSelected: nightsPerWeek
  });

  const proposalRate = proposal.nightlyPrice;

  if (!proposalRate || proposalRate === 0) {
    throw new Error('calculatePriceProximity: Proposal nightly price is required');
  }

  const priceDiff = Math.abs(candidateRate - proposalRate);
  const proximityRatio = priceDiff / proposalRate;

  return proximityRatio;
}
```

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculatePriceScore.js

export function calculatePriceScore({ candidateListing, proposal }) {
  const proximity = calculatePriceProximity({ candidateListing, proposal });

  // Within 15% = full 20 points
  if (proximity <= 0.15) return 20;

  // 15-30% = partial score (linearly decreasing)
  if (proximity <= 0.30) {
    const excess = proximity - 0.15;
    return Math.max(0, 20 - (excess / 0.15) * 20);
  }

  // Beyond 30% = 0 points
  return 0;
}
```

**Data Sources:**
- `candidateListing['💰Nightly Host Rate for X nights']`
- `proposal.nightlyPrice`
- `proposal.nightsPerWeek`

**Dependencies:**
- Existing `getNightlyRateByFrequency` from `app/src/logic/calculators/pricing/`

---

### 3. Schedule Overlap (20 points) - **NEEDS ADAPTATION**

**Intent:** Candidate listing has availability that overlaps with proposal's desired schedule.

**Original Logic:**
```javascript
overlapping_nights: hasOverlappingAvailability(listing, proposal)
```

**Split Lease Challenge:**
Split Lease uses:
1. **Weekly recurring schedule** (`Schedule days available` - which days of week)
2. **Blocked dates** (specific dates that are unavailable)
3. **Move-in date range** (proposal's desired move-in window)

Not a simple date range overlap check.

**Split Lease Implementation:**

```javascript
// app/src/logic/rules/matching/hasScheduleCompatibility.js

/**
 * Check if candidate listing schedule is compatible with proposal.
 * @param {object} params
 * @param {object} params.candidateListing - Candidate listing
 * @param {object} params.proposal - Proposal object
 * @returns {object} { compatible: boolean, overlapDays: number }
 */
export function hasScheduleCompatibility({ candidateListing, proposal }) {
  const listingDays = candidateListing['Schedule days available'] || [];
  const proposalDays = proposal.daysSelected || [];

  // Convert to Set for fast lookup
  const listingDaySet = new Set(listingDays);

  // Count overlapping days
  const overlapDays = proposalDays.filter(day => listingDaySet.has(day)).length;

  // Compatible if at least some overlap exists
  const compatible = overlapDays > 0;

  return { compatible, overlapDays };
}
```

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculateScheduleScore.js

export function calculateScheduleScore({ candidateListing, proposal }) {
  const { compatible, overlapDays } = hasScheduleCompatibility({
    candidateListing,
    proposal
  });

  if (!compatible) return 0;

  const proposalDaysCount = proposal.daysSelected?.length || 0;

  if (proposalDaysCount === 0) return 0;

  // Perfect overlap = 20 points
  const overlapRatio = overlapDays / proposalDaysCount;
  return Math.round(overlapRatio * 20);
}
```

**Data Sources:**
- `candidateListing['Schedule days available']`
- `proposal.daysSelected`

**Note:** This does NOT check blocked dates or move-in date compatibility. For full validation, would need to check:
```javascript
import { isDateBlocked } from 'app/src/logic/rules/scheduling/isDateBlocked.js';

// Check if move-in range has blocked dates
const moveInDate = new Date(proposal.moveInStart);
const hasBlockedDates = isDateBlocked({
  date: moveInDate,
  blockedDates: candidateListing['Blocked Dates'] || []
});
```

---

### 4. Weekly Stay Support (15 points) - **NEEDS WORKAROUND**

**Intent:** Listing supports 7-night stays (common guest preference).

**Original Logic:**
```javascript
seven_nights_possible: listing.default_min_nights <= 7 && listing.max_nights >= 7
```

**Split Lease Challenge:**
- No `max_nights` field in listing table
- Have `Minimum Nights` field
- Have `Schedule days available` which could have 7 days

**Split Lease Implementation:**

```javascript
// app/src/logic/rules/matching/supportsWeeklyStays.js

/**
 * Check if listing supports weekly (7-night) stays.
 * @param {object} params
 * @param {object} params.listing - Listing object
 * @returns {boolean} True if weekly stays are possible
 */
export function supportsWeeklyStays({ listing }) {
  const minNights = listing['Minimum Nights'] || 0;
  const availableDays = listing['Schedule days available'] || [];

  // Listing must:
  // 1. Have minimum nights <= 7 (or unset)
  // 2. Have 7 days available in schedule (full week)

  const minNightsOk = minNights === 0 || minNights <= 7;
  const hasFullWeek = availableDays.length === 7;

  return minNightsOk && hasFullWeek;
}
```

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculateWeeklyStayScore.js

export function calculateWeeklyStayScore({ candidateListing }) {
  const supports = supportsWeeklyStays({ listing: candidateListing });
  return supports ? 15 : 0;
}
```

**Data Sources:**
- `candidateListing['Minimum Nights']`
- `candidateListing['Schedule days available']`

**Limitation:** Without `max_nights` field, we can't definitively know if a listing caps at < 7 nights. This heuristic assumes if all 7 days are available and min ≤ 7, then weekly stays are possible.

---

### 5. Duration Match (10 points) - **READY**

**Intent:** Listing's minimum night requirement closely matches proposal's night count.

**Original Logic:**
```javascript
duration_match: Math.abs(listing.default_min_nights - proposal.nights_selected) <= 1
```

**Split Lease Implementation:**

```javascript
// app/src/logic/rules/matching/isDurationMatch.js

/**
 * Check if listing's minimum nights matches proposal duration.
 * @param {object} params
 * @param {object} params.listing - Listing object
 * @param {object} params.proposal - Proposal object
 * @param {number} [params.tolerance=1] - Allowed difference in nights
 * @returns {boolean} True if within tolerance
 */
export function isDurationMatch({ listing, proposal, tolerance = 1 }) {
  const listingMinNights = listing['Minimum Nights'] || 0;
  const proposalNights = proposal.nightsPerWeek || proposal.daysSelected?.length || 0;

  const difference = Math.abs(listingMinNights - proposalNights);

  return difference <= tolerance;
}
```

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculateDurationScore.js

export function calculateDurationScore({ candidateListing, proposal }) {
  const isMatch = isDurationMatch({
    listing: candidateListing,
    proposal
  });

  return isMatch ? 10 : 0;
}
```

**Data Sources:**
- `candidateListing['Minimum Nights']`
- `proposal.nightsPerWeek` or `proposal.daysSelected.length`

---

### 6. Price Drop (5 points) - **BLOCKED (Missing Field)**

**Intent:** Listing recently reduced its price (signals motivated host).

**Original Logic:**
```javascript
price_drop: listing.price_per_stay < listing.previous_price_per_stay
```

**Split Lease Challenge:**
- **No `previous_price` or `previous_price_per_stay` field exists**
- Would need to either:
  1. Add tracking of price history to listing table
  2. Create separate `listing_price_history` table
  3. Skip this heuristic entirely

**Recommended Approach:** **Skip this heuristic for MVP**

If price history tracking is added later, the implementation would be:

```javascript
// app/src/logic/rules/matching/hasPriceDrop.js (FUTURE)

export function hasPriceDrop({ listing }) {
  const currentPrice = listing['💰Nightly Host Rate for 4 nights']; // Example field
  const previousPrice = listing.previous_price_per_stay; // DOES NOT EXIST

  if (!previousPrice || !currentPrice) return false;

  return currentPrice < previousPrice;
}
```

**Workaround for MVP:** Allocate these 5 points elsewhere or leave as 0 for all listings.

---

### 7. Responsive Host (5 points) - **BLOCKED (Missing Field)**

**Intent:** Host has high response rate or fast response time.

**Original Logic:**
```javascript
responsive_landlord: host.response_rate >= 90 || host.average_response_time < 24
```

**Split Lease Challenge:**
- **No `response_rate` or `average_response_time` fields in rentalapplication table**
- Verification fields exist (`Verify - Linked In ID`, `Verify - Phone`, `user verified?`)

**Recommended Approach:** **Use verification status as proxy**

```javascript
// app/src/logic/rules/matching/isVerifiedHost.js

/**
 * Check if host is verified (proxy for responsiveness).
 * @param {object} params
 * @param {object} params.host - Host user object
 * @returns {boolean} True if verified
 */
export function isVerifiedHost({ host }) {
  const linkedInVerified = host['Verify - Linked In ID'] || false;
  const phoneVerified = host['Verify - Phone'] || false;
  const userVerified = host['user verified?'] || false;

  // Host is "verified" if they have at least 2 verifications
  const verificationCount = [linkedInVerified, phoneVerified, userVerified]
    .filter(Boolean).length;

  return verificationCount >= 2;
}
```

**Score Calculation:**
```javascript
// app/src/logic/calculators/matching/calculateHostScore.js

export function calculateHostScore({ hostData }) {
  const isVerified = isVerifiedHost({ host: hostData });
  return isVerified ? 5 : 0;
}
```

**Data Sources:**
- Host data joined from `rentalapplication` table via `listing['Host User']`

**Limitation:** This is a proxy metric. True response rate would require message/proposal response tracking.

---

## Complete Scoring Function

### Master Calculator

```javascript
// app/src/logic/calculators/matching/calculateMatchScore.js

import { calculateBoroughScore } from './calculateBoroughScore.js';
import { calculatePriceScore } from './calculatePriceScore.js';
import { calculateScheduleScore } from './calculateScheduleScore.js';
import { calculateWeeklyStayScore } from './calculateWeeklyStayScore.js';
import { calculateDurationScore } from './calculateDurationScore.js';
import { calculateHostScore } from './calculateHostScore.js';

/**
 * Calculate overall match score for a candidate listing.
 *
 * @param {object} params
 * @param {object} params.candidateListing - Candidate listing with all fields
 * @param {object} params.proposal - Proposal object with nested listing/host
 * @param {object} params.hostData - Host user data for candidate listing
 * @returns {object} { totalScore, breakdown }
 */
export function calculateMatchScore({ candidateListing, proposal, hostData }) {
  const scores = {
    boroughMatch: calculateBoroughScore({ candidateListing, proposal }),      // 0-25
    priceProximity: calculatePriceScore({ candidateListing, proposal }),      // 0-20
    scheduleOverlap: calculateScheduleScore({ candidateListing, proposal }),  // 0-20
    weeklyStaySupport: calculateWeeklyStayScore({ candidateListing }),        // 0-15
    durationMatch: calculateDurationScore({ candidateListing, proposal }),    // 0-10
    hostVerified: calculateHostScore({ hostData }),                           // 0-5
    priceDrop: 0 // Skipped (no data)                                        // 0
  };

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  return {
    totalScore, // 0-95 (missing 5 points from price drop)
    breakdown: scores,
    maxPossibleScore: 95 // Not 100 due to missing price drop
  };
}
```

### Heuristics Detail Function

```javascript
// app/src/logic/calculators/matching/calculateMatchHeuristics.js

import { isBoroughMatch } from '../../rules/matching/isBoroughMatch.js';
import { calculatePriceProximity } from './calculatePriceProximity.js';
import { hasScheduleCompatibility } from '../../rules/matching/hasScheduleCompatibility.js';
import { supportsWeeklyStays } from '../../rules/matching/supportsWeeklyStays.js';
import { isDurationMatch } from '../../rules/matching/isDurationMatch.js';
import { isVerifiedHost } from '../../rules/matching/isVerifiedHost.js';

/**
 * Calculate detailed heuristics for a match (boolean flags).
 *
 * @param {object} params - Same as calculateMatchScore
 * @returns {object} Boolean flags for each heuristic
 */
export function calculateMatchHeuristics({ candidateListing, proposal, hostData }) {
  const candidateBorough = candidateListing.boroughName || candidateListing['Location - Borough'];
  const proposalBorough = proposal.listing?.boroughName || proposal.listing?.borough;

  const proximity = calculatePriceProximity({ candidateListing, proposal });
  const scheduleCheck = hasScheduleCompatibility({ candidateListing, proposal });

  return {
    boroughMatch: isBoroughMatch({ candidateBorough, proposalBorough }),
    priceWithin15Percent: proximity <= 0.15,
    hasScheduleOverlap: scheduleCheck.compatible,
    supportsWeeklyStays: supportsWeeklyStays({ listing: candidateListing }),
    durationMatch: isDurationMatch({ listing: candidateListing, proposal }),
    hostVerified: isVerifiedHost({ host: hostData }),
    priceDrop: false // Always false (no data)
  };
}
```

---

## Data Requirements Summary

### Existing Fields (Ready to Use)

| Field | Table | Used For |
|-------|-------|----------|
| `Location - Borough` | listing | Borough matching |
| `💰Nightly Host Rate for X nights` | listing | Price proximity |
| `Schedule days available` | listing | Schedule overlap |
| `Minimum Nights` | listing | Duration match, weekly stays |
| `daysSelected` | proposal | Schedule comparison |
| `nightsPerWeek` | proposal | Price lookup, duration |
| `nightlyPrice` | proposal | Price comparison |
| `Verify - Linked In ID` | rentalapplication | Host verification |
| `Verify - Phone` | rentalapplication | Host verification |
| `user verified?` | rentalapplication | Host verification |

### Missing Fields (Blockers or Workarounds)

| Field | Impact | Recommendation |
|-------|--------|----------------|
| `max_nights` | Weekly stay heuristic limited | Use schedule length as proxy (WORKAROUND) |
| `previous_price_per_stay` | Price drop heuristic unavailable | Skip heuristic for MVP (5 points lost) |
| `response_rate` | Host responsiveness unavailable | Use verification count as proxy (WORKAROUND) |
| `average_response_time` | Host responsiveness unavailable | Use verification count as proxy (WORKAROUND) |

---

## Proposed Function Signatures

### Calculators (`app/src/logic/calculators/matching/`)

```javascript
// calculateMatchScore.js
export function calculateMatchScore({ candidateListing, proposal, hostData })
  → { totalScore: number, breakdown: object, maxPossibleScore: number }

// calculateMatchHeuristics.js
export function calculateMatchHeuristics({ candidateListing, proposal, hostData })
  → { boroughMatch: boolean, priceWithin15Percent: boolean, ... }

// calculateBoroughScore.js
export function calculateBoroughScore({ candidateListing, proposal })
  → number (0-25)

// calculatePriceScore.js
export function calculatePriceScore({ candidateListing, proposal })
  → number (0-20)

// calculatePriceProximity.js
export function calculatePriceProximity({ candidateListing, proposal })
  → number (0.0-1.0+)

// calculateScheduleScore.js
export function calculateScheduleScore({ candidateListing, proposal })
  → number (0-20)

// calculateWeeklyStayScore.js
export function calculateWeeklyStayScore({ candidateListing })
  → number (0-15)

// calculateDurationScore.js
export function calculateDurationScore({ candidateListing, proposal })
  → number (0-10)

// calculateHostScore.js
export function calculateHostScore({ hostData })
  → number (0-5)
```

### Rules (`app/src/logic/rules/matching/`)

```javascript
// isBoroughMatch.js
export function isBoroughMatch({ candidateBorough, proposalBorough })
  → boolean

// hasScheduleCompatibility.js
export function hasScheduleCompatibility({ candidateListing, proposal })
  → { compatible: boolean, overlapDays: number }

// supportsWeeklyStays.js
export function supportsWeeklyStays({ listing })
  → boolean

// isDurationMatch.js
export function isDurationMatch({ listing, proposal, tolerance = 1 })
  → boolean

// isVerifiedHost.js
export function isVerifiedHost({ host })
  → boolean
```

---

## Sample Calculation Examples

### Example 1: Perfect Match

**Proposal:**
- Borough: Manhattan
- Nights per week: 4
- Nightly price: $150
- Days selected: [1,2,3,4] (Mon-Thu)

**Candidate Listing:**
- Borough: Manhattan
- Nightly rate (4 nights): $155
- Schedule available: [0,1,2,3,4,5,6] (all days)
- Minimum nights: 4
- Host: 3 verifications

**Score Breakdown:**
- Borough match: 25 (exact match)
- Price proximity: 20 ($155 is 3.3% higher, within 15%)
- Schedule overlap: 20 (100% overlap)
- Weekly stay support: 15 (has all 7 days)
- Duration match: 10 (min nights = 4 = proposal nights)
- Host verified: 5 (3 verifications >= 2)
- Price drop: 0 (no data)

**Total: 95/95 points**

---

### Example 2: Partial Match

**Proposal:**
- Borough: Brooklyn
- Nights per week: 5
- Nightly price: $120
- Days selected: [1,2,3,4,5] (Mon-Fri)

**Candidate Listing:**
- Borough: Queens (adjacent to Brooklyn)
- Nightly rate (5 nights): $145
- Schedule available: [1,2,3,4] (Mon-Thu only)
- Minimum nights: 3
- Host: 1 verification

**Score Breakdown:**
- Borough match: 25 (adjacent borough)
- Price proximity: 12 ($145 is 20.8% higher, partial score)
- Schedule overlap: 16 (4/5 days overlap = 80%)
- Weekly stay support: 0 (only 4 days available)
- Duration match: 0 (min nights 3 vs 5, difference > 1)
- Host verified: 0 (only 1 verification < 2)
- Price drop: 0 (no data)

**Total: 53/95 points**

---

### Example 3: Poor Match

**Proposal:**
- Borough: Manhattan
- Nights per week: 7
- Nightly price: $200
- Days selected: [0,1,2,3,4,5,6] (all days)

**Candidate Listing:**
- Borough: Staten Island (not adjacent)
- Nightly rate (7 nights): $300
- Schedule available: [5,6] (Fri-Sat only)
- Minimum nights: 2
- Host: 0 verifications

**Score Breakdown:**
- Borough match: 0 (no match, not adjacent)
- Price proximity: 0 ($300 is 50% higher, beyond 30%)
- Schedule overlap: 6 (2/7 days overlap = 28.5%)
- Weekly stay support: 0 (only 2 days available)
- Duration match: 0 (min nights 2 vs 7, difference > 1)
- Host verified: 0 (no verifications)
- Price drop: 0 (no data)

**Total: 6/95 points**

---

## Data Gaps and Concerns

### Critical Gaps

1. **No Price History Tracking**
   - Impact: Cannot implement "price drop" heuristic (5 points)
   - Solution: Accept 95-point max for MVP, or add `previous_price_per_stay` field

2. **No Maximum Nights Field**
   - Impact: "Weekly stay support" heuristic is less accurate
   - Solution: Use schedule length as proxy (if 7 days available, assume weekly stays ok)

3. **No Response Rate Metrics**
   - Impact: Cannot measure host responsiveness accurately
   - Solution: Use verification count as proxy (less precise but better than nothing)

### Data Quality Concerns

1. **Borough Field Consistency**
   - Question: Is `Location - Borough` always populated? Is it ID or name?
   - Need: Verify with database queries
   - Fallback: Use `boroughName` from lookup joins

2. **Schedule Days Format**
   - Confirmed: Uses 0-indexed days (Split Lease standard)
   - Safe: No conversion needed

3. **Host Data Joins**
   - Question: How to efficiently join host data for scoring?
   - Solution: Edge Function should join `rentalapplication` on `listing['Host User']`

---

## Edge Function Query Strategy

The Quick Match Edge Function will need to:

1. **Fetch Proposal with Full Context**
   ```sql
   SELECT proposal.*,
          listing.*,
          rentalapplication.* as host
   FROM proposal
   LEFT JOIN listing ON proposal.Listing = listing._id
   LEFT JOIN rentalapplication ON listing."Host User" = rentalapplication._id
   WHERE proposal._id = :proposal_id
   ```

2. **Search Candidate Listings**
   ```sql
   SELECT listing.*,
          rentalapplication.* as host,
          borough.Display as boroughName,
          hood.Display as hoodName
   FROM listing
   LEFT JOIN rentalapplication ON listing."Host User" = rentalapplication._id
   LEFT JOIN zat_geo_borough_toplevel AS borough ON listing."Location - Borough" = borough._id
   LEFT JOIN zat_geo_hood_mediumlevel AS hood ON listing."Location - Hood" = hood._id
   WHERE listing._id != :excluded_listing_id
     AND listing.Status = 'Active'
     AND (:borough_filter IS NULL OR listing."Location - Borough" = :borough_filter)
   LIMIT 50
   ```

3. **Score Each Candidate in Application Code**
   - Cannot do complex heuristics in SQL
   - Fetch candidates, score in JavaScript using the calculators
   - Sort by score, return top N

---

## Recommendations

### For MVP (Minimum Viable Product)

1. **Implement 5 of 7 heuristics** (skip price drop, use verification proxy for host responsiveness)
2. **Accept 95-point maximum** instead of 100
3. **Use existing data only** - no schema changes
4. **Test with real proposal data** to validate scoring accuracy

### For Future Enhancements

1. **Add price history tracking**
   - New table: `listing_price_history(listing_id, price_per_stay, changed_at)`
   - Or: Add `previous_price_per_stay` + `price_changed_at` to listing table

2. **Add response rate metrics**
   - Track proposal response times
   - Calculate `response_rate` and `average_response_time` for hosts
   - Update nightly via cron job

3. **Add maximum nights field**
   - Migrate from Bubble or add as new field
   - Improves "weekly stay support" accuracy

4. **Improve schedule overlap logic**
   - Check blocked dates in move-in range
   - Validate actual availability, not just recurring schedule
   - Use `isDateBlocked` from existing rules

---

## Related Files Reference

### Existing Business Logic to Leverage

- `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js` - Get price for night count
- `app/src/logic/calculators/pricing/calculatePricingBreakdown.js` - Full price calculation
- `app/src/logic/rules/scheduling/isDateBlocked.js` - Check blocked dates
- `app/src/logic/processors/proposals/processProposalData.js` - Proposal data structure
- `app/src/lib/constants.js` - Borough names, day constants
- `app/src/lib/dataLookups.js` - Borough/neighborhood lookups
- `app/src/lib/listingDataFetcher.js` - Listing query patterns

### Files to Create

```
app/src/logic/calculators/matching/
├── calculateMatchScore.js
├── calculateMatchHeuristics.js
├── calculateBoroughScore.js
├── calculatePriceScore.js
├── calculatePriceProximity.js
├── calculateScheduleScore.js
├── calculateWeeklyStayScore.js
├── calculateDurationScore.js
└── calculateHostScore.js

app/src/logic/rules/matching/
├── isBoroughMatch.js
├── hasScheduleCompatibility.js
├── supportsWeeklyStays.js
├── isDurationMatch.js
└── isVerifiedHost.js

app/src/logic/processors/matching/
└── adaptCandidateListing.js (format listing for display)
```

---

## Conclusion

The Quick Match heuristics can be successfully adapted to Split Lease's data model with minimal compromises:

**✅ Fully Implementable (85 points):**
- Borough match (25)
- Price proximity (20)
- Schedule overlap (20)
- Duration match (10)
- Weekly stay support (15) - with proxy

**⚠️ Workaround Required (5 points):**
- Host responsiveness (5) - using verification as proxy

**❌ Not Implementable (5 points):**
- Price drop (5) - no price history data

**Final Score Range:** 0-95 points (95% of original system)

The scoring system will provide meaningful differentiation between good and poor matches, even without the price drop heuristic. The verification-based host score is a reasonable proxy until true response metrics are implemented.

---

**Analysis Complete**
**Next Step:** Implement the calculator and rule functions in `app/src/logic/`
