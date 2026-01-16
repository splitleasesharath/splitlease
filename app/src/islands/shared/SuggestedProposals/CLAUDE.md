# SuggestedProposals Component

A shared island component that displays AI-suggested rental proposals to guests in a floating popup interface.

## Overview

This component shows proposals that Split Lease agents have created on behalf of guests. It provides a card-based UI with photo gallery, pricing, amenities, location map, and AI-generated reasoning for why the proposal matches the guest's needs.

## Architecture

```
SuggestedProposals/
├── index.js                        # Barrel exports
├── CLAUDE.md                       # This file
├── useSuggestedProposals.js        # State management hook
├── suggestedProposalService.js     # Supabase API calls
├── SuggestedProposalTrigger.jsx    # Floating lightbulb button
├── SuggestedProposalTrigger.css
├── SuggestedProposalPopup.jsx      # Main popup container
├── SuggestedProposalPopup.css
└── components/                     # Sub-components
    ├── ImageGallery.jsx            # Photo carousel with thumbnails
    ├── AmenityIcons.jsx            # Beds, baths, guests, space type
    ├── PriceDisplay.jsx            # Nightly and total pricing
    ├── ActionButtons.jsx           # Interested / Remove buttons
    ├── MapSection.jsx              # Google Maps static image
    └── WhyThisProposal.jsx         # AI summary display
```

## Data Model

This component uses **native Supabase field names** (no mapping layer). Key fields:

### Proposal Fields (from `proposal` table)
- `_id` - Unique identifier
- `Status` - Proposal status string
- `'proposal nightly price'` - Per-night cost (numeric)
- `'Total Price for Reservation (guest)'` - Total reservation cost (numeric)
- `'Move in range start'` - Start date (ISO string)
- `'Reservation Span (Weeks)'` - Duration in weeks
- `'Check In Day'` - Day name (e.g., "Monday")
- `'Check Out Day'` - Day name
- `Guest` - Guest user ID
- `Listing` - Listing ID
- `Deleted` - Soft delete flag

### Enriched Fields (from `loadProposalDetails`)
- `_listing` - Full listing object
- `_guest` - Guest user object
- `_host` - Host user object
- `_negotiationSummaries` - Array of AI-generated summaries (if available)

### Listing Fields (from `_listing`)
- `'Name'` - Property name
- `'Features - Photos'` - Array of photo URLs (may contain IDs that need resolution)
- `'Location - Address'` - JSONB object `{ address: string, lat: number, lng: number }` - **Note**: Contains embedded coordinates
- `'Location - Coordinates'` - `{ lat, lng }` coordinates (fallback if not in Location - Address)
- `'Location - Borough'` - Borough name (e.g., "Manhattan")
- `'Location - Hood'` - Neighborhood name (e.g., "Financial District")
- `'Features - Qty Bedrooms'` - Number of bedrooms (integer)
- `'Features - Qty Bathrooms'` - Number of bathrooms (numeric)
- `'Features - Qty Beds'` - Number of beds (integer)
- `'Features - Qty Guests'` - Max guests (integer)
- `'Features - Type of Space'` - **FK ID** to `reference_table.zat_features_listingtype` - Must be resolved to display label

### Data Transformation Notes

**Location - Address**: May be stored as stringified JSON. Always parse before accessing:
```javascript
const rawAddressData = listing['Location - Address'];
const addressData = typeof rawAddressData === 'string'
  ? JSON.parse(rawAddressData)
  : rawAddressData;
const address = addressData?.address || '';
const geoPoint = { lat: addressData?.lat, lng: addressData?.lng };
```

**Features - Type of Space**: Contains Bubble-format FK IDs like `1569530331984x152755544104023800`.
Use `SPACE_TYPE_ID_TO_LABEL` mapping in AmenityIcons.jsx to resolve to human-readable labels.

## Status Filtering

Suggested proposals are identified using `isSuggestedProposal()` from `proposalStatuses.js`:
- `'Proposal Submitted for guest by Split Lease - Awaiting Rental Application'`
- `'Proposal Submitted for guest by Split Lease - Pending Confirmation'`

## Usage

```jsx
import {
  SuggestedProposalPopup,
  SuggestedProposalTrigger,
  useSuggestedProposals
} from '../shared/SuggestedProposals';

function MyPage({ currentUser }) {
  const {
    proposals,
    currentProposal,
    currentIndex,
    totalCount,
    isVisible,
    show,
    hide,
    goToNext,
    goToPrevious,
    handleInterested,
    handleRemove,
    isProcessing
  } = useSuggestedProposals({
    userId: currentUser._id,
    onInterested: async (proposal) => {
      // Called after successful interest action
      showToast({ title: 'Interest recorded!', type: 'success' });
    },
    onRemove: async (proposal) => {
      // Called after successful removal
    }
  });

  return (
    <>
      {/* Page content */}

      {totalCount > 0 && (
        <SuggestedProposalTrigger
          onClick={show}
          isActive={isVisible}
          proposalCount={totalCount}
        />
      )}

      <SuggestedProposalPopup
        proposal={currentProposal}
        currentIndex={currentIndex}
        totalCount={totalCount}
        onInterested={handleInterested}
        onRemove={handleRemove}
        onNext={goToNext}
        onPrevious={goToPrevious}
        onClose={hide}
        isVisible={isVisible}
        isProcessing={isProcessing}
      />
    </>
  );
}
```

## Keyboard Navigation

- **Arrow Left/Right**: Navigate between proposals
- **Escape**: Close popup

## CSS Variables

All styles use `sp-` prefix to avoid conflicts:
- `--sp-primary-purple`: #250856
- `--sp-primary-contrast`: #FFFFFF
- `--sp-text-dark`: #424242
- `--sp-border-divider`: #DFDFF6
- `--sp-radius-card`: 10px
- `--sp-radius-button`: 20px

## Dependencies

- `app/src/lib/supabase.js` - Supabase client
- `app/src/lib/proposalDataFetcher.js` - `loadProposalDetails()`
- `app/src/logic/constants/proposalStatuses.js` - `isSuggestedProposal()`
- `app/src/islands/shared/Toast.jsx` - Toast notifications (optional)

## Environment Variables

```env
VITE_GOOGLE_MAPS_API_KEY=<key>  # Optional, for map display
```
