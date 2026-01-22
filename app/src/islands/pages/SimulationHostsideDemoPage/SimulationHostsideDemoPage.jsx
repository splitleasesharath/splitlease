/**
 * Simulation Hostside Demo Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useSimulationHostsideDemoPageLogic hook
 *
 * Purpose:
 * A usability testing simulation that walks testers through the complete
 * host-side workflow: receiving proposals, managing virtual meetings,
 * drafting leases, and handling guest-initiated VM invites.
 *
 * Migration from Bubble:
 * - Bubble's Custom States → React useState (in hook)
 * - Bubble's Workflows → Event handlers (in hook)
 * - Bubble's "Usability Step" field → localStorage (MVP)
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Four-Layer Logic Architecture via hook
 *
 * @module pages/SimulationHostsideDemoPage/SimulationHostsideDemoPage
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';

import { useSimulationHostsideDemoPageLogic } from './useSimulationHostsideDemoPageLogic.js';

// Components
import { StepButton } from './components/StepButton.jsx';
import { StepIndicator } from './components/StepIndicator.jsx';
import { StepInstructions } from './components/StepInstructions.jsx';
import { SimulatedProposalCard } from './components/SimulatedProposalCard.jsx';

// Styles
import './SimulationHostsideDemoPage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="host-simulation-loading">
      <div className="host-simulation-loading__spinner"></div>
      <p className="host-simulation-loading__message">{message}</p>
    </div>
  );
}

// ============================================================================
// LOGIN PROMPT COMPONENT
// ============================================================================

function LoginPrompt({ onLogin }) {
  return (
    <div className="host-simulation-login-prompt">
      <h2>Authentication Required</h2>
      <p>Please log in to start the host usability simulation.</p>
      <button className="host-simulation-login-button" onClick={onLogin}>
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

  const typeClass = `host-simulation-toast--${toast.type || 'info'}`;

  return (
    <div className={`host-simulation-toast ${typeClass}`} onClick={onDismiss}>
      <strong className="host-simulation-toast__title">{toast.title}</strong>
      {toast.message && (
        <p className="host-simulation-toast__message">{toast.message}</p>
      )}
    </div>
  );
}

// ============================================================================
// SIMULATION COMPLETE COMPONENT
// ============================================================================

function SimulationComplete({ onReset }) {
  return (
    <div className="host-simulation-complete">
      <div className="host-simulation-complete__icon">🎉</div>
      <h2 className="host-simulation-complete__title">Simulation Complete!</h2>
      <p className="host-simulation-complete__message">
        Congratulations! You have successfully completed all steps of the host-side simulation.
      </p>
      <div className="host-simulation-complete__summary">
        <h3>What you simulated:</h3>
        <ul>
          <li>✓ Marked yourself as a usability tester</li>
          <li>✓ Received 3 proposals from simulated guests</li>
          <li>✓ Mariska accepted your VM invitation</li>
          <li>✓ Drafted lease documents for Mariska's proposal</li>
          <li>✓ Received a VM invite from Jacques</li>
        </ul>
      </div>
      <button className="host-simulation-complete__reset-button" onClick={onReset}>
        Reset & Start Over
      </button>
      <p className="host-simulation-complete__note">
        This simulation used mock data and did not affect your real account.
      </p>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function SimulationHeader({ currentUser, currentDateTime }) {
  return (
    <header className="host-simulation-header">
      <h1 className="host-simulation-header__title">Host Simulation Demo</h1>
      <p className="host-simulation-header__subtitle">
        Test the host workflow without affecting real data
      </p>
      <div className="host-simulation-header__info">
        {currentUser && (
          <span className="host-simulation-header__user">
            Logged in as: <strong>{currentUser.email || currentUser.firstName}</strong>
          </span>
        )}
        <span className="host-simulation-header__datetime">{currentDateTime}</span>
      </div>
    </header>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimulationHostsideDemoPage() {
  const logic = useSimulationHostsideDemoPageLogic();

  // Show loading state while checking auth
  if (logic.authState.isChecking) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="host-simulation-page">
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
        <div className="host-simulation-page">
          {/* Warning Banner */}
          <div className="host-simulation-warning">
            <span className="host-simulation-warning__icon">⚠️</span>
            <span>This is a simulation using mock data. Your progress is saved in your browser.</span>
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
              {/* Progress Indicator */}
              <StepIndicator
                currentStep={logic.currentStep}
                totalSteps={logic.totalSteps}
              />

              {/* Simulation Steps or Completion */}
              {logic.currentStep >= logic.totalSteps ? (
                <SimulationComplete onReset={logic.handleResetSimulation} />
              ) : (
                <div className="host-simulation-steps">
                  {/* Step A */}
                  <StepButton
                    stepId="A"
                    stepNumber={1}
                    label="Mark yourself as a Usability Tester"
                    isActive={logic.canClickStep('A')}
                    isCompleted={logic.isStepCompleted('A')}
                    isLoading={logic.loadingStep === 'A'}
                    onClick={logic.handleStepAClick}
                    disabled={!logic.canClickStep('A')}
                  />

                  {/* Instructions between A and B */}
                  <StepInstructions
                    text={logic.getBetweenStepText('A')}
                    visible={logic.stepClicked.A && !logic.isStepCompleted('B')}
                  />

                  {/* Step B */}
                  <StepButton
                    stepId="B"
                    stepNumber={2}
                    label="Receive 3 Proposals"
                    isActive={logic.canClickStep('B')}
                    isCompleted={logic.isStepCompleted('B')}
                    isLoading={logic.loadingStep === 'B'}
                    onClick={logic.handleStepBClick}
                    disabled={!logic.canClickStep('B')}
                  />

                  {/* Instructions between B and C */}
                  <StepInstructions
                    text={logic.getBetweenStepText('B')}
                    visible={logic.stepClicked.B && !logic.isStepCompleted('C')}
                  />

                  {/* Proposals Preview (shown after Step B) */}
                  {logic.currentStep >= 2 && logic.simulatedProposals.length > 0 && (
                    <section className="host-simulation-proposals">
                      <h2 className="host-simulation-proposals__title">Simulated Proposals</h2>
                      <div className="host-simulation-proposals__grid">
                        {logic.simulatedProposals.map((proposal, index) => (
                          <SimulatedProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            index={index}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Step C */}
                  <StepButton
                    stepId="C"
                    stepNumber={3}
                    label="Mariska Accepts VM Invite"
                    isActive={logic.canClickStep('C')}
                    isCompleted={logic.isStepCompleted('C')}
                    isLoading={logic.loadingStep === 'C'}
                    onClick={logic.handleStepCClick}
                    disabled={!logic.canClickStep('C')}
                  />

                  {/* Instructions between C and D */}
                  <StepInstructions
                    text={logic.getBetweenStepText('C')}
                    visible={logic.stepClicked.C && !logic.isStepCompleted('D')}
                  />

                  {/* Step D */}
                  <StepButton
                    stepId="D"
                    stepNumber={4}
                    label="Draft Lease Docs for Proposal #2"
                    isActive={logic.canClickStep('D')}
                    isCompleted={logic.isStepCompleted('D')}
                    isLoading={logic.loadingStep === 'D'}
                    onClick={logic.handleStepDClick}
                    disabled={!logic.canClickStep('D')}
                  />

                  {/* Instructions between D and E */}
                  <StepInstructions
                    text={logic.getBetweenStepText('D')}
                    visible={logic.stepClicked.D && !logic.isStepCompleted('E')}
                  />

                  {/* Step E */}
                  <StepButton
                    stepId="E"
                    stepNumber={5}
                    label="VM invite from Guest Jacques"
                    isActive={logic.canClickStep('E')}
                    isCompleted={logic.isStepCompleted('E')}
                    isLoading={logic.loadingStep === 'E'}
                    onClick={logic.handleStepEClick}
                    disabled={!logic.canClickStep('E')}
                  />
                </div>
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
