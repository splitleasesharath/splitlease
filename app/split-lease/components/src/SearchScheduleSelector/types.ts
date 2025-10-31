/**
 * Type definitions for SearchScheduleSelector component
 * Includes TypeScript interfaces and Zod schemas for runtime validation
 * Following architectural standards for type safety and self-documentation
 */

import { z } from 'zod';

/**
 * Represents a day of the week in the schedule selector
 *
 * @interface Day
 * @property {string} id - Unique identifier for the day (1-7)
 * @property {string} singleLetter - Single letter abbreviation (S, M, T, W, T, F, S)
 * @property {string} fullName - Full name of the day (Sunday, Monday, etc.)
 * @property {number} index - Zero-based index (0=Sunday, 1=Monday, ..., 6=Saturday)
 *
 * @example
 * const monday: Day = {
 *   id: '2',
 *   singleLetter: 'M',
 *   fullName: 'Monday',
 *   index: 1
 * };
 */
export interface Day {
  id: string;
  singleLetter: string;
  fullName: string;
  index: number;
}

/**
 * Zod schema for Day validation
 * Validates day structure at runtime
 */
export const DaySchema = z.object({
  id: z.string().min(1, 'Day ID must not be empty'),
  singleLetter: z.string().length(1, 'Single letter must be exactly 1 character'),
  fullName: z.string().min(1, 'Full name must not be empty'),
  index: z.number().int().min(0).max(6, 'Index must be between 0 and 6'),
});

/**
 * Represents a listing (property/accommodation) in the system
 *
 * @interface Listing
 * @property {string} id - Unique identifier for the listing
 * @property {string} [title] - Optional title/name of the listing
 * @property {number[]} [availableDays] - Optional array of available day indices (0-6)
 *
 * @example
 * const listing: Listing = {
 *   id: 'listing-123',
 *   title: 'Cozy Downtown Apartment',
 *   availableDays: [0, 1, 2, 3, 4, 5, 6]
 * };
 */
export interface Listing {
  id: string;
  title?: string;
  availableDays?: number[];
}

/**
 * Zod schema for Listing validation
 * Validates listing structure at runtime
 */
export const ListingSchema = z.object({
  id: z.string().min(1, 'Listing ID must not be empty'),
  title: z.string().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
});

/**
 * Props for the SearchScheduleSelector component
 *
 * @interface SearchScheduleSelectorProps
 * @property {Listing} [listing] - Optional listing data to display availability
 * @property {(selectedDays: Day[]) => void} [onSelectionChange] - Callback fired when selection changes
 * @property {(error: string) => void} [onError] - Callback fired when validation fails
 * @property {string} [className] - Optional CSS class name for styling customization
 * @property {number} [minDays=2] - Minimum number of nights required (dayCount - 1)
 * @property {number} [maxDays=5] - Maximum number of nights allowed (dayCount - 1)
 * @property {boolean} [requireContiguous=true] - Whether selected days must be contiguous
 * @property {number[]} [initialSelection] - Array of day indices to pre-select on mount
 *
 * @example
 * // Basic usage
 * <SearchScheduleSelector
 *   minDays={2}
 *   maxDays={5}
 *   requireContiguous={true}
 *   onSelectionChange={(days) => console.log('Selected:', days)}
 * />
 *
 * @example
 * // With listing and initial selection
 * <SearchScheduleSelector
 *   listing={{ id: '123', title: 'My Listing', availableDays: [1,2,3,4,5] }}
 *   initialSelection={[1, 2, 3]}
 *   minDays={2}
 *   maxDays={5}
 *   requireContiguous={true}
 *   onSelectionChange={handleSelection}
 *   onError={handleError}
 * />
 */
export interface SearchScheduleSelectorProps {
  listing?: Listing;
  onSelectionChange?: (selectedDays: Day[]) => void;
  onError?: (error: string) => void;
  className?: string;
  minDays?: number;
  maxDays?: number;
  requireContiguous?: boolean;
  initialSelection?: number[];
}

/**
 * Zod schema for SearchScheduleSelectorProps validation
 * Validates component props at runtime (simplified for function types)
 */
export const SearchScheduleSelectorPropsSchema = z.object({
  listing: ListingSchema.optional(),
  onSelectionChange: z.function().optional(),
  onError: z.function().optional(),
  className: z.string().optional(),
  minDays: z.number().int().min(0).optional(),
  maxDays: z.number().int().min(0).optional(),
  requireContiguous: z.boolean().optional(),
  initialSelection: z.array(z.number().int().min(0).max(6)).optional(),
});

/**
 * Result of validation check on selected days
 *
 * @interface ValidationResult
 * @property {boolean} valid - Whether the selection passes validation
 * @property {string} [error] - Optional error message if validation fails
 *
 * @example
 * const result: ValidationResult = {
 *   valid: false,
 *   error: 'Please select at least 2 nights per week'
 * };
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Zod schema for ValidationResult
 * Validates validation result structure at runtime
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
});

/**
 * Listing count data for exact and partial matches
 *
 * @interface ListingCount
 * @property {number} exact - Number of listings with exact day match
 * @property {number} partial - Number of listings with partial day match
 *
 * @example
 * const counts: ListingCount = {
 *   exact: 5,
 *   partial: 12
 * };
 */
export interface ListingCount {
  exact: number;
  partial: number;
}

/**
 * Zod schema for ListingCount validation
 * Validates listing count structure at runtime
 */
export const ListingCountSchema = z.object({
  exact: z.number().int().min(0),
  partial: z.number().int().min(0),
});

/**
 * Type guard to check if value is a valid Day
 *
 * @param {unknown} value - Value to check
 * @returns {value is Day} True if value is a valid Day
 *
 * @example
 * if (isDay(someValue)) {
 *   console.log(someValue.fullName); // TypeScript knows this is safe
 * }
 */
export function isDay(value: unknown): value is Day {
  return DaySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid Listing
 *
 * @param {unknown} value - Value to check
 * @returns {value is Listing} True if value is a valid Listing
 *
 * @example
 * if (isListing(someValue)) {
 *   console.log(someValue.id); // TypeScript knows this is safe
 * }
 */
export function isListing(value: unknown): value is Listing {
  return ListingSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is a valid ValidationResult
 *
 * @param {unknown} value - Value to check
 * @returns {value is ValidationResult} True if value is a valid ValidationResult
 *
 * @example
 * if (isValidationResult(someValue)) {
 *   if (!someValue.valid) {
 *     console.log(someValue.error);
 *   }
 * }
 */
export function isValidationResult(value: unknown): value is ValidationResult {
  return ValidationResultSchema.safeParse(value).success;
}

/**
 * Constants for day indices
 * Provides named constants for better code readability
 */
export const DAY_INDICES = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

/**
 * Type for day index values
 */
export type DayIndex = typeof DAY_INDICES[keyof typeof DAY_INDICES];

/**
 * Validation error types for better error handling
 */
export enum ValidationErrorType {
  MIN_DAYS = 'MIN_DAYS',
  MAX_DAYS = 'MAX_DAYS',
  CONTIGUOUS = 'CONTIGUOUS',
}

/**
 * Extended validation result with error type
 *
 * @interface ExtendedValidationResult
 * @extends ValidationResult
 * @property {ValidationErrorType} [errorType] - Type of validation error
 */
export interface ExtendedValidationResult extends ValidationResult {
  errorType?: ValidationErrorType;
}
