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
- `'Nightly Price'` - Per-night cost
- `'Total Price'` - Total reservation cost
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
- `_negotiationSummary` - AI-generated summary (if available)

### Listing Fields (from `_listing`)
- `'Listing Name'` - Property name
- `'Photos - Features'` - Array of photo URLs
- `'Address - Full'` - Street address
- `geo_point` - `{ lat, lng }` coordinates
- `'Qty Bedrooms'` - Number of bedrooms
- `'Qty Bathrooms'` - Number of bathrooms
- `'Qty Beds'` - Number of beds
- `'Qty Guests'` - Max guests
- `'Type of Space'` - "Entire Place", "Private Room", etc.

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
