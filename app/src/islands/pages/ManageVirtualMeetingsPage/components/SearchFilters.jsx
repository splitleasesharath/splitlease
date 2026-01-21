/**
 * SearchFilters - Filter controls for the virtual meetings admin page
 * Provides search and filter inputs for narrowing down meeting lists
 */

import { useState } from 'react';

export default function SearchFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hostOptions = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = filters.guestSearch ||
                          filters.hostId ||
                          filters.proposalId;

  return (
    <div className="manage-vm__filters">
      {/* Primary Search */}
      <div className="manage-vm__filters-row">
        <div className="manage-vm__search-input">
          <svg
            className="manage-vm__search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by guest name or email..."
            value={filters.guestSearch}
            onChange={(e) => onFilterChange('guestSearch', e.target.value)}
            className="manage-vm__search-field"
          />
          {filters.guestSearch && (
            <button
              className="manage-vm__clear-field"
              onClick={() => onFilterChange('guestSearch', '')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          className={`manage-vm__filter-toggle ${isExpanded ? 'manage-vm__filter-toggle--active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="manage-vm__filter-badge">
              {[filters.guestSearch, filters.hostId, filters.proposalId].filter(Boolean).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            className="manage-vm__clear-all"
            onClick={onClearFilters}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="manage-vm__filters-expanded">
          {/* Host Filter */}
          <div className="manage-vm__filter-group">
            <label className="manage-vm__filter-label">Host</label>
            <select
              value={filters.hostId}
              onChange={(e) => onFilterChange('hostId', e.target.value)}
              className="manage-vm__filter-select"
            >
              <option value="">All Hosts</option>
              {hostOptions.map(host => (
                <option key={host.id} value={host.id}>
                  {host.name}
                </option>
              ))}
            </select>
          </div>

          {/* Proposal ID Filter */}
          <div className="manage-vm__filter-group">
            <label className="manage-vm__filter-label">Proposal ID</label>
            <input
              type="text"
              placeholder="Enter proposal ID..."
              value={filters.proposalId}
              onChange={(e) => onFilterChange('proposalId', e.target.value)}
              className="manage-vm__filter-input"
            />
          </div>
        </div>
      )}
    </div>
  );
}
