/**
 * Represents a day of the week
 */
export interface Day {
  id: string;
  singleLetter: string;
  fullName: string;
  index: number;
}

/**
 * Represents a listing (property/accommodation)
 */
export interface Listing {
  id: string;
  title?: string;
  availableDays?: number[];
}

/**
 * Props for the SearchScheduleSelector component
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
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Listing count data
 */
export interface ListingCount {
  exact: number;
  partial: number;
}


