/**
 * Listings Filter Panel Component
 *
 * Filter controls for the listings table including:
 * - Show only available toggle
 * - Status dropdown
 * - Borough/Neighborhood dropdowns (from reference tables)
 * - Search input
 * - Status checkboxes
 * - Date range
 *
 * Migrated from _listings-overview/FilterPanel.tsx → JavaScript
 */

import { SHOW_ALL_FILTER_OPTIONS } from '../constants.js';

/**
 * @param {Object} props
 * @param {Object} props.filters - Current filter state
 * @param {Array} props.boroughs - Borough options from reference table
 * @param {Array} props.neighborhoods - Neighborhood options from reference table
 * @param {number} props.totalCount - Total results count
 * @param {(key: string, value: any) => void} props.onFilterChange - Filter change handler
 * @param {() => void} props.onResetFilters - Reset filters handler
 */
export default function ListingsFilterPanel({
  filters,
  boroughs,
  neighborhoods,
  totalCount,
  onFilterChange,
  onResetFilters,
}) {
  // Filter neighborhoods based on selected borough
  const filteredNeighborhoods = filters.selectedBorough
    ? neighborhoods.filter(n => n.boroughId === filters.selectedBorough)
    : neighborhoods;

  // Format date for input
  const formatDateForInput = (date) => {
    if (!date) return '';
    return date instanceof Date ? date.toISOString().split('T')[0] : '';
  };

  return (
    <div className="lo-filter-panel">
      {/* Row 1: Main filters */}
      <div className="lo-filter-row">
        {/* Show Only Available Toggle */}
        <div className="lo-filter-group lo-toggle-group">
          <label className="lo-toggle-label">
            <input
              type="checkbox"
              className="lo-toggle-input"
              checked={filters.showOnlyAvailable}
              onChange={(e) => onFilterChange('showOnlyAvailable', e.target.checked)}
            />
            <span className="lo-toggle-slider"></span>
            <span className="lo-toggle-text">Show only Available</span>
          </label>
        </div>

        {/* Show All Dropdown */}
        <div className="lo-filter-group">
          <select
            className="lo-filter-select"
            value={filters.showAllFilter}
            onChange={(e) => onFilterChange('showAllFilter', e.target.value)}
          >
            {SHOW_ALL_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Borough Selection */}
        <div className="lo-filter-group">
          <select
            className="lo-filter-select"
            value={filters.selectedBorough}
            onChange={(e) => {
              onFilterChange('selectedBorough', e.target.value);
              onFilterChange('selectedNeighborhood', '');
            }}
          >
            <option value="">Select Borough</option>
            {boroughs.map(borough => (
              <option key={borough.id} value={borough.id}>
                {borough.name}
              </option>
            ))}
          </select>
        </div>

        {/* Neighborhood Selection */}
        <div className="lo-filter-group">
          <select
            className="lo-filter-select"
            value={filters.selectedNeighborhood}
            onChange={(e) => onFilterChange('selectedNeighborhood', e.target.value)}
            disabled={!filters.selectedBorough}
          >
            <option value="">Select Neighborhood</option>
            {filteredNeighborhoods.map(hood => (
              <option key={hood.id} value={hood.id}>
                {hood.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="lo-filter-group lo-search-group">
          <input
            type="text"
            className="lo-search-input"
            placeholder="Search by ID, host email, name..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          />
          {filters.searchQuery && (
            <button
              className="lo-search-clear"
              onClick={() => onFilterChange('searchQuery', '')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Secondary filters */}
      <div className="lo-filter-row">
        {/* Status Checkboxes */}
        <div className="lo-filter-group lo-checkbox-group">
          <label className="lo-checkbox-label">
            <input
              type="checkbox"
              checked={filters.completedListings}
              onChange={(e) => onFilterChange('completedListings', e.target.checked)}
            />
            <span>Completed listings</span>
          </label>
          <label className="lo-checkbox-label">
            <input
              type="checkbox"
              checked={filters.notFinishedListings}
              onChange={(e) => onFilterChange('notFinishedListings', e.target.checked)}
            />
            <span>Not finished listings</span>
          </label>
        </div>

        {/* Date Range Filter */}
        <div className="lo-filter-group lo-date-group">
          <span className="lo-date-label">Modified Between:</span>
          <input
            type="date"
            className="lo-date-input"
            value={formatDateForInput(filters.startDate)}
            onChange={(e) => onFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
          />
          <span className="lo-date-separator">to</span>
          <input
            type="date"
            className="lo-date-input"
            value={formatDateForInput(filters.endDate)}
            onChange={(e) => onFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
          />
        </div>

        {/* Reset Button */}
        <div className="lo-filter-group">
          <button className="lo-btn lo-btn-text" onClick={onResetFilters}>
            Reset Filters
          </button>
        </div>

        {/* Results Count */}
        <div className="lo-filter-group lo-results-count">
          <span>{totalCount} results</span>
        </div>
      </div>
    </div>
  );
}
