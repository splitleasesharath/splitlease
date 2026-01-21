/**
 * StepDLeaseEnding - Step D: Lease Reaching End
 *
 * Fourth step where the guest views information about
 * their lease approaching its end date.
 */

export default function StepDLeaseEnding({
  isActive,
  status,
  onAction,
  disabled,
  lease,
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
        <h3 className="step-card__title">Lease Reaching End</h3>
      </div>

      <p className="step-card__description">
        Your lease is approaching its end date. Review the upcoming checkout
        details and consider your options for extending or ending your stay.
      </p>

      {lease && lease.endDate && (
        <div className="step-card__info">
          <p className="step-card__info-label">Checkout Date:</p>
          <p className="step-card__info-value">{lease.endDate}</p>
        </div>
      )}

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Lease End Viewed
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          View Lease Ending Details
        </button>
      )}
    </div>
  );
}
