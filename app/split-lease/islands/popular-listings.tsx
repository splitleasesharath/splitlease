/**
 * Popular Listings Island Mount Script
 *
 * Hydrates the PopularListings component as an "island" on the static HTML page
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PopularListings } from '../components/src/organisms/PopularListings';
import { getPopularListings, type Listing, APIError } from '../api/listings';

/**
 * Popular Listings Island Component
 *
 * Fetches and displays popular listings with loading and error states
 */
function PopularListingsIsland() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPopularListings(6);
        setListings(data);
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Failed to load listings. Please try again later.');
        }
        console.error('Failed to fetch popular listings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListings();
  }, []);

  const handleViewMore = () => {
    window.location.href = '/search/index.html';
  };

  const handleListingClick = (listingId: string) => {
    window.location.href = `/view-split-lease/index.html?id=${listingId}`;
  };

  return (
    <PopularListings
      listings={listings}
      isLoading={isLoading}
      error={error}
      onViewMore={handleViewMore}
      onListingClick={handleListingClick}
    />
  );
}

/**
 * Mount the PopularListings island
 *
 * Finds the mount point in the DOM and hydrates the React component
 */
export function mountPopularListings() {
  const mountPoint = document.getElementById('popular-listings');

  if (!mountPoint) {
    console.warn('Popular listings mount point not found');
    return;
  }

  const root = createRoot(mountPoint);
  root.render(<PopularListingsIsland />);
}

// Auto-mount when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPopularListings);
  } else {
    mountPopularListings();
  }
}
