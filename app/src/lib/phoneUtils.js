/**
 * Phone Number Validation Utilities
 * Split Lease - Frontend
 *
 * Provides phone number validation and formatting for US phone numbers.
 * Converts user input to E.164 format required by the SMS Edge Function.
 *
 * E.164 Format: +[country code][number] e.g., +15551234567
 *
 * Usage:
 *   import { formatPhoneDisplay, toE164Format, isValidUsPhoneNumber } from './phoneUtils.js';
 *
 *   // Validate
 *   isValidUsPhoneNumber('555-123-4567'); // true
 *
 *   // Format for display
 *   formatPhoneDisplay('5551234567'); // '(555) 123-4567'
 *
 *   // Convert to E.164 for API
 *   toE164Format('555-123-4567'); // '+15551234567'
 */

// US phone number regex - accepts various formats
const US_PHONE_PATTERNS = {
  // Just digits: 5551234567 or 15551234567
  DIGITS_ONLY: /^1?\d{10}$/,
  // With separators: 555-123-4567, (555) 123-4567, 555.123.4567
  FORMATTED: /^\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/,
  // Already in E.164: +15551234567
  E164: /^\+1\d{10}$/
};

/**
 * Remove all non-digit characters from phone number
 * @param {string} phone - Raw phone input
 * @returns {string} Digits only
 */
export const stripNonDigits = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Check if a US phone number is valid
 * Accepts various formats: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid US phone number
 */
export const isValidUsPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const trimmed = phone.trim();

  // Check if already in E.164 format
  if (US_PHONE_PATTERNS.E164.test(trimmed)) {
    return true;
  }

  // Check formatted patterns
  if (US_PHONE_PATTERNS.FORMATTED.test(trimmed)) {
    return true;
  }

  // Check digits only (with optional leading 1)
  const digits = stripNonDigits(trimmed);
  return US_PHONE_PATTERNS.DIGITS_ONLY.test(digits);
};

/**
 * Convert any valid US phone number to E.164 format
 * Required format for Twilio SMS API: +15551234567
 *
 * @param {string} phone - Phone number in any valid format
 * @returns {string|null} E.164 format (+15551234567) or null if invalid
 */
export const toE164Format = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const trimmed = phone.trim();

  // Already in E.164 format
  if (US_PHONE_PATTERNS.E164.test(trimmed)) {
    return trimmed;
  }

  // Extract digits
  const digits = stripNonDigits(trimmed);

  // Handle 11 digits starting with 1 (US country code already present)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Handle 10 digits (missing country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Invalid number of digits
  return null;
};

/**
 * Format phone number for display: (555) 123-4567
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Formatted display string or original if invalid
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';

  const digits = stripNonDigits(phone);

  // Remove leading 1 if present
  const normalized = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits;

  if (normalized.length !== 10) {
    return phone; // Return original if not a valid 10-digit number
  }

  const areaCode = normalized.slice(0, 3);
  const exchange = normalized.slice(3, 6);
  const subscriber = normalized.slice(6, 10);

  return `(${areaCode}) ${exchange}-${subscriber}`;
};

/**
 * Format phone input as user types (controlled input helper)
 * Progressively formats: 5 -> 55 -> 555 -> (555) -> (555) 1 -> etc.
 *
 * @param {string} value - Current input value
 * @returns {string} Formatted value for display
 */
export const formatPhoneAsYouType = (value) => {
  if (!value) return '';

  const digits = stripNonDigits(value);

  // Limit to 10 digits (US phone without country code)
  const limitedDigits = digits.slice(0, 10);

  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }

  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

/**
 * Get validation error message for phone number
 *
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export const getPhoneValidationError = (phone) => {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }

  if (!isValidUsPhoneNumber(phone)) {
    return 'Please enter a valid US phone number';
  }

  return null;
};
