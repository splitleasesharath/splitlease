/**
 * Check if listing borough matches or is adjacent to proposal borough.
 *
 * @intent Determine if listing is in an acceptable location relative to proposal.
 * @rule Exact match returns true immediately.
 * @rule Adjacent borough also returns true (for partial scoring).
 * @rule Case-insensitive comparison.
 * @rule Returns false for invalid or missing inputs.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.candidateBorough - The candidate listing's borough.
 * @param {string} params.proposalBorough - The original proposal's desired borough.
 * @returns {boolean} True if match or adjacent, false otherwise.
 *
 * @example
 * isBoroughMatch({ candidateBorough: 'Manhattan', proposalBorough: 'Manhattan' })
 * // => true (exact match)
 *
 * isBoroughMatch({ candidateBorough: 'Brooklyn', proposalBorough: 'Manhattan' })
 * // => true (adjacent)
 *
 * isBoroughMatch({ candidateBorough: 'Staten Island', proposalBorough: 'Manhattan' })
 * // => false (not adjacent)
 */
import { isBoroughAdjacent } from './isBoroughAdjacent.js';

export function isBoroughMatch({ candidateBorough, proposalBorough }) {
  if (!candidateBorough || !proposalBorough) {
    return false;
  }

  if (typeof candidateBorough !== 'string' || typeof proposalBorough !== 'string') {
    return false;
  }

  const normalizedCandidate = candidateBorough.toLowerCase().trim();
  const normalizedProposal = proposalBorough.toLowerCase().trim();

  // Exact match
  if (normalizedCandidate === normalizedProposal) {
    return true;
  }

  // Adjacent borough match
  return isBoroughAdjacent({
    borough1: normalizedProposal,
    borough2: normalizedCandidate
  });
}
