/**
 * Lease temporal status rules
 *
 * These functions determine lease status based on dates.
 * All accept an optional `asOf` date parameter for testability.
 */

/**
 * isLeaseActive - Check if a lease is currently active
 *
 * @intent Determine if a lease is in active status and within its date range
 * @rule Status must be 'active'
 * @rule If no dates set, consider active based on status alone
 * @rule Must be on or after startDate (if set)
 * @rule Must be on or before endDate (if set)
 *
 * @param {Object} lease - Adapted lease object
 * @param {Date} [asOf=new Date()] - Reference date for comparison (enables testing)
 * @returns {boolean} Whether the lease is currently active
 *
 * @example
 * isLeaseActive({ status: 'active', startDate: yesterday, endDate: tomorrow }) // true
 * isLeaseActive({ status: 'active', startDate: tomorrow }) // false (not started)
 */
export function isLeaseActive(lease, asOf = new Date()) {
  if (!lease) return false;

  // Status must be 'active'
  if (lease.status !== 'active') {
    return false;
  }

  // If no dates set, consider it active based on status alone
  if (!lease.startDate && !lease.endDate) {
    return true;
  }

  // Check if we're within the date range
  const isAfterStart = !lease.startDate || asOf >= lease.startDate;
  const isBeforeEnd = !lease.endDate || asOf <= lease.endDate;

  return isAfterStart && isBeforeEnd;
}

/**
 * isLeaseUpcoming - Check if a lease is scheduled but not started
 *
 * @intent Determine if a lease will begin in the future
 * @rule Status must be 'active' or 'pending'
 * @rule startDate must exist and be in the future
 *
 * @param {Object} lease - Adapted lease object
 * @param {Date} [asOf=new Date()] - Reference date for comparison (enables testing)
 * @returns {boolean} Whether the lease is upcoming
 *
 * @example
 * isLeaseUpcoming({ status: 'active', startDate: tomorrow }) // true
 * isLeaseUpcoming({ status: 'active', startDate: yesterday }) // false
 */
export function isLeaseUpcoming(lease, asOf = new Date()) {
  if (!lease) return false;

  const validStatuses = ['active', 'pending'];
  if (!validStatuses.includes(lease.status)) return false;

  if (!lease.startDate) return false;

  return asOf < lease.startDate;
}

/**
 * isLeaseExpired - Check if a lease has passed its end date
 *
 * @intent Determine if a lease's end date has passed
 * @rule endDate must exist and be in the past
 *
 * @param {Object} lease - Adapted lease object
 * @param {Date} [asOf=new Date()] - Reference date for comparison (enables testing)
 * @returns {boolean} Whether the lease has expired
 *
 * @example
 * isLeaseExpired({ endDate: yesterday }) // true
 * isLeaseExpired({ endDate: tomorrow }) // false
 * isLeaseExpired({ endDate: null }) // false
 */
export function isLeaseExpired(lease, asOf = new Date()) {
  if (!lease) return false;
  if (!lease.endDate) return false;

  return asOf > lease.endDate;
}

export default isLeaseActive;
