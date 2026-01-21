/**
 * Calculate overall match score for a candidate listing.
 *
 * @intent Master scoring function combining all matching heuristics.
 * @rule Sums individual scores for borough, price, schedule, weekly stay, duration, and host.
 * @rule Maximum possible score is 95 (price drop heuristic not implemented).
 * @rule Returns breakdown for transparency and debugging.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing with all fields.
 * @param {object} params.proposal - Proposal object with nested listing/host data.
 * @param {object} params.hostData - Host/user data for candidate listing.
 * @returns {object} { totalScore, breakdown, maxPossibleScore }
 *
 * @example
 * calculateMatchScore({
 *   candidateListing: {
 *     boroughName: 'Manhattan',
 *     '💰Nightly Host Rate for 4 nights': 105,
 *     'Schedule days available': [0, 1, 2, 3, 4, 5, 6],
 *     'Minimum Nights': 4
 *   },
 *   proposal: {
 *     nightlyPrice: 100,
 *     nightsPerWeek: 4,
 *     daysSelected: [1, 2, 3, 4],
 *     listing: { boroughName: 'Manhattan' }
 *   },
 *   hostData: {
 *     'Verify - Linked In ID': true,
 *     'Verify - Phone': true,
 *     'user verified?': false
 *   }
 * })
 * // => {
 * //   totalScore: 90,
 * //   breakdown: {
 * //     boroughMatch: 25,
 * //     priceProximity: 20,
 * //     scheduleOverlap: 20,
 * //     weeklyStaySupport: 15,
 * //     durationMatch: 10,
 * //     hostVerified: 3,
 * //     priceDrop: 0
 * //   },
 * //   maxPossibleScore: 95
 * // }
 */
import { calculateBoroughScore } from './calculateBoroughScore.js';
import { calculatePriceScore } from './calculatePriceScore.js';
import { calculateScheduleOverlapScore } from './calculateScheduleOverlapScore.js';
import { calculateWeeklyStayScore } from './calculateWeeklyStayScore.js';
import { calculateDurationScore } from './calculateDurationScore.js';
import { calculateHostScore } from './calculateHostScore.js';
import { MAX_POSSIBLE_SCORE } from './constants.js';

export function calculateMatchScore({ candidateListing, proposal, hostData }) {
  // Calculate individual scores
  const scores = {
    boroughMatch: calculateBoroughScore({ candidateListing, proposal }),           // 0-25
    priceProximity: calculatePriceScore({ candidateListing, proposal }),           // 0-20
    scheduleOverlap: calculateScheduleOverlapScore({ candidateListing, proposal }), // 0-20
    weeklyStaySupport: calculateWeeklyStayScore({ candidateListing }),             // 0-15
    durationMatch: calculateDurationScore({ candidateListing, proposal }),          // 0-10
    hostVerified: calculateHostScore({ hostData }),                                 // 0-5
    priceDrop: 0 // Not implemented (no price history tracking)                     // 0
  };

  // Sum all scores
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  return {
    totalScore,
    breakdown: scores,
    maxPossibleScore: MAX_POSSIBLE_SCORE
  };
}
