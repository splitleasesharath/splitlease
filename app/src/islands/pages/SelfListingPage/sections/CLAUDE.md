# SelfListingPage Sections Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Form sections for multi-step listing creation wizard
[LANGUAGE]: TypeScript
[PATTERN]: Each section handles one aspect of listing data

---

## ### SECTION_CONTRACTS ###

### Section1SpaceSnapshot.tsx
[PATH]: ./Section1SpaceSnapshot.tsx
[INTENT]: Property type, bedrooms, bathrooms, address input section
[FIELDS]: propertyType, bedrooms, bathrooms, address, borough, neighborhood
[VALIDATION]: Required fields, valid NYC address

---

### Section2Features.tsx
[PATH]: ./Section2Features.tsx
[INTENT]: Amenities and features selection section
[FIELDS]: selectedAmenities array
[DATA_SOURCE]: Supabase zat_features_amenity table
[DEPENDS_ON]: utils/amenitiesService

---

### Section3LeaseStyles.tsx
[PATH]: ./Section3LeaseStyles.tsx
[INTENT]: Flexible lease configuration section
[FIELDS]: availableDays, minimumStay, leaseTerms

---

### Section4Pricing.tsx
[PATH]: ./Section4Pricing.tsx
[INTENT]: Pricing tier configuration section
[FIELDS]: nightlyRates by day count, cleaningFee, securityDeposit
[DEPENDS_ON]: ../components/NightlyPriceSlider

---

### Section5Rules.tsx
[PATH]: ./Section5Rules.tsx
[INTENT]: House rules and policies section
[FIELDS]: selectedRules array, customRules text
[DATA_SOURCE]: Supabase zat_features_houserule table

---

### Section6Photos.tsx
[PATH]: ./Section6Photos.tsx
[INTENT]: Photo upload section
[FIELDS]: photos array
[CONSTRAINTS]: 5-20 photos required
[DEPENDS_ON]: shared/SubmitListingPhotos

---

### Section7Review.tsx
[PATH]: ./Section7Review.tsx
[INTENT]: Final review section displaying all entered data before submission
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

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Each section validates before allowing next
[RULE_2]: State managed by useSelfListingStore (Zustand)
[RULE_3]: Draft auto-saved to localStorage on field change

---

## ### DEPENDENCIES ###

[LOCAL]: useSelfListingStore, shared/SubmitListingPhotos
[DATA]: Supabase zat_* lookup tables
[EXTERNAL]: None

---

**FILE_COUNT**: 7
**EXPORTS_COUNT**: 7
