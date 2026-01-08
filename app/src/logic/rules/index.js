/**
 * Logic Core - Rules Index
 *
 * PILLAR II: Rule Engines (The "Conditional" Layer)
 *
 * Boolean predicates that enforce business rules.
 * Pure functions that return strict booleans (no side effects).
 *
 * Naming Conventions:
 * - is*: State checking predicates
 * - can*: Permission/capability predicates
 * - has*: Existence checking predicates
 * - should*: Recommendation predicates
 * - get*: Computed value derivation
 *
 * @pure Yes - All exported functions are deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Scheduling Rules
// ─────────────────────────────────────────────────────────────
export {
  isScheduleContiguous,
  ALL_DAYS,
  DAYS_IN_WEEK
} from './scheduling/isScheduleContiguous.js'

export { isDateBlocked } from './scheduling/isDateBlocked.js'
export { isDateInRange } from './scheduling/isDateInRange.js'

// ─────────────────────────────────────────────────────────────
// Pricing Rules
// ─────────────────────────────────────────────────────────────
export {
  isValidDayCountForPricing,
  PRICING_DAY_LIMITS
} from './pricing/isValidDayCountForPricing.js'

// ─────────────────────────────────────────────────────────────
// Auth Rules
// ─────────────────────────────────────────────────────────────
export { isSessionValid } from './auth/isSessionValid.js'
export {
  isProtectedPage,
  PROTECTED_PATHS
} from './auth/isProtectedPage.js'

// ─────────────────────────────────────────────────────────────
// Search Rules
// ─────────────────────────────────────────────────────────────
export {
  isValidPriceTier,
  VALID_PRICE_TIERS
} from './search/isValidPriceTier.js'

export {
  isValidWeekPattern,
  VALID_WEEK_PATTERNS
} from './search/isValidWeekPattern.js'

export {
  isValidSortOption,
  VALID_SORT_OPTIONS
} from './search/isValidSortOption.js'

export { hasListingPhotos } from './search/hasListingPhotos.js'

// ─────────────────────────────────────────────────────────────
// Proposal Rules - Core
// ─────────────────────────────────────────────────────────────
export {
  determineProposalStage,
  STAGE_CANCELLED,
  STAGE_DEFAULT
} from './proposals/determineProposalStage.js'

export {
  canEditProposal,
  EDIT_ACTIONS
} from './proposals/canEditProposal.js'

export { canCancelProposal } from './proposals/canCancelProposal.js'
export { canAcceptProposal } from './proposals/canAcceptProposal.js'

// ─────────────────────────────────────────────────────────────
// Proposal Rules - Extended
// ─────────────────────────────────────────────────────────────
export {
  // Permission predicates
  canModifyProposal,
  canAcceptCounteroffer,
  canDeclineCounteroffer,
  canSubmitRentalApplication,
  canReviewDocuments,
  canRequestVirtualMeeting,
  canSendMessage,
  // State predicates
  hasReviewableCounteroffer,
  isProposalActive,
  isProposalCancelled,
  isProposalRejected,
  isLeaseActivated,
  requiresSpecialCancellationConfirmation,
  // UI helpers
  getCancelButtonText,
  getCancellationReasonOptions,
  // Constants
  USUAL_ORDER_THRESHOLD,
  DEFAULT_CANCEL_TEXT,
  COUNTEROFFER_CANCEL_TEXT,
  FALLBACK_CANCELLATION_REASONS
} from './proposals/proposalRules.js'

// ─────────────────────────────────────────────────────────────
// Virtual Meeting Rules
// ─────────────────────────────────────────────────────────────
export {
  // Constants
  VM_STATES,
  BUTTON_TEXT,
  BUTTON_STYLES,
  // State determination
  getVirtualMeetingState,
  // Permission predicates
  canRequestNewMeeting,
  canRespondToMeeting,
  canJoinMeeting,
  canViewMeetingDetails,
  canCancelVMRequest,
  // UI helpers
  isVMButtonDisabled,
  getVMButtonText,
  getVMButtonStyle,
  getVMStateInfo
} from './proposals/virtualMeetingRules.js'

// ─────────────────────────────────────────────────────────────
// Proposal Button States Hook
// ─────────────────────────────────────────────────────────────
export {
  useProposalButtonStates,
  computeButtonStates,
  // Constants
  REMINDER_LIMIT,
  USUAL_ORDER_THRESHOLD as BUTTON_USUAL_ORDER_THRESHOLD,
  BUTTON_LABELS,
  BUTTON_COLORS,
  DEFAULT_BUTTON_STATE,
  VM_HIDDEN_STATUSES,
  CANCEL_HIDDEN_STATUSES,
  TERMINAL_STATUSES
} from './proposals/useProposalButtonStates.js'

// ─────────────────────────────────────────────────────────────
// User Rules
// ─────────────────────────────────────────────────────────────
export {
  isHost,
  HOST_IDENTIFIER,
  INTERNAL_USER_TYPE as HOST_INTERNAL_USER_TYPE
} from './users/isHost.js'

export {
  isGuest,
  GUEST_IDENTIFIER,
  INTERNAL_USER_TYPE as GUEST_INTERNAL_USER_TYPE
} from './users/isGuest.js'

export { hasProfilePhoto } from './users/hasProfilePhoto.js'
export { shouldShowFullName } from './users/shouldShowFullName.js'
