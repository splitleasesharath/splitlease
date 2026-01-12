/**
 * StepProgress - Progress indicator for the 3-step wizard
 */

export default function StepProgress({ currentStep }) {
  const steps = [
    { number: 1, label: 'Select Listing' },
    { number: 2, label: 'Select Guest' },
    { number: 3, label: 'Configure Proposal' }
  ];

  return (
    <div className="csp-steps-container">
      {steps.map((step, index) => (
        <div key={step.number} className="csp-step-wrapper">
          <div
            className={`csp-step ${
              currentStep > step.number ? 'completed' :
              currentStep === step.number ? 'active' : ''
            }`}
          >
            <div className="csp-step-indicator">
              {currentStep > step.number ? (
                <svg className="csp-step-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <span className="csp-step-number">{step.number}</span>
              )}
            </div>
            <span className="csp-step-label">{step.label}</span>
          </div>
          {index < steps.length - 1 && <div className="csp-step-connector" />}
        </div>
      ))}
    </div>
  );
}
