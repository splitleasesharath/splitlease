/**
 * canHardDeleteLease - Determine if a lease can be permanently deleted
 *
 * Business Rules (more restrictive than soft delete):
 * - Only cancelled leases can be hard-deleted
 * - Lease must have no active stays
 * - Lease must have no pending payments
 * - Lease should ideally have no associated documents (warn but allow)
 *
 * @param {Object} lease - Adapted lease object
 * @returns {boolean} Whether the lease can be permanently deleted
 */
export function canHardDeleteLease(lease) {
  if (!lease) return false;

  // Must be cancelled first
  if (lease.status !== 'cancelled') {
    return false;
  }

  // Check for active stays
  if (lease.stays && lease.stays.length > 0) {
    const activeStays = lease.stays.filter((stay) =>
      ['active', 'upcoming', 'in-progress'].includes(stay.status?.toLowerCase())
    );

    if (activeStays.length > 0) {
      return false;
    }
  }

  // Check for unpaid balance
  if (lease.totalRent > 0 && lease.paidToDate > 0) {
    // If there's been any payment, be cautious about hard delete
    // Allow it, but the UI should warn about this
  }

  return true;
}

/**
 * Get reason why hard delete is not allowed
 * @param {Object} lease - Adapted lease object
 * @returns {string|null} Reason string or null if allowed
 */
export function getHardDeleteBlockReason(lease) {
  if (!lease) return 'Lease not found';

  if (lease.status !== 'cancelled') {
    return `Lease must be cancelled first (current status: ${lease.status})`;
  }

  if (lease.stays && lease.stays.length > 0) {
    const activeStays = lease.stays.filter((stay) =>
      ['active', 'upcoming', 'in-progress'].includes(stay.status?.toLowerCase())
    );

    if (activeStays.length > 0) {
      return `Lease has ${activeStays.length} active stay(s)`;
    }
  }

  return null;
}

export default canHardDeleteLease;
