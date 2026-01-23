/**
 * Proposal Management Constants
 *
 * Status options and configuration for the admin proposal management tool.
 * Merged from external tool types/proposal.js and existing proposalStatusConfig.js
 */

/**
 * All possible proposal statuses in the system
 * Used for status dropdown and filtering
 */
export const PROPOSAL_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted by guest - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  'Host Review',
  'Host Counteroffer Submitted / Awaiting Guest Review',
  'Guest Counteroffer Submitted / Awaiting Host Review',
  'Proposal or Counteroffer Accepted / Drafting Lease Documents',
  'Lease Documents Sent for Review',
  'Lease Documents Sent for Signatures',
  'Lease Documents Signed / Awaiting Initial payment',
  'Initial Payment Submitted / Lease activated',
  'Proposal Cancelled by Guest',
  'Proposal Rejected by Host',
  'Proposal Cancelled by Split Lease',
  'Guest Ignored Suggestion'
];

/**
 * Days of the week abbreviations
 * Uses 0-indexed format matching JavaScript Date.getDay()
 */
export const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Full day names
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Default proposal status for admin-created proposals
 */
export const DEFAULT_ADMIN_PROPOSAL_STATUS = 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application';

/**
 * Statuses that indicate a proposal is active/in-progress
 */
export const ACTIVE_STATUSES = [
  'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
  'Proposal Submitted by guest - Awaiting Rental Application',
  'Proposal Submitted for guest by Split Lease - Pending Confirmation',
  'Host Review',
  'Host Counteroffer Submitted / Awaiting Guest Review',
  'Guest Counteroffer Submitted / Awaiting Host Review',
  'Proposal or Counteroffer Accepted / Drafting Lease Documents',
  'Lease Documents Sent for Review',
  'Lease Documents Sent for Signatures',
  'Lease Documents Signed / Awaiting Initial payment'
];

/**
 * Statuses that indicate a proposal is closed/completed
 */
export const CLOSED_STATUSES = [
  'Initial Payment Submitted / Lease activated',
  'Proposal Cancelled by Guest',
  'Proposal Rejected by Host',
  'Proposal Cancelled by Split Lease',
  'Guest Ignored Suggestion'
];
