/**
 * Calculate price proximity score for a candidate listing.
 *
 * @intent Score how close candidate pricing is to proposal budget.
 * @rule Within 10% = 20 points (full score).
 * @rule Within 20% = 15 points.
 * @rule Within 30% = 10 points.
 * @rule Within 50% = 5 points.
 * @rule Over 50% = 0 points.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing object with pricing fields.
 * @param {object} params.proposal - Proposal object with nightly price and nights per week.
 * @returns {number} Score from 0-20.
 *
 * @example
 * calculatePriceScore({
 *   candidateListing: { '💰Nightly Host Rate for 4 nights': 105 },
 *   proposal: { nightlyPrice: 100, nightsPerWeek: 4 }
 * })
 * // => 20 (5% difference, within 10%)
 */
import { getNightlyRateByFrequency } from '../pricing/getNightlyRateByFrequency.js';
import { calculatePriceProximity } from './calculatePriceProximity.js';
import { MATCH_WEIGHTS, PRICE_THRESHOLDS } from './constants.js';

export function calculatePriceScore({ candidateListing, proposal }) {
  if (!candidateListing || !proposal) {
    return 0;
  }

  // Determine nights per week from proposal
  const nightsPerWeek =
    proposal.nightsPerWeek ||
    proposal.daysSelected?.length ||
    4; // Default to 4 if not specified

  // Get proposal nightly price
  const proposalNightlyRate = proposal.nightlyPrice;

  if (!proposalNightlyRate || proposalNightlyRate <= 0) {
    return 0;
  }

  // Get candidate nightly rate for same frequency
  let candidateNightlyRate;
  try {
    candidateNightlyRate = getNightlyRateByFrequency({
      listing: candidateListing,
      nightsSelected: nightsPerWeek
    });
  } catch {
    // If we can't get a rate for this frequency, return 0
    return 0;
  }

  if (!candidateNightlyRate || candidateNightlyRate <= 0) {
    return 0;
  }

  // Calculate proximity ratio
  let proximity;
  try {
    proximity = calculatePriceProximity({
      candidateNightlyRate,
      proposalNightlyRate
    });
  } catch {
    return 0;
  }

  // Score based on proximity thresholds
  if (proximity <= PRICE_THRESHOLDS.WITHIN_10_PERCENT) {
    return MATCH_WEIGHTS.PRICE; // 20 points
  }

  if (proximity <= PRICE_THRESHOLDS.WITHIN_20_PERCENT) {
    return 15;
  }

  if (proximity <= PRICE_THRESHOLDS.WITHIN_30_PERCENT) {
    return 10;
  }

  if (proximity <= PRICE_THRESHOLDS.WITHIN_50_PERCENT) {
    return 5;
  }

  return 0;
}
