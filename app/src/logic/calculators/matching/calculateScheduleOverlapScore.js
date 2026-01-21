/**
 * Calculate schedule overlap score for a candidate listing.
 *
 * @intent Score how well candidate's available days match proposal's requested days.
 * @rule Score proportional to overlap ratio.
 * @rule 100% overlap = 20 points (full score).
 * @rule 0% overlap = 0 points.
 * @rule Both use 0-indexed days (0=Sunday through 6=Saturday).
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing with schedule data.
 * @param {object} params.proposal - Proposal with days selected.
 * @returns {number} Score from 0-20.
 *
 * @example
 * calculateScheduleOverlapScore({
 *   candidateListing: { 'Schedule days available': [1, 2, 3, 4, 5] },
 *   proposal: { daysSelected: [1, 2, 3, 4] }
 * })
 * // => 20 (100% of requested days available)
 *
 * calculateScheduleOverlapScore({
 *   candidateListing: { 'Schedule days available': [1, 2, 5, 6] },
 *   proposal: { daysSelected: [1, 2, 3, 4] }
 * })
 * // => 10 (50% overlap, 2 of 4 days)
 */
import { hasScheduleCompatibility } from '../../rules/matching/hasScheduleCompatibility.js';
import { MATCH_WEIGHTS } from './constants.js';

export function calculateScheduleOverlapScore({ candidateListing, proposal }) {
  if (!candidateListing || !proposal) {
    return 0;
  }

  const { compatible, overlapDays, requestedDays } = hasScheduleCompatibility({
    candidateListing,
    proposal
  });

  if (!compatible || requestedDays === 0) {
    return 0;
  }

  // Calculate overlap ratio (0.0 to 1.0)
  const overlapRatio = overlapDays / requestedDays;

  // Scale to max score and round
  const score = Math.round(overlapRatio * MATCH_WEIGHTS.SCHEDULE);

  return score;
}
