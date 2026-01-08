/**
 * Input validation for Virtual Meeting Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 *
 * FP PATTERN: All validation functions are pure predicates with explicit inputs
 * Each function validates input and throws on failure (fail-fast pattern)
 *
 * @module virtual-meeting/lib/validators
 */

import { ValidationError } from "../../_shared/errors.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const REQUIRED_TIME_SLOTS = 3

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if a value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Check if a date string is valid ISO 8601
 * @pure
 */
const isValidDateString = (dateStr: string): boolean =>
  !isNaN(new Date(dateStr).getTime())

// ─────────────────────────────────────────────────────────────
// Create Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the create virtual meeting input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateCreateVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  // Required fields
  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.timesSelected || !Array.isArray(data.timesSelected)) {
    throw new ValidationError('timesSelected is required and must be an array');
  }

  // Exactly 3 time slots required
  if (data.timesSelected.length !== REQUIRED_TIME_SLOTS) {
    throw new ValidationError(`Exactly ${REQUIRED_TIME_SLOTS} time slots are required`);
  }

  // Validate each time slot is a valid ISO 8601 string
  for (const timeSlot of data.timesSelected) {
    if (typeof timeSlot !== 'string') {
      throw new ValidationError('Each time slot must be a string');
    }
    const date = new Date(timeSlot);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Invalid datetime format: ${timeSlot}`);
    }
  }

  if (!data.requestedById || typeof data.requestedById !== 'string') {
    throw new ValidationError('requestedById is required and must be a string');
  }

  // Optional field validation
  if (data.timezoneString !== undefined && typeof data.timezoneString !== 'string') {
    throw new ValidationError('timezoneString must be a string if provided');
  }

  if (data.isAlternativeTimes !== undefined && typeof data.isAlternativeTimes !== 'boolean') {
    throw new ValidationError('isAlternativeTimes must be a boolean if provided');
  }
}

// ─────────────────────────────────────────────────────────────
// Delete Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the delete virtual meeting input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateDeleteVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.virtualMeetingId || typeof data.virtualMeetingId !== 'string') {
    throw new ValidationError('virtualMeetingId is required and must be a string');
  }

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }
}

// ─────────────────────────────────────────────────────────────
// Accept Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the accept virtual meeting input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateAcceptVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.bookedDate || typeof data.bookedDate !== 'string') {
    throw new ValidationError('bookedDate is required and must be a string');
  }

  // Validate bookedDate is valid ISO 8601
  const date = new Date(data.bookedDate);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid datetime format for bookedDate: ${data.bookedDate}`);
  }

  if (!data.userAcceptingId || typeof data.userAcceptingId !== 'string') {
    throw new ValidationError('userAcceptingId is required and must be a string');
  }
}

// ─────────────────────────────────────────────────────────────
// Decline Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the decline virtual meeting input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateDeclineVirtualMeetingInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }
}

// ─────────────────────────────────────────────────────────────
// Calendar Invite Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the send calendar invite input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateSendCalendarInviteInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.proposalId || typeof data.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    throw new ValidationError('userId is required and must be a string');
  }
}

// ─────────────────────────────────────────────────────────────
// Notify Participants Validation
// ─────────────────────────────────────────────────────────────

/**
 * Validate the notify participants input payload
 * @pure (except throws)
 * @param input - The raw input to validate
 * @throws ValidationError if input is invalid
 */
export function validateNotifyParticipantsInput(input: unknown): void {
  const data = input as Record<string, unknown>;

  if (!data.hostId || typeof data.hostId !== 'string') {
    throw new ValidationError('hostId is required and must be a string');
  }

  if (!data.guestId || typeof data.guestId !== 'string') {
    throw new ValidationError('guestId is required and must be a string');
  }

  if (!data.virtualMeetingId || typeof data.virtualMeetingId !== 'string') {
    throw new ValidationError('virtualMeetingId is required and must be a string');
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
  REQUIRED_TIME_SLOTS,

  // Validation Predicates
  isNonEmptyString,
  isValidDateString,

  // Validation Functions
  validateCreateVirtualMeetingInput,
  validateDeleteVirtualMeetingInput,
  validateAcceptVirtualMeetingInput,
  validateDeclineVirtualMeetingInput,
  validateSendCalendarInviteInput,
  validateNotifyParticipantsInput,
})
