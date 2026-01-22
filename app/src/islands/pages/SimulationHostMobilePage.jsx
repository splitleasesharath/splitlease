/**
 * Simulation Host Mobile Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useSimulationHostMobilePageLogic hook
 *
 * Purpose:
 * A mobile-first testing page that lets hosts walk through the complete
 * guest proposal workflow in 6 sequential steps (A-F).
 *
 * Migration from Bubble:
 * - 25 Bubble workflows → Single React logic hook
 * - Custom States → React useState + localStorage
 * - JS2Bubble Plugin → Eliminated (native React state)
 */

import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

import { useSimulationHostMobilePageLogic } from './SimulationHostMobilePage/useSimulationHostMobilePageLogic.js';

// Components
import SimulationHeader from './SimulationHostMobilePage/components/SimulationHeader.jsx';
import StepIndicator from './SimulationHostMobilePage/components/StepIndicator.jsx';
import MobileConfirmation from './SimulationHostMobilePage/components/MobileConfirmation.jsx';
import ListingSelector from './SimulationHostMobilePage/components/ListingSelector.jsx';
import StepATester from './SimulationHostMobilePage/components/StepATester.jsx';
import StepBProposals from './SimulationHostMobilePage/components/StepBProposals.jsx';
import StepCCounteroffer from './SimulationHostMobilePage/components/StepCCounteroffer.jsx';
import StepDLease from './SimulationHostMobilePage/components/StepDLease.jsx';
import StepERequest from './SimulationHostMobilePage/components/StepERequest.jsx';
import StepFReview from './SimulationHostMobilePage/components/StepFReview.jsx';
import SimulationComplete from './SimulationHostMobilePage/components/SimulationComplete.jsx';

// Styles
import './SimulationHostMobilePage/SimulationHostMobilePage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="simulation-host-loading">
      <div className="simulation-host-loading__spinner"></div>
      <p className="simulation-host-loading__message">{message}</p>
    </div>
  );
}

// ============================================================================
// LOGIN PROMPT COMPONENT
// ============================================================================

function LoginPrompt({ onLogin }) {
  return (
    <div className="simulation-host-login-prompt">
      <h2>Authentication Required</h2>
      <p>Please log in as a host to start the simulation.</p>
      <button className="simulation-host-login-button" onClick={onLogin}>
        Log In to Continue
      </button>
    </div>
  );
}

// ============================================================================
// NOT A HOST PROMPT COMPONENT
// ============================================================================

function NotHostPrompt() {
  return (
    <div className="simulation-host-not-host">
      <h2>Host Account Required</h2>
      <p>This simulation is for hosts only. Please log in with a host account.</p>
      <a href="/" className="simulation-host-home-link">Return to Home</a>
    </div>
  );
}

// ============================================================================
// NO LISTINGS PROMPT COMPONENT
// ============================================================================

function NoListingsPrompt() {
  return (
    <div className="simulation-host-no-listings">
      <h2>No Listings Found</h2>
      <p>You need at least one published listing to run this simulation.</p>
      <a href="/self-listing" className="simulation-host-create-listing-link">
        Create a Listing
      </a>
    </div>
  );
}

// ============================================================================
// TOAST COMPONENT
// ============================================================================

function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const typeClass = `simulation-host-toast--${toast.type || 'info'}`;

  return (
    <div className={`simulation-host-toast ${typeClass}`} onClick={onDismiss}>
      <strong className="simulation-host-toast__title">{toast.title}</strong>
      {toast.message && (
        <p className="simulation-host-toast__message">{toast.message}</p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimulationHostMobilePage() {
  const logic = useSimulationHostMobilePageLogic();

  // Show loading state while checking auth
  if (logic.authState.isChecking) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="simulation-host-page">
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
        <div className="simulation-host-page">
          {/* Warning Banner */}
          <div className="simulation-host-warning">
            <span className="simulation-host-warning__icon">⚠️</span>
            <span>Please keep this page open. Progress is saved automatically.</span>
          </div>

          {/* Page Header */}
          <SimulationHeader
            currentUser={logic.currentUser}
            currentDateTime={logic.currentDateTime}
          />

          {/* Not Authenticated - Show Login Prompt */}
          {!logic.isAuthenticated ? (
            <LoginPrompt onLogin={logic.handleLogin} />
          ) : !logic.isHost ? (
            /* Authenticated but not a Host */
            <NotHostPrompt />
          ) : logic.hostListings.length === 0 ? (
            /* Host but no listings */
            <NoListingsPrompt />
          ) : logic.currentStep === 'pre-start' ? (
            /* Pre-simulation: Mobile confirmation & listing selection */
            <div className="simulation-host-setup">
              <ListingSelector
                listings={logic.hostListings}
                selectedListing={logic.selectedListing}
                onSelect={logic.handleSelectListing}
              />

              <MobileConfirmation
                confirmed={logic.mobileConfirmed}
                onChange={logic.handleMobileConfirmChange}
                onStart={logic.handleStartSimulation}
                isLoading={logic.isLoading}
                disabled={!logic.selectedListing}
              />
            </div>
          ) : logic.currentStep === 'complete' ? (
            /* Simulation Complete */
            <SimulationComplete
              testGuestName={logic.testGuestName}
              proposalCount={logic.testProposals.length}
              onCleanup={logic.handleCleanup}
              isLoading={logic.isLoading}
            />
          ) : (
            /* Active Simulation */
            <>
              {/* Progress Indicator */}
              <StepIndicator
                currentStep={logic.currentStep}
                completedSteps={logic.completedSteps}
                steps={logic.SIMULATION_STEPS}
                stepOrder={logic.STEP_ORDER}
              />

              {/* Simulation Steps */}
              <div className="simulation-host-steps">
                {/* Step A: Mark as Tester */}
                <StepATester
                  isActive={logic.currentStep === 'A'}
                  isCompleted={logic.completedSteps.includes('A')}
                  isLoading={logic.stepInProgress === 'A'}
                  onAction={logic.handleStepA}
                  disabled={!logic.canActivateStep('A')}
                />

                {/* Step B: Receive Proposals */}
                <StepBProposals
                  isActive={logic.currentStep === 'B'}
                  isCompleted={logic.completedSteps.includes('B')}
                  isLoading={logic.stepInProgress === 'B'}
                  onAction={logic.handleStepB}
                  disabled={!logic.canActivateStep('B')}
                  selectedRentalType={logic.selectedRentalType}
                  onSelectRentalType={logic.handleSelectRentalType}
                  rentalTypes={logic.RENTAL_TYPES}
                  testProposals={logic.testProposals}
                  testGuestName={logic.testGuestName}
                />

                {/* Step C: Counteroffer Rejected */}
                <StepCCounteroffer
                  isActive={logic.currentStep === 'C'}
                  isCompleted={logic.completedSteps.includes('C')}
                  isLoading={logic.stepInProgress === 'C'}
                  onAction={logic.handleStepC}
                  disabled={!logic.canActivateStep('C')}
                  testProposals={logic.testProposals}
                />

                {/* Step D: Accept & Create Lease */}
                <StepDLease
                  isActive={logic.currentStep === 'D'}
                  isCompleted={logic.completedSteps.includes('D')}
                  isLoading={logic.stepInProgress === 'D'}
                  onAction={logic.handleStepD}
                  disabled={!logic.canActivateStep('D')}
                  testProposals={logic.testProposals}
                  leaseId={logic.testLeaseId}
                />

                {/* Step E: Handle Guest Request */}
                <StepERequest
                  isActive={logic.currentStep === 'E'}
                  isCompleted={logic.completedSteps.includes('E')}
                  isLoading={logic.stepInProgress === 'E'}
                  onAction={logic.handleStepE}
                  disabled={!logic.canActivateStep('E')}
                />

                {/* Step F: Complete Stay & Reviews */}
                <StepFReview
                  isActive={logic.currentStep === 'F'}
                  isCompleted={logic.completedSteps.includes('F')}
                  isLoading={logic.stepInProgress === 'F'}
                  onAction={logic.handleStepF}
                  disabled={!logic.canActivateStep('F')}
                />
              </div>

              {/* Cleanup Button (always visible during simulation) */}
              <div className="simulation-host-cleanup-section">
                <button
                  className="simulation-host-cleanup-button"
                  onClick={logic.handleCleanup}
                  disabled={logic.isLoading}
                >
                  🧹 Reset & Clean Up Test Data
                </button>
              </div>
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
