import { useRef, useState } from 'react';

/**
 * BoroughSearchFilter - Multi-select borough filter with chip display
 *
 * Shows selected boroughs as compact chips with a "+" button to add more.
 * When no boroughs are selected, shows "All Boroughs" placeholder.
 * Selecting no boroughs means all listings are shown (no borough filter applied).
 */
export function BoroughSearchFilter({
  boroughs,
  selectedBoroughs,
  onBoroughsChange,
  searchInputId
}) {
  const inputId = searchInputId || 'boroughSearch';
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  const handleBoroughSelect = (boroughValue) => {
    if (!selectedBoroughs.includes(boroughValue)) {
      onBoroughsChange([...selectedBoroughs, boroughValue]);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemoveBorough = (boroughValue) => {
    onBoroughsChange(selectedBoroughs.filter(v => v !== boroughValue));
  };

  const handleClearAll = () => {
    onBoroughsChange([]);
    setSearchTerm('');
  };

  // Filter to unselected boroughs matching search
  const filteredBoroughs = boroughs.filter((b) => {
    if (selectedBoroughs.includes(b.value)) return false;
    if (!searchTerm) return true;
    return b.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleBlur = (e) => {
    // Only close if focus left the entire container
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setIsOpen(false);
    }
  };

  const hasSelections = selectedBoroughs.length > 0;

  return (
    <div
      className="filter-group compact borough-search-group"
      ref={containerRef}
      onBlur={handleBlur}
    >
      <label htmlFor={inputId}>Borough</label>

      {/* Selected chips with add button */}
      {hasSelections ? (
        <div className="borough-chips-row">
          {selectedBoroughs.map(value => {
            const borough = boroughs.find(b => b.value === value);
            if (!borough) return null;
            return (
              <span key={value} className="borough-chip-compact">
                {borough.name}
                <button
                  type="button"
                  onClick={() => handleRemoveBorough(value)}
                  aria-label={`Remove ${borough.name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
          {/* Add more button */}
          <button
            type="button"
            className="borough-add-btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Add borough"
          >
            +
          </button>
        </div>
      ) : (
        /* "All Boroughs" state - click to open selection */
        <button
          type="button"
          className="borough-all-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          All Boroughs
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div className="borough-search-dropdown">
          {/* Search input inside dropdown */}
          <div className="borough-dropdown-search">
            <input
              ref={inputRef}
              type="text"
              id={inputId}
              placeholder="Search boroughs..."
              className="borough-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          {filteredBoroughs.length === 0 ? (
            <div className="borough-search-empty">
              {boroughs.length === 0 ? 'Loading...' : 'No matches'}
            </div>
          ) : (
            filteredBoroughs.map(borough => (
              <button
                key={borough.id}
                type="button"
                className="borough-search-option"
                onClick={() => handleBoroughSelect(borough.value)}
              >
                {borough.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
