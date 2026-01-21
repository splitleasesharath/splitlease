/**
 * Visit Reviewer House Manual API Service Layer
 *
 * Handles API operations for the guest house manual viewer via Supabase Edge Functions.
 * Uses action-based routing pattern: { action, payload }
 *
 * @module islands/shared/VisitReviewerHouseManual/visitReviewerService
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Fetch house manual and visit data for a guest.
 *
 * @param {Object} params - Named parameters
 * @param {string} params.visitId - Visit ID to fetch
 * @param {string} [params.accessToken] - Optional magic link access token
 * @returns {Promise<{status: string, data?: Object, message?: string}>}
 *
 * @example
 * const result = await fetchVisitManual({ visitId: 'abc123' });
 * // Returns { status: 'success', data: { houseManual: {...}, visit: {...} } }
 */
export async function fetchVisitManual({ visitId, accessToken }) {
  if (!visitId) {
    return {
      status: 'error',
      message: 'Visit ID is required',
    };
  }

  try {
    const { data: responseData, error } = await supabase.functions.invoke('house-manual', {
      body: {
        action: 'get_visit_manual',
        payload: {
          visitId,
          accessToken,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch house manual');
    }

    if (!responseData?.success) {
      throw new Error(responseData?.error || 'Failed to fetch house manual');
    }

    return {
      status: 'success',
      data: responseData.data,
    };
  } catch (error) {
    console.error('API Error (fetch-visit-manual):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate a magic link access token.
 *
 * @param {Object} params - Named parameters
 * @param {string} params.accessToken - Magic link token to validate
 * @param {string} params.visitId - Visit ID the token should grant access to
 * @returns {Promise<{status: string, data?: Object, message?: string}>}
 *
 * @example
 * const result = await validateAccessToken({ accessToken: 'xyz789', visitId: 'abc123' });
 * // Returns { status: 'success', data: { isValid: true, visit: {...} } }
 */
export async function validateAccessToken({ accessToken, visitId }) {
  if (!accessToken) {
    return {
      status: 'error',
      message: 'Access token is required',
    };
  }

  try {
    const { data: responseData, error } = await supabase.functions.invoke('house-manual', {
      body: {
        action: 'validate_access_token',
        payload: {
          accessToken,
          visitId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to validate access token');
    }

    if (!responseData?.success) {
      throw new Error(responseData?.error || 'Invalid access token');
    }

    return {
      status: 'success',
      data: responseData.data,
    };
  } catch (error) {
    console.error('API Error (validate-access-token):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Track guest engagement with the house manual.
 *
 * @param {Object} params - Named parameters
 * @param {string} params.visitId - Visit ID
 * @param {string} params.eventType - Type of engagement: 'link_saw' | 'map_saw' | 'narration_heard'
 * @returns {Promise<{status: string, message?: string}>}
 *
 * @example
 * await trackEngagement({ visitId: 'abc123', eventType: 'link_saw' });
 */
export async function trackEngagement({ visitId, eventType }) {
  if (!visitId || !eventType) {
    return {
      status: 'error',
      message: 'Visit ID and event type are required',
    };
  }

  const validEventTypes = ['link_saw', 'map_saw', 'narration_heard'];
  if (!validEventTypes.includes(eventType)) {
    return {
      status: 'error',
      message: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
    };
  }

  try {
    const { data: responseData, error } = await supabase.functions.invoke('house-manual', {
      body: {
        action: 'track_engagement',
        payload: {
          visitId,
          eventType,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to track engagement');
    }

    return {
      status: 'success',
    };
  } catch (error) {
    console.error('API Error (track-engagement):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Submit a guest review for a visit.
 *
 * @param {Object} params - Named parameters
 * @param {string} params.visitId - Visit ID
 * @param {Object} params.review - Review data
 * @param {string} params.review.reviewText - Written review text
 * @param {number} [params.review.overallRating] - Overall rating 1-5
 * @param {number} [params.review.cleanlinessRating] - Cleanliness rating 1-5
 * @param {number} [params.review.accuracyRating] - Accuracy rating 1-5
 * @param {number} [params.review.communicationRating] - Host communication rating 1-5
 * @param {number} [params.review.locationRating] - Location rating 1-5
 * @param {number} [params.review.valueRating] - Value rating 1-5
 * @param {number} [params.review.checkInRating] - Check-in experience rating 1-5
 * @returns {Promise<{status: string, data?: Object, message?: string}>}
 *
 * @example
 * const result = await submitGuestReview({
 *   visitId: 'abc123',
 *   review: {
 *     reviewText: 'Great stay!',
 *     overallRating: 5,
 *     cleanlinessRating: 5
 *   }
 * });
 */
export async function submitGuestReview({ visitId, review }) {
  if (!visitId) {
    return {
      status: 'error',
      message: 'Visit ID is required',
    };
  }

  if (!review || !review.reviewText) {
    return {
      status: 'error',
      message: 'Review text is required',
    };
  }

  // Validate rating ranges
  const ratingFields = [
    'overallRating',
    'cleanlinessRating',
    'accuracyRating',
    'communicationRating',
    'locationRating',
    'valueRating',
    'checkInRating',
  ];

  for (const field of ratingFields) {
    if (review[field] !== undefined) {
      const value = review[field];
      if (typeof value !== 'number' || value < 1 || value > 5) {
        return {
          status: 'error',
          message: `${field} must be a number between 1 and 5`,
        };
      }
    }
  }

  try {
    const { data: responseData, error } = await supabase.functions.invoke('house-manual', {
      body: {
        action: 'submit_review',
        payload: {
          visitId,
          review,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to submit review');
    }

    if (!responseData?.success) {
      throw new Error(responseData?.error || 'Failed to submit review');
    }

    return {
      status: 'success',
      data: responseData.data,
    };
  } catch (error) {
    console.error('API Error (submit-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Export as service object
export const visitReviewerService = {
  fetchVisitManual,
  validateAccessToken,
  trackEngagement,
  submitGuestReview,
};

export default visitReviewerService;
