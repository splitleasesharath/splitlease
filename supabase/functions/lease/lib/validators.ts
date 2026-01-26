/**
 * Validators for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * NO FALLBACK PRINCIPLE: All validation fails fast with clear error messages
 */

import { ValidationError } from '../../_shared/errors.ts';
import type { CreateLeasePayload, GetLeasePayload } from './types.ts';

/**
 * Validate the create lease payload
 * Fails fast if any required field is missing or invalid
 */
export function validateCreateLeasePayload(
  payload: Record<string, unknown>
): asserts payload is CreateLeasePayload {
  if (!payload.proposalId || typeof payload.proposalId !== 'string') {
    throw new ValidationError('proposalId is required and must be a string');
  }

  if (payload.isCounteroffer === undefined) {
    throw new ValidationError('isCounteroffer is required');
  }

  // Handle both string ("yes"/"no") and boolean formats from Bubble
  const isCounteroffer = payload.isCounteroffer === 'yes' ||
    payload.isCounteroffer === true ||
    payload.isCounteroffer === 'true';

  if (typeof payload.fourWeekRent !== 'number' || payload.fourWeekRent < 0) {
    throw new ValidationError('fourWeekRent must be a non-negative number');
  }

  if (typeof payload.fourWeekCompensation !== 'number' || payload.fourWeekCompensation < 0) {
    throw new ValidationError('fourWeekCompensation must be a non-negative number');
  }

  if (
    payload.numberOfZeros !== undefined &&
    (typeof payload.numberOfZeros !== 'number' || payload.numberOfZeros < 0)
  ) {
    throw new ValidationError('numberOfZeros must be a non-negative number if provided');
  }
}

/**
 * Validate the get lease payload
 */
export function validateGetLeasePayload(
  payload: Record<string, unknown>
): asserts payload is GetLeasePayload {
  if (!payload.leaseId || typeof payload.leaseId !== 'string') {
    throw new ValidationError('leaseId is required and must be a string');
  }
}

/**
 * Normalize the isCounteroffer value to a boolean
 * Handles both string ("yes"/"no") and boolean formats
 */
export function normalizeIsCounteroffer(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
  }
  return false;
}
