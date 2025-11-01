/**
 * TypeScript Type Definitions for SignupTrialHost Component
 *
 * This file contains all TypeScript interfaces, types, and enums
 * used throughout the SignupTrialHost component.
 *
 * @module SignupTrialHost/types
 */

import type {
  PersonalInfoData,
  PropertyInfoData,
  TrialPreferencesData,
  FormDataType,
} from './SignupTrialHost.schema';

/**
 * Form step enumeration
 */
export enum FormStep {
  PersonalInfo = 1,
  PropertyInfo = 2,
  TrialPreferences = 3,
}

/**
 * Property type options
 */
export type PropertyType =
  | 'single-family'
  | 'condo'
  | 'townhouse'
  | 'apartment'
  | 'other';

/**
 * Trial duration in days
 */
export type TrialDuration = 7 | 14 | 30;

/**
 * Referral source options
 */
export type ReferralSource =
  | 'google-search'
  | 'social-media'
  | 'friend-referral'
  | 'blog-article'
  | 'other';

/**
 * Personal information form data
 */
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
}

/**
 * Property information form data
 */
export interface PropertyInfo {
  address: string;
  propertyType: PropertyType | '';
  bedrooms: number | '';
  bathrooms: number | '';
}

/**
 * Trial preferences form data
 */
export interface TrialPreferences {
  startDate: string;
  duration: TrialDuration | '';
  referralSource?: ReferralSource | '';
  termsAccepted: boolean;
}

/**
 * Complete form data structure (internal state)
 */
export interface FormData {
  personalInfo: PersonalInfo;
  propertyInfo: PropertyInfo;
  trialPreferences: TrialPreferences;
}

/**
 * Validated form data (ready for submission)
 */
export interface ValidatedFormData {
  personalInfo: PersonalInfoData;
  propertyInfo: PropertyInfoData;
  trialPreferences: TrialPreferencesData;
}

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Validation errors by field name
 */
export type ValidationErrors = {
  [K in keyof PersonalInfo]?: string;
} & {
  [K in keyof PropertyInfo]?: string;
} & {
  [K in keyof TrialPreferences]?: string;
};

/**
 * Form field that has been touched by the user
 */
export type TouchedFields = {
  [K in keyof PersonalInfo]?: boolean;
} & {
  [K in keyof PropertyInfo]?: boolean;
} & {
  [K in keyof TrialPreferences]?: boolean;
};

/**
 * Form submission state
 */
export type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Form submission result
 */
export interface SubmissionResult {
  success: boolean;
  message?: string;
  data?: ValidatedFormData;
  error?: Error;
}

/**
 * Props for the SignupTrialHost component
 */
export interface SignupTrialHostProps {
  /**
   * Callback function invoked when the form is successfully submitted
   * @param data - The validated form data
   * @returns Promise that resolves when submission is complete
   */
  onSubmit?: (data: ValidatedFormData) => Promise<void>;

  /**
   * Callback function invoked when submission succeeds
   */
  onSuccess?: () => void;

  /**
   * Callback function invoked when submission fails
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;

  /**
   * Optional CSS class name for custom styling
   */
  className?: string;

  /**
   * Initial form step to display (defaults to PersonalInfo)
   */
  initialStep?: FormStep;

  /**
   * Initial form data to pre-populate fields
   */
  initialData?: Partial<FormData>;

  /**
   * Whether to show the progress indicator (defaults to true)
   */
  showProgress?: boolean;

  /**
   * Whether to auto-focus the first input field (defaults to true)
   */
  autoFocus?: boolean;

  /**
   * Test ID for testing purposes
   */
  'data-testid'?: string;
}

/**
 * Return type for useSignupForm hook
 */
export interface UseSignupFormReturn {
  // Form state
  formData: FormData;
  currentStep: FormStep;
  errors: ValidationErrors;
  touched: TouchedFields;
  submissionState: SubmissionState;
  submissionMessage: string;

  // Form handlers
  handleChange: (field: string, value: string | boolean | number) => void;
  handleBlur: (field: string) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  goToStep: (step: FormStep) => void;

  // Computed values
  canGoNext: boolean;
  canGoBack: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  hasErrors: boolean;
  progress: number;
}

/**
 * Return type for useFormValidation hook
 */
export interface UseFormValidationReturn {
  errors: ValidationErrors;
  touched: TouchedFields;
  validateField: (field: string, value: unknown) => string | undefined;
  validateStep: (step: FormStep, data: FormData) => ValidationErrors;
  validateForm: (data: FormData) => ValidationErrors;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  setTouched: (field: string, isTouched: boolean) => void;
  hasErrors: boolean;
}

/**
 * Options for useSignupForm hook
 */
export interface UseSignupFormOptions {
  initialStep?: FormStep;
  initialData?: Partial<FormData>;
  onSubmit?: (data: ValidatedFormData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Form field configuration
 */
export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; label: string }>;
}

/**
 * Step configuration
 */
export interface StepConfig {
  step: FormStep;
  title: string;
  description: string;
  fields: FieldConfig[];
}

/**
 * Accessibility announcement
 */
export interface A11yAnnouncement {
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}
