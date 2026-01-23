/**
 * Calculate Quick Proposal Pricing
 *
 * Calculates pricing breakdown for quick proposal creation
 * in usability testing tool.
 *
 * All day indices use JavaScript 0-based numbering:
 *   0=Sunday, 1=Monday, ..., 6=Saturday
 */

/**
 * Calculate pricing for a quick proposal
 * @param {Object} params - Pricing parameters
 * @param {number} params.nightlyPrice - Price per night
 * @param {number[]} params.selectedDayIndices - Array of selected day indices (0-6)
 * @param {number} params.reservationWeeks - Number of weeks in reservation
 * @returns {Object} Pricing breakdown
 */
export function calculateQuickProposal({
  nightlyPrice,
  selectedDayIndices,
  reservationWeeks,
}) {
  // Validate inputs
  if (typeof nightlyPrice !== 'number' || nightlyPrice < 0) {
    return {
      fourWeeksRent: 0,
      actualWeeks: 0,
      totalPrice: 0,
      initialPayment: 0,
      nightlyPrice: 0,
      daysPerWeek: 0,
      totalNights: 0,
    };
  }

  if (!Array.isArray(selectedDayIndices) || selectedDayIndices.length === 0) {
    return {
      fourWeeksRent: 0,
      actualWeeks: reservationWeeks || 0,
      totalPrice: 0,
      initialPayment: 0,
      nightlyPrice,
      daysPerWeek: 0,
      totalNights: 0,
    };
  }

  const weeks = reservationWeeks || 0;
  const daysPerWeek = selectedDayIndices.length;
  const totalNights = daysPerWeek * weeks;

  // 4 weeks rent = nightly * days per week * 4
  const fourWeeksRent = nightlyPrice * daysPerWeek * 4;

  // Total price = nightly * days per week * total weeks
  const totalPrice = nightlyPrice * daysPerWeek * weeks;

  // Initial payment is typically the 4 weeks rent (deposit)
  const initialPayment = fourWeeksRent;

  return {
    fourWeeksRent,
    actualWeeks: weeks,
    totalPrice,
    initialPayment,
    nightlyPrice,
    daysPerWeek,
    totalNights,
  };
}

/**
 * Format day pattern from selected day indices
 * @param {number[]} selectedDayIndices - Array of selected day indices (0-6)
 * @returns {string} Pattern string like "SMTWTFS" or "SM----S"
 */
export function formatDayPattern(selectedDayIndices) {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const selectedSet = new Set(selectedDayIndices);

  return dayLabels.map((label, index) => {
    return selectedSet.has(index) ? label : '-';
  }).join('');
}

/**
 * Convert day label to 0-based index
 * @param {string} label - Day label (S, M, T, W, Th, F, Sa)
 * @returns {number} 0-based day index
 */
export function dayLabelToIndex(label) {
  const mapping = {
    'S': 0,    // Sunday
    'M': 1,    // Monday
    'T': 2,    // Tuesday
    'W': 3,    // Wednesday
    'Th': 4,   // Thursday
    'F': 5,    // Friday
    'Sa': 6,   // Saturday
  };
  return mapping[label] ?? -1;
}

/**
 * Convert 0-based index to day label
 * @param {number} index - 0-based day index
 * @returns {string} Day label
 */
export function indexToDayLabel(index) {
  const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  return labels[index] ?? '?';
}

/**
 * Get all day indices (0-6)
 * @returns {number[]} Array of all day indices
 */
export function getAllDayIndices() {
  return [0, 1, 2, 3, 4, 5, 6];
}
