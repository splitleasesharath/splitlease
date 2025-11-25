# Guest Proposals Page Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate the guest-proposals page from the source implementation at `c:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\pages\guest-proposals` to the SL18 codebase. The migration involves a complete purge of existing code followed by a systematic rebuild using the more advanced source architecture.

---

## Comparative Analysis

### Source Implementation (External - To Be Migrated IN)
| Metric | Value |
|--------|-------|
| Components | 19 React components |
| Modals | 8 specialized modals |
| Workflow Modules | 4 (cancel, counteroffer, VM, navigation) |
| CSS Files | 8 dedicated stylesheets |
| Data Transformers | Full pipeline with lookup maps |
| State Pattern | Component-level (no Redux/Context) |
| Architecture | Clean separation: components/lib/workflows |

### Current SL18 Implementation (To Be Purged)
| Metric | Value |
|--------|-------|
| Components | 4 proposal components |
| Modals | 6 modals |
| Logic Files | Mixed inline + Logic Core |
| CSS Files | Tailwind + 1 CSS file |
| Data Fetching | proposalDataFetcher.js |
| State Pattern | Monolithic page component |
| Architecture | Islands pattern with some Logic Core |

### Key Differences

| Aspect | Source | Current SL18 |
|--------|--------|--------------|
| **Entry Component** | `ProposalsIsland.jsx` | `GuestProposalsPage.jsx` |
| **Data Flow** | User ID from URL → Batch fetch all | User ID → Sequential fetch |
| **Status Config** | Dedicated constants files (15+ statuses) | Inline status strings |
| **Stage Tracking** | 6-stage pipeline with icons | 6-stage but less configurable |
| **VM Workflow** | 5-state machine in dedicated module | Inline in VirtualMeetingModal |
| **Cancel Workflow** | 7-variation decision tree module | Inline cancelProposalWorkflow |
| **Navigation** | 15+ dedicated functions | Inline navigation |
| **Styling** | Dedicated CSS files (BEM) | Tailwind inline classes |
| **House Rules** | Dedicated queries module | Inline fetching |
| **Transformers** | Full data transformation pipeline | Minimal processing |

---

## Phase 1: Complete Purge (FIRST PRIORITY)

### Objective
Remove ALL existing guest-proposals related code to ensure clean slate migration with no residual conflicts.

#### 7. Styles (Partial - proposal-specific only)
```
REVIEW: app/src/styles/create-proposal-flow-v2.css (check if used elsewhere)
```

### Files to Modify (Remove References)

#### 1. Vite Config
```
MODIFY: app/vite.config.js
- Remove guest-proposals entry from rollupOptions.input
```

#### 2. Index Files (if they export proposal modules)
```
REVIEW: app/src/logic/processors/index.js
REVIEW: app/src/logic/workflows/index.js
REVIEW: app/src/logic/rules/index.js
```

#### 3. Routing Files
```
REVIEW: app/public/_redirects (remove guest-proposals routes)

## Phase 2: Foundation Setup

### Objective
Create the directory structure and foundational files from source implementation.

### New Directory Structure
```
app/src/
├── islands/
│   ├── pages/
│   │   └── ProposalsIsland.jsx          # Main page component
│   └── shared/
│       └── (existing Header.jsx, Footer.jsx)
├── components/
│   └── proposals/                        # NEW DIRECTORY
│       ├── ProposalCard.jsx
│       ├── ProposalSelector.jsx
│       ├── VirtualMeetingsSection.jsx
│       ├── FloatingProposalSummary.jsx
│       ├── LoadingState.jsx
│       ├── ErrorState.jsx
│       ├── EmptyState.jsx
│       ├── RequestVirtualMeetingModal.jsx
│       ├── RespondVirtualMeetingModal.jsx
│       ├── CompareTermsModal.jsx
│       ├── CancelProposalModal.jsx
│       ├── MapsModal.jsx
│       ├── HostProfileModal.jsx
│       ├── CounterOfferBanner.jsx
│       ├── ModifyProposalModal.jsx
│       ├── ConfirmModificationModal.jsx
│       └── CalendarWidget.jsx
├── lib/
│   ├── supabase/                         # NEW SUBDIRECTORY
│   │   ├── userProposalQueries.js
│   │   ├── dataTransformers.js
│   │   ├── virtualMeetingQueries.js
│   │   └── houseRulesQueries.js
│   ├── utils/
│   │   └── urlParser.js                  # NEW
│   ├── constants/
│   │   ├── proposalStatuses.js           # NEW
│   │   └── proposalStages.js             # NEW
│   └── workflows/
│       ├── cancelProposal.js             # NEW
│       ├── counterofferActions.js        # NEW
│       ├── navigation.js                 # NEW
│       └── virtualMeetings.js            # NEW
└── styles/
    ├── modals.css                        # NEW
    ├── proposal-card-redesign.css        # NEW
    ├── floating-summary.css              # NEW
    ├── virtual-meetings.css              # NEW
    ├── request-virtual-meeting.css       # NEW
    └── calendar-widget.css               # NEW
```

---

## Phase 3: Component Migration

### Migration Order (Dependency-based)

#### Tier 1: Utilities & Constants (No dependencies)
1. `lib/constants/proposalStatuses.js`
2. `lib/constants/proposalStages.js`
3. `lib/utils/urlParser.js`

#### Tier 2: Data Layer (Depends on Tier 1)
4. `lib/supabase/dataTransformers.js`
5. `lib/supabase/userProposalQueries.js`
6. `lib/supabase/virtualMeetingQueries.js`
7. `lib/supabase/houseRulesQueries.js`

#### Tier 3: Workflows (Depends on Tier 1-2)
8. `lib/workflows/navigation.js`
9. `lib/workflows/cancelProposal.js`
10. `lib/workflows/counterofferActions.js`
11. `lib/workflows/virtualMeetings.js`

#### Tier 4: Atomic Components (No component dependencies)
12. `components/proposals/LoadingState.jsx`
13. `components/proposals/ErrorState.jsx`
14. `components/proposals/EmptyState.jsx`
15. `components/proposals/CalendarWidget.jsx`
16. `components/proposals/CounterOfferBanner.jsx`

#### Tier 5: Modal Components (Depends on Tier 4)
17. `components/proposals/CancelProposalModal.jsx`
18. `components/proposals/MapsModal.jsx`
19. `components/proposals/HostProfileModal.jsx`
20. `components/proposals/CompareTermsModal.jsx`
21. `components/proposals/RequestVirtualMeetingModal.jsx`
22. `components/proposals/RespondVirtualMeetingModal.jsx`
23. `components/proposals/ModifyProposalModal.jsx`
24. `components/proposals/ConfirmModificationModal.jsx`

#### Tier 6: Main Components (Depends on all above)
25. `components/proposals/ProposalSelector.jsx`
26. `components/proposals/FloatingProposalSummary.jsx`
27. `components/proposals/VirtualMeetingsSection.jsx`
28. `components/proposals/ProposalCard.jsx`

#### Tier 7: Page Component (Depends on all above)
29. `islands/pages/ProposalsIsland.jsx`

#### Tier 8: Entry Points
30. `src/guest-proposals.jsx` (entry point)
31. `public/guest-proposals.html` (HTML shell)

---

## Phase 4: Style Migration

### CSS Files to Create
```
1. styles/modals.css           - Modal overlays and containers
2. styles/proposal-card-redesign.css - ProposalCard layout
3. styles/floating-summary.css - FloatingProposalSummary
4. styles/virtual-meetings.css - VM section styling
5. styles/request-virtual-meeting.css - RequestVirtualMeetingModal
6. styles/calendar-widget.css  - CalendarWidget styling
```

### Import Strategy
Add to main entry point or create proposals-styles.css that imports all:
```css
/* src/styles/proposals-styles.css */
@import './modals.css';
@import './proposal-card-redesign.css';
@import './floating-summary.css';
@import './virtual-meetings.css';
@import './request-virtual-meeting.css';
@import './calendar-widget.css';
```

---

## Phase 5: Routing & Integration

### URL Pattern
```
/guest-proposals/{userId}              → ProposalsIsland
/guest-proposals/{userId}?proposal={id} → ProposalsIsland with preselection
```

### Files to Update

#### 1. Vite Config (app/vite.config.js)
```javascript
// Add to build.rollupOptions.input:
guestProposals: resolve(__dirname, 'public/guest-proposals.html'),
```

#### 2. Cloudflare Redirects (app/public/_redirects)
```
# Guest proposals dynamic routes
/guest-proposals/*  /guest-proposals.html  200
```

#### 3. Navigation Integration
Update Header.jsx or navigation components to link to `/guest-proposals/{userId}`

---

## Phase 6: Testing & Validation

### Manual Testing Checklist
- [ ] Page loads for valid user ID
- [ ] Page shows EmptyState for user with no proposals
- [ ] Page shows ErrorState for invalid user ID
- [ ] Proposal selector shows all proposals
- [ ] Proposal selection updates URL
- [ ] URL with ?proposal={id} preselects correct proposal
- [ ] All 8 modals open and close correctly
- [ ] Virtual meeting 5-state workflow functions
- [ ] Cancel proposal 7-variation logic works
- [ ] Counteroffer comparison displays correctly
- [ ] Progress tracker shows correct stage
- [ ] Floating summary updates with selection
- [ ] Mobile responsive layout works
- [ ] Authentication redirects unauthenticated users

### Integration Testing
- [ ] Navigation to /search works
- [ ] Navigation to /messaging works
- [ ] Navigation to /view-split-lease works
- [ ] Navigation to /rental-application works
- [ ] Navigation to /initial-payment works
- [ ] Google Maps loads in MapsModal

---

## Dependency Additions

### NPM Packages (if not already present)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",  // Already present
    "react": "^18.2.0",                   // Already present
    "react-dom": "^18.2.0"                // Already present
  }
}
```

### Environment Variables (already configured)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_MAPS_API_KEY
```

---

## Risk Assessment

### High Risk Items
1. **Data schema differences**: Source uses different field naming conventions
2. **Google Maps integration**: Source has custom marker implementation
3. **Virtual meeting table**: May need schema verification

### Medium Risk Items
1. **Status string matching**: Source has 15+ statuses that must match database
2. **House rules resolution**: Async queries may need batching
3. **Navigation functions**: Must match existing route patterns

### Low Risk Items
1. **Styling conflicts**: Isolated CSS files minimize conflicts
2. **Component isolation**: No shared state with other pages

---

## Rollback Plan

### If Migration Fails
1. Git checkout to pre-purge commit
2. Restore all deleted files
3. Verify build succeeds
4. Document failure points for retry

### Git Branch Strategy
```bash
# Create migration branch before starting
git checkout -b feature/guest-proposals-migration

# After successful migration
git checkout main
git merge feature/guest-proposals-migration
```

---

## Timeline Estimate

| Phase | Files | Complexity |
|-------|-------|------------|
| Phase 1: Purge | 20+ files | Low |
| Phase 2: Foundation | Directory setup | Low |
| Phase 3: Components | 31 files | High |
| Phase 4: Styles | 6 files | Medium |
| Phase 5: Routing | 3 files | Low |
| Phase 6: Testing | N/A | Medium |

---

## Appendix A: Complete File Mapping

### Source → Destination Path Mapping

| Source File | Destination File |
|-------------|------------------|
| `src/main.jsx` | `app/src/guest-proposals.jsx` |
| `src/islands/pages/ProposalsIsland.jsx` | `app/src/islands/pages/ProposalsIsland.jsx` |
| `src/components/proposals/*.jsx` | `app/src/components/proposals/*.jsx` |
| `src/lib/supabase/*.js` | `app/src/lib/supabase/*.js` |
| `src/lib/utils/urlParser.js` | `app/src/lib/utils/urlParser.js` |
| `src/lib/constants/*.js` | `app/src/lib/constants/*.js` |
| `src/lib/workflows/*.js` | `app/src/lib/workflows/*.js` |
| `src/styles/*.css` | `app/src/styles/*.css` |

### Import Path Adjustments Required

| Source Import | Destination Import |
|---------------|-------------------|
| `../lib/supabase/supabase` | `../../lib/supabase` |
| `../lib/constants/proposalStatuses` | `../../lib/constants/proposalStatuses` |
| `../../components/proposals/...` | `../../components/proposals/...` |

---

## Appendix B: Database Field Reference

### Proposal Table Fields Used
```
_id, Status, Deleted, Guest, Listing
Days Selected, Nights Selected (Nights list)
Reservation Span (Weeks), nights per week (num)
check in day, check out day
Move in range start, Move in range end
Total Price for Reservation (guest), proposal nightly price
cleaning fee, damage deposit
counter offer happened
hc days selected, hc reservation span (weeks)
hc total price, hc nightly price
hc damage deposit, hc cleaning fee
hc house rules, hc check in day, hc check out day
Created Date, Modified Date
about_yourself, special_needs
reason for cancellation
rental application, virtual meeting
Is Finalized
```

### Virtual Meeting Table Fields
```
id, proposal_id, requested_by
booked_date, confirmed_by_splitlease
meeting_declined, meeting_link
unique_id, created_at, updated_at
```

---

## Document Version
- **Created**: 2025-01-25
- **Version**: 1.0
- **Status**: Ready for Phase 1 Execution
