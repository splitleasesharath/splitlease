/**
 * SimulationComplete - Final completion screen
 *
 * Shown after all steps are completed. Provides option
 * to clean up test data or return to dashboard.
 */

export default function SimulationComplete({
  simulationData,
  onCleanup,
  isLoading
}) {
  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="simulation-complete">
      <div className="simulation-complete__icon">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="simulation-complete__title">
        Simulation Complete!
      </h2>

      <p className="simulation-complete__message">
        Thank you for completing the guest experience simulation.
        Your feedback helps us improve Split Lease for all users.
      </p>

      <div className="simulation-complete__actions">
        <button
          className="simulation-complete__button simulation-complete__button--secondary"
          onClick={onCleanup}
          disabled={isLoading}
          type="button"
        >
          {isLoading ? 'Cleaning up...' : 'Clean Up Test Data'}
        </button>

        <button
          className="simulation-complete__button simulation-complete__button--primary"
          onClick={handleGoToDashboard}
          disabled={isLoading}
          type="button"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
