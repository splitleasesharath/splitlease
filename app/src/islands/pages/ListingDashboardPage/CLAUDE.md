# Listing Dashboard Page

**GENERATED**: 2025-11-28
**SOURCE**: https://github.com/splitleasesharath/listing-dashboard-page.git

---

## ### PURPOSE ###

[INTENT]: Host-facing dashboard for managing individual listings
[FEATURES]: View proposals, schedule virtual meetings, edit listing details, manage leases
[PATTERN]: Hollow Component Pattern - UI delegated to components, logic in hook

---

## ### FILE_STRUCTURE ###

```
ListingDashboardPage/
├── ListingDashboardPage.jsx    # Main page component
├── useListingDashboardPageLogic.js  # Business logic hook
├── index.js                    # Barrel export
├── CLAUDE.md                   # This file
├── components/
│   ├── index.js                # Barrel export for components
│   ├── NavigationHeader.jsx    # Tab navigation with badges
│   ├── ActionCard.jsx          # Reusable action card
│   ├── ActionCardGrid.jsx      # 6-card quick actions grid
│   ├── AlertBanner.jsx         # Dismissible info banner
│   ├── PropertyInfoSection.jsx # Property details form
│   ├── DetailsSection.jsx      # Features & safety section
│   └── SecondaryActions.jsx    # Copy link & AI buttons
├── data/
│   └── mockListing.ts          # Mock data for development
└── types/
    └── listing.types.ts        # TypeScript interfaces
```

---

## ### COMPONENTS ###

### ListingDashboardPage (Main Container)
[PURPOSE]: Orchestrates all sections, renders loading/error states
[LOGIC]: Delegated to `useListingDashboardPageLogic` hook
[CHILDREN]: NavigationHeader, AlertBanner, ActionCardGrid, SecondaryActions, PropertyInfoSection, DetailsSection

### NavigationHeader
[PURPOSE]: Tab navigation between views
[TABS]: Preview, Manage, Proposals, Virtual Meetings, Leases
[FEATURES]: Badge counts, back button, active tab styling

### ActionCardGrid
[PURPOSE]: Quick action cards for common tasks
[CARDS]: Preview, Copy Link, Proposals, Meetings, Manage, Leases
[LAYOUT]: Responsive grid (1/2/3 columns)

### AlertBanner
[PURPOSE]: Dismissible info banner for co-host promotion
[STATE]: Expandable, dismissible

### PropertyInfoSection
[PURPOSE]: Display and edit property description
[FIELDS]: Description textarea, address, status, active since date
[ACTIONS]: Import reviews, show reviews

### DetailsSection
[PURPOSE]: Display property features and safety info
[SECTIONS]: Features grid, safety features, cancellation policy
[CTA]: Complete House Manual button

### SecondaryActions
[PURPOSE]: Utility actions bar
[ACTIONS]: Copy listing link, AI Import Assistant

---

## ### DATA_TYPES ###

### Listing (Main Entity)
```typescript
interface Listing {
  id: string;
  location: Location;
  features: Features;
  rentalType: RentalType;
  preferredGender: PreferredGender;
  isOnline: boolean;
  activeSince: Date;
  monthlyHostRate: number;
  // ... see types/listing.types.ts for full interface
}
```

### ListingCounts (Badge Data)
```typescript
interface ListingCounts {
  proposals: number;
  virtualMeetings: number;
  leases: number;
}
```

### TabType (Navigation)
```typescript
type TabType = 'preview' | 'manage' | 'proposals' | 'virtual-meetings' | 'leases';
```

---

## ### STYLING ###

[FILE]: src/styles/components/listing-dashboard.css
[APPROACH]: BEM naming convention with CSS variables
[PREFIX]: `.listing-dashboard-*`
[RESPONSIVE]: Mobile-first with 768px and 1024px breakpoints

### CSS Variables
```css
--ld-primary-contrast: #f1ffff
--ld-success: #31135d
--ld-background: #f7f8f9
--ld-text-primary: #1c274c
--ld-text-secondary: #6b7280
--ld-accent-purple: #6b4fbb
```

---

## ### ENTRY_POINT ###

[HTML]: public/listing-dashboard.html
[JSX]: src/listing-dashboard.jsx
[URL]: /listing-dashboard or /listing-dashboard?id=LISTING_ID
[VITE_CONFIG]: Added to build inputs and dev server routing

---

## ### TODO_FOR_PRODUCTION ###

1. Replace mock data with Supabase Edge Function calls
2. Implement actual navigation for tab clicks
3. Connect to authentication system
4. Add form validation and save functionality
5. Implement AI Import Assistant feature
6. Add listing ID validation and error handling

---

## ### USAGE ###

```jsx
// Access via URL
/listing-dashboard?id=LISTING_ID

// Or import directly
import ListingDashboardPage from './islands/pages/ListingDashboardPage';
```

---

**DOCUMENT_VERSION**: 1.0
**STATUS**: Development (using mock data)
