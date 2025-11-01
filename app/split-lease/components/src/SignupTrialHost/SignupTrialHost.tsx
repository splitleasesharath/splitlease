/**
 * SignupTrialHost Component
 *
 * A multi-step form component for property hosts to sign up for a trial account.
 * Built with React 18, TypeScript, CSS Modules, and comprehensive accessibility support.
 *
 * Features:
 * - Three-step form with validation
 * - Real-time field validation
 * - Progress tracking
 * - Accessible keyboard navigation
 * - Screen reader support (WCAG 2.1 AA compliant)
 * - Responsive design (mobile-first)
 * - Performance optimized with React.memo, useCallback, useMemo
 *
 * @example
 * ```tsx
 * <SignupTrialHost
 *   onSubmit={async (data) => {
 *     await api.createTrialHost(data);
 *   }}
 *   onSuccess={() => {
 *     navigate('/welcome');
 *   }}
 * />
 * ```
 *
 * @module SignupTrialHost
 */

import React, { memo, useEffect, useRef } from 'react';
import { useSignupForm } from './hooks/useSignupForm';
import {
  STEP_TITLES,
  STEP_DESCRIPTIONS,
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
  BUTTON_LABELS,
  PROPERTY_TYPES,
  TRIAL_DURATIONS,
  REFERRAL_SOURCES,
  ARIA_LABELS,
  TOTAL_STEPS,
} from './constants';
import { formatPhoneNumber, getTomorrowDate } from './utils';
import type { SignupTrialHostProps } from './SignupTrialHost.types';
import { FormStep } from './SignupTrialHost.types';
import styles from './SignupTrialHost.module.css';

/**
 * SignupTrialHost Component
 *
 * Multi-step signup form for property hosts
 *
 * @param props - Component props
 * @returns The rendered component
 */
const SignupTrialHost = memo<SignupTrialHostProps>(function SignupTrialHost({
  onSubmit,
  onSuccess,
  onError,
  className = '',
  initialStep,
  initialData,
  showProgress = true,
  autoFocus = true,
  'data-testid': testId,
}) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  const {
    formData,
    currentStep,
    errors,
    touched,
    submissionState,
    submissionMessage,
    handleChange,
    handleBlur,
    handleNext,
    handleBack,
    handleSubmit,
    canGoBack,
    isSubmitting,
    progress,
  } = useSignupForm({
    initialStep,
    initialData,
    onSubmit,
    onSuccess,
    onError,
  });

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [autoFocus]);

  // Render error message for a field
  const renderError = (fieldName: string) => {
    const error = errors[fieldName as keyof typeof errors];
    const isTouched = touched[fieldName as keyof typeof touched];

    if (!error || !isTouched) {
      return null;
    }

    return (
      <div
        id={`${fieldName}-error`}
        className={styles.errorMessage}
        role="alert"
      >
        <span className={styles.errorIcon} aria-hidden="true">⚠</span>
        <span>{error}</span>
      </div>
    );
  };

  // Render Step 1: Personal Information
  const renderPersonalInfoStep = () => (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>{STEP_TITLES[FormStep.PersonalInfo]}</h2>
      <p className={styles.stepDescription}>{STEP_DESCRIPTIONS[FormStep.PersonalInfo]}</p>

      <div className={styles.formGroup}>
        <label htmlFor="fullName" className={styles.label}>
          {FIELD_LABELS.fullName}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          ref={firstInputRef}
          id="fullName"
          name="fullName"
          type="text"
          className={styles.input}
          value={formData.personalInfo.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          placeholder={FIELD_PLACEHOLDERS.fullName}
          aria-required="true"
          aria-invalid={!!errors.fullName && !!touched.fullName}
          aria-describedby={errors.fullName && touched.fullName ? 'fullName-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('fullName')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          {FIELD_LABELS.email}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          value={formData.personalInfo.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          placeholder={FIELD_PLACEHOLDERS.email}
          aria-required="true"
          aria-invalid={!!errors.email && !!touched.email}
          aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('email')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone" className={styles.label}>
          {FIELD_LABELS.phone}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className={styles.input}
          value={formatPhoneNumber(formData.personalInfo.phone)}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          placeholder={FIELD_PLACEHOLDERS.phone}
          aria-required="true"
          aria-invalid={!!errors.phone && !!touched.phone}
          aria-describedby={errors.phone && touched.phone ? 'phone-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('phone')}
      </div>
    </div>
  );

  // Render Step 2: Property Information
  const renderPropertyInfoStep = () => (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>{STEP_TITLES[FormStep.PropertyInfo]}</h2>
      <p className={styles.stepDescription}>{STEP_DESCRIPTIONS[FormStep.PropertyInfo]}</p>

      <div className={styles.formGroup}>
        <label htmlFor="address" className={styles.label}>
          {FIELD_LABELS.address}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="address"
          name="address"
          type="text"
          className={styles.input}
          value={formData.propertyInfo.address}
          onChange={(e) => handleChange('address', e.target.value)}
          onBlur={() => handleBlur('address')}
          placeholder={FIELD_PLACEHOLDERS.address}
          aria-required="true"
          aria-invalid={!!errors.address && !!touched.address}
          aria-describedby={errors.address && touched.address ? 'address-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('address')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="propertyType" className={styles.label}>
          {FIELD_LABELS.propertyType}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <select
          id="propertyType"
          name="propertyType"
          className={styles.select}
          value={formData.propertyInfo.propertyType}
          onChange={(e) => handleChange('propertyType', e.target.value)}
          onBlur={() => handleBlur('propertyType')}
          aria-required="true"
          aria-invalid={!!errors.propertyType && !!touched.propertyType}
          aria-describedby={errors.propertyType && touched.propertyType ? 'propertyType-error' : undefined}
          disabled={isSubmitting}
        >
          <option value="">{FIELD_PLACEHOLDERS.propertyType}</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {renderError('propertyType')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="bedrooms" className={styles.label}>
          {FIELD_LABELS.bedrooms}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="bedrooms"
          name="bedrooms"
          type="number"
          min="1"
          max="20"
          className={styles.input}
          value={formData.propertyInfo.bedrooms}
          onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || '')}
          onBlur={() => handleBlur('bedrooms')}
          placeholder={FIELD_PLACEHOLDERS.bedrooms}
          aria-required="true"
          aria-invalid={!!errors.bedrooms && !!touched.bedrooms}
          aria-describedby={errors.bedrooms && touched.bedrooms ? 'bedrooms-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('bedrooms')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="bathrooms" className={styles.label}>
          {FIELD_LABELS.bathrooms}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="bathrooms"
          name="bathrooms"
          type="number"
          min="1"
          max="20"
          step="0.5"
          className={styles.input}
          value={formData.propertyInfo.bathrooms}
          onChange={(e) => handleChange('bathrooms', parseFloat(e.target.value) || '')}
          onBlur={() => handleBlur('bathrooms')}
          placeholder={FIELD_PLACEHOLDERS.bathrooms}
          aria-required="true"
          aria-invalid={!!errors.bathrooms && !!touched.bathrooms}
          aria-describedby={errors.bathrooms && touched.bathrooms ? 'bathrooms-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('bathrooms')}
      </div>
    </div>
  );

  // Render Step 3: Trial Preferences
  const renderTrialPreferencesStep = () => (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>{STEP_TITLES[FormStep.TrialPreferences]}</h2>
      <p className={styles.stepDescription}>{STEP_DESCRIPTIONS[FormStep.TrialPreferences]}</p>

      <div className={styles.formGroup}>
        <label htmlFor="startDate" className={styles.label}>
          {FIELD_LABELS.startDate}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          min={getTomorrowDate()}
          className={styles.input}
          value={formData.trialPreferences.startDate}
          onChange={(e) => handleChange('startDate', e.target.value)}
          onBlur={() => handleBlur('startDate')}
          aria-required="true"
          aria-invalid={!!errors.startDate && !!touched.startDate}
          aria-describedby={errors.startDate && touched.startDate ? 'startDate-error' : undefined}
          disabled={isSubmitting}
        />
        {renderError('startDate')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="duration" className={styles.label}>
          {FIELD_LABELS.duration}
          <span className={styles.required} aria-label="required">*</span>
        </label>
        <select
          id="duration"
          name="duration"
          className={styles.select}
          value={formData.trialPreferences.duration}
          onChange={(e) => handleChange('duration', parseInt(e.target.value) || '')}
          onBlur={() => handleBlur('duration')}
          aria-required="true"
          aria-invalid={!!errors.duration && !!touched.duration}
          aria-describedby={errors.duration && touched.duration ? 'duration-error' : undefined}
          disabled={isSubmitting}
        >
          <option value="">{FIELD_PLACEHOLDERS.duration}</option>
          {TRIAL_DURATIONS.map((duration) => (
            <option key={duration.value} value={duration.value}>
              {duration.label}
            </option>
          ))}
        </select>
        {renderError('duration')}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="referralSource" className={styles.label}>
          {FIELD_LABELS.referralSource}
        </label>
        <select
          id="referralSource"
          name="referralSource"
          className={styles.select}
          value={formData.trialPreferences.referralSource}
          onChange={(e) => handleChange('referralSource', e.target.value)}
          onBlur={() => handleBlur('referralSource')}
          aria-required="false"
          disabled={isSubmitting}
        >
          <option value="">{FIELD_PLACEHOLDERS.referralSource}</option>
          {REFERRAL_SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.checkboxGroup}>
        <input
          id="termsAccepted"
          name="termsAccepted"
          type="checkbox"
          className={styles.checkbox}
          checked={formData.trialPreferences.termsAccepted}
          onChange={(e) => handleChange('termsAccepted', e.target.checked)}
          onBlur={() => handleBlur('termsAccepted')}
          aria-required="true"
          aria-invalid={!!errors.termsAccepted && !!touched.termsAccepted}
          aria-describedby={errors.termsAccepted && touched.termsAccepted ? 'termsAccepted-error' : undefined}
          disabled={isSubmitting}
        />
        <label htmlFor="termsAccepted" className={styles.checkboxLabel}>
          {FIELD_LABELS.termsAccepted}
          <span className={styles.required} aria-label="required">*</span>
        </label>
      </div>
      {renderError('termsAccepted')}
    </div>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case FormStep.PersonalInfo:
        return renderPersonalInfoStep();
      case FormStep.PropertyInfo:
        return renderPropertyInfoStep();
      case FormStep.TrialPreferences:
        return renderTrialPreferencesStep();
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.signupForm} ${className}`} data-testid={testId}>
      <form
        className={styles.formContainer}
        onSubmit={handleSubmit}
        noValidate
        aria-label={ARIA_LABELS.FORM}
      >
        {/* Progress indicator */}
        {showProgress && (
          <div className={styles.progressContainer} role="region" aria-label={ARIA_LABELS.PROGRESS}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={ARIA_LABELS.STEP_INDICATOR(currentStep, TOTAL_STEPS)}
              />
            </div>
            <div className={styles.progressText}>
              <span className={styles.progressStep}>
                Step {currentStep} of {TOTAL_STEPS}
              </span>
            </div>
          </div>
        )}

        {/* Success message */}
        {submissionState === 'success' && (
          <div className={styles.successMessage} role="status" aria-live="polite">
            <span className={styles.successIcon} aria-hidden="true">✓</span>
            <span>{submissionMessage}</span>
          </div>
        )}

        {/* Error message */}
        {submissionState === 'error' && (
          <div className={styles.errorMessage} role="alert" aria-live="assertive">
            <span className={styles.errorIcon} aria-hidden="true">⚠</span>
            <span>{submissionMessage}</span>
          </div>
        )}

        {/* Loading message */}
        {isSubmitting && (
          <div className={styles.loadingMessage} role="status" aria-live="polite">
            <div className={styles.spinner} aria-hidden="true" />
            <span>Submitting...</span>
          </div>
        )}

        {/* Current step content */}
        {renderCurrentStep()}

        {/* Navigation buttons */}
        <div className={styles.buttonContainer}>
          {canGoBack && (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleBack}
              disabled={isSubmitting}
              aria-label={ARIA_LABELS.BACK_BUTTON}
            >
              {BUTTON_LABELS.BACK}
            </button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleNext}
              disabled={isSubmitting}
              aria-label={ARIA_LABELS.NEXT_BUTTON}
            >
              {BUTTON_LABELS.NEXT}
            </button>
          ) : (
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isSubmitting}
              aria-label={ARIA_LABELS.SUBMIT_BUTTON}
            >
              {isSubmitting ? BUTTON_LABELS.SUBMITTING : BUTTON_LABELS.SUBMIT}
            </button>
          )}
        </div>

        {/* Screen reader announcements */}
        <div
          className={styles.liveRegion}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={ARIA_LABELS.LIVE_REGION}
        >
          {ARIA_LABELS.STEP_INDICATOR(currentStep, TOTAL_STEPS)}
        </div>

        <div
          className={styles.liveRegion}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        />
      </form>
    </div>
  );
});

SignupTrialHost.displayName = 'SignupTrialHost';

export default SignupTrialHost;
