/**
 * Status Button Configuration System
 *
 * Fetches and caches os_proposal_status table data for dynamic button labels.
 * This replaces hardcoded button labels with database-driven configuration.
 *
 * Table: os_proposal_status
 * Columns used:
 * - name: Status key (snake_case)
 * - display: Full status text that matches proposal.Status field
 * - guest_action_1: Button label for Guest Action 1
 * - guest_action_2: Button label for Guest Action 2
 * - sort_order: Workflow progression order (used for visibility logic)
 *
 * @module lib/proposals/statusButtonConfig
 */

import { supabase } from '../supabase.js'
import { PROPOSAL_STATUSES } from '../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[statusButtonConfig]'

const TERMINAL_SORT_ORDER = -1
const DEFAULT_SORT_ORDER = -99
const HOUSE_MANUAL_THRESHOLD = 5
const MAX_GUEST_REMINDERS = 3

const INVISIBLE_LABEL = 'Invisible'

const BUTTON_STYLES = Object.freeze({
  DELETE_RED: Object.freeze({ backgroundColor: '#EF4444', color: 'white' }),
  HOUSE_MANUAL_PURPLE: Object.freeze({ backgroundColor: '#6D31C2', color: 'white' })
})

const ACTION_LABEL_MAP = Object.freeze({
  'Interested': 'confirm_interest',
  'Submit Rental App': 'submit_rental_app',
  'Modify Proposal': 'modify_proposal',
  'Accept Host Terms': 'accept_counteroffer',
  'Remind Split Lease': 'remind_sl',
  'Review Documents': 'review_documents',
  'Resend Lease Docs': 'resend_lease_docs',
  'Submit Initial Payment': 'submit_payment',
  'Go to Leases': 'go_to_leases',
  'Delete Proposal': 'delete_proposal'
})

const ACTION2_LABEL_MAP = Object.freeze({
  'Not Interested': 'reject_suggestion',
  'Review Host Terms': 'review_counteroffer',
  'See Details': 'see_details',
  'Verify Your Identity': 'verify_identity'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is nullish
 * @pure
 */
const isNullish = (value) => value === null || value === undefined

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if label is visible (not null, undefined, or 'Invisible')
 * @pure
 */
const isVisibleLabel = (label) =>
  isNonEmptyString(label) && label !== INVISIBLE_LABEL

/**
 * Check if sort order indicates terminal state
 * @pure
 */
const isTerminalSortOrder = (sortOrder) =>
  sortOrder === TERMINAL_SORT_ORDER

/**
 * Check if sort order is beyond house manual threshold
 * @pure
 */
const isBeyondHouseManualThreshold = (sortOrder) =>
  sortOrder > HOUSE_MANUAL_THRESHOLD

/**
 * Check if guest has exceeded reminder limit
 * @pure
 */
const hasExceededReminderLimit = (reminderCount) =>
  reminderCount >= MAX_GUEST_REMINDERS

// ─────────────────────────────────────────────────────────────
// Pure String Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalize status string (trim whitespace)
 * @pure
 */
const normalizeStatus = (status) =>
  typeof status === 'string' ? status.trim() : status

/**
 * Check if status contains suggested proposal text
 * @pure
 */
const containsSuggestedText = (status) =>
  isNonEmptyString(status) && status.includes('Submitted for guest by Split Lease')

// ─────────────────────────────────────────────────────────────
// Logging Helpers (Effectful)
// ─────────────────────────────────────────────────────────────

/**
 * @effectful
 */
const logInfo = (message, data) => {
  if (data !== undefined) {
    console.log(`${LOG_PREFIX} ${message}:`, data)
  } else {
    console.log(`${LOG_PREFIX} ${message}`)
  }
}

/**
 * @effectful
 */
const logError = (message, error) => {
  console.error(`${LOG_PREFIX} ${message}:`, error)
}

/**
 * @effectful
 */
const logWarning = (message) => {
  console.warn(`${LOG_PREFIX} ${message}`)
}

// ─────────────────────────────────────────────────────────────
// Cache State (Module-level mutable state)
// ─────────────────────────────────────────────────────────────

let statusConfigCache = null
let statusConfigByDisplayCache = null
let fetchPromise = null

// ─────────────────────────────────────────────────────────────
// Pure Builder Functions
// ─────────────────────────────────────────────────────────────

/**
 * Build display lookup map from config array
 * @pure
 */
const buildDisplayLookupMap = (configs) =>
  new Map(
    (configs || []).map(config => [normalizeStatus(config.display), config])
  )

/**
 * Build default button config
 * @pure
 */
const buildDefaultButtonConfig = () => Object.freeze({
  guestAction1: Object.freeze({ visible: false, label: null, action: null }),
  guestAction2: Object.freeze({ visible: false, label: null, action: null }),
  cancelButton: Object.freeze({ visible: false, label: 'Cancel Proposal', action: null }),
  vmButton: Object.freeze({ visible: false, label: 'Request Virtual Meeting', action: null })
})

/**
 * Get action from label using map lookup
 * @pure
 */
const getActionFromLabel = (label, actionMap) =>
  actionMap[label] || null

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all status configurations from os_proposal_status table
 * Caches the result in memory for subsequent lookups
 * @effectful
 * @returns {Promise<Array>} Array of status configuration objects
 */
export async function fetchStatusConfigurations() {
  if (statusConfigCache) {
    return statusConfigCache
  }

  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .schema('reference_table')
        .from('os_proposal_status')
        .select(`
          id,
          name,
          display,
          displayed_on_screen,
          guest_action_1,
          guest_action_2,
          host_action_1,
          host_action_2,
          sort_order
        `)
        .order('sort_order', { ascending: true })

      if (error) {
        logError('Error fetching status config', error)
        throw error
      }

      statusConfigCache = data || []
      statusConfigByDisplayCache = buildDisplayLookupMap(data)

      logInfo(`Cached ${statusConfigCache.length} status configurations`)
      return statusConfigCache
    } catch (err) {
      logError('Failed to fetch status configurations', err)
      return []
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

/**
 * Get status configuration by the display value (matches proposal.Status)
 * @pure (after cache initialization)
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {Object|null} Status configuration or null if not found
 */
export function getStatusConfigByDisplay(statusDisplay) {
  if (!statusConfigByDisplayCache) {
    logWarning('Cache not initialized. Call fetchStatusConfigurations first.')
    return null
  }

  if (isNullish(statusDisplay)) {
    return null
  }

  return statusConfigByDisplayCache.get(normalizeStatus(statusDisplay)) || null
}

/**
 * Get Guest Action 1 button label for a status
 * @pure (after cache initialization)
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {string|null} Button label or null if invisible/not found
 */
export function getGuestAction1Label(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay)
  if (!config) return null

  const label = config.guest_action_1
  return isVisibleLabel(label) ? label : null
}

/**
 * Get Guest Action 2 button label for a status
 * @pure (after cache initialization)
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {string|null} Button label or null if invisible/not found
 */
export function getGuestAction2Label(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay)
  if (!config) return null

  const label = config.guest_action_2
  return isVisibleLabel(label) ? label : null
}

/**
 * Get sort order (usual order) for a status
 * Used for visibility logic (e.g., show house manual when order > 5)
 * @pure (after cache initialization)
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {number} Sort order, or -99 if not found
 */
export function getStatusSortOrder(statusDisplay) {
  const config = getStatusConfigByDisplay(statusDisplay)
  if (!config) return DEFAULT_SORT_ORDER

  return config.sort_order ?? DEFAULT_SORT_ORDER
}

/**
 * Check if a status is a terminal/cancelled state
 * Terminal states have sort_order = -1
 * @pure (after cache initialization)
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if terminal state
 */
export function isTerminalStatusFromConfig(statusDisplay) {
  const sortOrder = getStatusSortOrder(statusDisplay)
  return isTerminalSortOrder(sortOrder)
}

/**
 * Check if a status is a suggested proposal (created by Split Lease)
 * @pure
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if suggested by Split Lease
 */
export function isSuggestedProposalFromConfig(statusDisplay) {
  if (isNullish(statusDisplay)) return false
  return containsSuggestedText(normalizeStatus(statusDisplay))
}

/**
 * Check if Virtual Meeting button should be hidden for a status
 * Hidden for: rejected, cancelled, activated, and SL-suggested awaiting statuses
 * @pure
 * @param {string} statusDisplay - The status display text from proposal.Status
 * @returns {boolean} True if VM button should be hidden
 */
export function shouldHideVirtualMeetingButton(statusDisplay) {
  if (isNullish(statusDisplay)) return true

  const normalized = normalizeStatus(statusDisplay)

  const hiddenStatuses = [
    PROPOSAL_STATUSES.REJECTED_BY_HOST.key,
    PROPOSAL_STATUSES.CANCELLED_BY_SPLITLEASE.key,
    normalizeStatus(PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key),
    normalizeStatus(PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key),
    normalizeStatus(PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_PENDING_CONFIRMATION.key)
  ]

  return hiddenStatuses.includes(normalized)
}

/**
 * Get all button configuration for a proposal
 * Combines status config with proposal-specific overrides
 * @pure (after cache initialization)
 * @param {Object} proposal - The proposal object
 * @returns {Object} Button configuration object
 */
export function getButtonConfigForProposal(proposal) {
  if (isNullish(proposal)) {
    return buildDefaultButtonConfig()
  }

  const status = normalizeStatus(proposal.Status)
  const config = getStatusConfigByDisplay(status)
  const sortOrder = config?.sort_order ?? DEFAULT_SORT_ORDER

  // Extract proposal-specific data
  const remindersByGuest = proposal['remindersByGuest (number)'] || 0
  const guestDocsFinalized = proposal['guest documents review finalized?'] === true
  const idDocsSubmitted = proposal.guest?.['ID documents submitted?'] === true
  const hasHouseManual = proposal.listing?.hasHouseManual === true
  const isCounteroffer = status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key
  const isTerminal = isTerminalSortOrder(sortOrder)
  const isRejectedByHost = status === PROPOSAL_STATUSES.REJECTED_BY_HOST.key
  const isSLSuggested = isSuggestedProposalFromConfig(status)
  const isLeaseDocsReview = status === PROPOSAL_STATUSES.LEASE_DOCUMENTS_SENT_FOR_REVIEW.key

  // === Guest Action 1 Button ===
  const guestAction1 = { visible: false, label: null, action: null, style: null }
  const action1Label = getGuestAction1Label(status)

  if (action1Label) {
    guestAction1.visible = true
    guestAction1.label = action1Label

    // Special handling: Hide "Remind Split Lease" after max reminders
    if (action1Label === 'Remind Split Lease' && hasExceededReminderLimit(remindersByGuest)) {
      guestAction1.visible = false
    }

    // Special handling: Hide "Review Documents" when docs finalized
    if (action1Label === 'Review Documents' && guestDocsFinalized && isLeaseDocsReview) {
      guestAction1.visible = false
    }

    // Special handling: "Delete Proposal" has red background for rejected
    if (action1Label === 'Delete Proposal' && isRejectedByHost) {
      guestAction1.style = BUTTON_STYLES.DELETE_RED
    }

    guestAction1.action = getActionFromLabel(action1Label, ACTION_LABEL_MAP)
  }

  // === Guest Action 2 Button ===
  const guestAction2 = { visible: false, label: null, action: null, style: null }
  const action2Label = getGuestAction2Label(status)

  if (action2Label) {
    guestAction2.visible = true
    guestAction2.label = action2Label

    // Special handling: Hide "Verify Your Identity" when ID docs already submitted
    if (action2Label === 'Verify Your Identity' && idDocsSubmitted && isLeaseDocsReview) {
      guestAction2.visible = false
    }

    guestAction2.action = getActionFromLabel(action2Label, ACTION2_LABEL_MAP)
  }

  // === Cancel/Delete Button ===
  const cancelButton = { visible: false, label: 'Cancel Proposal', action: 'cancel_proposal', style: null, disabled: false }
  const isLeaseActivated = status === normalizeStatus(PROPOSAL_STATUSES.INITIAL_PAYMENT_SUBMITTED_LEASE_ACTIVATED.key)

  if (isTerminal) {
    cancelButton.visible = true
    cancelButton.label = 'Delete Proposal'
    cancelButton.action = 'delete_proposal'
  } else if (isLeaseActivated) {
    cancelButton.visible = false
  } else if (isBeyondHouseManualThreshold(sortOrder) && hasHouseManual) {
    cancelButton.visible = true
    cancelButton.label = 'See House Manual'
    cancelButton.action = 'see_house_manual'
    cancelButton.style = BUTTON_STYLES.HOUSE_MANUAL_PURPLE
    cancelButton.disabled = true
  } else if (isCounteroffer) {
    cancelButton.visible = true
    cancelButton.label = 'Reject Modified Terms'
    cancelButton.action = 'reject_counteroffer'
  } else if (isSLSuggested) {
    cancelButton.visible = true
    cancelButton.label = 'Reject Proposal'
    cancelButton.action = 'reject_proposal'
  } else if (isBeyondHouseManualThreshold(sortOrder)) {
    cancelButton.visible = true
    cancelButton.label = 'Cancel Proposal'
    cancelButton.action = 'cancel_proposal'
  } else if (sortOrder >= 0 && sortOrder <= HOUSE_MANUAL_THRESHOLD) {
    cancelButton.visible = true
    cancelButton.label = 'Cancel Proposal'
    cancelButton.action = 'cancel_proposal'
  }

  // === Virtual Meeting Button ===
  const vmButton = { visible: false, label: 'Request Virtual Meeting', action: 'request_vm', style: null, disabled: false }

  if (!shouldHideVirtualMeetingButton(status) && !isTerminal) {
    vmButton.visible = true
  }

  return Object.freeze({
    guestAction1,
    guestAction2,
    cancelButton,
    vmButton,
    sortOrder,
    isTerminal,
    isCounteroffer,
    isSLSuggested
  })
}

/**
 * Clear the status configuration cache
 * Useful for testing or when data needs to be refreshed
 * @effectful
 */
export function clearStatusConfigCache() {
  statusConfigCache = null
  statusConfigByDisplayCache = null
  fetchPromise = null
  logInfo('Cache cleared')
}

/**
 * Check if the cache is initialized
 * @pure
 * @returns {boolean} True if cache is ready
 */
export function isStatusConfigCacheReady() {
  return statusConfigCache !== null && statusConfigByDisplayCache !== null
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  TERMINAL_SORT_ORDER,
  DEFAULT_SORT_ORDER,
  HOUSE_MANUAL_THRESHOLD,
  MAX_GUEST_REMINDERS,
  INVISIBLE_LABEL,
  BUTTON_STYLES,
  ACTION_LABEL_MAP,
  ACTION2_LABEL_MAP,

  // Predicates
  isNullish,
  isNonEmptyString,
  isVisibleLabel,
  isTerminalSortOrder,
  isBeyondHouseManualThreshold,
  hasExceededReminderLimit,

  // Helpers
  normalizeStatus,
  containsSuggestedText,
  buildDisplayLookupMap,
  buildDefaultButtonConfig,
  getActionFromLabel
})
