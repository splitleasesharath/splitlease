/**
 * StepCard - Reusable card component for each simulation step
 *
 * Displays a step with its number, title, description, action button,
 * and result feedback. Adapts appearance based on step status.
 *
 * @param {Object} props
 * @param {number} props.stepNumber - Step number (1-6)
 * @param {string} props.stepLetter - Step letter (A-F)
 * @param {string} props.title - Step title
 * @param {string} props.description - Step description
 * @param {string} props.status - Step status: 'pending'|'active'|'completed'|'disabled'
 * @param {boolean} props.isActive - Whether this step is currently active
 * @param {boolean} props.isLoading - Whether this step is loading
 * @param {Function} props.onAction - Click handler for the action button
 * @param {string} props.buttonText - Text for the action button
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Object} props.result - Step result { success: boolean, message: string }
 */
export default function StepCard({
  stepNumber,
  stepLetter,
  title,
  description,
  status,
  isActive,
  isLoading,
  onAction,
  buttonText,
  disabled,
  result
}) {
  const isCompleted = status === 'completed';
  const isDisabled = status === 'disabled';

  return (
    <div
      className={`gsim-step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}`}
    >
      {/* Step Header */}
      <div className="gsim-step-card-header">
        <div className="gsim-step-card-badge">
          {isCompleted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : isDisabled ? (
            <span className="gsim-step-card-badge-disabled">—</span>
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>
        <div className="gsim-step-card-title-section">
          <h3 className="gsim-step-card-title">
            Step {stepLetter}: {title}
          </h3>
        </div>
      </div>

      {/* Step Description */}
      <p className="gsim-step-card-description">{description}</p>

      {/* Action Button */}
      <div className="gsim-step-card-actions">
        <button
          className={`gsim-btn ${isCompleted ? 'gsim-btn-success' : isActive ? 'gsim-btn-primary' : 'gsim-btn-secondary'}`}
          onClick={onAction}
          disabled={disabled || isCompleted || isDisabled}
        >
          {isLoading ? (
            <>
              <span className="gsim-btn-spinner" />
              Processing...
            </>
          ) : isCompleted ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Completed
            </>
          ) : (
            buttonText
          )}
        </button>
      </div>

      {/* Result Feedback */}
      {result && (
        <div className={`gsim-step-card-result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
