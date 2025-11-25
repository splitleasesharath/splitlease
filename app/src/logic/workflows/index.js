/**
 * Logic Core - Workflows Index
 * Orchestration functions that compose calculators, rules, and processors.
 * Multi-step business processes and validation workflows.
 */

// Scheduling Workflows
export { validateScheduleWorkflow } from './scheduling/validateScheduleWorkflow.js'
export { validateMoveInDateWorkflow } from './scheduling/validateMoveInDateWorkflow.js'

// Auth Workflows
export { checkAuthStatusWorkflow } from './auth/checkAuthStatusWorkflow.js'
export { validateTokenWorkflow } from './auth/validateTokenWorkflow.js'

// Booking Workflows
export { loadProposalDetailsWorkflow } from './booking/loadProposalDetailsWorkflow.js'
export { cancelProposalWorkflow } from './booking/cancelProposalWorkflow.js'
export { acceptProposalWorkflow } from './booking/acceptProposalWorkflow.js'

// Proposal Workflows - Extended (from new implementation)
export {
  determineCancellationCondition,
  executeCancelProposal,
  cancelProposalFromCompareTerms
} from './proposals/cancelProposalWorkflow.js'

// Virtual Meeting Workflows
export {
  requestVirtualMeeting,
  requestAlternativeMeeting,
  respondToVirtualMeeting,
  declineVirtualMeeting,
  cancelVirtualMeetingRequest,
  fetchVirtualMeetingByProposalId
} from './proposals/virtualMeetingWorkflow.js'

// Counteroffer Workflows
export {
  acceptCounteroffer,
  declineCounteroffer,
  getTermsComparison
} from './proposals/counterofferWorkflow.js'

// Navigation Workflows
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
  getProposalIdFromUrl
} from './proposals/navigationWorkflow.js'
