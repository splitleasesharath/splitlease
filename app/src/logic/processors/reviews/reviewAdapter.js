/**
 * Review data transformation processors.
 * Adapts data between API format and UI component format.
 */

import { REVIEW_CATEGORIES } from '../../constants/reviewCategories.js';

/**
 * Initialize empty ratings array for form.
 *
 * @returns {Array<{categoryId: string, title: string, question: string, value: number}>}
 */
export function createEmptyRatings() {
  return REVIEW_CATEGORIES.map(category => ({
    categoryId: category.id,
    title: category.title,
    question: category.question,
    value: 0
  }));
}

/**
 * Adapt form data to API submission format.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.guestId - Guest user ID.
 * @param {string} params.hostId - Host user ID.
 * @param {string} params.leaseId - Lease ID.
 * @param {string} params.stayId - Stay ID.
 * @param {Array<{categoryId: string, value: number}>} params.ratings - Rating data.
 * @param {string} [params.feedback] - Optional feedback text.
 * @param {number} params.overallScore - Calculated average score.
 * @returns {object} API-formatted review object.
 */
export function adaptReviewForSubmission({
  guestId,
  hostId,
  leaseId,
  stayId,
  ratings,
  feedback,
  overallScore
}) {
  if (!guestId || !hostId || !leaseId || !stayId) {
    throw new Error('adaptReviewForSubmission: missing required IDs');
  }

  return {
    guest_id: guestId,
    host_id: hostId,
    lease_id: leaseId,
    stay_id: stayId,
    ratings: ratings.map(r => ({
      category_id: r.categoryId,
      value: r.value
    })),
    overall_score: overallScore,
    feedback: feedback || null,
    created_at: new Date().toISOString()
  };
}

/**
 * Adapt API review data to UI display format.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.apiReview - Review from API.
 * @returns {object} UI-formatted review object.
 */
export function adaptReviewFromApi({ apiReview }) {
  if (!apiReview) {
    return null;
  }

  return {
    id: apiReview.id || apiReview._id,
    guestId: apiReview.guest_id,
    hostId: apiReview.host_id,
    leaseId: apiReview.lease_id,
    stayId: apiReview.stay_id,
    ratings: (apiReview.ratings || []).map(r => ({
      categoryId: r.category_id,
      title: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.title || r.category_id,
      question: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.question || '',
      value: r.value
    })),
    overallScore: apiReview.overall_score,
    feedback: apiReview.feedback,
    createdAt: apiReview.created_at
  };
}
