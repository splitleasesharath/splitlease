/**
 * Input Validation for Host Payment Records Edge Function
 * Split Lease - Supabase Edge Functions
 */

import { ValidationError } from '../../_shared/errors.ts';
import { GeneratePaymentRecordsInput, RentalType, WeekPattern } from './types.ts';

const VALID_RENTAL_TYPES: RentalType[] = ['Nightly', 'Weekly', 'Monthly'];

const VALID_WEEK_PATTERNS: WeekPattern[] = [
  'Every week',
  'One week on, one week off',
  'Two weeks on, two weeks off',
  'One week on, three weeks off',
];

/**
 * Validate input for generating payment records
 */
export function validateGenerateInput(input: Partial<GeneratePaymentRecordsInput>): void {
  // Lease ID is required
  if (!input.leaseId || typeof input.leaseId !== 'string') {
    throw new ValidationError('leaseId is required and must be a string');
  }

  // Rental type validation
  if (!input.rentalType) {
    throw new ValidationError(
      `rentalType is required and must be one of: ${VALID_RENTAL_TYPES.join(', ')}`
    );
  }
  if (!VALID_RENTAL_TYPES.includes(input.rentalType)) {
    throw new ValidationError(
      `rentalType must be one of: ${VALID_RENTAL_TYPES.join(', ')}. Got: ${input.rentalType}`
    );
  }

  // Move-in date is required
  if (!input.moveInDate) {
    throw new ValidationError('moveInDate is required');
  }

  // Duration validation based on rental type
  if (input.rentalType === 'Monthly') {
    if (!input.reservationSpanMonths || input.reservationSpanMonths <= 0) {
      throw new ValidationError(
        'reservationSpanMonths is required for Monthly rental type and must be a positive number'
      );
    }
    if (!input.rentPerMonth || input.rentPerMonth <= 0) {
      throw new ValidationError(
        'rentPerMonth is required for Monthly rental type and must be a positive number'
      );
    }
  } else {
    // Nightly or Weekly
    if (!input.reservationSpanWeeks || input.reservationSpanWeeks <= 0) {
      throw new ValidationError(
        'reservationSpanWeeks is required for Nightly and Weekly rental types and must be a positive number'
      );
    }
    if (!input.fourWeekRent || input.fourWeekRent <= 0) {
      throw new ValidationError(
        'fourWeekRent is required for Nightly and Weekly rental types and must be a positive number'
      );
    }
  }

  // Week pattern validation
  if (!input.weekPattern) {
    throw new ValidationError(
      `weekPattern is required and must be one of: ${VALID_WEEK_PATTERNS.join(', ')}`
    );
  }
  if (!VALID_WEEK_PATTERNS.includes(input.weekPattern)) {
    throw new ValidationError(
      `weekPattern must be one of: ${VALID_WEEK_PATTERNS.join(', ')}. Got: ${input.weekPattern}`
    );
  }

  // Maintenance fee validation
  if (input.maintenanceFee === undefined || input.maintenanceFee === null) {
    throw new ValidationError('maintenanceFee is required');
  }
  if (typeof input.maintenanceFee !== 'number' || isNaN(input.maintenanceFee)) {
    throw new ValidationError('maintenanceFee must be a number');
  }
}

/**
 * Normalize rental type to expected format
 * Handles case variations
 */
export function normalizeRentalType(rentalType: string): RentalType {
  const normalized = rentalType.charAt(0).toUpperCase() + rentalType.slice(1).toLowerCase();

  if (!VALID_RENTAL_TYPES.includes(normalized as RentalType)) {
    throw new ValidationError(
      `Invalid rental type: ${rentalType}. Must be one of: ${VALID_RENTAL_TYPES.join(', ')}`
    );
  }

  return normalized as RentalType;
}

/**
 * Normalize week pattern to expected format
 * Handles common variations
 */
export function normalizeWeekPattern(weekPattern: string): WeekPattern {
  // Handle common variations
  const mappings: Record<string, WeekPattern> = {
    'every week': 'Every week',
    'everyweek': 'Every week',
    'one week on one week off': 'One week on, one week off',
    '1 on 1 off': 'One week on, one week off',
    'two weeks on two weeks off': 'Two weeks on, two weeks off',
    '2 on 2 off': 'Two weeks on, two weeks off',
    'one week on three weeks off': 'One week on, three weeks off',
    '1 on 3 off': 'One week on, three weeks off',
  };

  const lower = weekPattern.toLowerCase().replace(/,/g, '');

  if (mappings[lower]) {
    return mappings[lower];
  }

  // Check if it's already a valid pattern
  if (VALID_WEEK_PATTERNS.includes(weekPattern as WeekPattern)) {
    return weekPattern as WeekPattern;
  }

  throw new ValidationError(
    `Invalid week pattern: ${weekPattern}. Must be one of: ${VALID_WEEK_PATTERNS.join(', ')}`
  );
}
