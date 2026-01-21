/**
 * MatchFilters Component
 *
 * Filter controls for searching candidate listings.
 * Supports borough, max price, and minimum score filters.
 *
 * @param {object} props
 * @param {object} props.filters - Current filter values
 * @param {function} props.onFilterChange - Callback when a filter changes
 * @param {function} props.onApply - Callback to apply filters (trigger search)
 * @param {function} props.onReset - Callback to reset filters
 */
import React from 'react';

const BOROUGHS = [
  { value: '', label: 'All Boroughs' },
  { value: 'Manhattan', label: 'Manhattan' },
  { value: 'Brooklyn', label: 'Brooklyn' },
  { value: 'Queens', label: 'Queens' },
  { value: 'Bronx', label: 'Bronx' },
  { value: 'Staten Island', label: 'Staten Island' },
];

const SCORE_OPTIONS = [
  { value: 0, label: 'Any Score' },
  { value: 50, label: '50+ (Fair)' },
  { value: 60, label: '60+ (Good)' },
  { value: 75, label: '75+ (Excellent)' },
];

export function MatchFilters({ filters, onFilterChange, onApply, onReset }) {
  const handleBoroughChange = (e) => {
    onFilterChange('borough', e.target.value);
  };

  const handleMaxPriceChange = (e) => {
    const value = e.target.value;
    onFilterChange('maxPrice', value ? parseInt(value, 10) : null);
  };

  const handleMinScoreChange = (e) => {
    const value = e.target.value;
    onFilterChange('minScore', parseInt(value, 10) || 0);
  };

  return (
    <div className="qm-filters">
      {/* Borough Filter */}
      <div className="qm-filter-group">
        <label htmlFor="qm-borough-filter" className="qm-filter-label">
          Borough
        </label>
        <select
          id="qm-borough-filter"
          className="qm-filter-select"
          value={filters.borough || ''}
          onChange={handleBoroughChange}
        >
          {BOROUGHS.map((borough) => (
            <option key={borough.value} value={borough.value}>
              {borough.label}
            </option>
          ))}
        </select>
      </div>

      {/* Max Price Filter */}
      <div className="qm-filter-group">
        <label htmlFor="qm-price-filter" className="qm-filter-label">
          Max Price/Night
        </label>
        <input
          id="qm-price-filter"
          type="number"
          className="qm-filter-input"
          placeholder="e.g., 150"
          min="0"
          step="10"
          value={filters.maxPrice || ''}
          onChange={handleMaxPriceChange}
        />
      </div>

      {/* Min Score Filter */}
      <div className="qm-filter-group">
        <label htmlFor="qm-score-filter" className="qm-filter-label">
          Minimum Score
        </label>
        <select
          id="qm-score-filter"
          className="qm-filter-select"
          value={filters.minScore || 0}
          onChange={handleMinScoreChange}
        >
          {SCORE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Actions */}
      <div className="qm-filter-actions">
        <button
          type="button"
          className="qm-filter-btn qm-filter-btn--reset"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
