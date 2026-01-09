/**
 * Input validation utilities for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 */

import { ValidationError } from './errors.ts';

/**
 * Validate email format
 * NO FALLBACK: Throws if invalid, no auto-correction
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
}

/**
 * Validate phone number format (US phone numbers)
 * NO FALLBACK: Throws if invalid, no auto-formatting
 */
export function validatePhone(phone: string): void {
  if (!phone) return; // Phone is optional in most cases

  const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError(`Invalid phone format: ${phone}`);
  }
}

/**
 * Validate required field exists and is not empty
 * NO FALLBACK: Throws if missing or empty
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Validate object has required fields
 * NO FALLBACK: Throws on first missing field
 */
export function validateRequiredFields(
  obj: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
}

/**
 * Validate action is one of allowed actions
 * NO FALLBACK: Throws if action not recognized
 */
export function validateAction(action: string, allowedActions: string[]): void {
  if (!allowedActions.includes(action)) {
    throw new ValidationError(`Unknown action: ${action}. Allowed actions: ${allowedActions.join(', ')}`);
  }
}

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 * NO FALLBACK: Throws if invalid
 */
export function validatePhoneE164(phone: string, fieldName: string = 'phone'): void {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Received: ${phone}`
    );
  }
}

/**
 * Trim whitespace from a string value
 * Pure function: no side effects, returns null for empty/undefined values
 *
 * @param value - String to trim (may be null/undefined)
 * @returns Trimmed string, or null if empty/undefined
 */
export function trimString(value: string | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
