/**
 * Filter Section Component
 *
 * Provides advanced filtering UI for proposal search:
 * - Guest search (name, email, phone)
 * - Host search (name, email, phone)
 * - Status dropdown
 * - Proposal ID search
 * - Listing search (name, ID, type)
 * - Date range filter
 * - Sort direction toggle
 *
 * Uses native HTML inputs (no react-select or react-datepicker dependencies)
 */

import { PROPOSAL_STATUSES } from './constants.js';

/**
 * FilterSection component
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFilterChange - Handler for filter changes
 * @param {Function} props.onClearAll - Handler for clearing all filters
 */
export default function FilterSection({ filters, onFilterChange, onClearAll }) {
  /**
   * Format date for input value (YYYY-MM-DD)
   */
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  };

  /**
   * Handle date input change
   */
  const handleDateChange = (filterName, value) => {
    if (value) {
      onFilterChange(filterName, new Date(value));
    } else {
      onFilterChange(filterName, null);
    }
  };

  return (
    <div className="pm-filter-section">
      {/* Row 1: Guest, Host, Status, Sort */}
      <div className="pm-filter-row pm-filter-row-1">
        {/* Filter by Guest */}
        <div className="pm-filter-item">
          <div className="pm-input-wrapper">
            <input
              type="text"
              className="pm-searchbox"
              placeholder="Search Guest Name, email, phone number"
              value={filters.guestSearch || ''}
              onChange={(e) => onFilterChange('guestSearch', e.target.value)}
            />
            {filters.guestSearch && (
              <button
                className="pm-clear-btn"
                onClick={() => onFilterChange('guestSearch', '')}
                aria-label="Clear guest search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Filter by Host */}
        <div className="pm-filter-item">
          <div className="pm-input-wrapper">
            <input
              type="text"
              className="pm-searchbox"
              placeholder="Search Host Name, email, phone number"
              value={filters.hostSearch || ''}
              onChange={(e) => onFilterChange('hostSearch', e.target.value)}
            />
            {filters.hostSearch && (
              <button
                className="pm-clear-btn"
                onClick={() => onFilterChange('hostSearch', '')}
                aria-label="Clear host search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Filter by Proposal Status */}
        <div className="pm-filter-item">
          <select
            className="pm-select"
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {PROPOSAL_STATUSES.map((status, index) => (
              <option key={index} value={status}>
                {status || '(empty)'}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by Modified Date */}
        <div className="pm-filter-item pm-sort-section">
          <label className="pm-filter-label">Sort by Modified Date</label>
          <div className="pm-sort-controls">
            <button
              className={`pm-sort-btn ${filters.sortDirection === 'asc' ? 'active' : ''}`}
              onClick={() => onFilterChange('sortDirection', 'asc')}
              title="Ascending (oldest first)"
            >
              &uarr;
            </button>
            <button
              className={`pm-sort-btn ${filters.sortDirection === 'desc' ? 'active' : ''}`}
              onClick={() => onFilterChange('sortDirection', 'desc')}
              title="Descending (newest first)"
            >
              &darr;
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Proposal ID, Listing */}
      <div className="pm-filter-row pm-filter-row-2">
        {/* Filter by Proposal ID */}
        <div className="pm-filter-item">
          <label className="pm-filter-label">Filter by Proposal ID</label>
          <input
            type="text"
            className="pm-textbox"
            placeholder="Search by ID"
            value={filters.proposalId || ''}
            onChange={(e) => onFilterChange('proposalId', e.target.value)}
          />
        </div>

        {/* Filter by Listing */}
        <div className="pm-filter-item">
          <label className="pm-filter-label">Filter by Listing (name, type, ID)</label>
          <div className="pm-input-wrapper">
            <input
              type="text"
              className="pm-searchbox"
              placeholder="Search Listing by name, unique id, rental type"
              value={filters.listingSearch || ''}
              onChange={(e) => onFilterChange('listingSearch', e.target.value)}
            />
            {filters.listingSearch && (
              <button
                className="pm-clear-btn"
                onClick={() => onFilterChange('listingSearch', '')}
                aria-label="Clear listing search"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Date Range, Clear All */}
      <div className="pm-filter-row pm-filter-row-3">
        {/* Date Range Filter */}
        <div className="pm-filter-item pm-date-range">
          <label className="pm-filter-label">Display Proposals Modified Between:</label>
          <div className="pm-date-range-inputs">
            <input
              type="date"
              className="pm-date-picker"
              value={formatDateForInput(filters.startDate)}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              placeholder="Start date"
            />
            <span className="pm-date-separator">-</span>
            <input
              type="date"
              className="pm-date-picker"
              value={formatDateForInput(filters.endDate)}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              placeholder="End date"
            />
          </div>
        </div>

        {/* Clear All Button */}
        <div className="pm-filter-item">
          <button className="pm-clear-all-btn" onClick={onClearAll}>
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
