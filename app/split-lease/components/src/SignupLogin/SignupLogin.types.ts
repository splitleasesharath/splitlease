/**
 * @fileoverview TypeScript type definitions for SignupLogin component
 * All types are inferred from Zod schemas to maintain single source of truth
 */

import { z } from 'zod';
import {
  SignupFormDataSchema,
  LoginFormDataSchema,
  AuthModeSchema,
} from './SignupLogin.schema';

/**
 * Signup form data type
 * Includes: firstName, lastName, email, password, confirmPassword, termsAccepted
 */
export type SignupFormData = z.infer<typeof SignupFormDataSchema>;

/**
 * Login form data type
 * Includes: email, password, rememberMe
 */
export type LoginFormData = z.infer<typeof LoginFormDataSchema>;

/**
 * Authentication mode
 * 'signup' - Display signup form
 * 'login' - Display login form
 */
export type AuthMode = z.infer<typeof AuthModeSchema>;

/**
 * SignupLogin component props
 */
export type SignupLoginProps = {
  /**
   * Initial authentication mode
   * @default 'signup'
   */
  mode?: AuthMode;

  /**
   * Optional CSS class name for styling customization
   */
  className?: string;

  /**
   * Callback fired when signup is successful
   * @param data - Validated signup form data
   */
  onSignupSuccess?: (data: SignupFormData) => void;

  /**
   * Callback fired when login is successful
   * @param data - Validated login form data
   */
  onLoginSuccess?: (data: LoginFormData) => void;

  /**
   * Callback fired when authentication mode changes
   * @param mode - New authentication mode
   */
  onModeChange?: (mode: AuthMode) => void;
};

/**
 * Validation error type
 * Maps field names to error messages
 */
export type ValidationErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * Form submission state
 */
export type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Password strength result
 */
export type PasswordStrengthResult = {
  strength: PasswordStrength;
  score: number;
  feedback: string[];
};

/**
 * Field validation result
 */
export type FieldValidationResult = {
  isValid: boolean;
  error?: string;
};

/**
 * Form validation result
 */
export type FormValidationResult<T> = {
  isValid: boolean;
  errors: ValidationErrors<T>;
};
