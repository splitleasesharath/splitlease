# Implementation Plan: Restore View Map Button on Guest Proposals Page

## Overview
Restore the "View Map" button functionality on the guest-proposals page by connecting it to the existing MapModal component. The button should open a map modal centered on the listing's 'Location - slightly different address' coordinates with a dropped pin, mirroring the privacy-first approach used on the search page.

## Success Criteria
- [ ] "View Map" button on ProposalCard opens MapModal when clicked
- [ ] Map modal displays the listing's location using 'Location - slightly different address' field (for privacy)
- [ ] Map modal shows listing name, neighborhood, and borough information
- [ ] Map modal includes "Open in Google Maps" link for external navigation
- [ ] Falls back to 'Location - Address' if 'slightly different address' is not available
- [ ] Modal can be closed via close button, backdrop click, or ESC key

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/proposals/ProposalCard.jsx` | Proposal card component with "View Map" button | Add MapModal import, state management, onClick handler, and modal rendering |
| `app/src/islands/modals/MapModal.jsx` | Map modal component (UI only, no Google Maps) | No changes - component is ready to use |
| `app/src/lib/proposals/userProposalQueries.js` | Fetches proposal data with nested listing | Add 'Location - slightly different address' to listing select query |
| `app/src/logic/processors/listing/extractListingCoordinates.js` | Coordinate extraction utility | Reference only - shows coordinate extraction pattern |

### Related Documentation
- `.claude/Documentation/miniCLAUDE.md` - Project patterns and conventions
- `app/src/islands/CLAUDE.md` - Component patterns (Modal Component Pattern)
- `app/src/islands/pages/CLAUDE.md` - Page component patterns

### Existing Patterns to Follow
- **MapModal Pattern**: The MapModal component accepts `listing`, `address`, and `onClose` props
- **Modal State Pattern**: Use `useState` for `showMapModal` boolean, render modal conditionally
- **Coordinate Priority**: Use 'Location - slightly different address' first, fallback to 'Location - Address'
- **JSONB Parsing**: Location fields may be strings requiring JSON.parse()

## Implementation Steps

### Step 1: Update Listing Query to Include Location Data
**Files:** `app/src/lib/proposals/userProposalQueries.js`
**Purpose:** Ensure the listing data includes the 'Location - slightly different address' field for map coordinates
**Details:**
- Locate the `fetchProposalsByIds` function (around line 183)
- Add `"Location - slightly different address"` to the listing select query
- This field contains `{ address: string, lat: number, lng: number }` in JSONB format

**Current Code (lines 183-199):**
```javascript
const { data: listings, error: listingError } = await supabase
  .from('listing')
  .select(`
    _id,
    "Name",
    "Description",
    "Location - Address",
    "Location - Borough",
    "Location - Hood",
    "Features - Photos",
    "Features - House Rules",
    "NEW Date Check-in Time",
    "NEW Date Check-out Time",
    "Host / Landlord",
    "House manual"
  `)
  .in('_id', listingIds);
```

**Updated Code:**
```javascript
const { data: listings, error: listingError } = await supabase
  .from('listing')
  .select(`
    _id,
    "Name",
    "Description",
    "Location - Address",
    "Location - slightly different address",
    "Location - Borough",
    "Location - Hood",
    "Features - Photos",
    "Features - House Rules",
    "NEW Date Check-in Time",
    "NEW Date Check-out Time",
    "Host / Landlord",
    "House manual"
  `)
  .in('_id', listingIds);
```

**Validation:**
- Run `bun run dev` and navigate to guest-proposals page
- Open browser dev tools, check Network tab for Supabase query
- Verify 'Location - slightly different address' field is present in listing data

### Step 2: Add MapModal Import to ProposalCard
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Import the MapModal component for use in the View Map button
**Details:**
- Add import statement after existing modal imports (line 24)

**Location:** After line 24 (after `import VirtualMeetingManager...`)
```javascript
import MapModal from '../../modals/MapModal.jsx';
```

**Validation:** No errors on page load, import resolves correctly

### Step 3: Add Map Modal State to ProposalCard
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Add state variable to control map modal visibility
**Details:**
- Add `useState` for `showMapModal` in the existing state declarations section (around line 600-612)
- Place it near other modal state declarations (`showHostProfileModal`, `showProposalDetailsModal`, `showVMModal`)

**Location:** After line 611 (after `const [vmInitialView, setVmInitialView] = useState('');`)
```javascript
// Map modal state
const [showMapModal, setShowMapModal] = useState(false);
```

**Validation:** Component renders without errors

### Step 4: Wire "View Map" Button onClick Handler
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Connect the existing View Map button to open the map modal
**Details:**
- Find the View Map button (around line 788-790)
- Add onClick handler to set `showMapModal` to true

**Current Code (lines 788-790):**
```jsx
<button className="btn-action btn-map">
  View Map
</button>
```

**Updated Code:**
```jsx
<button
  className="btn-action btn-map"
  onClick={() => setShowMapModal(true)}
>
  View Map
</button>
```

**Validation:** Click "View Map" button, verify state changes (can add temporary console.log)

### Step 5: Extract Location Address for MapModal
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Extract the appropriate location address to pass to MapModal
**Details:**
- Add code to extract location from listing data after the listing variable is defined (around line 538)
- Use privacy-first approach: prefer 'Location - slightly different address', fallback to 'Location - Address'
- Parse JSONB if needed (may come as string from Supabase)

**Location:** After line 538 (after `const listing = proposal.listing;`)

```javascript
// Extract location for map modal
// Priority: 'Location - slightly different address' (privacy) → 'Location - Address' (fallback)
const getListingAddress = () => {
  if (!listing) return null;

  // Try 'Location - slightly different address' first (privacy-adjusted)
  let locationData = listing['Location - slightly different address'];
  if (!locationData) {
    // Fallback to main address
    locationData = listing['Location - Address'];
  }

  if (!locationData) return null;

  // Parse if it's a JSON string
  if (typeof locationData === 'string') {
    try {
      locationData = JSON.parse(locationData);
    } catch (e) {
      console.warn('ProposalCard: Failed to parse location data:', e);
      return null;
    }
  }

  // Return the address string from the JSONB object
  return locationData?.address || null;
};

const mapAddress = getListingAddress();
```

**Validation:** Add `console.log('mapAddress:', mapAddress)` to verify address extraction

### Step 6: Render MapModal Component
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Add conditional rendering of MapModal when showMapModal is true
**Details:**
- Add MapModal render after the existing modals (VirtualMeetingManager is around line 1106-1114)
- Pass listing object, extracted address, and onClose handler

**Location:** After line 1114 (after the VirtualMeetingManager modal closing tag `)}`)

```jsx
{/* Map Modal */}
{showMapModal && (
  <MapModal
    listing={listing}
    address={mapAddress}
    onClose={() => setShowMapModal(false)}
  />
)}
```

**Validation:**
- Click "View Map" button
- Modal should appear with listing name, location info
- Close button and backdrop click should close modal
- "Open in Google Maps" link should work

## Edge Cases & Error Handling
- **No listing data**: If `proposal.listing` is null, the button will still render but modal will show "Address not available"
- **No coordinates**: MapModal handles missing location gracefully with fallback text
- **JSONB parsing errors**: Wrapped in try/catch, returns null on failure
- **Neither location field available**: MapModal shows "Address not available" message

## Testing Considerations
- Test with proposals that have listings with 'Location - slightly different address'
- Test with proposals that have listings with only 'Location - Address'
- Test with proposals that have listings with neither field
- Test modal close via:
  - Close button (X)
  - Backdrop click
  - "Close" button in footer
- Test "Open in Google Maps" link opens correct location

## Rollback Strategy
- Revert the 3 files modified:
  1. `userProposalQueries.js` - remove the added field from select
  2. `ProposalCard.jsx` - remove import, state, handler, and modal render

## Dependencies & Blockers
- None - MapModal component already exists and is functional
- Supabase query already includes other location fields, just adding one more

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JSONB parsing fails | Low | Low | Try/catch with fallback to "Address not available" |
| Missing location data | Medium | Low | MapModal handles missing data gracefully |
| Performance impact | Very Low | Very Low | Single additional field in existing query |

---

## Files Summary

### Files to Modify
1. **`app/src/lib/proposals/userProposalQueries.js`** (line ~187)
   - Add `"Location - slightly different address"` to listing select query

2. **`app/src/islands/pages/proposals/ProposalCard.jsx`** (multiple locations)
   - Add import for MapModal (line ~24)
   - Add `showMapModal` state (line ~612)
   - Add `getListingAddress` helper function (line ~539)
   - Add onClick to "View Map" button (line ~788)
   - Add MapModal render (line ~1115)

### Files to Reference (No Changes)
- `app/src/islands/modals/MapModal.jsx` - Existing component to use
- `app/src/logic/processors/listing/extractListingCoordinates.js` - Coordinate extraction pattern
- `app/src/islands/pages/SearchPage.jsx` - Reference for coordinate handling

---

**Plan Created:** 2025-12-12T16:15:30
**Estimated Implementation Time:** 15-20 minutes
**Complexity:** Low - straightforward wiring of existing components
