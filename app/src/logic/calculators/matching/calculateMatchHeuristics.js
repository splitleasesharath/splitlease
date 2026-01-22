/**
 * Calculate detailed heuristics for a match (boolean flags).
 *
 * @intent Provide granular boolean indicators for each matching criterion.
 * @rule Returns true/false for each heuristic for UI display or filtering.
 * @rule Useful for displaying match reasoning to users.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing with all fields.
 * @param {object} params.proposal - Proposal object with nested listing/host data.
 * @param {object} params.hostData - Host/user data for candidate listing.
 * @returns {object} Boolean flags for each heuristic.
 *
 * @example
 * calculateMatchHeuristics({
 *   candidateListing: { boroughName: 'Manhattan', ... },
 *   proposal: { ... },
 *   hostData: { ... }
 * })
 * // => {
 * //   boroughMatch: true,
 * //   boroughAdjacent: false,
 * //   priceWithin10Percent: true,
 * //   priceWithin20Percent: true,
 * //   priceWithin30Percent: true,
 * //   hasScheduleOverlap: true,
 * //   hasFullScheduleOverlap: true,
 * //   supportsWeeklyStays: true,
 * //   durationMatch: true,
 * //   hostVerified: true,
 * //   priceDrop: false
 * // }
 */
import { isBoroughMatch } from '../../rules/matching/isBoroughMatch.js';
import { isBoroughAdjacent } from '../../rules/matching/isBoroughAdjacent.js';
import { hasScheduleCompatibility } from '../../rules/matching/hasScheduleCompatibility.js';
import { supportsWeeklyStays } from '../../rules/matching/supportsWeeklyStays.js';
import { isDurationMatch } from '../../rules/matching/isDurationMatch.js';
import { isVerifiedHost } from '../../rules/matching/isVerifiedHost.js';
import { calculatePriceProximity } from './calculatePriceProximity.js';
import { getNightlyRateByFrequency } from '../pricing/getNightlyRateByFrequency.js';
import { PRICE_THRESHOLDS } from './constants.js';

export function calculateMatchHeuristics({ candidateListing, proposal, hostData }) {
  // Extract boroughs
  const candidateBorough =
    candidateListing?.boroughName ||
    candidateListing?.['Location - Borough'] ||
    null;

  const proposalBorough =
    proposal?.listing?.boroughName ||
    proposal?.listing?.borough ||
    proposal?.listing?.['Location - Borough'] ||
    null;

  // Calculate price proximity
  let proximity = null;
  try {
    const nightsPerWeek =
      proposal?.nightsPerWeek ||
      proposal?.daysSelected?.length ||
      4;

    const proposalNightlyRate = proposal?.nightlyPrice;
    const candidateNightlyRate = getNightlyRateByFrequency({
      listing: candidateListing,
      nightsSelected: nightsPerWeek
    });

    if (proposalNightlyRate && candidateNightlyRate) {
      proximity = calculatePriceProximity({
        candidateNightlyRate,
        proposalNightlyRate
      });
    }
  } catch {
    // Price proximity calculation failed, leave as null
  }

  // Calculate schedule compatibility
  const scheduleResult = hasScheduleCompatibility({ candidateListing, proposal });

  // Borough checks
  const isExactBoroughMatch =
    candidateBorough &&
    proposalBorough &&
    candidateBorough.toLowerCase().trim() === proposalBorough.toLowerCase().trim();

  const isAdjacentBorough = isBoroughAdjacent({
    borough1: proposalBorough,
    borough2: candidateBorough
  });

  return {
    // Borough heuristics
    boroughMatch: isBoroughMatch({ candidateBorough, proposalBorough }),
    boroughExact: isExactBoroughMatch,
    boroughAdjacent: isAdjacentBorough,

    // Price heuristics
    priceWithin10Percent: proximity !== null && proximity <= PRICE_THRESHOLDS.WITHIN_10_PERCENT,
    priceWithin20Percent: proximity !== null && proximity <= PRICE_THRESHOLDS.WITHIN_20_PERCENT,
    priceWithin30Percent: proximity !== null && proximity <= PRICE_THRESHOLDS.WITHIN_30_PERCENT,
    priceWithin50Percent: proximity !== null && proximity <= PRICE_THRESHOLDS.WITHIN_50_PERCENT,

    // Schedule heuristics
    hasScheduleOverlap: scheduleResult.compatible,
    hasFullScheduleOverlap:
      scheduleResult.compatible &&
      scheduleResult.overlapDays === scheduleResult.requestedDays,
    scheduleOverlapPercent:
      scheduleResult.requestedDays > 0
        ? Math.round((scheduleResult.overlapDays / scheduleResult.requestedDays) * 100)
        : 0,

    // Weekly stay heuristic
    supportsWeeklyStays: supportsWeeklyStays({ listing: candidateListing }),

    // Duration heuristic
    durationMatch: isDurationMatch({ listing: candidateListing, proposal }),

    // Host heuristic
    hostVerified: isVerifiedHost({ host: hostData }),

    // Price drop (not implemented)
    priceDrop: false
  };
}
