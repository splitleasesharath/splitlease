/**
 * Process raw proposal data from Supabase into a clean, validated proposal object.
 *
 * @intent Transform raw proposal rows from Supabase into consistent, UI-ready format.
 * @rule NO FALLBACK - Throws explicit errors for missing critical fields.
 * @rule Merges original terms and counteroffer (host-changed) terms into single current terms.
 * @rule Handles dual proposal system (original vs host counteroffer).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.rawProposal - Raw proposal object from Supabase.
 * @param {object} [params.listing] - Processed listing data (if already loaded).
 * @param {object} [params.guest] - Processed guest user data (if already loaded).
 * @param {object} [params.host] - Processed host user data (if already loaded).
 * @returns {object} Clean, validated proposal object with merged terms.
 *
 * @throws {Error} If rawProposal is null/undefined.
 * @throws {Error} If critical _id field is missing.
 * @throws {Error} If Listing or Guest reference is missing.
 *
 * @example
 * const proposal = processProposalData({
 *   rawProposal: {
 *     _id: 'abc123',
 *     Listing: 'listing123',
 *     Guest: 'user456',
 *     'Move-In Date': '2025-01-15',
 *     'Days of Week': [1, 2, 3],
 *     'hc Days of Week': null,
 *     'Proposal Status': 'Host Countered',
 *     ...
 *   }
 * })
 */
import { PROPOSAL_STATUSES, getUsualOrder } from '../../constants/proposalStatuses.js'

export function processProposalData({ rawProposal, listing = null, guest = null, host = null }) {
  // No Fallback: Proposal data must exist
  if (!rawProposal) {
    throw new Error('processProposalData: rawProposal cannot be null or undefined')
  }

  // Validate critical ID field
  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal missing critical _id field')
  }

  // Validate required foreign key references
  if (!rawProposal.Listing) {
    throw new Error(
      `processProposalData: Proposal ${rawProposal._id} missing required Listing reference`
    )
  }

  if (!rawProposal.Guest) {
    throw new Error(
      `processProposalData: Proposal ${rawProposal._id} missing required Guest reference`
    )
  }

  // Determine which terms are current (original or host-changed)
  const status = typeof rawProposal.Status === 'string'
    ? rawProposal.Status.trim()
    : (typeof rawProposal.status === 'string' ? rawProposal.status.trim() : 'Draft')

  const hasHostCounteroffer = status === PROPOSAL_STATUSES.COUNTEROFFER_SUBMITTED_AWAITING_GUEST_REVIEW.key.trim()

  // Merge terms: Use host-changed (hc) fields if they exist, otherwise use original
  const currentTerms = {
    moveInDate: hasHostCounteroffer && rawProposal['hc Move-In Date']
      ? rawProposal['hc Move-In Date']
      : rawProposal['Move-In Date'],

    daysOfWeek: hasHostCounteroffer && rawProposal['hc Days of Week']
      ? rawProposal['hc Days of Week']
      : rawProposal['Days of Week'],

    weeks: hasHostCounteroffer && rawProposal['hc Weeks']
      ? rawProposal['hc Weeks']
      : rawProposal.Weeks,

    totalRent: hasHostCounteroffer && rawProposal['hc Total Rent']
      ? rawProposal['hc Total Rent']
      : rawProposal['Total Rent'],

    cleaningFee: hasHostCounteroffer && rawProposal['hc Cleaning Fee']
      ? rawProposal['hc Cleaning Fee']
      : rawProposal['Cleaning Fee'],

    securityDeposit: hasHostCounteroffer && rawProposal['hc Security Deposit']
      ? rawProposal['hc Security Deposit']
      : rawProposal['Security Deposit'],

    houseRules: hasHostCounteroffer && rawProposal['hc House Rules']
      ? rawProposal['hc House Rules']
      : rawProposal['House Rules'],

    moveOutDate: hasHostCounteroffer && rawProposal['hc Move-Out Date']
      ? rawProposal['hc Move-Out Date']
      : rawProposal['Move-Out Date']
  }

  // Preserve original terms for comparison
  const originalTerms = {
    moveInDate: rawProposal['Move-In Date'],
    daysOfWeek: rawProposal['Days of Week'],
    weeks: rawProposal.Weeks,
    totalRent: rawProposal['Total Rent'],
    cleaningFee: rawProposal['Cleaning Fee'],
    securityDeposit: rawProposal['Security Deposit'],
    houseRules: rawProposal['House Rules'],
    moveOutDate: rawProposal['Move-Out Date']
  }

  return {
    // Identity
    id: rawProposal._id,
    listingId: rawProposal.Listing,
    guestId: rawProposal.Guest,

    // Status and workflow
    status,
    deleted: rawProposal.Deleted === true,
    usualOrder: getUsualOrder(status),

    // Current terms (merged from original or counteroffer)
    currentTerms,

    // Original terms (for comparison in Compare Terms modal)
    originalTerms,
    hasCounteroffer: hasHostCounteroffer,

    // Additional details
    virtualMeetingId: rawProposal['virtual meeting'] || null,
    houseManualAccessed: rawProposal['Did user access house manual?'] === true,

    // Cancellation
    cancellationReason: rawProposal['reason for cancellation'] || null,

    // Timestamps
    createdDate: rawProposal['Created Date'],
    modifiedDate: rawProposal['Modified Date'],

    // Enriched data (if provided)
    _listing: listing,
    _guest: guest,
    _host: host
  }
}
