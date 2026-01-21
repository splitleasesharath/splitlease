/**
 * StepBHouseManual - Step B: Receive House Manual
 *
 * Second step where the guest receives access to
 * the house manual from the host.
 */

export default function StepBHouseManual({
  isActive,
  status,
  onAction,
  disabled,
  houseManual,
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
        <h3 className="step-card__title">Receive House Manual</h3>
      </div>

      <p className="step-card__description">
        Your host has shared the house manual with you. This contains important
        information about the property, including check-in instructions, house rules,
        and local recommendations.
      </p>

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Manual Received
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          View House Manual
        </button>
      )}
    </div>
  );
}
