# Listing Card Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Listing preview card variants for search results and map views
[PATTERN]: Compact listing representations with key information

---

## ### FILE_INVENTORY ###

### ListingCardForMap.jsx
[INTENT]: Compact listing card optimized for map popup/info window display
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/pricing/calculateGuestFacingPrice
[PROPS]: listing, onClick

### ListingCardForMap.css
[INTENT]: Styles for map listing card with compact layout

---

## ### CARD_VARIANTS ###

[STANDARD]: Full listing card (in parent shared/ directory)
[MAP_CARD]: Compact version for Google Maps info windows

---

## ### DISPLAYED_INFO ###

[PHOTO]: Primary listing image thumbnail
[PRICE]: Guest-facing price per night
[LOCATION]: Neighborhood name
[BASICS]: Bedrooms, bathrooms count

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { ListingCardForMap } from 'islands/shared/ListingCard/ListingCardForMap'
[CONSUMED_BY]: GoogleMap component, SearchPage map view

---

**FILE_COUNT**: 2
**EXPORTS_COUNT**: 1
