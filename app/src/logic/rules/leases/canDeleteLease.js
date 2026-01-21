/**
 * canDeleteLease - Determine if a lease can be soft-deleted (cancelled)
 *
 * Business Rules:
 * - Draft leases can always be cancelled
 * - Pending leases can be cancelled
 * - Active leases can be cancelled (but may have implications)
 * - Already cancelled leases cannot be re-cancelled
 * - Completed leases cannot be cancelled
 *
 * @param {Object} lease - Adapted lease object
 * @returns {boolean} Whether the lease can be soft-deleted
 */
export function canDeleteLease(lease) {
  if (!lease) return false;

  const nonDeletableStatuses = ['cancelled', 'completed'];

  return !nonDeletableStatuses.includes(lease.status);
}

export default canDeleteLease;
