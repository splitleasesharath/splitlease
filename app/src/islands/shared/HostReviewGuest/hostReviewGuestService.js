/**
 * Host Review Guest API Service Layer
 * Handles review submission and retrieval via Supabase Edge Functions.
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Submit a new guest review.
 *
 * @param {object} reviewData - Formatted review data (from adaptReviewForSubmission).
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function submitGuestReview(reviewData) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'create',
        payload: reviewData
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to submit review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (submit-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a review exists for a specific stay.
 *
 * @param {string} stayId - Stay ID to check.
 * @param {string} hostId - Host ID who would have submitted.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function checkExistingReview(stayId, hostId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'check',
        payload: { stayId, hostId }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to check review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (check-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch review by ID.
 *
 * @param {string} reviewId - Review ID.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function fetchReview(reviewId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'get',
        payload: { reviewId }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (fetch-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Export as service object
export const hostReviewGuestService = {
  submitReview: submitGuestReview,
  checkExisting: checkExistingReview,
  fetchReview: fetchReview
};

export default hostReviewGuestService;
