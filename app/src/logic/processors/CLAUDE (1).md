# Processors Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/logic/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Data transformation and adaptation functions
[PATTERN]: Layer 3 of Four-Layer Logic Architecture
[LAYER]: Transform raw data shapes into processed formats

---

## ### SUB-MODULES ###

- **[display/](./display/CLAUDE.md)**: UI formatting (formatHostName) - 1 function
- **[external/](./external/CLAUDE.md)**: CRITICAL day format conversion (adaptDays*) - 4 functions
- **[listing/](./listing/CLAUDE.md)**: Listing data extraction (coordinates, JSON parsing) - 3 functions
- **[proposal/](./proposal/CLAUDE.md)**: Proposal data transformation with counteroffer merging - 1 function
- **[proposals/](./proposals/CLAUDE.md)**: Rich proposal processing with nested data - 9 functions
- **[user/](./user/CLAUDE.md)**: User data formatting (names, photos, initials) - 4 functions

---

## ### KEY_EXPORTS ###

[FROM_DISPLAY]: formatHostName
[FROM_EXTERNAL]: adaptDaysFromBubble, adaptDaysToBubble, adaptDayFromBubble, adaptDayToBubble
[FROM_LISTING]: extractListingCoordinates, parseJsonArrayField, parseJsonArrayFieldOptional
[FROM_PROPOSAL]: processProposalData
[FROM_PROPOSALS]: processProposalData, processUserData, processListingData, processHostData, processVirtualMeetingData, getProposalDisplayText, formatPrice, formatDate, formatDateTime, getEffectiveTerms
[FROM_USER]: processProfilePhotoUrl, processUserDisplayName, processUserInitials, processUserData

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Functions throw errors for invalid input, return null for missing optional data
[PURE]: No side effects, deterministic output (except console.warn for debugging)
[INPUT_VALIDATION]: All functions validate inputs before processing

---

## ### LAYER_RULES ###

[ALLOWED]: Data mapping, field extraction, format conversion
[ALLOWED]: Calling calculators and rules
[FORBIDDEN]: API calls, state mutations, async operations
[TESTING]: Input/output transformation tests

---

## ### CRITICAL_NOTE ###

[DAY_CONVERSION]: external/ directory contains CRITICAL day index converters
[ALWAYS_USE]: adaptDaysFromBubble when receiving from Bubble API
[ALWAYS_USE]: adaptDaysToBubble when sending to Bubble API
[NEVER_SKIP]: Day conversion at API boundaries

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_FILES**: 22 functions
