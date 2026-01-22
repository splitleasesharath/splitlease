/**
 * Step F: Complete Stay & Reviews Component
 */

export default function StepFReview({
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
        <span className="simulation-host-step__number">F</span>
        <h3 className="simulation-host-step__title">Complete Stay</h3>
        {isCompleted && <span className="simulation-host-step__check">✓</span>}
      </div>

      <p className="simulation-host-step__description">
        Mark the stay as complete and exchange reviews with the guest.
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
              Completing Stay...
            </>
          ) : (
            '🏁 Complete Stay & Reviews'
          )}
        </button>
      )}

      {isCompleted && (
        <div className="simulation-host-step__completed-message">
          <p>✅ Stay marked as complete</p>
          <p>⭐ Reviews exchanged (5 stars each)</p>
        </div>
      )}
    </div>
  );
}
