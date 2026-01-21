/**
 * GuestSimulationPage - Day 1 Guest Proposal Simulation (Steps 1-6)
 *
 * HOLLOW COMPONENT: Contains ONLY JSX rendering.
 * ALL business logic is delegated to useGuestSimulationLogic hook.
 *
 * This page guides testers through a 6-step simulation to test the
 * complete guest proposal experience. Steps correspond to:
 *   A (1): Mark as Usability Tester
 *   B (2): Receive 2 Suggested Proposals
 *   C (3): Receive Counteroffer from Host
 *   D (4): Email Response (disabled - not implemented)
 *   E (5): Virtual Meeting from Host
 *   F (6): Acceptance of 2 Proposals
 *
 * @module islands/pages/GuestSimulationPage/GuestSimulationPage
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { ToastProvider } from '../../shared/Toast.jsx';
import { useGuestSimulationLogic } from './useGuestSimulationLogic.js';
import StepProgress from './components/StepProgress.jsx';
import LoginSection from './components/LoginSection.jsx';
import StepCard from './components/StepCard.jsx';
import './GuestSimulationPage.css';

export default function GuestSimulationPage() {
  const {
    // Auth state
    authState,
    loginEmail,
    loginPassword,
    loginError,

    // Simulation state
    currentStep,
    stepStatuses,
    simulationData,
    mobileConfirmed,

    // UI state
    isLoading,
    loadingMessage,
    error,

    // Auth handlers
    handleEmailChange,
    handlePasswordChange,
    handleLogin,

    // Simulation handlers
    handleMobileConfirmChange,
    handleStepA,
    handleStepB,
    handleStepC,
    handleStepE,
    handleStepF,
    handleReset,
    clearError
  } = useGuestSimulationLogic();

  // Auth loading state
  if (authState.isLoading) {
    return (
      <div className="gsim-page">
        <Header />
        <main className="gsim-main">
          <div className="gsim-loading">
            <div className="gsim-loading__spinner" />
            <p>Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Main simulation view
  return (
    <ToastProvider>
      <div className="gsim-page">
        <Header />
        <main className="gsim-main">
          <div className="gsim-container">
            {/* Page Header */}
            <header className="gsim-header">
              <h1 className="gsim-title">Guest Proposal Simulation (Day 1)</h1>
              <p className="gsim-subtitle">
                6-step usability testing simulation for the guest proposal flow
              </p>
            </header>

            {/* Warning Banner */}
            <div className="gsim-warning-banner">
              <svg className="gsim-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
              </svg>
              <span>Keep this page open during testing. Progress will be lost if you reload.</span>
            </div>

            {/* Login Section (if not authenticated) */}
            {!authState.isAuthenticated && (
              <LoginSection
                email={loginEmail}
                password={loginPassword}
                error={loginError}
                isLoading={isLoading}
                onEmailChange={handleEmailChange}
                onPasswordChange={handlePasswordChange}
                onSubmit={handleLogin}
              />
            )}

            {/* Authenticated Content */}
            {authState.isAuthenticated && (
              <>
                {/* User Info */}
                <div className="gsim-user-info">
                  <span className="gsim-user-label">Logged in as:</span>
                  <span className="gsim-user-email">{authState.user?.email || authState.user?.firstName || 'User'}</span>
                </div>

                {/* Error display */}
                {error && (
                  <div className="gsim-error">
                    <p>{error}</p>
                    <button onClick={clearError} type="button">Dismiss</button>
                  </div>
                )}

                {/* Mobile Confirmation Checkbox (before starting) */}
                {currentStep === 0 && (
                  <div className="gsim-mobile-confirm">
                    <label className="gsim-checkbox-label">
                      <input
                        type="checkbox"
                        checked={mobileConfirmed}
                        onChange={(e) => handleMobileConfirmChange(e.target.checked)}
                        disabled={isLoading}
                      />
                      <span>I&apos;m testing on mobile</span>
                    </label>
                    <p className="gsim-mobile-hint">
                      Check this box to confirm you are using a mobile device for testing.
                    </p>
                  </div>
                )}

                {/* Step Progress Indicator (after starting) */}
                {currentStep > 0 && (
                  <StepProgress currentStep={currentStep} stepStatuses={stepStatuses} />
                )}

                {/* Step Cards */}
                <div className="gsim-steps-grid">
                  {/* Step A: Mark as Usability Tester */}
                  <StepCard
                    stepNumber={1}
                    stepLetter="A"
                    title="Mark as Usability Tester"
                    description="Set your user account as a usability tester to enable test mode features."
                    status={stepStatuses.A}
                    isActive={currentStep === 0 || stepStatuses.A === 'active'}
                    isLoading={isLoading && loadingMessage.includes('Step A')}
                    onAction={handleStepA}
                    buttonText="Mark as Tester"
                    disabled={!mobileConfirmed && currentStep === 0}
                    result={simulationData.stepAResult}
                  />

                  {/* Step B: Receive 2 Suggested Proposals */}
                  <StepCard
                    stepNumber={2}
                    stepLetter="B"
                    title="Receive 2 Suggested Proposals"
                    description="Create 2 test proposals linked to usability test listings."
                    status={stepStatuses.B}
                    isActive={stepStatuses.B === 'active'}
                    isLoading={isLoading && loadingMessage.includes('Step B')}
                    onAction={handleStepB}
                    buttonText="Create Proposals"
                    disabled={stepStatuses.B !== 'active'}
                    result={simulationData.stepBResult}
                  />

                  {/* Step C: Receive Counteroffer */}
                  <StepCard
                    stepNumber={3}
                    stepLetter="C"
                    title="Receive Counteroffer from Host"
                    description="Simulate receiving a host counter-offer with modified pricing."
                    status={stepStatuses.C}
                    isActive={stepStatuses.C === 'active'}
                    isLoading={isLoading && loadingMessage.includes('Step C')}
                    onAction={handleStepC}
                    buttonText="Apply Counteroffer"
                    disabled={stepStatuses.C !== 'active'}
                    result={simulationData.stepCResult}
                  />

                  {/* Step D: Email Response (Disabled) */}
                  <StepCard
                    stepNumber={4}
                    stepLetter="D"
                    title="Email Response"
                    description="This step is not implemented in the original Bubble workflow."
                    status="disabled"
                    isActive={false}
                    isLoading={false}
                    onAction={null}
                    buttonText="Not Implemented"
                    disabled={true}
                    result={null}
                  />

                  {/* Step E: Virtual Meeting */}
                  <StepCard
                    stepNumber={5}
                    stepLetter="E"
                    title="Virtual Meeting from Host"
                    description="Simulate scheduling a virtual meeting with the host."
                    status={stepStatuses.E}
                    isActive={stepStatuses.E === 'active'}
                    isLoading={isLoading && loadingMessage.includes('Step E')}
                    onAction={handleStepE}
                    buttonText="Schedule Meeting"
                    disabled={stepStatuses.E !== 'active'}
                    result={simulationData.stepEResult}
                  />

                  {/* Step F: Acceptance */}
                  <StepCard
                    stepNumber={6}
                    stepLetter="F"
                    title="Acceptance of 2 Proposals"
                    description="Accept both test proposals to complete the simulation."
                    status={stepStatuses.F}
                    isActive={stepStatuses.F === 'active'}
                    isLoading={isLoading && loadingMessage.includes('Step F')}
                    onAction={handleStepF}
                    buttonText="Accept Proposals"
                    disabled={stepStatuses.F !== 'active'}
                    result={simulationData.stepFResult}
                  />
                </div>

                {/* Simulation Complete Section */}
                {stepStatuses.F === 'completed' && (
                  <div className="gsim-complete">
                    <div className="gsim-complete-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h2>Simulation Complete!</h2>
                    <p>You have successfully completed the Day 1 guest proposal simulation.</p>
                    <button
                      className="gsim-btn gsim-btn-secondary"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      Reset & Start Over
                    </button>
                  </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="gsim-loading-overlay">
                    <div className="gsim-loading__spinner" />
                    <p>{loadingMessage || 'Processing...'}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
