/**
 * Calculate weekly stay support score for a candidate listing.
 *
 * @intent Score listing's ability to accommodate 7-night stays.
 * @rule Supports weekly stays = 15 points.
 * @rule Does not support = 0 points.
 * @rule Uses supportsWeeklyStays rule for determination.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing object.
 * @returns {number} Score: 0 or 15.
 *
 * @example
 * calculateWeeklyStayScore({
 *   candidateListing: {
 *     'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
 *     'Minimum Nights': 3
 *   }
 * })
 * // => 15 (supports weekly stays)
 *
 * calculateWeeklyStayScore({
 *   candidateListing: {
 *     'Schedule days available': [1, 2, 3, 4, 5],
 *     'Minimum Nights': 2
 *   }
 * })
 * // => 0 (does not support weekly stays)
 */
import { supportsWeeklyStays } from '../../rules/matching/supportsWeeklyStays.js';
import { MATCH_WEIGHTS } from './constants.js';

export function calculateWeeklyStayScore({ candidateListing }) {
  if (!candidateListing) {
    return 0;
  }

  const supports = supportsWeeklyStays({ listing: candidateListing });

  return supports ? MATCH_WEIGHTS.WEEKLY_STAY : 0;
}
