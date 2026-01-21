/**
 * Check if candidate listing schedule is compatible with proposal.
 *
 * @intent Determine if listing has available days that overlap with proposal's requested days.
 * @rule Both listing and proposal use 0-indexed days (0=Sunday through 6=Saturday).
 * @rule Compatible if at least one requested day is available.
 * @rule Returns overlap count for partial scoring.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.candidateListing - Candidate listing with schedule data.
 * @param {object} params.proposal - Proposal with days selected.
 * @returns {object} { compatible: boolean, overlapDays: number, requestedDays: number }
 *
 * @example
 * hasScheduleCompatibility({
 *   candidateListing: { 'Schedule days available': [1, 2, 3, 4, 5] },
 *   proposal: { daysSelected: [1, 2, 3] }
 * })
 * // => { compatible: true, overlapDays: 3, requestedDays: 3 }
 *
 * hasScheduleCompatibility({
 *   candidateListing: { 'Schedule days available': [5, 6] },
 *   proposal: { daysSelected: [1, 2, 3] }
 * })
 * // => { compatible: false, overlapDays: 0, requestedDays: 3 }
 */
export function hasScheduleCompatibility({ candidateListing, proposal }) {
  // Default return for invalid input
  const noCompatibility = { compatible: false, overlapDays: 0, requestedDays: 0 };

  if (!candidateListing || !proposal) {
    return noCompatibility;
  }

  // Get listing's available days
  const listingDays = candidateListing['Schedule days available'] || [];

  // Get proposal's requested days
  const proposalDays = proposal.daysSelected || [];

  // Validate arrays
  if (!Array.isArray(listingDays) || !Array.isArray(proposalDays)) {
    return noCompatibility;
  }

  const requestedDays = proposalDays.length;

  if (requestedDays === 0) {
    return { compatible: false, overlapDays: 0, requestedDays: 0 };
  }

  // Convert listing days to Set for O(1) lookup
  const listingDaySet = new Set(listingDays);

  // Count overlapping days
  const overlapDays = proposalDays.filter(day => listingDaySet.has(day)).length;

  // Compatible if at least one day overlaps
  const compatible = overlapDays > 0;

  return {
    compatible,
    overlapDays,
    requestedDays
  };
}
