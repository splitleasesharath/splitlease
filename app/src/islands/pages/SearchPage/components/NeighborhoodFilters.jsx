import { useRef } from 'react';
import { sanitizeNeighborhoodSearch } from '../../../../lib/sanitize.js';

/**
 * NeighborhoodCheckboxList - Simple scrollable list with checkboxes
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
