/**
 * SearchScheduleSelector Component - Barrel Export
 *
 * Main entry point for the SearchScheduleSelector component.
 * Exports the component and all related types and schemas.
 *
 * @module SearchScheduleSelector
 *
 * @example
 * // Import component and types
 * import { SearchScheduleSelector, type SearchScheduleSelectorProps } from './SearchScheduleSelector';
 *
 * @example
 * // Import with Zod schemas for validation
 * import {
 *   SearchScheduleSelector,
 *   SearchScheduleSelectorPropsSchema,
 *   DaySchema
 * } from './SearchScheduleSelector';
 */

// Export the main component as named and default export
export { SearchScheduleSelector, SearchScheduleSelector as default } from './SearchScheduleSelector';

// Export all TypeScript types
export type {
  Day,
  Listing,
  SearchScheduleSelectorProps,
  ValidationResult,
  ListingCount,
  DayIndex,
  ExtendedValidationResult,
} from './types';

// Export Zod schemas for runtime validation
export {
  DaySchema,
  ListingSchema,
  SearchScheduleSelectorPropsSchema,
  ValidationResultSchema,
  ListingCountSchema,
  DAY_INDICES,
  ValidationErrorType,
} from './types';

// Export type guards
export {
  isDay,
  isListing,
  isValidationResult,
} from './types';
