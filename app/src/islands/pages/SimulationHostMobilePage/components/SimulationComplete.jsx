/**
 * Simulation Complete Component
 * Shows completion message and cleanup option
 */

export default function SimulationComplete({
  testGuestName,
  proposalCount,
  onCleanup,
  isLoading
}) {
  return (
    <div className="simulation-host-complete">
      <div className="simulation-host-complete__icon">🎉</div>
      <h2 className="simulation-host-complete__title">Simulation Complete!</h2>
      <p className="simulation-host-complete__message">
        Congratulations! You have successfully completed the host-side proposal workflow simulation.
      </p>

      <div className="simulation-host-complete__summary">
        <h3>Summary</h3>
        <ul>
          <li>✅ Marked as usability tester</li>
          <li>📥 Received {proposalCount} proposals from {testGuestName || 'Test Guest'}</li>
          <li>📤 Sent counteroffer (rejected by guest)</li>
          <li>✅ Accepted proposal & created lease</li>
          <li>📝 Handled guest request</li>
          <li>🏁 Completed stay with reviews</li>
        </ul>
      </div>

      <div className="simulation-host-complete__actions">
        <button
          className="simulation-host-complete__cleanup-button"
          onClick={onCleanup}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="simulation-host-spinner"></span>
              Cleaning Up...
            </>
          ) : (
            '🧹 Clean Up & Start Over'
          )}
        </button>
      </div>

      <p className="simulation-host-complete__note">
        Clicking "Clean Up" will remove all test data created during this simulation.
      </p>
    </div>
  );
}
