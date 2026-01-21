# Implementation Plan: Simulation Host Mobile Proposals Page

## Overview

Build a new "simulation-host-mobile-proposals" page that enables hosts to walk through the complete guest proposal workflow on mobile devices. This page provides 6 sequential test steps (A through F) that simulate the guest experience, including receiving proposals, responding to counteroffers, managing leases, and completing stays with reviews.

## Success Criteria

- [ ] Page accessible at `/simulation-host-mobile` with mobile-first responsive design
- [ ] Host authentication required (redirects non-authenticated users)
- [ ] 6 sequential steps (A-F) with clear progress indication
- [ ] Each step creates real test data in Supabase (not mocked)
- [ ] Loading states between steps with visual feedback
- [ ] "Testing on mobile" confirmation checkbox before starting
- [ ] Current user display and date/time display
- [ ] Support for Weekly, Monthly, and Nightly rental type variants
- [ ] Generated test guest user for simulation purposes
- [ ] Cleanup option to remove test data after completion

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/routes.config.js` | Route registry | Add new route definition |
| `app/public/simulation-host-mobile.html` | HTML entry point | Create new file |
| `app/src/simulation-host-mobile.jsx` | React entry point | Create new file |
| `app/src/islands/pages/SimulationHostMobilePage.jsx` | Page component (Hollow) | Create new file |
| `app/src/islands/pages/SimulationHostMobilePage/useSimulationHostMobilePageLogic.js` | Page logic hook | Create new file |
| `app/src/islands/pages/SimulationHostMobilePage/components/` | Step components | Create directory with 6 step components |
| `app/src/islands/pages/SimulationHostMobilePage/SimulationHostMobilePage.css` | Page styles | Create new file |
| `supabase/functions/simulation/index.ts` | Edge Function for simulation actions | Create new file |
| `supabase/functions/simulation/actions/` | Action handlers | Create directory with handlers |
| `app/src/lib/simulationService.js` | Frontend service for simulation API | Create new file |

### Related Documentation

- [app/src/CLAUDE.md](../../../app/CLAUDE.md) - Frontend architecture patterns
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Edge Function patterns
- [miniCLAUDE.md](../Documentation/miniCLAUDE.md) - Quick architecture reference
- [GuestProposalsPage.jsx](../../../app/src/islands/pages/GuestProposalsPage.jsx) - Reference for hollow component pattern
- [useGuestProposalsPageLogic.js](../../../app/src/islands/pages/proposals/useGuestProposalsPageLogic.js) - Reference for page logic hook

### Existing Patterns to Follow

1. **Hollow Component Pattern**: Page component contains ONLY JSX, all logic delegated to `useSimulationHostMobilePageLogic` hook
2. **Four-Layer Logic**: Business logic separated into calculators, rules, processors, workflows
3. **Action-Based Edge Functions**: Use `{ action, payload }` pattern for all API calls
4. **Islands Architecture**: Independent React root mounted to HTML file
5. **Route Registry**: Single source of truth in `routes.config.js`
6. **Authentication Pattern**: Two-step auth (checkAuthStatus -> validateTokenAndFetchUser)

## Architecture Mapping: Bubble to React + Edge Functions

The original Bubble implementation has 25 page-level workflows. Here's how they map to our architecture:

### Bubble Workflow -> React/Edge Function Mapping

| Bubble Workflow | React Component | Edge Function Action | Description |
|-----------------|-----------------|---------------------|-------------|
| Initialize Page | `useSimulationHostMobilePageLogic` (useEffect) | N/A | Auth check, load host listings |
| Step A: Mark as Tester | `StepATester` | `simulation/mark_tester` | Update user.isUsabilityTester flag |
| Step B: Receive Proposals | `StepBProposals` | `simulation/create_test_proposals` | Create 3 proposals (Weekly, Monthly, Nightly) |
| Step C: Guest Rejects | `StepCCounteroffer` | `simulation/reject_counteroffer` | Update proposal status to rejected |
| Step D: Lease Documents | `StepDLease` | `simulation/create_lease` | Create lease record for accepted proposal |
| Step E: Guest Request | `StepERequest` | `simulation/guest_request` | Submit and respond to guest request |
| Step F: Complete Stay | `StepFReview` | `simulation/complete_stay` | Mark stay complete, generate reviews |
| Cleanup | `SimulationComplete` | `simulation/cleanup` | Remove all test data |

### Data Type Mapping: Bubble -> Supabase

| Bubble Data Type | Supabase Table | Notes |
|------------------|----------------|-------|
| User | `user` | Existing table |
| Account (Host) | `account_host` | Existing table |
| Account (Guest) | `account_guest` | Existing table |
| Listing | `listing` | Existing table |
| Proposal | `proposal` | Existing table |
| Bookings-Leases | `lease` | Existing table |
| Virtual Meeting | `virtual_meeting` | Existing table |
| Review | `review` | May need to verify table exists |

## Implementation Steps

### Step 1: Create Route Definition

**Files:** `app/src/routes.config.js`

**Purpose:** Register the new page route

**Details:**
```javascript
// Add to routes array
{
  path: '/simulation-host-mobile',
  file: 'simulation-host-mobile.html',
  aliases: ['/simulation-host-mobile.html'],
  protected: true,  // Host-only access
  cloudflareInternal: true,
  internalName: 'simulation-host-mobile-view',
  hasDynamicSegment: false
}
```

**Validation:** Run `bun run generate-routes` and verify `_redirects` and `_routes.json` are updated

---

### Step 2: Create HTML Entry Point

**Files:** `app/public/simulation-host-mobile.html`

**Purpose:** Static HTML shell for React island

**Details:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Host Simulation - Split Lease</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/simulation-host-mobile.jsx"></script>
</body>
</html>
```

**Validation:** File exists and references correct entry point

---

### Step 3: Create React Entry Point

**Files:** `app/src/simulation-host-mobile.jsx`

**Purpose:** Mount React root to DOM

**Details:**
```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationHostMobilePage from './islands/pages/SimulationHostMobilePage.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<SimulationHostMobilePage />);
```

**Validation:** Entry point follows existing pattern from other pages

---

### Step 4: Create Page Logic Hook

**Files:** `app/src/islands/pages/SimulationHostMobilePage/useSimulationHostMobilePageLogic.js`

**Purpose:** All business logic for the simulation page

**Details:**

```javascript
/**
 * Simulation Host Mobile Page Logic Hook
 *
 * State Management:
 * - currentStep: 0-6 (0 = pre-start, 1-6 = steps A-F)
 * - stepStatuses: { A: 'pending'|'active'|'completed', ... }
 * - testGuestUser: Generated guest for simulation
 * - testProposals: Array of created proposals
 * - testLease: Created lease object
 * - selectedRentalType: 'weekly' | 'monthly' | 'nightly'
 * - isLoading: boolean
 * - error: string | null
 * - mobileConfirmed: boolean (checkbox state)
 *
 * Handlers:
 * - handleStartSimulation(): Begin step A
 * - handleStepComplete(step): Move to next step
 * - handleSelectRentalType(type): Set rental type for step B
 * - handleRetry(): Retry current step on error
 * - handleCleanup(): Remove all test data
 */

export function useSimulationHostMobilePageLogic() {
  // Auth state (same pattern as GuestProposalsPage)
  const [authState, setAuthState] = useState({ ... });

  // Simulation state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({
    A: 'pending', B: 'pending', C: 'pending',
    D: 'pending', E: 'pending', F: 'pending'
  });
  const [testData, setTestData] = useState({
    guestUser: null,
    proposals: [],
    lease: null,
    reviews: []
  });

  // UI state
  const [selectedRentalType, setSelectedRentalType] = useState('weekly');
  const [mobileConfirmed, setMobileConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ... auth check useEffect (same pattern as GuestProposalsPage)
  // ... step handlers
  // ... cleanup handler

  return {
    authState,
    user,
    hostListings, // Host's actual listings to use for test
    currentStep,
    stepStatuses,
    testData,
    selectedRentalType,
    mobileConfirmed,
    isLoading,
    error,
    currentDateTime, // Formatted current date/time

    // Handlers
    handleMobileConfirmChange,
    handleStartSimulation,
    handleSelectRentalType,
    handleStepAction, // Generic handler for step-specific actions
    handleRetry,
    handleCleanup
  };
}
```

**Validation:** Hook exports all state and handlers needed by page component

---

### Step 5: Create Page Component (Hollow)

**Files:** `app/src/islands/pages/SimulationHostMobilePage.jsx`

**Purpose:** Pure JSX rendering (no business logic)

**Details:**

```javascript
/**
 * Simulation Host Mobile Page
 *
 * Follows Hollow Component Pattern:
 * - Contains ONLY JSX rendering
 * - ALL logic delegated to useSimulationHostMobilePageLogic
 */

import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { useSimulationHostMobilePageLogic } from './SimulationHostMobilePage/useSimulationHostMobilePageLogic.js';
import StepIndicator from './SimulationHostMobilePage/components/StepIndicator.jsx';
import MobileConfirmation from './SimulationHostMobilePage/components/MobileConfirmation.jsx';
import StepATester from './SimulationHostMobilePage/components/StepATester.jsx';
import StepBProposals from './SimulationHostMobilePage/components/StepBProposals.jsx';
import StepCCounteroffer from './SimulationHostMobilePage/components/StepCCounteroffer.jsx';
import StepDLease from './SimulationHostMobilePage/components/StepDLease.jsx';
import StepERequest from './SimulationHostMobilePage/components/StepERequest.jsx';
import StepFReview from './SimulationHostMobilePage/components/StepFReview.jsx';
import SimulationComplete from './SimulationHostMobilePage/components/SimulationComplete.jsx';
import './SimulationHostMobilePage/SimulationHostMobilePage.css';

export default function SimulationHostMobilePage() {
  const {
    authState,
    user,
    hostListings,
    currentStep,
    stepStatuses,
    testData,
    selectedRentalType,
    mobileConfirmed,
    isLoading,
    error,
    currentDateTime,
    handleMobileConfirmChange,
    handleStartSimulation,
    handleSelectRentalType,
    handleStepAction,
    handleRetry,
    handleCleanup
  } = useSimulationHostMobilePageLogic();

  // ... render logic based on currentStep
}
```

**Validation:** Component has zero useState/useEffect calls, only uses hook exports

---

### Step 6: Create Step Components

**Files:** `app/src/islands/pages/SimulationHostMobilePage/components/`

**Purpose:** Individual step UI components

**Details:**

Create the following components:

1. **StepIndicator.jsx** - Progress bar showing steps A-F with status indicators
2. **MobileConfirmation.jsx** - Checkbox + start button for pre-simulation confirmation
3. **StepATester.jsx** - Mark as tester UI (single button)
4. **StepBProposals.jsx** - Rental type selector + create proposals button
5. **StepCCounteroffer.jsx** - Show counteroffer, reject button
6. **StepDLease.jsx** - Lease document generation UI
7. **StepERequest.jsx** - Guest request submission and response UI
8. **StepFReview.jsx** - Review generation and display UI
9. **SimulationComplete.jsx** - Completion summary with cleanup button

Each component receives:
- `isActive`: boolean - whether this is the current step
- `status`: 'pending' | 'active' | 'completed'
- `onAction`: handler for step-specific action
- `isLoading`: boolean
- `testData`: relevant test data for display

**Validation:** Each component is stateless (receives all state via props)

---

### Step 7: Create Simulation Edge Function

**Files:** `supabase/functions/simulation/index.ts`

**Purpose:** Backend logic for simulation actions

**Details:**

```typescript
/**
 * Simulation Edge Function
 *
 * Actions:
 * - mark_tester: Update user.isUsabilityTester
 * - create_test_guest: Generate test guest user
 * - create_test_proposals: Create 3 proposals for host's listing
 * - reject_counteroffer: Update proposal status
 * - create_lease: Create lease from accepted proposal
 * - guest_request: Create and respond to guest request
 * - complete_stay: Mark lease complete, generate reviews
 * - cleanup: Remove all test data by correlation ID
 *
 * All actions require host authentication.
 * Test data is tagged with simulation_id for easy cleanup.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ACTIONS = [
  'mark_tester',
  'create_test_guest',
  'create_test_proposals',
  'reject_counteroffer',
  'create_lease',
  'guest_request',
  'complete_stay',
  'cleanup'
] as const;

Deno.serve(async (req: Request) => {
  // ... CORS handling
  // ... action routing
  // ... error handling
});
```

**Validation:** Edge function follows existing patterns from `proposal/index.ts` and `listing/index.ts`

---

### Step 8: Create Simulation Action Handlers

**Files:** `supabase/functions/simulation/actions/`

**Purpose:** Individual action handlers for each simulation step

**Details:**

Create handlers:
- `markTester.ts` - Sets user.isUsabilityTester = true
- `createTestGuest.ts` - Creates test guest user with unique email
- `createTestProposals.ts` - Creates 3 proposals (Weekly, Monthly, Nightly)
- `rejectCounteroffer.ts` - Updates proposal status
- `createLease.ts` - Creates lease record
- `guestRequest.ts` - Creates and processes guest request
- `completeStay.ts` - Marks stay complete, creates reviews
- `cleanup.ts` - Deletes all records with matching simulation_id

Each handler:
- Receives `payload` and `supabase` client
- Tags created records with `simulation_id` for cleanup
- Returns created/updated record(s)

**Validation:** Each handler is a pure function with side effects isolated to Supabase calls

---

### Step 9: Create Frontend Service

**Files:** `app/src/lib/simulationService.js`

**Purpose:** Frontend API client for simulation Edge Function

**Details:**

```javascript
/**
 * Simulation Service
 *
 * Provides functions to call simulation Edge Function actions.
 * All functions follow the action-based pattern.
 */

import { supabase } from './supabase.js';

const SIMULATION_FUNCTION = 'simulation';

export async function markAsTester(userId) {
  const { data, error } = await supabase.functions.invoke(SIMULATION_FUNCTION, {
    body: { action: 'mark_tester', payload: { userId } }
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTestGuest(simulationId) {
  const { data, error } = await supabase.functions.invoke(SIMULATION_FUNCTION, {
    body: { action: 'create_test_guest', payload: { simulationId } }
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTestProposals(simulationId, listingId, guestId, rentalTypes) {
  const { data, error } = await supabase.functions.invoke(SIMULATION_FUNCTION, {
    body: {
      action: 'create_test_proposals',
      payload: { simulationId, listingId, guestId, rentalTypes }
    }
  });
  if (error) throw new Error(error.message);
  return data;
}

// ... other action functions
```

**Validation:** Service follows existing patterns from `lib/auth.js` and `lib/bubbleAPI.js`

---

### Step 10: Create Page Styles (Mobile-First)

**Files:** `app/src/islands/pages/SimulationHostMobilePage/SimulationHostMobilePage.css`

**Purpose:** Mobile-first responsive styles

**Details:**

```css
/* Mobile-first design */
.simulation-page {
  max-width: 100%;
  padding: 1rem;
  min-height: 100vh;
}

.simulation-header {
  text-align: center;
  margin-bottom: 2rem;
}

.simulation-header__user {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.simulation-header__datetime {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Step indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 0 0.5rem;
}

.step-indicator__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-indicator__circle {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.step-indicator__circle--pending {
  background: var(--color-gray-200);
  color: var(--color-gray-500);
}

.step-indicator__circle--active {
  background: var(--color-primary);
  color: white;
}

.step-indicator__circle--completed {
  background: var(--color-success);
  color: white;
}

/* Step cards */
.step-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.step-card--active {
  border: 2px solid var(--color-primary);
}

/* Mobile confirmation */
.mobile-confirmation {
  background: var(--color-gray-50);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* Tablet and desktop adjustments */
@media (min-width: 768px) {
  .simulation-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
}
```

**Validation:** Styles follow CSS variable conventions from `variables.css`

---

### Step 11: Register Route and Generate Files

**Files:** `app/src/routes.config.js`, Cloudflare config files

**Purpose:** Complete route registration

**Details:**
1. Add route to `routes.config.js` (Step 1)
2. Run `bun run generate-routes`
3. Verify `public/_redirects` includes new route
4. Verify `public/_routes.json` excludes route from Functions (if needed)

**Validation:** `bun run build` succeeds, page accessible in dev server

---

### Step 12: Deploy Edge Function

**Files:** `supabase/functions/simulation/`

**Purpose:** Deploy new Edge Function to Supabase

**Details:**
```bash
# Test locally first
supabase functions serve simulation

# Deploy to production
supabase functions deploy simulation
```

**Validation:** Edge Function responds to POST requests with correct action routing

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SIMULATION DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRE-START                                                                  │
│  ┌─────────────────┐                                                        │
│  │ Mobile Confirm  │ ──→ Enable Start Button                                │
│  │ Checkbox        │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  STEP A: Mark as Tester                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Host clicks     │ ──→ │ Edge Function   │ ──→ │ Update user     │       │
│  │ "Mark as Tester"│     │ mark_tester     │     │ isUsabilityTester│      │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP B: Receive Proposals                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Select Rental   │ ──→ │ create_test_    │ ──→ │ Create test     │       │
│  │ Types (W/M/N)   │     │ guest +         │     │ guest user +    │       │
│  │ + Host Listing  │     │ proposals       │     │ 3 proposals     │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                             │               │
│                                            ┌────────────────┘               │
│                                            ▼                                │
│  STEP C: Reject Counteroffer              ┌─────────────────┐               │
│  ┌─────────────────┐     ┌─────────────────│ Proposal with   │              │
│  │ Host sends      │ ──→ │ Guest rejects   │ counteroffer    │              │
│  │ counteroffer    │     │ (simulate)     │ status=rejected │              │
│  └─────────────────┘     └─────────────────┴─────────────────┘              │
│                                                                             │
│  STEP D: Lease Documents                                                    │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Accept proposal │ ──→ │ create_lease    │ ──→ │ Lease record    │       │
│  │ (W/M/N variant) │     │                 │     │ created         │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                             │               │
│  STEP E: Guest Request                                      ▼               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Guest submits   │ ──→ │ guest_request   │ ──→ │ Request         │       │
│  │ request         │     │ + host response │     │ processed       │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP F: Complete Stay                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Mark stay       │ ──→ │ complete_stay   │ ──→ │ Reviews         │       │
│  │ complete        │     │ + reviews       │     │ generated       │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  CLEANUP                                                                    │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Host clicks     │ ──→ │ cleanup         │ ──→ │ Delete all      │       │
│  │ "Clean Up"      │     │ (simulation_id) │     │ test records    │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Host has no listings | Display error message, prevent simulation start |
| Test guest creation fails | Show error, allow retry |
| Proposal creation fails | Show error with details, allow retry, don't advance step |
| Step timeout (>30s) | Show timeout error, offer retry |
| User navigates away mid-simulation | Store state in localStorage, resume on return |
| Cleanup fails | Show partial cleanup error, list remaining test data |
| Network disconnection | Detect offline, queue actions for retry when online |

## Testing Considerations

### Manual Testing Checklist

- [ ] Page loads on mobile devices (iPhone, Android)
- [ ] Authentication redirects work correctly
- [ ] Mobile confirmation checkbox enables start button
- [ ] Each step (A-F) completes successfully
- [ ] Loading states display correctly between steps
- [ ] Error states display and retry works
- [ ] Rental type selection works for all 3 types
- [ ] Cleanup removes all test data
- [ ] Page state persists across refresh (if partially completed)

### Database Verification

- [ ] Test guest user created with unique email
- [ ] Proposals have correct simulation_id tag
- [ ] Lease record created with correct relationships
- [ ] Reviews generated with correct ratings
- [ ] Cleanup removes all tagged records

## Rollback Strategy

1. **Route Removal**: Remove route from `routes.config.js`, regenerate
2. **Frontend Files**: Delete all files in `SimulationHostMobilePage/` directory
3. **Edge Function**: Delete `supabase/functions/simulation/` directory
4. **Database Cleanup**: Run cleanup action with simulation_id to remove any test data
5. **Service File**: Delete `lib/simulationService.js`

No database migrations required for this feature.

## Dependencies & Blockers

### Prerequisites

- [ ] Verify `review` table exists in Supabase schema
- [ ] Verify `lease` table has required fields for simulation
- [ ] Verify host authentication flow works on mobile
- [ ] Edge Function deployment access

### External Dependencies

- None (uses existing Supabase infrastructure)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test data left in database | Medium | Low | Cleanup action with simulation_id tagging |
| Edge Function timeout | Low | Medium | Break operations into smaller chunks, add retries |
| Mobile CSS compatibility | Medium | Low | Test on multiple devices, use CSS variables |
| Authentication race conditions | Low | High | Follow established auth pattern from GuestProposalsPage |
| Bubble sync conflicts | Medium | Medium | Skip Bubble sync for test data (Supabase-only) |

---

## File Summary

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/public/simulation-host-mobile.html` | HTML entry point |
| `app/src/simulation-host-mobile.jsx` | React entry point |
| `app/src/islands/pages/SimulationHostMobilePage.jsx` | Page component (Hollow) |
| `app/src/islands/pages/SimulationHostMobilePage/useSimulationHostMobilePageLogic.js` | Page logic hook |
| `app/src/islands/pages/SimulationHostMobilePage/SimulationHostMobilePage.css` | Page styles |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepIndicator.jsx` | Progress indicator |
| `app/src/islands/pages/SimulationHostMobilePage/components/MobileConfirmation.jsx` | Pre-start confirmation |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepATester.jsx` | Step A component |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepBProposals.jsx` | Step B component |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepCCounteroffer.jsx` | Step C component |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepDLease.jsx` | Step D component |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepERequest.jsx` | Step E component |
| `app/src/islands/pages/SimulationHostMobilePage/components/StepFReview.jsx` | Step F component |
| `app/src/islands/pages/SimulationHostMobilePage/components/SimulationComplete.jsx` | Completion screen |
| `app/src/lib/simulationService.js` | Frontend API service |
| `supabase/functions/simulation/index.ts` | Edge Function entry |
| `supabase/functions/simulation/deno.json` | Deno config |
| `supabase/functions/simulation/actions/markTester.ts` | Step A handler |
| `supabase/functions/simulation/actions/createTestGuest.ts` | Guest creation |
| `supabase/functions/simulation/actions/createTestProposals.ts` | Step B handler |
| `supabase/functions/simulation/actions/rejectCounteroffer.ts` | Step C handler |
| `supabase/functions/simulation/actions/createLease.ts` | Step D handler |
| `supabase/functions/simulation/actions/guestRequest.ts` | Step E handler |
| `supabase/functions/simulation/actions/completeStay.ts` | Step F handler |
| `supabase/functions/simulation/actions/cleanup.ts` | Cleanup handler |

### Files to Modify

| File Path | Change |
|-----------|--------|
| `app/src/routes.config.js` | Add route definition |

---

## Critical File References

### Existing Files to Reference (Patterns)

- **Route Registration**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\routes.config.js`
- **Page Component Pattern**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\GuestProposalsPage.jsx`
- **Logic Hook Pattern**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\proposals\useGuestProposalsPageLogic.js`
- **Edge Function Pattern**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\proposal\index.ts`
- **Listing Edge Function**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\functions\listing\index.ts`
- **Auth Utilities**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\lib\auth.js`
- **Supabase Client**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\lib\supabase.js`
- **CSS Variables**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\styles\variables.css`

### Documentation References

- **Architecture Guide**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\.claude\Documentation\miniCLAUDE.md`
- **Frontend CLAUDE.md**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\CLAUDE.md`
- **Supabase CLAUDE.md**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\supabase\CLAUDE.md`
- **Routing Guide**: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\.claude\Documentation\Routing\ROUTING_GUIDE.md`

---

**Plan Version**: 1.0
**Created**: 2026-01-20 14:35:00
**Author**: Claude (implementation-planner)
