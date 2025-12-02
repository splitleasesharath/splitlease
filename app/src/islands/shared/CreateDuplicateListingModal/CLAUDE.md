# Create Duplicate Listing Modal

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Modal component for creating copies of existing listings with modifications
[USE_CASE]: Hosts with multiple similar properties can quickly create new listings

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export providing CreateDuplicateListingModal component
[EXPORTS]: CreateDuplicateListingModal

### CreateDuplicateListingModal.jsx
[INTENT]: Modal for duplicating listings with field modification options
[IMPORTS]: react, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/listing
[PROPS]: sourceListing, onDuplicate, onClose

### README.md
[INTENT]: Component usage documentation

---

## ### DUPLICATION_FIELDS ###

[COPIED]: Title, description, amenities, house rules, pricing tiers
[MODIFIED]: Address (required), photos (optional copy)
[CLEARED]: Calendar, bookings, proposals

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { CreateDuplicateListingModal } from 'islands/shared/CreateDuplicateListingModal'
[CONSUMED_BY]: Host dashboard, listing management pages

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 1
