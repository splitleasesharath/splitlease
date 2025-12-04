# Pricing Calculators Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/calculators/

---

## ### LOGIC_CONTRACTS ###

### getNightlyRateByFrequency
[PATH]: ./getNightlyRateByFrequency.js
[INTENT]: Retrieve nightly rate tier based on nights selected from listing pricing
[SIGNATURE]: ({ listing: object, nightsSelected: number }) => number
[INPUT]:
  - listing: object (req) - Listing with price fields like '💰Nightly Host Rate for 4 nights'
  - nightsSelected: number (req) - Nights per week 2-7
[OUTPUT]: number - Nightly price for selected frequency
[THROWS]:
  - Error: "listing must be a valid object" - When listing null/invalid
  - Error: "nightsSelected must be a number" - When not number
  - Error: "nightsSelected must be between 2-7" - When out of range
  - Error: "No price found for N nights" - When price field missing
[TRUTH_SOURCE]: Internal `priceFieldMap` object:
  ```
  { 2: '💰Nightly Host Rate for 2 nights', 3: '...3 nights', 4: '...4 nights', 5: '...5 nights', 7: '...7 nights' }
  ```
[RULE]: '💰Price Override' field takes precedence over frequency-based rates
[DEPENDS_ON]: None (pure function)
[USED_BY]: calculatePricingBreakdown

### calculateFourWeekRent
[PATH]: ./calculateFourWeekRent.js
[INTENT]: Calculate recurring monthly cost as nightly rate * frequency * 4 weeks
[SIGNATURE]: ({ nightlyRate: number, frequency: number }) => number
[INPUT]:
  - nightlyRate: number (req) - Base cost per night in USD
  - frequency: number (req) - Nights per week 2-7
[OUTPUT]: number - Total rent for 4-week cycle (nightlyRate * frequency * 4)
[THROWS]:
  - Error: "nightlyRate must be a number" - When not number
  - Error: "frequency must be a number" - When not number
  - Error: "nightlyRate cannot be negative" - When < 0
  - Error: "frequency must be between 2-7" - When out of range
[EXAMPLE]: calculateFourWeekRent({ nightlyRate: 100, frequency: 4 }) => 1600
[DEPENDS_ON]: None (pure function)
[USED_BY]: calculatePricingBreakdown

### calculateReservationTotal
[PATH]: ./calculateReservationTotal.js
[INTENT]: Calculate total cost for full stay as fourWeekRent * (totalWeeks / 4)
[SIGNATURE]: ({ fourWeekRent: number, totalWeeks: number }) => number
[INPUT]:
  - fourWeekRent: number (req) - Calculated 4-week rent amount
  - totalWeeks: number (req) - Total reservation span in weeks
[OUTPUT]: number - Estimated total cost for entire reservation
[THROWS]:
  - Error: "fourWeekRent must be a number" - When not number
  - Error: "totalWeeks must be a number" - When not number
  - Error: "fourWeekRent cannot be negative" - When < 0
  - Error: "totalWeeks must be positive" - When <= 0
[EXAMPLE]: calculateReservationTotal({ fourWeekRent: 1600, totalWeeks: 13 }) => 5200
[DEPENDS_ON]: None (pure function)
[USED_BY]: calculatePricingBreakdown

### calculateGuestFacingPrice
[PATH]: ./calculateGuestFacingPrice.js
[INTENT]: Calculate guest-visible price per night after markup and discounts
[SIGNATURE]: ({ hostNightlyRate: number, nightsCount: number }) => number
[INPUT]:
  - hostNightlyRate: number (req) - Host compensation rate per night
  - nightsCount: number (req) - Number of nights selected 2-7
[OUTPUT]: number - Guest-facing price per night
[THROWS]:
  - Error: "hostNightlyRate must be a positive number" - When invalid
  - Error: "nightsCount must be between 2-7" - When out of range
[FORMULA]:
  1. basePrice = hostRate * nights
  2. fullTimeDiscount = basePrice * 0.13 (only if 7 nights)
  3. siteMarkup = (basePrice - discount) * 0.17
  4. totalPrice = basePrice - discount + markup
  5. pricePerNight = totalPrice / nights
[CONSTANTS]:
  - FULL_TIME_DISCOUNT_RATE: 0.13 (13% for 7-night stays)
  - SITE_MARKUP_RATE: 0.17 (17% on all prices)
[EXAMPLE]: calculateGuestFacingPrice({ hostNightlyRate: 100, nightsCount: 5 }) => 117
[DEPENDS_ON]: None (pure function)
[USED_BY]: Search listings, Listing cards

### calculatePricingBreakdown
[PATH]: ./calculatePricingBreakdown.js
[INTENT]: Generate complete pricing breakdown with all fees and totals
[SIGNATURE]: ({ listing: object, nightsPerWeek: number, reservationWeeks: number }) => PricingBreakdown
[INPUT]:
  - listing: object (req) - Full listing with all pricing fields
  - nightsPerWeek: number (req) - Nights selected per week 2-7
  - reservationWeeks: number (req) - Total reservation span in weeks
[OUTPUT]: object
  ```
  {
    nightlyPrice: number,
    fourWeekRent: number,
    reservationTotal: number,
    cleaningFee: number,
    damageDeposit: number,
    grandTotal: number,
    valid: true
  }
  ```
[THROWS]:
  - Error: "listing must be a valid object" - When listing invalid
  - Error: "nightsPerWeek must be a number" - When not number
  - Error: "reservationWeeks must be a number" - When not number
  - Error: Propagates errors from child calculators
[FEE_FIELDS]:
  - '💰Cleaning Cost / Maintenance Fee': Optional, defaults to 0
  - '💰Damage Deposit': Optional, defaults to 0
[DEPENDS_ON]: ./getNightlyRateByFrequency, ./calculateFourWeekRent, ./calculateReservationTotal
[USED_BY]: Proposal creation, Booking workflows

---

## ### DEPENDENCY_CHAIN ###

```
calculatePricingBreakdown
    ├── getNightlyRateByFrequency
    ├── calculateFourWeekRent
    └── calculateReservationTotal
```

---

## ### DEPENDENCIES ###

[LOCAL]: ./index.js (barrel export)
[EXTERNAL]: None
[EXPORTS]: getNightlyRateByFrequency, calculateFourWeekRent, calculateReservationTotal, calculateGuestFacingPrice, calculatePricingBreakdown

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: All functions throw errors, never return defaults
[PURE]: No side effects, deterministic output
[VALIDATION]: Input validation before any calculation
[NAMING]: calculate* for derived values, get* for lookups

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 5
