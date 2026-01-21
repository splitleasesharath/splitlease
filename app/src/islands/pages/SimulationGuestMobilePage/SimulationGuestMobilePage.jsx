/**
 * SimulationGuestMobilePage - Guest simulation workflow
 *
 * HOLLOW COMPONENT: Contains ONLY JSX rendering.
 * ALL business logic is delegated to useSimulationGuestMobilePageLogic hook.
 *
 * This page guides guests through a 6-step simulation (A-F, displayed as 7-12)
 * to test the complete guest experience on mobile devices.
 *
 * @module islands/pages/SimulationGuestMobilePage/SimulationGuestMobilePage
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { ToastProvider } from '../../shared/Toast.jsx';
import { useSimulationGuestMobilePageLogic } from './useSimulationGuestMobilePageLogic.js';
import StepIndicator from './components/StepIndicator.jsx';
import MobileConfirmation from './components/MobileConfirmation.jsx';
import WarningBanner from './components/WarningBanner.jsx';
import UserInfoHeader from './components/UserInfoHeader.jsx';
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
          <div className="simulation-loading">
            <div className="simulation-loading__spinner" />
            <p>Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated - this shouldn't render as hook redirects
  if (!authState.isAuthenticated) {
    return (
      <div className="simulation-page">
        <Header />
        <main className="simulation-main">
          <div className="simulation-loading">
            <p>Redirecting to login...</p>
          </div>
        </main>
        <Footer />
      </div>
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

  // Main simulation view
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

          {/* Error display */}
          {error && (
            <div className="simulation-error">
              <p>{error}</p>
              <button onClick={clearError} type="button">Dismiss</button>
            </div>
          )}

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
              dateChangeRequest={simulationData.dateChangeRequest}
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
