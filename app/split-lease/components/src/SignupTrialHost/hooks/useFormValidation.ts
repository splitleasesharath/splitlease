/**
 * useFormValidation Hook
 *
 * Custom hook for managing form validation state and logic.
 * Integrates with Zod schemas for runtime validation.
 *
 * Features:
 * - Field-level validation
 * - Step-level validation
 * - Form-level validation
 * - Error state management
 * - Touch state tracking
 *
 * @module SignupTrialHost/hooks/useFormValidation
 */

import { useState, useCallback, useMemo } from 'react';
import { ZodError } from 'zod';
import {
  fieldSchemas,
  stepSchemas,
  formDataSchema,
} from '../SignupTrialHost.schema';
import type {
  ValidationErrors,
  TouchedFields,
  FormData,
  UseFormValidationReturn,
  FormStep,
} from '../SignupTrialHost.types';

/**
 * Custom hook for form validation logic
 *
 * @returns Validation state and methods
 *
 * @example
 * ```tsx
 * const {
 *   errors,
 *   touched,
 *   validateField,
 *   validateStep,
 *   setTouched,
 * } = useFormValidation();
 *
 * // Validate a single field
 * const error = validateField('email', 'user@example.com');
 *
 * // Validate an entire step
 * const stepErrors = validateStep(FormStep.PersonalInfo, formData);
 * ```
 */
export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouchedState] = useState<TouchedFields>({});

  /**
   * Validates a single field using its Zod schema
   *
   * @param field - The field name to validate
   * @param value - The field value to validate
   * @returns Error message if validation fails, undefined otherwise
   */
  const validateField = useCallback((field: string, value: unknown): string | undefined => {
    // Get the schema for this field
    const schema = fieldSchemas[field as keyof typeof fieldSchemas];

    if (!schema) {
      // Field doesn't have a validation schema
      return undefined;
    }

    try {
      // Validate the value
      schema.parse(value);
      return undefined;
    } catch (error) {
      if (error instanceof ZodError) {
        // Return the first error message
        return error.errors[0]?.message || 'Invalid value';
      }
      return 'Validation error';
    }
  }, []);

  /**
   * Validates all fields in a specific form step
   *
   * @param step - The form step to validate
   * @param data - The complete form data
   * @returns Object containing error messages for invalid fields
   */
  const validateStep = useCallback((step: FormStep, data: FormData): ValidationErrors => {
    const stepSchema = stepSchemas[step as keyof typeof stepSchemas];
    const stepErrors: ValidationErrors = {};

    if (!stepSchema) {
      return stepErrors;
    }

    try {
      // Get the data for this step
      let stepData;
      if (step === 1) {
        stepData = data.personalInfo;
      } else if (step === 2) {
        stepData = data.propertyInfo;
      } else if (step === 3) {
        stepData = data.trialPreferences;
      }

      // Validate the step data
      stepSchema.parse(stepData);
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to our error format
        error.errors.forEach((err) => {
          const fieldPath = err.path.join('.');
          const fieldName = err.path[err.path.length - 1] as string;
          stepErrors[fieldName] = err.message;
        });
      }
    }

    return stepErrors;
  }, []);

  /**
   * Validates the entire form
   *
   * @param data - The complete form data
   * @returns Object containing error messages for all invalid fields
   */
  const validateForm = useCallback((data: FormData): ValidationErrors => {
    const formErrors: ValidationErrors = {};

    try {
      // Validate the complete form
      formDataSchema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to our error format
        error.errors.forEach((err) => {
          const fieldName = err.path[err.path.length - 1] as string;
          formErrors[fieldName] = err.message;
        });
      }
    }

    // Update error state
    setErrors(formErrors);

    return formErrors;
  }, []);

  /**
   * Clears the error for a specific field
   *
   * @param field - The field name to clear errors for
   */
  const clearError = useCallback((field: string) => {
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field as keyof ValidationErrors];
      return newErrors;
    });
  }, []);

  /**
   * Clears all validation errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Sets the touched state for a field
   *
   * @param field - The field name
   * @param isTouched - Whether the field has been touched
   */
  const setTouched = useCallback((field: string, isTouched: boolean) => {
    setTouchedState((prevTouched) => ({
      ...prevTouched,
      [field]: isTouched,
    }));
  }, []);

  /**
   * Computed value: whether there are any validation errors
   */
  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  return {
    errors,
    touched,
    validateField,
    validateStep,
    validateForm,
    clearError,
    clearAllErrors,
    setTouched,
    hasErrors,
  };
}
