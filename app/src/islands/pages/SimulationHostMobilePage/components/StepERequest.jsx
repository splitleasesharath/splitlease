/**
 * Step E: Handle Guest Request Component
 */

export default function StepERequest({
  isActive,
  isCompleted,
  isLoading,
  onAction,
  disabled
}) {
  let containerClass = 'simulation-host-step';
  if (isActive) containerClass += ' simulation-host-step--active';
  if (isCompleted) containerClass += ' simulation-host-step--completed';
  if (disabled && !isCompleted) containerClass += ' simulation-host-step--disabled';

  return (
    <div className={containerClass}>
      <div className="simulation-host-step__header">
        <span className="simulation-host-step__number">E</span>
        <h3 className="simulation-host-step__title">Guest Request</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        The guest submits an early check-in request. You will approve it.
      </p>

      {!isCompleted && (
        <button
          className="simulation-host-step__button"
          onClick={onAction}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <span className="simulation-host-spinner"></span>
              Processing Request...
            </>
          ) : (
            '📝 Handle Guest Request'
          )}
        </button>
      )}

      {isCompleted && (
        <div className="simulation-host-step__completed-message">
          <p>📨 Guest requested: Early Check-in</p>
          <p>✅ Request approved</p>
        </div>
      )}
    </div>
  );
}
