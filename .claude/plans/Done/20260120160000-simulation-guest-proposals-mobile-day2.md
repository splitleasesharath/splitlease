# Implementation Plan: Simulation Guest Proposals Mobile Day 2

## Overview

Migrate the Bubble page `simulation-guest-proposals-mobile-day2` to our React + Supabase Edge Functions architecture. This simulation page enables **guests** to walk through the complete proposal acceptance workflow on mobile devices, testing critical guest-side interactions including lease document signing, house manual receipt, and date change management.

**Key Distinction**: This is a **Guest-side** simulation (testing the guest experience), complementing the existing Host-side simulation plan (`20260120143500-simulation-host-mobile-proposals.md`).

---

## Bubble → Split Lease Architecture Mapping

### Key Inconsistencies & Adaptations

The Bubble requirements document describes a complex page with legacy patterns. Here's how we adapt each to our architecture:

| Bubble Pattern | Issue | Our Adaptation |
|----------------|-------|----------------|
| 34 page-level workflows | Tightly coupled UI + logic | **Hollow Component Pattern**: All logic in `useSimulationGuestMobilePageLogic` hook |
| 4 JS2Bubble elements for date calculations | Custom JavaScript in Bubble | Move to **four-layer logic**: `calculators/simulation/` for pure date calculations |
| Login form with readonly fields | Test credentials pre-filled | Use **existing auth system**: Supabase Auth with optional test user toggle |
| 296 backend workflows mentioned | Overwhelming scope | **Scope reduction**: Only implement 6-8 simulation-specific Edge Function actions |
| Complex conditionals on elements | 8+ conditions per button | **Declarative state**: Single `stepStatuses` object drives all visibility |
| "Floppy rating score" tracking | Analytics in Bubble | **Omit**: Not needed for simulation (or use existing analytics if required) |
| Recurring viewport width check | Responsive behavior | **CSS media queries**: Mobile-first design, no JavaScript viewport polling |
| Multiple disabled/duplicate workflows | A/B testing or deprecated | **Clean implementation**: Single workflow per step, no disabled variants |
| JS2B outputlist3 selectors (nightly, oneweekoff, twoweeksoff, threeweeksoff) | Complex proposal filtering | **Processor functions**: `selectProposalByType(proposals, 'nightly')` |

### Workflow Mapping: Bubble → React + Edge Functions

| Bubble Workflow | Our Implementation | Layer |
|-----------------|-------------------|-------|
| Page is loaded (2 instances) | `useEffect` in logic hook | Hook |
| B: Log in is clicked | Existing `auth.js` + `auth-user` Edge Function | Service |
| B: Step A is clicked (Lease Documents signed) | `handleStepA()` → `simulation/step_a_lease_signed` | Hook → Edge Function |
| B: Step B is clicked (Receive House Manual) | `handleStepB()` → `simulation/step_b_house_manual` | Hook → Edge Function |
| B: Step C ending 1 is clicked (Date Change) | `handleStepC()` → `simulation/step_c_date_change` | Hook → Edge Function |
| B: Step D ending 1 is clicked (Lease ending) | `handleStepD()` → `simulation/step_d_lease_end` | Hook → Edge Function |
| B: Step E ending 1 is clicked (Host SMS) | `handleStepE()` → `simulation/step_e_host_sms` | Hook → Edge Function |
| B: Step F is clicked (FINISH) | `handleStepF()` → Show completion, offer cleanup | Hook |
| JS2B proposal selectors | `selectProposalByScheduleType()` in `processors/simulation/` | Processor |
| Recurring viewport check | CSS `@media (max-width: 900px)` | CSS |
| edit all payment records - pretend lease finished | `simulation/simulate_lease_completion` | Edge Function |

### Data Model Mapping: Bubble → Supabase

| Bubble Data Type | Supabase Table | Notes |
|------------------|----------------|-------|
| User | `user` | Existing - add `is_usability_tester` column (already exists per migration) |
| Listing | `listing` | Existing |
| Proposal | `proposal` | Existing - use existing status constants |
| Bookings-Leases | `lease` | Existing |
| House Manual | `house_manual_visit` | Existing - tracks guest access to house manual |
| Date Change Request | `date_change_request` | May need to verify table exists |
| Messages/SMS | `message_thread` | Existing |

---

## Success Criteria

- [ ] Page accessible at `/simulation-guest-mobile` with mobile-first responsive design
- [ ] Guest authentication required (redirects non-authenticated users or non-guests)
- [ ] 6 sequential steps (A-F) with clear progress indication (numbered 7-12 per requirements)
- [ ] Each step simulates real guest actions using existing Edge Functions where possible
- [ ] Loading states between steps with visual feedback (selfie loading animation)
- [ ] "Testing on mobile" confirmation checkbox before starting
- [ ] Current user email display and date/time display
- [ ] Support for proposal selection by schedule type (nightly, weekly, monthly)
- [ ] Warning message about keeping page open during test
- [ ] Cleanup option to reset simulation state after completion

---

## Architecture

### File Structure

```
app/
├── public/
│   └── simulation-guest-mobile.html          # HTML entry point
├── src/
│   ├── simulation-guest-mobile.jsx           # React entry point
│   ├── islands/pages/
│   │   └── SimulationGuestMobilePage/
│   │       ├── SimulationGuestMobilePage.jsx       # Hollow page component
│   │       ├── SimulationGuestMobilePage.css       # Mobile-first styles
│   │       ├── useSimulationGuestMobilePageLogic.js # All business logic
│   │       └── components/
│   │           ├── StepIndicator.jsx               # 6-step progress (A-F)
│   │           ├── MobileConfirmation.jsx          # Pre-start checkbox
│   │           ├── WarningBanner.jsx               # "Keep page open" warning
│   │           ├── UserInfoHeader.jsx              # Email + datetime display
│   │           ├── LoginForm.jsx                   # Optional test login
│   │           ├── StepALeaseDocuments.jsx         # Step A: Lease signed
│   │           ├── StepBHouseManual.jsx            # Step B: House manual
│   │           ├── StepCDateChange.jsx             # Step C: Date change
│   │           ├── StepDLeaseEnding.jsx            # Step D: Lease ending
│   │           ├── StepEHostSms.jsx                # Step E: Host SMS
│   │           ├── StepFFinish.jsx                 # Step F: Complete
│   │           ├── LoadingOverlay.jsx              # "Selfie" loading state
│   │           └── SimulationComplete.jsx          # Final summary
│   ├── logic/
│   │   ├── calculators/simulation/
│   │   │   └── calculateSimulationDates.js         # Date calculations (from JS2B)
│   │   ├── rules/simulation/
│   │   │   └── canProgressToStep.js                # Step progression rules
│   │   └── processors/simulation/
│   │       └── selectProposalByScheduleType.js     # Proposal selector (replaces JS2B)
│   └── lib/
│       └── simulationGuestService.js               # Frontend API service

supabase/functions/
└── simulation-guest/                               # Edge Function
    ├── index.ts                                    # Main router
    ├── deno.json                                   # Deno config
    └── actions/
        ├── initializeSimulation.ts                 # Load test data
        ├── stepALeaseDocuments.ts                  # Simulate lease signing
        ├── stepBHouseManual.ts                     # Grant house manual access
        ├── stepCDateChange.ts                      # Simulate date change request
        ├── stepDLeaseEnding.ts                     # Simulate lease nearing end
        ├── stepEHostSms.ts                         # Simulate host SMS receipt
        ├── simulateLeaseCompletion.ts              # Mark lease as finished
        └── cleanup.ts                              # Reset simulation state
```

### Component Hierarchy

```
SimulationGuestMobilePage.jsx (Hollow)
├── Header.jsx (shared)
├── WarningBanner.jsx
├── UserInfoHeader.jsx
├── LoginForm.jsx (only if not logged in)
├── MobileConfirmation.jsx
├── StepIndicator.jsx
├── LoadingOverlay.jsx (conditional)
├── StepALeaseDocuments.jsx
├── StepBHouseManual.jsx
├── StepCDateChange.jsx
├── StepDLeaseEnding.jsx
├── StepEHostSms.jsx
├── StepFFinish.jsx
├── SimulationComplete.jsx (after step F)
└── Footer.jsx (shared)
```

---

## Implementation Steps

### Step 1: Create Route Definition

**Files:** `app/src/routes.config.js`

**Changes:**
```javascript
// Add to routes array
{
  path: '/simulation-guest-mobile',
  file: 'simulation-guest-mobile.html',
  aliases: ['/simulation-guest-mobile.html', '/simulation-guest-proposals-mobile-day2'],
  protected: true,  // Guest-only access
  cloudflareInternal: true,
  internalName: 'simulation-guest-mobile-view',
  hasDynamicSegment: false
}
```

**Validation:** Run `bun run generate-routes` and verify `_redirects` and `_routes.json` are updated

---

### Step 2: Create HTML Entry Point

**Files:** `app/public/simulation-guest-mobile.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Guest Simulation - Split Lease</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/simulation-guest-mobile.jsx"></script>
</body>
</html>
```

---

### Step 3: Create React Entry Point

**Files:** `app/src/simulation-guest-mobile.jsx`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import SimulationGuestMobilePage from './islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<SimulationGuestMobilePage />);
```

---

### Step 4: Create Page Logic Hook

**Files:** `app/src/islands/pages/SimulationGuestMobilePage/useSimulationGuestMobilePageLogic.js`

```javascript
/**
 * Simulation Guest Mobile Page Logic Hook
 *
 * Manages all state and business logic for the guest simulation workflow.
 * Follows hollow component pattern - page component contains ONLY JSX.
 *
 * State:
 * - authState: { isLoading, isAuthenticated, user, userType }
 * - currentStep: 0-6 (0 = pre-start, 1-6 = steps A-F)
 * - stepStatuses: { A: 'pending'|'active'|'completed', ... }
 * - simulationData: { proposals, selectedProposal, lease, houseManual }
 * - mobileConfirmed: boolean
 * - isLoading: boolean
 * - loadingMessage: string
 * - error: string | null
 *
 * Handlers:
 * - handleLogin(email, password)
 * - handleMobileConfirmChange(checked)
 * - handleStartSimulation()
 * - handleStepA() - Lease documents signed
 * - handleStepB() - Receive house manual
 * - handleStepC() - Date change request
 * - handleStepD() - Lease reaching end
 * - handleStepE() - Host sent SMS
 * - handleStepF() - Finish simulation
 * - handleCleanup()
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser, getUserType } from '../../../lib/auth.js';
import * as simulationService from '../../../lib/simulationGuestService.js';
import { canProgressToStep } from '../../../logic/rules/simulation/canProgressToStep.js';
import { selectProposalByScheduleType } from '../../../logic/processors/simulation/selectProposalByScheduleType.js';

export function useSimulationGuestMobilePageLogic() {
  // Auth state
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    userType: null
  });

  // Simulation state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({
    A: 'pending', B: 'pending', C: 'pending',
    D: 'pending', E: 'pending', F: 'pending'
  });
  const [simulationData, setSimulationData] = useState({
    simulationId: null,
    proposals: [],
    selectedProposal: null,
    lease: null,
    houseManual: null,
    dateChangeRequest: null
  });

  // UI state
  const [mobileConfirmed, setMobileConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  // Current datetime for display
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Auth check on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const hasAuth = await checkAuthStatus();
        if (!hasAuth) {
          setAuthState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
          return;
        }

        const userData = await validateTokenAndFetchUser();
        const userType = getUserType();

        // Redirect non-guests
        if (userType !== 'Guest') {
          window.location.href = '/';
          return;
        }

        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user: userData,
          userType
        });
      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    }

    checkAuth();
  }, []);

  // Update datetime every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Step handlers
  const handleStartSimulation = useCallback(async () => {
    if (!mobileConfirmed) return;

    setIsLoading(true);
    setLoadingMessage('Initializing simulation...');
    setError(null);

    try {
      // Initialize simulation - load or create test data
      const initData = await simulationService.initializeSimulation({
        guestId: authState.user._id
      });

      setSimulationData(prev => ({
        ...prev,
        simulationId: initData.simulationId,
        proposals: initData.proposals
      }));

      setCurrentStep(1);
      setStepStatuses(prev => ({ ...prev, A: 'active' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [mobileConfirmed, authState.user]);

  const handleStepA = useCallback(async () => {
    if (!canProgressToStep('A', stepStatuses)) return;

    setIsLoading(true);
    setLoadingMessage('Signing lease documents...');

    try {
      // Select proposal and simulate signing
      const selectedProposal = selectProposalByScheduleType(
        simulationData.proposals,
        'nightly' // or based on user selection
      );

      const result = await simulationService.stepALeaseDocuments({
        simulationId: simulationData.simulationId,
        proposalId: selectedProposal._id
      });

      setSimulationData(prev => ({
        ...prev,
        selectedProposal,
        lease: result.lease
      }));

      setStepStatuses(prev => ({ ...prev, A: 'completed', B: 'active' }));
      setCurrentStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData, stepStatuses]);

  // ... similar handlers for steps B-F

  const handleCleanup = useCallback(async () => {
    if (!simulationData.simulationId) return;

    setIsLoading(true);
    setLoadingMessage('Cleaning up test data...');

    try {
      await simulationService.cleanup({
        simulationId: simulationData.simulationId
      });

      // Reset all state
      setCurrentStep(0);
      setStepStatuses({
        A: 'pending', B: 'pending', C: 'pending',
        D: 'pending', E: 'pending', F: 'pending'
      });
      setSimulationData({
        simulationId: null,
        proposals: [],
        selectedProposal: null,
        lease: null,
        houseManual: null,
        dateChangeRequest: null
      });
      setMobileConfirmed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulationData.simulationId]);

  return {
    // Auth state
    authState,

    // Simulation state
    currentStep,
    stepStatuses,
    simulationData,

    // UI state
    mobileConfirmed,
    isLoading,
    loadingMessage,
    error,
    currentDateTime,

    // Handlers
    handleMobileConfirmChange: setMobileConfirmed,
    handleStartSimulation,
    handleStepA,
    handleStepB: () => {}, // TODO: Implement
    handleStepC: () => {}, // TODO: Implement
    handleStepD: () => {}, // TODO: Implement
    handleStepE: () => {}, // TODO: Implement
    handleStepF: () => {}, // TODO: Implement
    handleCleanup,
    clearError: () => setError(null)
  };
}
```

---

### Step 5: Create Page Component (Hollow)

**Files:** `app/src/islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage.jsx`

```javascript
/**
 * SimulationGuestMobilePage - Guest simulation workflow
 *
 * HOLLOW COMPONENT: Contains ONLY JSX rendering.
 * ALL business logic delegated to useSimulationGuestMobilePageLogic hook.
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { ToastProvider } from '../../shared/Toast.jsx';
import { useSimulationGuestMobilePageLogic } from './useSimulationGuestMobilePageLogic.js';
import StepIndicator from './components/StepIndicator.jsx';
import MobileConfirmation from './components/MobileConfirmation.jsx';
import WarningBanner from './components/WarningBanner.jsx';
import UserInfoHeader from './components/UserInfoHeader.jsx';
import LoginForm from './components/LoginForm.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import StepALeaseDocuments from './components/StepALeaseDocuments.jsx';
import StepBHouseManual from './components/StepBHouseManual.jsx';
import StepCDateChange from './components/StepCDateChange.jsx';
import StepDLeaseEnding from './components/StepDLeaseEnding.jsx';
import StepEHostSms from './components/StepEHostSms.jsx';
import StepFFinish from './components/StepFFinish.jsx';
import SimulationComplete from './components/SimulationComplete.jsx';
import './SimulationGuestMobilePage.css';

export default function SimulationGuestMobilePage() {
  const {
    authState,
    currentStep,
    stepStatuses,
    simulationData,
    mobileConfirmed,
    isLoading,
    loadingMessage,
    error,
    currentDateTime,
    handleMobileConfirmChange,
    handleStartSimulation,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepD,
    handleStepE,
    handleStepF,
    handleCleanup,
    clearError
  } = useSimulationGuestMobilePageLogic();

  // Auth loading state
  if (authState.isLoading) {
    return (
      <div className="simulation-page">
        <Header />
        <main className="simulation-main">
          <div className="simulation-loading">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated - show login form
  if (!authState.isAuthenticated) {
    return (
      <ToastProvider>
        <div className="simulation-page">
          <Header />
          <main className="simulation-main">
            <WarningBanner />
            <LoginForm />
          </main>
          <Footer />
        </div>
      </ToastProvider>
    );
  }

  // Simulation complete
  if (stepStatuses.F === 'completed') {
    return (
      <ToastProvider>
        <div className="simulation-page">
          <Header />
          <main className="simulation-main">
            <SimulationComplete
              simulationData={simulationData}
              onCleanup={handleCleanup}
              isLoading={isLoading}
            />
          </main>
          <Footer />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="simulation-page">
        <Header />
        <main className="simulation-main">
          {/* Loading overlay */}
          {isLoading && <LoadingOverlay message={loadingMessage} />}

          {/* Warning banner */}
          <WarningBanner />

          {/* User info header */}
          <UserInfoHeader
            userEmail={authState.user?.email}
            currentDateTime={currentDateTime}
          />

          {/* Mobile confirmation (only before starting) */}
          {currentStep === 0 && (
            <MobileConfirmation
              checked={mobileConfirmed}
              onChange={handleMobileConfirmChange}
              onStart={handleStartSimulation}
              disabled={isLoading}
            />
          )}

          {/* Step indicator (only after starting) */}
          {currentStep > 0 && (
            <StepIndicator
              currentStep={currentStep}
              stepStatuses={stepStatuses}
            />
          )}

          {/* Error display */}
          {error && (
            <div className="simulation-error">
              <p>{error}</p>
              <button onClick={clearError}>Dismiss</button>
            </div>
          )}

          {/* Step components */}
          {currentStep >= 1 && (
            <StepALeaseDocuments
              isActive={stepStatuses.A === 'active'}
              status={stepStatuses.A}
              onAction={handleStepA}
              disabled={isLoading || stepStatuses.A !== 'active'}
              stepNumber={7}
            />
          )}

          {currentStep >= 2 && (
            <StepBHouseManual
              isActive={stepStatuses.B === 'active'}
              status={stepStatuses.B}
              onAction={handleStepB}
              disabled={isLoading || stepStatuses.B !== 'active'}
              houseManual={simulationData.houseManual}
              stepNumber={8}
            />
          )}

          {currentStep >= 3 && (
            <StepCDateChange
              isActive={stepStatuses.C === 'active'}
              status={stepStatuses.C}
              onAction={handleStepC}
              disabled={isLoading || stepStatuses.C !== 'active'}
              stepNumber={9}
            />
          )}

          {currentStep >= 4 && (
            <StepDLeaseEnding
              isActive={stepStatuses.D === 'active'}
              status={stepStatuses.D}
              onAction={handleStepD}
              disabled={isLoading || stepStatuses.D !== 'active'}
              lease={simulationData.lease}
              stepNumber={10}
            />
          )}

          {currentStep >= 5 && (
            <StepEHostSms
              isActive={stepStatuses.E === 'active'}
              status={stepStatuses.E}
              onAction={handleStepE}
              disabled={isLoading || stepStatuses.E !== 'active'}
              stepNumber={11}
            />
          )}

          {currentStep >= 6 && (
            <StepFFinish
              isActive={stepStatuses.F === 'active'}
              status={stepStatuses.F}
              onAction={handleStepF}
              disabled={isLoading || stepStatuses.F !== 'active'}
              stepNumber={12}
            />
          )}
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
```

---

### Step 6: Create Step Indicator Component

**Files:** `app/src/islands/pages/SimulationGuestMobilePage/components/StepIndicator.jsx`

```javascript
/**
 * StepIndicator - 6-step progress indicator (A-F)
 *
 * Shows steps numbered 7-12 per the original requirements doc
 * (Day 2 of simulation continues numbering from Day 1)
 */

export default function StepIndicator({ currentStep, stepStatuses }) {
  const steps = [
    { id: 'A', number: 7, label: 'Lease Signed' },
    { id: 'B', number: 8, label: 'House Manual' },
    { id: 'C', number: 9, label: 'Date Change' },
    { id: 'D', number: 10, label: 'Lease Ending' },
    { id: 'E', number: 11, label: 'Host SMS' },
    { id: 'F', number: 12, label: 'Finish' }
  ];

  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const status = stepStatuses[step.id];
        return (
          <div key={step.id} className="step-indicator__item">
            <div className={`step-indicator__circle step-indicator__circle--${status}`}>
              {status === 'completed' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <span className="step-indicator__label">{step.label}</span>
            {index < steps.length - 1 && <div className="step-indicator__connector" />}
          </div>
        );
      })}
    </div>
  );
}
```

---

### Step 7: Create Four-Layer Logic Functions

**Files:**
- `app/src/logic/calculators/simulation/calculateSimulationDates.js`
- `app/src/logic/rules/simulation/canProgressToStep.js`
- `app/src/logic/processors/simulation/selectProposalByScheduleType.js`

#### Calculator: calculateSimulationDates.js

```javascript
/**
 * calculateSimulationDates
 *
 * Pure date calculations for simulation scenarios.
 * Replaces JS2Bubble date calculation logic.
 */

/**
 * Calculate proposal dates offset by weeks
 * @param {Date} baseDate - Starting date
 * @param {number} weeksOffset - Number of weeks to offset (1, 2, or 3)
 * @returns {Object} - { startDate, endDate }
 */
export function calculateProposalDatesWithOffset(baseDate, weeksOffset) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() + (weeksOffset * 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 28); // 4-week lease

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * Calculate nightly proposal dates (immediate start)
 * @param {Date} baseDate - Starting date
 * @returns {Object} - { startDate, endDate }
 */
export function calculateNightlyProposalDates(baseDate) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() + 1); // Tomorrow

  const end = new Date(start);
  end.setDate(end.getDate() + 7); // 1-week stay

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}
```

#### Rule: canProgressToStep.js

```javascript
/**
 * canProgressToStep
 *
 * Business rules for step progression.
 */

/**
 * Check if user can progress to/activate a given step
 * @param {string} stepId - 'A', 'B', 'C', 'D', 'E', or 'F'
 * @param {Object} stepStatuses - Current status of all steps
 * @returns {boolean}
 */
export function canProgressToStep(stepId, stepStatuses) {
  // Step A can always be started if simulation has begun
  if (stepId === 'A') {
    return stepStatuses.A === 'active';
  }

  // Map step dependencies
  const dependencies = {
    B: 'A',
    C: 'B',
    D: 'C',
    E: 'D',
    F: 'E'
  };

  const previousStep = dependencies[stepId];

  // Previous step must be completed and current step must be active
  return stepStatuses[previousStep] === 'completed' && stepStatuses[stepId] === 'active';
}

/**
 * Check if simulation is complete
 * @param {Object} stepStatuses
 * @returns {boolean}
 */
export function isSimulationComplete(stepStatuses) {
  return stepStatuses.F === 'completed';
}
```

#### Processor: selectProposalByScheduleType.js

```javascript
/**
 * selectProposalByScheduleType
 *
 * Replaces JS2Bubble proposal selector logic.
 * Filters proposals by schedule type (nightly, weekly, monthly).
 */

/**
 * Select a proposal by its schedule type
 * @param {Array} proposals - Array of proposal objects
 * @param {string} scheduleType - 'nightly' | 'weekly' | 'monthly' | 'oneweekoff' | 'twoweeksoff' | 'threeweeksoff'
 * @returns {Object|null} - Selected proposal or null
 */
export function selectProposalByScheduleType(proposals, scheduleType) {
  if (!proposals || proposals.length === 0) return null;

  // Map schedule type to filter criteria
  const typeFilters = {
    nightly: (p) => p.schedule_type === 'nightly' || p.days_per_week === 7,
    weekly: (p) => p.schedule_type === 'weekly' || (p.days_per_week >= 3 && p.days_per_week < 7),
    monthly: (p) => p.schedule_type === 'monthly' || p.weeks >= 4,
    oneweekoff: (p) => p.weeks_offset === 1,
    twoweeksoff: (p) => p.weeks_offset === 2,
    threeweeksoff: (p) => p.weeks_offset === 3
  };

  const filter = typeFilters[scheduleType];
  if (!filter) {
    console.warn(`Unknown schedule type: ${scheduleType}`);
    return proposals[0]; // Fallback to first proposal
  }

  const matched = proposals.find(filter);
  return matched || proposals[0]; // Fallback to first if no match
}

/**
 * Group proposals by schedule type
 * @param {Array} proposals
 * @returns {Object} - { nightly: [], weekly: [], monthly: [] }
 */
export function groupProposalsByScheduleType(proposals) {
  return {
    nightly: proposals.filter(p => p.schedule_type === 'nightly'),
    weekly: proposals.filter(p => p.schedule_type === 'weekly'),
    monthly: proposals.filter(p => p.schedule_type === 'monthly')
  };
}
```

---

### Step 8: Create Frontend Service

**Files:** `app/src/lib/simulationGuestService.js`

```javascript
/**
 * simulationGuestService
 *
 * Frontend API client for guest simulation Edge Function.
 * All functions follow the action-based pattern.
 */

import { supabase } from './supabase.js';

const FUNCTION_NAME = 'simulation-guest';

/**
 * Initialize simulation for guest
 * @param {Object} params
 * @param {string} params.guestId
 * @returns {Promise<Object>} - { simulationId, proposals }
 */
export async function initializeSimulation({ guestId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'initialize',
      payload: { guestId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to initialize simulation');
  return data.data;
}

/**
 * Step A: Simulate lease document signing
 * @param {Object} params
 * @param {string} params.simulationId
 * @param {string} params.proposalId
 * @returns {Promise<Object>} - { lease }
 */
export async function stepALeaseDocuments({ simulationId, proposalId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_a_lease_documents',
      payload: { simulationId, proposalId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step A');
  return data.data;
}

/**
 * Step B: Grant house manual access
 * @param {Object} params
 * @param {string} params.simulationId
 * @param {string} params.leaseId
 * @returns {Promise<Object>} - { houseManual }
 */
export async function stepBHouseManual({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_b_house_manual',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step B');
  return data.data;
}

/**
 * Step C: Simulate host-led date change
 * @param {Object} params
 * @param {string} params.simulationId
 * @param {string} params.leaseId
 * @returns {Promise<Object>} - { dateChangeRequest }
 */
export async function stepCDateChange({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_c_date_change',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step C');
  return data.data;
}

/**
 * Step D: Simulate lease reaching end
 * @param {Object} params
 * @param {string} params.simulationId
 * @param {string} params.leaseId
 * @returns {Promise<Object>}
 */
export async function stepDLeaseEnding({ simulationId, leaseId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_d_lease_ending',
      payload: { simulationId, leaseId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step D');
  return data.data;
}

/**
 * Step E: Simulate host SMS notification
 * @param {Object} params
 * @param {string} params.simulationId
 * @returns {Promise<Object>}
 */
export async function stepEHostSms({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_e_host_sms',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete Step E');
  return data.data;
}

/**
 * Step F: Complete simulation
 * @param {Object} params
 * @param {string} params.simulationId
 * @returns {Promise<Object>}
 */
export async function stepFComplete({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'step_f_complete',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to complete simulation');
  return data.data;
}

/**
 * Cleanup simulation data
 * @param {Object} params
 * @param {string} params.simulationId
 * @returns {Promise<Object>}
 */
export async function cleanup({ simulationId }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'cleanup',
      payload: { simulationId }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Failed to cleanup simulation');
  return data.data;
}
```

---

### Step 9: Create Edge Function

**Files:** `supabase/functions/simulation-guest/index.ts`

```typescript
/**
 * Simulation Guest Edge Function
 *
 * Handles all guest-side simulation actions.
 * Uses action-based routing pattern.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

const ALLOWED_ACTIONS = [
  'initialize',
  'step_a_lease_documents',
  'step_b_house_manual',
  'step_c_date_change',
  'step_d_lease_ending',
  'step_e_host_sms',
  'step_f_complete',
  'cleanup'
] as const;

type Action = typeof ALLOWED_ACTIONS[number];

console.log('[simulation-guest] Edge Function started');

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as Action;
    const payload = body.payload || {};

    // Validate action
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let result: unknown;

    switch (action) {
      case 'initialize': {
        const { handleInitialize } = await import("./actions/initialize.ts");
        result = await handleInitialize(supabase, payload);
        break;
      }
      case 'step_a_lease_documents': {
        const { handleStepA } = await import("./actions/stepALeaseDocuments.ts");
        result = await handleStepA(supabase, payload);
        break;
      }
      case 'step_b_house_manual': {
        const { handleStepB } = await import("./actions/stepBHouseManual.ts");
        result = await handleStepB(supabase, payload);
        break;
      }
      case 'step_c_date_change': {
        const { handleStepC } = await import("./actions/stepCDateChange.ts");
        result = await handleStepC(supabase, payload);
        break;
      }
      case 'step_d_lease_ending': {
        const { handleStepD } = await import("./actions/stepDLeaseEnding.ts");
        result = await handleStepD(supabase, payload);
        break;
      }
      case 'step_e_host_sms': {
        const { handleStepE } = await import("./actions/stepEHostSms.ts");
        result = await handleStepE(supabase, payload);
        break;
      }
      case 'step_f_complete': {
        const { handleStepF } = await import("./actions/stepFComplete.ts");
        result = await handleStepF(supabase, payload);
        break;
      }
      case 'cleanup': {
        const { handleCleanup } = await import("./actions/cleanup.ts");
        result = await handleCleanup(supabase, payload);
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[simulation-guest] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Step 10: Create CSS Styles (Mobile-First)

**Files:** `app/src/islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage.css`

```css
/* Mobile-first design for guest simulation */
.simulation-page {
  min-height: 100vh;
  background: var(--color-gray-50);
}

.simulation-main {
  max-width: 100%;
  padding: 1rem;
  padding-bottom: 4rem;
}

/* Warning banner */
.warning-banner {
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.warning-banner__text {
  color: var(--color-warning-800);
  font-size: 0.875rem;
  font-weight: 500;
}

/* User info header */
.user-info-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-info-header__email {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.user-info-header__datetime {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* Mobile confirmation */
.mobile-confirmation {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.mobile-confirmation__checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.mobile-confirmation__checkbox input {
  width: 1.25rem;
  height: 1.25rem;
}

.mobile-confirmation__checkbox label {
  font-size: 0.9375rem;
  color: var(--color-text-primary);
}

.mobile-confirmation__button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.mobile-confirmation__button:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
}

.mobile-confirmation__button:not(:disabled):hover {
  background: var(--color-primary-dark);
}

/* Step indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1rem 0.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

.step-indicator__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  min-width: 50px;
  position: relative;
}

.step-indicator__circle {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.step-indicator__circle--pending {
  background: var(--color-gray-200);
  color: var(--color-gray-500);
}

.step-indicator__circle--active {
  background: var(--color-primary);
  color: white;
  animation: pulse 2s infinite;
}

.step-indicator__circle--completed {
  background: var(--color-success);
  color: white;
}

.step-indicator__label {
  font-size: 0.625rem;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
}

.step-indicator__connector {
  position: absolute;
  top: 1rem;
  left: calc(50% + 1rem);
  width: calc(100% - 2rem);
  height: 2px;
  background: var(--color-gray-200);
}

/* Step cards */
.step-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  opacity: 0.6;
  transition: opacity 0.3s, border-color 0.3s;
}

.step-card--active {
  opacity: 1;
  border: 2px solid var(--color-primary);
}

.step-card--completed {
  opacity: 1;
  border-left: 4px solid var(--color-success);
}

.step-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.step-card__number {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.step-card__title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.step-card__description {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.step-card__button {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.step-card__button:disabled {
  background: var(--color-gray-300);
  cursor: not-allowed;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-overlay__spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--color-gray-200);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-overlay__message {
  margin-top: 1rem;
  color: var(--color-text-secondary);
}

/* Error display */
.simulation-error {
  background: var(--color-error-50);
  border: 1px solid var(--color-error-200);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.simulation-error p {
  color: var(--color-error-700);
  margin-bottom: 0.5rem;
}

.simulation-error button {
  background: transparent;
  color: var(--color-error-700);
  border: 1px solid var(--color-error-300);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

/* Completion screen */
.simulation-complete {
  text-align: center;
  padding: 2rem 1rem;
}

.simulation-complete__icon {
  width: 4rem;
  height: 4rem;
  background: var(--color-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.simulation-complete__icon svg {
  color: white;
  width: 2rem;
  height: 2rem;
}

.simulation-complete__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.simulation-complete__message {
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}

/* Tablet and desktop adjustments */
@media (min-width: 768px) {
  .simulation-main {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }

  .step-indicator {
    justify-content: space-evenly;
  }

  .step-indicator__item {
    min-width: 80px;
  }

  .step-indicator__label {
    font-size: 0.75rem;
  }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GUEST SIMULATION DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRE-START                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                                │
│  │ Auth Check      │ ──→ │ Guest Only      │ ──→ Show simulation UI        │
│  │ (useEffect)     │     │ Validation      │     or redirect               │
│  └─────────────────┘     └─────────────────┘                                │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ Mobile Confirm  │ ──→ Enable "Start Simulation" button                  │
│  │ Checkbox        │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  INITIALIZATION                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Start Simulation│ ──→ │ Edge Function   │ ──→ │ Load/Create     │       │
│  │ Button          │     │ initialize      │     │ test proposals  │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP A: Lease Documents Signed                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Select proposal │ ──→ │ step_a_lease_   │ ──→ │ Create lease    │       │
│  │ + Click "Sign"  │     │ documents       │     │ from proposal   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP B: Receive House Manual                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "Receive  │ ──→ │ step_b_house_   │ ──→ │ Grant house     │       │
│  │ House Manual"   │     │ manual          │     │ manual access   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP C: Date Change (Host-Led)                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "Accept   │ ──→ │ step_c_date_    │ ──→ │ Create date     │       │
│  │ Date Change"    │     │ change          │     │ change request  │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP D: Lease Reaching End                                                 │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "View     │ ──→ │ step_d_lease_   │ ──→ │ Update lease    │       │
│  │ Ending Lease"   │     │ ending          │     │ end_date near   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP E: Host Sent SMS                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "Read     │ ──→ │ step_e_host_    │ ──→ │ Mark SMS as     │       │
│  │ Host Message"   │     │ sms             │     │ received/read   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  STEP F: FINISH                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "Finish   │ ──→ │ step_f_         │ ──→ │ Mark simulation │       │
│  │ Simulation"     │     │ complete        │     │ complete        │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  CLEANUP                                                                    │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Click "Clean    │ ──→ │ cleanup         │ ──→ │ Reset all       │       │
│  │ Up Test Data"   │     │ (simulation_id) │     │ simulation data │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Guest has no existing proposals | Edge function creates test proposals on initialize |
| User navigates away mid-simulation | Store state in localStorage, resume on return |
| Step action fails | Show error, stay on current step, allow retry |
| Session expires during simulation | Detect via 401 response, prompt re-login |
| Mobile network flaky | Show offline indicator, queue actions for retry |
| Cleanup fails | Show partial cleanup error, log to Slack |
| Multiple browser tabs | Use simulationId to isolate sessions |

---

## Testing Checklist

### Manual Testing

- [ ] Page loads on mobile devices (iPhone Safari, Android Chrome)
- [ ] Authentication redirects work correctly (redirect non-guests)
- [ ] Warning banner displays prominently
- [ ] User email and datetime display correctly
- [ ] Mobile confirmation checkbox enables start button
- [ ] Each step (A-F) completes successfully
- [ ] Loading overlay displays between steps
- [ ] Error states display and retry works
- [ ] Step numbers show 7-12 (not 1-6) per requirements
- [ ] Completion screen shows with cleanup option
- [ ] Cleanup removes simulation state

### Database Verification

- [ ] Test proposals created with simulation_id tag
- [ ] Lease record created with correct relationships
- [ ] House manual access granted to guest
- [ ] Date change request recorded
- [ ] Cleanup removes all tagged records

---

## Dependencies & Prerequisites

### Prerequisites

- [ ] Verify `house_manual_visit` table exists
- [ ] Verify `date_change_request` table exists (or create migration)
- [ ] Existing `simulation` Edge Function can be extended OR create separate `simulation-guest` function
- [ ] Guest authentication flow works on mobile

### External Dependencies

- None (uses existing Supabase infrastructure)

---

## Rollback Strategy

1. **Route Removal**: Remove route from `routes.config.js`, regenerate
2. **Frontend Files**: Delete `SimulationGuestMobilePage/` directory
3. **Edge Function**: Delete `supabase/functions/simulation-guest/` directory (if separate)
4. **Service File**: Delete `lib/simulationGuestService.js`
5. **Logic Files**: Delete `logic/*/simulation/` directories

No database migrations required - uses existing tables.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test data pollution | Medium | Low | Use simulation_id tagging, cleanup action |
| Edge Function timeout | Low | Medium | Break operations into smaller chunks |
| Mobile CSS compatibility | Medium | Low | Test on multiple devices, use CSS variables |
| Auth race conditions | Low | High | Follow established auth pattern |
| Confusion with Host simulation | Medium | Medium | Clear naming, separate routes, distinct UI |

---

## File Summary

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/public/simulation-guest-mobile.html` | HTML entry point |
| `app/src/simulation-guest-mobile.jsx` | React entry point |
| `app/src/islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage.jsx` | Page component |
| `app/src/islands/pages/SimulationGuestMobilePage/useSimulationGuestMobilePageLogic.js` | Page logic hook |
| `app/src/islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage.css` | Page styles |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepIndicator.jsx` | Progress indicator |
| `app/src/islands/pages/SimulationGuestMobilePage/components/MobileConfirmation.jsx` | Pre-start confirmation |
| `app/src/islands/pages/SimulationGuestMobilePage/components/WarningBanner.jsx` | Warning message |
| `app/src/islands/pages/SimulationGuestMobilePage/components/UserInfoHeader.jsx` | User info display |
| `app/src/islands/pages/SimulationGuestMobilePage/components/LoginForm.jsx` | Login form |
| `app/src/islands/pages/SimulationGuestMobilePage/components/LoadingOverlay.jsx` | Loading state |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepALeaseDocuments.jsx` | Step A component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepBHouseManual.jsx` | Step B component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepCDateChange.jsx` | Step C component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepDLeaseEnding.jsx` | Step D component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepEHostSms.jsx` | Step E component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/StepFFinish.jsx` | Step F component |
| `app/src/islands/pages/SimulationGuestMobilePage/components/SimulationComplete.jsx` | Completion screen |
| `app/src/logic/calculators/simulation/calculateSimulationDates.js` | Date calculations |
| `app/src/logic/rules/simulation/canProgressToStep.js` | Step progression rules |
| `app/src/logic/processors/simulation/selectProposalByScheduleType.js` | Proposal selector |
| `app/src/lib/simulationGuestService.js` | Frontend API service |
| `supabase/functions/simulation-guest/index.ts` | Edge Function entry |
| `supabase/functions/simulation-guest/deno.json` | Deno config |
| `supabase/functions/simulation-guest/actions/initialize.ts` | Initialize action |
| `supabase/functions/simulation-guest/actions/stepALeaseDocuments.ts` | Step A handler |
| `supabase/functions/simulation-guest/actions/stepBHouseManual.ts` | Step B handler |
| `supabase/functions/simulation-guest/actions/stepCDateChange.ts` | Step C handler |
| `supabase/functions/simulation-guest/actions/stepDLeaseEnding.ts` | Step D handler |
| `supabase/functions/simulation-guest/actions/stepEHostSms.ts` | Step E handler |
| `supabase/functions/simulation-guest/actions/stepFComplete.ts` | Step F handler |
| `supabase/functions/simulation-guest/actions/cleanup.ts` | Cleanup handler |

### Files to Modify

| File Path | Change |
|-----------|--------|
| `app/src/routes.config.js` | Add route definition |

---

## Critical File References

### Existing Files to Reference (Patterns)

| Purpose | File Path |
|---------|-----------|
| Route Registration | `app/src/routes.config.js` |
| Page Component Pattern | `app/src/islands/pages/GuestProposalsPage.jsx` |
| Logic Hook Pattern | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` |
| Step Progress Component | `app/src/islands/pages/CreateSuggestedProposalPage/components/StepProgress.jsx` |
| Proposal Status Config | `app/src/logic/constants/proposalStatuses.js` |
| Proposal Rules | `app/src/logic/rules/proposals/proposalRules.js` |
| Auth Utilities | `app/src/lib/auth.js` |
| Supabase Client | `app/src/lib/supabase.js` |
| Edge Function Pattern | `supabase/functions/proposal/index.ts` |
| CSS Variables | `app/src/styles/variables.css` |

### Documentation References

| Purpose | File Path |
|---------|-----------|
| Architecture Guide | `.claude/Documentation/miniCLAUDE.md` |
| Frontend CLAUDE.md | `app/CLAUDE.md` |
| Supabase CLAUDE.md | `supabase/CLAUDE.md` |
| Host Simulation Plan | `.claude/plans/New/20260120143500-simulation-host-mobile-proposals.md` |

---

**Plan Version**: 1.0
**Created**: 2026-01-20 16:00:00
**Author**: Claude (implementation-planner)
