/**
 * selectProposalByScheduleType
 *
 * Replaces JS2Bubble proposal selector logic (outputlist3 selectors).
 * Filters and selects proposals by their schedule type or timing.
 *
 * Original Bubble had selectors for:
 * - nightly: Immediate availability proposals
 * - oneweekoff: Proposals starting 1 week out
 * - twoweeksoff: Proposals starting 2 weeks out
 * - threeweeksoff: Proposals starting 3 weeks out
 *
 * @module logic/processors/simulation/selectProposalByScheduleType
 */

/**
 * Select a proposal by its schedule type
 * Used to pick the appropriate proposal for each simulation step.
 *
 * @param {Array} proposals - Array of proposal objects
 * @param {string} scheduleType - 'nightly' | 'weekly' | 'monthly' | 'oneweekoff' | 'twoweeksoff' | 'threeweeksoff'
 * @returns {Object|null} - Selected proposal or null if no proposals provided
 */
export function selectProposalByScheduleType(proposals, scheduleType) {
  if (!proposals || proposals.length === 0) {
    return null;
  }

  // Map schedule type to filter criteria
  const typeFilters = {
    nightly: (proposal) =>
      proposal.schedule_type === 'nightly' ||
      proposal.days_per_week === 7 ||
      proposal.weeks_offset === 0,

    weekly: (proposal) =>
      proposal.schedule_type === 'weekly' ||
      (proposal.days_per_week >= 3 && proposal.days_per_week < 7),

    monthly: (proposal) =>
      proposal.schedule_type === 'monthly' ||
      proposal.weeks >= 4,

    oneweekoff: (proposal) =>
      proposal.weeks_offset === 1,

    twoweeksoff: (proposal) =>
      proposal.weeks_offset === 2,

    threeweeksoff: (proposal) =>
      proposal.weeks_offset === 3
  };

  const filter = typeFilters[scheduleType];

  if (!filter) {
    console.warn(`[selectProposalByScheduleType] Unknown schedule type: ${scheduleType}`);
    return proposals[0]; // Default to first proposal
  }

  const matched = proposals.find(filter);
  return matched || proposals[0]; // Default to first if no match found
}

/**
 * Group proposals by schedule type
 * Useful for displaying proposals in categorized sections.
 *
 * @param {Array} proposals - Array of proposal objects
 * @returns {Object} - { nightly: [], weekly: [], monthly: [] }
 */
export function groupProposalsByScheduleType(proposals) {
  if (!proposals || proposals.length === 0) {
    return {
      nightly: [],
      weekly: [],
      monthly: []
    };
  }

  return {
    nightly: proposals.filter(p =>
      p.schedule_type === 'nightly' || p.days_per_week === 7
    ),
    weekly: proposals.filter(p =>
      p.schedule_type === 'weekly' ||
      (p.days_per_week >= 3 && p.days_per_week < 7)
    ),
    monthly: proposals.filter(p =>
      p.schedule_type === 'monthly' || p.weeks >= 4
    )
  };
}

/**
 * Sort proposals by their start date
 * Earlier start dates come first.
 *
 * @param {Array} proposals - Array of proposal objects
 * @returns {Array} - Sorted proposals
 */
export function sortProposalsByStartDate(proposals) {
  if (!proposals || proposals.length === 0) {
    return [];
  }

  return [...proposals].sort((a, b) => {
    const dateA = new Date(a.start_date || a.startDate);
    const dateB = new Date(b.start_date || b.startDate);
    return dateA - dateB;
  });
}

/**
 * Filter proposals that are valid for simulation
 * Excludes cancelled, expired, or otherwise invalid proposals.
 *
 * @param {Array} proposals - Array of proposal objects
 * @returns {Array} - Filtered proposals suitable for simulation
 */
export function filterValidSimulationProposals(proposals) {
  if (!proposals || proposals.length === 0) {
    return [];
  }

  const invalidStatuses = ['cancelled', 'expired', 'rejected', 'withdrawn'];

  return proposals.filter(proposal => {
    // Exclude proposals with invalid statuses
    if (proposal.status && invalidStatuses.includes(proposal.status.toLowerCase())) {
      return false;
    }

    // Must have essential fields
    return proposal._id || proposal.id;
  });
}
