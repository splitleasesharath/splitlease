/**
 * SignupTrialHost Component - Public API
 *
 * This file exports all public APIs for the SignupTrialHost component.
 * Use named exports for tree-shaking optimization.
 *
 * @module SignupTrialHost
 */

// Main component
export { default as SignupTrialHost } from './SignupTrialHost';
export { default } from './SignupTrialHost';

// TypeScript types
export type {
  SignupTrialHostProps,
  FormData,
  PersonalInfo,
  PropertyInfo,
  TrialPreferences,
  ValidatedFormData,
  ValidationErrors,
  TouchedFields,
  UseSignupFormReturn,
  UseFormValidationReturn,
  SubmissionState,
  FieldError,
} from './SignupTrialHost.types';

// Export FormStep enum
export { FormStep } from './SignupTrialHost.types';

// Validation schemas (for advanced usage)
export {
  formDataSchema,
  personalInfoSchema,
  propertyInfoSchema,
  trialPreferencesSchema,
  fieldSchemas,
} from './SignupTrialHost.schema';

export type {
  PersonalInfoData,
  PropertyInfoData,
  TrialPreferencesData,
  FormDataType,
} from './SignupTrialHost.schema';

// Custom hooks (for advanced usage)
export { useSignupForm } from './hooks/useSignupForm';
export { useFormValidation } from './hooks/useFormValidation';

// Utility functions (for advanced usage)
export {
  formatPhoneNumber,
  extractPhoneDigits,
  validateEmail,
  validatePhone,
  sanitizeInput,
  getTomorrowDate,
  isFutureDate,
} from './utils';

// Constants (for customization)
export {
  PROPERTY_TYPES,
  TRIAL_DURATIONS,
  REFERRAL_SOURCES,
  VALIDATION_LIMITS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './constants';
