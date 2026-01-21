/**
 * Step D: Accept Proposal & Create Lease Component
 */

export default function StepDLease({
  isActive,
  isCompleted,
  isLoading,
  onAction,
  disabled,
  testProposals,
  leaseId
}) {
  let containerClass = 'simulation-host-step';
  if (isActive) containerClass += ' simulation-host-step--active';
  if (isCompleted) containerClass += ' simulation-host-step--completed';
  if (disabled && !isCompleted) containerClass += ' simulation-host-step--disabled';

  // Use second proposal (or first if only one)
  const proposalToAccept = testProposals?.[1] || testProposals?.[0];

  return (
    <div className={containerClass}>
      <div className="simulation-host-step__header">
        <span className="simulation-host-step__number">D</span>
        <h3 className="simulation-host-step__title">Accept & Create Lease</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        Accept a different proposal and create a lease document.
      </p>

      {isActive && proposalToAccept && (
        <div className="simulation-host-step__info">
          <p>
            <strong>Proposal to accept:</strong> {proposalToAccept.rentalType}
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
              Creating Lease...
            </>
          ) : (
            '✅ Accept & Create Lease'
          )}
        </button>
      )}

      {isCompleted && (
        <div className="simulation-host-step__completed-message">
          <p>✅ Proposal accepted</p>
          {leaseId && <p>📄 Lease created: {leaseId.substring(0, 8)}...</p>}
        </div>
      )}
    </div>
  );
}
