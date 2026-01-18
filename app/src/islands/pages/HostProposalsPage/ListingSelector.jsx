/**
 * ListingSelector Component
 *
 * Dropdown selector for host listings with proposal count display.
 */

/**
 * @param {Object} props
 * @param {Array} props.listings - Array of listing objects
 * @param {Object|null} props.selectedListing - Currently selected listing
 * @param {Function} props.onListingChange - Callback when listing is changed
 * @param {number} props.proposalCount - Number of proposals for selected listing
 */
export default function ListingSelector({
  listings = [],
  selectedListing,
  onListingChange,
  proposalCount = 0
}) {
  const handleChange = (e) => {
    const listing = listings.find(l => l._id === e.target.value || l.id === e.target.value);
    if (listing) {
      onListingChange(listing);
    }
  };

  const selectedId = selectedListing?._id || selectedListing?.id || '';

  return (
    <div className="listing-selector">
      <div className="listing-selector-header">
        <span className="listings-label">Listings ({listings.length})</span>
      </div>

      <select
        className="listing-dropdown"
        value={selectedId}
        onChange={handleChange}
      >
        {listings.map((listing) => (
          <option key={listing._id || listing.id} value={listing._id || listing.id}>
            {listing.Name || listing.name || listing['Listing Name'] || 'Unnamed Listing'}
          </option>
        ))}
      </select>

      <div className="proposal-count">
        <strong>{proposalCount}</strong> Proposal(s)
      </div>
    </div>
  );
}
