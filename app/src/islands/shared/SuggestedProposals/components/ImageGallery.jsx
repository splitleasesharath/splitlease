/**
 * ImageGallery
 *
 * Photo carousel with main image and thumbnail strip.
 * Handles both string URLs and object photo formats.
 */

import { useState } from 'react';

/**
 * @param {Object} props
 * @param {Array} props.photos - Array of photo URLs or photo objects
 * @param {string} props.listingName - Listing name for alt text
 */
export default function ImageGallery({ photos = [], listingName = 'Listing' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Normalize photos to URLs
  const photoUrls = photos.map(photo => {
    if (typeof photo === 'string') return photo;
    // Handle Bubble photo object format
    return photo?.url || photo?.src || photo;
  }).filter(Boolean);

  if (photoUrls.length === 0) {
    return (
      <div className="sp-gallery">
        <div className="sp-gallery-main sp-gallery-placeholder">
          <span>No photos available</span>
        </div>
      </div>
    );
  }

  const selectedPhoto = photoUrls[selectedIndex] || photoUrls[0];

  return (
    <div className="sp-gallery">
      {/* Main image */}
      <div className="sp-gallery-main">
        <img
          src={selectedPhoto}
          alt={`${listingName} - Photo ${selectedIndex + 1}`}
          className="sp-gallery-main-img"
        />
      </div>

      {/* Thumbnail strip */}
      {photoUrls.length > 1 && (
        <div className="sp-gallery-thumbs">
          {photoUrls.slice(0, 5).map((url, index) => (
            <button
              key={index}
              className={`sp-gallery-thumb ${index === selectedIndex ? 'sp-gallery-thumb--active' : ''}`}
              onClick={() => setSelectedIndex(index)}
              aria-label={`View photo ${index + 1}`}
              type="button"
            >
              <img
                src={url}
                alt={`${listingName} - Thumbnail ${index + 1}`}
              />
            </button>
          ))}
          {photoUrls.length > 5 && (
            <div className="sp-gallery-thumb sp-gallery-thumb--more">
              +{photoUrls.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
