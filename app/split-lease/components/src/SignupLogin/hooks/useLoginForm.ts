/**
 * @fileoverview useLoginForm hook
 * Manages login form state, validation, and submission
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LoginFormDataSchema, EmailSchema } from '../SignupLogin.schema';
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
  const formDataRef = useRef(formData);

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
      // Trim whitespace only for email field
      const processedValue =
        field === 'email' && typeof value === 'string' ? value.trim() : value;

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
    (field: keyof LoginFormData): string | undefined => {
      // Use formDataRef to get the latest value
      const currentFormData = formDataRef.current;
      const value = currentFormData[field];

      // Map fields to their schemas
      const fieldSchemaMap: Record<string, any> = {
        email: EmailSchema,
        password: LoginFormDataSchema.shape.password,
        rememberMe: null, // Boolean, always valid
      };

      // rememberMe is always valid (boolean)
      if (field === 'rememberMe') {
        return undefined;
      }

      // Validate using mapped schema
      const fieldSchema = fieldSchemaMap[field];
      if (!fieldSchema) {
        return undefined;
      }

      try {
        fieldSchema.parse(value);
        return undefined;
      } catch (error: any) {
        // Zod v4 uses `issues` instead of `errors`
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
    // Use formDataRef to ensure we validate the latest data
    const currentFormData = formDataRef.current;
    try {
      LoginFormDataSchema.parse(currentFormData);
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: ValidationErrors<LoginFormData> = {};
      // Zod v4 uses `issues` instead of `errors`
      const issues = error.issues || error.errors || [];
      issues.forEach((err: any) => {
        const field = err.path[0] as keyof LoginFormData;
        if (field) {
          newErrors[field] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
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
    } catch (error: any) {
      if (isMountedRef.current) {
        setSubmissionError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [validateForm, onSuccess]);

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
