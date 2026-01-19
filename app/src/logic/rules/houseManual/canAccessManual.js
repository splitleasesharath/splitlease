/**
 * House Manual Access Rules
 *
 * Determines if a user can access a house manual for a specific visit.
 * NO ANONYMOUS ACCESS: User must be authenticated as the visit's guest.
 *
 * @module logic/rules/houseManual/canAccessManual
 */

/**
 * @typedef {Object} AccessCheckParams
 * @property {string|null} currentUserId - Current authenticated user's ID (from Supabase Auth)
 * @property {string|null} visitGuestId - The guest ID associated with the visit
 * @property {boolean} isAuthenticated - Whether the user is logged in
 */

/**
 * @typedef {Object} AccessCheckResult
 * @property {boolean} canAccess - Whether access is granted
 * @property {string|null} denyReason - Reason for denial (if any)
 */

/**
 * Check if a user can access a house manual.
 *
 * Access is granted when:
 * 1. User is authenticated (logged in)
 * 2. User's ID matches the visit's guest ID
 *
 * @param {AccessCheckParams} params - Access check parameters
 * @returns {AccessCheckResult} Access check result
 *
 * @example
 * const result = canAccessManual({
 *   currentUserId: 'user123',
 *   visitGuestId: 'user123',
 *   isAuthenticated: true
 * });
 * // Returns { canAccess: true, denyReason: null }
 *
 * @example
 * const result = canAccessManual({
 *   currentUserId: null,
 *   visitGuestId: 'user123',
 *   isAuthenticated: false
 * });
 * // Returns { canAccess: false, denyReason: 'Authentication required' }
 */
export function canAccessManual({ currentUserId, visitGuestId, isAuthenticated }) {
  // Rule 1: Must be authenticated
  if (!isAuthenticated) {
    return {
      canAccess: false,
      denyReason: 'Authentication required',
    };
  }

  // Rule 2: Must have a current user ID
  if (!currentUserId) {
    return {
      canAccess: false,
      denyReason: 'User ID not found',
    };
  }

  // Rule 3: Must have a guest ID to check against
  if (!visitGuestId) {
    return {
      canAccess: false,
      denyReason: 'Visit has no guest assigned',
    };
  }

  // Rule 4: Current user must match the visit's guest
  if (currentUserId !== visitGuestId) {
    return {
      canAccess: false,
      denyReason: 'You are not authorized to view this house manual',
    };
  }

  // All rules passed
  return {
    canAccess: true,
    denyReason: null,
  };
}

/**
 * Check if a user is the guest of a specific visit.
 *
 * @param {Object} params - Named parameters
 * @param {string|null} params.userId - User ID to check
 * @param {string|null} params.visitGuestId - Visit's guest ID
 * @returns {boolean} True if user is the visit's guest
 *
 * @example
 * isVisitGuest({ userId: 'abc123', visitGuestId: 'abc123' }); // true
 * isVisitGuest({ userId: 'abc123', visitGuestId: 'xyz789' }); // false
 */
export function isVisitGuest({ userId, visitGuestId }) {
  if (!userId || !visitGuestId) {
    return false;
  }
  return userId === visitGuestId;
}

/**
 * Check if a user can submit a review for a visit.
 *
 * A user can submit a review when:
 * 1. They are the guest of the visit
 * 2. They haven't already submitted a review
 *
 * @param {Object} params - Named parameters
 * @param {string|null} params.userId - User ID
 * @param {string|null} params.visitGuestId - Visit's guest ID
 * @param {boolean} params.hasReviewed - Whether a review has been submitted
 * @returns {boolean} True if user can submit a review
 */
export function canSubmitReview({ userId, visitGuestId, hasReviewed }) {
  // Must be the guest
  if (!isVisitGuest({ userId, visitGuestId })) {
    return false;
  }

  // Must not have already reviewed
  if (hasReviewed) {
    return false;
  }

  return true;
}

export default canAccessManual;
