/**
 * ListingsCard.jsx
 *
 * Displays a host's listings as attractive cards within the profile page.
 * Shows a grid of listing items with photos, names, locations, and pricing.
 * Supports loading, empty, and populated states.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';

/**
 * Individual listing item component
 */
function ListingItem({ listing, onClick }) {
  const photos = listing.listing_photo || [];
  // Sort photos by order and get the primary one
  const sortedPhotos = [...photos].sort((a, b) => (a.Order || 0) - (b.Order || 0));
  const primaryPhoto = sortedPhotos[0];
  const photoUrl = primaryPhoto?.url || null;

  const handleClick = () => {
    onClick?.(listing._id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(listing._id);
    }
  };

  // Format location display
  const borough = listing['Borough/Region'] || '';
  const hood = listing.hood || '';
  const location = [borough, hood].filter(Boolean).join(', ') || 'Location not specified';

  // Format bedroom/bathroom display
  const bedrooms = listing['Qty of Bedrooms'] || 0;
  const bathrooms = listing['Qty of Bathrooms'] || 0;
  const bedsText = bedrooms === 1 ? '1 bed' : `${bedrooms} beds`;
  const bathsText = bathrooms === 1 ? '1 bath' : `${bathrooms} baths`;

  // Format price
  const nightlyPrice = listing['Start Nightly Price'] || 0;

  return (
    <div
      className="listing-item"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View listing: ${listing.Name || 'Unnamed listing'}`}
    >
      <div className="listing-item-photo">
        {photoUrl ? (
          <img src={photoUrl} alt={listing.Name || 'Listing photo'} loading="lazy" />
        ) : (
          <div className="listing-item-photo-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="listing-item-details">
        <h4 className="listing-item-name">{listing.Name || 'Unnamed Listing'}</h4>
        <p className="listing-item-location">{location}</p>
        <div className="listing-item-meta">
          <span>{bedsText}, {bathsText}</span>
          {nightlyPrice > 0 && (
            <span className="listing-item-price">${nightlyPrice}/night</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for listing items
 */
function ListingItemSkeleton() {
  return (
    <div className="listing-item-skeleton" aria-hidden="true">
      <div className="listing-item-skeleton-photo" />
      <div className="listing-item-skeleton-details">
        <div className="listing-item-skeleton-title" />
        <div className="listing-item-skeleton-location" />
        <div className="listing-item-skeleton-meta" />
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onCreateListing }) {
  return (
    <div className="listings-empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <p>You haven't created any listings yet</p>
      {onCreateListing && (
        <button onClick={onCreateListing} type="button">
          Create Your First Listing
        </button>
      )}
    </div>
  );
}

/**
 * Main ListingsCard component
 */
export default function ListingsCard({
  listings = [],
  loading = false,
  onListingClick,
  onCreateListing,
  readOnly = false
}) {
  // Loading state
  if (loading) {
    return (
      <ProfileCard title="My Listings">
        <div className="listings-grid">
          <ListingItemSkeleton />
          <ListingItemSkeleton />
        </div>
      </ProfileCard>
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <ProfileCard title="My Listings">
        <EmptyState onCreateListing={readOnly ? null : onCreateListing} />
      </ProfileCard>
    );
  }

  // Listings grid
  return (
    <ProfileCard title="My Listings">
      <div className="listings-grid">
        {listings.map((listing) => (
          <ListingItem
            key={listing._id}
            listing={listing}
            onClick={onListingClick}
          />
        ))}
      </div>
    </ProfileCard>
  );
}
