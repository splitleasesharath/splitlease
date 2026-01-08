/**
 * Proposal Status Configuration System
 *
 * This module provides a centralized configuration for all proposal statuses,
 * replacing hardcoded status mappings throughout the application.
 *
 * Each status includes:
 * - key: The exact status string from the database
 * - color: UI color theme for the status
 * - label: User-friendly display text
 * - stage: The progress stage number (1-6) or null if not in active flow
 * - actions: Available actions for this status
 *
 * @module lib/constants/proposalStatuses
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STATUS_COLORS = Object.freeze({
  RED: 'red',
  BLUE: 'blue',
  PURPLE: 'purple',
  YELLOW: 'yellow',
  GREEN: 'green',
  GRAY: 'gray'
})

const DEFAULT_STATUS = Object.freeze({
  key: 'Unknown',
  color: STATUS_COLORS.GRAY,
  label: 'Unknown Status',
  stage: null,
  actions: Object.freeze([])
})

// ─────────────────────────────────────────────────────────────
// Status Definitions
// ─────────────────────────────────────────────────────────────

export const PROPOSAL_STATUSES = Object.freeze({
  // ===== CANCELLED STATES =====
  CANCELLED_BY_GUEST: Object.freeze({
    key: 'Proposal Cancelled by Guest',
    color: STATUS_COLORS.RED,
    label: 'Cancelled by You',
    stage: null,
    actions: Object.freeze(['view_listing', 'explore_rentals'])
  }),

  CANCELLED_BY_SPLITLEASE: Object.freeze({
    key: 'Proposal Cancelled by Split Lease',
    color: STATUS_COLORS.RED,
    label: 'Proposal Cancelled',
    stage: null,
    actions: Object.freeze(['view_listing', 'explore_rentals'])
  }),

  // ===== REJECTED STATES =====
  REJECTED_BY_HOST: Object.freeze({
    key: 'Proposal Rejected by Host',
    color: STATUS_COLORS.RED,
    label: 'Rejected by Host',
    stage: null,
    actions: Object.freeze(['view_listing', 'explore_rentals'])
  }),

  // ===== ACTIVE PROPOSAL FLOW =====

  // Stage 1: Proposal Submitted, Awaiting Rental Application
  PROPOSAL_SUBMITTED_AWAITING_RENTAL_APP: Object.freeze({
    key: 'Proposal Submitted by guest - Awaiting Rental Application',
    color: STATUS_COLORS.BLUE,
    label: 'Submit Rental Application',
    stage: 1,
    actions: Object.freeze(['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message', 'modify_proposal'])
  }),

  SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP: Object.freeze({
    key: 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application',
    color: STATUS_COLORS.PURPLE,
    label: 'Suggested Proposal - Submit Rental App',
    stage: 1,
    actions: Object.freeze(['submit_rental_app', 'cancel_proposal', 'request_vm', 'send_message'])
  }),

  SUGGESTED_PROPOSAL_PENDING_CONFIRMATION: Object.freeze({
    key: 'Proposal Submitted for guest by Split Lease - Pending Confirmation',
    color: STATUS_COLORS.PURPLE,
    label: 'Suggested Proposal - Pending Confirmation',
    stage: 1,
    actions: Object.freeze(['confirm_proposal', 'cancel_proposal', 'request_vm', 'send_message'])
  }),

  PENDING_CONFIRMATION: Object.freeze({
    key: 'Pending Confirmation',
    color: STATUS_COLORS.BLUE,
    label: 'Awaiting Confirmation',
    stage: 1,
    actions: Object.freeze(['cancel_proposal', 'request_vm', 'send_message'])
  }),

  // Stage 2: Rental Application Submitted
  RENTAL_APP_SUBMITTED: Object.freeze({
    key: 'Rental Application Submitted',
    color: STATUS_COLORS.BLUE,
    label: 'Application Under Review',
    stage: 2,
    actions: Object.freeze(['request_vm', 'cancel_proposal', 'send_message'])
  }),

  // Stage 3: Host Review / Counteroffer
  HOST_REVIEW: Object.freeze({
    key: 'Host Review',
    color: STATUS_COLORS.BLUE,
    label: 'Under Host Review',
    stage: 3,
    actions: Object.freeze(['request_vm', 'cancel_proposal', 'send_message'])
  }),

  COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW: Object.freeze({
    key: 'Host Counteroffer Submitted / Awaiting Guest Review',
    color: STATUS_COLORS.YELLOW,
    label: 'Review Host Counteroffer',
    stage: 3,
    actions: Object.freeze(['review_counteroffer', 'compare_terms', 'accept_counteroffer', 'decline_counteroffer', 'request_vm', 'send_message'])
  }),

  PROPOSAL_OR_COUNTEROFFER_ACCEPTED: Object.freeze({
    key: 'Proposal or Counteroffer Accepted / Drafting Lease Documents',
    color: STATUS_COLORS.GREEN,
    label: 'Accepted - Drafting Lease',
    stage: 4,
    actions: Object.freeze(['request_vm', 'send_message'])
  }),

  // Stage 4: Review Documents
  REVIEWING_DOCUMENTS: Object.freeze({
    key: 'Reviewing Documents',
    color: STATUS_COLORS.BLUE,
    label: 'Reviewing Documents',
    stage: 4,
    actions: Object.freeze(['review_documents', 'request_vm', 'send_message'])
  }),

  // Stage 5: Lease Documents
  LEASE_DOCUMENTS_SENT_FOR_REVIEW: Object.freeze({
    key: 'Lease Documents Sent for Review',
    color: STATUS_COLORS.BLUE,
    label: 'Review Lease Documents',
    stage: 5,
    actions: Object.freeze(['review_documents', 'request_vm', 'send_message'])
  }),

  LEASE_SIGNED_AWAITING_INITIAL_PAYMENT: Object.freeze({
    key: 'Lease Signed / Awaiting Initial Payment',
    color: STATUS_COLORS.GREEN,
    label: 'Submit Initial Payment',
    stage: 5,
    actions: Object.freeze(['submit_payment', 'request_vm', 'send_message'])
  }),

  // Stage 6: Initial Payment / Lease Activated
  INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED: Object.freeze({
    key: 'Initial Payment Submitted / Lease activated ',
    color: STATUS_COLORS.GREEN,
    label: 'Lease Activated',
    stage: 6,
    actions: Object.freeze(['view_lease', 'view_house_manual', 'send_message'])
  }),

  // ===== SPECIAL STATES =====

  DRAFT: Object.freeze({
    key: 'Draft',
    color: STATUS_COLORS.GRAY,
    label: 'Draft',
    stage: null,
    actions: Object.freeze(['edit_proposal', 'submit_proposal', 'delete_proposal'])
  }),

  EXPIRED: Object.freeze({
    key: 'Expired',
    color: STATUS_COLORS.GRAY,
    label: 'Expired',
    stage: null,
    actions: Object.freeze(['view_listing', 'explore_rentals'])
  })
})

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Normalize status key by trimming whitespace
 * @pure
 */
const normalizeStatusKey = (statusKey) =>
  typeof statusKey === 'string' ? statusKey.trim() : statusKey

/**
 * Find status config by key
 * @pure
 */
const findStatusByKey = (normalizedKey) =>
  Object.values(PROPOSAL_STATUSES).find(
    s => normalizeStatusKey(s.key) === normalizedKey
  )

/**
 * Build fallback status config
 * @pure
 */
const buildFallbackStatus = (key) =>
  Object.freeze({
    key,
    color: STATUS_COLORS.GRAY,
    label: key,
    stage: null,
    actions: Object.freeze([])
  })

/**
 * Check if status key contains cancelled or rejected
 * @pure
 */
const isTerminalKey = (normalizedKey) =>
  normalizedKey.includes('Cancelled') || normalizedKey.includes('Rejected')

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Get status configuration by status key
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {Object} Status configuration object with color, label, stage, actions
 */
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return DEFAULT_STATUS
  }

  const normalizedKey = normalizeStatusKey(statusKey)
  const config = findStatusByKey(normalizedKey)

  return config || buildFallbackStatus(normalizedKey)
}

/**
 * Get the progress stage number from a status key
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {number|null} Stage number (1-6) or null if not in active flow
 */
export function getStageFromStatus(statusKey) {
  const config = getStatusConfig(statusKey)
  return config.stage
}

/**
 * Get available actions for a status
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {Array<string>} Array of action identifiers
 */
export function getActionsForStatus(statusKey) {
  const config = getStatusConfig(statusKey)
  return config.actions || []
}

/**
 * Check if a status is in an active proposal flow
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if status has a stage number (active flow)
 */
export function isActiveStatus(statusKey) {
  const config = getStatusConfig(statusKey)
  return config.stage !== null
}

/**
 * Check if a status is cancelled or rejected
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if status is cancelled or rejected
 */
export function isTerminalStatus(statusKey) {
  const normalizedKey = normalizeStatusKey(statusKey) || ''
  const config = getStatusConfig(normalizedKey)
  return config.color === STATUS_COLORS.RED || isTerminalKey(normalizedKey)
}

/**
 * Check if a status is completed (lease activated)
 * @pure
 * @param {string} statusKey - The status string from the database
 * @returns {boolean} True if lease is activated
 */
export function isCompletedStatus(statusKey) {
  const activatedKey = normalizeStatusKey(PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key)
  return normalizeStatusKey(statusKey) === activatedKey
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  STATUS_COLORS,
  DEFAULT_STATUS
}
