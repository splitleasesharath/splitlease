/**
 * Calculate borough match score for a candidate listing.
 *
 * @intent Score geographic proximity between candidate and proposal listings.
 * @rule Same borough = 25 points (full match).
 * @rule Adjacent borough = 15 points (partial match).
 * @rule Different/non-adjacent = 0 points.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing object.
 * @param {object} params.proposal - Proposal object with nested listing data.
 * @returns {number} Score from 0-25.
 *
 * @example
 * calculateBoroughScore({
 *   candidateListing: { boroughName: 'Manhattan' },
 *   proposal: { listing: { boroughName: 'Manhattan' } }
 * })
 * // => 25 (exact match)
 *
 * calculateBoroughScore({
 *   candidateListing: { boroughName: 'Brooklyn' },
 *   proposal: { listing: { boroughName: 'Manhattan' } }
 * })
 * // => 15 (adjacent)
 */
import { isBoroughAdjacent } from '../../rules/matching/isBoroughAdjacent.js';
import { MATCH_WEIGHTS } from './constants.js';

export function calculateBoroughScore({ candidateListing, proposal }) {
  if (!candidateListing || !proposal) {
    return 0;
  }

  // Extract borough names from both objects, checking multiple possible field names
  const candidateBorough =
    candidateListing.boroughName ||
    candidateListing['Location - Borough'] ||
    null;

  const proposalBorough =
    proposal.listing?.boroughName ||
    proposal.listing?.borough ||
    proposal.listing?.['Location - Borough'] ||
    null;

  if (!candidateBorough || !proposalBorough) {
    return 0;
  }

  const normalizedCandidate = candidateBorough.toLowerCase().trim();
  const normalizedProposal = proposalBorough.toLowerCase().trim();

  // Exact match = full points
  if (normalizedCandidate === normalizedProposal) {
    return MATCH_WEIGHTS.BOROUGH;
  }

  // Adjacent match = partial points (60% of full)
  if (isBoroughAdjacent({ borough1: normalizedProposal, borough2: normalizedCandidate })) {
    return 15;
  }

  // No match
  return 0;
}
