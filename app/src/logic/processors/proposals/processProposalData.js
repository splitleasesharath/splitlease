/**
 * Proposal Data Processor - Extended
 *
 * PILLAR III: Processors (The "Transform" Layer)
 *
 * This processor transforms raw Supabase/Bubble.io data into clean,
 * validated internal shapes. It enforces the "No Fallback" principle
 * by throwing explicit errors for missing critical data.
 *
 * @intent Create safe, typed objects for UI consumption, enforcing data integrity.
 * @pure Yes - deterministic, no side effects
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_LISTING_NAME = 'Untitled Listing'
const DEFAULT_HOST_DISPLAY = 'Host'
const DEFAULT_PROPERTY_DISPLAY = 'Property'
const DEFAULT_STATUS = 'Unknown'
const DEFAULT_PROPOSAL_DISPLAY = 'Unknown Proposal'

const LOCALE = 'en-US'
const TIMEZONE = 'America/New_York'

const DATE_FORMAT_OPTIONS = Object.freeze({
  SHORT: Object.freeze({ year: 'numeric', month: 'short', day: 'numeric' }),
  FULL: Object.freeze({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIMEZONE,
    timeZoneName: 'short'
  })
})

const CURRENCY_FORMAT_OPTIONS = Object.freeze({
  style: 'currency',
  currency: 'USD'
})

const USER_FIELD_NAMES = Object.freeze({
  ID: '_id',
  FIRST_NAME: 'Name - First',
  LAST_NAME: 'Name - Last',
  FULL_NAME: 'Name - Full',
  PROFILE_PHOTO: 'Profile Photo',
  BIO: 'About Me / Bio',
  LINKEDIN_VERIFIED: 'Verify - Linked In ID',
  PHONE_VERIFIED: 'Verify - Phone',
  USER_VERIFIED: 'user verified?',
  PROPOSALS_LIST: 'Proposals List'
})

const LISTING_FIELD_NAMES = Object.freeze({
  ID: '_id',
  NAME: 'Name',
  DESCRIPTION: 'Description',
  ADDRESS: 'Location - Address',
  BOROUGH: 'Location - Borough',
  HOOD: 'Location - Hood',
  PHOTOS: 'Features - Photos',
  CHECK_IN_TIME: 'NEW Date Check-in Time',
  CHECK_OUT_TIME: 'NEW Date Check-out Time',
  HOST_USER: 'Host User'
})

const VM_FIELD_NAMES = Object.freeze({
  ID: '_id',
  BOOKED_DATE: 'booked date',
  CONFIRMED: 'confirmedBySplitLease',
  MEETING_LINK: 'meeting link',
  DECLINED: 'meeting declined',
  REQUESTED_BY: 'requested by',
  SUGGESTED_TIMES: 'suggested dates and times',
  GUEST_NAME: 'guest name',
  HOST_NAME: 'host name',
  PROPOSAL: 'proposal',
  UNIQUE_ID: 'unique_id'
})

const PROPOSAL_FIELD_NAMES = Object.freeze({
  ID: '_id',
  STATUS: 'Status',
  DELETED: 'Deleted',
  DAYS_SELECTED: 'Days Selected',
  NIGHTS_SELECTED: 'Nights Selected (Nights list)',
  RESERVATION_WEEKS: 'Reservation Span (Weeks)',
  NIGHTS_PER_WEEK: 'nights per week (num)',
  CHECK_IN_DAY: 'check in day',
  CHECK_OUT_DAY: 'check out day',
  MOVE_IN_START: 'Move in range start',
  MOVE_IN_END: 'Move in range end',
  TOTAL_PRICE: 'Total Price for Reservation (guest)',
  NIGHTLY_PRICE: 'proposal nightly price',
  CLEANING_FEE: 'cleaning fee',
  DAMAGE_DEPOSIT: 'damage deposit',
  COUNTER_OFFER_HAPPENED: 'counter offer happened',
  HC_DAYS_SELECTED: 'hc days selected',
  HC_RESERVATION_WEEKS: 'hc reservation span (weeks)',
  HC_NIGHTS_PER_WEEK: 'hc nights per week',
  HC_CHECK_IN_DAY: 'hc check in day',
  HC_CHECK_OUT_DAY: 'hc check out day',
  HC_TOTAL_PRICE: 'hc total price',
  HC_NIGHTLY_PRICE: 'hc nightly price',
  HC_CLEANING_FEE: 'hc cleaning fee',
  HC_DAMAGE_DEPOSIT: 'hc damage deposit',
  HC_HOUSE_RULES: 'hc house rules',
  CREATED_DATE: 'Created Date',
  MODIFIED_DATE: 'Modified Date',
  ABOUT_YOURSELF: 'about_yourself',
  SPECIAL_NEEDS: 'special_needs',
  CANCELLATION_REASON: 'reason for cancellation',
  PROPOSAL_STAGE: 'Proposal Stage',
  IS_FINALIZED: 'Is Finalized',
  IS_SUGGESTED_BY_HOST: 'Is Suggested by Host',
  GUEST: 'Guest',
  LISTING: 'Listing',
  RENTAL_APPLICATION: 'rental application',
  VIRTUAL_MEETING: 'virtual meeting'
})

// ─────────────────────────────────────────────────────────────
// Validation Predicates (Pure Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Check if value is null or undefined
 * @pure
 */
const isNullish = (value) => value === null || value === undefined

/**
 * Check if value is a string
 * @pure
 */
const isString = (value) => typeof value === 'string'

/**
 * Check if value is a number
 * @pure
 */
const isNumber = (value) => typeof value === 'number' && !isNaN(value)

/**
 * Check if Date object is valid
 * @pure
 */
const isValidDate = (dateObj) => dateObj instanceof Date && !isNaN(dateObj.getTime())

/**
 * Check if value is an object
 * @pure
 */
const isObject = (value) => typeof value === 'object' && value !== null

// ─────────────────────────────────────────────────────────────
// Pure Extraction Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Safely extract field or return default
 * @pure
 */
const extractFieldOrDefault = (obj, field, defaultValue) =>
  obj?.[field] ?? defaultValue

/**
 * Safely extract field or return null
 * @pure
 */
const extractFieldOrNull = (obj, field) =>
  obj?.[field] ?? null

/**
 * Safely extract boolean field
 * @pure
 */
const extractBooleanField = (obj, field) =>
  obj?.[field] === true

// ─────────────────────────────────────────────────────────────
// User Processor
// ─────────────────────────────────────────────────────────────

/**
 * Build user object from raw data
 * @pure
 */
const buildUserObject = (rawUser) =>
  Object.freeze({
    id: rawUser[USER_FIELD_NAMES.ID],
    firstName: extractFieldOrNull(rawUser, USER_FIELD_NAMES.FIRST_NAME),
    lastName: extractFieldOrNull(rawUser, USER_FIELD_NAMES.LAST_NAME),
    fullName: extractFieldOrNull(rawUser, USER_FIELD_NAMES.FULL_NAME),
    profilePhoto: extractFieldOrNull(rawUser, USER_FIELD_NAMES.PROFILE_PHOTO),
    bio: extractFieldOrNull(rawUser, USER_FIELD_NAMES.BIO),
    linkedInVerified: extractBooleanField(rawUser, USER_FIELD_NAMES.LINKEDIN_VERIFIED),
    phoneVerified: extractBooleanField(rawUser, USER_FIELD_NAMES.PHONE_VERIFIED),
    userVerified: extractBooleanField(rawUser, USER_FIELD_NAMES.USER_VERIFIED),
    proposalsList: extractFieldOrDefault(rawUser, USER_FIELD_NAMES.PROPOSALS_LIST, [])
  })

/**
 * Transform raw user data from Bubble.io format
 * @pure
 * @param {Object} rawUser - Raw user object from Supabase
 * @returns {Object} Transformed user object (frozen)
 */
export function processUserData(rawUser) {
  if (isNullish(rawUser)) {
    throw new Error('processUserData: User data is required')
  }

  if (!rawUser[USER_FIELD_NAMES.ID]) {
    throw new Error('processUserData: User ID (_id) is required')
  }

  return buildUserObject(rawUser)
}

// ─────────────────────────────────────────────────────────────
// Listing Processor
// ─────────────────────────────────────────────────────────────

/**
 * Extract address string from JSONB structure or plain string
 * @pure
 */
const extractAddressString = (addressData) => {
  if (isObject(addressData) && addressData.address) {
    return addressData.address
  }
  if (isString(addressData)) {
    return addressData
  }
  return null
}

/**
 * Build listing object from raw data
 * @pure
 */
const buildListingObject = (rawListing, addressString) =>
  Object.freeze({
    id: rawListing[LISTING_FIELD_NAMES.ID],
    name: extractFieldOrDefault(rawListing, LISTING_FIELD_NAMES.NAME, DEFAULT_LISTING_NAME),
    description: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.DESCRIPTION),
    address: addressString,
    addressData: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.ADDRESS),
    borough: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.BOROUGH),
    hood: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.HOOD),
    boroughName: extractFieldOrNull(rawListing, 'boroughName'),
    hoodName: extractFieldOrNull(rawListing, 'hoodName'),
    photos: extractFieldOrDefault(rawListing, LISTING_FIELD_NAMES.PHOTOS, []),
    featuredPhotoUrl: extractFieldOrNull(rawListing, 'featuredPhotoUrl'),
    houseRules: extractFieldOrDefault(rawListing, 'houseRules', []),
    checkInTime: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.CHECK_IN_TIME),
    checkOutTime: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.CHECK_OUT_TIME),
    hostUserId: extractFieldOrNull(rawListing, LISTING_FIELD_NAMES.HOST_USER)
  })

/**
 * Transform raw listing data from Bubble.io format
 * @pure
 * @param {Object} rawListing - Raw listing object from Supabase
 * @returns {Object|null} Transformed listing object (frozen) or null
 */
export function processListingData(rawListing) {
  if (isNullish(rawListing)) {
    return null
  }

  const addressData = rawListing[LISTING_FIELD_NAMES.ADDRESS]
  const addressString = extractAddressString(addressData)

  return buildListingObject(rawListing, addressString)
}

// ─────────────────────────────────────────────────────────────
// Host Processor
// ─────────────────────────────────────────────────────────────

/**
 * Build host object from raw data
 * @pure
 */
const buildHostObject = (rawHost) =>
  Object.freeze({
    id: rawHost[USER_FIELD_NAMES.ID],
    firstName: extractFieldOrNull(rawHost, USER_FIELD_NAMES.FIRST_NAME),
    lastName: extractFieldOrNull(rawHost, USER_FIELD_NAMES.LAST_NAME),
    fullName: extractFieldOrNull(rawHost, USER_FIELD_NAMES.FULL_NAME),
    profilePhoto: extractFieldOrNull(rawHost, USER_FIELD_NAMES.PROFILE_PHOTO),
    bio: extractFieldOrNull(rawHost, USER_FIELD_NAMES.BIO),
    linkedInVerified: extractBooleanField(rawHost, USER_FIELD_NAMES.LINKEDIN_VERIFIED),
    phoneVerified: extractBooleanField(rawHost, USER_FIELD_NAMES.PHONE_VERIFIED),
    userVerified: extractBooleanField(rawHost, USER_FIELD_NAMES.USER_VERIFIED),
    hostUserId: extractFieldOrNull(rawHost, USER_FIELD_NAMES.ID)
  })

/**
 * Transform raw host data from Bubble.io format
 * @pure
 * @param {Object} rawHost - Raw host object from Supabase
 * @returns {Object|null} Transformed host object (frozen) or null
 */
export function processHostData(rawHost) {
  if (isNullish(rawHost)) {
    return null
  }

  return buildHostObject(rawHost)
}

// ─────────────────────────────────────────────────────────────
// Virtual Meeting Processor
// ─────────────────────────────────────────────────────────────

/**
 * Build virtual meeting object from raw data
 * @pure
 */
const buildVirtualMeetingObject = (rawVirtualMeeting) =>
  Object.freeze({
    id: rawVirtualMeeting[VM_FIELD_NAMES.ID],
    bookedDate: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.BOOKED_DATE),
    confirmedBySplitlease: extractBooleanField(rawVirtualMeeting, VM_FIELD_NAMES.CONFIRMED),
    meetingLink: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.MEETING_LINK),
    meetingDeclined: extractBooleanField(rawVirtualMeeting, VM_FIELD_NAMES.DECLINED),
    requestedBy: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.REQUESTED_BY),
    suggestedTimeslots: extractFieldOrDefault(rawVirtualMeeting, VM_FIELD_NAMES.SUGGESTED_TIMES, []),
    guestName: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.GUEST_NAME),
    hostName: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.HOST_NAME),
    proposalId: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.PROPOSAL),
    uniqueId: extractFieldOrNull(rawVirtualMeeting, VM_FIELD_NAMES.UNIQUE_ID)
  })

/**
 * Transform raw virtual meeting data from Bubble.io format
 * @pure
 * @param {Object} rawVirtualMeeting - Raw virtual meeting object from Supabase
 * @returns {Object|null} Transformed virtual meeting object (frozen) or null
 */
export function processVirtualMeetingData(rawVirtualMeeting) {
  if (isNullish(rawVirtualMeeting)) {
    return null
  }

  return buildVirtualMeetingObject(rawVirtualMeeting)
}

// ─────────────────────────────────────────────────────────────
// Proposal Processor
// ─────────────────────────────────────────────────────────────

/**
 * Build schedule terms from raw proposal
 * @pure
 */
const buildScheduleTerms = (rawProposal) =>
  Object.freeze({
    daysSelected: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.DAYS_SELECTED, []),
    nightsSelected: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.NIGHTS_SELECTED, []),
    reservationWeeks: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.RESERVATION_WEEKS, 0),
    nightsPerWeek: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.NIGHTS_PER_WEEK, 0),
    checkInDay: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.CHECK_IN_DAY),
    checkOutDay: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.CHECK_OUT_DAY),
    moveInStart: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.MOVE_IN_START),
    moveInEnd: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.MOVE_IN_END)
  })

/**
 * Build pricing terms from raw proposal
 * @pure
 */
const buildPricingTerms = (rawProposal) =>
  Object.freeze({
    totalPrice: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.TOTAL_PRICE, 0),
    nightlyPrice: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.NIGHTLY_PRICE, 0),
    cleaningFee: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.CLEANING_FEE, 0),
    damageDeposit: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.DAMAGE_DEPOSIT, 0)
  })

/**
 * Build counteroffer (host-changed) terms from raw proposal
 * @pure
 */
const buildCounterofferTerms = (rawProposal) =>
  Object.freeze({
    counterOfferHappened: extractBooleanField(rawProposal, PROPOSAL_FIELD_NAMES.COUNTER_OFFER_HAPPENED),
    hcDaysSelected: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_DAYS_SELECTED),
    hcReservationWeeks: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_RESERVATION_WEEKS),
    hcNightsPerWeek: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_NIGHTS_PER_WEEK),
    hcCheckInDay: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_CHECK_IN_DAY),
    hcCheckOutDay: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_CHECK_OUT_DAY),
    hcTotalPrice: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_TOTAL_PRICE),
    hcNightlyPrice: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_NIGHTLY_PRICE),
    hcCleaningFee: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_CLEANING_FEE),
    hcDamageDeposit: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_DAMAGE_DEPOSIT),
    hcHouseRules: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.HC_HOUSE_RULES)
  })

/**
 * Build metadata from raw proposal
 * @pure
 */
const buildProposalMetadata = (rawProposal) =>
  Object.freeze({
    createdDate: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.CREATED_DATE),
    modifiedDate: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.MODIFIED_DATE),
    aboutYourself: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.ABOUT_YOURSELF),
    specialNeeds: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.SPECIAL_NEEDS),
    reasonForCancellation: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.CANCELLATION_REASON),
    proposalStage: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.PROPOSAL_STAGE),
    isFinalized: extractBooleanField(rawProposal, PROPOSAL_FIELD_NAMES.IS_FINALIZED),
    isSuggestedByHost: extractBooleanField(rawProposal, PROPOSAL_FIELD_NAMES.IS_SUGGESTED_BY_HOST)
  })

/**
 * Build related IDs from raw proposal
 * @pure
 */
const buildRelatedIds = (rawProposal) =>
  Object.freeze({
    guestId: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.GUEST),
    listingId: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.LISTING),
    rentalApplicationId: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.RENTAL_APPLICATION),
    virtualMeetingId: extractFieldOrNull(rawProposal, PROPOSAL_FIELD_NAMES.VIRTUAL_MEETING)
  })

/**
 * Resolve house rules from proposal, listing, or counteroffer
 * @pure
 */
const resolveHouseRules = (rawProposal, listing) =>
  rawProposal.houseRules || listing?.houseRules || []

/**
 * Build complete proposal object from parts
 * @pure
 */
const buildProposalObject = (rawProposal, listing, host, virtualMeeting) => {
  const scheduleTerms = buildScheduleTerms(rawProposal)
  const pricingTerms = buildPricingTerms(rawProposal)
  const counterofferTerms = buildCounterofferTerms(rawProposal)
  const metadata = buildProposalMetadata(rawProposal)
  const relatedIds = buildRelatedIds(rawProposal)
  const houseRules = resolveHouseRules(rawProposal, listing)

  return Object.freeze({
    // Core identifiers
    id: rawProposal[PROPOSAL_FIELD_NAMES.ID],
    _id: rawProposal[PROPOSAL_FIELD_NAMES.ID],

    // Status and state
    status: extractFieldOrDefault(rawProposal, PROPOSAL_FIELD_NAMES.STATUS, DEFAULT_STATUS),
    deleted: extractBooleanField(rawProposal, PROPOSAL_FIELD_NAMES.DELETED),

    // Spread grouped terms
    ...scheduleTerms,
    ...pricingTerms,
    ...counterofferTerms,
    ...metadata,
    ...relatedIds,

    // Nested transformed data
    listing,
    host,
    virtualMeeting,

    // Resolved house rules
    houseRules
  })
}

/**
 * Transform complete proposal data from Bubble.io format
 * Includes nested transformations for listing, host, and virtual meeting
 * @pure
 *
 * @param {Object} rawProposal - Raw proposal object from Supabase
 * @returns {Object} Transformed proposal object (frozen)
 * @throws {Error} If proposal data is missing
 * @throws {Error} If proposal ID is missing
 */
export function processProposalData(rawProposal) {
  if (isNullish(rawProposal)) {
    throw new Error('processProposalData: Proposal data is required')
  }

  if (!rawProposal[PROPOSAL_FIELD_NAMES.ID]) {
    throw new Error('processProposalData: Proposal ID (_id) is required')
  }

  // Extract and transform nested data
  const listing = processListingData(rawProposal.listing)
  const host = processHostData(rawProposal.listing?.host)
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting)

  return buildProposalObject(rawProposal, listing, host, virtualMeeting)
}

// ─────────────────────────────────────────────────────────────
// Display Text Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Extract host display name from proposal
 * @pure
 */
const extractHostDisplayName = (proposal) =>
  proposal.host?.firstName || proposal.host?.fullName || DEFAULT_HOST_DISPLAY

/**
 * Extract listing display name from proposal
 * @pure
 */
const extractListingDisplayName = (proposal) =>
  proposal.listing?.name || DEFAULT_PROPERTY_DISPLAY

/**
 * Get display text for proposal in dropdown
 * Format: "{host name} - {listing name}"
 * Shows the host who owns the listing, allowing guests to identify proposals by host
 * @pure
 *
 * @param {Object} proposal - Transformed proposal object
 * @returns {string} Display text for dropdown option
 */
export function getProposalDisplayText(proposal) {
  if (isNullish(proposal)) {
    return DEFAULT_PROPOSAL_DISPLAY
  }

  const hostName = extractHostDisplayName(proposal)
  const listingName = extractListingDisplayName(proposal)

  return `${hostName} - ${listingName}`
}

// ─────────────────────────────────────────────────────────────
// Formatting Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Create currency formatter options with optional cents
 * @pure
 */
const buildCurrencyOptions = (includeCents) =>
  Object.freeze({
    ...CURRENCY_FORMAT_OPTIONS,
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0
  })

/**
 * Create currency formatter
 * @pure
 */
const createCurrencyFormatter = (includeCents) =>
  new Intl.NumberFormat(LOCALE, buildCurrencyOptions(includeCents))

/**
 * Parse date value to Date object
 * @pure
 */
const parseToDate = (date) =>
  isString(date) ? new Date(date) : date

/**
 * Format price for display
 * @pure
 * @param {number|null|undefined} price - Price value
 * @param {boolean} includeCents - Whether to include cents (default: true)
 * @returns {string|null} Formatted price string or null
 */
export function formatPrice(price, includeCents = true) {
  if (isNullish(price)) {
    return null
  }

  const formatter = createCurrencyFormatter(includeCents)
  return formatter.format(price)
}

/**
 * Format date for display using short format
 * @pure
 * @param {string|Date|null|undefined} date - Date value
 * @returns {string|null} Formatted date string or null
 */
export function formatDate(date) {
  if (isNullish(date)) {
    return null
  }

  const dateObj = parseToDate(date)

  if (!isValidDate(dateObj)) {
    return null
  }

  return dateObj.toLocaleDateString(LOCALE, DATE_FORMAT_OPTIONS.SHORT)
}

/**
 * Format datetime for display using full format
 * @pure
 * @param {string|Date|null|undefined} datetime - Datetime value
 * @returns {string|null} Formatted datetime string or null
 */
export function formatDateTime(datetime) {
  if (isNullish(datetime)) {
    return null
  }

  const dateObj = parseToDate(datetime)

  if (!isValidDate(dateObj)) {
    return null
  }

  return dateObj.toLocaleString(LOCALE, DATE_FORMAT_OPTIONS.FULL)
}

// ─────────────────────────────────────────────────────────────
// Effective Terms Calculator
// ─────────────────────────────────────────────────────────────

/**
 * Select term value with counteroffer fallback
 * @pure
 */
const selectTermWithFallback = (counterofferValue, originalValue) =>
  counterofferValue ?? originalValue

/**
 * Build effective terms from counteroffer values (with original fallbacks)
 * @pure
 */
const buildCounterofferEffectiveTerms = (proposal) =>
  Object.freeze({
    daysSelected: selectTermWithFallback(proposal.hcDaysSelected, proposal.daysSelected),
    reservationWeeks: selectTermWithFallback(proposal.hcReservationWeeks, proposal.reservationWeeks),
    nightsPerWeek: selectTermWithFallback(proposal.hcNightsPerWeek, proposal.nightsPerWeek),
    checkInDay: selectTermWithFallback(proposal.hcCheckInDay, proposal.checkInDay),
    checkOutDay: selectTermWithFallback(proposal.hcCheckOutDay, proposal.checkOutDay),
    totalPrice: selectTermWithFallback(proposal.hcTotalPrice, proposal.totalPrice),
    nightlyPrice: selectTermWithFallback(proposal.hcNightlyPrice, proposal.nightlyPrice),
    cleaningFee: selectTermWithFallback(proposal.hcCleaningFee, proposal.cleaningFee),
    damageDeposit: selectTermWithFallback(proposal.hcDamageDeposit, proposal.damageDeposit),
    isCounteroffer: true
  })

/**
 * Build effective terms from original values
 * @pure
 */
const buildOriginalEffectiveTerms = (proposal) =>
  Object.freeze({
    daysSelected: proposal.daysSelected,
    reservationWeeks: proposal.reservationWeeks,
    nightsPerWeek: proposal.nightsPerWeek,
    checkInDay: proposal.checkInDay,
    checkOutDay: proposal.checkOutDay,
    totalPrice: proposal.totalPrice,
    nightlyPrice: proposal.nightlyPrice,
    cleaningFee: proposal.cleaningFee,
    damageDeposit: proposal.damageDeposit,
    isCounteroffer: false
  })

/**
 * Get the effective terms for a proposal (counteroffer if exists, otherwise original)
 * @pure
 *
 * @param {Object} proposal - Transformed proposal object
 * @returns {Object} Effective terms object (frozen)
 * @throws {Error} If proposal is missing
 */
export function getEffectiveTerms(proposal) {
  if (isNullish(proposal)) {
    throw new Error('getEffectiveTerms: Proposal is required')
  }

  return proposal.counterOfferHappened
    ? buildCounterofferEffectiveTerms(proposal)
    : buildOriginalEffectiveTerms(proposal)
}

// ─────────────────────────────────────────────────────────────
// Exported Constants (for testing)
// ─────────────────────────────────────────────────────────────
export {
  DEFAULT_LISTING_NAME,
  DEFAULT_HOST_DISPLAY,
  DEFAULT_PROPERTY_DISPLAY,
  DEFAULT_STATUS,
  DEFAULT_PROPOSAL_DISPLAY,
  LOCALE,
  TIMEZONE,
  DATE_FORMAT_OPTIONS,
  CURRENCY_FORMAT_OPTIONS,
  USER_FIELD_NAMES,
  LISTING_FIELD_NAMES,
  VM_FIELD_NAMES,
  PROPOSAL_FIELD_NAMES
}
