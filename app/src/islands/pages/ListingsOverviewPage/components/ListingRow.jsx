/**
 * Listing Row Component
 *
 * Individual row in the listings table displaying:
 * - Listing details (name, host, dates)
 * - Features & photos
 * - Status toggles (usability, active, showcase)
 * - Location dropdowns
 * - Pricing information
 * - Action buttons
 * - Error management
 *
 * Migrated from _listings-overview/ListingRow.tsx → JavaScript
 */

import { useState } from 'react';

/**
 * @param {Object} props
 * @param {Object} props.listing - Normalized listing object
 * @param {Array} props.boroughs - Borough options
 * @param {Array} props.neighborhoods - Neighborhood options
 * @param {Array} props.errorOptions - Preset error options
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
 */
export default function ListingRow({
  listing,
  boroughs,
  neighborhoods,
  errorOptions,
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
}) {
  const [customError, setCustomError] = useState('');

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date instanceof Date ? date : new Date(date));
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Filter neighborhoods by selected borough
  const filteredNeighborhoods = neighborhoods.filter(
    n => n.boroughId === listing.location.borough
  );

  // Handle preset error selection
  const handleErrorSelect = (e) => {
    const value = e.target.value;
    if (value) {
      onAddError(listing.id, value);
      e.target.value = '';
    }
  };

  // Handle custom error add
  const handleCustomErrorAdd = () => {
    if (customError.trim()) {
      onAddError(listing.id, customError.trim());
      setCustomError('');
    }
  };

  return (
    <div className="lo-listing-row">
      {/* Column 1: Listing Details */}
      <div className="lo-listing-col lo-listing-details">
        <h3 className="lo-listing-name">{listing.name}</h3>
        <p className="lo-listing-host">Host: {listing.host.name}</p>
        <p className="lo-listing-contact">{listing.host.phone}</p>
        <p className="lo-listing-contact">{listing.host.email}</p>
        <p className="lo-listing-created">Created: {formatDate(listing.createdAt)}</p>
        <p className="lo-listing-id">{listing.uniqueId}</p>
        <p className="lo-listing-photos">{listing.photoCount} photos</p>
      </div>

      {/* Column 2: Features & Photos */}
      <div className="lo-listing-col lo-listing-features">
        {listing.photos.length > 0 && (
          <div className="lo-photo-thumbnails">
            {listing.photos.slice(0, 3).map((photo, idx) => (
              <div key={idx} className="lo-photo-thumb">
                <img src={photo} alt={`Listing photo ${idx + 1}`} />
              </div>
            ))}
            {listing.photos.length > 3 && (
              <span className="lo-more-photos">+{listing.photos.length - 3}</span>
            )}
          </div>
        )}
        <div className="lo-features-list">
          {listing.features.slice(0, 3).map((feature, idx) => (
            <span key={idx} className="lo-feature-tag">{feature}</span>
          ))}
          {listing.features.length > 3 && (
            <span className="lo-feature-more">+{listing.features.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Column 3: Status Toggles */}
      <div className="lo-listing-col lo-listing-toggles">
        <label className="lo-toggle-row">
          <span>Is Usability?</span>
          <input
            type="checkbox"
            checked={listing.usability}
            onChange={(e) => onToggleUsability(listing.id, e.target.checked)}
          />
        </label>
        <label className="lo-toggle-row">
          <span>Active</span>
          <input
            type="checkbox"
            checked={listing.active}
            onChange={(e) => onToggleActive(listing.id, e.target.checked)}
          />
        </label>
        <label className="lo-toggle-row">
          <span>Showcase</span>
          <input
            type="checkbox"
            checked={listing.showcase}
            onChange={(e) => onToggleShowcase(listing.id, e.target.checked)}
          />
        </label>
        <div className="lo-status-badges">
          <span className={`lo-status-badge lo-status-${listing.status.toLowerCase()}`}>
            {listing.status}
          </span>
          <span className={`lo-status-badge lo-avail-${listing.availability.toLowerCase()}`}>
            {listing.availability}
          </span>
        </div>
      </div>

      {/* Column 4: Location Selectors */}
      <div className="lo-listing-col lo-listing-location">
        <select
          className="lo-location-select"
          value={listing.location.borough || ''}
          onChange={(e) => onBoroughChange(listing.id, e.target.value)}
        >
          <option value="">Select Borough</option>
          {boroughs.map(borough => (
            <option key={borough.id} value={borough.id}>
              {borough.name}
            </option>
          ))}
        </select>
        <select
          className="lo-location-select"
          value={listing.location.neighborhood || ''}
          onChange={(e) => onNeighborhoodChange(listing.id, e.target.value)}
          disabled={!listing.location.borough}
        >
          <option value="">Select Neighborhood</option>
          {filteredNeighborhoods.map(hood => (
            <option key={hood.id} value={hood.id}>
              {hood.name}
            </option>
          ))}
        </select>
        <p className="lo-location-display">
          {listing.location.displayBorough}
          {listing.location.displayNeighborhood && ` / ${listing.location.displayNeighborhood}`}
        </p>
      </div>

      {/* Column 5: Pricing */}
      <div className="lo-listing-col lo-listing-pricing">
        <div className="lo-price-field">
          <label>Price Override</label>
          <input
            type="text"
            className="lo-price-input"
            value={listing.pricing.override ? formatCurrency(listing.pricing.override) : '—'}
            readOnly
          />
        </div>
        <div className="lo-price-display">
          <span>Nightly: {formatCurrency(listing.pricing.nightly)}</span>
        </div>
        <div className="lo-price-display">
          <span>3 nights: {formatCurrency(listing.pricing.calculated3Night)}</span>
        </div>
      </div>

      {/* Column 6: Action Buttons */}
      <div className="lo-listing-col lo-listing-actions">
        <button className="lo-btn lo-btn-sm lo-btn-outline" onClick={() => onView(listing)}>
          View
        </button>
        <button className="lo-btn lo-btn-sm lo-btn-outline" onClick={() => onSeeDescription(listing)}>
          Description
        </button>
        <button className="lo-btn lo-btn-sm lo-btn-outline" onClick={() => onSeePrices(listing)}>
          Prices
        </button>
        <button className="lo-btn lo-btn-sm lo-btn-danger" onClick={() => onDelete(listing.id)}>
          Delete
        </button>
      </div>

      {/* Column 7: Error Management */}
      <div className="lo-listing-col lo-listing-errors">
        {/* Preset Error Dropdown */}
        <select
          className="lo-error-select"
          onChange={handleErrorSelect}
          defaultValue=""
        >
          <option value="">Add preset error...</option>
          {errorOptions.map(error => (
            <option key={error.code} value={error.code}>
              {error.label}
            </option>
          ))}
        </select>

        {/* Custom Error Input */}
        <div className="lo-custom-error">
          <input
            type="text"
            placeholder="Custom error..."
            value={customError}
            onChange={(e) => setCustomError(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomErrorAdd()}
          />
          <button
            className="lo-btn lo-btn-sm lo-btn-outline"
            onClick={handleCustomErrorAdd}
            disabled={!customError.trim()}
          >
            Add
          </button>
        </div>

        {/* Error Actions */}
        <div className="lo-error-buttons">
          <button
            className="lo-btn lo-btn-sm lo-btn-outline-danger"
            onClick={() => onClearErrors(listing.id)}
            disabled={listing.errors.length === 0}
          >
            Clear All
          </button>
          <button
            className="lo-btn lo-btn-sm lo-btn-outline"
            onClick={() => onSeeErrors(listing)}
            disabled={listing.errors.length === 0}
          >
            See ({listing.errors.length})
          </button>
        </div>
      </div>
    </div>
  );
}
