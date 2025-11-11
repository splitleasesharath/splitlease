import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

export default function WhySplitLeasePage() {
  // Dynamic text rotation state
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  // Schedule selector state
  const [selectedDays, setSelectedDays] = useState([1, 2]); // Monday and Tuesday by default

  const scenarios = [
    { city: "Philadelphia", purpose: "work" },
    { city: "Boston", purpose: "study" },
    { city: "DC", purpose: "visit" },
    { city: "Baltimore", purpose: "consult" },
    { city: "Providence", purpose: "teach" },
    { city: "Hartford", purpose: "perform" },
    { city: "Stamford", purpose: "train" },
    { city: "Albany", purpose: "care" }
  ];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbreviations = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Dynamic text rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setCurrentScenarioIndex((prevIndex) => (prevIndex + 1) % scenarios.length);
        setFadeOut(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [scenarios.length]);

  // Toggle day selection
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  // Get checkin/checkout days
  const getCheckinCheckout = () => {
    if (selectedDays.length === 0) {
      return { checkin: '', checkout: '', show: false };
    }

    const firstDay = Math.min(...selectedDays);
    const lastDay = Math.max(...selectedDays);
    const checkoutDayIndex = (lastDay + 1) % 7;

    return {
      checkin: dayNames[firstDay],
      checkout: dayNames[checkoutDayIndex],
      show: true
    };
  };

  const checkinCheckout = getCheckinCheckout();

  const handleExploreSpaces = () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one night per week');
      return;
    }
    window.location.href = SEARCH_URL;
  };

  return (
    <>
      <Header />

      {/* Hero Section - Floating People Pattern */}
      <section className="hero-identity">
        {/* Floating People */}
        <div className="floating-person hero-person-1">
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>
        <div className="floating-person hero-person-2">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>
        <div className="floating-person hero-person-3">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>
        <div className="floating-person hero-person-4">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>
        <div className="floating-person hero-person-5">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>
        <div className="floating-person hero-person-6">
          <img src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop" alt="Multi-local resident" />
        </div>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">Multi-Local Living</div>
            <h1 className="hero-title">
              <span className="hero-line-1">
                You live in <span className={`dynamic-text ${fadeOut ? 'fade-out' : ''}`}>{scenarios[currentScenarioIndex].city}</span>
              </span>
              <span className="hero-line-2">
                And <span className={`dynamic-text ${fadeOut ? 'fade-out' : ''}`}>{scenarios[currentScenarioIndex].purpose}</span> in NYC.
              </span>
            </h1>
            <p className="hero-subtitle">
              Split Lease matches you with your NYC home base. Same space every visit. Leave your belongings, keep your freedom.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">2,400+</div>
                <div className="stat-label">NYC Multi-Locals</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">$18K</div>
                <div className="stat-label">Avg Yearly Savings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">200+</div>
                <div className="stat-label">NYC Listings</div>
              </div>
            </div>
            <div className="hero-cta">
              <a href={SEARCH_URL} className="cta-button cta-primary">
                <span>Find Your NYC Space</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Exist Section - PATTERN 2: Light Background with Purple Circle Accents */}
      <section className="why-exist-section">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>
        <div className="circle-accent circle-accent-3"></div>

        <div className="why-exist-container">
          <h2 className="why-exist-title">The Problem with Living in Two Cities</h2>
          <p className="why-exist-description">
            Hotels cost a fortune. Airbnb is a lottery. Full-time leases make you pay for nights you're not even there. And nobody lets you leave your stuff.
          </p>

          <div className="why-exist-pain">
            <div className="pain-card">
              <div className="pain-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="pain-separator"></div>
              <h3 className="pain-title">Hotels Drain Your Wallet</h3>
              <p className="pain-text">$300/night adds up to $3,600/month for just 12 nights. You're paying premium rates for generic rooms.</p>
            </div>

            <div className="pain-card">
              <div className="pain-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div className="pain-separator"></div>
              <h3 className="pain-title">Airbnb is a Gamble</h3>
              <p className="pain-text">Different place every visit. "Wifi works great" means maybe. Can't leave belongings. Living out of a suitcase forever.</p>
            </div>

            <div className="pain-card">
              <div className="pain-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div className="pain-separator"></div>
              <h3 className="pain-title">Pay for Empty Nights</h3>
              <p className="pain-text">Full-time lease costs $3,200/month for 30 nights. You're only there 12. That empty apartment is draining $2,000/month while you're gone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Schedule Selector Section - PATTERN 3: White with Outlined Purple Bubbles */}
      <section className="schedule-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>
        <div className="outlined-bubble outlined-bubble-3"></div>

        <div className="schedule-container">
          <div className="schedule-header">
            <div className="schedule-eyebrow">Your Schedule, Your Way</div>
            <h2 className="schedule-title">Pay Only for the Nights You Need</h2>
            <p className="schedule-subtitle">
              Select which days you'll be in NYC each week. No more paying for nights you're not using.
            </p>
          </div>

          <div className="schedule-selector-wrapper">
            <div className="selector-label">Select your NYC nights →</div>

            <div className="day-selector">
              <div className="calendar-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="6" width="18" height="15" rx="2" stroke="#6B7280" strokeWidth="2"/>
                  <path d="M3 10H21" stroke="#6B7280" strokeWidth="2"/>
                  <path d="M7 3V6M17 3V6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {dayAbbreviations.map((day, index) => (
                <div
                  key={index}
                  className={`day-badge ${selectedDays.includes(index) ? 'active' : ''}`}
                  onClick={() => toggleDay(index)}
                >
                  {day}
                </div>
              ))}
            </div>

            {checkinCheckout.show && (
              <div className="checkin-checkout">
                <span><strong>Check-in:</strong> <span>{checkinCheckout.checkin}</span></span>
                <span>•</span>
                <span><strong>Check-out:</strong> <span>{checkinCheckout.checkout}</span></span>
              </div>
            )}

            <button className="schedule-cta" onClick={handleExploreSpaces}>
              See NYC Spaces for This Schedule
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section - PATTERN 5: Light Gray with Gradient Purple Blobs */}
      <section className="how-it-works">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="how-it-works-container">
          <div className="how-header">
            <h2 className="how-title">How Split Lease Works</h2>
            <p className="how-subtitle">Get your NYC home base in three simple steps</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Select Your Schedule</h3>
              <p className="step-description">Choose which nights you'll be in NYC each week. We match you with spaces that fit your exact schedule.</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Browse & Book</h3>
              <p className="step-description">View verified spaces with quality setups. Submit a proposal for your schedule and we'll match you with the perfect space.</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Move In & Leave Your Stuff</h3>
              <p className="step-description">Get your keys and make it yours. Leave your clothes, work gear, and toiletries—no more packing every trip. Adjust your nights anytime—plans change, we get it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spaces Section - PATTERN 3: White with Outlined Bubbles */}
      <section className="featured-spaces">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>
        <div className="outlined-bubble outlined-bubble-3"></div>

        <div className="featured-spaces-container">
          <div className="spaces-header">
            <div className="spaces-eyebrow">Browse Spaces</div>
            <h2 className="spaces-title">Featured NYC Spaces</h2>
          </div>

          <div className="category-filters">
            <div className="filter-pill active">All Spaces</div>
            <div className="filter-pill">Manhattan</div>
            <div className="filter-pill">Brooklyn</div>
            <div className="filter-pill">Queens</div>
            <div className="filter-pill">Private Bedroom</div>
            <div className="filter-pill">Entire Place</div>
          </div>

          <div className="spaces-grid">
            {/* Space Card 1 */}
            <div className="space-card" onClick={() => window.location.href = SEARCH_URL}>
              <div style={{ position: 'relative' }}>
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop" alt="Modern Midtown Studio" className="space-image" />
                <div className="space-badge">Verified</div>
              </div>
              <div className="space-info">
                <h3 className="space-title">Modern Midtown Studio</h3>
                <div className="space-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6B7280" strokeWidth="2"/>
                    <circle cx="12" cy="9" r="2.5" stroke="#6B7280" strokeWidth="2"/>
                  </svg>
                  Midtown West
                </div>
                <div className="space-features">
                  <span className="feature-tag">Storage Space</span>
                  <span className="feature-tag">Dedicated Workspace</span>
                  <span className="feature-tag">WiFi</span>
                </div>
                <div className="space-schedule">
                  <span className="available-days">Mon-Wed Available</span>
                  <div className="day-indicators">
                    <div className="day-dot"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Space Card 2 */}
            <div className="space-card" onClick={() => window.location.href = SEARCH_URL}>
              <div style={{ position: 'relative' }}>
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop" alt="Brooklyn Heights 1BR" className="space-image" />
                <div className="space-badge">Verified</div>
              </div>
              <div className="space-info">
                <h3 className="space-title">Brooklyn Heights 1BR</h3>
                <div className="space-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6B7280" strokeWidth="2"/>
                    <circle cx="12" cy="9" r="2.5" stroke="#6B7280" strokeWidth="2"/>
                  </svg>
                  Brooklyn Heights
                </div>
                <div className="space-features">
                  <span className="feature-tag">Storage Space</span>
                  <span className="feature-tag">Office Setup</span>
                  <span className="feature-tag">Quiet</span>
                </div>
                <div className="space-schedule">
                  <span className="available-days">Sun-Tue Available</span>
                  <div className="day-indicators">
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Space Card 3 */}
            <div className="space-card" onClick={() => window.location.href = SEARCH_URL}>
              <div style={{ position: 'relative' }}>
                <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop" alt="Lower East Side Loft" className="space-image" />
                <div className="space-badge">Verified</div>
              </div>
              <div className="space-info">
                <h3 className="space-title">Lower East Side Loft</h3>
                <div className="space-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#6B7280" strokeWidth="2"/>
                    <circle cx="12" cy="9" r="2.5" stroke="#6B7280" strokeWidth="2"/>
                  </svg>
                  Lower East Side
                </div>
                <div className="space-features">
                  <span className="feature-tag">Storage Space</span>
                  <span className="feature-tag">High-Speed WiFi</span>
                  <span className="feature-tag">Desk</span>
                </div>
                <div className="space-schedule">
                  <span className="available-days">Thu-Sat Available</span>
                  <div className="day-indicators">
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                    <div className="day-dot available"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <a href={SEARCH_URL} className="cta-button cta-primary">
              <span>Browse All NYC Spaces</span>
            </a>
          </div>
        </div>
      </section>

      {/* Trust Stats Section - PATTERN 5: Light Gray with Gradient Purple Blobs */}
      <section className="trust-section">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="trust-container">
          <div className="trust-grid">
            <div className="trust-stat">
              <div className="trust-number">200+</div>
              <div className="trust-label">NYC Spaces</div>
            </div>
            <div className="trust-stat">
              <div className="trust-number">2,400+</div>
              <div className="trust-label">Multi-Locals</div>
            </div>
            <div className="trust-stat">
              <div className="trust-number">$18K</div>
              <div className="trust-label">Avg. Yearly Savings</div>
            </div>
            <div className="trust-stat">
              <div className="trust-number">4.8★</div>
              <div className="trust-label">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different Section - PATTERN 5: Light Gray with Gradient Blobs */}
      <section className="different-section">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="different-content">
          <div className="different-eyebrow">The Split Lease Difference</div>
          <h2 className="different-title">Share Spaces. Different Days. Lower Prices.</h2>
          <p className="different-description">
            Here's the secret: Multiple guests share the same space on different days of the week. You get Monday-Wednesday. Someone else gets Thursday-Saturday. Same apartment, different schedules, fraction of the cost.
          </p>

          <div className="split-schedule-visual">
            <div className="schedule-example">
              <div className="guest-schedule">
                <div className="guest-label">Guest A - You</div>
                <div className="schedule-days">
                  <div className="schedule-day">S</div>
                  <div className="schedule-day active">M</div>
                  <div className="schedule-day active">T</div>
                  <div className="schedule-day active">W</div>
                  <div className="schedule-day">T</div>
                  <div className="schedule-day">F</div>
                  <div className="schedule-day">S</div>
                </div>
                <div className="guest-info">
                  Consultant visiting NYC<br />
                  3 nights/week
                </div>
              </div>

              <div className="guest-schedule">
                <div className="guest-label">Guest B - Someone Else</div>
                <div className="schedule-days">
                  <div className="schedule-day">S</div>
                  <div className="schedule-day">M</div>
                  <div className="schedule-day">T</div>
                  <div className="schedule-day">W</div>
                  <div className="schedule-day active">T</div>
                  <div className="schedule-day active">F</div>
                  <div className="schedule-day active">S</div>
                </div>
                <div className="guest-info">
                  Visiting family on weekends<br />
                  3 nights/week
                </div>
              </div>
            </div>

            <div className="split-result">
              <div className="split-result-text">✓ Same Space. Different Days. Everyone Wins.</div>
              <div className="split-result-subtext">Hosts earn consistent income. Guests pay 40-60% less than hotels or traditional rentals.</div>
            </div>
          </div>

          <p className="different-description">
            <strong>Why this works:</strong> You're not a tourist bouncing between Airbnbs. You need a consistent space—and a place to <strong>permanently store your belongings.</strong> Split Lease matches you with others who share your schedule. Flexible, consistent, affordable.
          </p>
        </div>
      </section>

      {/* Pricing Explanation Section - PATTERN 2: Light Background with Purple Circle Accents */}
      <section className="pricing-explanation">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>
        <div className="circle-accent circle-accent-3"></div>

        <div className="pricing-container">
          <div className="pricing-header">
            <div className="pricing-eyebrow">Transparent Pricing</div>
            <h2 className="pricing-title">How Are Prices So Low?</h2>
            <p className="pricing-subtitle">
              Because you're sharing space on different days, hosts charge less while maintaining consistent occupancy.
            </p>
          </div>

          <div className="pricing-comparison">
            <div className="pricing-card">
              <div className="pricing-card-label">Hotels / Airbnb</div>
              <div className="pricing-amount">$3,600</div>
              <div className="pricing-period">per month</div>
              <div className="pricing-details">
                12 nights @ $300/night<br />
                Inconsistent locations<br />
                No workspace guarantee<br />
                <strong>✗ Pack/unpack every time</strong>
              </div>
            </div>

            <div className="pricing-card highlight">
              <div className="pricing-card-label">Split Lease</div>
              <div className="pricing-amount">$1,400</div>
              <div className="pricing-period">per month</div>
              <div className="pricing-details">
                12 nights in same space<br />
                Consistent location<br />
                Workspace included<br />
                <strong>✓ Storage: Leave all your belongings</strong>
              </div>
              <div className="pricing-savings-badge">Save $2,200/month</div>
            </div>

            <div className="pricing-card">
              <div className="pricing-card-label">Full-Time Lease</div>
              <div className="pricing-amount">$3,200</div>
              <div className="pricing-period">per month</div>
              <div className="pricing-details">
                Pay for 30 nights<br />
                Use only 12 nights<br />
                Long-term commitment<br />
                Utility bills extra
              </div>
            </div>
          </div>

          <div className="pricing-explanation-text">
            <strong>The math is simple:</strong> Hotels charge premium rates because they need to cover empty nights. Full-time leases make you pay for nights you're not there. Split Lease matches you with space that fits your exact schedule—and because multiple guests share different days, everyone pays less while hosts earn consistent income. It's housing designed for how multi-local people actually live.
          </div>
        </div>
      </section>

      {/* Testimonial Section - PATTERN 3: White with Outlined Bubbles */}
      <section className="testimonials-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>
        <div className="outlined-bubble outlined-bubble-3"></div>

        <div className="testimonials-container">
          <div className="testimonials-header">
            <div className="testimonials-eyebrow">Success Stories</div>
            <h2 className="testimonials-title">Real stories from NYC multi-locals</h2>
            <p className="testimonials-description">
              See how people are saving thousands with consistent NYC housing through Split Lease—whatever brings them back to the city.
            </p>
            <a href="https://app.split.lease/success-stories-guest" className="testimonials-cta">View all stories</a>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop" alt="Priya Sharma" className="testimonial-image" />
              <div className="testimonial-content">
                <h3 className="testimonial-name">Priya Sharma</h3>
                <p className="testimonial-role">Senior Product Designer · 12 nights/month in NYC</p>
                <p className="testimonial-quote">
                  "I work with NYC clients regularly and needed a consistent place to stay. Split Lease gave me the consistency I needed without the commitment I didn't. Saved $24K last year and never had a booking nightmare."
                </p>
                <a href="#" className="testimonial-link">
                  Read full story
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="testimonial-card">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop" alt="Marcus Chen" className="testimonial-image" />
              <div className="testimonial-content">
                <h3 className="testimonial-name">Marcus Chen</h3>
                <p className="testimonial-role">Strategy Consultant · 8 nights/month in NYC</p>
                <p className="testimonial-quote">
                  "Every week I'm in NYC for client meetings. Split Lease is my second home—literally. Same apartment, same key, zero hassle. It's transformed how I work and live."
                </p>
                <a href="#" className="testimonial-link">
                  Read full story
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="testimonial-card">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop" alt="David Martinez" className="testimonial-image" />
              <div className="testimonial-content">
                <h3 className="testimonial-name">David Martinez</h3>
                <p className="testimonial-role">Father · Every weekend in NYC</p>
                <p className="testimonial-quote">
                  "I live in Boston but have custody every weekend. Split Lease gave me a consistent place for my kids—their clothes, toys, and favorite books are always there. They call it 'Dad's NYC home.' Worth every penny for that stability."
                </p>
                <a href="#" className="testimonial-link">
                  Read full story
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="testimonial-card">
              <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop" alt="Sarah Kim" className="testimonial-image" />
              <div className="testimonial-content">
                <h3 className="testimonial-name">Sarah Kim</h3>
                <p className="testimonial-role">MBA Student · 3 nights/week in NYC</p>
                <p className="testimonial-quote">
                  "My program has me in NYC every Tuesday-Thursday. Split Lease saved me from drowning in hotel costs or commuting 4 hours daily. I can focus on my studies, not logistics. My textbooks and study materials stay there—it's my second dorm."
                </p>
                <a href="#" className="testimonial-link">
                  Read full story
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - PATTERN 1: Brand Purple Hero with Gradient Circles */}
      <section className="final-cta">
        <div className="gradient-circle gradient-circle-1"></div>
        <div className="gradient-circle gradient-circle-2"></div>
        <div className="gradient-circle gradient-circle-3"></div>

        <div className="cta-card">
          <h2 className="cta-title-final">Ready to Stop Packing Every Trip?</h2>
          <p className="cta-subtitle-final">
            Find your NYC space with storage included. Leave your belongings, keep your freedom, pay only for the nights you need.
          </p>
          <div className="hero-cta">
            <a href={SEARCH_URL} className="cta-button cta-primary">
              <span>Explore NYC Listings</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
