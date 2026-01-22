/**
 * sortLeases - Sort leases by specified field and order
 *
 * @param {Array} leases - Array of adapted lease objects
 * @param {Object} sortConfig - Sort configuration
 * @param {string} sortConfig.field - Field to sort by
 * @param {string} sortConfig.order - 'asc' or 'desc'
 * @returns {Array} Sorted leases (new array, doesn't mutate input)
 */
export function sortLeases(leases, { field = 'createdAt', order = 'desc' }) {
  if (!Array.isArray(leases)) return [];

  const sortedLeases = [...leases];

  sortedLeases.sort((a, b) => {
    let valueA = getFieldValue(a, field);
    let valueB = getFieldValue(b, field);

    // Handle null/undefined values - push them to the end
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    // Compare based on type
    let comparison = 0;

    if (valueA instanceof Date && valueB instanceof Date) {
      comparison = valueA.getTime() - valueB.getTime();
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      comparison = valueA - valueB;
    } else {
      // String comparison
      comparison = String(valueA).localeCompare(String(valueB));
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sortedLeases;
}

/**
 * Get the value of a field from a lease object
 * Handles nested fields and common aliases
 */
function getFieldValue(lease, field) {
  switch (field) {
    case 'createdAt':
      return lease.createdAt;
    case 'startDate':
      return lease.startDate;
    case 'endDate':
      return lease.endDate;
    case 'totalRent':
      return lease.totalRent;
    case 'totalCompensation':
      return lease.totalCompensation;
    case 'agreementNumber':
      return lease.agreementNumber;
    case 'status':
      return lease.status;
    case 'guestEmail':
      return lease.guest?.email;
    case 'hostEmail':
      return lease.host?.email;
    case 'listingName':
      return lease.listing?.name;
    default:
      return lease[field];
  }
}

export default sortLeases;
