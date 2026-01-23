/**
 * Listings Header Component
 *
 * Top header bar with page title, action buttons, and navigation.
 * Migrated from _listings-overview/Header.tsx → JavaScript
 */

/**
 * @param {Object} props
 * @param {number} props.totalCount - Total number of listings
 * @param {boolean} props.isProcessing - Whether a bulk operation is in progress
 * @param {() => void} props.onIncrementPrices - Handler for bulk price increment
 */
export default function ListingsHeader({
  totalCount,
  isProcessing,
  onIncrementPrices,
}) {
  return (
    <div className="lo-page-header">
      <div className="lo-header-content">
        <h1 className="lo-page-title">
          Listing Selection Dashboard - {totalCount} listings
        </h1>
        <div className="lo-header-actions">
          <button
            className="lo-btn lo-btn-secondary"
            onClick={() => window.location.href = '/_internal/quick-price'}
          >
            Go to Quick Price
          </button>
          <button
            className="lo-btn lo-btn-secondary"
            onClick={() => window.location.href = '/_internal/modify-listings'}
          >
            Modify Listings
          </button>
          <button
            className="lo-btn lo-btn-primary"
            onClick={onIncrementPrices}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Increment Nightly Prices'}
          </button>
        </div>
      </div>
    </div>
  );
}
