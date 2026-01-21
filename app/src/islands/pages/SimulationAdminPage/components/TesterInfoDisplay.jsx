/**
 * TesterInfoDisplay - Display selected tester details and progress
 *
 * Features:
 * - Tester name and email
 * - Current usability step with progress visualization
 * - Last modified date
 * - Action buttons (Reset to Day 1, Advance to Day 2)
 */

import './TesterInfoDisplay.css';

export default function TesterInfoDisplay({
  tester,
  stepConfig,
  onResetToDay1,
  onAdvanceToDay2,
  getStepLabel,
  getStepColor,
  formatDate,
  getTesterDisplayName,
  isProcessing,
}) {
  const progressPercentage = (tester.usabilityStep / 7) * 100;

  return (
    <div className="tester-info-display">
      {/* Header */}
      <div className="tester-info-display__header">
        <div className="tester-info-display__avatar">
          <UserIcon />
        </div>
        <div className="tester-info-display__identity">
          <h3 className="tester-info-display__name">
            {getTesterDisplayName(tester)}
          </h3>
          <span className="tester-info-display__email">
            {tester.email}
          </span>
        </div>
      </div>

      {/* Current Step */}
      <div className="tester-info-display__section">
        <h4 className="tester-info-display__section-title">Current Progress</h4>
        <div className="tester-info-display__progress">
          <div className="tester-info-display__progress-bar">
            <div
              className={`tester-info-display__progress-fill tester-info-display__progress-fill--${getStepColor(tester.usabilityStep)}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="tester-info-display__progress-text">
            Step {tester.usabilityStep} of 7
          </span>
        </div>
        <div className={`tester-info-display__step-badge tester-info-display__step-badge--${getStepColor(tester.usabilityStep)}`}>
          {tester.stepLabel || getStepLabel(tester.usabilityStep)}
        </div>
      </div>

      {/* Step Details */}
      <div className="tester-info-display__section">
        <h4 className="tester-info-display__section-title">Workflow Steps</h4>
        <div className="tester-info-display__steps">
          {Object.entries(stepConfig).map(([step, config]) => {
            const stepNum = parseInt(step, 10);
            const isCurrentStep = stepNum === tester.usabilityStep;
            const isCompleted = stepNum < tester.usabilityStep;

            return (
              <div
                key={step}
                className={`tester-info-display__step-item ${
                  isCurrentStep ? 'tester-info-display__step-item--current' : ''
                } ${isCompleted ? 'tester-info-display__step-item--completed' : ''}`}
              >
                <span className="tester-info-display__step-number">
                  {isCompleted ? <CheckIcon /> : stepNum}
                </span>
                <span className="tester-info-display__step-label">
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Modified */}
      <div className="tester-info-display__meta">
        <span className="tester-info-display__meta-label">Last Modified:</span>
        <span className="tester-info-display__meta-value">
          {formatDate(tester.modifiedDate)}
        </span>
      </div>

      {/* Actions */}
      <div className="tester-info-display__actions">
        <button
          onClick={onResetToDay1}
          disabled={!tester.canReset || isProcessing}
          className="tester-info-display__action-button tester-info-display__action-button--reset"
          title={!tester.canReset ? 'Tester is already at Day 1' : 'Reset tester to Day 1'}
        >
          <ResetIcon />
          Reset to Day 1
        </button>
        <button
          onClick={onAdvanceToDay2}
          disabled={!tester.canAdvance || isProcessing}
          className="tester-info-display__action-button tester-info-display__action-button--advance"
          title={!tester.canAdvance ? 'Tester cannot be advanced further' : 'Advance tester to Day 2'}
        >
          <AdvanceIcon />
          Advance to Day 2
        </button>
      </div>
    </div>
  );
}

// ===== ICONS =====

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function AdvanceIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  );
}
