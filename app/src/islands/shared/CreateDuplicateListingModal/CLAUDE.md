# Create Duplicate Listing Modal Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Modal component for creating copies of existing listings with modifications
[USE_CASE]: Hosts with multiple similar properties can quickly create new listings

---

## ### COMPONENT_CONTRACTS ###

### CreateDuplicateListingModal.jsx
[PATH]: ./CreateDuplicateListingModal.jsx
[INTENT]: Modal for duplicating listings with field modification options
[PROPS]:
  - sourceListing: object (req) - Listing to duplicate
  - onDuplicate: (newListing: object) => Promise<void> (req) - Success callback
  - onClose: () => void (req) - Close modal handler
[BEHAVIOR]:
  - Copies: title, description, amenities, house rules, pricing tiers
  - Requires: new address input
  - Optional: copy photos
  - Clears: calendar, bookings, proposals
[THROWS]: Error on duplicate failure
[DEPENDS_ON]: lib/bubbleAPI
[ASYNC]: Yes

---

### index.js
[PATH]: ./index.js
[INTENT]: Barrel export
[EXPORTS]: { CreateDuplicateListingModal }

---

## ### DUPLICATION_FIELD_MAP ###

| Action | Fields |
|--------|--------|
| COPIED | title, description, amenities, house rules, pricing tiers |
| MODIFIED | address (required), photos (optional) |
| CLEARED | calendar, bookings, proposals |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: New address is required (cannot duplicate with same address)
[RULE_2]: Photos optional - large uploads may take time
[RULE_3]: Parent controls isOpen state

---

## ### DEPENDENCIES ###

[LOCAL]: lib/bubbleAPI, lib/supabase
[EXTERNAL]: None
[EDGE_FUNCTION]: bubble-proxy

---

**FILE_COUNT**: 3
**EXPORTS_COUNT**: 1
