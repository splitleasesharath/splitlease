/**
 * Calculate the average score from a review's rating details.
 *
 * @intent Provide consistent score calculation for guest reviews.
 * @rule All 12 categories must have valid ratings (1-5).
 * @rule Returns average rounded to 1 decimal place.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @returns {number} Average score (1.0 to 5.0).
 *
 * @throws {Error} If ratings array is empty or contains invalid values.
 *
 * @example
 * calculateReviewScore({ ratings: [{value: 5}, {value: 4}] })
 * // => 4.5
 */
export function calculateReviewScore({ ratings }) {
  // Validate input
  if (!Array.isArray(ratings) || ratings.length === 0) {
    throw new Error('calculateReviewScore: ratings must be a non-empty array');
  }

  // Validate each rating
  for (const rating of ratings) {
    if (typeof rating.value !== 'number' || rating.value < 1 || rating.value > 5) {
      throw new Error(
        `calculateReviewScore: invalid rating value ${rating.value}, must be 1-5`
      );
    }
  }

  const sum = ratings.reduce((acc, r) => acc + r.value, 0);
  const average = sum / ratings.length;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
}
