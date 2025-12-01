# Shared Components Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Reusable UI components shared across pages
[PATTERN]: Presentational components with props-based API
[STYLING]: CSS Modules and component-level CSS

---

## ### SUB-MODULES ###

- **[AiSignupMarketReport/](./AiSignupMarketReport/CLAUDE.md)**: AI-powered market research report
- **[CreateDuplicateListingModal/](./CreateDuplicateListingModal/CLAUDE.md)**: Listing duplication modal
- **[CreateProposalFlowV2Components/](./CreateProposalFlowV2Components/CLAUDE.md)**: Proposal wizard sections
- **[HostScheduleSelector/](./HostScheduleSelector/CLAUDE.md)**: Host-side schedule picker
- **[ImportListingModal/](./ImportListingModal/CLAUDE.md)**: Airbnb/VRBO import modal
- **[ListingCard/](./ListingCard/CLAUDE.md)**: Listing preview card variants
- **[LoggedInAvatar/](./LoggedInAvatar/CLAUDE.md)**: User avatar with account menu
- **[SubmitListingPhotos/](./SubmitListingPhotos/CLAUDE.md)**: Photo upload/management

---

## ### KEY_COMPONENTS ###

### Header.jsx
[INTENT]: Site header with navigation and auth-aware user menu
[IMPORTS]: LoggedInAvatar, SignUpLoginModal, lib/auth
[BEHAVIOR]: Shows login button when logged out, avatar menu when logged in

### Footer.jsx
[INTENT]: Site footer with links and copyright
[PROPS]: None (static content)

### GoogleMap.jsx
[INTENT]: Google Maps integration for listing locations
[IMPORTS]: @react-google-maps/api
[REQUIRES]: VITE_GOOGLE_MAPS_API_KEY

### ListingScheduleSelector.jsx
[INTENT]: Day/pricing selector for listing pages
[IMPORTS]: useScheduleSelector, DayButton, PriceDisplay
[BUSINESS_LOGIC]: Uses lib/scheduleSelector/ for calculations

### CreateProposalFlowV2.jsx
[INTENT]: Multi-step proposal creation wizard
[SECTIONS]: Review → User Details → Move-in Date → Days Selection
[IMPORTS]: CreateProposalFlowV2Components/

### SignUpLoginModal.jsx
[INTENT]: Authentication modal for login/signup
[API_DEPENDENCY]: supabase/functions/bubble-auth-proxy/

### Button.jsx
[INTENT]: Reusable button with variants
[VARIANTS]: primary, secondary, outline, ghost

### Toast.jsx
[INTENT]: Notification toast with auto-dismiss
[PROPS]: message, type ('success'|'error'|'info'), duration

---

## ### COMPONENT_PATTERN ###

```jsx
// Hollow Component Pattern (delegates to hook)
export function ListingScheduleSelector({ listing, onDaysChange }) {
  const {
    selectedDays,
    handleDayClick,
    pricing,
    validation
  } = useScheduleSelector({ listing })

  return (
    <div className="schedule-selector">
      {/* Pure rendering, no business logic */}
    </div>
  )
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Use Hollow Component Pattern - logic in hooks, rendering in components
[RULE_2]: All API calls go through lib/ or Edge Functions
[RULE_3]: Use CSS variables from styles/variables.css
[RULE_4]: Components receive callbacks via props (onSubmit, onChange, onClose)

---

## ### DEPENDENCIES ###

[LOCAL]: lib/auth, lib/supabase, lib/scheduleSelector/
[EXTERNAL]: @react-google-maps/api, @supabase/supabase-js
[LOGIC]: logic/calculators/, logic/rules/, logic/processors/

---

**SUBDIRECTORY_COUNT**: 8
**FILE_COUNT**: 30+
