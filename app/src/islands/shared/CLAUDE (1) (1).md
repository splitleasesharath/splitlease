# Shared Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Reusable UI components shared across pages
[PATTERN]: Presentational components with props-based API
[STYLING]: CSS Modules and component-level CSS

---

## ### SUBDIRECTORIES ###

### AiSignupMarketReport/
[INTENT]: AI-powered market research report component
[FILES]: 6 files including component, examples, tests

### CreateDuplicateListingModal/
[INTENT]: Modal for duplicating existing listings
[FILES]: 3 files

### CreateProposalFlowV2Components/
[INTENT]: Section components for proposal creation wizard
[FILES]: 4 section components

### ImportListingModal/
[INTENT]: Modal for importing listings from Airbnb/VRBO
[FILES]: 1 component

### ListingCard/
[INTENT]: Listing preview card variants
[FILES]: 2 files (map variant + CSS)

### LoggedInAvatar/
[INTENT]: User avatar dropdown with account menu
[FILES]: 5 files including hook and styles

### LoggedInHeaderAvatar2/
[INTENT]: Alternate avatar component (check for duplication)

### SubmitListingPhotos/
[INTENT]: Photo upload and management component
[FILES]: 6 files including delete modal

---

## ### FILE_INVENTORY ###

### Button.jsx
[INTENT]: Reusable button with variants (primary, secondary, outline, ghost)
[EXPORTS]: Button

### ContactHostMessaging.jsx
[INTENT]: Host messaging interface
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/messaging

### CreateProposalFlowV2.jsx
[INTENT]: Multi-step proposal creation wizard
[IMPORTS]: CreateProposalFlowV2Components/, ListingScheduleSelector

### DayButton.jsx
[INTENT]: Day selection button for schedule picker
[DEPENDENCIES]: Styled for selected/disabled/available states

### ErrorOverlay.jsx
[INTENT]: Error display overlay with retry option

### ExternalReviews.jsx
[INTENT]: Display Airbnb/VRBO reviews

### Footer.jsx
[INTENT]: Site footer with links and copyright

### GoogleMap.jsx
[INTENT]: Google Maps integration using @react-google-maps/api
[DEPENDENCIES]: VITE_GOOGLE_MAPS_API_KEY

### Header.jsx
[INTENT]: Site header with navigation and auth-aware user menu
[IMPORTS]: LoggedInAvatar, SignUpLoginModal, lib/auth

### InformationalText.jsx
[INTENT]: CMS content display from Supabase informational_texts table

### ListingCard.jsx
[INTENT]: Listing preview card for search results

### ListingScheduleSelector.jsx
[INTENT]: Day/pricing selector for listing pages
[IMPORTS]: useScheduleSelector, DayButton, PriceDisplay

### ListingScheduleSelectorV2.jsx
[INTENT]: Updated schedule selector with improved UX

### PriceDisplay.jsx
[INTENT]: Price formatting and display with discounts

### SearchScheduleSelector.jsx
[INTENT]: Simplified schedule selector for search filters

### SignUpLoginModal.jsx
[INTENT]: Authentication modal for login/signup
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/

### Toast.jsx
[INTENT]: Notification toast with auto-dismiss

### useScheduleSelector.js
[INTENT]: Hook for schedule selector state management

### useScheduleSelectorLogicCore.js
[INTENT]: Core scheduling logic shared between selector variants

---

**SUBDIRECTORY_COUNT**: 8
**FILE_COUNT**: 30+
