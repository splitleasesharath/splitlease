/**
 * Calculate form completion percentage for review submission.
 *
 * @intent Show progress feedback during review form completion.
 * @rule Counts ratings with non-zero values.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @param {number} params.totalCategories - Expected total categories (default 12).
 * @returns {number} Completion percentage (0-100).
 */
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  if (!Array.isArray(ratings)) {
    return 0;
  }

  const completed = ratings.filter(r => r.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
