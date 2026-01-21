/**
 * PricingFilters - Filter sidebar for Quick Price page
 *
 * Provides filters for:
 * - Text search (name)
 * - Rental type dropdown
 * - Borough dropdown
 * - Neighborhood text input
 * - Active only toggle
 * - Sort controls
 */

export default function PricingFilters({
  searchQuery,
  onSearchChange,
  rentalTypeFilter,
  onRentalTypeChange,
  rentalTypeOptions,
  boroughFilter,
  onBoroughChange,
  boroughOptions,
  neighborhoodFilter,
  onNeighborhoodChange,
  activeOnlyFilter,
  onActiveOnlyChange,
  sortField,
  onSortFieldChange,
  sortOptions,
  sortOrder,
  onSortOrderToggle,
  onClearFilters,
}) {
  const hasActiveFilters = searchQuery || rentalTypeFilter || boroughFilter || neighborhoodFilter || activeOnlyFilter;

  return (
    <div className="pricing-filters">
      <div className="pricing-filters__header">
        <h2 className="pricing-filters__title">Filters</h2>
        {hasActiveFilters && (
          <button
            className="pricing-filters__clear-btn"
            onClick={onClearFilters}
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="pricing-filters__group">
        <label className="pricing-filters__label" htmlFor="search">
          Search
        </label>
        <input
          id="search"
          type="text"
          className="pricing-filters__input"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Rental Type */}
      <div className="pricing-filters__group">
        <label className="pricing-filters__label" htmlFor="rentalType">
          Rental Type
        </label>
        <select
          id="rentalType"
          className="pricing-filters__select"
          value={rentalTypeFilter}
          onChange={(e) => onRentalTypeChange(e.target.value)}
        >
          {rentalTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Borough */}
      <div className="pricing-filters__group">
        <label className="pricing-filters__label" htmlFor="borough">
          Borough
        </label>
        <select
          id="borough"
          className="pricing-filters__select"
          value={boroughFilter}
          onChange={(e) => onBoroughChange(e.target.value)}
        >
          {boroughOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Neighborhood */}
      <div className="pricing-filters__group">
        <label className="pricing-filters__label" htmlFor="neighborhood">
          Neighborhood
        </label>
        <input
          id="neighborhood"
          type="text"
          className="pricing-filters__input"
          placeholder="Filter by neighborhood..."
          value={neighborhoodFilter}
          onChange={(e) => onNeighborhoodChange(e.target.value)}
        />
      </div>

      {/* Active Only Toggle */}
      <div className="pricing-filters__group pricing-filters__group--toggle">
        <label className="pricing-filters__toggle-label">
          <input
            type="checkbox"
            className="pricing-filters__checkbox"
            checked={activeOnlyFilter}
            onChange={(e) => onActiveOnlyChange(e.target.checked)}
          />
          <span className="pricing-filters__toggle-text">Active listings only</span>
        </label>
      </div>

      <hr className="pricing-filters__divider" />

      {/* Sort Controls */}
      <div className="pricing-filters__group">
        <label className="pricing-filters__label" htmlFor="sortField">
          Sort By
        </label>
        <div className="pricing-filters__sort-row">
          <select
            id="sortField"
            className="pricing-filters__select pricing-filters__select--sort"
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className={`pricing-filters__sort-btn ${sortOrder === 'desc' ? 'pricing-filters__sort-btn--desc' : ''}`}
            onClick={onSortOrderToggle}
            type="button"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
