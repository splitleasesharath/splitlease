# Import Listing Modal Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Modal for importing listings from external platforms (Airbnb, VRBO)
[USE_CASE]: Hosts can import existing listings by providing URL

---

## ### COMPONENT_CONTRACTS ###

### ImportListingModal.jsx
[PATH]: ./ImportListingModal.jsx
[INTENT]: Modal for importing listings from Airbnb/VRBO with URL parsing and data mapping
[PROPS]:
  - onImport: (listingData: object) => Promise<void> (req) - Success callback with mapped data
  - onClose: () => void (req) - Close modal handler
[BEHAVIOR]:
  - Parse platform and listing ID from URL
  - Fetch listing data via Edge Function
  - Map external fields to Split Lease schema
  - Opens SelfListingPage with pre-filled data
[THROWS]: Error on invalid URL or fetch failure
[DEPENDS_ON]: lib/bubbleAPI
[ASYNC]: Yes

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

| Platform | URL Pattern |
|----------|-------------|
| Airbnb | airbnb.com/rooms/{id} |
| VRBO | vrbo.com/property/{id} |

---

## ### FIELD_MAPPING ###

| External | Split Lease |
|----------|-------------|
| title | title |
| description | description |
| bedrooms | bedrooms |
| bathrooms | bathrooms |
| amenities | amenities (mapped to our IDs) |
| photos | photos (URLs) |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Only supports Airbnb and VRBO URLs
[RULE_2]: Parent controls isOpen state
[RULE_3]: Imported data pre-fills form, not auto-submits

---

## ### DEPENDENCIES ###

[LOCAL]: lib/bubbleAPI, lib/supabase
[EXTERNAL]: None
[EDGE_FUNCTION]: bubble-proxy

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
