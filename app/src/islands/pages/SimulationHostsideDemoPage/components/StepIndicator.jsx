/**
 * StepIndicator Component
 *
 * Visual progress indicator showing the overall simulation progress.
 * Displays connected dots/circles with labels for each step.
 *
 * @module pages/SimulationHostsideDemoPage/components/StepIndicator
 */

import { Check, Circle, ChevronRight } from 'lucide-react';

/**
 * StepIndicator component
 *
 * @param {Object} props
 * @param {number} props.currentStep - Current step number (0-5)
 * @param {number} props.totalSteps - Total number of steps (5)
 */
export function StepIndicator({ currentStep, totalSteps = 5 }) {
  const steps = ['A', 'B', 'C', 'D', 'E'];
  const shortLabels = ['Tester', 'Proposals', 'VM Accept', 'Lease', 'Jacques VM'];

  return (
    <div className="host-step-indicator">
      <div className="host-step-indicator__track">
        {steps.map((letter, index) => {
          const stepNum = index + 1;
          const isComplete = currentStep >= stepNum;
          const isCurrent = currentStep === index;
          const isPending = currentStep < index;

          // Determine state class
          let stateClass = 'host-step-indicator__step--pending';
          if (isComplete) {
            stateClass = 'host-step-indicator__step--completed';
          } else if (isCurrent) {
            stateClass = 'host-step-indicator__step--current';
          }

          return (
            <div key={letter} className="host-step-indicator__step-wrapper">
              <div className={`host-step-indicator__step ${stateClass}`}>
                <div className="host-step-indicator__icon">
                  {isComplete ? (
                    <Check size={14} />
                  ) : (
                    <span className="host-step-indicator__number">{letter}</span>
                  )}
                </div>
                <span className="host-step-indicator__label">
                  {shortLabels[index]}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div className={`host-step-indicator__connector ${isComplete ? 'host-step-indicator__connector--complete' : ''}`}>
                  <ChevronRight size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress text */}
      <div className="host-step-indicator__progress-text">
        {currentStep === 0 ? (
          <span>Not started</span>
        ) : currentStep >= totalSteps ? (
          <span className="host-step-indicator__complete-text">All steps completed!</span>
        ) : (
          <span>Step {currentStep} of {totalSteps} completed</span>
        )}
      </div>
    </div>
  );
}

export default StepIndicator;
