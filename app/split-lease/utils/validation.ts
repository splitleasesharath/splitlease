/**
 * Common validation functions
 */

import { VALIDATION } from './constants';

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
  return VALIDATION.PHONE_REGEX.test(phone) && phone.length >= 10;
}

/**
 * Validate ZIP code format (US)
 * @param zipCode - ZIP code to validate
 * @returns True if valid ZIP code format
 */
export function isValidZipCode(zipCode: string): boolean {
  return VALIDATION.ZIP_CODE_REGEX.test(zipCode);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
    };
  }

  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate string length
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @returns True if string length is within range
 */
export function isValidLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Validate required field
 * @param value - Value to validate
 * @returns True if value is not empty
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

/**
 * Validate number is positive
 * @param value - Number to validate
 * @returns True if number is positive
 */
export function isPositive(value: number): boolean {
  return !isNaN(value) && value > 0;
}

/**
 * Validate number is within range
 * @param value - Number to validate
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if number is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate integer
 * @param value - Value to validate
 * @returns True if value is an integer
 */
export function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

/**
 * Sanitize HTML string (basic)
 * @param html - HTML string to sanitize
 * @returns Sanitized string
 */
export function sanitizeHtml(html: string): string {
  const element = document.createElement('div');
  element.textContent = html;
  return element.innerHTML;
}

/**
 * Validate file type
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if file type is allowed
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB
 * @returns True if file size is within limit
 */
export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate UUID format
 * @param uuid - UUID to validate
 * @returns True if valid UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate credit card number (Luhn algorithm)
 * @param cardNumber - Credit card number to validate
 * @returns True if valid credit card number
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');

  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate age is over minimum
 * @param birthDate - Birth date
 * @param minAge - Minimum age required
 * @returns True if age is over minimum
 */
export function isMinimumAge(birthDate: Date | string, minAge: number): boolean {
  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minAge;
    }

    return age >= minAge;
  } catch {
    return false;
  }
}
