# Import Listing Modal

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Modal for importing listings from external platforms (Airbnb, VRBO)
[USE_CASE]: Hosts can import existing listings by providing URL

---

## ### FILE_INVENTORY ###

### ImportListingModal.jsx
[INTENT]: Modal for importing listings from Airbnb/VRBO with URL parsing and data mapping
[IMPORTS]: react, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/
[PROPS]: onImport, onClose

---

## ### IMPORT_FLOW ###

```
Host enters listing URL
    │
    ▼
Parse platform and listing ID
    │
    ▼
Fetch listing data via Edge Function
    │
    ▼
Map external fields to Split Lease schema
    │
    ▼
Open SelfListingPage with pre-filled data
```

---

## ### SUPPORTED_PLATFORMS ###

[AIRBNB]: airbnb.com/rooms/{id}
[VRBO]: vrbo.com/property/{id}

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { ImportListingModal } from 'islands/shared/ImportListingModal/ImportListingModal'
[CONSUMED_BY]: ListWithUsPage, host dashboard

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
