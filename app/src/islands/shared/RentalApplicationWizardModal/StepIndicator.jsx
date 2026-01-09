/**
 * StepIndicator.jsx
 *
 * Horizontal 7-step indicator with clickable navigation.
 * Shows completed, active, and pending step states.
 */

import React from 'react';
import { Check } from 'lucide-react';

const STEP_LABELS = [
  { short: 'Personal', full: 'Personal Info' },
  { short: 'Address', full: 'Current Address' },
  { short: 'Occupants', full: 'Occupants' },
  { short: 'Work', full: 'Employment' },
  { short: 'Details', full: 'Requirements' },
  { short: 'Docs', full: 'Documents' },
  { short: 'Review', full: 'Review & Sign' },
];

export default function StepIndicator({
  currentStep = 1,           // Current active step (1-7)
  completedSteps = [],       // Array of completed step numbers
  onStepClick,               // (stepNumber) => void
  disabled = false,          // Disable all navigation (during submission)
}) {
  const handleStepClick = (stepNumber) => {
    if (disabled) return;
    onStepClick?.(stepNumber);
  };

  const handleKeyDown = (e, stepNumber) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStepClick?.(stepNumber);
    }
  };

  return (
    <div className="step-indicator">
      <div className="step-indicator__track">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isActive = currentStep === stepNumber;
          const isPending = !isCompleted && !isActive;

          return (
            <React.Fragment key={stepNumber}>
              {/* Connector line (before each step except first) */}
              {index > 0 && (
                <div
                  className={`step-indicator__connector ${
                    completedSteps.includes(stepNumber) || currentStep >= stepNumber
                      ? 'step-indicator__connector--filled'
                      : ''
                  }`}
                />
              )}

              {/* Step dot */}
              <div
                className={`step-indicator__step ${
                  isActive ? 'step-indicator__step--active' : ''
                } ${isCompleted ? 'step-indicator__step--completed' : ''} ${
                  isPending ? 'step-indicator__step--pending' : ''
                }`}
                onClick={() => handleStepClick(stepNumber)}
                onKeyDown={(e) => handleKeyDown(e, stepNumber)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`${label.full}${isCompleted ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="step-indicator__dot">
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                <span className="step-indicator__label" title={label.full}>
                  {label.short}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
