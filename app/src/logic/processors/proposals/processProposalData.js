/**
 * Proposal Data Processor
 *
 * PILLAR III: Data Processors (The "Truth" Layer)
 *
 * This processor transforms raw Supabase/Bubble.io data into clean,
 * validated internal shapes. It enforces the "No Fallback" principle
 * by throwing explicit errors for missing critical data.
 *
 * Intent: Create safe, typed objects for UI consumption, enforcing data integrity.
 */

import { formatPrice } from '../../../lib/priceCalculations.js';

// Re-export for backwards compatibility
export { formatPrice };

/**
 * Transform raw listing data from Bubble.io format
 * @param {Object} rawListing - Raw listing object from Supabase
 * @returns {Object} Transformed listing object
 * @throws {Error} If rawListing is null/undefined
 */
export function processListingData(rawListing) {
  if (!rawListing) {
    throw new Error('processListingData: Listing data is required');
  }

  // Extract address from JSONB structure
  const addressData = rawListing['Location - Address'];
  const addressString = typeof addressData === 'object' && addressData?.address
    ? addressData.address
    : (typeof addressData === 'string' ? addressData : null);

  return {
    id: rawListing._id,
    name: rawListing.Name || 'Untitled Listing',
    description: rawListing.Description || null,
    address: addressString,
    addressData: addressData, // Keep full JSONB for map coordinates
    borough: rawListing['Location - Borough'] || null,
    hood: rawListing['Location - Hood'] || null,
    boroughName: rawListing.boroughName || null, // Resolved name from lookup table
    hoodName: rawListing.hoodName || null, // Resolved name from lookup table
    photos: rawListing['Features - Photos'] || [],
    featuredPhotoUrl: rawListing.featuredPhotoUrl || null,
    houseRules: rawListing.houseRules || [],
    checkInTime: rawListing['NEW Date Check-in Time'] || null,
    checkOutTime: rawListing['NEW Date Check-out Time'] || null,
    hostUserId: rawListing['Host User'] || null
  };
}

/**
 * Transform raw host data from Bubble.io format
 * @param {Object} rawHost - Raw host object from Supabase
 * @returns {Object} Transformed host object
 * @throws {Error} If rawHost is null/undefined
 */
export function processHostData(rawHost) {
  if (!rawHost) {
    throw new Error('processHostData: Host data is required');
  }

  return {
    id: rawHost._id,
    firstName: rawHost['Name - First'] || null,
    lastName: rawHost['Name - Last'] || null,
    fullName: rawHost['Name - Full'] || null,
    profilePhoto: rawHost['Profile Photo'] || null,
    bio: rawHost['About Me / Bio'] || null,
    linkedInVerified: rawHost['Verify - Linked In ID'] || false,
    phoneVerified: rawHost['Verify - Phone'] || false,
    userVerified: rawHost['user verified?'] || false,
    // hostUserId same as user._id after migration (Host User column contains user._id directly)
    hostUserId: rawHost._id || null
  };
}

/**
 * Transform raw virtual meeting data from Bubble.io format
 * @param {Object} rawVirtualMeeting - Raw virtual meeting object from Supabase
 * @returns {Object} Transformed virtual meeting object
 * @throws {Error} If rawVirtualMeeting is null/undefined
 */
export function processVirtualMeetingData(rawVirtualMeeting) {
  if (!rawVirtualMeeting) {
    throw new Error('processVirtualMeetingData: Virtual meeting data is required');
  }

  return {
    id: rawVirtualMeeting._id,
    bookedDate: rawVirtualMeeting['booked date'] || null,
    confirmedBySplitlease: rawVirtualMeeting.confirmedBySplitLease || false,
    meetingLink: rawVirtualMeeting['meeting link'] || null,
    meetingDeclined: rawVirtualMeeting['meeting declined'] || false,
    requestedBy: rawVirtualMeeting['requested by'] || null,
    suggestedTimeslots: rawVirtualMeeting['suggested dates and times'] || [],
    guestName: rawVirtualMeeting['guest name'] || null,
    hostName: rawVirtualMeeting['host name'] || null,
    proposalId: rawVirtualMeeting.proposal || null,
    uniqueId: rawVirtualMeeting.unique_id || null
  };
}

/**
 * Transform complete proposal data from Bubble.io format
 * Includes nested transformations for listing, host, and virtual meeting
 *
 * @param {Object} rawProposal - Raw proposal object from Supabase
 * @returns {Object} Transformed proposal object
 */
export function processProposalData(rawProposal) {
  if (!rawProposal) {
    throw new Error('processProposalData: Proposal data is required');
  }

  if (!rawProposal._id) {
    throw new Error('processProposalData: Proposal ID (_id) is required');
  }

  // Extract and transform nested data
  const listing = processListingData(rawProposal.listing);
  const host = processHostData(rawProposal.listing?.host);
  const virtualMeeting = processVirtualMeetingData(rawProposal.virtualMeeting);

  return {
    // Core identifiers
    id: rawProposal._id,
    _id: rawProposal._id, // Keep for compatibility

    // Status and state
    status: rawProposal.Status || 'Unknown',
    deleted: rawProposal.Deleted || false,

    // Schedule - Original proposal terms
    daysSelected: rawProposal['Days Selected'] || [],
    nightsSelected: rawProposal['Nights Selected (Nights list)'] || [],
    reservationWeeks: rawProposal['Reservation Span (Weeks)'] || 0,
    nightsPerWeek: rawProposal['nights per week (num)'] || 0,
    checkInDay: rawProposal['check in day'] || null,
    checkOutDay: rawProposal['check out day'] || null,
    moveInStart: rawProposal['Move in range start'] || null,
    moveInEnd: rawProposal['Move in range end'] || null,

    // Pricing - Original proposal terms
    totalPrice: rawProposal['Total Price for Reservation (guest)'] || 0,
    nightlyPrice: rawProposal['proposal nightly price'] || 0,
    cleaningFee: rawProposal['cleaning fee'] || 0,
    damageDeposit: rawProposal['damage deposit'] || 0,

    // Counteroffer fields (hc = host-changed)
    counterOfferHappened: rawProposal['counter offer happened'] || false,
    hcDaysSelected: rawProposal['hc days selected'] || null,
    hcReservationWeeks: rawProposal['hc reservation span (weeks)'] || null,
    hcNightsPerWeek: rawProposal['hc nights per week'] || null,
    hcCheckInDay: rawProposal['hc check in day'] || null,
    hcCheckOutDay: rawProposal['hc check out day'] || null,
    hcTotalPrice: rawProposal['hc total price'] || null,
    hcNightlyPrice: rawProposal['hc nightly price'] || null,
    hcCleaningFee: rawProposal['hc cleaning fee'] || null,
    hcDamageDeposit: rawProposal['hc damage deposit'] || null,
    hcHouseRules: rawProposal['hc house rules'] || null,

    // Metadata
    createdDate: rawProposal['Created Date'] || null,
    modifiedDate: rawProposal['Modified Date'] || null,
    aboutYourself: rawProposal.about_yourself || null,
    specialNeeds: rawProposal.special_needs || null,
    reasonForCancellation: rawProposal['reason for cancellation'] || null,
    proposalStage: rawProposal['Proposal Stage'] || null,
    isFinalized: rawProposal['Is Finalized'] || false,
    isSuggestedByHost: rawProposal['Is Suggested by Host'] || false,

    // Related IDs
    guestId: rawProposal.Guest || null,
    listingId: rawProposal.Listing || null,
    rentalApplicationId: rawProposal['rental application'] || null,
    virtualMeetingId: rawProposal['virtual meeting'] || null,

    // Nested transformed data
    listing,
    host,
    virtualMeeting,

    // House rules (resolved from listing or counteroffer)
    houseRules: rawProposal.houseRules || listing?.houseRules || []
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
  if (!proposal) return 'Unknown Proposal';

  const hostName = proposal.host?.firstName || proposal.host?.fullName || 'Host';
  const listingName = proposal.listing?.name || 'Property';

  return `${hostName} - ${listingName}`;
}

/**
 * Format date for display
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

/**
 * Format datetime for display
 * @param {string|Date} datetime - Datetime value
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(datetime) {
  if (!datetime) return null;

  const dateObj = typeof datetime === 'string' ? new Date(datetime) : datetime;

  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  });
}

/**
 * Get the effective terms for a proposal (counteroffer if exists, otherwise original)
 * @param {Object} proposal - Transformed proposal object
 * @returns {Object} Effective terms object
 */
export function getEffectiveTerms(proposal) {
  if (!proposal) {
    throw new Error('getEffectiveTerms: Proposal is required');
  }

  // If counteroffer happened and has values, use those
  if (proposal.counterOfferHappened) {
    return {
      daysSelected: proposal.hcDaysSelected || proposal.daysSelected,
      reservationWeeks: proposal.hcReservationWeeks || proposal.reservationWeeks,
      nightsPerWeek: proposal.hcNightsPerWeek || proposal.nightsPerWeek,
      checkInDay: proposal.hcCheckInDay || proposal.checkInDay,
      checkOutDay: proposal.hcCheckOutDay || proposal.checkOutDay,
      totalPrice: proposal.hcTotalPrice || proposal.totalPrice,
      nightlyPrice: proposal.hcNightlyPrice || proposal.nightlyPrice,
      cleaningFee: proposal.hcCleaningFee || proposal.cleaningFee,
      damageDeposit: proposal.hcDamageDeposit || proposal.damageDeposit,
      isCounteroffer: true
    };
  }

  // Otherwise use original terms
  return {
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
  };
}
