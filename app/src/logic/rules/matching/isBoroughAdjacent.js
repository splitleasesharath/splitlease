/**
 * Check if two NYC boroughs are adjacent.
 *
 * @intent Determine geographic proximity between boroughs for partial scoring.
 * @rule Uses predefined NYC borough adjacency map.
 * @rule Case-insensitive comparison.
 * @rule Returns false for invalid or missing inputs.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.borough1 - First borough name.
 * @param {string} params.borough2 - Second borough name.
 * @returns {boolean} True if boroughs are adjacent, false otherwise.
 *
 * @example
 * isBoroughAdjacent({ borough1: 'Manhattan', borough2: 'Brooklyn' })
 * // => true
 *
 * isBoroughAdjacent({ borough1: 'Manhattan', borough2: 'Staten Island' })
 * // => false (not adjacent)
 */
import { NYC_BOROUGH_ADJACENCY } from '../../calculators/matching/constants.js';

export function isBoroughAdjacent({ borough1, borough2 }) {
  if (!borough1 || !borough2) {
    return false;
  }

  if (typeof borough1 !== 'string' || typeof borough2 !== 'string') {
    return false;
  }

  const normalizedBorough1 = borough1.toLowerCase().trim();
  const normalizedBorough2 = borough2.toLowerCase().trim();

  // Check if borough1's adjacency list includes borough2
  const adjacentToBorough1 = NYC_BOROUGH_ADJACENCY[normalizedBorough1];

  if (!adjacentToBorough1) {
    return false;
  }

  return adjacentToBorough1.includes(normalizedBorough2);
}
