# Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Data transformation and adaptation functions
[LAYER]: Layer 3 of four-layer logic architecture
[PATTERN]: Transform raw data into processed formats

---

## ### SUBDIRECTORIES ###

### display/
[INTENT]: Format data for UI display
[FILES]: 1 processor function
[KEY_EXPORTS]: formatHostName

### external/
[INTENT]: CRITICAL - Convert data between JavaScript and external APIs (Bubble.io)
[FILES]: 4 processor functions
[KEY_EXPORTS]: adaptDaysFromBubble, adaptDaysToBubble (day format conversion)
[CRITICAL]: Day indexing conversion between JS (0-6) and Bubble (1-7)

### listing/
[INTENT]: Transform listing data from API responses
[FILES]: 2 processor functions
[KEY_EXPORTS]: extractListingCoordinates, parseJsonArrayField

### proposal/
[INTENT]: Transform proposal data with computed fields
[FILES]: 1 processor function
[KEY_EXPORTS]: processProposalData

### proposals/
[INTENT]: Alternate proposal processing (check for duplication)
[FILES]: 1 processor function

### user/
[INTENT]: Transform user data for display
[FILES]: 4 processor functions
[KEY_EXPORTS]: processUserDisplayName, processUserInitials, processProfilePhotoUrl

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export aggregating all processor functions
[EXPORTS]: * from all subdirectories

---

## ### LAYER_RULES ###

[ALLOWED]: Data mapping, field extraction, format conversion
[ALLOWED]: Calling calculators and rules
[FORBIDDEN]: API calls, state mutations
[TESTING]: Input/output transformation tests

---

## ### CRITICAL_NOTE ###

[DAY_CONVERSION]: external/ directory contains CRITICAL day index converters
[ALWAYS_USE]: adaptDaysFromBubble when receiving from API
[ALWAYS_USE]: adaptDaysToBubble when sending to API

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_FILES**: 13
