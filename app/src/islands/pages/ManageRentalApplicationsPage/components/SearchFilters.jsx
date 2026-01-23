/**
 * SearchFilters - Filter controls for rental applications list
 *
 * Props:
 * - filters: Current filter values
 * - statusOptions: Available status options for dropdown
 * - onUpdateFilters: Handler to update filter values
 * - onClearFilters: Handler to reset all filters
 */

import React, { useCallback } from 'react';

export default function SearchFilters({
  filters,
  statusOptions,
  onUpdateFilters,
  onClearFilters
}) {
  const handleSearchChange = useCallback((e) => {
    onUpdateFilters({ searchQuery: e.target.value });
  }, [onUpdateFilters]);

  const handleStatusChange = useCallback((e) => {
    onUpdateFilters({ status: e.target.value });
  }, [onUpdateFilters]);

  const handleCompletionChange = useCallback((e) => {
    onUpdateFilters({ completionStatus: e.target.value });
  }, [onUpdateFilters]);

  const handleMinIncomeChange = useCallback((e) => {
    onUpdateFilters({ minIncome: e.target.value });
  }, [onUpdateFilters]);

  const hasActiveFilters = filters.searchQuery || filters.status || filters.completionStatus !== 'all' || filters.minIncome;

  return (
    <div className="search-filters">
      <div className="search-filters__row">
        {/* Search Input */}
        <div className="search-filters__field search-filters__field--search">
          <label htmlFor="search-query" className="sr-only">Search</label>
          <div className="search-filters__input-wrapper">
            <svg className="search-filters__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="search-query"
              className="search-filters__input"
              placeholder="Search by name, email, or ID..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="search-filters__field">
          <label htmlFor="status-filter" className="sr-only">Status</label>
          <select
            id="status-filter"
            className="search-filters__select"
            value={filters.status}
            onChange={handleStatusChange}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Completion Status */}
        <div className="search-filters__field">
          <label htmlFor="completion-filter" className="sr-only">Completion</label>
          <select
            id="completion-filter"
            className="search-filters__select"
            value={filters.completionStatus}
            onChange={handleCompletionChange}
          >
            <option value="all">All Completions</option>
            <option value="completed">Completed Only</option>
            <option value="incomplete">Incomplete Only</option>
          </select>
        </div>

        {/* Min Income */}
        <div className="search-filters__field">
          <label htmlFor="min-income" className="sr-only">Min Income</label>
          <input
            type="number"
            id="min-income"
            className="search-filters__input search-filters__input--number"
            placeholder="Min income..."
            value={filters.minIncome}
            onChange={handleMinIncomeChange}
            min="0"
            step="100"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            className="search-filters__clear-btn"
            onClick={onClearFilters}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
