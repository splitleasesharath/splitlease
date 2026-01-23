/**
 * Listings Overview Constants
 *
 * Centralized constants for the Listings Overview page including:
 * - Preset error codes for common listing issues
 * - Price multiplier configuration
 * - Status enums matching Supabase schema
 */

// ============================================================================
// PRESET ERROR CODES
// ============================================================================

/**
 * Common listing errors that can be quickly assigned via dropdown.
 * Admins can also add custom errors via free-text input.
 */
export const PRESET_ERROR_CODES = [
  { code: 'CONTACT_IN_DESC', label: 'Sharing Contact Information in Description' },
  { code: 'MISSING_PHOTOS', label: 'Insufficient Photos (< 5)' },
  { code: 'PRICING_ISSUE', label: 'Pricing Below Market Rate' },
  { code: 'INCOMPLETE_PROFILE', label: 'Host Profile Incomplete' },
  { code: 'ADDRESS_MISMATCH', label: 'Address Verification Failed' },
  { code: 'DUPLICATE_LISTING', label: 'Possible Duplicate Listing' },
  { code: 'POLICY_VIOLATION', label: 'Policy Violation' },
  { code: 'QUALITY_ISSUE', label: 'Photo/Content Quality Issue' },
];

// ============================================================================
// PRICE MULTIPLIER CONFIGURATION
// ============================================================================

/**
 * Configuration for bulk price updates.
 * - DEFAULT: The quick-action multiplier (1.75x)
 * - MIN/MAX: Bounds for custom multiplier input
 */
export const PRICE_MULTIPLIERS = {
  DEFAULT: 1.75,
  MIN: 1.0,
  MAX: 3.0,
};

// ============================================================================
// LISTING STATUS (Computed from database flags)
// ============================================================================

/**
 * Computed listing status based on Complete, pending, Deleted flags.
 * These are NOT stored in the database - they're derived at runtime.
 */
export const LISTING_STATUS = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'InProgress',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
};

/**
 * Availability status derived from Active and Approved flags.
 */
export const AVAILABILITY_STATUS = {
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
  PENDING: 'Pending',
};

// ============================================================================
// FILTER OPTIONS
// ============================================================================

/**
 * Options for the "Show All" filter dropdown.
 */
export const SHOW_ALL_FILTER_OPTIONS = [
  { value: 'all', label: 'Show All' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
  { value: 'showcase', label: 'Showcase Only' },
  { value: 'usability', label: 'Usability Only' },
];

/**
 * Initial filter state for the page.
 */
export const INITIAL_FILTERS = {
  showOnlyAvailable: false,
  completedListings: false,
  notFinishedListings: false,
  selectedBorough: '',
  selectedNeighborhood: '',
  searchQuery: '',
  startDate: null,
  endDate: null,
  showAllFilter: 'all',
};

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGE_SIZE = 50;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute listing status from database flags.
 * @param {Object} listing - Listing object from Supabase
 * @returns {string} One of LISTING_STATUS values
 */
export function computeListingStatus(listing) {
  if (listing.Deleted) return LISTING_STATUS.ARCHIVED;
  if (listing.Complete) return LISTING_STATUS.COMPLETED;
  if (listing.pending) return LISTING_STATUS.DRAFT;
  return LISTING_STATUS.IN_PROGRESS;
}

/**
 * Compute availability status from database flags.
 * @param {Object} listing - Listing object from Supabase
 * @returns {string} One of AVAILABILITY_STATUS values
 */
export function computeAvailability(listing) {
  if (!listing.Active) return AVAILABILITY_STATUS.UNAVAILABLE;
  if (!listing.Approved) return AVAILABILITY_STATUS.PENDING;
  return AVAILABILITY_STATUS.AVAILABLE;
}
