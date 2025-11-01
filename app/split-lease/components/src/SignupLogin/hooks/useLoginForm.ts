/**
 * @fileoverview useLoginForm hook
 * Manages login form state, validation, and submission
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LoginFormDataSchema } from '../SignupLogin.schema';
import type { LoginFormData, ValidationErrors } from '../SignupLogin.types';

/**
 * Hook for managing login form state and validation
 * @param onSuccess - Callback fired on successful login
 * @returns Form state and handlers
 */
export function useLoginForm(onSuccess?: (data: LoginFormData) => void | Promise<void>) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<ValidationErrors<LoginFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Handle field value change
   * @param field - Field name
   * @param value - New value
   */
  const handleFieldChange = useCallback(
    <K extends keyof LoginFormData>(field: K, value: LoginFormData[K]) => {
      // Trim whitespace for text fields
      const processedValue =
        typeof value === 'string' ? value.trim() : value;

      setFormData((prev) => ({
        ...prev,
        [field]: processedValue,
      }));

      // Clear error for this field when user types
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });

      // Clear submission error
      setSubmissionError(null);
    },
    []
  );

  /**
   * Validate a single field
   * @param field - Field to validate
   */
  const validateField = useCallback(
    (field: keyof LoginFormData): string | undefined => {
      try {
        const fieldSchema = LoginFormDataSchema.shape[field];
        fieldSchema.parse(formData[field]);
        return undefined;
      } catch (error: any) {
        return error.errors?.[0]?.message || 'Invalid value';
      }
    },
    [formData]
  );

  /**
   * Handle field blur (validate on blur)
   * @param field - Field name
   */
  const handleFieldBlur = useCallback(
    (field: keyof LoginFormData) => {
      const error = validateField(field);
      if (error) {
        setErrors((prev) => ({
          ...prev,
          [field]: error,
        }));
      }
    },
    [validateField]
  );

  /**
   * Validate entire form
   * @returns True if form is valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    try {
      LoginFormDataSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: ValidationErrors<LoginFormData> = {};
      error.errors?.forEach((err: any) => {
        const field = err.path[0] as keyof LoginFormData;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Set submitting state
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Call success callback if provided
      if (onSuccess) {
        await onSuccess(formData);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setSubmissionError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [formData, validateForm, onSuccess]);

  return {
    formData,
    errors,
    isSubmitting,
    submissionError,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  };
}
