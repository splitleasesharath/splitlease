/**
 * Calculate host verification score for a candidate listing.
 *
 * @intent Score host trustworthiness based on verification status.
 * @rule 3 verifications = 5 points (full score).
 * @rule 2 verifications = 3 points.
 * @rule 1 verification = 1 point.
 * @rule 0 verifications = 0 points.
 * @rule Used as proxy for host responsiveness (no response rate data).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.hostData - Host/user object with verification fields.
 * @returns {number} Score from 0-5.
 *
 * @example
 * calculateHostScore({
 *   hostData: {
 *     'Verify - Linked In ID': true,
 *     'Verify - Phone': true,
 *     'user verified?': true
 *   }
 * })
 * // => 5 (3 verifications)
 *
 * calculateHostScore({
 *   hostData: {
 *     'Verify - Linked In ID': true,
 *     'Verify - Phone': false,
 *     'user verified?': false
 *   }
 * })
 * // => 1 (1 verification)
 */
import { countHostVerifications } from '../../rules/matching/isVerifiedHost.js';
import { MATCH_WEIGHTS } from './constants.js';

export function calculateHostScore({ hostData }) {
  if (!hostData) {
    return 0;
  }

  const verificationCount = countHostVerifications({ host: hostData });

  // Score mapping based on verification count
  switch (verificationCount) {
    case 3:
      return MATCH_WEIGHTS.HOST; // 5 points
    case 2:
      return 3;
    case 1:
      return 1;
    default:
      return 0;
  }
}
