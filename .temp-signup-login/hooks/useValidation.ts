/**
 * Custom hook for form validation
 * Handles email, password, and other field validation
 */

import { useState, useCallback } from 'react';
import { ValidationRules, ValidationErrors } from '../types';

export const useValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * Validate a single field against provided rules
   */
  const validateField = useCallback((
    name: string,
    value: string,
    rules: ValidationRules
  ): string | null => {
    // Required validation
    if (rules.required && !value.trim()) {
      return 'This field is required';
    }

    // Email validation
    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    // Minimum length validation
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }

    // Maximum length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }

    // Match validation (for password confirmation)
    if (rules.match !== undefined && value !== rules.match) {
      return "Passwords don't match";
    }

    // Custom validation function
    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, []);

  /**
   * Validate multiple fields at once
   * Returns true if all fields are valid
   */
  const validate = useCallback((
    fields: Record<string, { value: string; rules: ValidationRules }>
  ): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.entries(fields).forEach(([name, { value, rules }]) => {
      const error = validateField(name, value, rules);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField]);

  /**
   * Clear error for a specific field
   */
  const clearError = useCallback((name: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /**
   * Clear all validation errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Set a custom error message for a field
   */
  const setError = useCallback((name: string, message: string) => {
    setErrors(prev => ({ ...prev, [name]: message }));
  }, []);

  /**
   * Validate email specifically
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  /**
   * Validate password strength
   * Returns error message or null if valid
   */
  const validatePasswordStrength = useCallback((password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter';
    }

    return null;
  }, []);

  return {
    errors,
    validate,
    validateField,
    clearError,
    clearAllErrors,
    setError,
    validateEmail,
    validatePasswordStrength,
  };
};
