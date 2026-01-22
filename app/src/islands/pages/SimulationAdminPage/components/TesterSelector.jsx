/**
 * TesterSelector - Dropdown selector for choosing a tester
 *
 * Features:
 * - Search input for filtering testers
 * - Dropdown list with tester name, email, and current step
 * - Pagination for large tester lists
 * - Loading state
 */

import './TesterSelector.css';

export default function TesterSelector({
  testers,
  selectedTester,
  searchText,
  isLoading,
  currentPage,
  totalPages,
  onSelect,
  onSearchChange,
  onPageChange,
  getTesterDisplayName,
  getStepLabel,
}) {
  return (
    <div className="tester-selector">
      {/* Search Input */}
      <div className="tester-selector__search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="tester-selector__search-input"
        />
        {searchText && (
          <button
            onClick={() => onSearchChange('')}
            className="tester-selector__clear-search"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Tester List */}
      <div className="tester-selector__list">
        {isLoading ? (
          <div className="tester-selector__loading">
            <span className="tester-selector__loading-spinner" />
            <span>Loading testers...</span>
          </div>
        ) : testers.length === 0 ? (
          <div className="tester-selector__empty">
            {searchText
              ? 'No testers match your search'
              : 'No usability testers found'}
          </div>
        ) : (
          testers.map((tester) => (
            <button
              key={tester.id}
              onClick={() => onSelect(tester)}
              className={`tester-selector__item ${
                selectedTester?.id === tester.id ? 'tester-selector__item--selected' : ''
              }`}
            >
              <div className="tester-selector__item-info">
                <span className="tester-selector__item-name">
                  {getTesterDisplayName(tester)}
                </span>
                <span className="tester-selector__item-email">
                  {tester.email}
                </span>
              </div>
              <span className={`tester-selector__item-step tester-selector__item-step--${tester.usabilityStep <= 3 ? 'day1' : tester.usabilityStep <= 6 ? 'day2' : 'complete'}`}>
                {getStepLabel(tester.usabilityStep)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="tester-selector__pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="tester-selector__page-button"
          >
            Previous
          </button>
          <span className="tester-selector__page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="tester-selector__page-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ===== ICONS =====

function SearchIcon() {
  return (
    <svg
      className="tester-selector__search-icon"
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

function ClearIcon() {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      width="16"
      height="16"
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
