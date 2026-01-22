/**
 * ListingPillSelector Component (V7 Design)
 *
 * A horizontal pill/chip-style selector for filtering proposals by listing.
 * Each pill shows: circular thumbnail, listing name, and proposal count badge.
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';

/**
 * Get listing thumbnail URL with fallback
 * @param {Object} listing - The listing object
 * @returns {string} The thumbnail URL or placeholder
 */
function getListingThumbnail(listing) {
  if (listing?.picture_url) return listing.picture_url;
  if (listing?.Image) return listing.Image;
  if (listing?.photo) return listing.photo;
  // Generate a placeholder based on listing name
  const name = listing?.title || listing?.name || 'Listing';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E9E0F7&color=6D31C2&size=100`;
}

/**
 * ListingPillSelector renders a horizontal row of listing pills
 * Uses ARIA tablist pattern for accessible keyboard navigation
 *
 * @param {Object} props
 * @param {Array} props.listings - Array of listing objects
 * @param {string} props.selectedListingId - Currently selected listing ID
 * @param {Function} props.onListingChange - Callback when listing selection changes
 * @param {Object} props.proposalCounts - Map of listingId to proposal count
 */
export function ListingPillSelector({
  listings = [],
  selectedListingId,
  onListingChange,
  proposalCounts = {}
}) {
  if (!listings?.length) {
    return null;
  }

  // Handle keyboard navigation (arrow keys per ARIA tablist pattern)
  const handleKeyDown = (e, currentIndex) => {
    const listingIds = listings.map(l => l._id || l.id);
    let newIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % listings.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + listings.length) % listings.length;
    } else {
      return;
    }

    // Focus and select the new tab
    const newListingId = listingIds[newIndex];
    onListingChange?.(newListingId);

    // Focus the button after state update
    setTimeout(() => {
      const button = document.querySelector(`[data-listing-id="${newListingId}"]`);
      button?.focus();
    }, 0);
  };

  return (
    <nav aria-label="Filter proposals by listing">
      <div
        className="hp7-listing-selector"
        role="tablist"
        aria-label="Listings"
      >
        {listings.map((listing, index) => {
          const listingId = listing._id || listing.id;
          const isActive = listingId === selectedListingId;
          const count = proposalCounts[listingId] ?? 0;
          const listingName = listing.title || listing.name || 'Unnamed Listing';
          const thumbnail = getListingThumbnail(listing);

          return (
            <button
              key={listingId}
              type="button"
              role="tab"
              data-listing-id={listingId}
              className={`hp7-listing-pill${isActive ? ' active' : ''}`}
              onClick={() => onListingChange?.(listingId)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-selected={isActive}
              aria-controls="proposals-panel"
              tabIndex={isActive ? 0 : -1}
            >
              <img
                src={thumbnail}
                className="hp7-listing-pill-thumb"
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <span className="hp7-listing-pill-name">{listingName}</span>
              <span
                className="hp7-listing-pill-count"
                aria-label={`${count} proposals`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default ListingPillSelector;
