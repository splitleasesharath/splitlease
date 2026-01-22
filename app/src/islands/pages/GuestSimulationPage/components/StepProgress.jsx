/**
 * StepProgress - Progress indicator for the 6-step simulation wizard
 *
 * Displays steps A-F (shown as 1-6) with visual indicators for:
 * - Completed steps (checkmark)
 * - Active step (highlighted)
 * - Pending steps (number)
 * - Disabled steps (grayed out)
 *
 * @param {Object} props
 * @param {number} props.currentStep - Current step index (0-6)
 * @param {Object} props.stepStatuses - Status of each step { A: 'pending'|'active'|'completed'|'disabled', ... }
 */
export default function StepProgress({ currentStep, stepStatuses }) {
  const steps = [
    { letter: 'A', number: 1, label: 'Mark Tester' },
    { letter: 'B', number: 2, label: 'Proposals' },
    { letter: 'C', number: 3, label: 'Counteroffer' },
    { letter: 'D', number: 4, label: 'Email' },
    { letter: 'E', number: 5, label: 'Meeting' },
    { letter: 'F', number: 6, label: 'Accept' }
  ];

  return (
    <div className="gsim-steps-container">
      {steps.map((step, index) => {
        const status = stepStatuses[step.letter];
        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isDisabled = status === 'disabled';

        return (
          <div key={step.letter} className="gsim-step-wrapper">
            <div
              className={`gsim-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            >
              <div className="gsim-step-indicator">
                {isCompleted ? (
                  <svg className="gsim-step-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isDisabled ? (
                  <svg className="gsim-step-disabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <span className="gsim-step-number">{step.number}</span>
                )}
              </div>
              <span className="gsim-step-label">{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className="gsim-step-connector" />}
          </div>
        );
      })}
    </div>
  );
}
