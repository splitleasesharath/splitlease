/**
 * SignUpTrialHost - Form Validation Utilities
 *
 * Pure validation functions for the Trial Host signup form.
 * These are portable and can be reused across the codebase.
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 4 characters (matching signup.ts:99)
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
export function validatePassword(password) {
  if (!password) return false;
  return password.length >= 4;
}

/**
 * Validate phone number (optional field)
 * Returns true if empty or valid US phone format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid or empty
 */
export function validatePhoneNumber(phone) {
  if (!phone || phone.trim() === '') return true; // Optional field
  // US phone: 10 digits with optional formatting
  const phoneRegex = /^[\d\s\-+()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate that two passwords match
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {boolean} True if passwords match
 */
export function validatePasswordMatch(password, confirmPassword) {
  return password === confirmPassword;
}

/**
 * Validate first name
 * @param {string} firstName - First name to validate
 * @returns {boolean} True if valid
 */
export function validateFirstName(firstName) {
  return firstName && firstName.trim().length >= 1;
}

/**
 * Validate last name
 * @param {string} lastName - Last name to validate
 * @returns {boolean} True if valid
 */
export function validateLastName(lastName) {
  return lastName && lastName.trim().length >= 1;
}

/**
 * Get validation error message for a field
 * @param {string} field - Field name
 * @param {string} value - Field value
 * @param {Object} formData - Full form data (for password confirmation)
 * @returns {string|null} Error message or null if valid
 */
export function getFieldError(field, value, formData = {}) {
  switch (field) {
    case 'firstName':
      return !validateFirstName(value) ? 'First name is required' : null;
    case 'lastName':
      return !validateLastName(value) ? 'Last name is required' : null;
    case 'email':
      if (!value) return 'Email is required';
      if (!validateEmail(value)) return 'Please enter a valid email address';
      return null;
    case 'password':
      if (!value) return 'Password is required';
      if (!validatePassword(value)) return 'Password must be at least 4 characters';
      return null;
    case 'confirmPassword':
      if (!value) return 'Please confirm your password';
      if (!validatePasswordMatch(formData.password, value)) return 'Passwords do not match';
      return null;
    case 'phoneNumber':
      if (value && !validatePhoneNumber(value)) return 'Please enter a valid phone number';
      return null;
    default:
      return null;
  }
}

/**
 * Validate entire form
 * @param {Object} formData - Form data object
 * @returns {Object} Object with isValid boolean and errors object
 */
export function validateForm(formData) {
  const errors = {};
  const fields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phoneNumber'];

  for (const field of fields) {
    const error = getFieldError(field, formData[field], formData);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
