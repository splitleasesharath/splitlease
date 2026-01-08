/**
 * Counteroffer Workflow Module
 *
 * PILLAR IV: Workflow Orchestrators (The "Flow" Layer)
 *
 * Implements the counteroffer acceptance workflow from Bubble.io:
 *
 * 7 Steps (Accept Counteroffer):
 * 1. Show success alert (48-hour timeline)
 * 2. Calculate lease numbering format (based on count)
 * 3. Set state: Number of zeros
 * 4. Calculate 4-week compensation (original proposal)
 * 5. Update proposal status -> "Drafting Lease Documents"
 * 6. Calculate 4-week rent (counteroffer terms)
 * 7. Schedule API workflow: CORE-create-lease (+15 seconds)
 */

import { supabase } from '../../../lib/supabase.js';
import { hasReviewableCounteroffer } from '../../rules/proposals/proposalRules.js';
import { PROPOSAL_STATUSES } from '../../constants/proposalStatuses.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = Object.freeze({
  MISSING_PROPOSAL_ID: 'Proposal ID is required',
  NO_COUNTEROFFER: 'Proposal does not have a counteroffer to accept',
  FETCH_FAILED: 'Failed to fetch proposal',
  ACCEPT_FAILED: 'Failed to accept counteroffer',
  DECLINE_FAILED: 'Failed to decline counteroffer'
})

const DECLINE_REASONS = Object.freeze({
  DEFAULT: 'Counteroffer declined by guest'
})

const DB_FIELD_NAMES = Object.freeze({
  ID: '_id',
  STATUS: 'Status',
  MODIFIED_DATE: 'Modified Date',
  IS_FINALIZED: 'Is Finalized',
  DELETED: 'Deleted',
  REASON: 'reason for cancellation',
  COUNTER_OFFER_HAPPENED: 'counter offer happened'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is a non-empty string
 * @pure
 */
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.length > 0

/**
 * Check if proposal has counteroffer
 * @pure
 */
const hasCounteroffer = (proposal) =>
  proposal && proposal[DB_FIELD_NAMES.COUNTER_OFFER_HAPPENED] === true

// ─────────────────────────────────────────────────────────────
// Pure Data Builders
// ─────────────────────────────────────────────────────────────

/**
 * Build accept counteroffer update payload
 * @pure
 */
const buildAcceptPayload = (timestamp) =>
  Object.freeze({
    [DB_FIELD_NAMES.STATUS]: PROPOSAL_STATUSES.PROPOSAL_OR_COUNTEROFFER_ACCEPTED.key,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp,
    [DB_FIELD_NAMES.IS_FINALIZED]: true
  })

/**
 * Build decline counteroffer update payload
 * @pure
 */
const buildDeclinePayload = (timestamp, reason) =>
  Object.freeze({
    [DB_FIELD_NAMES.STATUS]: PROPOSAL_STATUSES.CANCELLED_BY_GUEST.key,
    [DB_FIELD_NAMES.DELETED]: true,
    [DB_FIELD_NAMES.MODIFIED_DATE]: timestamp,
    [DB_FIELD_NAMES.REASON]: reason
  })

// ─────────────────────────────────────────────────────────────
// Execution Functions
// ─────────────────────────────────────────────────────────────

/**
 * Accept a counteroffer
 * Updates proposal status and prepares for lease creation
 *
 * @param {string} proposalId - Proposal ID
 * @returns {Promise<Object>} Updated proposal data
 *
 * @throws {Error} If proposalId is not provided
 * @throws {Error} If proposal fetch fails
 * @throws {Error} If proposal has no counteroffer
 * @throws {Error} If update fails
 */
export async function acceptCounteroffer(proposalId) {
  if (!isNonEmptyString(proposalId)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL_ID)
  }

  console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId)

  // Step 1: Fetch proposal to validate counteroffer exists (effectful)
  const { data: proposal, error: fetchError } = await supabase
    .from('proposal')
    .select('*')
    .eq(DB_FIELD_NAMES.ID, proposalId)
    .single()

  if (fetchError) {
    throw new Error(`${ERROR_MESSAGES.FETCH_FAILED}: ${fetchError.message}`)
  }

  if (!hasCounteroffer(proposal)) {
    throw new Error(ERROR_MESSAGES.NO_COUNTEROFFER)
  }

  // Step 2: Update proposal status (effectful)
  const timestamp = new Date().toISOString()
  const updatePayload = buildAcceptPayload(timestamp)

  const { data, error } = await supabase
    .from('proposal')
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, proposalId)
    .select()
    .single()

  if (error) {
    console.error('[counterofferWorkflow] Error accepting counteroffer:', error)
    throw new Error(`${ERROR_MESSAGES.ACCEPT_FAILED}: ${error.message}`)
  }

  console.log('[counterofferWorkflow] Counteroffer accepted successfully:', proposalId)

  // Note: In production, this would trigger the CORE-create-lease API workflow
  // That functionality would need to be implemented via Edge Functions or backend

  return data
}

/**
 * Decline a counteroffer (equivalent to cancel proposal)
 *
 * @param {string} proposalId - Proposal ID
 * @param {string} reason - Reason for declining
 * @returns {Promise<Object>} Updated proposal data
 *
 * @throws {Error} If proposalId is not provided
 * @throws {Error} If update fails
 */
export async function declineCounteroffer(proposalId, reason = DECLINE_REASONS.DEFAULT) {
  if (!isNonEmptyString(proposalId)) {
    throw new Error(ERROR_MESSAGES.MISSING_PROPOSAL_ID)
  }

  console.log('[counterofferWorkflow] Declining counteroffer for proposal:', proposalId)

  const timestamp = new Date().toISOString()
  const updatePayload = buildDeclinePayload(timestamp, reason)

  const { data, error } = await supabase
    .from('proposal')
    .update(updatePayload)
    .eq(DB_FIELD_NAMES.ID, proposalId)
    .select()
    .single()

  if (error) {
    console.error('[counterofferWorkflow] Error declining counteroffer:', error)
    throw new Error(`${ERROR_MESSAGES.DECLINE_FAILED}: ${error.message}`)
  }

  console.log('[counterofferWorkflow] Counteroffer declined successfully:', proposalId)
  return data
}

// ─────────────────────────────────────────────────────────────
// Terms Comparison Constants
// ─────────────────────────────────────────────────────────────

const ORIGINAL_TERM_FIELDS = Object.freeze({
  DAYS_SELECTED: ['daysSelected', 'Days Selected'],
  NIGHTS_PER_WEEK: ['nightsPerWeek', 'nights per week (num)'],
  RESERVATION_WEEKS: ['reservationWeeks', 'Reservation Span (Weeks)'],
  CHECK_IN_DAY: ['checkInDay', 'check in day'],
  CHECK_OUT_DAY: ['checkOutDay', 'check out day'],
  TOTAL_PRICE: ['totalPrice', 'Total Price for Reservation (guest)'],
  NIGHTLY_PRICE: ['nightlyPrice', 'proposal nightly price'],
  DAMAGE_DEPOSIT: ['damageDeposit', 'damage deposit'],
  CLEANING_FEE: ['cleaningFee', 'cleaning fee']
})

const HC_TERM_FIELDS = Object.freeze({
  DAYS_SELECTED: ['hcDaysSelected', 'hc days selected'],
  NIGHTS_PER_WEEK: ['hcNightsPerWeek', 'hc nights per week'],
  RESERVATION_WEEKS: ['hcReservationWeeks', 'hc reservation span (weeks)'],
  CHECK_IN_DAY: ['hcCheckInDay', 'hc check in day'],
  CHECK_OUT_DAY: ['hcCheckOutDay', 'hc check out day'],
  TOTAL_PRICE: ['hcTotalPrice', 'hc total price'],
  NIGHTLY_PRICE: ['hcNightlyPrice', 'hc nightly price'],
  DAMAGE_DEPOSIT: ['hcDamageDeposit', 'hc damage deposit'],
  CLEANING_FEE: ['hcCleaningFee', 'hc cleaning fee']
})

const CHANGE_LABELS = Object.freeze({
  totalPrice: 'Total Price',
  nightlyPrice: 'Nightly Rate',
  reservationWeeks: 'Duration (Weeks)',
  nightsPerWeek: 'Nights per Week',
  daysSelected: 'Weekly Schedule'
})

// ─────────────────────────────────────────────────────────────
// Terms Extraction Helpers (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Extract field value from proposal with fallback field names
 * @pure
 */
const extractField = (proposal, fieldNames, defaultValue) =>
  proposal[fieldNames[0]] ?? proposal[fieldNames[1]] ?? defaultValue

/**
 * Build original terms object from proposal
 * @pure
 */
const buildOriginalTerms = (proposal) =>
  Object.freeze({
    daysSelected: extractField(proposal, ORIGINAL_TERM_FIELDS.DAYS_SELECTED, []),
    nightsPerWeek: extractField(proposal, ORIGINAL_TERM_FIELDS.NIGHTS_PER_WEEK, 0),
    reservationWeeks: extractField(proposal, ORIGINAL_TERM_FIELDS.RESERVATION_WEEKS, 0),
    checkInDay: extractField(proposal, ORIGINAL_TERM_FIELDS.CHECK_IN_DAY, null),
    checkOutDay: extractField(proposal, ORIGINAL_TERM_FIELDS.CHECK_OUT_DAY, null),
    totalPrice: extractField(proposal, ORIGINAL_TERM_FIELDS.TOTAL_PRICE, 0),
    nightlyPrice: extractField(proposal, ORIGINAL_TERM_FIELDS.NIGHTLY_PRICE, 0),
    damageDeposit: extractField(proposal, ORIGINAL_TERM_FIELDS.DAMAGE_DEPOSIT, 0),
    cleaningFee: extractField(proposal, ORIGINAL_TERM_FIELDS.CLEANING_FEE, 0)
  })

/**
 * Build counteroffer terms object from proposal
 * @pure
 */
const buildCounterofferTerms = (proposal, originalTerms) =>
  Object.freeze({
    daysSelected: extractField(proposal, HC_TERM_FIELDS.DAYS_SELECTED, originalTerms.daysSelected),
    nightsPerWeek: extractField(proposal, HC_TERM_FIELDS.NIGHTS_PER_WEEK, originalTerms.nightsPerWeek),
    reservationWeeks: extractField(proposal, HC_TERM_FIELDS.RESERVATION_WEEKS, originalTerms.reservationWeeks),
    checkInDay: extractField(proposal, HC_TERM_FIELDS.CHECK_IN_DAY, originalTerms.checkInDay),
    checkOutDay: extractField(proposal, HC_TERM_FIELDS.CHECK_OUT_DAY, originalTerms.checkOutDay),
    totalPrice: extractField(proposal, HC_TERM_FIELDS.TOTAL_PRICE, originalTerms.totalPrice),
    nightlyPrice: extractField(proposal, HC_TERM_FIELDS.NIGHTLY_PRICE, originalTerms.nightlyPrice),
    damageDeposit: extractField(proposal, HC_TERM_FIELDS.DAMAGE_DEPOSIT, originalTerms.damageDeposit),
    cleaningFee: extractField(proposal, HC_TERM_FIELDS.CLEANING_FEE, originalTerms.cleaningFee)
  })

/**
 * Build a change object
 * @pure
 */
const buildChange = (field, original, modified) =>
  Object.freeze({
    field,
    label: CHANGE_LABELS[field],
    original,
    modified
  })

/**
 * Compare arrays for equality
 * @pure
 */
const arraysEqual = (a, b) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * Detect changes between original and counteroffer terms
 * @pure
 */
const detectChanges = (originalTerms, counterofferTerms) => {
  const changes = []

  if (originalTerms.totalPrice !== counterofferTerms.totalPrice) {
    changes.push(buildChange('totalPrice', originalTerms.totalPrice, counterofferTerms.totalPrice))
  }

  if (originalTerms.nightlyPrice !== counterofferTerms.nightlyPrice) {
    changes.push(buildChange('nightlyPrice', originalTerms.nightlyPrice, counterofferTerms.nightlyPrice))
  }

  if (originalTerms.reservationWeeks !== counterofferTerms.reservationWeeks) {
    changes.push(buildChange('reservationWeeks', originalTerms.reservationWeeks, counterofferTerms.reservationWeeks))
  }

  if (originalTerms.nightsPerWeek !== counterofferTerms.nightsPerWeek) {
    changes.push(buildChange('nightsPerWeek', originalTerms.nightsPerWeek, counterofferTerms.nightsPerWeek))
  }

  if (!arraysEqual(originalTerms.daysSelected, counterofferTerms.daysSelected)) {
    changes.push(buildChange('daysSelected', originalTerms.daysSelected, counterofferTerms.daysSelected))
  }

  return changes
}

// ─────────────────────────────────────────────────────────────
// Terms Comparison Function
// ─────────────────────────────────────────────────────────────

/**
 * Get comparison data between original terms and counteroffer
 * @pure
 *
 * @param {Object} proposal - Proposal object
 * @returns {Object} Comparison data (frozen)
 *
 * @throws {Error} If proposal is not provided
 */
export function getTermsComparison(proposal) {
  if (!proposal) {
    throw new Error('Proposal is required')
  }

  const originalTerms = buildOriginalTerms(proposal)
  const counterofferTerms = buildCounterofferTerms(proposal, originalTerms)
  const changes = detectChanges(originalTerms, counterofferTerms)

  return Object.freeze({
    originalTerms,
    counterofferTerms,
    changes,
    hasChanges: changes.length > 0
  })
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  ERROR_MESSAGES,
  DECLINE_REASONS,
  DB_FIELD_NAMES,
  ORIGINAL_TERM_FIELDS,
  HC_TERM_FIELDS,
  CHANGE_LABELS
}
