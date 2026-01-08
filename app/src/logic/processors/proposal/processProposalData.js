/**
 * Process Proposal Data Processor
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @intent Transform raw proposal rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Merges original terms and counteroffer (host-changed) terms into single current terms.
 * @rule Handles dual proposal system (original vs host counteroffer).
 * @pure Yes - deterministic, no side effects
 */

import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_STATUS = 'Draft'

const FIELD_NAMES = Object.freeze({
  ID: '_id',
  LISTING: 'Listing',
  GUEST: 'Guest',
  STATUS: 'Status',
  STATUS_ALT: 'status',
  DELETED: 'Deleted',
  VIRTUAL_MEETING: 'virtual meeting',
  HOUSE_MANUAL_ACCESSED: 'Did user access house manual?',
  CANCELLATION_REASON: 'reason for cancellation',
  CREATED_DATE: 'Created Date',
  MODIFIED_DATE: 'Modified Date'
})

const TERM_FIELDS = Object.freeze({
  MOVE_IN_DATE: 'Move-In Date',
  DAYS_OF_WEEK: 'Days of Week',
  WEEKS: 'Weeks',
  TOTAL_RENT: 'Total Rent',
  CLEANING_FEE: 'Cleaning Fee',
  SECURITY_DEPOSIT: 'Security Deposit',
  HOUSE_RULES: 'House Rules',
  MOVE_OUT_DATE: 'Move-Out Date'
})

const HC_TERM_FIELDS = Object.freeze({
  MOVE_IN_DATE: 'hc Move-In Date',
  DAYS_OF_WEEK: 'hc Days of Week',
  WEEKS: 'hc Weeks',
  TOTAL_RENT: 'hc Total Rent',
  CLEANING_FEE: 'hc Cleaning Fee',
  SECURITY_DEPOSIT: 'hc Security Deposit',
  HOUSE_RULES: 'hc House Rules',
  MOVE_OUT_DATE: 'hc Move-Out Date'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

const isString = (value) => typeof value === 'string'
const isNullish = (value) => value === null || value === undefined
const isTrue = (value) => value === true

// ─────────────────────────────────────────────────────────────
// Pure Transformation Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Extract and normalize status from proposal
 * @pure
 */
const extractStatus = (rawProposal) => {
  const statusField = rawProposal[FIELD_NAMES.STATUS]
  const statusAltField = rawProposal[FIELD_NAMES.STATUS_ALT]

  if (isString(statusField)) {
    return statusField.trim()
  }

  if (isString(statusAltField)) {
    return statusAltField.trim()
  }

  return DEFAULT_STATUS
}

/**
 * Check if proposal has a host counteroffer
 * @pure
 */
const hasCounteroffer = (status) =>
  status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()

/**
 * Select term value: use host-changed if available and in counteroffer state, otherwise original
 * @pure
 */
const selectTermValue = (rawProposal, originalField, hcField, useHc) => {
  if (useHc && rawProposal[hcField]) {
    return rawProposal[hcField]
  }
  return rawProposal[originalField]
}

/**
 * Build current terms object (merged from original or counteroffer)
 * @pure
 */
const buildCurrentTerms = (rawProposal, useHc) =>
  Object.freeze({
    moveInDate: selectTermValue(rawProposal, TERM_FIELDS.MOVE_IN_DATE, HC_TERM_FIELDS.MOVE_IN_DATE, useHc),
    daysOfWeek: selectTermValue(rawProposal, TERM_FIELDS.DAYS_OF_WEEK, HC_TERM_FIELDS.DAYS_OF_WEEK, useHc),
    weeks: selectTermValue(rawProposal, TERM_FIELDS.WEEKS, HC_TERM_FIELDS.WEEKS, useHc),
    totalRent: selectTermValue(rawProposal, TERM_FIELDS.TOTAL_RENT, HC_TERM_FIELDS.TOTAL_RENT, useHc),
    cleaningFee: selectTermValue(rawProposal, TERM_FIELDS.CLEANING_FEE, HC_TERM_FIELDS.CLEANING_FEE, useHc),
    securityDeposit: selectTermValue(rawProposal, TERM_FIELDS.SECURITY_DEPOSIT, HC_TERM_FIELDS.SECURITY_DEPOSIT, useHc),
    houseRules: selectTermValue(rawProposal, TERM_FIELDS.HOUSE_RULES, HC_TERM_FIELDS.HOUSE_RULES, useHc),
    moveOutDate: selectTermValue(rawProposal, TERM_FIELDS.MOVE_OUT_DATE, HC_TERM_FIELDS.MOVE_OUT_DATE, useHc)
  })

/**
 * Build original terms object
 * @pure
 */
const buildOriginalTerms = (rawProposal) =>
  Object.freeze({
    moveInDate: rawProposal[TERM_FIELDS.MOVE_IN_DATE],
    daysOfWeek: rawProposal[TERM_FIELDS.DAYS_OF_WEEK],
    weeks: rawProposal[TERM_FIELDS.WEEKS],
    totalRent: rawProposal[TERM_FIELDS.TOTAL_RENT],
    cleaningFee: rawProposal[TERM_FIELDS.CLEANING_FEE],
    securityDeposit: rawProposal[TERM_FIELDS.SECURITY_DEPOSIT],
    houseRules: rawProposal[TERM_FIELDS.HOUSE_RULES],
    moveOutDate: rawProposal[TERM_FIELDS.MOVE_OUT_DATE]
  })

/**
 * Safely extract field or return null
 * @pure
 */
const extractFieldOrNull = (rawProposal, fieldName) =>
  rawProposal[fieldName] || null

/**
 * Build processed proposal object
 * @pure
 */
const buildProposalObject = (rawProposal, status, currentTerms, originalTerms, hasHostCounteroffer, listing, guest, host) =>
  Object.freeze({
    // Identity
    id: rawProposal[FIELD_NAMES.ID],
    listingId: rawProposal[FIELD_NAMES.LISTING],
    guestId: rawProposal[FIELD_NAMES.GUEST],

    // Status and workflow
    status,
    deleted: isTrue(rawProposal[FIELD_NAMES.DELETED]),
    usualOrder: getUsualOrder(status),

    // Current terms (merged from original or counteroffer)
    currentTerms,

    // Original terms (for comparison in Compare Terms modal)
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,

    // Additional details
    virtualMeetingId: extractFieldOrNull(rawProposal, FIELD_NAMES.VIRTUAL_MEETING),
    houseManualAccessed: isTrue(rawProposal[FIELD_NAMES.HOUSE_MANUAL_ACCESSED]),

    // Cancellation
    cancellationReason: extractFieldOrNull(rawProposal, FIELD_NAMES.CANCELLATION_REASON),

    // Timestamps
    createdDate: rawProposal[FIELD_NAMES.CREATED_DATE],
    modifiedDate: rawProposal[FIELD_NAMES.MODIFIED_DATE],

    // Enriched data (if provided)
    _listing: listing,
    _guest: guest,
    _host: host
  })

// ─────────────────────────────────────────────────────────────
// Main Processor
// ─────────────────────────────────────────────────────────────

/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 * @pure
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Processed listing data (if already loaded).
 * @param {object} [params.guest] - Processed guest user data (if already loaded).
 * @param {object} [params.host] - Processed host user data (if already loaded).
 * @returns {object} Clean, validated proposal object with merged terms (frozen).
 *
 * @throws {Error} If rawProposal is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If Listing or Guest reference is missing.
 */
export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // Validation: rawProposal must exist
  if (isNullish(rawProposal)) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validation: ID is required
  const proposalId = rawProposal[FIELD_NAMES.ID]
  if (!proposalId) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // Validation: Listing reference is required
  if (!rawProposal[FIELD_NAMES.LISTING]) {
    throw new Error(
      `processProposalData: Proposal ${proposalId} missing required Listing reference`
    )
  }

  // Validation: Guest reference is required
  if (!rawProposal[FIELD_NAMES.GUEST]) {
    throw new Error(
      `processProposalData: Proposal ${proposalId} missing required Guest reference`
    )
  }

  // Extract and process status
  const status = extractStatus(rawProposal)
  const hasHostCounteroffer = hasCounteroffer(status)

  // Build terms objects
  const currentTerms = buildCurrentTerms(rawProposal, hasHostCounteroffer)
  const originalTerms = buildOriginalTerms(rawProposal)

  // Build and return processed proposal
  return buildProposalObject(
    rawProposal,
    status,
    currentTerms,
    originalTerms,
    hasHostCounteroffer,
    listing,
    guest,
    host
  )
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  DEFAULT_STATUS,
  FIELD_NAMES,
  TERM_FIELDS,
  HC_TERM_FIELDS
}
