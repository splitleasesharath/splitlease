/**
 * Calculate duration match score for a candidate listing.
 *
 * @intent Score how well listing's minimum nights aligns with proposal duration.
 * @rule Exact match or within tolerance = 10 points.
 * @rule Outside tolerance = 0 points.
 * @rule Uses isDurationMatch rule for determination.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing object.
 * @param {object} params.proposal - Proposal object with nights per week.
 * @returns {number} Score: 0 or 10.
 *
 * @example
 * calculateDurationScore({
 *   candidateListing: { 'Minimum Nights': 4 },
 *   proposal: { nightsPerWeek: 4 }
 * })
 * // => 10 (exact match)
 *
 * calculateDurationScore({
 *   candidateListing: { 'Minimum Nights': 2 },
 *   proposal: { nightsPerWeek: 5 }
 * })
 * // => 0 (difference of 3 exceeds tolerance)
 */
import { isDurationMatch } from '../../rules/matching/isDurationMatch.js';
import { MATCH_WEIGHTS } from './constants.js';

export function calculateDurationScore({ candidateListing, proposal }) {
  if (!candidateListing || !proposal) {
    return 0;
  }

  const isMatch = isDurationMatch({
    listing: candidateListing,
    proposal
  });

  return isMatch ? MATCH_WEIGHTS.DURATION : 0;
}
