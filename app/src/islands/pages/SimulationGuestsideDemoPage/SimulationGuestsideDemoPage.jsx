/**
 * Simulation Guestside Demo Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useSimulationGuestsideDemoPageLogic hook
 *
 * Purpose:
 * A usability testing simulation that walks testers through the complete
 * guest-side rental journey: from marking as tester, through proposal submission,
 * host responses (accept/counteroffer), lease drafting, and signing.
 *
 * Migration from Bubble:
 * - 24 Bubble workflows → Single React logic hook
 * - Custom States → React useState + URL params
 * - JS2B Plugin → Native React state management
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Four-Layer Logic Architecture via hook
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';

import { useSimulationGuestsideDemoPageLogic } from './useSimulationGuestsideDemoPageLogic.js';
import { SIMULATION_STEPS } from './constants/simulationSteps.js';

// Components
import { SimulationHeader } from './components/SimulationHeader.jsx';
import { SimulationProgress } from './components/SimulationProgress.jsx';
import { StepButton } from './components/StepButton.jsx';
import { StepInstructions } from './components/StepInstructions.jsx';
import { EndingScenario } from './components/EndingScenario.jsx';
import { SimulationComplete } from './components/SimulationComplete.jsx';

// Styles
import './SimulationGuestsideDemoPage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="simulation-loading">
      <div className="simulation-loading__spinner"></div>
      <p className="simulation-loading__message">{message}</p>
    </div>
  );
}

// ============================================================================
// LOGIN PROMPT COMPONENT
// ============================================================================

function LoginPrompt({ onLogin }) {
  return (
    <div className="simulation-login-prompt">
      <h2>Authentication Required</h2>
      <p>Please log in to start the usability simulation.</p>
      <button className="simulation-login-button" onClick={onLogin}>
        Log In to Continue
      </button>
    </div>
  );
}

// ============================================================================
// TOAST COMPONENT
// ============================================================================

function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const typeClass = `simulation-toast--${toast.type || 'info'}`;

  return (
    <div className={`simulation-toast ${typeClass}`} onClick={onDismiss}>
      <strong className="simulation-toast__title">{toast.title}</strong>
      {toast.message && (
        <p className="simulation-toast__message">{toast.message}</p>
      )}
    </div>
  );
}

// ============================================================================
// USABILITY CODE INPUT COMPONENT
// ============================================================================

function UsabilityCodeSection({ code, onChange }) {
  return (
    <div className="simulation-code-section">
      <label htmlFor="usabilityCode" className="simulation-code-section__label">
        Usability Code (optional)
      </label>
      <input
        type="text"
        id="usabilityCode"
        className="simulation-code-section__input"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your tracking code"
      />
      <p className="simulation-code-section__hint">
        Enter a code to track your simulation session (for analytics purposes)
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimulationGuestsideDemoPage() {
  const logic = useSimulationGuestsideDemoPageLogic();

  // Show loading state while checking auth
  if (logic.authState.isChecking) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="simulation-page">
            <LoadingState message="Checking authentication..." />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="main-content">
        <div className="simulation-page">
          {/* Warning Banner */}
          <div className="simulation-warning">
            <span className="simulation-warning__icon">⚠️</span>
            <span>Please keep this page open. Reloading will preserve your progress via URL parameters.</span>
          </div>

          {/* Page Header */}
          <SimulationHeader
            currentUser={logic.currentUser}
            currentDateTime={logic.currentDateTime}
          />

          {/* Not Authenticated - Show Login Prompt */}
          {!logic.isAuthenticated ? (
            <LoginPrompt onLogin={logic.handleLogin} />
          ) : (
            <>
              {/* Usability Code Input */}
              <UsabilityCodeSection
                code={logic.usabilityCode}
                onChange={logic.setUsabilityCode}
              />

              {/* Progress Indicator */}
              <SimulationProgress
                currentStep={logic.currentStep}
                completedSteps={logic.completedSteps}
                selectedPath={logic.selectedPath}
              />

              {/* Simulation Steps */}
              {logic.currentStep !== 'complete' ? (
                <div className="simulation-steps">
                  {/* Step A */}
                  <StepButton
                    step="A"
                    label="Mark myself as usability tester & Autofill Rental Application"
                    isActive={logic.currentStep === 'A' || (logic.currentStep === 'login' && logic.isAuthenticated)}
                    isCompleted={logic.completedSteps.includes('A')}
                    isLoading={logic.stepInProgress === 'A'}
                    onClick={logic.handleStepA}
                    disabled={!logic.isAuthenticated}
                  />

                  {/* Instructions between A and B */}
                  <StepInstructions
                    text="Between Step A & Step B: Review your rental application in the dashboard"
                    visible={logic.completedSteps.includes('A')}
                  />

                  {/* Step B */}
                  <StepButton
                    step="B"
                    label="Virtual Meeting Invitation from Host #1"
                    isActive={logic.currentStep === 'B'}
                    isCompleted={logic.completedSteps.includes('B')}
                    isLoading={logic.stepInProgress === 'B'}
                    onClick={logic.handleStepB}
                    disabled={!logic.completedSteps.includes('A')}
                  />

                  {/* Instructions between B and C */}
                  <StepInstructions
                    text="Between Step B & Step C: Choose your path - Accept or Counteroffer"
                    visible={logic.completedSteps.includes('B')}
                  />

                  {/* Branching Paths */}
                  {logic.completedSteps.includes('B') && (
                    <div className="simulation-paths">
                      <h2 className="simulation-paths__title">Choose Your Path</h2>
                      <p className="simulation-paths__description">
                        Select one of the two scenarios to continue the simulation
                      </p>

                      <div className="simulation-paths__container">
                        <EndingScenario
                          ending={1}
                          title="Ending 1: Host #2 Accepts"
                          currentStep={logic.currentStep}
                          selectedPath={logic.selectedPath}
                          completedSteps={logic.completedSteps}
                          stepInProgress={logic.stepInProgress}
                          onStepC={logic.handleStepC_Ending1}
                          onStepD={() => logic.handleStepD(1)}
                          onStepE={() => logic.handleStepE(1)}
                          disabled={!logic.completedSteps.includes('B')}
                        />

                        <EndingScenario
                          ending={2}
                          title="Ending 2: Host #3 Counteroffers"
                          currentStep={logic.currentStep}
                          selectedPath={logic.selectedPath}
                          completedSteps={logic.completedSteps}
                          stepInProgress={logic.stepInProgress}
                          onStepC={logic.handleStepC_Ending2}
                          onStepD={() => logic.handleStepD(2)}
                          onStepE={() => logic.handleStepE(2)}
                          disabled={!logic.completedSteps.includes('B')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Simulation Complete */
                <SimulationComplete
                  selectedPath={logic.selectedPath}
                  onReset={logic.handleReset}
                />
              )}
            </>
          )}

          {/* Toast Notifications */}
          <Toast
            toast={logic.toast}
            onDismiss={logic.dismissToast}
          />
        </div>
      </main>

      <Footer />
    </>
  );
}
