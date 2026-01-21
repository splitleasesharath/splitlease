/**
 * StepALeaseDocuments - Step A: Lease Documents Signed
 *
 * First step in the guest simulation where the guest
 * signs lease documents for a property.
 */

export default function StepALeaseDocuments({
  isActive,
  status,
  onAction,
  disabled,
  stepNumber
}) {
  const isCompleted = status === 'completed';

  return (
    <div className={`step-card ${isActive ? 'step-card--active' : ''} ${isCompleted ? 'step-card--completed' : ''}`}>
      <div className="step-card__header">
        <div className="step-card__number">
          {isCompleted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            stepNumber
          )}
        </div>
        <h3 className="step-card__title">Lease Documents Signed</h3>
      </div>

      <p className="step-card__description">
        Sign the lease documents for your selected property. This simulates
        the process of reviewing and digitally signing your rental agreement.
      </p>

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Lease Signed
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          Sign Lease Documents
        </button>
      )}
    </div>
  );
}
