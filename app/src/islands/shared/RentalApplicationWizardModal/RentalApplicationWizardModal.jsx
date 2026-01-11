/**
 * RentalApplicationWizardModal.jsx
 *
 * Full modal wizard for completing the rental application.
 * 7 steps with clickable navigation, auto-save, and file upload support.
 */

import React, { useEffect } from 'react';
import { X, FileText, Save } from 'lucide-react';
import { useRentalApplicationWizardLogic } from './useRentalApplicationWizardLogic.js';
import StepIndicator from './StepIndicator.jsx';
import PersonalInfoStep from './steps/PersonalInfoStep.jsx';
import AddressStep from './steps/AddressStep.jsx';
import OccupantsStep from './steps/OccupantsStep.jsx';
import EmploymentStep from './steps/EmploymentStep.jsx';
import RequirementsStep from './steps/RequirementsStep.jsx';
import DocumentsStep from './steps/DocumentsStep.jsx';
import ReviewStep from './steps/ReviewStep.jsx';
import './RentalApplicationWizardModal.css';

export default function RentalApplicationWizardModal({
  isOpen,
  onClose,
  onSuccess,
  applicationStatus = 'not_started', // 'not_started' | 'in_progress' | 'submitted'
  userProfileData = null, // { email, firstName, lastName, phone } from user table
}) {
  const logic = useRentalApplicationWizardLogic({ onClose, onSuccess, applicationStatus, userProfileData });

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const renderStep = () => {
    const commonProps = {
      formData: logic.formData,
      fieldErrors: logic.fieldErrors,
      fieldValid: logic.fieldValid,
      onFieldChange: logic.handleInputChange,
      onFieldBlur: logic.handleInputBlur,
    };

    switch (logic.currentStep) {
      case 1:
        return <PersonalInfoStep {...commonProps} />;
      case 2:
        return <AddressStep {...commonProps} addressInputRef={logic.addressInputRef} />;
      case 3:
        return (
          <OccupantsStep
            occupants={logic.occupants}
            onAddOccupant={logic.addOccupant}
            onRemoveOccupant={logic.removeOccupant}
            onUpdateOccupant={logic.updateOccupant}
            maxOccupants={logic.maxOccupants}
            relationshipOptions={logic.relationshipOptions}
          />
        );
      case 4:
        return (
          <EmploymentStep
            {...commonProps}
            employmentStatusOptions={logic.employmentStatusOptions}
          />
        );
      case 5:
        return <RequirementsStep {...commonProps} />;
      case 6:
        return (
          <DocumentsStep
            formData={logic.formData}
            uploadedFiles={logic.uploadedFiles}
            uploadProgress={logic.uploadProgress}
            uploadErrors={logic.uploadErrors}
            onFileUpload={logic.handleFileUpload}
            onFileRemove={logic.handleFileRemove}
          />
        );
      case 7:
        return (
          <ReviewStep
            formData={logic.formData}
            occupants={logic.occupants}
            fieldErrors={logic.fieldErrors}
            onFieldChange={logic.handleInputChange}
            onFieldBlur={logic.handleInputBlur}
            onGoToStep={logic.goToStep}
            progress={logic.progress}
            canSubmit={logic.canSubmit}
          />
        );
      default:
        return null;
    }
  };

  const getNextButtonText = () => {
    if (logic.currentStep === 7) {
      return logic.isSubmitting ? 'Submitting...' : 'Submit Application';
    }
    if (logic.currentStep === 6) {
      return 'Review Application';
    }
    return 'Continue';
  };

  return (
    <div className="rental-wizard-overlay" onClick={handleOverlayClick}>
      <div className="rental-wizard-modal">
        {/* Header */}
        <div className="rental-wizard-header">
          <div className="rental-wizard-title">
            <FileText size={20} />
            <span>Rental Application</span>
          </div>
          <button
            type="button"
            className="rental-wizard-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          currentStep={logic.currentStep}
          completedSteps={logic.completedSteps}
          onStepClick={logic.goToStep}
          disabled={logic.isSubmitting}
        />

        {/* Content */}
        <div className="rental-wizard-content">
          {logic.isLoadingFromDb ? (
            <div className="rental-wizard-loading">
              <div className="rental-wizard-loading__spinner" />
              <p>Loading your application...</p>
            </div>
          ) : logic.loadError ? (
            <div className="rental-wizard-error-state">
              <p>{logic.loadError}</p>
              <button
                type="button"
                className="wizard-btn wizard-btn--secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Footer */}
        <div className="rental-wizard-footer">
          <div className="rental-wizard-footer__auto-save">
            <Save size={14} />
            <span>Progress saved automatically</span>
          </div>

          <div className="rental-wizard-nav">
            {logic.currentStep > 1 && (
              <button
                type="button"
                className="wizard-btn wizard-btn--secondary"
                onClick={logic.goToPreviousStep}
                disabled={logic.isSubmitting}
              >
                Back
              </button>
            )}

            {logic.currentStep < 7 && logic.isCurrentStepOptional() && (
              <button
                type="button"
                className="wizard-btn wizard-btn--ghost"
                onClick={logic.goToNextStep}
              >
                Skip
              </button>
            )}

            <button
              type="button"
              className="wizard-btn wizard-btn--primary"
              onClick={logic.currentStep === 7 ? logic.handleSubmit : logic.goToNextStep}
              disabled={
                logic.isSubmitting ||
                (logic.currentStep === 7 && !logic.canSubmit) ||
                (logic.currentStep < 7 && !logic.canProceedFromCurrentStep())
              }
            >
              {getNextButtonText()}
            </button>
          </div>
        </div>

        {/* Submit Error */}
        {logic.submitError && (
          <div className="rental-wizard-error">
            {logic.submitError}
          </div>
        )}
      </div>
    </div>
  );
}
