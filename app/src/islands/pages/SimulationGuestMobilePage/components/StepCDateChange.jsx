/**
 * StepCDateChange - Step C: Date Change (Host-Led)
 *
 * Third step where the guest handles a date change
 * request initiated by the host.
 */

export default function StepCDateChange({
  isActive,
  status,
  onAction,
  disabled,
  dateChangeRequest,
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
        <h3 className="step-card__title">Date Change Request</h3>
      </div>

      <p className="step-card__description">
        Your host has requested a change to your reservation dates.
        Review the proposed new dates and respond to the request.
      </p>

      {dateChangeRequest && (
        <div className="step-card__info">
          <p className="step-card__info-label">Proposed Change:</p>
          <p className="step-card__info-value">
            {dateChangeRequest.newStartDate} - {dateChangeRequest.newEndDate}
          </p>
        </div>
      )}

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Date Change Handled
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          Accept Date Change
        </button>
      )}
    </div>
  );
}
