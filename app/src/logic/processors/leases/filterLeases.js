/**
 * Lease filtering processor
 *
 * Pure function that returns a new filtered array without mutating input.
 */

/**
 * Extract searchable text fields from a lease
 *
 * @param {Object} lease - Adapted lease object
 * @returns {string[]} Array of searchable field values
 */
const getSearchableFields = (lease) => [
  lease.id,
  lease.agreementNumber,
  lease.guest?.email,
  lease.guest?.firstName,
  lease.guest?.lastName,
  lease.host?.email,
  lease.host?.firstName,
  lease.host?.lastName,
  lease.listing?.name,
  lease.listing?.address,
  lease.listing?.neighborhood,
];

/**
 * Check if a lease matches the status filter
 *
 * @param {Object} lease - Adapted lease object
 * @param {string} statusFilter - Status to filter by ('all' to skip)
 * @returns {boolean} Whether the lease matches the status filter
 */
const matchesStatusFilter = (lease, statusFilter) =>
  !statusFilter || statusFilter === 'all' || lease.status === statusFilter;

/**
 * Check if a lease matches the search query
 *
 * @param {Object} lease - Adapted lease object
 * @param {string} query - Lowercase, trimmed search query
 * @returns {boolean} Whether the lease matches the search query
 */
const matchesSearchQuery = (lease, query) => {
  if (!query) return true;

  return getSearchableFields(lease).some(
    (field) => field && String(field).toLowerCase().includes(query)
  );
};

/**
 * filterLeases - Filter leases by search query and status
 *
 * @intent Filter lease list by status and/or text search across multiple fields
 * @rule Returns empty array for non-array input
 * @rule Status filter 'all' shows all statuses
 * @rule Search is case-insensitive and matches partial strings
 *
 * @param {Array} leases - Array of adapted lease objects
 * @param {Object} filters - Filter configuration
 * @param {string} [filters.searchQuery=''] - Text search query
 * @param {string} [filters.statusFilter='all'] - Status to filter by ('all' for no filter)
 * @returns {Array} Filtered leases (new array, doesn't mutate input)
 *
 * @example
 * filterLeases(leases, { statusFilter: 'active' })
 * filterLeases(leases, { searchQuery: 'john', statusFilter: 'all' })
 */
export function filterLeases(leases, { searchQuery = '', statusFilter = 'all' } = {}) {
  if (!Array.isArray(leases)) return [];

  const normalizedQuery = searchQuery.toLowerCase().trim();

  return leases.filter((lease) =>
    matchesStatusFilter(lease, statusFilter) &&
    matchesSearchQuery(lease, normalizedQuery)
  );
}

export default filterLeases;
