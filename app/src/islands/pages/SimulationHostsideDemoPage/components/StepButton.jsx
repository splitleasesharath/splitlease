/**
 * StepButton Component for Host-Side Simulation
 *
 * A button component for simulation steps with visual states:
 * - Active: Currently available to execute (highlighted)
 * - Completed: Already executed (shows checkmark, green)
 * - Loading: Currently executing (shows spinner)
 * - Disabled: Not yet available (grayed out)
 *
 * @module pages/SimulationHostsideDemoPage/components/StepButton
 */

import { CheckCircle, Loader2, Circle } from 'lucide-react';

/**
 * StepButton component
 *
 * @param {Object} props
 * @param {string} props.stepId - Step identifier (A, B, C, D, E)
 * @param {number} props.stepNumber - Step number (1-5)
 * @param {string} props.label - Full label text for the button
 * @param {boolean} props.isActive - Whether step is currently available
 * @param {boolean} props.isCompleted - Whether step has been completed
 * @param {boolean} props.isLoading - Whether step is currently processing
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 */
export function StepButton({
  stepId,
  stepNumber,
  label,
  isActive = false,
  isCompleted = false,
  isLoading = false,
  onClick,
  disabled = false
}) {
  const isDisabled = disabled || isLoading || isCompleted;

  // Determine button state class
  let stateClass = '';
  if (isCompleted) {
    stateClass = 'host-step-button--completed';
  } else if (isLoading) {
    stateClass = 'host-step-button--loading';
  } else if (isActive) {
    stateClass = 'host-step-button--active';
  } else if (disabled) {
    stateClass = 'host-step-button--disabled';
  }

  return (
    <div className={`host-step-button-container ${stateClass}`}>
      <span className="host-step-button__number">
        {isCompleted ? (
          <CheckCircle size={20} className="host-step-button__check-icon" />
        ) : (
          stepNumber
        )}
      </span>
      <button
        className="host-step-button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-label={`Step ${stepId}: ${label}`}
      >
        <span className="host-step-button__content">
          {isLoading && (
            <Loader2 className="host-step-button__spinner" size={18} />
          )}
          <span className="host-step-button__label">
            Step {stepId} — {label}
          </span>
        </span>
      </button>
    </div>
  );
}

export default StepButton;
