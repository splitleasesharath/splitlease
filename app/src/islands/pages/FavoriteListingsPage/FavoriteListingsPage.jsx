/**
 * FavoriteListingsPage Component
 * Main page with Header, Footer, Map, and Split Schedule Selector
 * Includes dynamic pricing based on date selection
 */

import { useState, useEffect } from 'react';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import ListingCard from './components/ListingCard';
import EmptyState from './components/EmptyState';
import MapView from './components/MapView';
import SplitScheduleSelector from './components/SplitScheduleSelector';
import { getFavoritedListings, removeFromFavorites } from './favoritesApi';
import { checkAuthStatus, getSessionId } from '../../../lib/auth';
import './FavoriteListingsPage.css';

const FavoriteListingsPage = () => {
  // State management
  const [listings, setListings] = useState([]);
  const [displayedListings, setDisplayedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [selectedListingId, setSelectedListingId] = useState(undefined);
  const [userId, setUserId] = useState(null);
  const [schedule, setSchedule] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    nights: 1,
    daysOfWeek: [1, 2, 3] // Monday to Wednesday
  });

  /**
   * Calculate dynamic pricing based on number of nights
   */
  const calculateDynamicPrice = (basePrice, nights) => {
    // Price calculation logic:
    // - 1-6 nights: nightly rate
    // - 7-29 nights: 10% discount
    // - 30+ nights: 20% discount
    if (nights >= 30) {
      return Math.floor(basePrice * 0.8); // 20% discount
    } else if (nights >= 7) {
      return Math.floor(basePrice * 0.9); // 10% discount
    }
    return basePrice;
  };

  /**
   * Update listings with dynamic pricing when schedule changes
   */
  useEffect(() => {
    if (listings.length > 0) {
      const updatedListings = listings.map(listing => ({
        ...listing,
        pricingList: {
          ...listing.pricingList,
          startingNightlyPrice: calculateDynamicPrice(
            listing.listerPriceDisplay || listing.pricingList?.startingNightlyPrice || 0,
            schedule.nights
          )
        }
      }));
      setDisplayedListings(updatedListings);
    }
  }, [listings, schedule]);

  /**
   * Initialize page and fetch data
   */
  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check auth status
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
          // Redirect to login or show auth message
          console.log('User not authenticated, redirecting...');
          window.location.href = '/?login=true';
          return;
        }

        // Get user ID
        const sessionId = getSessionId();
        if (!sessionId) {
          console.error('No session ID found');
          setError('Please log in to view your favorites.');
          setLoading(false);
          return;
        }
        setUserId(sessionId);

        // Fetch favorited listings
        const response = await getFavoritedListings(sessionId, {
          page: 1,
          perPage: 20,
          sortBy: 'price_asc',
        });

        setListings(response.listings);
        setDisplayedListings(response.listings);

        console.log(`Loaded ${response.listings.length} favorite listings`);
      } catch (err) {
        console.error('Error initializing page:', err);
        setError('Failed to load your favorite listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  /**
   * Handle schedule change from Split Schedule Selector
   */
  const handleScheduleChange = (newSchedule) => {
    setSchedule(newSchedule);
  };

  /**
   * Toggle favorite (remove from favorites)
   */
  const handleToggleFavorite = async (listingId) => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing || !userId) return;

    // Optimistic update
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    setDisplayedListings((prev) => prev.filter((l) => l.id !== listingId));

    try {
      await removeFromFavorites(userId, listingId);
      console.log(`Removed listing ${listingId} from favorites`);
    } catch (err) {
      console.error('Error removing from favorites:', err);
      setListings((prev) => [...prev, listing]);
      setDisplayedListings((prev) => [...prev, listing]);
      alert('Failed to remove from favorites. Please try again.');
    }
  };

  /**
   * Navigate to listing detail
   */
  const handleNavigateToDetail = (listingId) => {
    window.location.href = `/view-split-lease/${listingId}`;
  };

  /**
   * Handle listing selection from map
   */
  const handleMapListingClick = (listingId) => {
    setSelectedListingId(listingId);
    // Scroll to the listing card
    const element = document.getElementById(`listing-${listingId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Loading state
  if (loading && listings.length === 0) {
    return (
      <div className="page-with-header-footer">
        <Header />
        <div className="main-content-with-header">
          <div className="favorite-listings-page">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your favorite listings...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error && listings.length === 0) {
    return (
      <div className="page-with-header-footer">
        <Header />
        <div className="main-content-with-header">
          <div className="favorite-listings-page">
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button className="retry-button" onClick={() => window.location.reload()}>
                Try Again
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Empty state
  if (displayedListings.length === 0) {
    return (
      <div className="page-with-header-footer">
        <Header />
        <div className="main-content-with-header">
          <div className="favorite-listings-page">
            <EmptyState
              message="You don't have any favorite listings yet. We invite you to search listings and submit proposals with the weekly schedule you have in mind"
              ctaText="Explore Rentals"
              ctaLink="/search"
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main content with side-by-side layout
  return (
    <div className="page-with-header-footer">
      <Header />

      <div className="main-content-with-header">
        <div className="favorite-listings-page-enhanced">
          {/* Left Panel: Listings */}
          <div className="listings-panel">
            <div className="listings-panel-inner">
              {/* Split Schedule Selector */}
              <SplitScheduleSelector
                onScheduleChange={handleScheduleChange}
                initialCheckIn={schedule.checkIn}
                initialCheckOut={schedule.checkOut}
              />

              {/* Listings Grid */}
              <div className="listings-section">
                <h2 className="listings-section-title">All Favorites</h2>
                <div className="listings-container">
                  {displayedListings.map((listing) => (
                    <div
                      key={listing.id}
                      id={`listing-${listing.id}`}
                      className={selectedListingId === listing.id ? 'listing-highlighted' : ''}
                    >
                      <ListingCard
                        listing={listing}
                        onToggleFavorite={handleToggleFavorite}
                        onNavigateToDetail={handleNavigateToDetail}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Info Note */}
              <div className="pricing-info-note">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div>
                  <strong>Dynamic Pricing:</strong> Prices adjust based on your selected dates.
                  Longer stays (7+ nights) receive discounts up to 20% off.
                </div>
              </div>

              {/* Support Section */}
              <div className="support-section">
                <div className="support-grid">
                  <div className="support-item" onClick={() => window.open('https://app.split.lease/contact', '_blank')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="support-item-text">Instant Live-Chat</span>
                  </div>
                  <div className="support-item" onClick={() => window.location.href = 'mailto:support@split.lease'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <span className="support-item-text">Send us an Email</span>
                  </div>
                  <div className="support-item" onClick={() => window.open('https://calendly.com/split-lease', '_blank')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span className="support-item-text">Schedule a Call</span>
                  </div>
                  <div className="support-item" onClick={() => window.open('/faq', '_blank')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span className="support-item-text">Browse our FAQs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Map */}
          {showMap && (
            <div className="map-panel">
              <div className="map-section">
                <MapView
                  listings={displayedListings}
                  onListingClick={handleMapListingClick}
                  selectedListingId={selectedListingId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FavoriteListingsPage;
