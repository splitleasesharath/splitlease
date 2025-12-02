# SelfListingPage Sections

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands (TypeScript)
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Form sections for multi-step listing creation wizard
[LANGUAGE]: TypeScript
[PATTERN]: Each section handles one aspect of listing data

---

## ### FILE_INVENTORY ###

### Section1SpaceSnapshot.tsx
[INTENT]: Property type, bedrooms, bathrooms, address input section
[IMPORTS]: react
[FIELDS]: propertyType, bedrooms, bathrooms, address, borough, neighborhood
[VALIDATION]: Required fields, valid NYC address

### Section2Features.tsx
[INTENT]: Amenities and features selection section
[IMPORTS]: react
[DEPENDENCIES]: utils/amenitiesService
[FIELDS]: selectedAmenities array
[DATA_SOURCE]: Supabase zat_features_amenity table

### Section3LeaseStyles.tsx
[INTENT]: Flexible lease configuration section
[IMPORTS]: react
[FIELDS]: availableDays, minimumStay, leaseTerms

### Section4Pricing.tsx
[INTENT]: Pricing tier configuration section
[IMPORTS]: react, ../components/NightlyPriceSlider
[FIELDS]: nightlyRates by day count, cleaningFee, securityDeposit

### Section5Rules.tsx
[INTENT]: House rules and policies section
[IMPORTS]: react
[DATA_SOURCE]: Supabase zat_features_houserule table
[FIELDS]: selectedRules array, customRules text

### Section6Photos.tsx
[INTENT]: Photo upload section
[IMPORTS]: react, shared/SubmitListingPhotos
[FIELDS]: photos array
[CONSTRAINTS]: 5-20 photos required

### Section7Review.tsx
[INTENT]: Final review section displaying all entered data before submission
[IMPORTS]: react
[ACTION]: Submit listing to Bubble API via Edge Function

---

## ### SECTION_FLOW ###

```
Section 1: Space Snapshot (property basics)
    ▼
Section 2: Features (amenities)
    ▼
Section 3: Lease Styles (scheduling)
    ▼
Section 4: Pricing (rates)
    ▼
Section 5: Rules (house rules)
    ▼
Section 6: Photos (images)
    ▼
Section 7: Review & Submit
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { Section1SpaceSnapshot } from './sections/Section1SpaceSnapshot'
[CONSUMED_BY]: SelfListingPage.tsx
[STATE_MANAGEMENT]: useSelfListingStore (Zustand)

---

**FILE_COUNT**: 7
**EXPORTS_COUNT**: 7
