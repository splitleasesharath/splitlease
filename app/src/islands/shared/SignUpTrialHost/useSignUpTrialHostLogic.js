/**
 * useSignUpTrialHostLogic - Business Logic Hook for Trial Host Signup
 *
 * Following the Hollow Component pattern, this hook contains all business logic
 * for the Trial Host signup flow. The UI component (SignUpTrialHost.jsx)
 * delegates all logic here.
 *
 * Features:
 * - Form state management
 * - Field validation
 * - Signup submission via signupUser()
 * - Loading and error states
 * - Success handling with redirect to house manual
 */

import { useState, useCallback } from 'react';
import { signupUser, saveAuthTokens } from '../../../lib/auth.js';
import { validateForm, getFieldError } from './validation.js';

/**
 * Initial form state
 */
const INITIAL_FORM_STATE = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNumber: ''
};

/**
 * Hook for Trial Host signup business logic
 * @returns {Object} Form state and handlers
 */
export function useSignUpTrialHostLogic() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Update a single form field
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null);
    }
  }, [errors, submitError]);

  /**
   * Validate a single field on blur
   */
  const validateField = useCallback((field) => {
    const error = getFieldError(field, formData[field], formData);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    // Validate all fields
    const { isValid, errors: validationErrors } = validateForm(formData);

    if (!isValid) {
      setErrors(validationErrors);
      return { success: false, error: 'Please fix the errors above' };
    }

    setIsLoading(true);
    setSubmitError(null);

    try {
      // Build additional data with fixed userType
      const additionalData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        userType: 'Trial Host', // FIXED - not user-selectable
        phoneNumber: formData.phoneNumber?.trim() || ''
      };

      console.log('[SignUpTrialHost] Submitting signup with additionalData:', additionalData);

      // Call the auth system
      const result = await signupUser(
        formData.email.trim(),
        formData.password,
        formData.confirmPassword,
        additionalData
      );

      console.log('[SignUpTrialHost] Signup result:', result);

      if (result.success) {
        // Save tokens if provided
        if (result.access_token && result.refresh_token) {
          await saveAuthTokens(
            result.access_token,
            result.refresh_token,
            result.user_id
          );
        }

        setIsSuccess(true);

        // Redirect to house manual after short delay for user feedback
        setTimeout(() => {
          window.location.href = '/house-manual';
        }, 1500);

        return { success: true };
      } else {
        const errorMessage = result.error || 'Signup failed. Please try again.';
        setSubmitError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('[SignUpTrialHost] Signup error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      setSubmitError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setSubmitError(null);
    setIsSuccess(false);
  }, []);

  /**
   * Check if form is ready to submit (all required fields filled)
   */
  const canSubmit = useCallback(() => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password !== '' &&
      formData.confirmPassword !== '' &&
      !isLoading
    );
  }, [formData, isLoading]);

  return {
    // State
    formData,
    errors,
    isLoading,
    submitError,
    isSuccess,

    // Actions
    updateField,
    validateField,
    handleSubmit,
    resetForm,
    canSubmit
  };
}

export default useSignUpTrialHostLogic;
