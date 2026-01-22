/**
 * StepButton Component
 *
 * A reusable button for simulation steps with visual states:
 * - Active: Currently available to execute
 * - Completed: Already executed (shows checkmark)
 * - Loading: Currently executing (shows spinner)
 * - Disabled: Not yet available
 */

import { CheckCircle, Loader2 } from 'lucide-react';

export function StepButton({
  step,
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
    stateClass = 'step-button--completed';
  } else if (isLoading) {
    stateClass = 'step-button--loading';
  } else if (isActive) {
    stateClass = 'step-button--active';
  } else if (disabled) {
    stateClass = 'step-button--disabled';
  }

  return (
    <div className={`step-button-container ${stateClass}`}>
      <span className="step-button__number">{step}</span>
      <button
        className="step-button"
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={isLoading}
      >
        <span className="step-button__content">
          {isLoading && (
            <Loader2 className="step-button__icon step-button__icon--spinner" size={20} />
          )}
          {isCompleted && !isLoading && (
            <CheckCircle className="step-button__icon step-button__icon--check" size={20} />
          )}
          <span className="step-button__label">
            Step {step} - {label}
          </span>
        </span>
      </button>
    </div>
  );
}

export default StepButton;
