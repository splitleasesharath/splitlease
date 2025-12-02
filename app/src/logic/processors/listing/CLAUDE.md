# Listing Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform raw listing data into processed frontend format
[LAYER]: Layer 3 - Processors (data extraction and parsing)
[PATTERN]: Extract and parse listing fields from API responses

---

## ### FILE_INVENTORY ###

### extractListingCoordinates.js
[INTENT]: Extract latitude/longitude coordinates from listing geographic_address field
[EXPORTS]: extractListingCoordinates
[SIGNATURE]: (listing: object) => { lat: number, lng: number } | null
[OUTPUT]: Coordinate object or null if missing

### parseJsonArrayField.js
[INTENT]: Parse JSON array fields from database that may be stored as strings
[EXPORTS]: parseJsonArrayField
[SIGNATURE]: (field: string | array) => array
[OUTPUT]: Parsed array (handles both string JSON and native arrays)

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { extractListingCoordinates } from 'logic/processors/listing/extractListingCoordinates'
[CONSUMED_BY]: GoogleMap component, MapModal, search map view
[PATTERN]: const coords = extractListingCoordinates(listing); if (coords) showMap(coords)

---

## ### DATA_SOURCES ###

[GEOGRAPHIC_ADDRESS]: Bubble field containing lat/lng coordinates
[JSON_FIELDS]: amenities, house_rules, photos arrays may be stored as JSON strings

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 2
