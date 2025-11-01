/**
 * Utility Functions for SignupTrialHost Component
 *
 * This file contains helper functions for formatting, validation,
 * and data transformation used throughout the component.
 *
 * @module SignupTrialHost/utils
 */

import { VALIDATION_REGEX } from './constants';

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 *
 * @param value - The phone number string (can contain non-digit characters)
 * @returns Formatted phone number or original value if invalid
 *
 * @example
 * formatPhoneNumber('1234567890') // Returns: '(123) 456-7890'
 * formatPhoneNumber('123-456-7890') // Returns: '(123) 456-7890'
 * formatPhoneNumber('abc') // Returns: 'abc'
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Only format if we have exactly 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return original value if not 10 digits
  return value;
}

/**
 * Extracts only digits from a phone number string
 *
 * @param value - The phone number string
 * @returns String containing only digits
 *
 * @example
 * extractPhoneDigits('(123) 456-7890') // Returns: '1234567890'
 * extractPhoneDigits('123-456-7890') // Returns: '1234567890'
 */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates email format using regex
 *
 * @param email - The email address to validate
 * @returns True if email is valid, false otherwise
 *
 * @example
 * validateEmail('user@example.com') // Returns: true
 * validateEmail('invalid-email') // Returns: false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return VALIDATION_REGEX.EMAIL.test(email.trim());
}

/**
 * Validates phone number format (must be 10 digits)
 *
 * @param phone - The phone number to validate
 * @returns True if phone is valid, false otherwise
 *
 * @example
 * validatePhone('1234567890') // Returns: true
 * validatePhone('(123) 456-7890') // Returns: true (extracts digits first)
 * validatePhone('12345') // Returns: false
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const digits = extractPhoneDigits(phone);
  return VALIDATION_REGEX.PHONE.test(digits);
}

/**
 * Sanitizes user input by trimming whitespace and removing dangerous characters
 *
 * @param value - The input value to sanitize
 * @returns Sanitized string
 *
 * @example
 * sanitizeInput('  Hello World  ') // Returns: 'Hello World'
 * sanitizeInput('<script>alert("xss")</script>') // Returns: 'scriptalert("xss")/script'
 */
export function sanitizeInput(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Prevent extremely long inputs
}

/**
 * Formats an address string by capitalizing appropriately
 *
 * @param address - The address to format
 * @returns Formatted address
 *
 * @example
 * formatAddress('123 main st') // Returns: '123 Main St'
 */
export function formatAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    return '';
  }

  return sanitizeInput(address);
}

/**
 * Converts a date string to ISO 8601 format
 *
 * @param dateStr - The date string to convert
 * @returns ISO 8601 formatted date string
 *
 * @example
 * toISODate('2024-01-15') // Returns: '2024-01-15T00:00:00.000Z'
 */
export function toISODate(dateStr: string): string {
  if (!dateStr) {
    return '';
  }

  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch {
    return dateStr;
  }
}

/**
 * Checks if a date is in the future
 *
 * @param dateStr - The date string to check
 * @returns True if date is in the future, false otherwise
 *
 * @example
 * isFutureDate('2099-12-31') // Returns: true
 * isFutureDate('2000-01-01') // Returns: false
 */
export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) {
    return false;
  }

  try {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  } catch {
    return false;
  }
}

/**
 * Gets tomorrow's date in YYYY-MM-DD format (for min date attribute)
 *
 * @returns Tomorrow's date as a string
 *
 * @example
 * getTomorrowDate() // Returns: '2024-01-16' (if today is 2024-01-15)
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Debounces a function call
 *
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a delay promise for retry logic
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 *
 * @example
 * await delay(1000); // Waits 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function a specified number of times
 *
 * @param fn - The async function to retry
 * @param maxAttempts - Maximum number of retry attempts
 * @param delayMs - Delay between retries in milliseconds
 * @returns The result of the function or throws the last error
 *
 * @example
 * const result = await retry(() => fetchData(), 3, 1000);
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs: number
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't delay after the last attempt
      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Deep clones an object (simple implementation for form data)
 *
 * @param obj - The object to clone
 * @returns Cloned object
 *
 * @example
 * const clone = deepClone({ a: 1, b: { c: 2 } });
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Checks if an object is empty
 *
 * @param obj - The object to check
 * @returns True if object has no keys, false otherwise
 *
 * @example
 * isEmpty({}) // Returns: true
 * isEmpty({ a: 1 }) // Returns: false
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Gets a nested property value safely
 *
 * @param obj - The object to query
 * @param path - The path to the property (e.g., 'personalInfo.email')
 * @returns The value or undefined if not found
 *
 * @example
 * getNestedValue({ a: { b: { c: 1 } } }, 'a.b.c') // Returns: 1
 * getNestedValue({ a: 1 }, 'a.b.c') // Returns: undefined
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Announces a message to screen readers
 *
 * @param message - The message to announce
 * @param priority - The announcement priority ('polite' or 'assertive')
 *
 * @example
 * announceToScreenReader('Form submitted successfully', 'assertive');
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Find or create live region
  let liveRegion = document.getElementById(`aria-live-${priority}`);

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = `aria-live-${priority}`;
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText =
      'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    document.body.appendChild(liveRegion);
  }

  // Clear and set new message
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion!.textContent = message;
  }, 100);
}
