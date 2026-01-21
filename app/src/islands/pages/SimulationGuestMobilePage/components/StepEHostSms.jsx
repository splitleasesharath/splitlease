/**
 * StepEHostSms - Step E: Host Sent SMS
 *
 * Fifth step where the guest receives and reads
 * an SMS notification from the host.
 */

export default function StepEHostSms({
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
        <h3 className="step-card__title">Host Sent SMS</h3>
      </div>

      <p className="step-card__description">
        Your host has sent you an important message via SMS.
        Tap below to read the message and acknowledge receipt.
      </p>

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Message Read
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          Read Host Message
        </button>
      )}
    </div>
  );
}
