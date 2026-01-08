/**
 * Input validation utilities for Supabase Edge Functions
 * Split Lease - Bubble API Migration
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 *
 * @module _shared/validation
 */

import { ValidationError } from './errors.ts';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const US_PHONE_REGEX = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/
const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is valid email format
 * @pure
 */
export const isValidEmail = (email: string): boolean =>
  EMAIL_REGEX.test(email)

/**
 * Check if value is valid US phone format
 * @pure
 */
export const isValidUsPhone = (phone: string): boolean =>
  US_PHONE_REGEX.test(phone)

/**
 * Check if value is valid E.164 phone format
 * @pure
 */
export const isValidE164Phone = (phone: string): boolean =>
  E164_PHONE_REGEX.test(phone)

/**
 * Check if value is empty (null, undefined, or empty string)
 * @pure
 */
export const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === ''

/**
 * Check if value is present and not empty
 * @pure
 */
export const isPresent = (value: unknown): boolean =>
  !isEmpty(value)

/**
 * Check if action is in allowed list
 * @pure
 */
export const isAllowedAction = (action: string, allowedActions: string[]): boolean =>
  allowedActions.includes(action)

// ─────────────────────────────────────────────────────────────
// Validation Functions (Throws on failure)
// ─────────────────────────────────────────────────────────────

/**
 * Validate email format
 * NO FALLBACK: Throws if invalid, no auto-correction
 * @throws {ValidationError}
 */
export function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new ValidationError(`Invalid email format: ${email}`)
  }
}

/**
 * Validate phone number format (US phone numbers)
 * NO FALLBACK: Throws if invalid, no auto-formatting
 * @throws {ValidationError}
 */
export function validatePhone(phone: string): void {
  if (!phone) return // Phone is optional in most cases

  if (!isValidUsPhone(phone)) {
    throw new ValidationError(`Invalid phone format: ${phone}`)
  }
}

/**
 * Validate required field exists and is not empty
 * NO FALLBACK: Throws if missing or empty
 * @throws {ValidationError}
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (isEmpty(value)) {
    throw new ValidationError(`${fieldName} is required`)
  }
}

/**
 * Validate object has required fields
 * NO FALLBACK: Throws on first missing field
 * @throws {ValidationError}
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || isEmpty(obj[field])) {
      throw new ValidationError(`Missing required field: ${field}`)
    }
  }
}

/**
 * Validate action is one of allowed actions
 * NO FALLBACK: Throws if action not recognized
 * @throws {ValidationError}
 */
export function validateAction(action: string, allowedActions: string[]): void {
  if (!isAllowedAction(action, allowedActions)) {
    throw new ValidationError(`Unknown action: ${action}. Allowed actions: ${allowedActions.join(', ')}`)
  }
}

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 * NO FALLBACK: Throws if invalid
 * @throws {ValidationError}
 */
export function validatePhoneE164(phone: string, fieldName: string = 'phone'): void {
  if (!isValidE164Phone(phone)) {
    throw new ValidationError(
      `${fieldName} must be in E.164 format (e.g., +15551234567). Received: ${phone}`
    )
  }
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  EMAIL_REGEX,
  US_PHONE_REGEX,
  E164_PHONE_REGEX,

  // Predicates
  isValidEmail,
  isValidUsPhone,
  isValidE164Phone,
  isEmpty,
  isPresent,
  isAllowedAction
})
