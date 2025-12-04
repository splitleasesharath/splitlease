# Pricing Calculators - Logic Layer 1

**GENERATED**: 2025-11-26
**LAYER**: Calculators (Pure Functions)
**PARENT**: app/src/logic/calculators/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Pure mathematical functions for computing rental pricing
[LAYER]: Layer 1 - Calculators (no side effects, deterministic output)
[PATTERN]: All functions are pure - same input always produces same output

---

## ### FILE_INVENTORY ###

### calculateFourWeekRent.js
[INTENT]: Calculate monthly rent from nightly rate by multiplying rate by 28 nights (4 weeks)
[EXPORTS]: calculateFourWeekRent
[SIGNATURE]: (nightlyRate: number) => number
[PURE]: Yes

### calculateGuestFacingPrice.js
[INTENT]: Calculate guest-visible pricing including service fees and applicable discounts
[EXPORTS]: calculateGuestFacingPrice
[IMPORTS]: ./getNightlyRateByFrequency
[SIGNATURE]: (basePrice: number, nights: number, fees: object) => object
[PURE]: Yes

### calculatePricingBreakdown.js
[INTENT]: Generate itemized pricing breakdown with subtotal, fees, taxes, and total
[EXPORTS]: calculatePricingBreakdown
[IMPORTS]: ./calculateGuestFacingPrice
[SIGNATURE]: (listing: object, nights: number, selectedDays: array) => PricingBreakdown
[PURE]: Yes

### calculateReservationTotal.js
[INTENT]: Calculate complete reservation total including all fees, taxes, and deposits
[EXPORTS]: calculateReservationTotal
[IMPORTS]: ./calculatePricingBreakdown
[SIGNATURE]: (listing: object, proposalDetails: object) => number
[PURE]: Yes

### getNightlyRateByFrequency.js
[INTENT]: Retrieve nightly rate based on day count frequency from listing pricing tiers
[EXPORTS]: getNightlyRateByFrequency
[SIGNATURE]: (pricing: object, dayCount: number) => number
[PURE]: Yes

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { calculatePricingBreakdown } from 'logic/calculators/pricing/calculatePricingBreakdown'
[CONSUMED_BY]: UI components, workflows, processors
[NEVER]: Call external APIs, modify state, access storage

---

## ### DEPENDENCY_CHAIN ###

```
calculateReservationTotal
    └── calculatePricingBreakdown
            └── calculateGuestFacingPrice
                    └── getNightlyRateByFrequency
```

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 5
