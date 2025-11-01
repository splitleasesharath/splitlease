/**
 * @fileoverview SignupLogin component barrel export
 * Exports component, types, schemas, and hooks for consumer use
 */

export { default } from './SignupLogin';
export { default as SignupLogin } from './SignupLogin';

// Export types
export type {
  SignupLoginProps,
  SignupFormData,
  LoginFormData,
  AuthMode,
  ValidationErrors,
  SubmissionState,
  PasswordStrength,
  PasswordStrengthResult,
} from './SignupLogin.types';

// Export schemas for consumer validation
export {
  SignupFormDataSchema,
  LoginFormDataSchema,
  AuthModeSchema,
  EmailSchema,
  PasswordSchema,
  NameSchema,
} from './SignupLogin.schema';

// Export hooks for reusability
export { useSignupForm } from './hooks/useSignupForm';
export { useLoginForm } from './hooks/useLoginForm';
export { useAuthMode } from './hooks/useAuthMode';

// Export utilities
export { calculatePasswordStrength } from './utils/passwordStrength';
