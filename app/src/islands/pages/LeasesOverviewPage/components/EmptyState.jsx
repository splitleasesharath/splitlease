/**
 * EmptyState - Shown when no leases match filters
 */

export default function EmptyState({ title, message, onClearFilters }) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__message">{message}</p>
      {onClearFilters && (
        <button className="empty-state__btn" onClick={onClearFilters}>
          Clear Filters
        </button>
      )}
    </div>
  );
}
