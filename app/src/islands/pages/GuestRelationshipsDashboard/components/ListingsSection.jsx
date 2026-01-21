/**
 * Listings Section Component
 *
 * Manage listings and multi-user selection.
 * Converted from TypeScript to JavaScript following Split Lease patterns.
 */

import { useState } from 'react';
import { Home, Plus, Trash2, Eye, Users, MapPin, CheckSquare, Square } from 'lucide-react';

export default function ListingsSection({
  suggestedListings,
  allListings,
  allGuests,
  selectedUsers,
  onAddListing,
  onRemoveListing,
  onAddCuratedListing,
  onSelectAllGuests,
  onDeselectAllGuests,
  onToggleUserSelection
}) {
  const [selectedListing, setSelectedListing] = useState('');
  const [curatedListing, setCuratedListing] = useState('');

  function handleAddListing() {
    if (selectedListing && selectedUsers.length > 0) {
      onAddListing(selectedListing, selectedUsers);
      setSelectedListing('');
    }
  }

  function handleAddCurated() {
    if (curatedListing) {
      onAddCuratedListing(curatedListing);
      setCuratedListing('');
    }
  }

  function getListingName(listing) {
    return listing.name || listing['Listing Name'] || 'Unnamed Listing';
  }

  function getListingHood(listing) {
    return listing.location?.hood || listing['Hood - Text'] || 'NYC';
  }

  function getListingPhoto(listing) {
    const photos = listing.photos || listing['📷 All Photos for Display'] || [];
    return photos[0]?.url || photos[0] || null;
  }

  function getListingType(listing) {
    return listing.rentalType?.display || listing['Rental Type'] || 'Rental';
  }

  return (
    <div className="grd-listings-section">
      {/* Multi-User Selection */}
      <div className="grd-listings-group">
        <div className="grd-listings-header">
          <h2 className="grd-section-title">
            <Users size={20} />
            Selecting Multiple Users
          </h2>
        </div>
        <div className="grd-multi-user-selector">
          <div className="grd-user-selection-controls">
            <button className="grd-btn grd-btn-secondary grd-btn-sm" onClick={onSelectAllGuests}>
              <CheckSquare size={14} />
              Select all Guests
            </button>
            <button className="grd-btn grd-btn-secondary grd-btn-sm" onClick={onDeselectAllGuests}>
              <Square size={14} />
              Deselect All
            </button>
          </div>
          <div className="grd-users-grid">
            {allGuests.slice(0, 12).map(guest => (
              <div
                key={guest._id}
                className={`grd-user-chip ${selectedUsers.includes(guest._id) ? 'grd-user-chip-selected' : ''}`}
                onClick={() => onToggleUserSelection(guest._id)}
              >
                <div className="grd-user-chip-avatar">
                  {guest.profilePhoto ? (
                    <img src={guest.profilePhoto} alt="" />
                  ) : (
                    <span>{(guest.firstName?.[0] || '')}{(guest.lastName?.[0] || '')}</span>
                  )}
                </div>
                <span className="grd-user-chip-name">{guest.firstName} {guest.lastName}</span>
                {selectedUsers.includes(guest._id) && (
                  <CheckSquare size={14} className="grd-check-icon" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="grd-add-listing-form">
          <select
            className="grd-form-select"
            value={selectedListing}
            onChange={(e) => setSelectedListing(e.target.value)}
          >
            <option value="">Select a listing...</option>
            {allListings.map(listing => (
              <option key={listing._id || listing.id} value={listing._id || listing.id}>
                {getListingName(listing)}
              </option>
            ))}
          </select>
          <button
            className="grd-btn grd-btn-primary grd-btn-sm"
            onClick={handleAddListing}
            disabled={!selectedListing || selectedUsers.length === 0}
          >
            <Plus size={14} />
            Add Listing
          </button>
        </div>
      </div>

      {/* Add Curated Listing */}
      <div className="grd-listings-group">
        <div className="grd-listings-header">
          <h2 className="grd-section-title">
            <Home size={20} />
            Add a Curated Listing
          </h2>
        </div>
        <div className="grd-add-listing-form">
          <select
            className="grd-form-select"
            value={curatedListing}
            onChange={(e) => setCuratedListing(e.target.value)}
          >
            <option value="">Select a curated listing...</option>
            {allListings.map(listing => (
              <option key={listing._id || listing.id} value={listing._id || listing.id}>
                {getListingName(listing)} - {getListingHood(listing)}
              </option>
            ))}
          </select>
          <button
            className="grd-btn grd-btn-primary grd-btn-sm"
            onClick={handleAddCurated}
            disabled={!curatedListing}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Suggested Listings */}
      <div className="grd-listings-group">
        <div className="grd-listings-header">
          <h2 className="grd-section-title">
            <Home size={20} />
            Listings to be Added to All
          </h2>
          <span className="grd-listings-count">{suggestedListings.length}</span>
        </div>
        <div className="grd-listings-grid">
          {suggestedListings.length > 0 ? (
            suggestedListings.map(listing => {
              const listingId = listing._id || listing.id;
              const photoUrl = getListingPhoto(listing);

              return (
                <div key={listingId} className="grd-listing-card">
                  <div className="grd-listing-image">
                    {photoUrl ? (
                      <img src={photoUrl} alt={getListingName(listing)} />
                    ) : (
                      <div className="grd-placeholder-image">
                        <Home size={32} />
                      </div>
                    )}
                  </div>
                  <div className="grd-listing-info">
                    <h4 className="grd-listing-name">{getListingName(listing)}</h4>
                    <div className="grd-listing-meta">
                      <span className="grd-listing-location">
                        <MapPin size={14} />
                        {getListingHood(listing)}
                      </span>
                      <span className="grd-listing-type">{getListingType(listing)}</span>
                    </div>
                  </div>
                  <div className="grd-listing-actions">
                    <button className="grd-btn grd-btn-secondary grd-btn-sm">
                      <Eye size={14} />
                      View Listing
                    </button>
                    <button
                      className="grd-btn grd-btn-icon"
                      onClick={() => onRemoveListing(listingId)}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grd-empty-state">
              <Home size={32} />
              <p>No suggested listings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
