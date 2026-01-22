/**
 * isLeaseActive - Check if a lease is currently active
 *
 * A lease is considered active if:
 * - Status is 'active'
 * - Current date is within the reservation period
 *
 * @param {Object} lease - Adapted lease object
 * @returns {boolean} Whether the lease is currently active
 */
export function isLeaseActive(lease) {
  if (!lease) return false;

  // Status must be 'active'
  if (lease.status !== 'active') {
    return false;
  }

  // If no dates set, consider it active based on status alone
  if (!lease.startDate && !lease.endDate) {
    return true;
  }

  const now = new Date();

  // Check if we're within the date range
  if (lease.startDate && now < lease.startDate) {
    return false; // Not started yet
  }

  if (lease.endDate && now > lease.endDate) {
    return false; // Already ended
  }

  return true;
}

/**
 * isLeaseUpcoming - Check if a lease is scheduled but not started
 * @param {Object} lease
 * @returns {boolean}
 */
export function isLeaseUpcoming(lease) {
  if (!lease) return false;
  if (lease.status !== 'active' && lease.status !== 'pending') return false;
  if (!lease.startDate) return false;

  const now = new Date();
  return now < lease.startDate;
}

/**
 * isLeaseExpired - Check if a lease has passed its end date
 * @param {Object} lease
 * @returns {boolean}
 */
export function isLeaseExpired(lease) {
  if (!lease) return false;
  if (!lease.endDate) return false;

  const now = new Date();
  return now > lease.endDate;
}

export default isLeaseActive;
