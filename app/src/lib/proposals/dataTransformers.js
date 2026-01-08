/**
 * Data Transformation Utilities for Guest Proposals
 * Transforms Bubble.io data structure to cleaner, more usable format
 *
 * Handles:
 * - Field name normalization (removes spaces, special characters)
 * - Nested object flattening
 * - Type conversions
 * - Default values for missing data
 *
 * @module lib/proposals/dataTransformers
 */

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
 * Check if value is a valid address JSONB object
 * @pure
 */
const isAddressObject = (value) =>
  typeof value === 'object' && value !== null && 'address' in value

/**
 * Check if price is valid
 * @pure
 */
const isValidPrice = (price) =>
  price !== null && price !== undefined && !Number.isNaN(Number(price))

/**
 * Check if date is valid
 * @pure
 */
const isValidDate = (date) => {
  if (!date) return false
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return !Number.isNaN(dateObj.getTime())
}

// ─────────────────────────────────────────────────────────────
// Pure Transformation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Transform user data from Bubble.io format
 * @pure
 * @param {Object} rawUser - Raw user object from Supabase
 * @returns {Object|null} Transformed user object
 */
export function transformUserData(rawUser) {
  if (isNullish(rawUser)) return null

  return Object.freeze({
    id: rawUser._id,
    firstName: rawUser['Name - First'],
    lastName: rawUser['Name - Last'],
    fullName: rawUser['Name - Full'],
    profilePhoto: rawUser['Profile Photo'],
    proposalsList: rawUser['Proposals List']
  })
}

/**
 * Extract address string from JSONB or string data
 * @pure
 * @param {Object|string} addressData - Raw address data
 * @returns {string|null} Address string
 */
const extractAddressString = (addressData) => {
  if (isAddressObject(addressData)) return addressData.address
  if (isNonEmptyString(addressData)) return addressData
  return null
}

/**
 * Transform listing data from Bubble.io format
 * @pure
 * @param {Object} rawListing - Raw listing object from Supabase
 * @returns {Object|null} Transformed listing object
 */
export function transformListingData(rawListing) {
  if (isNullish(rawListing)) return null

  const addressData = rawListing['Location - Address']

  return Object.freeze({
    id: rawListing._id,
    name: rawListing.Name,
    description: rawListing.Description,
    address: extractAddressString(addressData),
    addressData: addressData,
    borough: rawListing['Location - Borough'],
    hood: rawListing['Location - Hood'],
    boroughName: rawListing.boroughName,
    hoodName: rawListing.hoodName,
    city: rawListing['Location - City'],
    state: rawListing['Location - State'],
    zipCode: rawListing['Location - Zip Code'],
    photos: rawListing['Features - Photos'],
    featuredPhotoUrl: rawListing.featuredPhotoUrl,
    houseRules: rawListing.houseRules || [],
    checkInTime: rawListing['NEW Date Check-in Time'],
    checkOutTime: rawListing['NEW Date Check-out Time']
  })
}

/**
 * Transform host data from Bubble.io format
 * @pure
 * @param {Object} rawHost - Raw host object from Supabase
 * @returns {Object|null} Transformed host object
 */
export function transformHostData(rawHost) {
  if (isNullish(rawHost)) return null

  return Object.freeze({
    id: rawHost._id,
    firstName: rawHost['Name - First'],
    lastName: rawHost['Name - Last'],
    fullName: rawHost['Name - Full'],
    profilePhoto: rawHost['Profile Photo'],
    bio: rawHost['About Me / Bio'],
    linkedInVerified: rawHost['Verify - Linked In ID'],
    phoneVerified: rawHost['Verify - Phone'],
    userVerified: rawHost['user verified?']
  })
}

/**
 * Transform guest data from Bubble.io format
 * @pure
 * @param {Object} rawGuest - Raw guest object from Supabase
 * @returns {Object|null} Transformed guest object
 */
export function transformGuestData(rawGuest) {
  if (isNullish(rawGuest)) return null

  return Object.freeze({
    id: rawGuest._id,
    firstName: rawGuest['Name - First'],
    lastName: rawGuest['Name - Last'],
    fullName: rawGuest['Name - Full'],
    profilePhoto: rawGuest['Profile Photo'],
    bio: rawGuest['About Me / Bio'],
    linkedInVerified: rawGuest['Verify - Linked In ID'],
    phoneVerified: rawGuest['Verify - Phone'],
    userVerified: rawGuest['user verified?']
  })
}

/**
 * Transform virtual meeting data from Bubble.io format
 * @pure
 * @param {Object} rawVirtualMeeting - Raw virtual meeting object from Supabase
 * @returns {Object|null} Transformed virtual meeting object
 */
export function transformVirtualMeetingData(rawVirtualMeeting) {
  if (isNullish(rawVirtualMeeting)) return null

  return Object.freeze({
    id: rawVirtualMeeting._id,
    bookedDate: rawVirtualMeeting['booked date'],
    confirmedBySplitlease: rawVirtualMeeting.confirmedBySplitLease,
    meetingLink: rawVirtualMeeting['meeting link'],
    meetingDeclined: rawVirtualMeeting['meeting declined'],
    requestedBy: rawVirtualMeeting['requested by'],
    suggestedTimeslots: rawVirtualMeeting['suggested dates and times'],
    guestName: rawVirtualMeeting['guest name'],
    hostName: rawVirtualMeeting['host name'],
    proposalId: rawVirtualMeeting.proposal
  })
}

/**
 * Transform complete proposal data from Bubble.io format
 * Includes nested transformations for listing, host, and virtual meeting
 * @pure
 * @param {Object} rawProposal - Raw proposal object from Supabase
 * @returns {Object|null} Transformed proposal object
 */
export function transformProposalData(rawProposal) {
  if (isNullish(rawProposal)) return null

  const rawListing = rawProposal.listing
  const rawHost = rawListing?.host
  const rawGuest = rawProposal.guest
  const rawVirtualMeeting = rawProposal.virtualMeeting

  return Object.freeze({
    id: rawProposal._id,
    status: rawProposal.Status,
    deleted: rawProposal.Deleted,
    daysSelected: rawProposal['Days Selected'],
    nightsSelected: rawProposal['Nights Selected (Nights list)'],
    reservationWeeks: rawProposal['Reservation Span (Weeks)'],
    nightsPerWeek: rawProposal['nights per week (num)'],
    checkInDay: rawProposal['check in day'],
    checkOutDay: rawProposal['check out day'],
    moveInStart: rawProposal['Move in range start'],
    moveInEnd: rawProposal['Move in range end'],
    totalPrice: rawProposal['Total Price for Reservation (guest)'],
    nightlyPrice: rawProposal['proposal nightly price'],
    cleaningFee: rawProposal['cleaning fee'],
    damageDeposit: rawProposal['damage deposit'],
    counterOfferHappened: rawProposal['counter offer happened'],
    hcDaysSelected: rawProposal['hc days selected'],
    hcReservationWeeks: rawProposal['hc reservation span (weeks)'],
    hcTotalPrice: rawProposal['hc total price'],
    hcNightlyPrice: rawProposal['hc nightly price'],
    createdDate: rawProposal['Created Date'],
    modifiedDate: rawProposal['Modified Date'],
    aboutYourself: rawProposal.about_yourself,
    specialNeeds: rawProposal.special_needs,
    reasonForCancellation: rawProposal['reason for cancellation'],
    proposalStage: rawProposal['Proposal Stage'],
    rentalApplicationId: rawProposal['rental application'],
    virtualMeetingId: rawProposal['virtual meeting'],
    isFinalized: rawProposal['Is Finalized'],
    houseRules: rawProposal.houseRules || [],
    listing: transformListingData(rawListing),
    host: transformHostData(rawHost),
    guest: transformGuestData(rawGuest),
    virtualMeeting: transformVirtualMeetingData(rawVirtualMeeting)
  })
}

/**
 * Default values for display text
 */
const DISPLAY_DEFAULTS = Object.freeze({
  HOST_NAME: 'Host',
  LISTING_NAME: 'Property'
})

/**
 * Get display text for proposal in dropdown
 * Format: "{host name} - {listing name}"
 * @pure
 * @param {Object} proposal - Transformed proposal object
 * @returns {string|null} Display text for dropdown option
 */
export function getProposalDisplayText(proposal) {
  if (isNullish(proposal)) return null

  const hostName = proposal.host?.firstName || proposal.host?.fullName || DISPLAY_DEFAULTS.HOST_NAME
  const listingName = proposal.listing?.name || DISPLAY_DEFAULTS.LISTING_NAME

  return `${hostName} - ${listingName}`
}

/**
 * Currency formatting options
 */
const CURRENCY_OPTIONS = Object.freeze({
  WITH_CENTS: Object.freeze({
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }),
  WITHOUT_CENTS: Object.freeze({
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
})

/**
 * Get currency formatter options based on cents preference
 * @pure
 */
const getCurrencyOptions = (includeCents) =>
  includeCents ? CURRENCY_OPTIONS.WITH_CENTS : CURRENCY_OPTIONS.WITHOUT_CENTS

/**
 * Format price for display
 * @pure
 * @param {number} price - Price value
 * @param {boolean} includeCents - Whether to include cents
 * @returns {string|null} Formatted price string
 */
export function formatPrice(price, includeCents = true) {
  if (!isValidPrice(price)) return null

  const formatter = new Intl.NumberFormat('en-US', getCurrencyOptions(includeCents))
  return formatter.format(price)
}

/**
 * Date formatting options
 */
const DATE_FORMAT_OPTIONS = Object.freeze({
  year: 'numeric',
  month: 'short',
  day: 'numeric'
})

/**
 * Convert to Date object if string
 * @pure
 */
const toDateObject = (date) =>
  typeof date === 'string' ? new Date(date) : date

/**
 * Format date for display
 * @pure
 * @param {string|Date} date - Date value
 * @returns {string|null} Formatted date string
 */
export function formatDate(date) {
  if (!isValidDate(date)) return null

  const dateObj = toDateObject(date)
  return dateObj.toLocaleDateString('en-US', DATE_FORMAT_OPTIONS)
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Predicates
  isNullish,
  isNonEmptyString,
  isAddressObject,
  isValidPrice,
  isValidDate,

  // Helpers
  extractAddressString,
  getCurrencyOptions,
  toDateObject,

  // Constants
  DISPLAY_DEFAULTS,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS
})
