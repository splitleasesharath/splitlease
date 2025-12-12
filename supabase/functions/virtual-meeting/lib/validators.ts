/**
 * Input validation for Virtual Meeting Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 */

import { ValidationError } from "../../_shared/errors.ts";

/**
 * Validate the create virtual meeting input payload
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
  if (data.timesSelected.length !== 3) {
    throw new ValidationError('Exactly 3 time slots are required');
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

/**
 * Validate the delete virtual meeting input payload
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
