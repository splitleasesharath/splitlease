/**
 * StepIndicator - 6-step progress indicator (A-F)
 *
 * Shows steps numbered 7-12 per the original requirements doc
 * (Day 2 of simulation continues numbering from Day 1).
 */

export default function StepIndicator({ currentStep, stepStatuses }) {
  const steps = [
    { id: 'A', number: 7, label: 'Lease Signed' },
    { id: 'B', number: 8, label: 'House Manual' },
    { id: 'C', number: 9, label: 'Date Change' },
    { id: 'D', number: 10, label: 'Lease Ending' },
    { id: 'E', number: 11, label: 'Host SMS' },
    { id: 'F', number: 12, label: 'Finish' }
  ];

  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const status = stepStatuses[step.id];

        return (
          <div key={step.id} className="step-indicator__item">
            <div className={`step-indicator__circle step-indicator__circle--${status}`}>
              {status === 'completed' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <span className="step-indicator__label">{step.label}</span>
            {index < steps.length - 1 && <div className="step-indicator__connector" />}
          </div>
        );
      })}
    </div>
  );
}
