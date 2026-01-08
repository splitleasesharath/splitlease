/**
 * Proposal Progress Stage Configuration System
 *
 * This module defines the 6 stages of the proposal-to-lease workflow,
 * replacing hardcoded stage arrays with rich configuration objects.
 *
 * Each stage includes:
 * - id: Stage number (1-6)
 * - name: Full stage name
 * - shortName: Abbreviated name for compact displays
 * - icon: Emoji or icon identifier
 * - description: User-friendly explanation of the stage
 * - helpText: Additional guidance for guests
 *
 * @module lib/constants/proposalStages
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STAGE_IDS = Object.freeze({
  PROPOSAL_SUBMITTED: 1,
  RENTAL_APP_SUBMITTED: 2,
  HOST_REVIEW: 3,
  REVIEW_DOCUMENTS: 4,
  LEASE_DOCUMENTS: 5,
  INITIAL_PAYMENT: 6
})

const STAGE_STATUSES = Object.freeze({
  PENDING: 'pending',
  CURRENT: 'current',
  COMPLETED: 'completed'
})

const STATUS_LABELS = Object.freeze({
  [STAGE_STATUSES.PENDING]: 'Pending',
  [STAGE_STATUSES.CURRENT]: 'In Progress',
  [STAGE_STATUSES.COMPLETED]: 'Completed'
})

// ─────────────────────────────────────────────────────────────
// Stage Definitions
// ─────────────────────────────────────────────────────────────

export const PROPOSAL_STAGES = Object.freeze([
  Object.freeze({
    id: STAGE_IDS.PROPOSAL_SUBMITTED,
    name: 'Proposal Submitted',
    shortName: 'Submitted',
    icon: '1',
    description: 'Your proposal has been submitted to the host',
    helpText: 'The next step is to complete your rental application so the host can review your profile.'
  }),
  Object.freeze({
    id: STAGE_IDS.RENTAL_APP_SUBMITTED,
    name: 'Rental App Submitted',
    shortName: 'Application',
    icon: '2',
    description: 'Your rental application is complete',
    helpText: 'The host is reviewing your application and will respond soon.'
  }),
  Object.freeze({
    id: STAGE_IDS.HOST_REVIEW,
    name: 'Host Review',
    shortName: 'Review',
    icon: '3',
    description: 'Host is reviewing your proposal',
    helpText: 'The host may accept your proposal, request changes, or propose a counteroffer.'
  }),
  Object.freeze({
    id: STAGE_IDS.REVIEW_DOCUMENTS,
    name: 'Review Documents',
    shortName: 'Documents',
    icon: '4',
    description: 'Review proposal documents and terms',
    helpText: 'Carefully review all documents before proceeding to the lease agreement.'
  }),
  Object.freeze({
    id: STAGE_IDS.LEASE_DOCUMENTS,
    name: 'Lease Documents',
    shortName: 'Lease',
    icon: '5',
    description: 'Review and sign lease documents',
    helpText: 'Read the lease agreement thoroughly and sign when ready.'
  }),
  Object.freeze({
    id: STAGE_IDS.INITIAL_PAYMENT,
    name: 'Initial Payment',
    shortName: 'Payment',
    icon: '6',
    description: 'Submit initial payment to activate lease',
    helpText: 'Submit your first payment to activate the lease and finalize your reservation.'
  })
])

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if stage ID is valid (1-6)
 * @pure
 */
const isValidStageId = (stageId) =>
  typeof stageId === 'number' && stageId >= 1 && stageId <= 6

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

// ─────────────────────────────────────────────────────────────
// Pure Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Normalize string for comparison
 * @pure
 */
const normalizeString = (value) =>
  (value || '').toLowerCase()

/**
 * Find stage by predicate
 * @pure
 */
const findStage = (predicate) =>
  PROPOSAL_STAGES.find(predicate) || null

/**
 * Determine stage status
 * @pure
 */
const determineStatus = (stageId, currentStage) => {
  if (stageId < currentStage) return STAGE_STATUSES.COMPLETED
  if (stageId === currentStage) return STAGE_STATUSES.CURRENT
  return STAGE_STATUSES.PENDING
}

/**
 * Build formatted stage display object
 * @pure
 */
const buildFormattedStage = (stage, status) =>
  Object.freeze({
    ...stage,
    status,
    statusLabel: STATUS_LABELS[status],
    isCompleted: status === STAGE_STATUSES.COMPLETED,
    isCurrent: status === STAGE_STATUSES.CURRENT,
    isPending: status === STAGE_STATUSES.PENDING
  })

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Get stage configuration by ID
 * @pure
 * @param {number} stageId - Stage ID (1-6)
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageById(stageId) {
  if (!isValidStageId(stageId)) {
    return null
  }
  return findStage(s => s.id === stageId)
}

/**
 * Get stage configuration by name (case-insensitive)
 * @pure
 * @param {string} stageName - Stage name
 * @returns {Object|null} Stage configuration object or null if not found
 */
export function getStageByName(stageName) {
  if (!isNonEmptyString(stageName)) {
    return null
  }

  const normalizedName = normalizeString(stageName)
  return findStage(s =>
    normalizeString(s.name) === normalizedName ||
    normalizeString(s.shortName) === normalizedName
  )
}

/**
 * Check if a stage is completed
 * @pure
 * @param {number} stageId - Stage ID to check
 * @param {number} currentStage - Current stage ID
 * @returns {boolean} True if stage is completed
 */
export function isStageCompleted(stageId, currentStage) {
  if (!isValidStageId(stageId) || !isValidStageId(currentStage)) {
    return false
  }
  return stageId < currentStage
}

/**
 * Check if a stage is the current active stage
 * @pure
 * @param {number} stageId - Stage ID to check
 * @param {number} currentStage - Current stage ID
 * @returns {boolean} True if stage is current
 */
export function isCurrentStage(stageId, currentStage) {
  if (!isValidStageId(stageId) || !isValidStageId(currentStage)) {
    return false
  }
  return stageId === currentStage
}

/**
 * Format stage for display with status indicator
 * @pure
 * @param {number} stageId - Stage ID
 * @param {number} currentStage - Current stage ID
 * @returns {Object|null} Formatted stage object with status
 */
export function formatStageDisplay(stageId, currentStage) {
  const stage = getStageById(stageId)
  if (!stage) {
    return null
  }

  const status = determineStatus(stageId, currentStage)
  return buildFormattedStage(stage, status)
}

/**
 * Get all stages formatted for display
 * @pure
 * @param {number} currentStage - Current stage ID
 * @returns {Array<Object>} Array of formatted stage objects
 */
export function getAllStagesFormatted(currentStage) {
  return PROPOSAL_STAGES.map(stage => formatStageDisplay(stage.id, currentStage))
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  STAGE_IDS,
  STAGE_STATUSES,
  STATUS_LABELS
}
