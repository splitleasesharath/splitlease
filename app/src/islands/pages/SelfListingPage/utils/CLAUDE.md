# SelfListingPage Utils

**GENERATED**: 2025-11-26
**ARCHITECTURE**: TypeScript
**PARENT**: app/src/islands/pages/SelfListingPage/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Service modules for fetching lookup data during listing creation
[PATTERN]: Async functions fetching from Supabase lookup tables

---

## ### FILE_INVENTORY ###

### amenitiesService.ts
[INTENT]: Fetch and manage amenities data from Supabase zat_features_amenity table
[IMPORTS]: lib/supabase
[EXPORTS]: fetchAmenities, getAmenityById
[DATA_SOURCE]: Supabase table: zat_features_amenity

### neighborhoodService.ts
[INTENT]: Fetch neighborhood data by borough from Supabase lookup tables
[IMPORTS]: lib/supabase
[EXPORTS]: fetchNeighborhoodsByBorough, getBoroughs
[DATA_SOURCE]: Supabase tables: zat_geo_borough_toplevel, zat_geo_hood_mediumlevel

---

## ### DATA_FLOW ###

```
User selects borough
    │
    ▼
neighborhoodService.fetchNeighborhoodsByBorough(boroughId)
    │
    ▼
Supabase query: zat_geo_hood_mediumlevel
    │
    ▼
Return neighborhood options for dropdown
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { fetchAmenities } from './utils/amenitiesService'
[CONSUMED_BY]: Section2Features.tsx, Section1SpaceSnapshot.tsx

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 4
