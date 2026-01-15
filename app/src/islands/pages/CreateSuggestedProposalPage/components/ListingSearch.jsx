/**
 * ListingSearch - Step 1: Search and select a listing
 */

import { getFirstPhoto, getLastPhoto, getAddressString, getDefaultPhoto } from '../suggestedProposalService.js';

export default function ListingSearch({
  searchTerm,
  searchResults,
  selectedListing,
  listingPhotos,
  isSearching,
  onSearchChange,
  onSelect,
  onClear,
  onClearSearch
}) {
  return (
    <section className="csp-step-section">
      <div className="csp-section-header">
        <h2>Step 1: Select Listing</h2>
      </div>

      {/* Search Input */}
      <div className="csp-search-container">
        <label htmlFor="listingSearch">Filter by host</label>
        <div className="csp-search-input-wrapper">
          <input
            type="text"
            id="listingSearch"
            className="csp-search-input"
            placeholder="Search Host Name, email, listing name, unique id, rental type"
            value={searchTerm}
            onChange={onSearchChange}
            disabled={!!selectedListing}
          />
          {searchTerm && (
            <button
              className="csp-btn-clear-search"
              onClick={onClearSearch}
              title="Clear"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchTerm.length >= 2 && !selectedListing && (
          <div className="csp-search-results">
            {isSearching ? (
              <div className="csp-loading">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="csp-no-results">No listings found</div>
            ) : (
              searchResults.map(listing => (
                <div
                  key={listing._id}
                  className="csp-search-result-item"
                  onClick={() => onSelect(listing)}
                >
                  <img
                    src={getFirstPhoto(listing) || getDefaultPhoto()}
                    alt={listing.Name || 'Listing'}
                    className="csp-thumbnail"
                    onError={(e) => { e.target.src = getDefaultPhoto(); }}
                  />
                  <div className="csp-search-result-info">
                    <h4>
                      {listing['host name'] || 'Unknown Host'} - {listing.Name || 'Unnamed Listing'} - {listing['rental type'] || 'Standard'} - {listing['Maximum Weeks'] ? `${listing['Maximum Weeks']} weeks` : 'Every week'}
                    </h4>
                    <p className="csp-listing-details-row">unique id: {listing._id}</p>
                    <p className="csp-listing-details-row">host email: {listing['Host email'] || ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Listing Card */}
      {selectedListing && (
        <div className="csp-selected-item-card">
          <div className="csp-item-photos">
            <img
              src={getFirstPhoto(selectedListing, listingPhotos) || getDefaultPhoto()}
              alt="Listing"
              className="csp-item-photo"
              onError={(e) => { e.target.src = getDefaultPhoto(); }}
            />
            <img
              src={getLastPhoto(selectedListing, listingPhotos) || getDefaultPhoto()}
              alt="Listing"
              className="csp-item-photo"
              onError={(e) => { e.target.src = getDefaultPhoto(); }}
            />
          </div>
          <div className="csp-item-details">
            <h3>{selectedListing.Name || 'Unnamed Listing'}</h3>
            <p className="csp-item-subtitle">{getAddressString(selectedListing)}</p>
            <p className="csp-item-meta">Host: {selectedListing['host name'] || 'Unknown'}</p>
            <span className="csp-badge">{selectedListing['rental type'] || 'Standard'}</span>
          </div>
          <button
            className="csp-btn-remove"
            onClick={onClear}
            title="Remove selection"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
