# Integration Plan: Suggested Proposals Component

**Created:** 2026-01-07 14:30:00
**Status:** New
**Type:** BUILD - Feature Integration

## Summary

Integrate the standalone `suggested-proposals` component from GitHub into the Split Lease codebase as a shared island component. The component displays AI-suggested rental proposals in a popup interface with photo gallery, pricing, map, and action buttons.

## Source Repository

- **GitHub:** https://github.com/splitleasesharath/suggested-proposals.git
- **Language:** TypeScript (needs conversion to JavaScript)
- **Dependencies:** React 18 only (no external dependencies)

## Target Location

```
app/src/islands/shared/SuggestedProposals/
├── index.js                        # Barrel exports
├── CLAUDE.md                       # Component documentation
├── SuggestedProposalPopup.jsx      # Main popup component
├── SuggestedProposalPopup.css      # Popup styles
├── SuggestedProposalTrigger.jsx    # Floating trigger button
├── SuggestedProposalTrigger.css    # Trigger styles
├── useSuggestedProposals.js        # State management hook
├── suggestedProposalService.js     # API interactions
├── fieldMapper.js                  # Supabase ↔ Component field mapping
└── components/                     # Sub-components
    ├── ImageGallery.jsx
    ├── AmenityIcons.jsx
    ├── PriceDisplay.jsx
    ├── ActionButtons.jsx
    ├── MapSection.jsx
    └── WhyThisProposal.jsx
```

## Key Integration Challenges

### 1. Field Name Mapping

The external component uses camelCase, but Supabase uses 'space case':

| Component Field | Supabase Field |
|-----------------|----------------|
| `proposalNightlyPrice` | `'Nightly Price'` |
| `totalPriceForReservation` | `'Total Price'` |
| `startDate` | `'Move in range start'` |
| `endDate` | (calculated from start + duration) |
| `checkInDay` | `'Check In Day'` |
| `checkOutDay` | `'Check Out Day'` |
| `durationInMonths` | `'Reservation Span (Weeks)'` ÷ 4 |
| `listing.name` | `_listing['Listing Name']` |
| `listing.featuresPhotos` | `_listing['Photos - Features']` |
| `listing.location.address` | `_listing['Address - Full']` |
| `listing.location.coordinates` | `_listing['geo_point']` |
| `guest._id` | `proposal.Guest` |
| `status` | `proposal.Status` |

### 2. Status Filtering

External component filters: `status === 'suggested' && !deleted`

Split Lease equivalent statuses (from `proposalStatuses.js`):
- `'Proposal Submitted for guest by Split Lease - Awaiting Rental Application'`
- `'Proposal Submitted for guest by Split Lease - Pending Confirmation'`

Use existing helper: `isSuggestedProposal(statusKey)` from `proposalStatuses.js`

### 3. TypeScript → JavaScript Conversion

Remove all type annotations, interfaces, and generic types. Keep JSDoc comments for documentation.

## Implementation Steps

### Phase 1: Create Directory Structure and Base Files

1. Create `app/src/islands/shared/SuggestedProposals/` directory
2. Create `CLAUDE.md` with component documentation
3. Create `index.js` barrel export file

### Phase 2: Field Mapping Layer

Create `fieldMapper.js` to transform Supabase data to component format:

```javascript
/**
 * Transform Supabase proposal to component format
 * @param {Object} supabaseProposal - Raw proposal from Supabase
 * @param {Object} enrichedData - _listing, _guest, _host, etc.
 * @returns {Object} Component-compatible proposal
 */
export function mapProposalToComponent(supabaseProposal, enrichedData) {
  const listing = enrichedData._listing || {};
  const guest = enrichedData._guest || {};

  return {
    id: supabaseProposal._id,
    proposalNightlyPrice: supabaseProposal['Nightly Price'] || 0,
    totalPriceForReservation: supabaseProposal['Total Price'] || 0,
    startDate: new Date(supabaseProposal['Move in range start']),
    // ... full mapping
  };
}
```

### Phase 3: Service Layer

Create `suggestedProposalService.js`:

```javascript
import { supabase } from '../../../lib/supabase.js';
import { isSuggestedProposal } from '../../../logic/constants/proposalStatuses.js';
import { loadProposalDetails } from '../../../lib/proposalDataFetcher.js';
import { mapProposalToComponent } from './fieldMapper.js';

/**
 * Fetch suggested proposals for current user
 */
export async function fetchSuggestedProposals(userId) {
  // 1. Fetch user's proposals
  // 2. Filter to suggested status using isSuggestedProposal()
  // 3. Enrich with loadProposalDetails()
  // 4. Map to component format
}

/**
 * Mark proposal as "interested" (accept suggestion)
 */
export async function markInterested(proposalId) {
  // Update proposal status in Supabase
  // Optionally queue sync to Bubble
}

/**
 * Remove/dismiss suggestion
 */
export async function dismissSuggestion(proposalId) {
  // Soft delete or status change
}
```

### Phase 4: Convert Components (TypeScript → JavaScript)

Convert each component, removing types:

1. **SuggestedProposalPopup.jsx** - Main popup
2. **SuggestedProposalTrigger.jsx** - Floating button
3. **useSuggestedProposals.js** - State hook
4. **Sub-components** (ImageGallery, AmenityIcons, etc.)

### Phase 5: Styling Integration

1. Copy CSS files with `sp-` prefix (already namespaced)
2. Review for conflicts with existing CSS variables
3. Map external CSS variables to Split Lease variables where applicable:
   - `--sp-primary-purple` → existing purple variable
   - `--sp-font-primary` → 'Inter' (already used)

### Phase 6: Integration Points

The component should be usable on:
- **GuestProposalsPage** - Primary integration point
- **Dashboard** - Optional trigger for suggested proposals
- **Header** - Optional notification indicator

Example usage in `GuestProposalsPage.jsx`:

```jsx
import {
  SuggestedProposalPopup,
  SuggestedProposalTrigger,
  useSuggestedProposals
} from '../shared/SuggestedProposals';

function GuestProposalsPage() {
  const {
    state,
    isVisible,
    show,
    hide,
    handleInterested,
    handleRemove,
    goToNext,
    goToPrevious,
    currentProposal,
    proposalCounter,
    totalProposals
  } = useSuggestedProposals({
    userId: currentUser._id,
    onInterested: async (id) => {
      await markInterested(id);
      showToast({ title: 'Interest recorded!', type: 'success' });
    },
    onRemove: async (id) => {
      await dismissSuggestion(id);
    }
  });

  return (
    <>
      {/* Existing page content */}

      {/* Suggested Proposals Trigger */}
      {totalProposals > 0 && (
        <SuggestedProposalTrigger
          onClick={show}
          isActive={isVisible}
          proposalCount={totalProposals}
        />
      )}

      {/* Suggested Proposals Popup */}
      <SuggestedProposalPopup
        proposals={state.filteredProposals}
        currentIndex={proposalCounter}
        onInterested={handleInterested}
        onRemove={handleRemove}
        onNavigate={(dir) => dir === 'next' ? goToNext() : goToPrevious()}
        onClose={hide}
        isVisible={isVisible}
        config={{ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY }}
      />
    </>
  );
}
```

### Phase 7: Testing & Refinement

1. Test with mock data first
2. Connect to real Supabase data
3. Test action callbacks (interested, remove)
4. Verify keyboard navigation (arrows, Escape)
5. Test responsive behavior
6. Verify Toast notifications integrate properly

## Files to Create

| File | Purpose |
|------|---------|
| `SuggestedProposals/index.js` | Barrel exports |
| `SuggestedProposals/CLAUDE.md` | Documentation |
| `SuggestedProposals/fieldMapper.js` | Data transformation |
| `SuggestedProposals/suggestedProposalService.js` | API calls |
| `SuggestedProposals/useSuggestedProposals.js` | State hook |
| `SuggestedProposals/SuggestedProposalPopup.jsx` | Main popup |
| `SuggestedProposals/SuggestedProposalPopup.css` | Popup styles |
| `SuggestedProposals/SuggestedProposalTrigger.jsx` | Trigger button |
| `SuggestedProposals/SuggestedProposalTrigger.css` | Trigger styles |
| `SuggestedProposals/components/ImageGallery.jsx` | Photo carousel |
| `SuggestedProposals/components/AmenityIcons.jsx` | Bed/bath icons |
| `SuggestedProposals/components/PriceDisplay.jsx` | Pricing display |
| `SuggestedProposals/components/ActionButtons.jsx` | Interested/Remove |
| `SuggestedProposals/components/MapSection.jsx` | Google Map |
| `SuggestedProposals/components/WhyThisProposal.jsx` | AI summary |

## Files to Modify

| File | Change |
|------|--------|
| `app/src/islands/pages/GuestProposalsPage.jsx` | Add trigger and popup |
| `app/src/islands/pages/useGuestProposalsPageLogic.js` | Integrate hook |

## Dependencies

- Existing: `app/src/lib/supabase.js`
- Existing: `app/src/lib/proposalDataFetcher.js`
- Existing: `app/src/logic/constants/proposalStatuses.js`
- Existing: `app/src/islands/shared/Toast.jsx`
- Optional: Google Maps API key for map display

## Environment Variables

```env
VITE_GOOGLE_MAPS_API_KEY=<api-key>  # Optional, for map display
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Field mapping errors | Create comprehensive unit tests for fieldMapper.js |
| Status filtering mismatches | Use existing `isSuggestedProposal()` helper |
| CSS conflicts | Component uses `sp-` prefix (already namespaced) |
| No suggested proposals exist | Component gracefully hides when count is 0 |

## Success Criteria

1. Trigger button appears when user has suggested proposals
2. Popup displays proposal details correctly (photos, price, amenities, map)
3. Navigation between proposals works (arrows, keyboard)
4. "Interested" action updates proposal status
5. "Remove" action dismisses suggestion
6. Toast notifications show on actions
7. ESC key closes popup
8. Mobile responsive layout works

## References

- Source repo: https://github.com/splitleasesharath/suggested-proposals
- VirtualMeetingManager (similar pattern): [VirtualMeetingManager/](../../../app/src/islands/shared/VirtualMeetingManager/)
- Proposal data fetcher: [proposalDataFetcher.js](../../../app/src/lib/proposalDataFetcher.js)
- Proposal statuses: [proposalStatuses.js](../../../app/src/logic/constants/proposalStatuses.js)
- Toast system: [Toast.jsx](../../../app/src/islands/shared/Toast.jsx)
