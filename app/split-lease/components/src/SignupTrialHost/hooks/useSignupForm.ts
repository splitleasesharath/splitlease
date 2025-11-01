/**
 * useSignupForm Hook
 *
 * Custom hook for managing complete signup form state and behavior.
 * Integrates validation, multi-step navigation, and form submission.
 *
 * Features:
 * - Form state management
 * - Multi-step navigation with validation
 * - Form submission handling
 * - Integration with validation hook
 * - Optimized with useCallback and useMemo
 *
 * @module SignupTrialHost/hooks/useSignupForm
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFormValidation } from './useFormValidation';
import { DEFAULT_FORM_VALUES, TOTAL_STEPS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants';
import { formDataSchema } from '../SignupTrialHost.schema';
import { deepClone, extractPhoneDigits, formatPhoneNumber } from '../utils';
import type {
  FormData,
  FormStep,
  SubmissionState,
  UseSignupFormOptions,
  UseSignupFormReturn,
  ValidatedFormData,
} from '../SignupTrialHost.types';

/**
 * Custom hook for managing signup form state and logic
 *
 * @param options - Configuration options
 * @returns Form state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   formData,
 *   currentStep,
 *   errors,
 *   handleChange,
 *   handleNext,
 *   handleSubmit,
 * } = useSignupForm({
 *   onSubmit: async (data) => {
 *     await api.signup(data);
 *   },
 *   onSuccess: () => {
 *     console.log('Success!');
 *   },
 * });
 * ```
 */
export function useSignupForm(options: UseSignupFormOptions): UseSignupFormReturn {
  const { initialStep, initialData, onSubmit, onSuccess, onError } = options;

  // Form state
  const [formData, setFormData] = useState<FormData>(() => ({
    personalInfo: {
      ...DEFAULT_FORM_VALUES.personalInfo,
      ...initialData?.personalInfo,
    },
    propertyInfo: {
      ...DEFAULT_FORM_VALUES.propertyInfo,
      ...initialData?.propertyInfo,
    },
    trialPreferences: {
      ...DEFAULT_FORM_VALUES.trialPreferences,
      ...initialData?.trialPreferences,
    },
  }));

  const [currentStep, setCurrentStep] = useState<FormStep>(initialStep || 1);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [submissionMessage, setSubmissionMessage] = useState<string>('');

  // Validation hook
  const {
    errors,
    touched,
    validateField,
    validateStep,
    validateForm,
    clearError,
    clearAllErrors,
    setTouched,
    hasErrors: hasValidationErrors,
  } = useFormValidation();

  /**
   * Handles field value changes
   *
   * @param field - The field name
   * @param value - The new value
   */
  const handleChange = useCallback((field: string, value: string | boolean | number) => {
    setFormData((prevData) => {
      const newData = deepClone(prevData);

      // Determine which section this field belongs to
      if (field in newData.personalInfo) {
        // Special handling for phone number formatting
        if (field === 'phone' && typeof value === 'string') {
          const digits = extractPhoneDigits(value);
          (newData.personalInfo as Record<string, unknown>)[field] = digits;
        } else {
          (newData.personalInfo as Record<string, unknown>)[field] = value;
        }
      } else if (field in newData.propertyInfo) {
        (newData.propertyInfo as Record<string, unknown>)[field] = value;
      } else if (field in newData.trialPreferences) {
        (newData.trialPreferences as Record<string, unknown>)[field] = value;
      }

      return newData;
    });

    // Clear error for this field if it exists
    if (errors[field as keyof typeof errors]) {
      clearError(field);
    }
  }, [errors, clearError]);

  /**
   * Handles field blur events (validation trigger)
   *
   * @param field - The field name
   */
  const handleBlur = useCallback((field: string) => {
    // Mark field as touched
    setTouched(field, true);

    // Get the field value
    let value: unknown;
    if (field in formData.personalInfo) {
      value = formData.personalInfo[field as keyof typeof formData.personalInfo];
    } else if (field in formData.propertyInfo) {
      value = formData.propertyInfo[field as keyof typeof formData.propertyInfo];
    } else if (field in formData.trialPreferences) {
      value = formData.trialPreferences[field as keyof typeof formData.trialPreferences];
    }

    // Validate the field
    const error = validateField(field, value);

    // Update errors if validation failed
    if (error) {
      // We need to update errors through validation hook's internal state
      // This is handled by the validation happening on blur
    }
  }, [formData, validateField, setTouched]);

  /**
   * Navigates to the next step (with validation)
   */
  const handleNext = useCallback(() => {
    // Validate current step
    const stepErrors = validateStep(currentStep, formData);

    if (Object.keys(stepErrors).length > 0) {
      // Mark all fields in this step as touched
      Object.keys(stepErrors).forEach((field) => {
        setTouched(field, true);
      });

      // Validation failed, don't navigate
      return;
    }

    // Navigate to next step if not at the last step
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prevStep) => (prevStep + 1) as FormStep);
      clearAllErrors();
    }
  }, [currentStep, formData, validateStep, setTouched, clearAllErrors]);

  /**
   * Navigates to the previous step (no validation)
   */
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prevStep) => (prevStep - 1) as FormStep);
      clearAllErrors();
    }
  }, [currentStep, clearAllErrors]);

  /**
   * Navigates to a specific step
   *
   * @param step - The target step
   */
  const goToStep = useCallback((step: FormStep) => {
    setCurrentStep(step);
  }, []);

  /**
   * Handles form submission
   *
   * @param event - The form submit event
   */
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    // Prevent double submission
    if (submissionState === 'submitting') {
      return;
    }

    // Validate entire form
    const formErrors = validateForm(formData);

    if (Object.keys(formErrors).length > 0) {
      // Mark all fields as touched
      Object.keys(formErrors).forEach((field) => {
        setTouched(field, true);
      });

      setSubmissionMessage(ERROR_MESSAGES.FORM_INVALID);
      return;
    }

    // Set submitting state
    setSubmissionState('submitting');
    setSubmissionMessage('');

    try {
      // Validate and transform data for submission
      const validatedData = formDataSchema.parse(formData) as unknown as ValidatedFormData;

      // Call onSubmit if provided
      if (onSubmit) {
        await onSubmit(validatedData);
      }

      // Submission successful
      setSubmissionState('success');
      setSubmissionMessage(SUCCESS_MESSAGES.FORM_SUBMITTED);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Submission failed
      setSubmissionState('error');
      setSubmissionMessage(ERROR_MESSAGES.SUBMISSION_FAILED);

      // Call onError callback
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [submissionState, formData, validateForm, setTouched, onSubmit, onSuccess, onError]);

  /**
   * Resets the form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData({
      personalInfo: {
        ...DEFAULT_FORM_VALUES.personalInfo,
        ...initialData?.personalInfo,
      },
      propertyInfo: {
        ...DEFAULT_FORM_VALUES.propertyInfo,
        ...initialData?.propertyInfo,
      },
      trialPreferences: {
        ...DEFAULT_FORM_VALUES.trialPreferences,
        ...initialData?.trialPreferences,
      },
    });
    setCurrentStep(initialStep || 1);
    setSubmissionState('idle');
    setSubmissionMessage('');
    clearAllErrors();
  }, [initialData, initialStep, clearAllErrors]);

  /**
   * Computed: whether we can navigate to the next step
   */
  const canGoNext = useMemo(() => {
    const stepErrors = validateStep(currentStep, formData);
    return Object.keys(stepErrors).length === 0;
  }, [currentStep, formData, validateStep]);

  /**
   * Computed: whether we can navigate to the previous step
   */
  const canGoBack = useMemo(() => {
    return currentStep > 1;
  }, [currentStep]);

  /**
   * Computed: whether we're on the first step
   */
  const isFirstStep = useMemo(() => {
    return currentStep === 1;
  }, [currentStep]);

  /**
   * Computed: whether we're on the last step
   */
  const isLastStep = useMemo(() => {
    return currentStep === TOTAL_STEPS;
  }, [currentStep]);

  /**
   * Computed: whether form is currently submitting
   */
  const isSubmitting = useMemo(() => {
    return submissionState === 'submitting';
  }, [submissionState]);

  /**
   * Computed: form completion progress (0-100)
   */
  const progress = useMemo(() => {
    return ((currentStep - 1) / TOTAL_STEPS) * 100;
  }, [currentStep]);

  /**
   * Computed: whether there are any errors
   */
  const hasErrors = useMemo(() => {
    return hasValidationErrors;
  }, [hasValidationErrors]);

  return {
    // State
    formData,
    currentStep,
    errors,
    touched,
    submissionState,
    submissionMessage,

    // Handlers
    handleChange,
    handleBlur,
    handleNext,
    handleBack,
    handleSubmit,
    resetForm,
    goToStep,

    // Computed values
    canGoNext,
    canGoBack,
    isFirstStep,
    isLastStep,
    isSubmitting,
    hasErrors,
    progress,
  };
}
