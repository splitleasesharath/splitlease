/**
 * filterLeases - Filter leases by search query and status
 *
 * @param {Array} leases - Array of adapted lease objects
 * @param {Object} filters - Filter configuration
 * @param {string} filters.searchQuery - Text search query
 * @param {string} filters.statusFilter - Status to filter by ('all' for no filter)
 * @returns {Array} Filtered leases
 */
export function filterLeases(leases, { searchQuery = '', statusFilter = 'all' }) {
  if (!Array.isArray(leases)) return [];

  return leases.filter((lease) => {
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      if (lease.status !== statusFilter) {
        return false;
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();

      // Search across multiple fields
      const searchableFields = [
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

      const matchesSearch = searchableFields.some((field) => {
        if (!field) return false;
        return String(field).toLowerCase().includes(query);
      });

      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  });
}

export default filterLeases;
