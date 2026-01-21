# Simulation Guest Actions Page - Migration Plan

**Date:** 2026-01-20
**Source:** Bubble page `simulation-gsm-vm-housemanual`
**Target:** React + Supabase Islands Architecture
**Status:** PLANNING
**Estimated Effort:** 40-60 hours

---

## Executive Summary

This plan adapts the Bubble "Simulated Guest Actions" testing page to our React + Supabase architecture. The page enables testers to simulate the complete guest rental journey through 5 sequential steps:

| Step | Bubble Description | Our Adaptation |
|------|-------------------|----------------|
| **A** | Mark as usability tester & Autofill Rental App | Set test user flag + auto-populate proposal form |
| **B** | Virtual Meeting Invitations from Hosts 1 & 2 | Trigger mock meeting invitations via Edge Function |
| **C** | Counteroffer Simulation from Host 3 | Create counteroffer proposal record |
| **D** | Host Accepts & Lease Draft & House Manual | Accept proposal + trigger lease workflow |
| **E** | Signed Lease & Initial Payment | Complete lease signing flow |

---

## Architecture Adaptation Strategy

### Key Differences: Bubble vs Our Stack

| Aspect | Bubble Original | Our Adaptation |
|--------|-----------------|----------------|
| **Data Layer** | Bubble Database (primary) | Supabase (replica) + Bubble via Edge Functions |
| **Frontend** | Bubble's visual programming | React Islands Architecture |
| **Workflows** | 19 Bubble workflows | Edge Functions + Frontend hooks |
| **Backend** | 296 Backend workflows | Edge Functions with queue-based sync |
| **State** | Bubble custom states | React useState + localStorage |
| **Auth** | Bubble Auth | Supabase Auth + legacy Bubble token validation |
| **Charts** | Apex Charts plugin | Chart.js or Recharts (optional) |

### Inconsistency Resolution Matrix

| Bubble Pattern | Problem | Our Solution |
|----------------|---------|--------------|
| Custom States on elements | Scattered state | Centralized in `useSimulationPageLogic.js` hook |
| 19 uncategorized workflows | Hard to trace | Organized by step (A-E) in dedicated handlers |
| Backend workflow scheduling | Complex timing | Queue-based with `sync_queue` table |
| JS2Bubble plugin | Tight coupling | Pure JavaScript in React |
| Reusable "Sign up & Login A" | Different auth flow | Use existing `SignUpLoginModal` component |
| Chart (Apex) Beta | Plugin dependency | Remove or replace with lightweight chart |
| Date calculations in workflows | Bubble-specific | Use `app/src/lib/dayUtils.js` |

---

## File Structure

```
app/
├── public/
│   └── simulation-test.html                    # NEW: HTML entry point
├── src/
│   ├── simulation-test.jsx                     # NEW: React mount
│   └── islands/
│       └── pages/
│           └── SimulationTestPage/
│               ├── SimulationTestPage.jsx      # NEW: Hollow component
│               ├── useSimulationTestPageLogic.js # NEW: All logic
│               ├── components/
│               │   ├── StepCard.jsx            # NEW: Reusable step UI
│               │   ├── SimulationProgress.jsx  # NEW: Progress indicator
│               │   ├── TestUserInfo.jsx        # NEW: Current user display
│               │   └── SimulationInstructions.jsx # NEW: Instructions modal
│               ├── handlers/
│               │   ├── stepAHandler.js         # NEW: Step A logic
│               │   ├── stepBHandler.js         # NEW: Step B logic
│               │   ├── stepCHandler.js         # NEW: Step C logic
│               │   ├── stepDHandler.js         # NEW: Step D logic
│               │   └── stepEHandler.js         # NEW: Step E logic
│               └── data/
│                   └── testFixtures.js         # NEW: Mock data generators
│
supabase/
└── functions/
    └── simulation/                             # NEW: Simulation Edge Function
        ├── index.ts
        ├── handlers/
        │   ├── markTester.ts                   # Step A backend
        │   ├── sendMeetingInvites.ts           # Step B backend
        │   ├── createCounteroffer.ts           # Step C backend
        │   ├── acceptProposal.ts               # Step D backend
        │   └── completeLease.ts                # Step E backend
        └── lib/
            └── testDataGenerator.ts            # Test data utilities
```

---

## Implementation Phases

### Phase 1: Foundation (8-12 hours)

#### 1.1 Route & Entry Point Setup

**File:** `app/src/routes.config.js`
```javascript
// Add new route
{
  path: '/simulation-test',
  file: 'simulation-test.html',
  aliases: ['/simulation-test.html'],
  protected: true,  // Require auth
  cloudflareInternal: true,
  internalName: 'simulation-test-view',
  hasDynamicSegment: false
}
```

**File:** `app/public/simulation-test.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Simulated Guest Actions | Split Lease</title>
  <link rel="stylesheet" href="/src/styles/main.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/simulation-test.jsx"></script>
</body>
</html>
```

**File:** `app/src/simulation-test.jsx`
```javascript
import { createRoot } from 'react-dom/client';
import SimulationTestPage from './islands/pages/SimulationTestPage/SimulationTestPage';

const root = createRoot(document.getElementById('root'));
root.render(<SimulationTestPage />);
```

#### 1.2 Page Component (Hollow Pattern)

**File:** `app/src/islands/pages/SimulationTestPage/SimulationTestPage.jsx`

The page component contains ONLY rendering logic, delegating all business logic to the hook.

```jsx
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { useSimulationTestPageLogic } from './useSimulationTestPageLogic';
import StepCard from './components/StepCard';
import SimulationProgress from './components/SimulationProgress';
import TestUserInfo from './components/TestUserInfo';
import SimulationInstructions from './components/SimulationInstructions';
import Toast from '../../shared/Toast';

export default function SimulationTestPage() {
  const {
    // State
    currentUser,
    isAuthenticated,
    completedSteps,
    activeStep,
    isProcessing,
    error,
    toast,

    // Data
    testProposal,
    testListing,
    testHosts,

    // Handlers
    handleLogin,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepD,
    handleStepE,
    handleReset,
    dismissToast
  } = useSimulationTestPageLogic();

  return (
    <div className="simulation-test-page">
      <Header />

      <main className="simulation-container">
        <h1>Simulated Guest Actions</h1>

        {/* Instructions */}
        <SimulationInstructions />

        {/* Auth Section */}
        {!isAuthenticated ? (
          <LoginSection onLogin={handleLogin} />
        ) : (
          <>
            <TestUserInfo user={currentUser} />

            {/* Progress Indicator */}
            <SimulationProgress
              completedSteps={completedSteps}
              activeStep={activeStep}
            />

            {/* Step Cards */}
            <div className="steps-container">
              <StepCard
                stepNumber="A"
                title="Mark as Usability Tester & Autofill Rental Application"
                description="Sets test flag on your account and creates a pre-filled proposal"
                isCompleted={completedSteps.includes('A')}
                isActive={activeStep === 'A'}
                isDisabled={activeStep !== 'A'}
                isProcessing={isProcessing && activeStep === 'A'}
                onExecute={handleStepA}
              />

              <StepCard
                stepNumber="B"
                title="Virtual Meeting Invitations from Hosts 1 & 2"
                description="Simulates receiving meeting invitations from two test hosts"
                isCompleted={completedSteps.includes('B')}
                isActive={activeStep === 'B'}
                isDisabled={!completedSteps.includes('A')}
                isProcessing={isProcessing && activeStep === 'B'}
                onExecute={handleStepB}
              />

              <StepCard
                stepNumber="C"
                title="Counteroffer Simulation from Host 3"
                description="Host 3 sends a counteroffer with modified terms"
                isCompleted={completedSteps.includes('C')}
                isActive={activeStep === 'C'}
                isDisabled={!completedSteps.includes('B')}
                isProcessing={isProcessing && activeStep === 'C'}
                onExecute={handleStepC}
              />

              <StepCard
                stepNumber="D"
                title="Host 1 Accepts & Lease Draft Created"
                description="Host accepts proposal, lease document and house manual generated"
                isCompleted={completedSteps.includes('D')}
                isActive={activeStep === 'D'}
                isDisabled={!completedSteps.includes('C')}
                isProcessing={isProcessing && activeStep === 'D'}
                onExecute={handleStepD}
              />

              <StepCard
                stepNumber="E"
                title="Signed Lease & Initial Payment"
                description="Complete lease signing and process initial payment"
                isCompleted={completedSteps.includes('E')}
                isActive={activeStep === 'E'}
                isDisabled={!completedSteps.includes('D')}
                isProcessing={isProcessing && activeStep === 'E'}
                onExecute={handleStepE}
              />
            </div>

            {/* Reset Button */}
            <button
              className="reset-button"
              onClick={handleReset}
              disabled={isProcessing}
            >
              Reset All Steps
            </button>
          </>
        )}

        {/* Error Display */}
        {error && <div className="error-banner">{error}</div>}
      </main>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}

      <Footer />
    </div>
  );
}
```

#### 1.3 Logic Hook

**File:** `app/src/islands/pages/SimulationTestPage/useSimulationTestPageLogic.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

// Step handlers
import { executeStepA } from './handlers/stepAHandler';
import { executeStepB } from './handlers/stepBHandler';
import { executeStepC } from './handlers/stepCHandler';
import { executeStepD } from './handlers/stepDHandler';
import { executeStepE } from './handlers/stepEHandler';

const STORAGE_KEY = 'simulationTestProgress';
const STEPS = ['A', 'B', 'C', 'D', 'E'];

export function useSimulationTestPageLogic() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Progress state
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState('A');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Test data state
  const [testProposal, setTestProposal] = useState(null);
  const [testListing, setTestListing] = useState(null);
  const [testHosts, setTestHosts] = useState([]);

  // Load persisted progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { completedSteps: savedSteps, testData } = JSON.parse(saved);
      setCompletedSteps(savedSteps || []);
      setTestProposal(testData?.proposal || null);
      setTestListing(testData?.listing || null);
      setTestHosts(testData?.hosts || []);

      // Set active step to next incomplete
      const nextStep = STEPS.find(s => !savedSteps?.includes(s)) || 'A';
      setActiveStep(nextStep);
    }
  }, []);

  // Persist progress on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedSteps,
      testData: { proposal: testProposal, listing: testListing, hosts: testHosts }
    }));
  }, [completedSteps, testProposal, testListing, testHosts]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = await checkAuthStatus();
      setIsAuthenticated(isLoggedIn);

      if (isLoggedIn) {
        const userData = await validateTokenAndFetchUser();
        setCurrentUser(userData);
      }
    };
    checkAuth();
  }, []);

  // Helper to advance to next step
  const advanceStep = useCallback((completedStep) => {
    setCompletedSteps(prev => [...prev, completedStep]);
    const currentIndex = STEPS.indexOf(completedStep);
    if (currentIndex < STEPS.length - 1) {
      setActiveStep(STEPS[currentIndex + 1]);
    }
  }, []);

  // Step handlers
  const handleStepA = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await executeStepA(currentUser);
      setTestProposal(result.proposal);
      setTestListing(result.listing);
      setTestHosts(result.hosts);
      advanceStep('A');
      setToast({ message: 'Step A completed: Test user marked & proposal created', type: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: `Step A failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, advanceStep]);

  const handleStepB = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await executeStepB(testProposal, testHosts);
      advanceStep('B');
      setToast({ message: 'Step B completed: Meeting invitations sent', type: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: `Step B failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [testProposal, testHosts, advanceStep]);

  const handleStepC = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await executeStepC(testProposal, testHosts[2]);
      setTestProposal(result.counterofferProposal);
      advanceStep('C');
      setToast({ message: 'Step C completed: Counteroffer received', type: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: `Step C failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [testProposal, testHosts, advanceStep]);

  const handleStepD = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await executeStepD(testProposal, testHosts[0]);
      setTestProposal(result.acceptedProposal);
      advanceStep('D');
      setToast({ message: 'Step D completed: Lease drafted & house manual created', type: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: `Step D failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [testProposal, testHosts, advanceStep]);

  const handleStepE = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await executeStepE(testProposal);
      advanceStep('E');
      setToast({ message: 'Step E completed: Lease signed & payment processed!', type: 'success' });
    } catch (err) {
      setError(err.message);
      setToast({ message: `Step E failed: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }, [testProposal, advanceStep]);

  const handleReset = useCallback(() => {
    setCompletedSteps([]);
    setActiveStep('A');
    setTestProposal(null);
    setTestListing(null);
    setTestHosts([]);
    localStorage.removeItem(STORAGE_KEY);
    setToast({ message: 'Simulation reset', type: 'info' });
  }, []);

  const handleLogin = useCallback(async (credentials) => {
    // Use existing auth flow
    // This integrates with SignUpLoginModal
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    // State
    currentUser,
    isAuthenticated,
    completedSteps,
    activeStep,
    isProcessing,
    error,
    toast,

    // Data
    testProposal,
    testListing,
    testHosts,

    // Handlers
    handleLogin,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepD,
    handleStepE,
    handleReset,
    dismissToast
  };
}
```

---

### Phase 2: Step Handlers (16-24 hours)

Each step handler encapsulates the business logic for that simulation step.

#### 2.1 Step A Handler - Mark Tester & Create Proposal

**File:** `app/src/islands/pages/SimulationTestPage/handlers/stepAHandler.js`

```javascript
import { supabase } from '../../../../lib/supabase';

/**
 * Step A: Mark user as usability tester and create a pre-filled proposal
 *
 * Bubble Equivalent:
 * - Sets "is_usability_tester" flag on User
 * - Auto-fills rental application
 * - Creates proposal with test data
 */
export async function executeStepA(currentUser) {
  if (!currentUser?.userId) {
    throw new Error('User not authenticated');
  }

  // 1. Mark user as usability tester via Edge Function
  const { data: userResult, error: userError } = await supabase.functions.invoke('simulation', {
    body: {
      action: 'mark_tester',
      payload: {
        user_id: currentUser.userId
      }
    }
  });

  if (userError) {
    throw new Error(`Failed to mark tester: ${userError.message}`);
  }

  // 2. Get test listings (we need at least 3 hosts)
  const { data: listingsResult, error: listingsError } = await supabase.functions.invoke('simulation', {
    body: {
      action: 'get_test_listings',
      payload: {
        count: 3
      }
    }
  });

  if (listingsError) {
    throw new Error(`Failed to get test listings: ${listingsError.message}`);
  }

  const testListings = listingsResult.listings;
  const testHosts = testListings.map(l => ({
    id: l['Host User'],
    listingId: l._id,
    listingName: l.Name
  }));

  // 3. Create test proposal for first listing
  const { data: proposalResult, error: proposalError } = await supabase.functions.invoke('proposal', {
    body: {
      action: 'create',
      payload: {
        listing_id: testListings[0]._id,
        user_id: currentUser.userId,
        days_needed: [1, 2, 3], // Mon, Tue, Wed (0-indexed)
        move_in_range_start: getFutureDate(14), // 2 weeks from now
        move_in_range_end: getFutureDate(28),   // 4 weeks from now
        is_test_proposal: true
      }
    }
  });

  if (proposalError) {
    throw new Error(`Failed to create proposal: ${proposalError.message}`);
  }

  return {
    proposal: proposalResult.proposal,
    listing: testListings[0],
    hosts: testHosts
  };
}

function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}
```

#### 2.2 Step B Handler - Virtual Meeting Invitations

**File:** `app/src/islands/pages/SimulationTestPage/handlers/stepBHandler.js`

```javascript
import { supabase } from '../../../../lib/supabase';

/**
 * Step B: Simulate virtual meeting invitations from Hosts 1 & 2
 *
 * Bubble Equivalent:
 * - Creates meeting invitation records
 * - Sends notification to guest
 */
export async function executeStepB(proposal, hosts) {
  if (!proposal?._id) {
    throw new Error('No proposal found from Step A');
  }

  if (!hosts || hosts.length < 2) {
    throw new Error('Need at least 2 test hosts');
  }

  // Send meeting invitations from first 2 hosts
  const invitationPromises = hosts.slice(0, 2).map((host, index) =>
    supabase.functions.invoke('simulation', {
      body: {
        action: 'send_meeting_invite',
        payload: {
          proposal_id: proposal._id,
          host_id: host.id,
          listing_id: host.listingId,
          meeting_time: getMeetingTime(index + 1) // Stagger meetings
        }
      }
    })
  );

  const results = await Promise.all(invitationPromises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to send ${errors.length} meeting invitation(s)`);
  }

  return {
    invitationsSent: results.map(r => r.data)
  };
}

function getMeetingTime(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(14, 0, 0, 0); // 2 PM
  return date.toISOString();
}
```

#### 2.3 Step C Handler - Counteroffer Simulation

**File:** `app/src/islands/pages/SimulationTestPage/handlers/stepCHandler.js`

```javascript
import { supabase } from '../../../../lib/supabase';

/**
 * Step C: Simulate counteroffer from Host 3
 *
 * Bubble Equivalent:
 * - Creates counteroffer proposal linked to original
 * - Modifies terms (price, dates, etc.)
 */
export async function executeStepC(originalProposal, host3) {
  if (!originalProposal?._id) {
    throw new Error('No original proposal found');
  }

  if (!host3?.id) {
    throw new Error('Host 3 not available for counteroffer');
  }

  const { data, error } = await supabase.functions.invoke('simulation', {
    body: {
      action: 'create_counteroffer',
      payload: {
        original_proposal_id: originalProposal._id,
        host_id: host3.id,
        listing_id: host3.listingId,
        counteroffer_details: {
          // Modify from original
          price_adjustment: 1.1, // 10% higher
          alternate_days: [2, 3, 4], // Tue, Wed, Thu instead
          message: 'I can offer these alternate days at a slightly higher rate.'
        }
      }
    }
  });

  if (error) {
    throw new Error(`Failed to create counteroffer: ${error.message}`);
  }

  return {
    counterofferProposal: data.counteroffer
  };
}
```

#### 2.4 Step D Handler - Accept Proposal & Create Lease

**File:** `app/src/islands/pages/SimulationTestPage/handlers/stepDHandler.js`

```javascript
import { supabase } from '../../../../lib/supabase';

/**
 * Step D: Host 1 accepts proposal, lease drafted, house manual created
 *
 * Bubble Equivalent:
 * - Updates proposal status to "accepted"
 * - Triggers CORE-create-lease backend workflow
 * - Creates house manual document
 * - Calculates 4-week compensation
 */
export async function executeStepD(proposal, host1) {
  if (!proposal?._id) {
    throw new Error('No proposal found');
  }

  // 1. Accept the proposal
  const { data: acceptResult, error: acceptError } = await supabase.functions.invoke('simulation', {
    body: {
      action: 'accept_proposal',
      payload: {
        proposal_id: proposal._id,
        host_id: host1.id,
        acceptance_details: {
          four_week_compensation: calculateFourWeekCompensation(proposal),
          special_terms: null
        }
      }
    }
  });

  if (acceptError) {
    throw new Error(`Failed to accept proposal: ${acceptError.message}`);
  }

  // 2. Create house manual (triggered by acceptance in Edge Function)
  // This happens automatically in the Edge Function

  return {
    acceptedProposal: acceptResult.proposal,
    lease: acceptResult.lease,
    houseManual: acceptResult.houseManual
  };
}

function calculateFourWeekCompensation(proposal) {
  // Simplified calculation - actual logic in pricing calculators
  const nightlyRate = proposal['proposal nightly price'] || 100;
  const daysPerWeek = proposal['Days Selected']?.length || 3;
  return nightlyRate * daysPerWeek * 4;
}
```

#### 2.5 Step E Handler - Complete Lease Signing

**File:** `app/src/islands/pages/SimulationTestPage/handlers/stepEHandler.js`

```javascript
import { supabase } from '../../../../lib/supabase';

/**
 * Step E: Sign lease and process initial payment
 *
 * Bubble Equivalent:
 * - Updates lease status to "signed"
 * - Processes (simulated) initial payment
 * - Completes the rental workflow
 */
export async function executeStepE(proposal) {
  if (!proposal?._id) {
    throw new Error('No proposal found');
  }

  const { data, error } = await supabase.functions.invoke('simulation', {
    body: {
      action: 'complete_lease',
      payload: {
        proposal_id: proposal._id,
        payment_simulation: {
          amount: proposal['proposal nightly price'] * 7, // First week
          method: 'test_payment',
          simulated: true
        },
        signature_simulation: {
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
          simulated: true
        }
      }
    }
  });

  if (error) {
    throw new Error(`Failed to complete lease: ${error.message}`);
  }

  return {
    completedLease: data.lease,
    paymentConfirmation: data.payment
  };
}
```

---

### Phase 3: Edge Function (8-12 hours)

**File:** `supabase/functions/simulation/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Action handlers
import { markTester } from "./handlers/markTester.ts";
import { getTestListings } from "./handlers/getTestListings.ts";
import { sendMeetingInvite } from "./handlers/sendMeetingInvite.ts";
import { createCounteroffer } from "./handlers/createCounteroffer.ts";
import { acceptProposal } from "./handlers/acceptProposal.ts";
import { completeLease } from "./handlers/completeLease.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  try {
    const { action, payload } = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      case "mark_tester":
        result = await markTester(supabase, payload);
        break;
      case "get_test_listings":
        result = await getTestListings(supabase, payload);
        break;
      case "send_meeting_invite":
        result = await sendMeetingInvite(supabase, payload);
        break;
      case "create_counteroffer":
        result = await createCounteroffer(supabase, payload);
        break;
      case "accept_proposal":
        result = await acceptProposal(supabase, payload);
        break;
      case "complete_lease":
        result = await completeLease(supabase, payload);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Simulation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### Phase 4: UI Components (8-12 hours)

#### 4.1 StepCard Component

**File:** `app/src/islands/pages/SimulationTestPage/components/StepCard.jsx`

```jsx
import './StepCard.css';

export default function StepCard({
  stepNumber,
  title,
  description,
  isCompleted,
  isActive,
  isDisabled,
  isProcessing,
  onExecute
}) {
  const statusClass = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

  return (
    <div className={`step-card step-card--${statusClass}`}>
      <div className="step-card__header">
        <span className="step-card__number">{stepNumber}</span>
        <h3 className="step-card__title">{title}</h3>
        {isCompleted && <span className="step-card__check">✓</span>}
      </div>

      <p className="step-card__description">{description}</p>

      <button
        className="step-card__button"
        onClick={onExecute}
        disabled={isDisabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : isCompleted ? (
          'Completed'
        ) : (
          `Execute Step ${stepNumber}`
        )}
      </button>
    </div>
  );
}
```

#### 4.2 SimulationProgress Component

**File:** `app/src/islands/pages/SimulationTestPage/components/SimulationProgress.jsx`

```jsx
import './SimulationProgress.css';

const STEPS = ['A', 'B', 'C', 'D', 'E'];

export default function SimulationProgress({ completedSteps, activeStep }) {
  return (
    <div className="simulation-progress">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(step);
        const isActive = step === activeStep;
        const statusClass = isCompleted ? 'completed' : isActive ? 'active' : 'pending';

        return (
          <div key={step} className="simulation-progress__item">
            <div className={`simulation-progress__circle simulation-progress__circle--${statusClass}`}>
              {isCompleted ? '✓' : step}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`simulation-progress__line simulation-progress__line--${isCompleted ? 'completed' : 'pending'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Bubble Workflow Mapping

### Original Bubble Workflows → Our Implementation

| # | Bubble Workflow | Our Implementation | Location |
|---|----------------|-------------------|----------|
| 1 | Accept Proposal UPDATED | `acceptProposal` Edge Function handler | `supabase/functions/simulation/handlers/acceptProposal.ts` |
| 2 | B: Step A is clicked | `stepAHandler.js` | Frontend handler |
| 3 | B: Step B is clicked | `stepBHandler.js` | Frontend handler |
| 4 | B: Step C is clicked | `stepCHandler.js` | Frontend handler |
| 5 | B: Step D is clicked | `stepDHandler.js` | Frontend handler |
| 6 | B: Step E is clicked | `stepEHandler.js` | Frontend handler |
| 7 | CORE-create-lease (backend) | `acceptProposal` → queues lease creation | Via `sync_queue` |
| 8 | List of Dates Calculation | `app/src/lib/dayUtils.js` | Existing utility |
| 9 | Page is loaded | `useEffect` in hook | Initial auth check + load persisted state |
| 10-19 | Various helpers | Consolidated into step handlers | Simplified structure |

---

## Database Operations

### Tables Accessed

| Table | Operations | Edge Function |
|-------|-----------|---------------|
| `user` | UPDATE (is_usability_tester flag) | `simulation/markTester` |
| `listing` | SELECT (get test listings) | `simulation/getTestListings` |
| `proposal` | INSERT, UPDATE, SELECT | `proposal/*`, `simulation/*` |
| `sync_queue` | INSERT (for Bubble sync) | All mutation handlers |

### Sync Queue Integration

All data mutations enqueue to `sync_queue` for async Bubble sync:

```typescript
// Example from acceptProposal handler
await enqueueBubbleSync(supabase, {
  correlationId: `accept-proposal:${proposalId}`,
  items: [{
    sequence: 1,
    table: 'proposal',
    recordId: proposalId,
    operation: 'UPDATE',
    payload: { Status: 'accepted', ... }
  }]
});
```

---

## Removed/Simplified Features

| Bubble Feature | Decision | Rationale |
|---------------|----------|-----------|
| Apex Area Chart | **REMOVED** | Not essential for testing flow, adds complexity |
| JS2Bubble plugin | **NOT NEEDED** | Pure JavaScript in React |
| Complex date calculations | **SIMPLIFIED** | Use existing `dayUtils.js` |
| 296 backend workflows | **CHERRY-PICK** | Only implement workflows needed for this page |
| Custom states on elements | **CENTRALIZED** | All state in `useSimulationTestPageLogic` hook |

---

## Testing Plan

### Manual Testing Checklist

- [ ] Page loads without auth → shows login prompt
- [ ] After login → shows user info and Step A enabled
- [ ] Step A → marks tester, creates proposal, enables Step B
- [ ] Step B → sends meeting invites, enables Step C
- [ ] Step C → creates counteroffer, enables Step D
- [ ] Step D → accepts proposal, creates lease, enables Step E
- [ ] Step E → completes lease, shows success
- [ ] Reset button → clears all progress
- [ ] Page reload → restores progress from localStorage
- [ ] Error handling → shows toast on failure

### E2E Test File

**File:** `tests/e2e/simulation-test.spec.ts` (future)

---

## Dependencies

### Existing Code to Reuse

| Component/Utility | Location | Purpose |
|-------------------|----------|---------|
| `Header` | `app/src/islands/shared/Header.jsx` | Page header |
| `Footer` | `app/src/islands/shared/Footer.jsx` | Page footer |
| `Toast` | `app/src/islands/shared/Toast.jsx` | Notifications |
| `SignUpLoginModal` | `app/src/islands/shared/SignUpLoginModal.jsx` | Auth modal |
| `auth.js` | `app/src/lib/auth.js` | Authentication |
| `supabase.js` | `app/src/lib/supabase.js` | Supabase client |
| `dayUtils.js` | `app/src/lib/dayUtils.js` | Date calculations |
| `enqueueBubbleSync` | `supabase/functions/_shared/queueSync.ts` | Sync queue |

### New CSS Files Needed

- `app/src/styles/pages/SimulationTestPage.css`
- `app/src/islands/pages/SimulationTestPage/components/StepCard.css`
- `app/src/islands/pages/SimulationTestPage/components/SimulationProgress.css`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Test data conflicts with real data | Medium | High | Use `is_test_*` flags, separate test hosts |
| Sync queue delays | Low | Medium | Add status polling in UI |
| Auth session expiry mid-test | Low | Medium | Check auth before each step |
| Bubble API rate limits | Low | Medium | Queue-based async sync |

---

## File References

### Source Requirements
- [simulation-gsm-vm-housemanual requirements.md](provided by user) - Original Bubble page analysis

### Architecture Documentation
- [.claude/CLAUDE.md](../../CLAUDE.md) - Main project documentation
- [app/CLAUDE.md](../../../app/CLAUDE.md) - Frontend architecture
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Edge Functions reference

### Related Existing Code
- [app/src/islands/pages/SelfListingPage/](../../../app/src/islands/pages/SelfListingPage/) - Multi-step wizard pattern
- [app/src/islands/pages/GuestProposalsPage.jsx](../../../app/src/islands/pages/GuestProposalsPage.jsx) - Proposal handling
- [supabase/functions/proposal/](../../../supabase/functions/proposal/) - Proposal Edge Function
- [supabase/functions/_shared/queueSync.ts](../../../supabase/functions/_shared/queueSync.ts) - Sync queue utility

---

## Implementation Sequence

1. **Foundation** (Phase 1)
   - Add route to `routes.config.js`
   - Create HTML entry point
   - Create JSX mount file
   - Create page component skeleton
   - Create logic hook skeleton

2. **Core Logic** (Phase 2)
   - Implement `useSimulationTestPageLogic.js`
   - Implement step handlers A-E
   - Add localStorage persistence

3. **Backend** (Phase 3)
   - Create `simulation` Edge Function
   - Implement each action handler
   - Add sync queue integration

4. **UI Polish** (Phase 4)
   - Create StepCard component
   - Create SimulationProgress component
   - Add CSS styling
   - Integrate Toast notifications

5. **Testing & Refinement**
   - Manual testing of all steps
   - Error handling verification
   - Documentation update

---

**Document Version:** 1.0
**Created:** 2026-01-20
**Author:** Claude (Implementation Planner)
