# Listing Card Components Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Listing preview card variants for search results and map views
[PATTERN]: Compact listing representations with key information

---

## ### COMPONENT_CONTRACTS ###

### ListingCardForMap.jsx
[PATH]: ./ListingCardForMap.jsx
[INTENT]: Compact listing card optimized for Google Maps info window display
[PROPS]:
  - listing: object (req) - Listing data with photos, price, location
  - onClick: () => void (opt) - Click handler to navigate to listing
[DEPENDS_ON]: logic/calculators/pricing/calculateGuestFacingPrice
[SYNC]: Yes (pure rendering)

---

## ### CARD_VARIANTS ###

| Variant | Use Case | Location |
|---------|----------|----------|
| STANDARD | Full listing card | ../ListingCard.jsx (parent shared/) |
| MAP_CARD | Compact for map popups | ./ListingCardForMap.jsx |

---

## ### DISPLAYED_INFO ###

| Field | Source |
|-------|--------|
| Photo | listing.photos[0] (primary) |
| Price | calculateGuestFacingPrice(listing) |
| Location | listing.neighborhood |
| Basics | listing.bedrooms, listing.bathrooms |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: MapCard is stateless - all data via props
[RULE_2]: Price shows guest-facing rate (not raw nightly rate)
[RULE_3]: Click handler optional - parent decides navigation

---

## ### DEPENDENCIES ###

[LOCAL]: logic/calculators/pricing/calculateGuestFacingPrice
[EXTERNAL]: None

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 1
