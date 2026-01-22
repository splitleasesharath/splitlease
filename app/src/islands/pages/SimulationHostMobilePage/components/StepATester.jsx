/**
 * Step A: Mark as Tester Component
 */

export default function StepATester({
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
        <span className="simulation-host-step__number">A</span>
        <h3 className="simulation-host-step__title">Mark as Usability Tester</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        Mark yourself as a usability tester to enable simulation features.
        This flags your account for testing purposes.
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
              Marking...
            </>
          ) : (
            '🎯 Mark as Tester'
          )}
        </button>
      )}

      {isCompleted && (
        <div className="simulation-host-step__completed-message">
          ✅ You are now marked as a usability tester
        </div>
      )}
    </div>
  );
}
