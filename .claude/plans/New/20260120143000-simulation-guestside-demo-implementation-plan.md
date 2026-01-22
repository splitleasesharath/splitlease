# Implementation Plan: simulation-guestside-demo Page Migration

**Date:** 2026-01-20
**Type:** BUILD - New Page Implementation
**Complexity:** High (Multi-step simulation workflow with state management)
**Estimated Effort:** 16-24 hours

---

## Executive Summary

This plan details the migration of Bubble's `simulation-guestside-demo` page to our React/Supabase architecture. The page serves as a **usability testing simulation** that walks testers through the complete guest-side rental journey: from marking themselves as testers, through proposal submission, host responses (accept/counteroffer), lease drafting, and signing.

### Key Architectural Adaptations

| Bubble Concept | Split Lease Adaptation |
|----------------|------------------------|
| Custom States (page-level) | React useState + URL params for persistence |
| 24 Page Workflows | Logic hook functions + Edge Function calls |
| 296 Backend Workflows | Supabase Edge Functions (existing + new) |
| Reusable Elements (popups) | React components from `islands/shared/` |
| JS2B Plugin (JavaScript to Bubble) | Direct React state management |
| Conditional Visibility | React conditional rendering |

---

## 1. Page Architecture

### 1.1 File Structure

```
app/
├── public/
│   └── simulation-guestside-demo.html          # HTML shell
├── src/
│   ├── simulation-guestside-demo.jsx           # React entry point
│   └── islands/pages/
│       └── SimulationGuestsideDemoPage/
│           ├── SimulationGuestsideDemoPage.jsx       # Main hollow component
│           ├── useSimulationGuestsideDemoPageLogic.js # All page logic
│           ├── SimulationGuestsideDemoPage.css       # Page styles
│           ├── components/
│           │   ├── SimulationHeader.jsx              # Page header with user info
│           │   ├── StepButton.jsx                    # Reusable step action button
│           │   ├── StepInstructions.jsx              # Instructions between steps
│           │   ├── SimulationPath.jsx                # Branching path container
│           │   ├── EndingScenario.jsx                # Accept/Counteroffer scenarios
│           │   └── SimulationProgress.jsx            # Visual progress indicator
│           └── constants/
│               └── simulationSteps.js                # Step definitions & flow
```

### 1.2 Route Configuration

Add to `app/src/routes.config.js`:

```javascript
{
  path: '/simulation-guestside-demo',
  file: 'simulation-guestside-demo.html',
  aliases: ['/simulation-guestside-demo.html', '/usability-test'],
  protected: true,  // Requires authentication
  cloudflareInternal: true,
  internalName: 'simulation-guestside-demo-view',
  hasDynamicSegment: false
}
```

---

## 2. Data Model Mapping

### 2.1 Existing Supabase Tables (Already Available)

| Table | Purpose in Simulation |
|-------|----------------------|
| `public.user` | `is usability tester`, `Usability Step` fields track tester status |
| `public.listing` | `isForUsability` flag identifies test listings |
| `public.proposal` | Full proposal structure with all status fields |
| `public.bookings_leases` | Lease records created after acceptance |
| `reference_table.os_proposal_status` | 14 proposal statuses with actions |
| `reference_table.os_lease_status` | 5 lease statuses |

### 2.2 Key Fields for Simulation

**User table fields used:**
- `is usability tester` (boolean) - Marks user as tester
- `Usability Step` (integer) - Tracks progress through simulation (1-7+)
- `Rental Application` (text) - Link to rental app record

**Listing table fields used:**
- `isForUsability` (boolean) - Identifies test listings
- `Host User` (text) - Links to host user

**Proposal table fields used:**
- `Status` (text) - Current proposal status
- `Guest` (text) - Guest user ID
- `Host User` (text) - Host user ID
- `Listing` (text) - Listing ID
- `virtual meeting` (text) - VM record ID
- `rental application` (text) - Rental app ID

### 2.3 Proposal Status Flow for Simulation

```
Step A: Mark as Tester + Autofill Rental App
    ↓
Step B: VM Invitation (status: "host_review")
    ↓
    ├── Path 1 (Ending 1): Host #2 Accepts
    │   └── Status: "accepted_drafting_lease"
    │
    └── Path 2 (Ending 2): Host #3 Counteroffers
        └── Status: "host_counteroffer"
            ↓
        Guest Accepts Counteroffer
            └── Status: "accepted_drafting_lease"
    ↓
Step D: Drafting Lease & House Manual
    └── Status: "lease_docs_for_review" → "lease_docs_for_signatures"
    ↓
Step E: Signing & Initial Payment
    └── Status: "lease_signed_awaiting_payment" → "payment_submitted_lease_activated"
```

---

## 3. State Management Design

### 3.1 Page State (React useState)

```javascript
const [simulationState, setSimulationState] = useState({
  // Authentication
  isAuthenticated: false,
  currentUser: null,

  // Simulation Progress
  currentStep: 'login',  // login | A | B | C | D | E | complete
  selectedPath: null,    // 1 (accept) | 2 (counteroffer)

  // Test Data References
  usabilityCode: '',
  testListingIds: [],
  testProposalIds: [],
  testLeaseId: null,

  // UI State
  isLoading: false,
  stepInProgress: null,
  completedSteps: [],

  // Counters (from Bubble custom state)
  agreementCountToday: 0
});
```

### 3.2 URL Parameter Persistence

For page reload resilience, persist key state in URL:

```javascript
// Read on mount
const params = new URLSearchParams(window.location.search);
const step = params.get('step') || 'login';
const path = params.get('path');
const code = params.get('code');

// Write on state change
const updateURL = (newState) => {
  const params = new URLSearchParams();
  if (newState.currentStep) params.set('step', newState.currentStep);
  if (newState.selectedPath) params.set('path', newState.selectedPath);
  if (newState.usabilityCode) params.set('code', newState.usabilityCode);
  window.history.replaceState({}, '', `?${params.toString()}`);
};
```

---

## 4. Step-by-Step Implementation

### 4.1 Step A: Mark as Usability Tester & Autofill Rental App

**Bubble Actions (to replicate):**
1. Update user: `is usability tester = true`
2. Update user: `Usability Step = 1`
3. Create/link rental application record
4. Autofill rental application fields

**React Implementation:**

```javascript
// In useSimulationGuestsideDemoPageLogic.js
const handleStepA = async () => {
  setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'A' }));

  try {
    // 1. Mark user as usability tester
    const { error: userError } = await supabase
      .from('user')
      .update({
        'is usability tester': true,
        'Usability Step': 1
      })
      .eq('_id', currentUser._id);

    if (userError) throw userError;

    // 2. Create/update rental application via Edge Function
    const { data: rentalApp, error: appError } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'createTestRentalApplication',
        payload: { userId: currentUser._id, isUsabilityTest: true }
      }
    });

    if (appError) throw appError;

    // 3. Update state
    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'B',
      completedSteps: [...prev.completedSteps, 'A']
    }));

    showToast({ title: 'Step A Complete', type: 'success' });

  } catch (error) {
    console.error('Step A failed:', error);
    showToast({ title: 'Step A Failed', message: error.message, type: 'error' });
    setSimulationState(prev => ({ ...prev, isLoading: false, stepInProgress: null }));
  }
};
```

### 4.2 Step B: Virtual Meeting Invitation from Host #1

**Bubble Actions:**
1. Create virtual meeting record
2. Link VM to proposal
3. Send notification to guest
4. Update proposal status

**React Implementation:**

```javascript
const handleStepB = async () => {
  setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: 'B' }));

  try {
    // 1. Get test listing for Host #1
    const { data: testListing } = await supabase
      .from('listing')
      .select('_id, "Host User", "Name"')
      .eq('isForUsability', true)
      .limit(1)
      .single();

    // 2. Create test proposal via Edge Function
    const { data: proposal } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'createTestProposal',
        payload: {
          guestId: currentUser._id,
          listingId: testListing._id,
          hostId: testListing['Host User'],
          isUsabilityTest: true
        }
      }
    });

    // 3. Schedule virtual meeting
    const { data: vm } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'scheduleVirtualMeeting',
        payload: {
          proposalId: proposal._id,
          hostId: testListing['Host User'],
          guestId: currentUser._id
        }
      }
    });

    // 4. Update user step
    await supabase
      .from('user')
      .update({ 'Usability Step': 2 })
      .eq('_id', currentUser._id);

    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'C',
      completedSteps: [...prev.completedSteps, 'B'],
      testProposalIds: [...prev.testProposalIds, proposal._id]
    }));

  } catch (error) {
    handleStepError('B', error);
  }
};
```

### 4.3 Step C: Branching Paths (Accept vs Counteroffer)

**Path 1 (Ending 1): Host #2 Accepts Proposal**

```javascript
const handleStepC_Ending1 = async () => {
  setSimulationState(prev => ({
    ...prev,
    isLoading: true,
    stepInProgress: 'C1',
    selectedPath: 1
  }));

  try {
    // Simulate Host #2 accepting the proposal
    const { data } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'acceptProposal',
        payload: {
          proposalId: simulationState.testProposalIds[0],
          isUsabilityTest: true
        }
      }
    });

    // Update user step
    await supabase
      .from('user')
      .update({ 'Usability Step': 3 })
      .eq('_id', currentUser._id);

    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'D',
      completedSteps: [...prev.completedSteps, 'C1']
    }));

  } catch (error) {
    handleStepError('C1', error);
  }
};
```

**Path 2 (Ending 2): Host #3 Counteroffers**

```javascript
const handleStepC_Ending2 = async () => {
  setSimulationState(prev => ({
    ...prev,
    isLoading: true,
    stepInProgress: 'C2',
    selectedPath: 2
  }));

  try {
    // Simulate Host #3 counteroffering
    const { data } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'createCounteroffer',
        payload: {
          proposalId: simulationState.testProposalIds[0],
          counterofferData: {
            'hc nightly price': 150,
            'hc nights per week': 3,
            'hc check in day': 'Friday',
            'hc check out day': 'Monday'
          },
          isUsabilityTest: true
        }
      }
    });

    // Guest accepts counteroffer
    await supabase.functions.invoke('proposal', {
      body: {
        action: 'acceptCounteroffer',
        payload: {
          proposalId: simulationState.testProposalIds[0],
          isUsabilityTest: true
        }
      }
    });

    await supabase
      .from('user')
      .update({ 'Usability Step': 3 })
      .eq('_id', currentUser._id);

    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'D',
      completedSteps: [...prev.completedSteps, 'C2']
    }));

  } catch (error) {
    handleStepError('C2', error);
  }
};
```

### 4.4 Step D: Drafting Lease & House Manual

```javascript
const handleStepD = async (ending) => {
  const stepId = `D${ending}`;
  setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: stepId }));

  try {
    // 1. Create lease record
    const { data: lease } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'createLease',
        payload: {
          proposalId: simulationState.testProposalIds[0],
          isUsabilityTest: true
        }
      }
    });

    // 2. Generate lease documents (simulated)
    await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'generateLeaseDocuments',
        payload: {
          leaseId: lease._id,
          isUsabilityTest: true
        }
      }
    });

    // 3. Update proposal status
    await supabase
      .from('proposal')
      .update({ Status: 'Lease Documents Sent for Review' })
      .eq('_id', simulationState.testProposalIds[0]);

    await supabase
      .from('user')
      .update({ 'Usability Step': 4 })
      .eq('_id', currentUser._id);

    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'E',
      completedSteps: [...prev.completedSteps, stepId],
      testLeaseId: lease._id
    }));

  } catch (error) {
    handleStepError(stepId, error);
  }
};
```

### 4.5 Step E: Signing & Initial Payment

```javascript
const handleStepE = async (ending) => {
  const stepId = `E${ending}`;
  setSimulationState(prev => ({ ...prev, isLoading: true, stepInProgress: stepId }));

  try {
    // 1. Simulate lease signing
    await supabase
      .from('bookings_leases')
      .update({ 'Lease signed?': true })
      .eq('_id', simulationState.testLeaseId);

    // 2. Update proposal status
    await supabase
      .from('proposal')
      .update({ Status: 'Lease Documents Signed / Awaiting Initial payment' })
      .eq('_id', simulationState.testProposalIds[0]);

    // 3. Simulate payment (test mode)
    await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'processTestPayment',
        payload: {
          leaseId: simulationState.testLeaseId,
          isUsabilityTest: true
        }
      }
    });

    // 4. Activate lease
    await supabase
      .from('proposal')
      .update({ Status: 'Initial Payment Submitted / Lease activated' })
      .eq('_id', simulationState.testProposalIds[0]);

    await supabase
      .from('bookings_leases')
      .update({ 'Lease Status': 'Active' })
      .eq('_id', simulationState.testLeaseId);

    await supabase
      .from('user')
      .update({ 'Usability Step': 5 })
      .eq('_id', currentUser._id);

    setSimulationState(prev => ({
      ...prev,
      isLoading: false,
      stepInProgress: null,
      currentStep: 'complete',
      completedSteps: [...prev.completedSteps, stepId]
    }));

    showToast({
      title: 'Simulation Complete!',
      message: 'You have completed the guest-side rental journey.',
      type: 'success'
    });

  } catch (error) {
    handleStepError(stepId, error);
  }
};
```

---

## 5. UI Components Design

### 5.1 Main Page Layout

```jsx
// SimulationGuestsideDemoPage.jsx
export default function SimulationGuestsideDemoPage() {
  const logic = useSimulationGuestsideDemoPageLogic();

  if (logic.authState.isChecking) {
    return <LoadingState message="Checking authentication..." />;
  }

  return (
    <div className="simulation-page">
      <SimulationHeader
        currentUser={logic.currentUser}
        currentDateTime={logic.currentDateTime}
      />

      <div className="simulation-warning">
        Please keep this page open. Reloading will preserve your progress.
      </div>

      {!logic.isAuthenticated ? (
        <LoginSection onLogin={logic.handleLogin} />
      ) : (
        <>
          <UsabilityCodeSection
            code={logic.usabilityCode}
            onChange={logic.setUsabilityCode}
          />

          <SimulationProgress
            currentStep={logic.currentStep}
            completedSteps={logic.completedSteps}
            selectedPath={logic.selectedPath}
          />

          <div className="simulation-steps">
            <StepButton
              step="A"
              label="Mark myself as usability tester & Autofill Rental Application"
              isActive={logic.currentStep === 'A' || logic.currentStep === 'login'}
              isCompleted={logic.completedSteps.includes('A')}
              isLoading={logic.stepInProgress === 'A'}
              onClick={logic.handleStepA}
              disabled={!logic.isAuthenticated}
            />

            <StepInstructions
              text="Between Step A & Step B: Review your rental application in the dashboard"
              visible={logic.completedSteps.includes('A')}
            />

            <StepButton
              step="B"
              label="Virtual Meeting Invitation from Host #1"
              isActive={logic.currentStep === 'B'}
              isCompleted={logic.completedSteps.includes('B')}
              isLoading={logic.stepInProgress === 'B'}
              onClick={logic.handleStepB}
              disabled={!logic.completedSteps.includes('A')}
            />

            <StepInstructions
              text="Between Step B & Step C: Choose your path - Accept or Counteroffer"
              visible={logic.completedSteps.includes('B')}
            />

            {/* Branching Paths */}
            <div className="simulation-paths">
              <EndingScenario
                ending={1}
                title="Host #2 Accepts your Proposal"
                currentStep={logic.currentStep}
                selectedPath={logic.selectedPath}
                completedSteps={logic.completedSteps}
                stepInProgress={logic.stepInProgress}
                onStepC={() => logic.handleStepC_Ending1()}
                onStepD={() => logic.handleStepD(1)}
                onStepE={() => logic.handleStepE(1)}
                disabled={!logic.completedSteps.includes('B')}
              />

              <EndingScenario
                ending={2}
                title="Host #3 Counteroffers your Proposal"
                currentStep={logic.currentStep}
                selectedPath={logic.selectedPath}
                completedSteps={logic.completedSteps}
                stepInProgress={logic.stepInProgress}
                onStepC={() => logic.handleStepC_Ending2()}
                onStepD={() => logic.handleStepD(2)}
                onStepE={() => logic.handleStepE(2)}
                disabled={!logic.completedSteps.includes('B')}
              />
            </div>
          </div>

          {logic.currentStep === 'complete' && (
            <SimulationComplete
              selectedPath={logic.selectedPath}
              onReset={logic.handleReset}
            />
          )}
        </>
      )}

      <ToastContainer />
    </div>
  );
}
```

### 5.2 Step Button Component

```jsx
// components/StepButton.jsx
export function StepButton({
  step,
  label,
  isActive,
  isCompleted,
  isLoading,
  onClick,
  disabled
}) {
  return (
    <div className={`step-button-container ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
      <span className="step-number">{step}</span>
      <button
        className={`step-button ${isLoading ? 'loading' : ''}`}
        onClick={onClick}
        disabled={disabled || isLoading || isCompleted}
      >
        {isLoading ? (
          <span className="loading-spinner" />
        ) : isCompleted ? (
          <span className="checkmark">✓</span>
        ) : null}
        <span className="step-label">
          Step {step} - {label}
        </span>
      </button>
    </div>
  );
}
```

### 5.3 Ending Scenario Component

```jsx
// components/EndingScenario.jsx
export function EndingScenario({
  ending,
  title,
  currentStep,
  selectedPath,
  completedSteps,
  stepInProgress,
  onStepC,
  onStepD,
  onStepE,
  disabled
}) {
  const isThisPath = selectedPath === ending;
  const isOtherPathSelected = selectedPath && selectedPath !== ending;

  return (
    <div className={`ending-scenario ending-${ending} ${isOtherPathSelected ? 'dimmed' : ''}`}>
      <h3 className="ending-title">{title}</h3>

      <StepButton
        step={`C`}
        label={ending === 1 ? "Host #2 Accepts your Proposal" : "Host #3 Counteroffers your Proposal"}
        isActive={currentStep === 'C' && !selectedPath}
        isCompleted={completedSteps.includes(`C${ending}`)}
        isLoading={stepInProgress === `C${ending}`}
        onClick={onStepC}
        disabled={disabled || isOtherPathSelected}
      />

      <StepButton
        step={`D`}
        label="Drafting of Lease & House Manual Created"
        isActive={currentStep === 'D' && isThisPath}
        isCompleted={completedSteps.includes(`D${ending}`)}
        isLoading={stepInProgress === `D${ending}`}
        onClick={onStepD}
        disabled={!completedSteps.includes(`C${ending}`)}
      />

      <StepButton
        step={`E`}
        label="Signing of Lease & Initial Payment Made"
        isActive={currentStep === 'E' && isThisPath}
        isCompleted={completedSteps.includes(`E${ending}`)}
        isLoading={stepInProgress === `E${ending}`}
        onClick={onStepE}
        disabled={!completedSteps.includes(`D${ending}`)}
      />
    </div>
  );
}
```

---

## 6. Edge Function Requirements

### 6.1 Existing Edge Functions to Use

| Function | Actions Used |
|----------|--------------|
| `proposal` | `createTestProposal`, `acceptProposal`, `createCounteroffer`, `acceptCounteroffer` |
| `bubble-proxy` | `scheduleVirtualMeeting`, `createLease`, `generateLeaseDocuments`, `processTestPayment` |
| `auth-user` | Authentication flows |

### 6.2 New Actions Needed (Add to existing functions)

**Add to `proposal/index.ts`:**

```typescript
case 'createTestProposal':
  return await createTestProposal(payload);

case 'createTestRentalApplication':
  return await createTestRentalApplication(payload);
```

**Add to `bubble-proxy/index.ts`:**

```typescript
case 'createLease':
  return await createLeaseFromProposal(payload);

case 'generateLeaseDocuments':
  return await generateLeaseDocuments(payload);

case 'processTestPayment':
  return await processTestPayment(payload);
```

---

## 7. Bubble Workflow Mapping

### 7.1 Page Workflows → React Functions

| Bubble Workflow | React Function | Notes |
|-----------------|----------------|-------|
| `B: Step A is clicked` | `handleStepA()` | Marks user as tester |
| `B: Step B is clicked` | `handleStepB()` | Creates VM invitation |
| `B: Step C ending 1 is clicked` | `handleStepC_Ending1()` | Host accepts |
| `B: Step C ending 2 is clicked` | `handleStepC_Ending2()` | Host counteroffers |
| `B: Step D ending 1/2 is clicked` | `handleStepD(ending)` | Lease drafting |
| `B: Step E ending 1/2 is clicked` | `handleStepE(ending)` | Signing & payment |
| `Accept Proposal UPDATED` | Called within `handleStepC_Ending1()` | Via Edge Function |
| `List of Dates Calculation` | Handled in Edge Function | Server-side calculation |
| `Page is loaded` | `useEffect` in logic hook | Initialize state |

### 7.2 Backend Workflows → Edge Functions

| Bubble Backend Workflow | Edge Function | Notes |
|-------------------------|---------------|-------|
| `CORE-create-lease` | `bubble-proxy` → `createLease` | Creates lease record |
| Messaging System (52) | Existing `messages` function | Reuse existing |
| Proposal Workflows (17) | `proposal` function | Add test modes |
| Virtual Meetings (6) | `bubble-proxy` | Via Bubble API |

---

## 8. Differences from Bubble Implementation

### 8.1 What We're Simplifying

| Bubble Feature | Our Approach | Rationale |
|----------------|--------------|-----------|
| 24 separate workflows | Single logic hook with functions | Consolidation, easier testing |
| JS2B plugin (4 selectors) | Native React state | No plugin needed |
| Custom state for agreement count | Derived from query | Real-time calculation |
| Password show/hide toggle | Standard React pattern | Native implementation |
| Multiple disabled workflows | Clean single implementation | No dead code |

### 8.2 What We're Keeping Identical

- **Step sequence**: A → B → C (branching) → D → E
- **Two ending paths**: Accept (#2) vs Counteroffer (#3)
- **User field updates**: `is usability tester`, `Usability Step`
- **Proposal status progression**: Matches `os_proposal_status` exactly
- **Test data flags**: `isForUsability` on listings, test flags on proposals

### 8.3 What We're Improving

| Improvement | Description |
|-------------|-------------|
| URL state persistence | Page reloads preserve progress |
| Visual progress indicator | Shows completed/current/remaining steps |
| Error handling | Clear toast messages with retry options |
| Loading states | Per-step loading indicators |
| Responsive design | Mobile-friendly layout |

---

## 9. Testing Plan

### 9.1 Manual Testing Checklist

- [ ] Authentication flow works
- [ ] Step A marks user as tester
- [ ] Step B creates VM and proposal
- [ ] Path 1: Accept flow completes
- [ ] Path 2: Counteroffer flow completes
- [ ] Step D creates lease documents
- [ ] Step E simulates payment
- [ ] Page reload preserves progress
- [ ] Cannot skip steps
- [ ] Cannot switch paths mid-flow

### 9.2 Edge Cases

- [ ] User already marked as tester (resume flow)
- [ ] Partial completion (resume from step)
- [ ] Network errors during step execution
- [ ] Concurrent tab handling

---

## 10. Implementation Sequence

### Phase 1: Foundation (4-6 hours)
1. Add route to `routes.config.js`
2. Create HTML shell and entry point
3. Create basic page structure with hollow component
4. Implement authentication check
5. Create step button component

### Phase 2: State Management (2-3 hours)
1. Define simulation state interface
2. Implement URL parameter persistence
3. Create progress tracking logic
4. Handle page reload recovery

### Phase 3: Step Implementations (6-8 hours)
1. Step A: Mark as tester
2. Step B: VM invitation
3. Step C: Branching paths (both endings)
4. Step D: Lease drafting
5. Step E: Signing & payment

### Phase 4: Edge Function Extensions (2-3 hours)
1. Add test mode actions to `proposal` function
2. Add lease/payment actions to `bubble-proxy`
3. Test all API integrations

### Phase 5: Polish & Testing (2-4 hours)
1. Add visual progress indicator
2. Style refinements
3. Error handling improvements
4. Full flow testing
5. Mobile responsiveness

---

## 11. File References

### Existing Files to Reference

| File | Purpose |
|------|---------|
| [routes.config.js](../../app/src/routes.config.js) | Route registration |
| [auth.js](../../app/src/lib/auth.js) | Authentication utilities |
| [supabase.js](../../app/src/lib/supabase.js) | Supabase client |
| [HostProposalsPage/](../../app/src/islands/pages/HostProposalsPage/) | Page structure example |
| [useHostProposalsPageLogic.js](../../app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js) | Logic hook example |
| [proposal/index.ts](../../supabase/functions/proposal/index.ts) | Proposal Edge Function |
| [bubble-proxy/index.ts](../../supabase/functions/bubble-proxy/index.ts) | Bubble API proxy |
| [Toast.jsx](../../app/src/islands/shared/Toast.jsx) | Toast notifications |
| [os_proposal_status](reference_table.os_proposal_status) | Proposal status reference |

### New Files to Create

| File | Purpose |
|------|---------|
| `app/public/simulation-guestside-demo.html` | HTML shell |
| `app/src/simulation-guestside-demo.jsx` | Entry point |
| `app/src/islands/pages/SimulationGuestsideDemoPage/SimulationGuestsideDemoPage.jsx` | Main component |
| `app/src/islands/pages/SimulationGuestsideDemoPage/useSimulationGuestsideDemoPageLogic.js` | Logic hook |
| `app/src/islands/pages/SimulationGuestsideDemoPage/components/*.jsx` | Sub-components |
| `app/src/islands/pages/SimulationGuestsideDemoPage/constants/simulationSteps.js` | Step definitions |

---

## 12. Open Questions for User

1. **Test Data Cleanup**: Should completed simulations auto-cleanup test data, or should we preserve it for review?

2. **Usability Code**: Is the usability code just for tracking, or does it need validation against a list?

3. **Host Personas**: The Bubble page mentions "Host #1", "Host #2", "Host #3" - are these specific test accounts, or should we dynamically assign from `isForUsability` listings?

4. **Email Notifications**: Should the simulation send real emails, or should we suppress notifications for test flows?

5. **Payment Simulation**: Should Step E connect to Stripe test mode, or just simulate the payment locally?

---

## Summary

This implementation plan provides a complete roadmap for migrating the Bubble `simulation-guestside-demo` page to our React/Supabase architecture. The key adaptations involve:

1. **Consolidating 24 workflows** into a single React logic hook with clear step functions
2. **Using native React state** instead of Bubble custom states and JS2B plugin
3. **Leveraging existing Edge Functions** with minimal new additions
4. **Adding URL persistence** for better UX on page reload
5. **Maintaining exact step flow** while improving error handling and visual feedback

The estimated implementation time is **16-24 hours**, with the majority spent on the step implementations and Edge Function integrations.
