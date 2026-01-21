/**
 * Adapt a raw listing record for the matching algorithm.
 *
 * @intent Transform raw database listing into normalized structure for matching.
 * @rule Extracts only fields relevant to matching algorithm.
 * @rule Normalizes field names from Bubble format.
 * @rule Includes host verification count for scoring.
 *
 * @param {object} rawListing - Raw listing object from Supabase/Bubble.
 * @returns {object} Adapted listing object for matching.
 *
 * @throws {Error} If rawListing is null or undefined.
 *
 * @example
 * adaptCandidateListing({
 *   _id: 'abc123',
 *   'Location - Borough': 'Manhattan',
 *   'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
 *   'Minimum Nights': 3,
 *   '💰Nightly Host Rate for 4 nights': 150,
 *   'Host User': 'host123'
 * })
 * // => {
 * //   id: 'abc123',
 * //   borough: 'Manhattan',
 * //   boroughName: 'Manhattan',
 * //   availableDays: [0, 1, 2, 3, 4, 5, 6],
 * //   minimumNights: 3,
 * //   pricing: { ... },
 * //   host: { id: 'host123', verifications: 0 }
 * // }
 */
import { countHostVerifications } from '../../rules/matching/isVerifiedHost.js';

export function adaptCandidateListing(rawListing) {
  if (!rawListing) {
    throw new Error('adaptCandidateListing: rawListing is required');
  }

  // Extract host data if nested
  const hostData = rawListing.host || null;

  // Extract address from JSONB structure
  const addressData = rawListing['Location - Address'];
  const addressString =
    typeof addressData === 'object' && addressData?.address
      ? addressData.address
      : typeof addressData === 'string'
        ? addressData
        : null;

  return {
    // Core identifiers
    id: rawListing._id,
    _id: rawListing._id, // Keep for compatibility

    // Name and description
    name: rawListing.Name || 'Untitled Listing',
    description: rawListing.Description || null,

    // Location
    borough: rawListing['Location - Borough'] || null,
    boroughName: rawListing.boroughName || rawListing['Location - Borough'] || null,
    hood: rawListing['Location - Hood'] || null,
    hoodName: rawListing.hoodName || null,
    address: addressString,

    // Availability & Scheduling
    availableDays: rawListing['Schedule days available'] || [],
    minimumNights: rawListing['Minimum Nights'] || null,
    blockedDates: rawListing['Blocked Dates'] || [],

    // Pricing (keep raw fields for getNightlyRateByFrequency)
    pricing: {
      rate2Nights: rawListing['💰Nightly Host Rate for 2 nights'] || null,
      rate3Nights: rawListing['💰Nightly Host Rate for 3 nights'] || null,
      rate4Nights: rawListing['💰Nightly Host Rate for 4 nights'] || null,
      rate5Nights: rawListing['💰Nightly Host Rate for 5 nights'] || null,
      rate6Nights: rawListing['💰Nightly Host Rate for 6 nights'] || null,
      rate7Nights: rawListing['💰Nightly Host Rate for 7 nights'] || null,
      cleaningFee: rawListing['💰Cleaning Cost / Maintenance Fee'] || 0,
      damageDeposit: rawListing['💰Damage Deposit'] || 0,
      priceOverride: rawListing['💰Price Override'] || null
    },

    // Keep original pricing fields for calculator compatibility
    '💰Nightly Host Rate for 1 night': rawListing['💰Nightly Host Rate for 1 night'] || null,
    '💰Nightly Host Rate for 2 nights': rawListing['💰Nightly Host Rate for 2 nights'] || null,
    '💰Nightly Host Rate for 3 nights': rawListing['💰Nightly Host Rate for 3 nights'] || null,
    '💰Nightly Host Rate for 4 nights': rawListing['💰Nightly Host Rate for 4 nights'] || null,
    '💰Nightly Host Rate for 5 nights': rawListing['💰Nightly Host Rate for 5 nights'] || null,
    '💰Nightly Host Rate for 6 nights': rawListing['💰Nightly Host Rate for 6 nights'] || null,
    '💰Nightly Host Rate for 7 nights': rawListing['💰Nightly Host Rate for 7 nights'] || null,
    '💰Price Override': rawListing['💰Price Override'] || null,

    // Keep original schedule field for calculator compatibility
    'Schedule days available': rawListing['Schedule days available'] || [],
    'Minimum Nights': rawListing['Minimum Nights'] || null,
    'Location - Borough': rawListing['Location - Borough'] || null,

    // Features
    bedrooms: rawListing['Features - Qty Bedrooms'] || null,
    bathrooms: rawListing['Features - Qty Bathrooms'] || null,
    photos: rawListing['Features - Photos'] || [],
    featuredPhotoUrl: rawListing.featuredPhotoUrl || null,

    // Host reference
    host: {
      id: rawListing['Host User'] || rawListing.Host || null,
      verifications: hostData ? countHostVerifications({ host: hostData }) : 0
    },

    // Status
    status: rawListing.Status || null
  };
}
