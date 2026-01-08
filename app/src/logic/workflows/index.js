/**
 * Logic Core - Workflows Index
 * Orchestration functions that compose calculators, rules, and processors.
 * Multi-step business processes and validation workflows.
 */

// ─────────────────────────────────────────────────────────────
// Scheduling Workflows
// ─────────────────────────────────────────────────────────────
export {
  validateScheduleWorkflow,
  // Constants for testing
  DAY_NAMES as SCHEDULE_DAY_NAMES,
  ERROR_CODES as SCHEDULE_ERROR_CODES,
  ERROR_MESSAGES as SCHEDULE_ERROR_MESSAGES
} from './scheduling/validateScheduleWorkflow.js'

export {
  validateMoveInDateWorkflow,
  // Constants for testing
  ERROR_CODES as MOVE_IN_ERROR_CODES,
  ERROR_MESSAGES as MOVE_IN_ERROR_MESSAGES,
  DATE_CONSTANTS
} from './scheduling/validateMoveInDateWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Auth Workflows
// ─────────────────────────────────────────────────────────────
export {
  checkAuthStatusWorkflow,
  // Constants for testing
  STORAGE_KEYS,
  USER_TYPES,
  ERROR_MESSAGES as AUTH_ERROR_MESSAGES
} from './auth/checkAuthStatusWorkflow.js'

export {
  validateTokenWorkflow,
  // Constants for testing
  VALIDATION_ERRORS,
  TOKEN_SOURCES
} from './auth/validateTokenWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Booking Workflows
// ─────────────────────────────────────────────────────────────
export {
  loadProposalDetailsWorkflow,
  // Constants for testing
  ERROR_MESSAGES as LOAD_PROPOSAL_ERROR_MESSAGES,
  DB_FIELD_NAMES as LOAD_PROPOSAL_DB_FIELDS,
  TABLE_NAMES as LOAD_PROPOSAL_TABLES,
  SCHEMA_NAMES,
  USER_SELECT_FIELDS
} from './booking/loadProposalDetailsWorkflow.js'

export {
  cancelProposalWorkflow,
  // Constants for testing
  ERROR_MESSAGES as CANCEL_BOOKING_ERROR_MESSAGES,
  RESULT_MESSAGES as CANCEL_BOOKING_RESULT_MESSAGES,
  SOURCE_TYPES,
  USUAL_ORDER_THRESHOLD
} from './booking/cancelProposalWorkflow.js'

export {
  acceptProposalWorkflow,
  // Constants for testing
  ERROR_MESSAGES as ACCEPT_PROPOSAL_ERROR_MESSAGES,
  RESULT_MESSAGES as ACCEPT_PROPOSAL_RESULT_MESSAGES,
  DB_FIELD_NAMES as ACCEPT_PROPOSAL_DB_FIELDS
} from './booking/acceptProposalWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Proposal Workflows - Extended (from new implementation)
// ─────────────────────────────────────────────────────────────
export {
  determineCancellationCondition,
  executeCancelProposal,
  cancelProposalFromCompareTerms,
  // Constants for testing
  CANCELLATION_CONDITIONS,
  BUBBLE_WORKFLOWS,
  RESULT_MESSAGES as CANCEL_PROPOSAL_RESULT_MESSAGES,
  DB_FIELD_NAMES as CANCEL_PROPOSAL_DB_FIELDS,
  CANCELLATION_REASONS
} from './proposals/cancelProposalWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Virtual Meeting Workflows
// ─────────────────────────────────────────────────────────────
export {
  requestVirtualMeeting,
  requestAlternativeMeeting,
  respondToVirtualMeeting,
  declineVirtualMeeting,
  cancelVirtualMeetingRequest,
  fetchVirtualMeetingByProposalId,
  // Constants for testing
  ERROR_MESSAGES as VM_ERROR_MESSAGES,
  DB_FIELD_NAMES as VM_DB_FIELDS,
  TABLE_NAMES as VM_TABLES,
  VM_PREFIX,
  LOG_PREFIX as VM_LOG_PREFIX
} from './proposals/virtualMeetingWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Counteroffer Workflows
// ─────────────────────────────────────────────────────────────
export {
  acceptCounteroffer,
  declineCounteroffer,
  getTermsComparison,
  // Constants for testing
  ERROR_MESSAGES as COUNTEROFFER_ERROR_MESSAGES,
  DECLINE_REASONS,
  DB_FIELD_NAMES as COUNTEROFFER_DB_FIELDS,
  ORIGINAL_TERM_FIELDS,
  HC_TERM_FIELDS,
  CHANGE_LABELS
} from './proposals/counterofferWorkflow.js'

// ─────────────────────────────────────────────────────────────
// Navigation Workflows
// ─────────────────────────────────────────────────────────────
export {
  navigateToListing,
  navigateToMessaging,
  navigateToRentalApplication,
  navigateToDocumentReview,
  navigateToLeaseDocuments,
  navigateToHouseManual,
  navigateToSearch,
  openExternalLink,
  updateUrlWithProposal,
  getProposalIdFromUrl,
  // Constants for testing
  ROUTES,
  QUERY_PARAMS,
  LOG_PREFIX as NAV_LOG_PREFIX
} from './proposals/navigationWorkflow.js'
