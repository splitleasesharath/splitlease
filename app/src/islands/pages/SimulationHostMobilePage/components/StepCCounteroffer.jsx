/**
 * Step C: Counteroffer Rejected Component
 * Host sends counteroffer, guest rejects
 */

export default function StepCCounteroffer({
  isActive,
  isCompleted,
  isLoading,
  onAction,
  disabled,
  testProposals
}) {
  let containerClass = 'simulation-host-step';
  if (isActive) containerClass += ' simulation-host-step--active';
  if (isCompleted) containerClass += ' simulation-host-step--completed';
  if (disabled && !isCompleted) containerClass += ' simulation-host-step--disabled';

  const proposalForCounter = testProposals?.[0];

  return (
    <div className={containerClass}>
      <div className="simulation-host-step__header">
        <span className="simulation-host-step__number">C</span>
        <h3 className="simulation-host-step__title">Counteroffer Rejected</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        Send a counteroffer to the first proposal. The guest will reject it (simulated).
      </p>

      {isActive && proposalForCounter && (
        <div className="simulation-host-step__info">
          <p>
            <strong>Proposal to counter:</strong> {proposalForCounter.rentalType}
          </p>
        </div>
      )}

      {!isCompleted && (
        <button
          className="simulation-host-step__button"
          onClick={onAction}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <span className="simulation-host-spinner"></span>
              Sending Counteroffer...
            </>
          ) : (
            '📤 Send Counteroffer'
          )}
        </button>
      )}

      {isCompleted && (
        <div className="simulation-host-step__completed-message">
          <p>✅ Counteroffer sent</p>
          <p>❌ Guest rejected the counteroffer</p>
        </div>
      )}
    </div>
  );
}
