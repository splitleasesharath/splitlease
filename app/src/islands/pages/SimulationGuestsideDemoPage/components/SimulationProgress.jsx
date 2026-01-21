/**
 * SimulationProgress Component
 *
 * Visual progress indicator showing the simulation flow.
 * Displays completed, current, and remaining steps with visual connecting lines.
 */

import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { SIMULATION_STEPS } from '../constants/simulationSteps.js';

export function SimulationProgress({
  currentStep,
  completedSteps = [],
  selectedPath = null
}) {
  // Define the step flow for display
  const steps = ['A', 'B', 'C', 'D', 'E'];

  const getStepStatus = (step) => {
    // Check if step is completed (with path suffix for C, D, E)
    if (['C', 'D', 'E'].includes(step) && selectedPath) {
      if (completedSteps.includes(`${step}${selectedPath}`)) {
        return 'completed';
      }
    } else if (completedSteps.includes(step)) {
      return 'completed';
    }

    // Check if current
    if (step === currentStep) {
      return 'current';
    }

    return 'pending';
  };

  return (
    <div className="simulation-progress">
      <div className="simulation-progress__track">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const stepConfig = SIMULATION_STEPS[step];

          return (
            <div key={step} className="simulation-progress__step-wrapper">
              <div className={`simulation-progress__step simulation-progress__step--${status}`}>
                <div className="simulation-progress__icon">
                  {status === 'completed' ? (
                    <CheckCircle size={24} />
                  ) : (
                    <Circle size={24} />
                  )}
                </div>
                <span className="simulation-progress__label">
                  {stepConfig?.label || `Step ${step}`}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="simulation-progress__connector" size={16} />
              )}
            </div>
          );
        })}
      </div>

      {selectedPath && (
        <div className="simulation-progress__path-badge">
          Path {selectedPath}: {selectedPath === 1 ? 'Accept' : 'Counteroffer'}
        </div>
      )}
    </div>
  );
}

export default SimulationProgress;
