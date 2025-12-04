# Listing Processors Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform raw listing data into frontend-ready format
[LAYER]: Layer 3 - Processors (data extraction and parsing)
[PATTERN]: Extract and parse listing fields from Supabase/Bubble responses

---

## ### PROCESSOR_CONTRACTS ###

### extractListingCoordinates
[PATH]: ./extractListingCoordinates.js
[INTENT]: Extract lat/lng from listing JSONB location fields
[SIGNATURE]: ({ locationSlightlyDifferent: object|string|null, locationAddress: object|string|null, listingId: string }) => { lat: number, lng: number, source: string } | null
[INPUT]:
  - locationSlightlyDifferent: object|string|null (opt) - Privacy-adjusted address JSONB
  - locationAddress: object|string|null (opt) - Main address JSONB
  - listingId: string (req) - Listing ID for error logging
[OUTPUT]: Coordinates object { lat, lng, source } or null if invalid
[THROWS]: Error when listingId is not provided
[PRIORITY_ORDER]:
  1. "Location - slightly different address" (privacy/pin separation)
  2. "Location - Address" (main address fallback)
[SOURCE_VALUES]: 'slightly-different-address' | 'main-address'
[EXAMPLE]:
  ```javascript
  extractListingCoordinates({
    locationSlightlyDifferent: { lat: 40.7128, lng: -74.0060 },
    locationAddress: { lat: 40.7127, lng: -74.0061 },
    listingId: 'listing_123'
  })
  // => { lat: 40.7128, lng: -74.0060, source: 'slightly-different-address' }
  ```
[DEPENDS_ON]: None (pure function)

---

### parseJsonArrayField
[PATH]: ./parseJsonArrayField.js
[INTENT]: Parse JSONB arrays that may be double-encoded as strings
[SIGNATURE]: ({ field: any, fieldName: string }) => array
[INPUT]:
  - field: any (req) - JSONB field value from Supabase
  - fieldName: string (req) - Field name for error messages
[OUTPUT]: Parsed array
[THROWS]:
  - Error when fieldName is not provided
  - Error when field is null/undefined (data missing)
  - Error when field is string but cannot parse as JSON
  - Error when parsed result is not an array
  - Error when field is unexpected type
[HANDLES]:
  - Native arrays: Return as-is
  - JSON strings: Parse and return
[EXAMPLE]:
  ```javascript
  parseJsonArrayField({
    field: '["amenity1","amenity2"]',
    fieldName: 'Features - Amenities'
  }) // => ['amenity1', 'amenity2']
  ```
[DEPENDS_ON]: None (pure function)

---

### parseJsonArrayFieldOptional
[PATH]: ./parseJsonArrayField.js
[INTENT]: Parse optional JSONB arrays with empty array default
[SIGNATURE]: ({ field: any, fieldName: string }) => array
[INPUT]:
  - field: any (opt) - JSONB field value from Supabase
  - fieldName: string (req) - Field name for error messages
[OUTPUT]: Parsed array or empty array if null/undefined
[THROWS]: Error if field is provided but invalid format
[USE_WHEN]: Field is truly optional and empty array is valid business state
[EXAMPLE]:
  ```javascript
  parseJsonArrayFieldOptional({
    field: null,
    fieldName: 'Optional Amenities'
  }) // => []
  ```
[DEPENDS_ON]: parseJsonArrayField

---

## ### DATA_SOURCES ###

[GEOGRAPHIC_ADDRESS]: Bubble field containing lat/lng coordinates (JSONB)
[JSON_FIELDS]: amenities, house_rules, photos may be stored as JSON strings
[DOUBLE_ENCODING]: Some fields come as JSON strings needing parse

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always use extractListingCoordinates for map rendering
[RULE_2]: Use parseJsonArrayField for required array fields
[RULE_3]: Use parseJsonArrayFieldOptional ONLY for truly optional fields
[RULE_4]: Pass listingId to extractListingCoordinates for debugging

---

## ### COMMON_PATTERNS ###

### Map Marker Rendering
```javascript
import { extractListingCoordinates } from 'logic/processors/listing/extractListingCoordinates'

function renderMapMarkers(listings) {
  return listings
    .map(listing => {
      const coords = extractListingCoordinates({
        locationSlightlyDifferent: listing['Location - slightly different address'],
        locationAddress: listing['Location - Address'],
        listingId: listing._id
      })

      if (!coords) return null // Skip listings without coordinates

      return { ...listing, lat: coords.lat, lng: coords.lng }
    })
    .filter(Boolean)
}
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None
[EXPORTS]: extractListingCoordinates, parseJsonArrayField, parseJsonArrayFieldOptional

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Strict validation, returns null only for truly missing data
[PURE]: No side effects (console.warn for debugging only)
[JSONB_HANDLING]: Handles both native and string-encoded JSONB

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 3
