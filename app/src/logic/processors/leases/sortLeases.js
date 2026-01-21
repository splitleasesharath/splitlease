/**
 * Lease sorting processor
 *
 * Pure function that returns a new sorted array without mutating input.
 */

/**
 * Field accessor map for nested/aliased fields
 * Maps sort field names to accessor functions
 *
 * @type {Object.<string, function(Object): *>}
 */
const FIELD_ACCESSORS = {
  createdAt: (lease) => lease.createdAt,
  startDate: (lease) => lease.startDate,
  endDate: (lease) => lease.endDate,
  totalRent: (lease) => lease.totalRent,
  totalCompensation: (lease) => lease.totalCompensation,
  agreementNumber: (lease) => lease.agreementNumber,
  status: (lease) => lease.status,
  guestEmail: (lease) => lease.guest?.email,
  hostEmail: (lease) => lease.host?.email,
  listingName: (lease) => lease.listing?.name,
};

/**
 * Get the value of a field from a lease object
 * Handles nested fields and common aliases
 *
 * @param {Object} lease - Lease object
 * @param {string} field - Field name or alias
 * @returns {*} Field value or undefined
 */
const getFieldValue = (lease, field) => {
  const accessor = FIELD_ACCESSORS[field];
  return accessor ? accessor(lease) : lease[field];
};

/**
 * Compare two values with null-safety
 * Nulls are pushed to the end of the list
 *
 * @param {*} valueA - First value
 * @param {*} valueB - Second value
 * @returns {number} Comparison result (-1, 0, or 1)
 */
const compareValues = (valueA, valueB) => {
  // Handle null/undefined values - push them to the end
  if (valueA == null && valueB == null) return 0;
  if (valueA == null) return 1;
  if (valueB == null) return -1;

  // Date comparison
  if (valueA instanceof Date && valueB instanceof Date) {
    return valueA.getTime() - valueB.getTime();
  }

  // Numeric comparison
  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  // String comparison (fallback)
  return String(valueA).localeCompare(String(valueB));
};

/**
 * sortLeases - Sort leases by specified field and order
 *
 * @intent Create a new sorted array without mutating the input
 * @rule Returns empty array for non-array input
 * @rule Null/undefined values sort to the end
 * @rule Supports Date, number, and string comparisons
 *
 * @param {Array} leases - Array of adapted lease objects
 * @param {Object} sortConfig - Sort configuration
 * @param {string} [sortConfig.field='createdAt'] - Field to sort by
 * @param {string} [sortConfig.order='desc'] - 'asc' or 'desc'
 * @returns {Array} Sorted leases (new array, doesn't mutate input)
 *
 * @example
 * sortLeases(leases, { field: 'totalRent', order: 'asc' })
 * sortLeases(leases, { field: 'guestEmail', order: 'desc' })
 */
export function sortLeases(leases, { field = 'createdAt', order = 'desc' } = {}) {
  if (!Array.isArray(leases)) return [];

  const direction = order === 'desc' ? -1 : 1;

  return [...leases].sort((a, b) => {
    const valueA = getFieldValue(a, field);
    const valueB = getFieldValue(b, field);
    return direction * compareValues(valueA, valueB);
  });
}

export default sortLeases;
