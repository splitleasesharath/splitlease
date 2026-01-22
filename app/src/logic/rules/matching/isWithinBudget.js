/**
 * Check if listing price is within acceptable budget range.
 *
 * @intent Determine if candidate listing is affordable relative to proposal budget.
 * @rule Uses configurable threshold (default 50% above budget).
 * @rule Compares nightly rates for equivalent night counts.
 * @rule Returns false for missing or invalid price data.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.candidateNightlyRate - Candidate listing's nightly rate.
 * @param {number} params.proposalNightlyRate - Proposal's nightly rate budget.
 * @param {number} [params.maxOverBudgetPercent=0.50] - Maximum acceptable percentage over budget.
 * @returns {boolean} True if within budget tolerance, false otherwise.
 *
 * @example
 * isWithinBudget({
 *   candidateNightlyRate: 150,
 *   proposalNightlyRate: 100
 * })
 * // => true (50% over, within default 50% tolerance)
 *
 * isWithinBudget({
 *   candidateNightlyRate: 160,
 *   proposalNightlyRate: 100
 * })
 * // => false (60% over, exceeds default 50% tolerance)
 */
import { PRICE_THRESHOLDS } from '../../calculators/matching/constants.js';

export function isWithinBudget({
  candidateNightlyRate,
  proposalNightlyRate,
  maxOverBudgetPercent = PRICE_THRESHOLDS.WITHIN_50_PERCENT
}) {
  if (typeof candidateNightlyRate !== 'number' || typeof proposalNightlyRate !== 'number') {
    return false;
  }

  if (isNaN(candidateNightlyRate) || isNaN(proposalNightlyRate)) {
    return false;
  }

  if (proposalNightlyRate <= 0) {
    return false;
  }

  const priceDifference = candidateNightlyRate - proposalNightlyRate;
  const percentageDifference = priceDifference / proposalNightlyRate;

  // Within budget if not more than maxOverBudgetPercent above proposal rate
  return percentageDifference <= maxOverBudgetPercent;
}
