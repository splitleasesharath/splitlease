/**
 * Logic Core - Processors Index
 * Data transformation functions ("Truth" layer).
 * NO FALLBACK - throws explicit errors for invalid data.
 * Guarantees data shape before it reaches the UI.
 *
 * @pure All processors are deterministic with no side effects
 */

// NOTE: Bubble day conversion functions removed after migration to 0-indexed days
// Database now stores days as 0-6 (JavaScript standard) natively

// ─────────────────────────────────────────────────────────────
// Listing Processors
// ─────────────────────────────────────────────────────────────
export {
  parseJsonArrayField,
  parseJsonArrayFieldOptional,
  EMPTY_ARRAY as LISTING_EMPTY_ARRAY
} from './listing/parseJsonArrayField.js'

export {
  extractListingCoordinates,
  COORDINATE_SOURCES
} from './listing/extractListingCoordinates.js'

// ─────────────────────────────────────────────────────────────
// Display Processors
// ─────────────────────────────────────────────────────────────
export {
  formatHostName,
  WHITESPACE_REGEX,
  INITIAL_SUFFIX
} from './display/formatHostName.js'

// ─────────────────────────────────────────────────────────────
// User Processors
// ─────────────────────────────────────────────────────────────
export {
  processUserData,
  DEFAULT_DISPLAY_NAME as USER_DEFAULT_DISPLAY_NAME,
  DEFAULT_FULL_NAME as USER_DEFAULT_FULL_NAME,
  NAME_SEPARATOR as USER_NAME_SEPARATOR,
  FIELD_NAMES as USER_FIELD_NAMES
} from './user/processUserData.js'

export {
  processUserInitials,
  FIRST_CHAR_INDEX
} from './user/processUserInitials.js'

export {
  processUserDisplayName,
  NAME_SEPARATOR as DISPLAY_NAME_SEPARATOR
} from './user/processUserDisplayName.js'

export {
  processProfilePhotoUrl,
  HTTP_PREFIX,
  HTTPS_PREFIX,
  PROTOCOL_RELATIVE_PREFIX,
  HTTPS_PROTOCOL,
  ALLOWED_PROTOCOLS
} from './user/processProfilePhotoUrl.js'

// ─────────────────────────────────────────────────────────────
// Proposal Processors (Single-entity)
// ─────────────────────────────────────────────────────────────
export {
  processProposalData,
  DEFAULT_STATUS as PROPOSAL_DEFAULT_STATUS,
  FIELD_NAMES as PROPOSAL_FIELD_NAMES,
  TERM_FIELDS,
  HC_TERM_FIELDS
} from './proposal/processProposalData.js'

// ─────────────────────────────────────────────────────────────
// Proposal Processors - Extended (Multi-entity with nested data)
// ─────────────────────────────────────────────────────────────
export {
  // Processors
  processUserData as processProposalUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  processProposalData as processFullProposalData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms,
  // Constants
  DEFAULT_LISTING_NAME,
  DEFAULT_HOST_DISPLAY,
  DEFAULT_PROPERTY_DISPLAY,
  DEFAULT_STATUS as EXTENDED_DEFAULT_STATUS,
  DEFAULT_PROPOSAL_DISPLAY,
  LOCALE,
  TIMEZONE,
  DATE_FORMAT_OPTIONS,
  CURRENCY_FORMAT_OPTIONS,
  USER_FIELD_NAMES as EXTENDED_USER_FIELD_NAMES,
  LISTING_FIELD_NAMES,
  VM_FIELD_NAMES,
  PROPOSAL_FIELD_NAMES as EXTENDED_PROPOSAL_FIELD_NAMES
} from './proposals/processProposalData.js'
