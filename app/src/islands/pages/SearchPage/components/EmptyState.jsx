/**
 * EmptyState - No results found message
 */
export function EmptyState({ onResetFilters }) {
  return (
    <div className="no-results-notice">
      <img
        src="/assets/images/no-listings-found.png"
        alt="No listings found"
        width="120"
        height="120"
        style={{ objectFit: 'contain' }}
      />
      <h3>No Listings Found</h3>
      <p>No listings match your current filters. Try adjusting your selection.</p>
      <button className="reset-filters-btn" onClick={onResetFilters}>
        Reset Filters
      </button>
    </div>
  );
}
