/**
 * EmptyState - Displayed when no responses match filters
 *
 * Props:
 * - message: Message to display
 * - hasFilters: Whether active filters are applied
 * - onClearFilters: Handler to clear all filters
 */

export default function EmptyState({ message, hasFilters, onClearFilters }) {
  return (
    <div className="er-empty-state">
      <div className="er-empty-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <p className="er-empty-message">{message}</p>
      {hasFilters && onClearFilters && (
        <button className="er-btn er-btn-secondary" onClick={onClearFilters}>
          Clear Filters
        </button>
      )}
    </div>
  );
}
