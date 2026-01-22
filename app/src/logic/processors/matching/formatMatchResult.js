/**
 * Format match result with score breakdown for UI display.
 *
 * @intent Transform raw match scores into user-friendly display format.
 * @rule Includes score breakdown with labels and max values.
 * @rule Assigns tier label based on total score.
 * @rule Provides percentage for visual progress indicators.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.listing - The candidate listing (adapted).
 * @param {object} params.scores - Score object from calculateMatchScore.
 * @returns {object} Formatted match result for UI.
 *
 * @example
 * formatMatchResult({
 *   listing: { id: 'abc123', name: 'Nice Apartment', boroughName: 'Manhattan' },
 *   scores: {
 *     totalScore: 85,
 *     breakdown: {
 *       boroughMatch: 25,
 *       priceProximity: 20,
 *       scheduleOverlap: 20,
 *       weeklyStaySupport: 15,
 *       durationMatch: 10,
 *       hostVerified: 5,
 *       priceDrop: 0
 *     },
 *     maxPossibleScore: 95
 *   }
 * })
 * // => {
 * //   listing: { ... },
 * //   totalScore: 85,
 * //   scorePercent: 89,
 * //   tier: 'excellent',
 * //   breakdown: { ... with labels and max values }
 * // }
 */
import { SCORE_TIERS, TIER_LABELS, MATCH_WEIGHTS, MAX_POSSIBLE_SCORE } from '../../calculators/matching/constants.js';

/**
 * Get tier label based on total score.
 *
 * @param {number} score - Total match score.
 * @returns {string} Tier label (excellent, good, fair, poor).
 */
export function getTier(score) {
  if (score >= SCORE_TIERS.EXCELLENT) {
    return TIER_LABELS.EXCELLENT;
  }
  if (score >= SCORE_TIERS.GOOD) {
    return TIER_LABELS.GOOD;
  }
  if (score >= SCORE_TIERS.FAIR) {
    return TIER_LABELS.FAIR;
  }
  return TIER_LABELS.POOR;
}

/**
 * Format match result for UI display.
 */
export function formatMatchResult({ listing, scores }) {
  if (!listing) {
    throw new Error('formatMatchResult: listing is required');
  }

  if (!scores) {
    throw new Error('formatMatchResult: scores is required');
  }

  const { totalScore, breakdown, maxPossibleScore } = scores;

  // Calculate percentage
  const maxScore = maxPossibleScore || MAX_POSSIBLE_SCORE;
  const scorePercent = Math.round((totalScore / maxScore) * 100);

  // Assign tier
  const tier = getTier(totalScore);

  // Format breakdown with labels and max values
  const formattedBreakdown = {
    borough: {
      score: breakdown.boroughMatch,
      max: MATCH_WEIGHTS.BOROUGH,
      label: 'Location Match',
      description: breakdown.boroughMatch === MATCH_WEIGHTS.BOROUGH
        ? 'Same borough'
        : breakdown.boroughMatch > 0
          ? 'Adjacent borough'
          : 'Different area'
    },
    price: {
      score: breakdown.priceProximity,
      max: MATCH_WEIGHTS.PRICE,
      label: 'Price Match',
      description: breakdown.priceProximity === MATCH_WEIGHTS.PRICE
        ? 'Within 10% of budget'
        : breakdown.priceProximity >= 15
          ? 'Within 20% of budget'
          : breakdown.priceProximity >= 10
            ? 'Within 30% of budget'
            : breakdown.priceProximity > 0
              ? 'Within 50% of budget'
              : 'Over budget'
    },
    schedule: {
      score: breakdown.scheduleOverlap,
      max: MATCH_WEIGHTS.SCHEDULE,
      label: 'Schedule Compatibility',
      description: breakdown.scheduleOverlap === MATCH_WEIGHTS.SCHEDULE
        ? 'Full schedule match'
        : breakdown.scheduleOverlap > 0
          ? `${Math.round((breakdown.scheduleOverlap / MATCH_WEIGHTS.SCHEDULE) * 100)}% day overlap`
          : 'No schedule overlap'
    },
    weeklyStay: {
      score: breakdown.weeklyStaySupport,
      max: MATCH_WEIGHTS.WEEKLY_STAY,
      label: 'Weekly Stays',
      description: breakdown.weeklyStaySupport > 0
        ? 'Supports weekly stays'
        : 'Limited availability'
    },
    duration: {
      score: breakdown.durationMatch,
      max: MATCH_WEIGHTS.DURATION,
      label: 'Duration Match',
      description: breakdown.durationMatch > 0
        ? 'Matches stay length'
        : 'Different min nights'
    },
    host: {
      score: breakdown.hostVerified,
      max: MATCH_WEIGHTS.HOST,
      label: 'Host Trust',
      description: breakdown.hostVerified >= 5
        ? 'Fully verified host'
        : breakdown.hostVerified >= 3
          ? 'Verified host'
          : breakdown.hostVerified > 0
            ? 'Partially verified'
            : 'New host'
    }
  };

  return {
    listing,
    totalScore,
    scorePercent,
    tier,
    tierDisplay: tier.charAt(0).toUpperCase() + tier.slice(1),
    breakdown: formattedBreakdown,
    maxPossibleScore: maxScore
  };
}
