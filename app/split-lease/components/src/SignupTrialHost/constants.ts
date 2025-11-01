/**
 * Constants for SignupTrialHost Component
 *
 * This file contains all configuration constants including form fields,
 * validation messages, API endpoints, and default values.
 *
 * @module SignupTrialHost/constants
 */

/**
 * Form step identifiers
 */
export const FORM_STEPS = {
  PERSONAL_INFO: 1,
  PROPERTY_INFO: 2,
  TRIAL_PREFERENCES: 3,
} as const;

/**
 * Total number of form steps
 */
export const TOTAL_STEPS = 3;

/**
 * Property type options
 */
export const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Trial duration options in days
 */
export const TRIAL_DURATIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
] as const;

/**
 * Referral source options
 */
export const REFERRAL_SOURCES = [
  { value: 'google-search', label: 'Google Search' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'friend-referral', label: 'Friend Referral' },
  { value: 'blog-article', label: 'Blog/Article' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Form field names - Step 1: Personal Information
 */
export const PERSONAL_INFO_FIELDS = {
  FULL_NAME: 'fullName',
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

/**
 * Form field names - Step 2: Property Information
 */
export const PROPERTY_INFO_FIELDS = {
  ADDRESS: 'address',
  PROPERTY_TYPE: 'propertyType',
  BEDROOMS: 'bedrooms',
  BATHROOMS: 'bathrooms',
} as const;

/**
 * Form field names - Step 3: Trial Preferences
 */
export const TRIAL_PREFERENCES_FIELDS = {
  START_DATE: 'startDate',
  DURATION: 'duration',
  REFERRAL_SOURCE: 'referralSource',
  TERMS_ACCEPTED: 'termsAccepted',
} as const;

/**
 * Field labels for form inputs
 */
export const FIELD_LABELS = {
  // Personal Info
  [PERSONAL_INFO_FIELDS.FULL_NAME]: 'Full Name',
  [PERSONAL_INFO_FIELDS.EMAIL]: 'Email Address',
  [PERSONAL_INFO_FIELDS.PHONE]: 'Phone Number',

  // Property Info
  [PROPERTY_INFO_FIELDS.ADDRESS]: 'Property Address',
  [PROPERTY_INFO_FIELDS.PROPERTY_TYPE]: 'Property Type',
  [PROPERTY_INFO_FIELDS.BEDROOMS]: 'Number of Bedrooms',
  [PROPERTY_INFO_FIELDS.BATHROOMS]: 'Number of Bathrooms',

  // Trial Preferences
  [TRIAL_PREFERENCES_FIELDS.START_DATE]: 'Preferred Start Date',
  [TRIAL_PREFERENCES_FIELDS.DURATION]: 'Trial Duration',
  [TRIAL_PREFERENCES_FIELDS.REFERRAL_SOURCE]: 'How did you hear about us?',
  [TRIAL_PREFERENCES_FIELDS.TERMS_ACCEPTED]: 'I agree to the Terms and Conditions',
} as const;

/**
 * Placeholder text for form inputs
 */
export const FIELD_PLACEHOLDERS = {
  // Personal Info
  [PERSONAL_INFO_FIELDS.FULL_NAME]: 'Enter your full name',
  [PERSONAL_INFO_FIELDS.EMAIL]: 'your.email@example.com',
  [PERSONAL_INFO_FIELDS.PHONE]: '(555) 123-4567',

  // Property Info
  [PROPERTY_INFO_FIELDS.ADDRESS]: 'Enter your property address',
  [PROPERTY_INFO_FIELDS.PROPERTY_TYPE]: 'Select property type',
  [PROPERTY_INFO_FIELDS.BEDROOMS]: 'e.g., 3',
  [PROPERTY_INFO_FIELDS.BATHROOMS]: 'e.g., 2.5',

  // Trial Preferences
  [TRIAL_PREFERENCES_FIELDS.START_DATE]: 'Select a date',
  [TRIAL_PREFERENCES_FIELDS.DURATION]: 'Select trial duration',
  [TRIAL_PREFERENCES_FIELDS.REFERRAL_SOURCE]: 'Select an option (optional)',
} as const;

/**
 * Validation error messages
 */
export const ERROR_MESSAGES = {
  // Required field errors
  REQUIRED_FIELD: 'This field is required',

  // Name validation
  NAME_TOO_SHORT: 'Name must be at least 2 characters',
  NAME_TOO_LONG: 'Name must be at most 50 characters',
  NAME_INVALID_CHARS: 'Name can only contain letters and spaces',

  // Email validation
  EMAIL_INVALID_FORMAT: 'Please enter a valid email address',

  // Phone validation
  PHONE_INVALID_FORMAT: 'Phone number must be 10 digits',

  // Address validation
  ADDRESS_TOO_SHORT: 'Address must be at least 10 characters',
  ADDRESS_TOO_LONG: 'Address must be at most 200 characters',

  // Number validation
  BEDROOMS_MIN: 'Must have at least 1 bedroom',
  BEDROOMS_MAX: 'Cannot exceed 20 bedrooms',
  BATHROOMS_MIN: 'Must have at least 1 bathroom',
  BATHROOMS_MAX: 'Cannot exceed 20 bathrooms',
  NUMBER_INVALID: 'Please enter a valid number',

  // Date validation
  DATE_PAST: 'Start date must be in the future',
  DATE_INVALID: 'Please select a valid date',

  // Terms validation
  TERMS_NOT_ACCEPTED: 'You must accept the terms and conditions',

  // Form validation
  FORM_INVALID: 'Please fix the errors above before continuing',

  // Submission errors
  SUBMISSION_FAILED: 'Failed to submit form. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: 'Thank you for signing up! We\'ll be in touch soon.',
  STEP_COMPLETED: 'Step completed successfully',
} as const;

/**
 * Validation limits
 */
export const VALIDATION_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  ADDRESS_MIN_LENGTH: 10,
  ADDRESS_MAX_LENGTH: 200,
  BEDROOMS_MIN: 1,
  BEDROOMS_MAX: 20,
  BATHROOMS_MIN: 1,
  BATHROOMS_MAX: 20,
  BATHROOMS_STEP: 0.5,
  PHONE_DIGITS: 10,
} as const;

/**
 * Regular expressions for validation
 */
export const VALIDATION_REGEX = {
  // RFC 5322 simplified email regex
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Phone number (digits only, will be formatted)
  PHONE: /^\d{10}$/,

  // Name (letters, spaces, hyphens, apostrophes)
  NAME: /^[a-zA-Z\s'-]+$/,
} as const;

/**
 * Step titles
 */
export const STEP_TITLES = {
  [FORM_STEPS.PERSONAL_INFO]: 'Personal Information',
  [FORM_STEPS.PROPERTY_INFO]: 'Property Information',
  [FORM_STEPS.TRIAL_PREFERENCES]: 'Trial Preferences',
} as const;

/**
 * Step descriptions
 */
export const STEP_DESCRIPTIONS = {
  [FORM_STEPS.PERSONAL_INFO]: 'Tell us a bit about yourself',
  [FORM_STEPS.PROPERTY_INFO]: 'Share your property details',
  [FORM_STEPS.TRIAL_PREFERENCES]: 'Set up your trial account',
} as const;

/**
 * Button labels
 */
export const BUTTON_LABELS = {
  NEXT: 'Next',
  BACK: 'Back',
  SUBMIT: 'Submit',
  SUBMITTING: 'Submitting...',
} as const;

/**
 * ARIA labels and announcements
 */
export const ARIA_LABELS = {
  FORM: 'Host trial signup form',
  PROGRESS: 'Form progress',
  STEP_INDICATOR: (current: number, total: number) => `Step ${current} of ${total}`,
  NEXT_BUTTON: 'Go to next step',
  BACK_BUTTON: 'Go to previous step',
  SUBMIT_BUTTON: 'Submit signup form',
  ERROR_MESSAGE: (field: string) => `Error for ${field}`,
  LIVE_REGION: 'Form status announcements',
} as const;

/**
 * Default form values
 */
export const DEFAULT_FORM_VALUES = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
  },
  propertyInfo: {
    address: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
  },
  trialPreferences: {
    startDate: '',
    duration: '',
    referralSource: '',
    termsAccepted: false,
  },
} as const;

/**
 * API configuration (placeholder - will be configured by consumer)
 */
export const API_CONFIG = {
  ENDPOINT: '/api/signup-trial-host',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Performance budgets
 */
export const PERFORMANCE_BUDGETS = {
  RENDER_TIME_MS: 50,
  BUNDLE_SIZE_KB: 50,
} as const;
