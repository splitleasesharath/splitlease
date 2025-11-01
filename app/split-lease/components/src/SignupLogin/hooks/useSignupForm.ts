/**
 * @fileoverview useSignupForm hook
 * Manages signup form state, validation, password strength, and submission
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { SignupFormDataSchema } from '../SignupLogin.schema';
import { calculatePasswordStrength } from '../utils/passwordStrength';
import type {
  SignupFormData,
  ValidationErrors,
  PasswordStrengthResult,
} from '../SignupLogin.types';

/**
 * Hook for managing signup form state and validation
 * @param onSuccess - Callback fired on successful signup
 * @returns Form state and handlers
 */
export function useSignupForm(onSuccess?: (data: SignupFormData) => void | Promise<void>) {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<ValidationErrors<SignupFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate password strength when password changes
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  /**
   * Handle field value change
   * @param field - Field name
   * @param value - New value
   */
  const handleFieldChange = useCallback(
    <K extends keyof SignupFormData>(field: K, value: SignupFormData[K]) => {
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
    (field: keyof SignupFormData): string | undefined => {
      try {
        // For confirmPassword, need to validate passwords match
        if (field === 'confirmPassword') {
          if (!formData.confirmPassword) {
            return 'Please confirm your password';
          }
          if (formData.password !== formData.confirmPassword) {
            return 'Passwords do not match';
          }
          return undefined;
        }

        // For termsAccepted, validate it's true
        if (field === 'termsAccepted') {
          if (!formData.termsAccepted) {
            return 'You must accept the terms and conditions';
          }
          return undefined;
        }

        // Validate using Zod schema
        const fieldSchema = SignupFormDataSchema.shape[field as keyof typeof SignupFormDataSchema.shape];
        if (fieldSchema) {
          fieldSchema.parse(formData[field]);
        }
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
    (field: keyof SignupFormData) => {
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
      SignupFormDataSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: ValidationErrors<SignupFormData> = {};
      error.errors?.forEach((err: any) => {
        const field = err.path[0] as keyof SignupFormData;
        if (!newErrors[field]) {
          newErrors[field] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
  }, [formData]);

  /**
   * Clear form after successful submission
   */
  const clearForm = useCallback(() => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    });
    setErrors({});
    setPasswordStrength(null);
  }, []);

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

      // Clear form after successful submission
      if (isMountedRef.current) {
        clearForm();
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setSubmissionError(error.message || 'Signup failed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [formData, validateForm, onSuccess, clearForm]);

  return {
    formData,
    errors,
    isSubmitting,
    submissionError,
    passwordStrength,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  };
}
