import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { checkAuthStatus } from '../../lib/auth.js';
import {
  SEARCH_URL,
  SIGNUP_LOGIN_URL,
  VIEW_LISTING_URL,
  PROPERTY_IDS,
  DAY_NAMES,
  DAY_ABBREVIATIONS,
  SCHEDULE_PATTERNS,
  FAQ_URL,
  REFERRAL_API_ENDPOINT,
  EMBED_AI_DRAWER_URL
} from '../../lib/constants.js';
import { toBubbleDays, fromBubbleDays } from '../../lib/dayUtils.js';

// ============================================================================
// INTERNAL COMPONENT: Hero Section
// ============================================================================

function Hero({ selectedDays, onDayToggle, onExploreRentals }) {
  const [checkinCheckout, setCheckinCheckout] = useState({ display: false, checkinDay: '', checkoutDay: '' });

  useEffect(() => {
    updateCheckinCheckout();
  }, [selectedDays]);

  const updateCheckinCheckout = () => {
    if (selectedDays.length === 0) {
      setCheckinCheckout({ display: false, checkinDay: '', checkoutDay: '' });
      return;
    }

    // Check if days are continuous
    if (!areDaysContinuous(selectedDays)) {
      setCheckinCheckout({ display: true, error: true, checkinDay: '', checkoutDay: '' });
      return;
    }

    // Calculate check-in and check-out days
    let checkinDay, checkoutDay;

    if (selectedDays.length === 1) {
      checkinDay = DAY_NAMES[selectedDays[0]];
      checkoutDay = DAY_NAMES[selectedDays[0]];
    } else {
      const sortedDays = [...selectedDays].sort((a, b) => a - b);
      const hasSunday = sortedDays.includes(0);
      const hasSaturday = sortedDays.includes(6);

      if (hasSunday && hasSaturday && sortedDays.length < 7) {
        // Wrap-around case
        let gapStart = -1;
        let gapEnd = -1;

        for (let i = 0; i < sortedDays.length - 1; i++) {
          if (sortedDays[i + 1] - sortedDays[i] > 1) {
            gapStart = sortedDays[i] + 1;
            gapEnd = sortedDays[i + 1] - 1;
            break;
          }
        }

        if (gapStart !== -1 && gapEnd !== -1) {
          let checkinDayIndex;
          if (sortedDays.some(day => day > gapEnd)) {
            checkinDayIndex = sortedDays.find(day => day > gapEnd);
          } else {
            checkinDayIndex = 0;
          }

          let checkoutDayIndex;
          if (sortedDays.some(day => day < gapStart)) {
            checkoutDayIndex = sortedDays.filter(day => day < gapStart).pop();
          } else {
            checkoutDayIndex = 6;
          }

          checkinDay = DAY_NAMES[checkinDayIndex];
          checkoutDay = DAY_NAMES[checkoutDayIndex];
        } else {
          checkinDay = DAY_NAMES[sortedDays[0]];
          checkoutDay = DAY_NAMES[sortedDays[sortedDays.length - 1]];
        }
      } else {
        checkinDay = DAY_NAMES[sortedDays[0]];
        checkoutDay = DAY_NAMES[sortedDays[sortedDays.length - 1]];
      }
    }

    setCheckinCheckout({ display: true, error: false, checkinDay, checkoutDay });
  };

  const areDaysContinuous = (days) => {
    if (days.length <= 1) return true;
    if (days.length >= 6) return true;

    const sortedDays = [...days].sort((a, b) => a - b);

    // Check regular continuous
    let isRegularContinuous = true;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] !== sortedDays[i - 1] + 1) {
        isRegularContinuous = false;
        break;
      }
    }

    if (isRegularContinuous) return true;

    // Check wrap-around via unselected days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const unselectedDays = allDays.filter(day => !sortedDays.includes(day));

    if (unselectedDays.length === 0) return true;

    const sortedUnselected = [...unselectedDays].sort((a, b) => a - b);
    for (let i = 1; i < sortedUnselected.length; i++) {
      if (sortedUnselected[i] !== sortedUnselected[i - 1] + 1) {
        return false;
      }
    }

    return true;
  };

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
            Select which days you'd like to stay in NYC and
            <br />
            only pay for the nights you need.
          </p>

          {/* Day Selector */}
          <div className="day-selector">
            <div className="calendar-icon">
              <img
                src="https://c.animaapp.com/meh6k861XoGXNn/img/calendar-minimalistic-svgrepo-com-202-svg.svg"
                alt="Calendar"
                width="35"
                height="35"
              />
            </div>
            {DAY_ABBREVIATIONS.map((dayAbbr, index) => (
              <div
                key={index}
                className={`day-badge ${selectedDays.includes(index) ? 'active' : ''}`}
                data-day={index}
                onClick={() => onDayToggle(index)}
              >
                {dayAbbr}
              </div>
            ))}
          </div>

          {/* Check-in/Check-out Display */}
          {checkinCheckout.display && (
            <div className="checkin-checkout" id="checkinCheckout">
              {checkinCheckout.error ? (
                'Please select a continuous set of days'
              ) : (
                <>
                  <span>
                    <strong>Check-in:</strong> <span id="checkinDay">{checkinCheckout.checkinDay}</span>
                  </span>
                  <span className="separator">•</span>
                  <span>
                    <strong>Check-out:</strong> <span id="checkoutDay">{checkinCheckout.checkoutDay}</span>
                  </span>
                </>
              )}
            </div>
          )}

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
// INTERNAL COMPONENT: Schedule Section
// ============================================================================

function ScheduleSection() {
  const schedules = [
    {
      type: 'weeknight',
      title: 'Weeknight Listings',
      lottieUrl:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800679546x885675666145660000/Days-of-the-week-lottie.json',
      buttonText: 'Explore weeknight listings',
      days: '2,3,4,5,6', // Monday-Friday (1-based)
    },
    {
      type: 'weekend',
      title: 'Weekend Listings',
      lottieUrl:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800745354x526611430283845360/weekend-lottie%20%281%29.json',
      buttonText: 'Explore weekend listings',
      days: '6,7,1,2', // Fri-Sun+Mon (1-based)
    },
    {
      type: 'monthly',
      title: 'Monthly Listings',
      lottieUrl:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1736800780466x583314971697148400/Weeks-of-the-month-lottie.json',
      buttonText: 'Explore monthly listings',
      days: '1,2,3,4,5,6,7', // All days (1-based)
    },
  ];

  const handleScheduleClick = (days) => {
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
    <section className="schedule-section">
      <div className="schedule-header">
        <h2>Stop playing room roulette!</h2>
        <h1>Choose Your Split Schedule</h1>
      </div>

      <div className="schedule-grid">
        {schedules.map((schedule, index) => (
          <div key={index} className="schedule-card">
            <div className="schedule-visual">
              <div className="lottie-container">
                <lottie-player
                  src={schedule.lottieUrl}
                  background="white"
                  speed="1"
                  style={{ width: '100%', height: 'auto', maxWidth: '650px' }}
                  loop
                  autoplay
                ></lottie-player>
              </div>
              <div className="schedule-info"></div>
            </div>
            <button className="explore-btn" onClick={() => handleScheduleClick(schedule.days)}>
              {schedule.buttonText}
            </button>
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

function ListingsPreview({ selectedDays }) {
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
    const daysParam = selectedDays.length > 0 ? selectedDays.map(d => d + 1).join(',') : '2,3,4,5,6';
    const propertyUrl = `/view-split-lease.html/${propertyId}?days-selected=${daysParam}&weekly-frequency=Every%20week`;
    window.location.href = propertyUrl;
  };

  const handleShowMore = () => {
    const daysParam = selectedDays.length > 0 ? selectedDays.map(d => d + 1).join(',') : '1,2,3,4,5,6';
    const searchUrl = `/search.html?days-selected=${daysParam}`;
    window.location.href = searchUrl;
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
// INTERNAL COMPONENT: Market Research Modal
// ============================================================================

function MarketResearchModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className={`market-research-modal ${isOpen ? 'active' : ''}`}>
      <div className="market-research-modal-content">
        <button className="market-research-modal-close" onClick={onClose}>
          &times;
        </button>
        <div className="market-research-iframe-container">
          {loading && (
            <div className="market-research-loader">
              <div className="spinner"></div>
              <p>Loading Market Research...</p>
            </div>
          )}
          <iframe
            id="marketResearchIframe"
            src={isOpen ? EMBED_AI_DRAWER_URL : ''}
            frameBorder="0"
            allowFullScreen
            onLoad={handleIframeLoad}
          ></iframe>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: HomePage
// ============================================================================

export default function HomePage() {
  // State management
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Default: Monday-Friday (0-based)
  const [marketResearchModalOpen, setMarketResearchModalOpen] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    loadStateFromURL();
    checkAuthStatus(); // Check authentication status
  }, []);

  // Update URL when selected days change
  useEffect(() => {
    updateURL();
  }, [selectedDays]);

  const loadStateFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const daysParam = urlParams.get('days-selected');

    if (daysParam) {
      const decoded = decodeURIComponent(daysParam);
      // Convert from 1-based (Bubble) to 0-based (JavaScript)
      const bubbleDays = decoded.split(',').map((d) => parseInt(d.trim()));
      const jsDays = fromBubbleDays(bubbleDays);
      setSelectedDays(jsDays);
    }
  };

  const updateURL = () => {
    const currentUrl = new URL(window.location);

    if (selectedDays.length === 0) {
      currentUrl.searchParams.delete('days-selected');
    } else {
      // Convert to 1-based indexing for Bubble
      const bubbleDays = toBubbleDays(selectedDays);
      currentUrl.searchParams.set('days-selected', bubbleDays.join(', '));
    }

    window.history.replaceState({}, '', currentUrl);
  };

  const handleDayToggle = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      // Prevent unselection if only 2 days are selected
      if (selectedDays.length <= 2) {
        console.log('Cannot unselect: Minimum 2 days must remain selected');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      const newSelectedDays = [...selectedDays, dayIndex].sort((a, b) => a - b);
      setSelectedDays(newSelectedDays);
    }
  };

  const handleExploreRentals = () => {
    if (selectedDays.length === 0) {
      console.log('Please select at least one day');
      return;
    }

    // Check if days are continuous
    if (!areDaysContinuous(selectedDays)) {
      console.log('Please select a continuous set of days');
      return;
    }

    // Convert to 1-based indexing for Bubble
    const bubbleDays = toBubbleDays(selectedDays);
    const searchUrl = `/search.html?days-selected=${bubbleDays.join(',')}`;
    window.location.href = searchUrl;
  };

  const areDaysContinuous = (days) => {
    if (days.length <= 1) return true;
    if (days.length >= 6) return true;

    const sortedDays = [...days].sort((a, b) => a - b);

    // Check regular continuous
    let isRegularContinuous = true;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] !== sortedDays[i - 1] + 1) {
        isRegularContinuous = false;
        break;
      }
    }

    if (isRegularContinuous) return true;

    // Check wrap-around via unselected days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const unselectedDays = allDays.filter((day) => !sortedDays.includes(day));

    if (unselectedDays.length === 0) return true;

    const sortedUnselected = [...unselectedDays].sort((a, b) => a - b);
    for (let i = 1; i < sortedUnselected.length; i++) {
      if (sortedUnselected[i] !== sortedUnselected[i - 1] + 1) {
        return false;
      }
    }

    return true;
  };

  const handleOpenMarketResearch = () => {
    setMarketResearchModalOpen(true);
  };

  const handleCloseMarketResearch = () => {
    setMarketResearchModalOpen(false);
  };

  return (
    <>
      <Header />

      <Hero
        selectedDays={selectedDays}
        onDayToggle={handleDayToggle}
        onExploreRentals={handleExploreRentals}
      />

      <ValuePropositions />

      <ScheduleSection />

      <BenefitsSection onExploreRentals={handleExploreRentals} />

      <ListingsPreview selectedDays={selectedDays} />

      <SupportSection />

      <Footer />

      <FloatingBadge onClick={handleOpenMarketResearch} />

      <MarketResearchModal isOpen={marketResearchModalOpen} onClose={handleCloseMarketResearch} />
    </>
  );
}
