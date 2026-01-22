/**
 * EmptyState - Empty state display for Quick Price page
 */

export default function EmptyState({ title, message, onClearFilters }) {
  return (
    <div className="quick-price__state quick-price__state--empty">
      <svg
        className="quick-price__state-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        width="48"
        height="48"
      >
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <h3 className="quick-price__state-title">{title}</h3>
      <p className="quick-price__state-message">{message}</p>
      {onClearFilters && (
        <button
          className="quick-price__state-btn"
          onClick={onClearFilters}
          type="button"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
