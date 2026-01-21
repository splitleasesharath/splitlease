/**
 * Hard delete eligibility rules for leases
 *
 * Business Rules (more restrictive than soft delete):
 * - Only cancelled leases can be hard-deleted
 * - Lease must have no active stays
 * - Lease must have no pending payments (warn but allow)
 */

/**
 * Status values that indicate an active stay
 * @type {string[]}
 */
const ACTIVE_STAY_STATUSES = ['active', 'upcoming', 'in-progress'];

/**
 * Check if a stay is currently active
 *
 * @param {Object} stay - Stay object
 * @returns {boolean} Whether the stay is active
 */
const isActiveStay = (stay) =>
  ACTIVE_STAY_STATUSES.includes(stay.status?.toLowerCase());

/**
 * Get the count of active stays in a lease
 *
 * @param {Object} lease - Adapted lease object
 * @returns {number} Count of active stays
 */
const getActiveStayCount = (lease) => {
  if (!lease.stays || !Array.isArray(lease.stays)) {
    return 0;
  }
  return lease.stays.filter(isActiveStay).length;
};

/**
 * canHardDeleteLease - Determine if a lease can be permanently deleted
 *
 * @intent Check all prerequisites for permanent lease deletion
 * @rule Lease must exist
 * @rule Status must be 'cancelled'
 * @rule No active, upcoming, or in-progress stays
 *
 * @param {Object} lease - Adapted lease object
 * @returns {boolean} Whether the lease can be permanently deleted
 *
 * @example
 * canHardDeleteLease({ status: 'cancelled', stays: [] }) // true
 * canHardDeleteLease({ status: 'active', stays: [] }) // false
 */
export function canHardDeleteLease(lease) {
  // Use the block reason check - if null, deletion is allowed
  return getHardDeleteBlockReason(lease) === null;
}

/**
 * Get reason why hard delete is not allowed
 *
 * @intent Provide user-friendly explanation for deletion block
 * @rule Returns null if deletion is allowed
 * @rule Checks in order: existence, status, active stays
 *
 * @param {Object} lease - Adapted lease object
 * @returns {string|null} Reason string or null if allowed
 *
 * @example
 * getHardDeleteBlockReason({ status: 'active' }) // "Lease must be cancelled first (current status: active)"
 * getHardDeleteBlockReason({ status: 'cancelled', stays: [] }) // null
 */
export function getHardDeleteBlockReason(lease) {
  if (!lease) {
    return 'Lease not found';
  }

  if (lease.status !== 'cancelled') {
    return `Lease must be cancelled first (current status: ${lease.status})`;
  }

  const activeStayCount = getActiveStayCount(lease);
  if (activeStayCount > 0) {
    return `Lease has ${activeStayCount} active stay(s)`;
  }

  return null;
}

export default canHardDeleteLease;
