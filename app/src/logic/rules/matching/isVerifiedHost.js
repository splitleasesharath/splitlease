/**
 * Check if host has sufficient verification status.
 *
 * @intent Determine host trustworthiness based on verification fields.
 * @rule Counts LinkedIn, Phone, and user verified fields.
 * @rule Host is "verified" if they have >= minimum verifications (default 2).
 * @rule Used as proxy for host responsiveness (no response rate data available).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.host - Host/user object with verification fields.
 * @param {number} [params.minVerifications=2] - Minimum verifications required.
 * @returns {boolean} True if host meets verification threshold.
 *
 * @example
 * isVerifiedHost({
 *   host: {
 *     'Verify - Linked In ID': true,
 *     'Verify - Phone': true,
 *     'user verified?': false
 *   }
 * })
 * // => true (2 verifications meet default minimum of 2)
 *
 * isVerifiedHost({
 *   host: {
 *     'Verify - Linked In ID': false,
 *     'Verify - Phone': true,
 *     'user verified?': false
 *   }
 * })
 * // => false (only 1 verification)
 */
import { MIN_HOST_VERIFICATIONS } from '../../calculators/matching/constants.js';

export function isVerifiedHost({ host, minVerifications = MIN_HOST_VERIFICATIONS }) {
  if (!host) {
    return false;
  }

  // Count verification fields
  const verifications = [
    host['Verify - Linked In ID'] || host.linkedInVerified || false,
    host['Verify - Phone'] || host.phoneVerified || false,
    host['user verified?'] || host.userVerified || false
  ];

  const verificationCount = verifications.filter(Boolean).length;

  return verificationCount >= minVerifications;
}

/**
 * Count the number of verifications a host has.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.host - Host/user object with verification fields.
 * @returns {number} Count of verifications (0-3).
 *
 * @example
 * countHostVerifications({
 *   host: {
 *     'Verify - Linked In ID': true,
 *     'Verify - Phone': true,
 *     'user verified?': true
 *   }
 * })
 * // => 3
 */
export function countHostVerifications({ host }) {
  if (!host) {
    return 0;
  }

  const verifications = [
    host['Verify - Linked In ID'] || host.linkedInVerified || false,
    host['Verify - Phone'] || host.phoneVerified || false,
    host['user verified?'] || host.userVerified || false
  ];

  return verifications.filter(Boolean).length;
}
