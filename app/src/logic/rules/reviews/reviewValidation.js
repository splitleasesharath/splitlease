/**
 * Review validation rules.
 * Boolean predicates for guest review form validation.
 */

import { REVIEW_CATEGORY_COUNT } from '../../constants/reviewCategories.js';

/**
 * Check if all required rating categories are completed.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @returns {boolean} True if all 12 categories have valid ratings.
 */
export function isReviewComplete({ ratings }) {
  if (!Array.isArray(ratings)) {
    return false;
  }

  if (ratings.length !== REVIEW_CATEGORY_COUNT) {
    return false;
  }

  return ratings.every(r =>
    typeof r.value === 'number' && r.value >= 1 && r.value <= 5
  );
}

/**
 * Check if a single rating value is valid.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.value - Rating value to validate.
 * @returns {boolean} True if value is 1-5.
 */
export function isValidRating({ value }) {
  return typeof value === 'number' && value >= 1 && value <= 5;
}

/**
 * Check if review can be submitted.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Rating objects.
 * @param {boolean} params.isSubmitting - Whether submission is in progress.
 * @returns {boolean} True if form can be submitted.
 */
export function canSubmitReview({ ratings, isSubmitting = false }) {
  if (isSubmitting) {
    return false;
  }

  return isReviewComplete({ ratings });
}

/**
 * Check if guest has already been reviewed for this stay.
 *
 * @param {object} params - Named parameters.
 * @param {string|null} params.existingReviewId - Existing review ID if any.
 * @returns {boolean} True if review already exists.
 */
export function hasExistingReview({ existingReviewId }) {
  return existingReviewId !== null && existingReviewId !== undefined;
}
