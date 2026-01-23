/**
 * FilterBar - Search and type filter controls for experience responses
 *
 * Props:
 * - searchTerm: Current search input value
 * - selectedTypes: Array of selected types ['Guest', 'Host']
 * - onSearchChange: Handler for search input changes
 * - onTypeToggle: Handler for toggling type checkboxes
 */

export default function FilterBar({
  searchTerm,
  selectedTypes,
  onSearchChange,
  onTypeToggle,
}) {
  return (
    <div className="er-filter-bar">
      {/* Search Input */}
      <div className="er-search-container">
        <input
          type="text"
          className="er-search-input"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search responses by name"
        />
        <span className="er-search-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
      </div>

      {/* Type Filters */}
      <div className="er-type-filters">
        <label className="er-checkbox-label">
          <input
            type="checkbox"
            checked={selectedTypes.includes('Guest')}
            onChange={() => onTypeToggle('Guest')}
          />
          <span className="er-checkbox-text">Guest</span>
        </label>

        <label className="er-checkbox-label">
          <input
            type="checkbox"
            checked={selectedTypes.includes('Host')}
            onChange={() => onTypeToggle('Host')}
          />
          <span className="er-checkbox-text">Host</span>
        </label>
      </div>
    </div>
  );
}
