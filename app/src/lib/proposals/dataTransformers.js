/**
 * Data Transformation Utilities for Guest Proposals
 * Transforms Bubble.io data structure to cleaner, more usable format
 *
 * Handles:
 * - Field name normalization (removes spaces, special characters)
 * - Nested object flattening
 * - Type conversions
 * - Default values for missing data
 */

/**
 * Transform user data from Bubble.io format
 *
 * @param {Object} rawUser - Raw user object from Supabase
 * @returns {Object} Transformed user object
 */
export function transformUserData(rawUser) {
  if (!rawUser) return null;

  return {
    id: rawUser._id,
    firstName: rawUser['Name - First'],
    lastName: rawUser['Name - Last'],
    fullName: rawUser['Name - Full'],
    profilePhoto: rawUser['Profile Photo'],
    proposalsList: rawUser['Proposals List']
  };
}

/**
 * Transform listing data from Bubble.io format
 *
 * @param {Object} rawListing - Raw listing object from Supabase
 * @returns {Object} Transformed listing object
 */
export function transformListingData(rawListing) {
  if (!rawListing) return null;

  // Extract address from JSONB structure
  const addressData = rawListing['Location - Address'];
  const addressString = typeof addressData === 'object' && addressData?.address
    ? addressData.address
    : (typeof addressData === 'string' ? addressData : null);

  return {
    id: rawListing._id,
    name: rawListing.Name,
    description: rawListing.Description,
    address: addressString,
    addressData: addressData, // Keep full JSONB for map coordinates
    borough: rawListing['Location - Borough'],
    hood: rawListing['Location - Hood'],
    boroughName: rawListing.boroughName, // Resolved name from lookup table
    hoodName: rawListing.hoodName, // Resolved name from lookup table
    city: rawListing['Location - City'],
    state: rawListing['Location - State'],
    zipCode: rawListing['Location - Zip Code'],
    photos: rawListing['Features - Photos'],
    featuredPhotoUrl: rawListing.featuredPhotoUrl, // Featured photo from listing_photo table
    houseRules: rawListing.houseRules || [], // Use resolved house rules from query layer
    checkInTime: rawListing['NEW Date Check-in Time'],
    checkOutTime: rawListing['NEW Date Check-out Time']
  };
}

/**
 * Transform host data from Bubble.io format
 *
 * @param {Object} rawHost - Raw host object from Supabase
 * @returns {Object} Transformed host object
 */
export function transformHostData(rawHost) {
  if (!rawHost) return null;

  return {
    id: rawHost._id,
    firstName: rawHost['Name - First'],
    lastName: rawHost['Name - Last'],
    fullName: rawHost['Name - Full'],
    profilePhoto: rawHost['Profile Photo'],
    bio: rawHost['About Me / Bio'],
    linkedInVerified: rawHost['Verify - Linked In ID'],
    phoneVerified: rawHost['Verify - Phone'],
    userVerified: rawHost['user verified?']
  };
}

/**
 * Transform guest data from Bubble.io format
 *
 * @param {Object} rawGuest - Raw guest object from Supabase
 * @returns {Object} Transformed guest object
 */
export function transformGuestData(rawGuest) {
  if (!rawGuest) return null;

  return {
    id: rawGuest._id,
    firstName: rawGuest['Name - First'],
    lastName: rawGuest['Name - Last'],
    fullName: rawGuest['Name - Full'],
    profilePhoto: rawGuest['Profile Photo'],
    bio: rawGuest['About Me / Bio'],
    linkedInVerified: rawGuest['Verify - Linked In ID'],
    phoneVerified: rawGuest['Verify - Phone'],
    userVerified: rawGuest['user verified?']
  };
}

/**
 * Transform virtual meeting data from Bubble.io format
 *
 * @param {Object} rawVirtualMeeting - Raw virtual meeting object from Supabase
 * @returns {Object} Transformed virtual meeting object
 */
export function transformVirtualMeetingData(rawVirtualMeeting) {
  if (!rawVirtualMeeting) return null;

  return {
    id: rawVirtualMeeting._id,
    bookedDate: rawVirtualMeeting['booked date'],
    confirmedBySplitlease: rawVirtualMeeting.confirmedBySplitLease,
    meetingLink: rawVirtualMeeting['meeting link'],
    meetingDeclined: rawVirtualMeeting['meeting declined'],
    requestedBy: rawVirtualMeeting['requested by'],
    suggestedTimeslots: rawVirtualMeeting['suggested dates and times'], // JSONB array of ISO datetimes
    guestName: rawVirtualMeeting['guest name'],
    hostName: rawVirtualMeeting['host name'],
    proposalId: rawVirtualMeeting.proposal
  };
}

/**
 * Transform complete proposal data from Bubble.io format
 * Includes nested transformations for listing, host, and virtual meeting
 *
 * @param {Object} rawProposal - Raw proposal object from Supabase
 * @returns {Object} Transformed proposal object
 */
export function transformProposalData(rawProposal) {
  if (!rawProposal) return null;

  // Extract nested data
  const rawListing = rawProposal.listing;
  const rawHost = rawListing?.host;
  const rawGuest = rawProposal.guest;
  const rawVirtualMeeting = rawProposal.virtualMeeting;

  return {
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

    // House rules (resolved from query layer)
    houseRules: rawProposal.houseRules || [],

    // Nested transformed data
    listing: transformListingData(rawListing),
    host: transformHostData(rawHost),
    guest: transformGuestData(rawGuest),
    virtualMeeting: transformVirtualMeetingData(rawVirtualMeeting)
  };
}

/**
 * Get display text for proposal in dropdown
 * Format: "{host name} - {listing name}"
 * Shows the host who owns the listing, allowing guests to identify proposals by host
 *
 * @param {Object} proposal - Transformed proposal object
 * @returns {string} Display text for dropdown option
 */
export function getProposalDisplayText(proposal) {
  if (!proposal) return null;

  const hostName = proposal.host?.firstName || proposal.host?.fullName || 'Host';
  const listingName = proposal.listing?.name || 'Property';

  return `${hostName} - ${listingName}`;
}

// Re-export canonical price formatter with cents by default
export { formatPriceWithCents as formatPrice } from '../formatters/priceFormatter.js';

/**
 * Format date for display
 *
 * @param {string|Date} date - Date value
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
