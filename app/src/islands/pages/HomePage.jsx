import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport/AiSignupMarketReport.jsx';
import LocalJourneySection from './LocalJourneySection.jsx';
import { checkAuthStatus } from '../../lib/auth.js';
import { supabase } from '../../lib/supabase.js';
import { fetchPhotoUrls, parseJsonArray } from '../../lib/supabaseUtils.js';
import { getNeighborhoodName, getBoroughName, initializeLookups } from '../../lib/dataLookups.js';
import {
  FAQ_URL,
  SEARCH_URL,
  VIEW_LISTING_URL
} from '../../lib/constants.js';

// ============================================================================
// A/B TEST CONFIG - Market Report Popup vs Drawer
// Set to false to disable A/B test and use drawer only (easy revert)
// Note: Popup only shows on desktop (>768px), mobile always gets drawer
// ============================================================================
const AB_TEST_ENABLED = true;
const POPUP_PERCENTAGE = 0.5; // 50% see popup, 50% see drawer
const MOBILE_BREAKPOINT = 768; // px - below this, always show drawer

function getMarketReportVariant() {
  if (!AB_TEST_ENABLED) return 'drawer';

  // Mobile always gets drawer
  if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) {
    return 'drawer';
  }

  let variant = localStorage.getItem('marketReportVariant');
  if (!variant) {
    variant = Math.random() < POPUP_PERCENTAGE ? 'popup' : 'drawer';
    localStorage.setItem('marketReportVariant', variant);
    console.log('[A/B Test] Assigned variant:', variant);
  }
  return variant;
}

// ============================================================================
// INTERNAL COMPONENT: Hero Section
// ============================================================================

function Hero({ onExploreRentals, onMoreDetails }) {

  return (
    <section className="hero-section">
      {/* Floating Avatars */}

      {/* Avatar 1 (top-left): With location badge */}
      <div className="floating-avatar avatar-1">
        <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=400&fit=crop" alt="Modern NYC apartment living room" />
        <span className="notification-badge location visible">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Midtown, Manhattan
        </span>
      </div>

      {/* Avatar 2 (right): Plain circle */}
      <div className="floating-avatar avatar-2">
        <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=400&fit=crop" alt="Stylish bedroom with city view" />
      </div>

      {/* Avatar 3 (bottom-left): Plain circle */}
      <div className="floating-avatar avatar-3">
        <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop" alt="Cozy furnished apartment" />
      </div>

      {/* Avatar 4 (right): With location badge */}
      <div className="floating-avatar avatar-4">
        <img src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=400&fit=crop" alt="Bright kitchen and dining area" />
        <span className="notification-badge location visible">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Williamsburg, Brooklyn
        </span>
      </div>

      {/* Avatar 5 (top-center-left): Plain circle */}
      <div className="floating-avatar avatar-5">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop" alt="Luxury apartment interior" />
      </div>

      {/* Avatar 6 (bottom-right): Plain circle */}
      <div className="floating-avatar avatar-6">
        <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=400&fit=crop" alt="Modern home office space" />
      </div>

      <div className="hero-container">
        <div className="hero-badge">Ongoing Rentals for Repeat Stays</div>

        <h1 className="hero-title">
          Your NYC Home Base
          <span className="savings">45% Less Than Airbnb</span>
        </h1>

        <p className="hero-subtitle">
          Discover flexible rental options in NYC. Only pay for the nights you need.
          Same space every visit. Leave your belongings.
        </p>

        {/* SearchScheduleSelector mount point */}
        <div id="hero-schedule-selector" className="schedule-selector-wrapper"></div>

        <div className="hero-cta">
          <button className="cta-button cta-primary" onClick={onExploreRentals}>
            Explore Rentals
          </button>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-value">10,000+</div>
            <div className="stat-label">commuting hours saved</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">$18K</div>
            <div className="stat-label">Avg Yearly Savings</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">32,000+</div>
            <div className="stat-label">unpacking hours saved</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Value Propositions
// ============================================================================

function ValuePropositions() {
  const valueProps = [
    {
      icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245433645x903943195219269100/Icon-OnlineSelect%201%20%281%29.png',
      title: '100s of Split Leases, or source off market',
    },
    {
      icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245536528x133519290791932700/Icon-Skyline%20%281%29.png',
      title: 'Financially optimal. 45% less than Airbnb',
    },
    {
      icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245565680x203884400943151520/Icon-Backpack%20Hero_1%201%20%281%29.png',
      title: 'Safely store items while you\'re away.',
    },
    {
      icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245591320x851695569344734000/Layer%209%20%281%29.png',
      title: 'Same room, same bed. Unlike a hotel.',
    },
  ];

  return (
    <section className="value-props">
      <div className="value-container">
        {valueProps.map((prop, index) => (
          <div key={index} className="value-card">
            <div className="value-icon">
              <img src={prop.icon} alt={prop.title} />
            </div>
            <h3>{prop.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Schedule Section (Interactive Tabs Design)
// ============================================================================

function ScheduleSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const schedules = [
    {
      id: 'weeknight',
      label: 'Weeknights',
      lottieUrl: '/assets/lotties/days-of-the-week.json',
      days: '2,3,4,5,6',
    },
    {
      id: 'weekend',
      label: 'Weekends',
      lottieUrl: '/assets/lotties/weekends.json',
      days: '6,7,1,2',
    },
    {
      id: 'fullweek',
      label: 'Weeks of the Month',
      lottieUrl: '/assets/lotties/weeks-of-the-month.json',
      days: '1,2,3,4,5,6,7',
    },
  ];

  const handleExploreClick = () => {
    window.location.href = `/search.html?days-selected=${schedules[activeIndex].days}`;
  };

  // Load Lottie player script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <section className="schedule-section">
      <div className="schedule-section-container">
        <div className="schedule-section-header">
          <p className="schedule-section-eyebrow">Stop playing room roulette!</p>
          <h2>Choose Your Split Schedule</h2>
        </div>

        <div className="schedule-section-tabs">
          {schedules.map((schedule, index) => (
            <button
              key={schedule.id}
              className={`schedule-section-tab ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              {schedule.label}
            </button>
          ))}
        </div>

        <div className="schedule-section-display">
          <div className="schedule-section-lottie">
            <lottie-player
              key={schedules[activeIndex].id}
              src={schedules[activeIndex].lottieUrl}
              background="transparent"
              speed="1"
              style={{ width: '340px', height: '240px' }}
              loop
              autoplay
            ></lottie-player>
          </div>

          <button className="schedule-section-cta" onClick={handleExploreClick}>
            Browse {schedules[activeIndex].label} Listings
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}



// ============================================================================
// INTERNAL COMPONENT: Support Section
// ============================================================================

function SupportSection() {
  const supportOptions = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#31135D" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="10" r="1" fill="#31135D"/>
          <circle cx="8" cy="10" r="1" fill="#31135D"/>
          <circle cx="16" cy="10" r="1" fill="#31135D"/>
        </svg>
      ),
      title: 'Live Chat',
      description: 'Get instant answers from our team',
      link: FAQ_URL,
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#31135D" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="0.5" fill="#31135D"/>
        </svg>
      ),
      title: 'FAQs',
      description: 'Browse common questions',
      link: FAQ_URL,
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#31135D" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="14" y2="10"/>
        </svg>
      ),
      title: 'Help Center',
      description: 'Guides and resources',
      link: '/help-center',
      isInternal: true,
    },
  ];

  return (
    <section className="support-section-alt">
      <div className="support-section-alt-container">
        <div className="support-section-alt-header">
          <p className="support-section-alt-eyebrow">Need Help?</p>
          <h2>We're here for you</h2>
        </div>
        <div className="support-section-alt-grid">
          {supportOptions.map((option, index) => (
            <a
              key={index}
              href={option.link}
              {...(option.isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              className="support-alt-card"
            >
              <div className="support-alt-icon">{option.icon}</div>
              <div className="support-alt-content">
                <h3>{option.title}</h3>
                <p>{option.description}</p>
              </div>
              <svg className="support-alt-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Featured Spaces Section (from why-split-lease)
// ============================================================================

function FeaturedSpacesSection() {
  const [manhattanId, setManhattanId] = useState(null);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  // Initialize data lookups and get Manhattan borough ID
  useEffect(() => {
    const init = async () => {
      await initializeLookups();

      try {
        const { data, error } = await supabase
          .schema('reference_table')
          .from('zat_geo_borough_toplevel')
          .select('_id, "Display Borough"')
          .ilike('"Display Borough"', 'Manhattan')
          .single();

        if (error) throw error;
        if (data) setManhattanId(data._id);
      } catch (err) {
        console.error('Failed to load Manhattan borough:', err);
      }
    };

    init();
  }, []);

  // Fetch featured listings (any borough, prioritizing those with photos)
  const fetchFeaturedListings = useCallback(async () => {
    setIsLoadingListings(true);
    try {
      // Query for complete, active listings - fetch extra to filter for those with photos
      const query = supabase
        .from('listing')
        .select(`
          _id,
          "Name",
          "Location - Borough",
          "Location - Hood",
          "Location - Address",
          "Features - Photos",
          "Features - Qty Bedrooms",
          "Features - Qty Bathrooms",
          "Days Available (List of Days)"
        `)
        .eq('"Complete"', true)
        .or('"Active".eq.true,"Active".is.null')
        .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
        .not('"Features - Photos"', 'is', null)
        .limit(20);

      const { data: listings, error } = await query;

      if (error) throw error;

      if (!listings || listings.length === 0) {
        setFeaturedListings([]);
        setIsLoadingListings(false);
        return;
      }

      const legacyPhotoIds = [];
      listings.forEach(listing => {
        const photos = parseJsonArray(listing['Features - Photos']);
        if (photos && photos.length > 0) {
          const firstPhoto = photos[0];
          if (typeof firstPhoto === 'string') {
            legacyPhotoIds.push(firstPhoto);
          }
        }
      });

      const photoMap = legacyPhotoIds.length > 0
        ? await fetchPhotoUrls(legacyPhotoIds)
        : {};

      // Helper to extract photo URL from a listing
      const extractPhotoUrl = (listing) => {
        const photos = parseJsonArray(listing['Features - Photos']);
        const firstPhoto = photos?.[0];

        if (typeof firstPhoto === 'object' && firstPhoto !== null) {
          // New embedded format: photo is an object with url/Photo field
          let url = firstPhoto.url || firstPhoto.Photo || '';
          if (url.startsWith('//')) url = 'https:' + url;
          return url || null;
        } else if (typeof firstPhoto === 'string') {
          // String format: could be a direct URL or a legacy ID
          if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://') || firstPhoto.startsWith('//')) {
            return firstPhoto.startsWith('//') ? 'https:' + firstPhoto : firstPhoto;
          } else if (photoMap[firstPhoto]) {
            return photoMap[firstPhoto];
          }
        }
        return null;
      };

      // Prefer listings with valid photos, but fall back to listings without if needed
      const listingsWithPhotoInfo = listings.map(listing => ({
        listing,
        photoUrl: extractPhotoUrl(listing)
      }));

      // Separate listings with and without photos
      const withPhotos = listingsWithPhotoInfo.filter(({ photoUrl }) => photoUrl !== null);
      const withoutPhotos = listingsWithPhotoInfo.filter(({ photoUrl }) => photoUrl === null);

      // Take up to 3: prioritize those with photos, fill remainder with those without
      const selectedListings = [...withPhotos, ...withoutPhotos].slice(0, 3);

      // Different fallback images for visual variety when photos are missing
      const fallbackImages = [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
      ];

      const transformedListings = selectedListings.map(({ listing, photoUrl }, index) => {
        const neighborhoodName = getNeighborhoodName(listing['Location - Hood']);
        const boroughName = getBoroughName(listing['Location - Borough']);
        const location = [neighborhoodName, boroughName].filter(Boolean).join(', ') || 'New York, NY';

        const availableDays = parseJsonArray(listing['Days Available (List of Days)']) || [];

        return {
          id: listing._id,
          title: listing['Name'] || 'NYC Space',
          location,
          image: photoUrl || fallbackImages[index % fallbackImages.length],
          bedrooms: listing['Features - Qty Bedrooms'] || 0,
          bathrooms: listing['Features - Qty Bathrooms'] || 0,
          availableDays,
        };
      });

      setFeaturedListings(transformedListings);
    } catch (err) {
      console.error('Failed to fetch featured listings:', err);
      setFeaturedListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedListings();
  }, [fetchFeaturedListings]);

  return (
    <section className="featured-spaces">
      <div className="featured-spaces-container">
        <div className="spaces-header">
          <h2>Check Out Some Listings</h2>
        </div>

        <div className="spaces-grid">
          {isLoadingListings ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="space-card loading">
                  <div className="space-image-skeleton"></div>
                  <div className="space-info">
                    <div className="skeleton-text title"></div>
                    <div className="skeleton-text location"></div>
                    <div className="skeleton-text features"></div>
                  </div>
                </div>
              ))}
            </>
          ) : featuredListings.length === 0 ? (
            <div className="no-listings-message">
              <p>No listings available in this area. Try selecting a different borough.</p>
            </div>
          ) : (
            featuredListings.map(listing => (
              <div
                key={listing.id}
                className="space-card"
                onClick={() => window.location.href = `${VIEW_LISTING_URL}/${listing.id}`}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="space-image"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop';
                    }}
                  />
                  <div className="space-badge">Verified</div>
                </div>
                <div className="space-info">
                  <h3 className="space-title">{listing.title}</h3>
                  <div className="space-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6B7280" strokeWidth="2"/>
                      <circle cx="12" cy="9" r="2.5" stroke="#6B7280" strokeWidth="2"/>
                    </svg>
                    {listing.location}
                  </div>
                  <div className="space-features">
                    <span className="feature-tag">
                      {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed${listing.bedrooms !== 1 ? 's' : ''}`}
                    </span>
                    <span className="feature-tag">{listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}</span>
                    <span className="feature-tag">Storage</span>
                  </div>
                  <div className="space-schedule">
                    <span className="available-days">all nights available</span>
                    <div className="day-indicators">
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
                        <span key={dayIdx} className="day-dot available" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="spaces-cta-wrapper">
          <a href={SEARCH_URL} className="spaces-cta-button">
            Browse All NYC Spaces
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// A/B TEST VARIANT: Market Report Popup (bottom-right corner)
// ============================================================================

function MarketReportPopup({ onRequestClick, onDismiss, isVisible }) {
  const [isAnimating, setIsAnimating] = useState(true);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onDismiss?.();
      console.log('[A/B Test] Popup dismissed - showing drawer');
    }, 300);
  };

  const handleRequest = () => {
    onRequestClick();
    console.log('[A/B Test] Popup: Request clicked');
  };

  if (!isVisible) return null;

  return (
    <div className={`market-popup-container ${isAnimating ? 'animate-in' : 'animate-out'}`}>
      <div className="market-popup-card">
        <button className="market-popup-close" onClick={handleDismiss} aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="market-popup-content">
          <div className="market-popup-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Free Report</span>
          </div>

          <h2 className="market-popup-title">Split Lease Market Research</h2>
          <p className="market-popup-description">Market Research for Lodging, Storage, Transport, Restaurants and more</p>

          <div className="market-popup-buttons">
            <button className="market-popup-btn-primary" onClick={handleRequest}>Request</button>
            <button className="market-popup-btn-secondary" onClick={handleDismiss}>Later</button>
          </div>
        </div>

        <div className="market-popup-illustration">
          <lottie-player
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1751640509056x731482311814151200/atom%20white.json"
            background="transparent"
            speed="1"
            style={{ width: '120px', height: '120px' }}
            loop
            autoplay
          ></lottie-player>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Floating Badge
// ============================================================================

function FloatingBadge({ onClick }) {
  return (
    <div className="floating-badge" onClick={onClick}>
      <div className="badge-content">
        <span className="badge-text-top">Free</span>
        <div className="badge-icon">
          <lottie-player
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1751640509056x731482311814151200/atom%20white.json"
            background="transparent"
            speed="1"
            style={{ width: '102px', height: '102px' }}
            loop
            autoplay
          ></lottie-player>
        </div>
        <div className="badge-text-bottom">
          <span>Market</span>
          <span>Research</span>
        </div>
      </div>
      <div className="badge-expanded">Free Market Research</div>
    </div>
  );
}


// ============================================================================
// MAIN COMPONENT: HomePage
// ============================================================================

export default function HomePage() {
  // State management
  const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPopupDismissed, setIsPopupDismissed] = useState(false); // A/B test: when true, show drawer instead of popup

  // Internal routing state for password reset fallback
  const [RecoveryComponent, setRecoveryComponent] = useState(null);

  // SAFETY NET: Check for password reset redirect
  // If user lands on home page (or via server rewrite) with recovery token
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      console.log('Detected password reset token.');
      
      // If we are at the root, redirect to the specific page to keep URLs clean
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
         console.log('Redirecting from root to /reset-password...');
         window.location.href = `/reset-password${hash}`;
         return;
      }

      // If we are NOT at root (e.g. /reset-password), but HomePage loaded,
      // it means the server rewrote the URL to index.html (SPA fallback).
      // We must render the ResetPasswordPage manually to avoid a redirect loop.
      console.log('Loading ResetPasswordPage dynamically (SPA fallback)...');
      import('./ResetPasswordPage.jsx')
        .then(module => {
          setRecoveryComponent(() => module.default);
        })
        .catch(err => console.error('Failed to load ResetPasswordPage:', err));
    }
  }, []);

  // Check authentication status on mount
  // NOTE: Must be BEFORE early return to comply with Rules of Hooks
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await checkAuthStatus();
      setIsLoggedIn(loggedIn);
    };
    checkAuth();
  }, []);

  // Mount SearchScheduleSelector component in hero section
  // NOTE: Must be BEFORE early return to comply with Rules of Hooks
  // Store root on DOM element to survive StrictMode double-invocation
  useEffect(() => {
    // Skip if RecoveryComponent is being shown (we're rendering something else)
    if (RecoveryComponent) return;

    const mountPoint = document.getElementById('hero-schedule-selector');
    if (!mountPoint) return;

    // Check if root already exists on the DOM element (survives StrictMode remounts)
    let root = mountPoint._reactRoot;
    if (!root) {
      root = createRoot(mountPoint);
      mountPoint._reactRoot = root;
    }

    root.render(
      <SearchScheduleSelector
        onSelectionChange={(days) => {
          console.log('Selected days on home page:', days);
          setSelectedDays(days.map(d => d.index));
        }}
        onError={(error) => console.error('SearchScheduleSelector error:', error)}
      />
    );

    // No cleanup - let the root persist for the lifetime of the page
    // This prevents race conditions with StrictMode double-invocation
  }, [RecoveryComponent]);

  // If we need to render the recovery page instead of home
  if (RecoveryComponent) {
    return <RecoveryComponent />;
  }

  const handleExploreRentals = () => {
    // Navigate to search page with current day selection
    if (selectedDays.length > 0) {
      // Convert 0-based indices to 1-based for URL (0→1, 1→2, etc.)
      const oneBased = selectedDays.map(idx => idx + 1);
      const daysParam = oneBased.join(',');
      window.location.href = `/search.html?days-selected=${daysParam}`;
    } else {
      // No selection, navigate without parameter
      window.location.href = '/search.html';
    }
  };

  const handleMoreDetails = () => {
    // Scroll to ValuePropositions section
    const section = document.querySelector('.value-props');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenAIResearchModal = () => {
    setIsAIResearchModalOpen(true);
  };

  const handleCloseAIResearchModal = () => {
    setIsAIResearchModalOpen(false);
  };

  return (
    <div className="home-page">
      <Header />

      <Hero onExploreRentals={handleExploreRentals} onMoreDetails={handleMoreDetails} />

      <ValuePropositions />

      <ScheduleSection />

      <LocalJourneySection onExploreRentals={handleExploreRentals} />

      <FeaturedSpacesSection />

      <SupportSection />

      <Footer />

      {!isLoggedIn && (
        <>
          {getMarketReportVariant() === 'popup' && !isPopupDismissed ? (
            <MarketReportPopup
              isVisible={true}
              onRequestClick={handleOpenAIResearchModal}
              onDismiss={() => setIsPopupDismissed(true)}
            />
          ) : (
            <FloatingBadge onClick={handleOpenAIResearchModal} />
          )}

          <AiSignupMarketReport
            isOpen={isAIResearchModalOpen}
            onClose={handleCloseAIResearchModal}
          />
        </>
      )}
    </div>
  );
}
