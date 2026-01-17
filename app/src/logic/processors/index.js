/**
 * Logic Core - Processors Index
 * Data transformation functions ("Truth" layer).
 * NO FALLBACK - throws explicit errors for invalid data.
 * Guarantees data shape before it reaches the UI.
 */

// NOTE: Bubble day conversion functions removed after migration to 0-indexed days
// Database now stores days as 0-6 (JavaScript standard) natively

// Listing Processors
export { parseJsonArrayField, parseJsonArrayFieldOptional } from './listing/parseJsonArrayField.js'
export { extractListingCoordinates } from './listing/extractListingCoordinates.js'

// Display Processors
export { formatHostName } from './display/formatHostName.js'

// User Processors
export { processUserData } from './user/processUserData.js'
export { processUserInitials } from './user/processUserInitials.js'
export { processUserDisplayName } from './user/processUserDisplayName.js'
export { processProfilePhotoUrl } from './user/processProfilePhotoUrl.js'

// Proposal Processors
export { processProposalTerms } from './proposal/processProposalTerms.js'

// Proposal Processors - Extended (from new implementation)
export {
  processUserData as processProposalUserData,
  processListingData,
  processHostData,
  processVirtualMeetingData,
  processProposalData as processFullProposalData,
  getProposalDisplayText,
  formatPrice,
  formatDate,
  formatDateTime,
  getEffectiveTerms
} from './proposals/processProposalData.js'
