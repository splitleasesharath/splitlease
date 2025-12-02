# Display Processors - Logic Layer 3

**GENERATED**: 2025-11-26
**LAYER**: Processors (Data Transformers)
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform data for UI display formatting
[LAYER]: Layer 3 - Processors (transform data, may format for presentation)
[PATTERN]: All functions take raw data and return display-ready strings

---

## ### FILE_INVENTORY ###

### formatHostName.js
[INTENT]: Format host name for display with optional truncation and honorifics
[EXPORTS]: formatHostName
[SIGNATURE]: (host: object, options?: object) => string
[OUTPUT]: Formatted display name string

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { formatHostName } from 'logic/processors/display/formatHostName'
[CONSUMED_BY]: HostProfileModal, ListingCard, messaging components
[PATTERN]: <span>{formatHostName(host, { truncate: true })}</span>

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
