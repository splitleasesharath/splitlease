# SelfListingPage Types

**GENERATED**: 2025-11-26
**ARCHITECTURE**: TypeScript
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: TypeScript type definitions for listing creation
[PATTERN]: Centralized type exports for type safety

---

## ### FILE_INVENTORY ###

### listing.types.ts
[INTENT]: Type definitions for listing data structures
[EXPORTS]: ListingDraft, ListingSection, ValidationResult, PricingTier

---

## ### TYPE_DEFINITIONS ###

```typescript
interface ListingDraft {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  address: string;
  borough: string;
  neighborhood: string;
  amenities: string[];
  availableDays: number[];
  pricing: PricingTier[];
  rules: string[];
  photos: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import type { ListingDraft } from './types/listing.types'
[CONSUMED_BY]: All TypeScript files in SelfListingPage

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 4+
