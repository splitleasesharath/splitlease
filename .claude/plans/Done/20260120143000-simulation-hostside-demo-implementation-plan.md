# Implementation Plan: simulation-hostside-demo Page Migration

**Date Created:** 2026-01-20 14:30:00
**Status:** NEW - Awaiting Approval
**Complexity:** HIGH (Multi-step wizard with auth, database, and state management)
**Estimated Files:** 15-20 new/modified files

---

## Executive Summary

This plan adapts the Bubble.io `simulation-hostside-demo` page to Split Lease's React + Supabase architecture. The page provides a **usability testing environment** where hosts can simulate the complete proposal workflow (receiving proposals, accepting VM invites, drafting leases) without affecting production data.

### Key Architectural Adaptations

| Bubble Concept | Split Lease Equivalent |
|----------------|------------------------|
| Bubble built-in User type | Supabase `public.user` table + `auth.users` |
| Bubble custom states | React `useState` in page logic hook |
| Bubble workflows | React event handlers + Edge Functions |
| Bubble conditionals | React conditional rendering + CSS classes |
| Bubble backend workflows | Supabase Edge Functions |
| "Usability Step" field on User | New `usability_step` column OR localStorage (see Decision 1) |

---

## Critical Design Decisions (Require Your Input)

### Decision 1: Where to Store Simulation Progress?

**Option A: Database (`public.user.usability_step` column)**
- ✅ Persists across sessions/devices
- ✅ Matches Bubble's approach exactly
- ❌ Requires database migration
- ❌ Pollutes user table with test-specific data

**Option B: localStorage (client-side only)**
- ✅ No database changes needed
- ✅ Isolated from production data
- ✅ Faster implementation
- ❌ Lost on browser clear/different device

**Option C: Separate `simulation_progress` table**
- ✅ Clean separation of concerns
- ✅ Persists across sessions
- ✅ Can track additional simulation metadata
- ❌ Requires database migration + Edge Function

**Recommendation:** Option C for production-quality, Option B for MVP/quick testing.

---

### Decision 2: Simulated Guest Users - Real or Fake?

The Bubble page creates simulated guest users (Jacques, Mariska, Lukas) for testing.

**Option A: Create real test users in database**
- ✅ Realistic proposal/messaging testing
- ❌ Pollutes database with test accounts
- ❌ Cleanup complexity

**Option B: Use hardcoded mock data (no database writes)**
- ✅ Zero database pollution
- ✅ Instant, no API calls
- ❌ Can't test actual proposal Edge Functions
- ❌ Less realistic

**Option C: Dedicated `simulation_*` tables**
- ✅ Isolated test data
- ✅ Can reset easily
- ❌ Requires new tables + Edge Functions

**Recommendation:** Option B for MVP, Option C for full simulation fidelity.

---

### Decision 3: Authentication Flow

The Bubble page has its own login form. Should we:

**Option A: Use existing Split Lease auth system**
- User must already be logged in OR gets redirected to `/login`
- Simulation page is a protected route
- ✅ Consistent UX
- ✅ No duplicate auth code

**Option B: Inline login form (matching Bubble spec)**
- Page has its own email/password form
- ✅ Matches Bubble requirements exactly
- ❌ Duplicates auth UI
- ❌ May confuse users (two ways to log in)

**Recommendation:** Option A - leverage existing auth, redirect unauthenticated users.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SIMULATION PAGE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  public/simulation-hostside-demo.html                                    │
│       ↓                                                                  │
│  src/simulation-hostside-demo.jsx (entry point)                         │
│       ↓                                                                  │
│  islands/pages/SimulationHostsideDemoPage/                              │
│       ├── SimulationHostsideDemoPage.jsx (hollow component)             │
│       ├── useSimulationHostsideDemoPageLogic.js (ALL state/logic)       │
│       ├── SimulationHostsideDemoPage.css                                │
│       └── components/                                                    │
│            ├── StepButton.jsx                                           │
│            ├── StepIndicator.jsx                                        │
│            ├── SimulatedProposalCard.jsx                                │
│            └── LoginPrompt.jsx (if Option B for auth)                   │
│                                                                          │
│  logic/simulators/                                                       │
│       ├── generateSimulatedGuests.js                                    │
│       ├── generateSimulatedProposals.js                                 │
│       └── simulationStepValidation.js                                   │
│                                                                          │
│  (Optional) supabase/functions/simulation/                              │
│       └── index.ts (if database-backed simulation)                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Files 1-5)

#### 1.1 Create HTML Entry Point
**File:** `app/public/simulation-hostside-demo.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Host Simulation Demo | Split Lease</title>
  <link rel="stylesheet" href="/src/styles/global.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/simulation-hostside-demo.jsx"></script>
</body>
</html>
```

#### 1.2 Create JSX Entry Point
**File:** `app/src/simulation-hostside-demo.jsx`
```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationHostsideDemoPage from './islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage';
import './styles/global.css';

const root = createRoot(document.getElementById('root'));
root.render(<SimulationHostsideDemoPage />);
```

#### 1.3 Update Route Registry
**File:** `app/src/routes.config.js` (MODIFY)
```javascript
// Add to routes array:
{
  path: '/simulation-hostside-demo',
  file: 'simulation-hostside-demo.html',
  aliases: ['/simulation-hostside-demo.html', '/hostside-demo'],
  protected: true,  // Requires login
  cloudflareInternal: true,
  internalName: 'simulation-hostside-demo',
  hasDynamicSegment: false
}
```

#### 1.4 Run Route Generation
```bash
cd app && bun run generate-routes
```

#### 1.5 Create Page Component Directory
```
app/src/islands/pages/SimulationHostsideDemoPage/
├── SimulationHostsideDemoPage.jsx
├── useSimulationHostsideDemoPageLogic.js
├── SimulationHostsideDemoPage.css
└── components/
    ├── StepButton.jsx
    └── StepIndicator.jsx
```

---

### Phase 2: Page Logic Hook (Core State Management)

#### 2.1 Main Logic Hook
**File:** `app/src/islands/pages/SimulationHostsideDemoPage/useSimulationHostsideDemoPageLogic.js`

**State to manage:**
```javascript
{
  // Auth state
  isLoggedIn: boolean,
  currentUser: { id, email, name } | null,

  // Simulation progress (maps to Bubble's "Usability Step")
  currentStep: 0-5,  // 0 = not started, 1-5 = steps A-E
  stepStates: {
    stepA: { clicked: boolean, completed: boolean },
    stepB: { clicked: boolean, completed: boolean },
    stepC: { clicked: boolean, completed: boolean },
    stepD: { clicked: boolean, completed: boolean },
    stepE: { clicked: boolean, completed: boolean }
  },

  // Simulated data
  simulatedGuests: [Jacques, Mariska, Lukas],
  simulatedProposals: [],
  simulatedListing: {},

  // UI state
  isLoading: boolean,
  loadingStep: string | null,
  error: string | null
}
```

**Key functions:**
```javascript
// Step handlers (map to Bubble workflows)
handleStepAClick()  // Mark as usability tester
handleStepBClick()  // Generate 3 proposals
handleStepCClick()  // Mariska accepts VM invite
handleStepDClick()  // Draft lease docs
handleStepEClick()  // Jacques sends VM invite

// Validation
canClickStep(stepLetter)  // Check if step is unlocked
isStepCompleted(stepLetter)

// Persistence (localStorage or API)
saveProgress()
loadProgress()
resetSimulation()
```

---

### Phase 3: Mapping Bubble Steps to React Actions

#### Step A: "Mark yourself as a Usability Tester"
**Bubble behavior:**
- Updates User's "Usability Step" field to 1
- Sets button state to "clicked"

**React equivalent:**
```javascript
const handleStepAClick = async () => {
  setLoadingStep('A');

  // Update local state
  setCurrentStep(1);
  setStepStates(prev => ({
    ...prev,
    stepA: { clicked: true, completed: true }
  }));

  // Persist (localStorage or API)
  await saveProgress({ currentStep: 1 });

  setLoadingStep(null);
};
```

#### Step B: "Receive 3 Proposals"
**Bubble behavior:**
- Creates 3 Proposal records linked to simulated guests
- Associates with user's listing

**React equivalent (mock data approach):**
```javascript
const handleStepBClick = async () => {
  setLoadingStep('B');

  // Generate mock proposals
  const proposals = generateSimulatedProposals({
    guests: simulatedGuests,
    listing: simulatedListing,
    hostId: currentUser.id
  });

  setSimulatedProposals(proposals);
  setCurrentStep(2);
  setStepStates(prev => ({
    ...prev,
    stepB: { clicked: true, completed: true }
  }));

  await saveProgress({ currentStep: 2, proposals });
  setLoadingStep(null);
};
```

#### Step C: "Mariska Accepts VM Invite"
**Bubble behavior:**
- Updates proposal status
- Creates VM invitation record

**React equivalent:**
```javascript
const handleStepCClick = async () => {
  setLoadingStep('C');

  // Find Mariska's proposal and update status
  setSimulatedProposals(prev => prev.map(p =>
    p.guest.name === 'Mariska'
      ? { ...p, vmStatus: 'accepted', vmAcceptedAt: new Date() }
      : p
  ));

  setCurrentStep(3);
  setStepStates(prev => ({
    ...prev,
    stepC: { clicked: true, completed: true }
  }));

  await saveProgress({ currentStep: 3 });
  setLoadingStep(null);
};
```

#### Step D: "Draft Lease Docs for Proposal #2"
**Bubble behavior:**
- Generates/templates lease document
- Associates with second proposal

**React equivalent:**
```javascript
const handleStepDClick = async () => {
  setLoadingStep('D');

  // Update second proposal with lease draft
  setSimulatedProposals(prev => prev.map((p, idx) =>
    idx === 1  // Proposal #2 (0-indexed)
      ? { ...p, leaseStatus: 'draft', leaseDraftedAt: new Date() }
      : p
  ));

  setCurrentStep(4);
  setStepStates(prev => ({
    ...prev,
    stepD: { clicked: true, completed: true }
  }));

  await saveProgress({ currentStep: 4 });
  setLoadingStep(null);
};
```

#### Step E: "VM invite from Guest Jacques"
**Bubble behavior:**
- Creates VM invitation FROM Jacques TO host
- Completes simulation

**React equivalent:**
```javascript
const handleStepEClick = async () => {
  setLoadingStep('E');

  // Mark Jacques's proposal as having incoming VM invite
  setSimulatedProposals(prev => prev.map(p =>
    p.guest.name === 'Jacques'
      ? { ...p, hasIncomingVmInvite: true, vmInviteReceivedAt: new Date() }
      : p
  ));

  setCurrentStep(5);
  setStepStates(prev => ({
    ...prev,
    stepE: { clicked: true, completed: true }
  }));

  await saveProgress({ currentStep: 5, completed: true });
  setLoadingStep(null);

  // Optional: Show completion message
  setShowCompletionModal(true);
};
```

---

### Phase 4: Simulated Data Generators

#### 4.1 Guest Generator
**File:** `app/src/logic/simulators/generateSimulatedGuests.js`

```javascript
/**
 * Generates hardcoded simulated guest users for usability testing.
 * These are NOT real database users - just mock data for UI testing.
 */
export function generateSimulatedGuests() {
  return [
    {
      id: 'sim-guest-jacques',
      firstName: 'Jacques',
      lastName: 'Silva',
      email: 'jacques.silva@simulation.splitlease.com',
      avatar: '/images/avatars/default-male-1.png',
      isSimulated: true
    },
    {
      id: 'sim-guest-mariska',
      firstName: 'Mariska',
      lastName: 'Van Der Berg',
      email: 'mariska.vdb@simulation.splitlease.com',
      avatar: '/images/avatars/default-female-1.png',
      isSimulated: true
    },
    {
      id: 'sim-guest-lukas',
      firstName: 'Lukas',
      lastName: 'Müller',
      email: 'lukas.muller@simulation.splitlease.com',
      avatar: '/images/avatars/default-male-2.png',
      isSimulated: true
    }
  ];
}
```

#### 4.2 Proposal Generator
**File:** `app/src/logic/simulators/generateSimulatedProposals.js`

```javascript
import { generateSimulatedGuests } from './generateSimulatedGuests.js';

/**
 * Generates 3 simulated proposals for usability testing.
 * @param {Object} options
 * @param {Object} options.listing - The host's listing (or simulated listing)
 * @param {string} options.hostId - The current user's ID
 */
export function generateSimulatedProposals({ listing, hostId }) {
  const guests = generateSimulatedGuests();
  const baseDate = new Date();

  return guests.map((guest, index) => ({
    id: `sim-proposal-${index + 1}`,
    guest,
    hostId,
    listing: listing || generateSimulatedListing(),
    status: 'pending',

    // Proposal details
    moveInDate: addDays(baseDate, 14 + (index * 7)),
    moveOutDate: addDays(baseDate, 90 + (index * 7)),
    selectedDays: [1, 2, 3, 4, 5],  // Mon-Fri
    monthlyRate: 2500 + (index * 200),

    // Tracking fields (updated by steps)
    vmStatus: null,
    vmAcceptedAt: null,
    leaseStatus: null,
    leaseDraftedAt: null,
    hasIncomingVmInvite: false,
    vmInviteReceivedAt: null,

    // Metadata
    createdAt: new Date(),
    isSimulated: true
  }));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateSimulatedListing() {
  return {
    id: 'sim-listing-1',
    title: 'Cozy Brooklyn Studio',
    neighborhood: 'Williamsburg',
    monthlyRate: 2800,
    isSimulated: true
  };
}
```

---

### Phase 5: UI Components

#### 5.1 Step Button Component
**File:** `app/src/islands/pages/SimulationHostsideDemoPage/components/StepButton.jsx`

```jsx
import './StepButton.css';

/**
 * Step button for simulation wizard.
 * Matches Bubble's step button behavior with:
 * - Numbered indicator
 * - Click state tracking
 * - Disabled state when locked
 * - Loading state during async operations
 */
export default function StepButton({
  stepNumber,
  stepLetter,
  label,
  isCompleted,
  isActive,
  isDisabled,
  isLoading,
  onClick
}) {
  const buttonClass = [
    'step-button',
    isCompleted && 'step-button--completed',
    isActive && 'step-button--active',
    isDisabled && 'step-button--disabled',
    isLoading && 'step-button--loading'
  ].filter(Boolean).join(' ');

  return (
    <div className="step-button-container">
      <span className={`step-number ${isCompleted ? 'step-number--completed' : ''}`}>
        {isCompleted ? '✓' : stepNumber}
      </span>
      <button
        className={buttonClass}
        onClick={onClick}
        disabled={isDisabled || isLoading}
        aria-label={`Step ${stepLetter}: ${label}`}
      >
        {isLoading ? (
          <span className="step-button__loading-spinner" />
        ) : null}
        <span className="step-button__text">
          Step {stepLetter} — {label}
        </span>
      </button>
    </div>
  );
}
```

#### 5.2 Step Indicator Component
**File:** `app/src/islands/pages/SimulationHostsideDemoPage/components/StepIndicator.jsx`

```jsx
/**
 * Visual progress indicator showing which steps are complete.
 * Displays as connected dots/circles with labels.
 */
export default function StepIndicator({ currentStep, totalSteps = 5 }) {
  const steps = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="step-indicator">
      {steps.map((letter, index) => {
        const stepNum = index + 1;
        const isComplete = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={letter} className="step-indicator__item">
            <div className={`step-indicator__dot ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
              {isComplete ? '✓' : letter}
            </div>
            {index < steps.length - 1 && (
              <div className={`step-indicator__line ${isComplete ? 'complete' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### 5.3 Main Page Component (Hollow)
**File:** `app/src/islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage.jsx`

```jsx
import { useSimulationHostsideDemoPageLogic } from './useSimulationHostsideDemoPageLogic';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import StepButton from './components/StepButton';
import StepIndicator from './components/StepIndicator';
import './SimulationHostsideDemoPage.css';

/**
 * Host-side simulation demo page.
 * Allows usability testers to simulate the complete host workflow.
 *
 * HOLLOW COMPONENT: All logic delegated to useSimulationHostsideDemoPageLogic hook.
 */
export default function SimulationHostsideDemoPage() {
  const {
    // Auth
    isLoggedIn,
    currentUser,

    // Progress
    currentStep,
    stepStates,

    // Data
    simulatedProposals,

    // UI state
    loadingStep,

    // Handlers
    handleStepAClick,
    handleStepBClick,
    handleStepCClick,
    handleStepDClick,
    handleStepEClick,
    handleResetSimulation
  } = useSimulationHostsideDemoPageLogic();

  // Show loading or redirect for unauthenticated users
  if (!isLoggedIn) {
    return (
      <>
        <Header />
        <main className="simulation-page simulation-page--auth-required">
          <div className="simulation-page__auth-message">
            <h2>Authentication Required</h2>
            <p>Please log in to access the host simulation demo.</p>
            <a href="/login?redirect=/simulation-hostside-demo" className="btn btn--primary">
              Log In
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="simulation-page">
        <div className="simulation-page__container">
          {/* Header Section */}
          <header className="simulation-page__header">
            <h1>Host Simulation Demo</h1>
            <p className="simulation-page__subtitle">
              Test the host workflow without affecting real data
            </p>
            <p className="simulation-page__user-info">
              Logged in as: <strong>{currentUser?.email}</strong>
            </p>
          </header>

          {/* Progress Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Step Buttons */}
          <section className="simulation-page__steps">
            <StepButton
              stepNumber={1}
              stepLetter="A"
              label="Mark yourself as a Usability Tester"
              isCompleted={stepStates.stepA.completed}
              isActive={currentStep === 0}
              isDisabled={currentStep > 0}
              isLoading={loadingStep === 'A'}
              onClick={handleStepAClick}
            />

            <StepButton
              stepNumber={2}
              stepLetter="B"
              label="Receive 3 Proposals"
              isCompleted={stepStates.stepB.completed}
              isActive={currentStep === 1}
              isDisabled={currentStep < 1}
              isLoading={loadingStep === 'B'}
              onClick={handleStepBClick}
            />

            <StepButton
              stepNumber={3}
              stepLetter="C"
              label="Mariska Accepts VM Invite"
              isCompleted={stepStates.stepC.completed}
              isActive={currentStep === 2}
              isDisabled={currentStep < 2}
              isLoading={loadingStep === 'C'}
              onClick={handleStepCClick}
            />

            <StepButton
              stepNumber={4}
              stepLetter="D"
              label="Draft Lease Docs for Proposal #2"
              isCompleted={stepStates.stepD.completed}
              isActive={currentStep === 3}
              isDisabled={currentStep < 3}
              isLoading={loadingStep === 'D'}
              onClick={handleStepDClick}
            />

            <StepButton
              stepNumber={5}
              stepLetter="E"
              label="VM invite from Guest Jacques"
              isCompleted={stepStates.stepE.completed}
              isActive={currentStep === 4}
              isDisabled={currentStep < 4}
              isLoading={loadingStep === 'E'}
              onClick={handleStepEClick}
            />
          </section>

          {/* Proposals Preview (shown after Step B) */}
          {currentStep >= 2 && simulatedProposals.length > 0 && (
            <section className="simulation-page__proposals">
              <h2>Simulated Proposals</h2>
              <div className="simulation-page__proposals-grid">
                {simulatedProposals.map((proposal, idx) => (
                  <div key={proposal.id} className="simulated-proposal-card">
                    <div className="simulated-proposal-card__guest">
                      <strong>{proposal.guest.firstName} {proposal.guest.lastName}</strong>
                    </div>
                    <div className="simulated-proposal-card__details">
                      <span>Proposal #{idx + 1}</span>
                      <span>${proposal.monthlyRate}/mo</span>
                    </div>
                    <div className="simulated-proposal-card__status">
                      {proposal.vmStatus === 'accepted' && '✓ VM Accepted'}
                      {proposal.leaseStatus === 'draft' && '📄 Lease Drafted'}
                      {proposal.hasIncomingVmInvite && '📨 VM Invite Received'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Completion Message */}
          {currentStep >= 5 && (
            <section className="simulation-page__completion">
              <h2>🎉 Simulation Complete!</h2>
              <p>You've successfully completed all host workflow steps.</p>
              <button
                className="btn btn--secondary"
                onClick={handleResetSimulation}
              >
                Reset & Start Over
              </button>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
```

---

### Phase 6: CSS Styling

**File:** `app/src/islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage.css`

Key styling to match Bubble design:
- Large bordered step buttons with rounded corners
- Numbered step indicators
- Conditional coloring for completed/active/disabled states
- Loading spinner for async operations
- Card layout for proposal previews

---

### Phase 7: Persistence Strategy

#### Option B (localStorage - Recommended for MVP)

```javascript
// In useSimulationHostsideDemoPageLogic.js

const STORAGE_KEY = 'splitlease_simulation_progress';

const saveProgress = (progress) => {
  const data = {
    ...progress,
    savedAt: new Date().toISOString(),
    userId: currentUser?.id
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadProgress = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    // Only restore if same user
    if (data.userId !== currentUser?.id) return null;

    return data;
  } catch {
    return null;
  }
};

const resetProgress = () => {
  localStorage.removeItem(STORAGE_KEY);
  // Reset all state to initial values
};
```

---

## File Checklist

### New Files to Create
- [ ] `app/public/simulation-hostside-demo.html`
- [ ] `app/src/simulation-hostside-demo.jsx`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage.jsx`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/useSimulationHostsideDemoPageLogic.js`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage.css`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/components/StepButton.jsx`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/components/StepButton.css`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/components/StepIndicator.jsx`
- [ ] `app/src/islands/pages/SimulationHostsideDemoPage/components/StepIndicator.css`
- [ ] `app/src/logic/simulators/generateSimulatedGuests.js`
- [ ] `app/src/logic/simulators/generateSimulatedProposals.js`

### Files to Modify
- [ ] `app/src/routes.config.js` (add route)
- [ ] `app/src/lib/auth.js` (add to protected routes if needed)

### Post-Creation
- [ ] Run `bun run generate-routes`
- [ ] Git commit
- [ ] Test locally with `bun run dev`

---

## Gaps & Clarifications Needed

1. **Decision 1 response required:** localStorage vs database for progress?
2. **Decision 2 response required:** Mock data vs real test data?
3. **Decision 3 response required:** Existing auth vs inline login form?
4. **Listing data:** Should we use the logged-in user's actual listing, or always use a simulated listing?
5. **Bubble "between step" text elements:** The requirements doc mentions "T: Step Between A & B" etc. - are these just visual separators or do they show status messages?
6. **Password visibility toggle:** The Bubble page has a password show/hide feature. If using Option A (existing auth), this is irrelevant. Confirm?
7. **"Generate Guest Users" section:** The requirements mention a section below the fold for guest generation. Is this a separate action, or part of Step B?
8. **Dropdown "Choose an option...":** What is this dropdown for? It's mentioned but not explained.

---

## Related Files Reference

| Purpose | Path |
|---------|------|
| Route registry | [routes.config.js](../../app/src/routes.config.js) |
| Auth system | [auth.js](../../app/src/lib/auth.js) |
| Wizard example (complex) | [RentalApplicationWizardModal/](../../app/src/islands/shared/RentalApplicationWizardModal/) |
| Wizard example (simple) | [CreateProposalFlowV2Components/](../../app/src/islands/shared/CreateProposalFlowV2Components/) |
| Day utilities | [dayUtils.js](../../app/src/lib/dayUtils.js) |
| Frontend architecture | [app/CLAUDE.md](../../app/CLAUDE.md) |

---

**Plan Status:** AWAITING DECISIONS ON OPTIONS 1-3 BEFORE IMPLEMENTATION
