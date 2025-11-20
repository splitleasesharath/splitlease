import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport';
import { checkAuthStatus } from '../../lib/auth.js';
import {
  PROPERTY_IDS,
  FAQ_URL
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
// INTERNAL COMPONENT: Schedule Cards (Inverted Delivery Card Style)
// ============================================================================

function InvertedScheduleCards() {
  const schedules = [
    {
      id: 'weeknight',
      title: 'Weeknight Listings',
      description: 'Find your perfect weeknight space. Book Monday through Friday and enjoy flexible living.',
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800679546x885675666145660000/Days-of-the-week-lottie.json',
      days: '2,3,4,5,6', // Monday-Friday
    },
    {
      id: 'weekend',
      title: 'Weekend Listings',
      description: 'Escape for the weekend. Book Saturday and Sunday stays at your favorite locations.',
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800745354x526611430283845360/weekend-lottie%20%281%29.json',
      days: '6,7,1,2', // Fri-Sun+Mon
    },
    {
      id: 'monthly',
      title: 'Monthly Listings',
      description: 'Commit to a full month. Secure your space with monthly booking options.',
      lottieUrl: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800780466x583314971697148400/Weeks-of-the-month-lottie.json',
      days: '1,2,3,4,5,6,7', // All days
    },
  ];

  const handleExploreClick = (days) => {
    const searchUrl = `/search.html?days-selected=${days}`;
    window.location.href = searchUrl;
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
    <section className="inverted-schedule-section">
      <div className="schedule-header">
        <h2>Stop playing room roulette!</h2>
        <h1>Choose Your Split Schedule</h1>
      </div>

      <div className="inverted-schedule-grid">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="lottie-card-v11">
            <div className="visual-section">
              <div className="lottie-animation">
                <lottie-player
                  src={schedule.lottieUrl}
                  background="white"
                  speed="1"
                  style={{ width: '100%', maxWidth: '240px', height: '160px' }}
                  loop
                  autoplay
                ></lottie-player>
              </div>
            </div>
            <div className="content-section">
              <h3>{schedule.title}</h3>
              <p className="description">{schedule.description}</p>
              <div className="card-footer">
                <button
                  className="btn-primary"
                  onClick={() => handleExploreClick(schedule.days)}
                >
                  Explore listings
                </button>
                <div className="status-indicator">
                  <svg className="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Available now
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Benefits Section
// ============================================================================

function BenefitsSection({ onExploreRentals }) {
  const benefits = [
    'Fully-furnished spaces ensure move-in is a breeze.',
    'Store items like toiletries, a second monitor, work attire, and anything else you may need to make yourself at home.',
    'Forget HOAs. Switch neighborhoods seasonally, discover amazing flexibility.',
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-wrapper">
        <h2>Choose when to be a local</h2>
        <div className="benefits-list">
          {benefits.map((benefit, index) => (
            <div key={index} className="benefit-item">
              <div className="benefit-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#5B5FCF" />
                  <path
                    d="M17 8L10 15L7 12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p>{benefit}</p>
            </div>
          ))}
        </div>
        <button className="cta-button benefits-cta" onClick={onExploreRentals}>
          Explore Rentals
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Listings Preview
// ============================================================================

function ListingsPreview({ selectedDays = [] }) {
  const listings = [
    {
      id: PROPERTY_IDS.ONE_PLATT_STUDIO,
      image:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=384,h=313,f=auto,dpr=1.25,fit=contain,q=75/f1586448035769x259434561490871740/255489_1_6782895-650-570.jpg',
      title: 'One Platt | Studio',
      description: 'Studio - 1 bed - 1 bathroom - Free Storage',
    },
    {
      id: PROPERTY_IDS.PIED_A_TERRE,
      image:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=384,h=313,f=auto,dpr=1.25,fit=contain,q=75/f1746102430270x309647360933492400/pied4.webp',
      title: 'Pied-à-terre , Perfect 2 BR...',
      description: '2 bedrooms - 2 bed(s) - 1 bathroom - Free Storage',
    },
    {
      id: PROPERTY_IDS.FURNISHED_1BR,
      image:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=384,h=313,f=auto,dpr=1.25,fit=contain,q=75/f1746102537155x544568166750526000/harlem4.webp',
      title: 'Fully furnished 1bdr apartment in...',
      description: '1 bedroom - 1 bed - 1 bathroom - Free Storage',
    },
    {
      id: PROPERTY_IDS.FURNISHED_STUDIO,
      image:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=384,h=313,f=auto,dpr=1.25,fit=contain,q=75/f1701198008563x119014198947512200/julia4.jpg',
      title: 'Furnished Studio Apt for Rent',
      description: 'Studio - 1 bed - 1 bathroom - Free Storage',
    },
  ];

  const handleListingClick = (propertyId) => {
    // Redirect to local view-split-lease page with property ID in path (clean URL)
    const propertyUrl = `/view-split-lease/${propertyId}`;
    window.location.href = propertyUrl;
  };

  const handleShowMore = () => {
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

  return (
    <section className="listings-section">
      <h2>Check Out Some Listings</h2>
      <div className="listings-container">
        <div className="listings-grid">
          {listings.map((listing, index) => (
            <div
              key={index}
              className="listing-card"
              data-property-id={listing.id}
              onClick={() => handleListingClick(listing.id)}
            >
              <div
                className="listing-image"
                style={{
                  backgroundImage: `url('${listing.image}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              ></div>
              <div className="listing-details">
                <h3>{listing.title}</h3>
                <p>{listing.description}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Scroll indicators for mobile */}
        <div className="scroll-indicators">
          {listings.map((_, index) => (
            <span key={index} className={`indicator ${index === 0 ? 'active' : ''}`} data-slide={index}></span>
          ))}
        </div>
      </div>
      <button className="show-more-btn" onClick={handleShowMore}>
        Show me more Rentals
      </button>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Support Section
// ============================================================================

function SupportSection() {
  const supportOptions = [
    {
      icon: 'https://s3.amazonaws.com/appforest_uf/f1612395570366x477803304486100100/COLOR',
      label: 'Instant Live-Chat',
      link: FAQ_URL,
    },
    {
      icon: 'https://s3.amazonaws.com/appforest_uf/f1612395570375x549911933429149100/COLOR',
      label: 'Browse our FAQs',
      link: FAQ_URL,
    },
  ];

  return (
    <section className="support-section">
      <h2>Get personal support</h2>
      <div className="support-options">
        {supportOptions.map((option, index) => (
          <a key={index} href={option.link} target="_blank" rel="noopener noreferrer" className="support-card-link">
            <div className="support-card">
              <div className={`support-icon ${index === 0 ? 'chat' : 'faq'}`}>
                <img src={option.icon} alt={option.label} />
              </div>
              <p>{option.label}</p>
            </div>
          </a>
        ))}
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

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
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

      <InvertedScheduleCards />

      <BenefitsSection onExploreRentals={handleExploreRentals} />

      <ListingsPreview selectedDays={selectedDays} />

      <SupportSection />

      <Footer />

      <FloatingBadge onClick={handleOpenAIResearchModal} />

      <AiSignupMarketReport
        isOpen={isAIResearchModalOpen}
        onClose={handleCloseAIResearchModal}
      />
    </div>
  );
}
