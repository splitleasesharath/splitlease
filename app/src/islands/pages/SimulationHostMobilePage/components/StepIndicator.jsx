/**
 * Step Indicator Component
 * Shows progress through the 6 simulation steps (A-F)
 */

export default function StepIndicator({ currentStep, completedSteps, steps, stepOrder }) {
  return (
    <div className="simulation-host-progress">
      <div className="simulation-host-progress__track">
        {stepOrder.map((stepId, index) => {
          const step = steps[stepId];
          const isCompleted = completedSteps.includes(stepId);
          const isActive = stepId === currentStep;
          const isPending = !isCompleted && !isActive;

          let statusClass = 'simulation-host-progress__step--pending';
          if (isCompleted) statusClass = 'simulation-host-progress__step--completed';
          if (isActive) statusClass = 'simulation-host-progress__step--current';

          return (
            <div key={stepId} className="simulation-host-progress__step-wrapper">
              <div className={`simulation-host-progress__step ${statusClass}`}>
                <div className="simulation-host-progress__icon">
                  {isCompleted ? (
                    <span>✓</span>
                  ) : (
                    <span>{stepId}</span>
                  )}
                </div>
                <span className="simulation-host-progress__label">
                  {step.shortLabel}
                </span>
              </div>
              {index < stepOrder.length - 1 && (
                <span className="simulation-host-progress__connector">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
