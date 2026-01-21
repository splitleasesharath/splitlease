/**
 * Calculate price proximity ratio between candidate listing and proposal.
 *
 * @intent Measure how close candidate pricing is to proposal budget.
 * @rule Returns absolute difference as decimal ratio (0.0 = exact match).
 * @rule Uses matching night count for fair comparison.
 * @rule Throws if proposal nightly price is missing or invalid.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.candidateNightlyRate - Candidate listing's nightly rate.
 * @param {number} params.proposalNightlyRate - Proposal's nightly rate.
 * @returns {number} Price difference as decimal (e.g., 0.15 = 15% difference).
 *
 * @throws {Error} If proposalNightlyRate is missing, zero, or invalid.
 *
 * @example
 * calculatePriceProximity({
 *   candidateNightlyRate: 115,
 *   proposalNightlyRate: 100
 * })
 * // => 0.15 (15% higher)
 *
 * calculatePriceProximity({
 *   candidateNightlyRate: 85,
 *   proposalNightlyRate: 100
 * })
 * // => 0.15 (15% lower - absolute value)
 */
export function calculatePriceProximity({ candidateNightlyRate, proposalNightlyRate }) {
  // Validate proposal rate
  if (typeof proposalNightlyRate !== 'number' || isNaN(proposalNightlyRate)) {
    throw new Error(
      `calculatePriceProximity: proposalNightlyRate must be a valid number, got ${typeof proposalNightlyRate}`
    );
  }

  if (proposalNightlyRate <= 0) {
    throw new Error(
      'calculatePriceProximity: proposalNightlyRate must be greater than 0'
    );
  }

  // Validate candidate rate
  if (typeof candidateNightlyRate !== 'number' || isNaN(candidateNightlyRate)) {
    throw new Error(
      `calculatePriceProximity: candidateNightlyRate must be a valid number, got ${typeof candidateNightlyRate}`
    );
  }

  if (candidateNightlyRate < 0) {
    throw new Error(
      'calculatePriceProximity: candidateNightlyRate cannot be negative'
    );
  }

  const priceDifference = Math.abs(candidateNightlyRate - proposalNightlyRate);
  const proximityRatio = priceDifference / proposalNightlyRate;

  return proximityRatio;
}
