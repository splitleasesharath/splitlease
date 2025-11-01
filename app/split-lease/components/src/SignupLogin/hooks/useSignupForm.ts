/**
 * @fileoverview useSignupForm hook
 * Manages signup form state, validation, password strength, and submission
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SignupFormDataSchema,
  EmailSchema,
  PasswordSchema,
  NameSchema,
} from '../SignupLogin.schema';
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
  const formDataRef = useRef(formData);

  // Update ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

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
      // Trim whitespace for name fields and email
      const shouldTrim = field === 'firstName' || field === 'lastName' || field === 'email';
      const processedValue =
        shouldTrim && typeof value === 'string' ? value.trim() : value;

      // Update the ref immediately so validateField can access the latest value
      formDataRef.current = {
        ...formDataRef.current,
        [field]: processedValue,
      };

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
      // Use formDataRef to get the latest value, even if state hasn't updated yet
      const currentFormData = formDataRef.current;
      const value = currentFormData[field];

      // Map fields to their schemas
      const fieldSchemaMap: Record<string, any> = {
        firstName: NameSchema,
        lastName: NameSchema,
        email: EmailSchema,
        password: PasswordSchema,
        confirmPassword: null, // Special case - needs full form validation
        termsAccepted: null, // Special case - handled below
      };

      // For confirmPassword, validate the full form to check if passwords match
      if (field === 'confirmPassword') {
        try {
          SignupFormDataSchema.parse(currentFormData);
          return undefined;
        } catch (error: any) {
          const issues = error.issues || error.errors || [];
          const fieldError = issues.find(
            (err: any) => err.path && err.path[0] === 'confirmPassword'
          );
          return fieldError?.message;
        }
      }

      // For termsAccepted, validate directly
      if (field === 'termsAccepted') {
        if (!currentFormData.termsAccepted) {
          return 'You must accept the terms and conditions';
        }
        return undefined;
      }

      // For other fields, use the mapped schema
      const fieldSchema = fieldSchemaMap[field];
      if (!fieldSchema) {
        return undefined;
      }

      try {
        fieldSchema.parse(value);
        return undefined;
      } catch (error: any) {
        const issues = error.issues || error.errors || [];
        return issues[0]?.message || 'Invalid value';
      }
    },
    []
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
    // Use formDataRef to ensure we validate the latest data
    const currentFormData = formDataRef.current;
    try {
      SignupFormDataSchema.parse(currentFormData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: ValidationErrors<SignupFormData> = {};
      // Zod v4 uses `issues` instead of `errors`
      const issues = error.issues || error.errors || [];
      issues.forEach((err: any) => {
        const field = err.path[0] as keyof SignupFormData;
        if (field && !newErrors[field]) {
          newErrors[field] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
  }, []);

  /**
   * Clear form after successful submission
   */
  const clearForm = useCallback(() => {
    const emptyFormData: SignupFormData = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    };
    formDataRef.current = emptyFormData;
    setFormData(emptyFormData);
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
      // Call success callback if provided (use latest formData from ref)
      if (onSuccess) {
        await onSuccess(formDataRef.current);
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
  }, [validateForm, onSuccess, clearForm]);

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
