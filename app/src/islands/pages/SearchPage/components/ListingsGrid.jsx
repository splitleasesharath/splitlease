import { useRef, useEffect } from 'react';
import { PropertyCard } from './PropertyCard.jsx';

/**
 * ListingsGrid - Grid of property cards with lazy loading
 */
export function ListingsGrid({ listings, onLoadMore, hasMore, isLoading, onOpenContactModal, onOpenInfoModal, mapRef, pulseTimeoutRef, isLoggedIn, userId, favoritedListingIds, onToggleFavorite, onRequireAuth, showCreateProposalButton, onOpenCreateProposalModal, proposalsByListingId, selectedNightsCount }) {

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="listings-container">
      {listings.map((listing, index) => {
        const listingId = listing.id || listing._id;
        const isFavorited = favoritedListingIds?.has(listingId);
        const proposalForListing = proposalsByListingId?.get(listingId) || null;
        return (
          <PropertyCard
            key={listing.id}
            listing={listing}
            onLocationClick={(listing) => {
              if (mapRef.current) {
                mapRef.current.zoomToListing(listing.id);
              }
            }}
            onCardHover={(listing) => {
              if (mapRef.current) {
                mapRef.current.highlightListing(listing.id);
              }
            }}
            onCardLeave={() => {
              // Delay stopPulse to allow hovering to map without losing pulse
              if (pulseTimeoutRef.current) {
                clearTimeout(pulseTimeoutRef.current);
              }
              pulseTimeoutRef.current = setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.stopPulse();
                }
                pulseTimeoutRef.current = null;
              }, 150); // Short delay to allow transition to map
            }}
            onOpenContactModal={onOpenContactModal}
            onOpenInfoModal={onOpenInfoModal}
            isLoggedIn={isLoggedIn}
            isFavorited={isFavorited}
            userId={userId}
            onToggleFavorite={onToggleFavorite}
            onRequireAuth={onRequireAuth}
            showCreateProposalButton={showCreateProposalButton}
            onOpenCreateProposalModal={onOpenCreateProposalModal}
            proposalForListing={proposalForListing}
            selectedNightsCount={selectedNightsCount}
          />
        );
      })}

      {hasMore && (
        <div ref={sentinelRef} className="lazy-load-sentinel">
          <div className="loading-more">
            <div className="spinner"></div>
            <span>Loading more listings...</span>
          </div>
        </div>
      )}
    </div>
  );
}
