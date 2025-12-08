/**
 * EmptyState Component
 *
 * Displayed when there are no proposals for the selected listing.
 */

/**
 * @param {Object} props
 * @param {Function} [props.onEditListing] - Callback to edit the listing
 */
export default function EmptyState({ onEditListing }) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" stroke="#31135D" strokeWidth="2"/>
            <path d="M24 12V24L32 28" stroke="#31135D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="empty-state-title">No proposals on this listing yet</h2>

        <p className="empty-state-subtitle">
          We're working to find you a guest. In the meantime, search other listings.
        </p>

        <button className="empty-state-button" onClick={onEditListing}>
          Edit this Listing
        </button>
      </div>
    </div>
  );
}
