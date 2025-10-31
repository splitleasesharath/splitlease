# Listing Images and Proposal Menu

**ADW ID:** fdaa1bc9
**Date:** 2025-10-30
**Specification:** specs/issue-9-adw-fdaa1bc9-sdlc_planner-listing-images-proposal-menu.md

## Overview

Added two core components to the Split Lease view page: a responsive 2x2 image grid for displaying property listing photos (ListingImageGrid) and an interactive booking panel (ProposalMenu) for configuring rental proposals with weekly schedules, move-in dates, and reservation spans. These components transform the view split lease page into a fully interactive listing detail page following the Islands Architecture pattern.

## What Was Built

- **ListingImageGrid component**: Displays 4 property images in a responsive 2x2 grid with error handling, placeholders, and hover effects
- **ProposalMenu component**: Interactive booking panel with price display, date selection, weekly schedule selector, reservation span dropdown, and real-time pricing calculations
- **View Split Lease page**: New HTML page (`/view-split-lease/`) integrating both components side-by-side with responsive layout
- **E2E test specification**: Comprehensive Playwright test for validating all interactive elements
- **Component exports and build configuration**: Updated component registry and UMD build to include new components

## Technical Implementation

### Files Modified

- `app/split-lease/components/src/ListingImageGrid/ListingImageGrid.tsx`: 2x2 image grid component with error states, loading states, and accessibility features
- `app/split-lease/components/src/ListingImageGrid/ListingImageGrid.styles.ts`: Styled-components for grid layout, hover effects, and responsive design
- `app/split-lease/components/src/ListingImageGrid/types.ts`: TypeScript interfaces for image data (url, alt, thumbnail)
- `app/split-lease/components/src/ListingImageGrid/index.ts`: Component export file
- `app/split-lease/components/src/ProposalMenu/ProposalMenu.tsx`: Interactive booking panel with 7 sections (price, move-in, schedule, span, pricing summary, CTA)
- `app/split-lease/components/src/ProposalMenu/ProposalMenu.styles.ts`: Styled-components for form elements, day buttons, pricing display, and purple gradient styling
- `app/split-lease/components/src/ProposalMenu/types.ts`: TypeScript interfaces for pricing, host preferences, proposal state
- `app/split-lease/components/src/ProposalMenu/index.ts`: Component export file
- `app/split-lease/components/src/index.ts`: Added exports for both new components
- `app/split-lease/pages/view-split-lease/index.html`: New page with React island mount points and CDN includes
- `app/split-lease/pages/view-split-lease/css/styles.css`: Page-specific styles for side-by-side layout and responsive breakpoints
- `app/split-lease/pages/view-split-lease/js/mount-islands.js`: JavaScript to mount both React islands with test data
- `.claude/commands/e2e/test_view_split_lease_page.md`: E2E test specification with 9 test steps
- `app/split-lease/components/package-lock.json`: Updated dependencies

### Key Changes

- **ListingImageGrid**: Implements exactly 4 image slots with graceful fallbacks for missing/failed images. Uses CSS Grid for 2x2 layout that collapses to single column on mobile. Includes loading states, error states, and accessibility (ARIA labels, keyboard navigation).

- **ProposalMenu**: Complex interactive component with 7 day toggle buttons for weekly schedule selection, move-in date input with "strict" checkbox, reservation span dropdown (6-26 weeks + custom), real-time pricing calculations (4-week rent and total), and conditional warning messages when selections fall outside host preferences.

- **Weekly Schedule Logic**: Calculates nights per week (selected days - 1), determines check-in/check-out days, displays selection status text, and validates against host's ideal day count.

- **Pricing Calculations**:
  - Nights per week = selected days - 1
  - 4-week rent = nights per week × 4 × per-night rate
  - Reservation total = (4-week rent / 4) × reservation span weeks

- **Responsive Design**: Side-by-side layout on desktop (≥1024px), stacked layout on tablet/mobile. Touch-friendly 44px minimum targets for mobile usability.

## How to Use

### Viewing the Page

1. Open `app/split-lease/pages/view-split-lease/index.html` in a browser
2. The left side displays 4 property images in a grid
3. The right side shows the booking panel with pricing and configuration options

### Interacting with the Proposal Menu

1. **Set Move-In Date**: Enter date in MM/DD/YYYY format, optionally check "Strict" for non-negotiable move-in
2. **Select Weekly Schedule**: Click days of the week (S M T W T F S) to toggle selection
   - Status text updates to show "X days, Y nights Selected"
   - Check-in and check-out days are automatically determined
   - Warning appears if selection exceeds host's preference
3. **Choose Reservation Span**: Select from dropdown (6-26 weeks) or choose "Other" for custom input
   - Host's preferred range is displayed below dropdown
   - Warning appears if selection is outside host's range
4. **View Pricing**: Pricing summary automatically calculates and displays:
   - 4-Week Rent based on selected nights per week
   - Reservation Estimated Total based on span length
5. **Submit**: Click "Update Split Lease Proposal" button to proceed

### Integration as React Islands

```javascript
// Mount ListingImageGrid
const root1 = ReactDOM.createRoot(document.getElementById('listing-images'));
root1.render(
  window.SplitLeaseComponents.ListingImageGrid({
    images: [
      { url: 'image1.jpg', alt: 'Living room' },
      { url: 'image2.jpg', alt: 'Bedroom' },
      { url: 'image3.jpg', alt: 'Kitchen' },
      { url: 'image4.jpg', alt: 'Bathroom' },
    ]
  })
);

// Mount ProposalMenu
const root2 = ReactDOM.createRoot(document.getElementById('proposal-menu'));
root2.render(
  window.SplitLeaseComponents.ProposalMenu({
    pricing: { perNight: 434.07 },
    hostPreferences: { minWeeks: 8, maxWeeks: 26, idealDays: 4 },
    onProposalChange: (data) => console.log('Proposal updated:', data),
  })
);
```

## Configuration

### ListingImageGrid Props

- `images`: Array of image objects with `url`, `alt`, and optional `thumbnail`
- `onImageClick`: Optional callback when an image is clicked (for lightbox/modal)
- `className`: Optional CSS class for styling customization

### ProposalMenu Props

- `pricing`: Object with `perNight` rate (number)
- `hostPreferences`: Object with `minWeeks`, `maxWeeks`, `idealDays` (all numbers)
- `onProposalChange`: Callback fired when any input changes, receives full proposal state
- `initialMoveInDate`: Optional starting value for move-in date (string)
- `initialSelectedDays`: Optional array of pre-selected day indices (number[])
- `initialReservationSpan`: Optional starting reservation span (number, default: 13)
- `className`: Optional CSS class for styling customization

## Testing

### Component Build Validation

```bash
cd app/split-lease/components && npm run typecheck  # Verify TypeScript
cd app/split-lease/components && npm run build      # Generate UMD bundle
cd app/test-harness && npm test                      # Run all tests
```

### E2E Testing

Run the E2E test specification defined in `.claude/commands/e2e/test_view_split_lease_page.md`:

1. Navigates to view-split-lease page
2. Verifies ListingImageGrid renders with 4 images
3. Verifies ProposalMenu renders with all sections
4. Tests weekly schedule interaction (clicking days, verifying selection state)
5. Tests reservation span dropdown (selecting options, verifying updates)
6. Verifies pricing calculations update correctly
7. Captures screenshots at each step

All validation commands passed with zero regressions.

## Notes

### Design Patterns

- **Islands Architecture**: Components are built as standalone UMD bundles and mounted independently on the page
- **Styled-components**: All styling uses styled-components with purple gradient theme (#7E3AF2, #9F7AEA)
- **TypeScript**: Full type safety with comprehensive interfaces for props and state
- **Accessibility**: ARIA labels, keyboard navigation, and proper semantic HTML

### Edge Cases Handled

- Missing images show placeholder emoji (📷)
- Failed image loads show "Image unavailable" message
- Exactly 4 slots always displayed (extras are placeholders if < 4 images provided)
- Custom reservation span input validates numeric input
- Pricing calculations handle edge cases (0 days selected shows no pricing)
- Warning messages conditionally render based on host preferences

### Weekly Schedule Calculation Logic

- **Nights per week**: Selected days count - 1 (e.g., 4 days selected = 3 nights)
- **Check-in day**: First selected day in the week
- **Check-out day**: Last selected day in the week
- Days are indexed 0-6 (Sunday-Saturday)

### Future Considerations

- Lightbox/modal for full-screen image viewing (currently images are clickable but no modal implemented)
- Calendar picker widget for move-in date (currently text input only)
- Form validation and error states for invalid dates
- Backend API integration for real pricing and availability
- Form submission handler for proposal creation
- Animation/transition effects when pricing updates
