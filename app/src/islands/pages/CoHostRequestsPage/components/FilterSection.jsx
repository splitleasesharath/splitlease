/**
 * FilterSection - Search, filter, and sort controls
 *
 * Provides:
 * - Search input for filtering by name/email/listing
 * - Status dropdown filter
 * - Sort field and order controls
 * - Clear filters button
 */

import { useState, useEffect } from 'react';

export default function FilterSection({
  statusFilter,
  searchText,
  sortField,
  sortOrder,
  statusOptions,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onClearFilters,
}) {
  // Local search state for debouncing
  const [localSearch, setLocalSearch] = useState(searchText);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchText) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchText, onSearchChange]);

  // Sync local state when external search changes
  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const hasActiveFilters = statusFilter || searchText;

  return (
    <div className="filter-section">
      <div className="filter-row">
        {/* Search Input */}
        <div className="search-container">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by host name, email, or listing..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="search-input"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="search-clear"
              title="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="filter-dropdown-container">
          <label className="filter-label">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="filter-dropdown"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Controls */}
        <div className="sort-container">
          <label className="filter-label">Sort by</label>
          <div className="sort-buttons">
            <button
              onClick={() => onSortChange('createdDate')}
              className={`sort-button ${sortField === 'createdDate' ? 'sort-button-active' : ''}`}
            >
              Date
              {sortField === 'createdDate' && (
                <SortIcon ascending={sortOrder === 'asc'} />
              )}
            </button>
            <button
              onClick={() => onSortChange('status')}
              className={`sort-button ${sortField === 'status' ? 'sort-button-active' : ''}`}
            >
              Status
              {sortField === 'status' && (
                <SortIcon ascending={sortOrder === 'asc'} />
              )}
            </button>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button onClick={onClearFilters} className="clear-filters-button">
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

// ===== ICONS =====

function SearchIcon() {
  return (
    <svg
      className="search-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function SortIcon({ ascending }) {
  return (
    <svg
      className={`sort-icon ${ascending ? 'sort-icon-asc' : ''}`}
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
