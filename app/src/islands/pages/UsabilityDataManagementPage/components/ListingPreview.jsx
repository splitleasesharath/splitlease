/**
 * ListingPreview Component
 * Displays listing photos and info
 */

import React from 'react';

export default function ListingPreview({ listing }) {
  const hasPhotos = listing?.photos && listing.photos.length > 0;
  const firstPhoto = hasPhotos ? listing.photos[0] : null;
  const lastPhoto = hasPhotos ? listing.photos[listing.photos.length - 1] : null;

  return (
    <div className="listing-preview">
      <h3>Listing Preview</h3>
      <div className="listing-photos">
        <div className="photo-placeholder">
          {firstPhoto ? (
            <img src={firstPhoto} alt="First Photo" />
          ) : (
            <span>First Photo</span>
          )}
        </div>
        <div className="photo-placeholder">
          {lastPhoto ? (
            <img src={lastPhoto} alt="Last Photo" />
          ) : (
            <span>Last Photo</span>
          )}
        </div>
      </div>
      <p className="listing-name">
        {listing?.name || 'No listing selected'}
      </p>
      <p className="listing-features">
        {listing
          ? `ID: ${listing.uniqueId || listing.id} | Nightly: $${listing.nightlyPrice || 0}`
          : "Parent group's Listing's Features - Photos"
        }
      </p>
    </div>
  );
}
