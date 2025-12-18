# Implementation Plan: Address Autocomplete for Edit Listing Details

## Overview
Add Google Places address autocomplete functionality to the EditListingDetails component's Property Info section. This will provide a searchbox input that displays real address suggestions (matching the self-listing page behavior), prefill it with the user's existing address, and auto-populate city, state, zip code, and borough fields when an address is selected.

## Success Criteria
- [ ] Address searchbox input displays Google Places autocomplete suggestions
- [ ] Existing address is prefilled in the searchbox when modal opens
- [ ] Selecting an address auto-populates: City, State, Zip Code, and Borough fields
- [ ] Address validation restricts to NYC + Hudson County NJ service area
- [ ] Works in both PreviewSplitLeasePage and ListingDashboardPage edit modals
- [ ] Manual entry fallback remains available
- [ ] Visual feedback for validated addresses (checkmark indicator)

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/EditListingDetails/EditListingDetails.jsx` | Main edit modal component | Add address autocomplete input to Property Info section |
| `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js` | Business logic hook | Add Google Maps autocomplete initialization and address parsing logic |
| `app/src/islands/pages/SelfListingPage/sections/Section1SpaceSnapshot.tsx` | Reference implementation | Copy autocomplete initialization pattern from here |
| `app/src/lib/nycZipCodes.ts` | Service area validation | Import validation functions |
| `app/src/islands/shared/EditListingDetails/constants.js` | Constants file | Add US States constant if needed |
| `app/src/styles/components/edit-listing-details.css` | Modal styling | Add styles for autocomplete input and validation states |

### Related Documentation
- `app/src/islands/pages/SelfListingPage/CLAUDE.md` - Reference for address autocomplete implementation
- `app/src/islands/pages/ListingDashboardPage/CLAUDE.md` - Understanding listing data structure

### Existing Patterns to Follow
- **Google Maps Places Autocomplete**: Already implemented in `Section1SpaceSnapshot.tsx` (lines 64-244)
- **NYC Service Area Validation**: Uses `isValidServiceArea()`, `getBoroughForZipCode()` from `nycZipCodes.ts`
- **Bounds Restriction**: Uses `NYC_BOUNDS` constant to restrict autocomplete to NYC + Hudson County NJ
- **Address Data Structure**: Uses `fullAddress`, `city`, `state`, `zip`, `neighborhood` properties

## Implementation Steps

### Step 1: Add State Variables to useEditListingDetailsLogic.js
**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Add state for address autocomplete, validation status, and refs
**Details:**
- Add `addressInputRef` using `useRef`
- Add `autocompleteRef` using `useRef` for Google Maps instance
- Add `isAddressValid` state boolean
- Add `addressError` state string
- Add `showManualAddress` state boolean
- Import `isValidServiceArea`, `getBoroughForZipCode`, `NYC_BOUNDS` from `nycZipCodes`
**Validation:** Component renders without errors

### Step 2: Initialize Google Maps Autocomplete
**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Initialize Google Places Autocomplete when Property Info section is active
**Details:**
- Add useEffect to initialize autocomplete when `editSection === 'name' || editSection === 'location'`
- Create bounds using `NYC_BOUNDS` constant
- Configure autocomplete with:
  - `types: ['address']`
  - `componentRestrictions: { country: 'us' }`
  - `bounds: nycBounds`
  - `strictBounds: true`
  - `fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']`
- Add place_changed listener to parse address components
- Prevent Enter key from triggering autocomplete selection prematurely
- Cleanup listeners on unmount
**Validation:** Console logs show "Google Maps Autocomplete initialized successfully"

### Step 3: Implement Address Parsing and Auto-population
**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Parse selected address and populate city, state, zip, borough fields
**Details:**
- Extract address components from Google Places response:
  - `street_number` -> not stored (privacy)
  - `route` -> not stored (privacy)
  - `locality` -> `Location - City`
  - `administrative_area_level_1` -> `Location - State` (short_name)
  - `postal_code` -> `Location - Zip Code`
  - `neighborhood` or `sublocality` -> `Location - Borough`
- Validate using `isValidServiceArea(zip, state, county)`
- Update formData with parsed values
- Set `isAddressValid` to true on successful validation
- Set `addressError` with appropriate message on validation failure
**Validation:** Selecting an address auto-populates all location fields

### Step 4: Create Address Display String
**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Compute a display string from existing location fields for prefilling
**Details:**
- Add computed value `addressDisplayValue` that combines:
  - `formData['Location - City']`
  - `formData['Location - State']`
  - `formData['Location - Zip Code']`
- Format as "City, State Zip" or just show whatever fields are available
- Return this value for prefilling the address input
**Validation:** Existing listings show their address in the searchbox

### Step 5: Add Address Autocomplete UI to EditListingDetails.jsx
**Files:** `app/src/islands/shared/EditListingDetails/EditListingDetails.jsx`
**Purpose:** Add the address searchbox input above the city/state/zip fields
**Details:**
- Import `addressInputRef`, `isAddressValid`, `addressError`, `addressDisplayValue` from hook
- Add new "Listing Address" input field with:
  - `ref={addressInputRef}`
  - `placeholder="Start typing your address..."`
  - `value` controlled to show addressDisplayValue initially
  - `onChange` handler to update local input state
- Add validation indicator (checkmark when valid)
- Add error message display when `addressError` is set
- Add "Enter manually" toggle link below the searchbox
- Keep existing city/state/zip/borough fields but show them collapsed by default
- Expand manual fields when toggle is clicked or when address validation fails
**Validation:** Address input appears above city/state/zip fields in Property Info section

### Step 6: Add CSS Styles for Address Autocomplete
**Files:** `app/src/styles/components/edit-listing-details.css`
**Purpose:** Style the address input, validation states, and manual entry toggle
**Details:**
- Add `.eld-address-autocomplete` class for the address input container
- Add `.eld-address-input` class for the searchbox styling
- Add `.eld-address-valid` class for green checkmark indicator
- Add `.eld-address-error` class for red error state
- Add `.eld-manual-toggle` class for the "Enter manually" link
- Add `.eld-manual-fields` class for the collapsible manual entry section
- Match existing edit-listing-details.css design patterns
**Validation:** Styles render correctly and match existing modal design

### Step 7: Handle Address Input Value Management
**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Manage the address input value separate from formData
**Details:**
- Add `addressInputValue` state to track what's shown in the input
- Initialize from `addressDisplayValue` when modal opens
- Update on user typing (clears validation)
- Update on place selection (sets to formatted_address)
- Clear validation state when user starts typing
- Add `handleAddressInputChange` callback
**Validation:** Input value updates correctly as user types and selects

### Step 8: Test and Validate Integration
**Files:** Multiple
**Purpose:** Ensure feature works correctly in both pages
**Details:**
- Test in PreviewSplitLeasePage edit modal (editSection="location")
- Test in ListingDashboardPage edit modal (editSection="name")
- Verify prefilling works with existing listing data
- Verify auto-population of all fields
- Verify NYC service area validation
- Verify error messages for out-of-area addresses
- Verify manual entry fallback works
**Validation:** All test scenarios pass

## Edge Cases & Error Handling
- **No Google Maps API**: Show error message "Address autocomplete is unavailable. Please use manual entry."
- **User types but doesn't select**: Show message "Please select a valid address from the dropdown or enter manually"
- **Address outside service area**: Show specific error with area name and service area list
- **Missing address components**: Allow saving with partial data, only required fields need validation
- **Existing listing with no address**: Show empty input with placeholder
- **Network failure during autocomplete**: Gracefully fallback to manual entry

## Testing Considerations
- Verify Google Maps API key is configured in index.html
- Test with listings that have complete address data
- Test with listings that have partial address data (city only, etc.)
- Test with listings that have no address data
- Test NYC addresses (all 5 boroughs)
- Test Hudson County NJ addresses
- Test out-of-service-area addresses (should show error)
- Test manual entry flow when autocomplete fails

## Rollback Strategy
- Changes are isolated to EditListingDetails component
- Can be reverted by removing the address autocomplete input
- Existing manual input fields remain as fallback
- No database schema changes required

## Dependencies & Blockers
- Google Maps API key must be configured (already in public/index.html)
- Google Maps Places library must be loaded (already loaded)
- No new dependencies required

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google Maps API not loaded | Low | Medium | Fallback to manual entry with error message |
| Service area validation too strict | Medium | Low | Allow manual entry to bypass autocomplete |
| Performance impact from autocomplete | Low | Low | Only initialize when section is expanded |
| Address format incompatible with DB | Low | Medium | Use same parsing logic as SelfListingPage |

---

## File References Summary

### Files to Modify
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\EditListingDetails\useEditListingDetailsLogic.js`
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\EditListingDetails\EditListingDetails.jsx`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\edit-listing-details.css`

### Reference Files (Read-Only)
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPage\sections\Section1SpaceSnapshot.tsx` - Google Maps autocomplete implementation
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\nycZipCodes.ts` - Service area validation functions
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\PreviewSplitLeasePage.jsx` - Uses EditListingDetails with editSection="location"
4. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ListingDashboardPage\ListingDashboardPage.jsx` - Uses EditListingDetails with editSection="name"

### Database Fields Affected
- `Location - City` (string)
- `Location - State` (string, e.g., "NY", "NJ")
- `Location - Zip Code` (string)
- `Location - Borough` (string)
- `Location - Hood` (string, neighborhood)

### Key Code Patterns to Copy

**Google Maps Autocomplete Initialization (from Section1SpaceSnapshot.tsx):**
```typescript
const nycBounds = new window.google.maps.LatLngBounds(
  new window.google.maps.LatLng(NYC_BOUNDS.south, NYC_BOUNDS.west),
  new window.google.maps.LatLng(NYC_BOUNDS.north, NYC_BOUNDS.east)
);

const autocomplete = new window.google.maps.places.Autocomplete(
  addressInputRef.current,
  {
    types: ['address'],
    componentRestrictions: { country: 'us' },
    bounds: nycBounds,
    strictBounds: true,
    fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
  }
);
```

**Address Component Parsing:**
```typescript
place.address_components.forEach((component: any) => {
  const types = component.types;
  if (types.includes('locality')) city = component.long_name;
  if (types.includes('administrative_area_level_1')) state = component.short_name;
  if (types.includes('postal_code')) zip = component.long_name;
  if (types.includes('neighborhood') || types.includes('sublocality')) neighborhood = component.long_name;
});
```

**Service Area Validation:**
```typescript
import { isValidServiceArea, getBoroughForZipCode, NYC_BOUNDS } from '../../../../lib/nycZipCodes';

if (!isValidServiceArea(zip, state, county)) {
  setAddressError('This address is outside our service area...');
  return;
}
```
