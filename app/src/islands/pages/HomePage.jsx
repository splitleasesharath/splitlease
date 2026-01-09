import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport';
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
// INTERNAL COMPONENT: Hero Section
// ============================================================================

function Hero({ onExploreRentals }) {

  return (
    <section className="hero-section">
      {/* Mobile-only floating Empire State Building */}
      <img
        src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=768,h=777,f=auto,dpr=1,fit=contain/f1754342803901x992060741248266000/ChatGPT_Image_Aug_4__2025__06_20_44_PM-removebg-preview.png"
        alt="Empire State Building"
        className="mobile-empire-state"
      />
      <div className="hero-content-wrapper">
        <img
          src="/assets/images/hero-left.png"
          alt="Brooklyn Bridge illustration"
          className="hero-illustration hero-illustration-left"
        />
        <img
          src="/assets/images/hero-right.png"
          alt="Empire State Building illustration"
          className="hero-illustration hero-illustration-right"
        />
        <div className="hero-content">
          <h1 className="hero-title">
            Ongoing Rentals <span className="mobile-break">for Repeat Stays</span>
          </h1>
          <p className="hero-subtitle">
            Discover flexible rental options in NYC.
            <br />
            Only pay for the nights you need.
          </p>

          <button className="hero-cta-button" onClick={onExploreRentals}>
            Explore Rentals
          </button>
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
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800679546x885675666145660000/Days-of-the-week-lottie.json',
      days: '2,3,4,5,6',
    },
    {
      id: 'weekend',
      label: 'Weekends',
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800745354x526611430283845360/weekend-lottie%20%281%29.json',
      days: '6,7,1,2',
    },
    {
      id: 'fullweek',
      label: 'Weeks-of-the-Month',
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800780466x583314971697148400/Weeks-of-the-month-lottie.json',
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

  // Fetch Manhattan listings
  const fetchFeaturedListings = useCallback(async () => {
    if (!manhattanId) return;

    setIsLoadingListings(true);
    try {
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
        .eq('"Location - Borough"', manhattanId)
        .or('"Active".eq.true,"Active".is.null')
        .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null')
        .limit(3);

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

      const transformedListings = listings.map(listing => {
        const photos = parseJsonArray(listing['Features - Photos']);
        const firstPhoto = photos?.[0];

        let photoUrl = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop';
        if (typeof firstPhoto === 'object' && firstPhoto !== null) {
          let url = firstPhoto.url || firstPhoto.Photo || '';
          if (url.startsWith('//')) url = 'https:' + url;
          if (url) photoUrl = url;
        } else if (typeof firstPhoto === 'string' && photoMap[firstPhoto]) {
          photoUrl = photoMap[firstPhoto];
        }

        const neighborhoodName = getNeighborhoodName(listing['Location - Hood']);
        const boroughName = getBoroughName(listing['Location - Borough']);
        const location = [neighborhoodName, boroughName].filter(Boolean).join(', ') || 'New York, NY';

        const availableDays = parseJsonArray(listing['Days Available (List of Days)']) || [];

        return {
          id: listing._id,
          title: listing['Name'] || 'NYC Space',
          location,
          image: photoUrl,
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
  }, [manhattanId]);

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

  // If we need to render the recovery page instead of home
  if (RecoveryComponent) {
    return <RecoveryComponent />;
  }

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await checkAuthStatus();
      setIsLoggedIn(loggedIn);
    };
    checkAuth();
  }, []);

  // Mount SearchScheduleSelector component in hero section above Explore Rentals button
  useEffect(() => {
    const mountPoint = document.createElement('div');
    mountPoint.id = 'home-schedule-selector-mount';
    mountPoint.style.display = 'flex';
    mountPoint.style.justifyContent = 'center';
    mountPoint.style.marginBottom = '20px';

    const heroContent = document.querySelector('.hero-content');
    const exploreButton = document.querySelector('.hero-cta-button');

    if (heroContent && exploreButton) {
      heroContent.insertBefore(mountPoint, exploreButton);

      const root = createRoot(mountPoint);
      root.render(
        <SearchScheduleSelector
          onSelectionChange={(days) => {
            console.log('Selected days on home page:', days);
            // Just update state, don't auto-navigate
            setSelectedDays(days.map(d => d.index));
          }}
          onError={(error) => console.error('SearchScheduleSelector error:', error)}
        />
      );

      return () => {
        root.unmount();
        if (mountPoint.parentNode) {
          mountPoint.parentNode.removeChild(mountPoint);
        }
      };
    }
  }, []);

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

  const handleOpenAIResearchModal = () => {
    setIsAIResearchModalOpen(true);
  };

  const handleCloseAIResearchModal = () => {
    setIsAIResearchModalOpen(false);
  };

  return (
    <div className="home-page">
      <Header />

      <Hero onExploreRentals={handleExploreRentals} />

      <ValuePropositions />

      <ScheduleSection />

      <LocalJourneySection onExploreRentals={handleExploreRentals} />

      <FeaturedSpacesSection />

      <SupportSection />

      <Footer />

      {!isLoggedIn && (
        <>
          <FloatingBadge onClick={handleOpenAIResearchModal} />

          <AiSignupMarketReport
            isOpen={isAIResearchModalOpen}
            onClose={handleCloseAIResearchModal}
          />
        </>
      )}
    </div>
  );
}
