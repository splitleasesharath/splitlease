/**
 * Listings Table Component
 *
 * Table wrapper that renders the header row and listing rows.
 * Includes load more pagination button.
 *
 * Migrated from _listings-overview/ListingsTable.tsx → JavaScript
 */

import ListingRow from './ListingRow.jsx';

/**
 * @param {Object} props
 * @param {Array} props.listings - Array of normalized listing objects
 * @param {Array} props.boroughs - Borough options
 * @param {Array} props.neighborhoods - Neighborhood options
 * @param {Array} props.errorOptions - Preset error options
 * @param {boolean} props.isLoading - Loading state
 * @param {(id: string, value: boolean) => void} props.onToggleUsability
 * @param {(id: string, value: boolean) => void} props.onToggleActive
 * @param {(id: string, value: boolean) => void} props.onToggleShowcase
 * @param {(id: string, boroughId: string) => void} props.onBoroughChange
 * @param {(id: string, neighborhoodId: string) => void} props.onNeighborhoodChange
 * @param {(listing: Object) => void} props.onView
 * @param {(listing: Object) => void} props.onSeeDescription
 * @param {(listing: Object) => void} props.onSeePrices
 * @param {(id: string) => void} props.onDelete
 * @param {(id: string, errorCode: string) => void} props.onAddError
 * @param {(id: string) => void} props.onClearErrors
 * @param {(listing: Object) => void} props.onSeeErrors
 * @param {() => void} props.onLoadMore
 * @param {boolean} props.hasMore
 */
export default function ListingsTable({
  listings,
  boroughs,
  neighborhoods,
  errorOptions,
  isLoading,
  onToggleUsability,
  onToggleActive,
  onToggleShowcase,
  onBoroughChange,
  onNeighborhoodChange,
  onView,
  onSeeDescription,
  onSeePrices,
  onDelete,
  onAddError,
  onClearErrors,
  onSeeErrors,
  onLoadMore,
  hasMore,
}) {
  return (
    <div className="lo-listings-table">
      {/* Table Header */}
      <div className="lo-listings-header">
        <div className="lo-header-col">Listing Details</div>
        <div className="lo-header-col">Features</div>
        <div className="lo-header-col">Status</div>
        <div className="lo-header-col">Location</div>
        <div className="lo-header-col">Pricing</div>
        <div className="lo-header-col">Actions</div>
        <div className="lo-header-col">Errors</div>
      </div>

      {/* Table Body */}
      <div className="lo-listings-body">
        {listings.map(listing => (
          <ListingRow
            key={listing.id}
            listing={listing}
            boroughs={boroughs}
            neighborhoods={neighborhoods}
            errorOptions={errorOptions}
            onToggleUsability={onToggleUsability}
            onToggleActive={onToggleActive}
            onToggleShowcase={onToggleShowcase}
            onBoroughChange={onBoroughChange}
            onNeighborhoodChange={onNeighborhoodChange}
            onView={onView}
            onSeeDescription={onSeeDescription}
            onSeePrices={onSeePrices}
            onDelete={onDelete}
            onAddError={onAddError}
            onClearErrors={onClearErrors}
            onSeeErrors={onSeeErrors}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="lo-load-more">
          <button
            className="lo-btn lo-btn-secondary"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
