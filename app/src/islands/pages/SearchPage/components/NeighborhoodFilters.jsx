import { useRef, useState } from 'react';
import { sanitizeNeighborhoodSearch } from '../../../../lib/sanitize.js';

/**
 * NeighborhoodSearchFilter - Compact search-based neighborhood selector
 *
 * Shows a small search input that expands to show filtered results.
 * Selected neighborhoods display as compact chips below the input.
 */
export function NeighborhoodSearchFilter({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange,
  searchInputId
}) {
  const inputId = searchInputId || 'neighborhoodSearch';
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const handleNeighborhoodSelect = (neighborhoodId) => {
    if (!selectedNeighborhoods.includes(neighborhoodId)) {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhoodId]);
    }
    onNeighborhoodSearchChange('');
    setIsOpen(false); // Close dropdown after selection
  };

  const handleRemoveNeighborhood = (neighborhoodId) => {
    onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
  };

  const handleClearAll = () => {
    onNeighborhoodsChange([]);
    onNeighborhoodSearchChange('');
  };

  const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch || '');

  // Filter to unselected neighborhoods matching search
  const filteredNeighborhoods = neighborhoods.filter((n) => {
    if (selectedNeighborhoods.includes(n.id)) return false;
    if (!sanitizedSearch) return true;
    return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
  });

  const handleBlur = (e) => {
    // Only close if focus left the entire container
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setIsOpen(false);
    }
  };

  const hasSelections = selectedNeighborhoods.length > 0;

  return (
    <div
      className="filter-group compact neighborhood-search-group"
      ref={containerRef}
      onBlur={handleBlur}
    >
      <label htmlFor={inputId}>Neighborhood</label>

      {/* Selected chips with add button */}
      {hasSelections ? (
        <div className="neighborhood-chips-row">
          {selectedNeighborhoods.map(id => {
            const neighborhood = neighborhoods.find(n => n.id === id);
            if (!neighborhood) return null;
            return (
              <span key={id} className="neighborhood-chip-compact">
                {neighborhood.name}
                <button
                  type="button"
                  onClick={() => handleRemoveNeighborhood(id)}
                  aria-label={`Remove ${neighborhood.name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
          {/* Add more button */}
          <button
            type="button"
            className="neighborhood-add-btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Add neighborhood"
          >
            +
          </button>
        </div>
      ) : (
        /* Search input - only shown when no selections */
        <div className="neighborhood-search-container">
          <input
            ref={inputRef}
            type="text"
            id={inputId}
            placeholder="Search neighborhoods..."
            className="neighborhood-search-input"
            value={neighborhoodSearch}
            onChange={(e) => onNeighborhoodSearchChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div className="neighborhood-search-dropdown">
          {/* Search input inside dropdown when adding more */}
          {hasSelections && (
            <div className="neighborhood-dropdown-search">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search to add..."
                className="neighborhood-search-input"
                value={neighborhoodSearch}
                onChange={(e) => onNeighborhoodSearchChange(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}
          {filteredNeighborhoods.length === 0 ? (
            <div className="neighborhood-search-empty">
              {neighborhoods.length === 0 ? 'Loading...' : 'No matches'}
            </div>
          ) : (
            filteredNeighborhoods.slice(0, 8).map(neighborhood => (
              <button
                key={neighborhood.id}
                type="button"
                className="neighborhood-search-option"
                onClick={() => handleNeighborhoodSelect(neighborhood.id)}
              >
                {neighborhood.name}
              </button>
            ))
          )}
          {filteredNeighborhoods.length > 8 && (
            <div className="neighborhood-search-more">
              +{filteredNeighborhoods.length - 8} more — type to filter
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * NeighborhoodCheckboxList - Simple scrollable list with checkboxes (legacy)
 */
export function NeighborhoodCheckboxList({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  id
}) {
  // Toggle neighborhood selection
  const handleToggleNeighborhood = (neighborhoodId) => {
    if (selectedNeighborhoods.includes(neighborhoodId)) {
      onNeighborhoodsChange(selectedNeighborhoods.filter(nId => nId !== neighborhoodId));
    } else {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhoodId]);
    }
  };

  return (
    <div className="filter-group compact neighborhood-checkbox-list-group">
      <label>Refine Neighborhood(s)</label>

      {/* Scrollable list with checkboxes */}
      <div className="neighborhood-checkbox-list" id={id}>
        {neighborhoods.length === 0 ? (
          <div className="neighborhood-list-empty">Loading neighborhoods...</div>
        ) : (
          neighborhoods.map(neighborhood => (
            <label key={neighborhood.id} className="neighborhood-checkbox-item">
              <input
                type="checkbox"
                checked={selectedNeighborhoods.includes(neighborhood.id)}
                onChange={() => handleToggleNeighborhood(neighborhood.id)}
              />
              <span>{neighborhood.name}</span>
            </label>
          ))
        )}
      </div>

      {selectedNeighborhoods.length > 0 && (
        <div className="neighborhood-selection-count">
          {selectedNeighborhoods.length} selected
        </div>
      )}
    </div>
  );
}

export function NeighborhoodDropdownFilter({
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  neighborhoodSearch,
  onNeighborhoodSearchChange,
  searchInputId
}) {
  const inputId = searchInputId || 'neighborhoodSearch';

  const handleNeighborhoodToggle = (neighborhoodId) => {
    const isSelected = selectedNeighborhoods.includes(neighborhoodId);
    if (isSelected) {
      onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
    } else {
      onNeighborhoodsChange([...selectedNeighborhoods, neighborhoodId]);
    }
  };

  const handleRemoveNeighborhood = (neighborhoodId) => {
    onNeighborhoodsChange(selectedNeighborhoods.filter(id => id !== neighborhoodId));
  };

  const sanitizedSearch = sanitizeNeighborhoodSearch(neighborhoodSearch || '');

  const filteredNeighborhoods = neighborhoods.filter((n) => {
    if (!sanitizedSearch) {
      return true;
    }
    return n.name.toLowerCase().includes(sanitizedSearch.toLowerCase());
  });

  const inputRef = useRef(null);

  const handleContainerClick = (e) => {
    // Focus the input when clicking on the container
    if (inputRef.current && e.target.closest('.neighborhood-dropdown-container')) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="filter-group compact neighborhoods-group">
      <label htmlFor={inputId}>Refine Neighborhood(s)</label>
      <div
        className="neighborhood-dropdown-container"
        onClick={handleContainerClick}
      >
        {selectedNeighborhoods.length > 0 && (
          <div className="selected-neighborhoods-chips">
            {selectedNeighborhoods.map(id => {
              const neighborhood = neighborhoods.find(n => n.id === id);
              if (!neighborhood) return null;

              return (
                <div key={id} className="neighborhood-chip">
                  <span>{neighborhood.name}</span>
                  <button
                    type="button"
                    className="neighborhood-chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveNeighborhood(id);
                    }}
                    aria-label={`Remove ${neighborhood.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          placeholder={selectedNeighborhoods.length > 0 ? "" : "Search neighborhoods..."}
          className="neighborhood-search"
          value={neighborhoodSearch}
          onChange={(e) => onNeighborhoodSearchChange(e.target.value)}
        />
      </div>

      <div className="neighborhood-list">
        {filteredNeighborhoods.length === 0 ? (
          <div style={{ padding: '10px', color: '#666' }}>
            {neighborhoods.length === 0 ? 'Loading neighborhoods...' : 'No neighborhoods found'}
          </div>
        ) : (
          filteredNeighborhoods.map(neighborhood => (
            <label key={neighborhood.id}>
              <input
                type="checkbox"
                value={neighborhood.id}
                checked={selectedNeighborhoods.includes(neighborhood.id)}
                onChange={() => handleNeighborhoodToggle(neighborhood.id)}
              />
              {neighborhood.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
