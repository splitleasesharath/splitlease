/**
 * StepFFinish - Step F: FINISH Usability Test
 *
 * Final step where the guest completes the simulation
 * and finishes the usability test.
 */

export default function StepFFinish({
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
        <h3 className="step-card__title">FINISH Usability Test</h3>
      </div>

      <p className="step-card__description">
        Congratulations! You've completed all the steps in the guest experience
        simulation. Click below to finish the test and see your results.
      </p>

      {isCompleted ? (
        <div className="step-card__completed-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Test Completed
        </div>
      ) : (
        <button
          className="step-card__button"
          onClick={onAction}
          disabled={disabled}
          type="button"
        >
          Finish Simulation
        </button>
      )}
    </div>
  );
}
