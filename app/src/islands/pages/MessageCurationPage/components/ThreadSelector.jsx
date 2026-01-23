/**
 * ThreadSelector - Thread search and selection component
 *
 * Features:
 * - Search input for filtering threads
 * - Thread list with listing name and guest email
 * - Pagination for large thread lists
 * - Loading state
 */

export default function ThreadSelector({
  threads,
  selectedThreadId,
  searchText,
  isLoading,
  currentPage,
  totalPages,
  onSelect,
  onSearchChange,
  onPageChange,
  getThreadDisplayLabel,
  formatDate,
}) {
  return (
    <div className="thread-selector">
      {/* Search Input */}
      <div className="thread-selector__search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search by listing, email, or name..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="thread-selector__search-input"
        />
        {searchText && (
          <button
            onClick={() => onSearchChange('')}
            className="thread-selector__clear-search"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Thread List */}
      <div className="thread-selector__list">
        {isLoading ? (
          <div className="thread-selector__loading">
            <span className="thread-selector__loading-spinner" />
            <span>Loading threads...</span>
          </div>
        ) : threads.length === 0 ? (
          <div className="thread-selector__empty">
            {searchText
              ? 'No threads match your search'
              : 'No threads found'}
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelect(thread.id)}
              className={`thread-selector__item ${
                selectedThreadId === thread.id ? 'thread-selector__item--selected' : ''
              }`}
            >
              <div className="thread-selector__item-main">
                <span className="thread-selector__item-listing">
                  {thread.listing?.name || 'No Listing'}
                </span>
                <span className="thread-selector__item-guest">
                  {thread.guest?.email || 'No Guest'}
                </span>
              </div>
              <div className="thread-selector__item-meta">
                <span className="thread-selector__item-host">
                  Host: {thread.host?.firstName || thread.host?.email || 'N/A'}
                </span>
                <span className="thread-selector__item-date">
                  {formatDate(thread.modifiedAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="thread-selector__pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="thread-selector__page-button"
          >
            Previous
          </button>
          <span className="thread-selector__page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="thread-selector__page-button"
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
      className="thread-selector__search-icon"
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
