import { useState, useEffect, useRef } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';

// Example Card component with mobile flip support
function SwipeableExampleCard({ name, avatarUrl, pattern, review, activeDays }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleToggle = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className={`example-card ${isFlipped ? 'flipped' : ''}`}
      onClick={handleToggle}
    >
      {/* Desktop structure - uses original hover behavior */}
      <div className="desktop-card-content">
        <div className="example-header">
          <div className="example-avatar">
            <img src={avatarUrl} alt={name} />
          </div>
          <div className="example-name">{name}</div>
        </div>
        <div className="example-content-wrapper">
          <p className="example-pattern">{pattern}</p>
          <p className="example-review">"{review}"</p>
        </div>
        <div className="example-timeline">
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div key={day} className={`day-block ${activeDays.includes(day) ? 'active' : ''}`}></div>
          ))}
        </div>
        <div className="timeline-labels">
          <span className="timeline-label">Mon</span>
          <span className="timeline-label">Sun</span>
        </div>
      </div>

      {/* Mobile structure - flip card */}
      <div className="mobile-card-inner">
        {/* Front side */}
        <div className="mobile-card-front">
          <div className="example-header">
            <div className="example-avatar">
              <img src={avatarUrl} alt={name} />
            </div>
            <div className="example-name">{name}</div>
          </div>
          <div className="example-content-wrapper">
            <p className="example-pattern">{pattern}</p>
          </div>
          <div className="example-timeline">
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <div key={day} className={`day-block ${activeDays.includes(day) ? 'active' : ''}`}></div>
            ))}
          </div>
          <div className="timeline-labels">
            <span className="timeline-label">Mon</span>
            <span className="timeline-label">Sun</span>
          </div>
          <div className="swipe-hint">
            <span>Tap to see review</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>

        {/* Back side */}
        <div className="mobile-card-back">
          <div className="example-header">
            <div className="example-avatar">
              <img src={avatarUrl} alt={name} />
            </div>
            <div className="example-name">{name}</div>
          </div>
          <div className="review-content">
            <p className="example-review-text">"{review}"</p>
          </div>
          <div className="swipe-hint back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Tap to go back</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const [typeformModalActive, setTypeformModalActive] = useState(false);
  const [gameModalActive, setGameModalActive] = useState(false);
  const typeformContainerRef = useRef(null);

  // Initialize Feather icons when component mounts
  useEffect(() => {
    if (window.feather) {
      window.feather.replace();
    }
  }, []);

  // Re-initialize feather icons when modal opens
  useEffect(() => {
    if (typeformModalActive && window.feather) {
      setTimeout(() => window.feather.replace(), 100);
    }
  }, [typeformModalActive]);

  // Initialize Typeform when modal opens
  useEffect(() => {
    if (typeformModalActive && typeformContainerRef.current) {
      // Clear any previous content
      typeformContainerRef.current.innerHTML = '';

      // Create the data-tf-live div for Typeform live embed
      const tfDiv = document.createElement('div');
      tfDiv.setAttribute('data-tf-live', '01JTV62WNGXMDX830477HVX7NZ');
      tfDiv.style.width = '100%';
      tfDiv.style.height = '100%';
      typeformContainerRef.current.appendChild(tfDiv);

      // Load the Typeform embed script if not already loaded
      if (!document.querySelector('script[src*="embed.typeform.com"]')) {
        const script = document.createElement('script');
        script.src = '//embed.typeform.com/next/embed.js';
        document.body.appendChild(script);
      } else {
        // If script is already loaded, trigger a re-scan
        if (window.tf && window.tf.load) {
          window.tf.load();
        }
      }
    }
  }, [typeformModalActive]);

  const openTypeformModal = () => {
    setTypeformModalActive(true);
    document.body.style.overflow = 'hidden';
  };

  const closeTypeformModal = () => {
    setTypeformModalActive(false);
    document.body.style.overflow = 'auto';
  };

  const openGameModal = () => {
    setGameModalActive(true);
    document.body.style.overflow = 'hidden';
  };

  const closeGameModal = () => {
    setGameModalActive(false);
    document.body.style.overflow = 'auto';
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        if (typeformModalActive) closeTypeformModal();
        if (gameModalActive) closeGameModal();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [typeformModalActive, gameModalActive]);

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <video autoPlay muted loop playsInline className="hero-video-background" id="heroVideo">
          <source src="/assets/videos/time-lapse.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>
        <div className="hero-container">
          <div className="hero-badge">
            <i data-feather="zap"></i>
            <span>WE'RE HIRING</span>
          </div>
          <h1 className="hero-title">
            Split Lease Careers<br />
            <span className="highlight">Start Here</span>
          </h1>
          <p className="hero-subtitle">
            We're building a market network for multilocal living.<br /><br />
            At Split Lease, we enable flexible part-time rentals with split schedules — empowering people to live in multiple cities, without paying for days they don't use.
          </p>
          <div className="hero-cta">
            <a href="#roles" className="cta-primary">
              Join our team
              <i data-feather="arrow-right"></i>
            </a>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="content-section alt-bg">
        <div className="section-container">
          <div className="mission-grid">
            <div className="mission-examples">
              {/* Sarah Example */}
              <SwipeableExampleCard
                name="Sarah"
                avatarUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces"
                pattern="Lives in Philly, uses Split Lease in NYC Monday-Wednesday"
                review="Before Split Lease, my life was a nightmare. I was either drowning in NYC rent or spending 4 hours a day commuting."
                activeDays={[0, 1, 2]}
              />

              {/* Marcus Example */}
              <SwipeableExampleCard
                name="Marcus"
                avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces"
                pattern="Lives in Boston, uses Split Lease in NYC Thursday-Sunday"
                review="I was burning out from the weekly grind. Split Lease gave me back my time and sanity. I'm saving $2,000/month."
                activeDays={[3, 4, 5, 6]}
              />

              {/* Jenna Example */}
              <SwipeableExampleCard
                name="Jenna"
                avatarUrl="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces"
                pattern="Lives in DC, uses Split Lease in NYC Monday-Thursday"
                review="I thought I had to choose between my career and quality of life. Split Lease gave me flexibility on my terms."
                activeDays={[0, 1, 2, 3]}
              />
            </div>

            <div className="mission-content">
              <div className="section-label">MISSION</div>
              <h2 className="section-title">Helping People Live Multilocally</h2>
              <p className="section-description">
                We're creating a new category where flexibility meets affordability in housing.
              </p>
              <p className="section-description">
                Split Lease enables alternating arrangements where multiple guests use the same space on different days. You only pay for the nights you need — whether that's 3 days a week or 5. No traditional lease, no wasted rent, just flexible access.
              </p>
              <div className="section-links">
                <a href="#" className="section-link" onClick={(e) => { e.preventDefault(); openGameModal(); }}>
                  <i data-feather="play-circle" style={{width: '18px', height: '18px'}}></i>
                  <span>Start with our interactive game</span>
                  <i data-feather="arrow-right"></i>
                </a>
                <a href="#" className="section-link">
                  <i data-feather="book-open" style={{width: '18px', height: '18px'}}></i>
                  <span>Read the academic article on multilocal living</span>
                  <i data-feather="arrow-right"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Journey Video Section */}
      <section className="video-section" style={{background: 'white'}}>
        <div className="video-container-wrapper">
          <div className="video-content">
            <div className="video-header">
              <div className="section-label">COMPANY</div>
              <h2 className="section-title">How We Got Here</h2>
              <p className="section-description">
                We started by testing one atomic network — an anchor listing, a hot deal, and active hosts. Today we're scaling that model to create a new category: multilocal living.
              </p>
            </div>

            <div className="video-links">
              <a href="#" className="section-link">
                <i data-feather="edit-3" style={{width: '18px', height: '18px'}}></i>
                <span>What it's like to work here — Read Michelle's take</span>
                <i data-feather="arrow-right"></i>
              </a>
            </div>
          </div>

          <div>
            <div className="video-player-container" id="videoPlayerContainer">
              <video className="video-player" id="careerVideo" preload="metadata">
                <source src="/assets/videos/time-lapse.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="play-button-overlay" id="playButtonOverlay" onClick={() => {
                const video = document.getElementById('careerVideo');
                if (video) {
                  video.play();
                  video.setAttribute('controls', 'controls');
                  document.getElementById('playButtonOverlay').classList.add('hidden');
                }
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <p className="video-caption">
              A time-lapse of Split Lease in motion
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="content-section alt-bg">
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">OUR VALUES</div>
            <h2 className="section-title">What Drives Us</h2>
          </div>
          <div className="values-grid">
            <div className="value-item">
              <div className="value-icon">
                <i data-feather="zap"></i>
              </div>
              <h3 className="value-title">Speed and iteration</h3>
              <p className="value-description">We ship fast, test quickly, and improve daily.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">
                <i data-feather="globe"></i>
              </div>
              <h3 className="value-title">Build what's needed</h3>
              <p className="value-description">No skyscrapers in small towns — we stay balanced.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">
                <i data-feather="users"></i>
              </div>
              <h3 className="value-title">Machine leverage</h3>
              <p className="value-description">We automate busy work to focus on what matters most.</p>
            </div>
            <div className="value-item">
              <div className="value-icon">
                <i data-feather="book"></i>
              </div>
              <h3 className="value-title">Always upgrading</h3>
              <p className="value-description">We delete the old to make space for the new ideas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why We'll Win Section */}
      <section className="content-section" style={{background: 'white'}}>
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">WHY WE'LL WIN</div>
            <h2 className="section-title">Built for the Future</h2>
            <p className="section-description">
              The world is changing fast — and so are the ways people live.<br /><br />
              We're combining pretotyping, AI, and insights from consumer behavior research to design products that meet real human needs.<br /><br />
              When flexibility becomes the new normal, we'll be ready.
            </p>
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section className="content-section alt-bg">
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">HOW WE WORK</div>
            <h2 className="section-title">Your Journey With Us</h2>
            <p className="section-description">
              Your journey with Split Lease is hands-on, transparent, and built for learning.
            </p>
          </div>
          <div className="process-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Apply</h3>
                <p className="step-description">Submit your application and answer a few quick questions.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Show us your thinking</h3>
                <p className="step-description">Record a short usability test video.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Join the trial</h3>
                <p className="step-description">Work with us for 3 weeks, collaborate on real projects, and see what life at Split Lease feels like.</p>
              </div>
            </div>
          </div>
          <p className="section-description" style={{marginTop: '40px'}}>
            Everyone who completes a usability test gets access to our knowledge base — a library filled with product ideas, team resources, and ways to stay connected with us.
          </p>
        </div>
      </section>

      {/* What's Inside Section */}
      <section className="content-section" style={{background: 'white'}}>
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">WHAT'S INSIDE</div>
            <h2 className="section-title">We're Not Just Building a Company</h2>
            <p className="section-description">
              We're building a learning engine.
            </p>
          </div>
          <div className="resources-list">
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="book-open"></i>
              </div>
              <div className="resource-text">Library of 100+ books</div>
            </div>
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="cpu"></i>
              </div>
              <div className="resource-text">Typeform learning modules</div>
            </div>
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="video"></i>
              </div>
              <div className="resource-text">10,000 hours of Loom recordings</div>
            </div>
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="message-circle"></i>
              </div>
              <div className="resource-text">7 years of Slack knowledge</div>
            </div>
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="settings"></i>
              </div>
              <div className="resource-text">Access to multiple machines, AI tools, and prototypes</div>
            </div>
            <div className="resource-item">
              <div className="resource-icon">
                <i data-feather="target"></i>
              </div>
              <div className="resource-text">Quiz to test your creative problem-solving skills</div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="content-section alt-bg">
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">RESOURCES</div>
            <h2 className="section-title">Learn With Us</h2>
            <p className="section-description">
              Whether you're joining our team or just curious about the future of housing, these resources will help you understand our industry and approach to building great products.
            </p>
          </div>
          <div className="resources-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '40px'}}>
            <a href="/assets/resources/What-Is-MultiLocal.pdf" target="_blank" rel="noopener noreferrer" className="resource-card" style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '32px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              color: 'inherit'
            }}>
              <div className="resource-icon" style={{
                width: '48px',
                height: '48px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <i data-feather="map" style={{width: '24px', height: '24px', color: '#6366f1'}}></i>
              </div>
              <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#111827'}}>
                What is a MultiLocal?
              </h3>
              <p style={{fontSize: '15px', lineHeight: '1.6', color: '#6b7280', marginBottom: '16px', flex: '1'}}>
                An introduction to multilocal living — what it means, who it's for, and the market insights driving this emerging lifestyle trend.
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '14px', fontWeight: '500'}}>
                <span>Download PDF</span>
                <i data-feather="download" style={{width: '16px', height: '16px'}}></i>
              </div>
            </a>

            <a href="/assets/resources/Refactoring-UI.pdf" target="_blank" rel="noopener noreferrer" className="resource-card" style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '32px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              color: 'inherit'
            }}>
              <div className="resource-icon" style={{
                width: '48px',
                height: '48px',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <i data-feather="layers" style={{width: '24px', height: '24px', color: '#6366f1'}}></i>
              </div>
              <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#111827'}}>
                Refactoring UI
              </h3>
              <p style={{fontSize: '15px', lineHeight: '1.6', color: '#6b7280', marginBottom: '16px', flex: '1'}}>
                A practical guide to designing beautiful user interfaces. Learn the tactics we use to create clean, professional designs without needing years of experience.
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '14px', fontWeight: '500'}}>
                <span>Download PDF</span>
                <i data-feather="download" style={{width: '16px', height: '16px'}}></i>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Open Roles Section */}
      <section id="roles" className="content-section" style={{background: 'white'}}>
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">OPEN ROLES</div>
            <h2 className="section-title">Join Our Team</h2>
            <p className="section-description">
              We're looking for talented individuals to help us build the future of flexible living.
            </p>
          </div>

          <div className="roles-list">
            <div className="role-card">
              <div className="role-header">
                <div>
                  <h3 className="role-title">Executive Assistant</h3>
                  <div className="role-meta">
                    <span className="role-location">
                      <i data-feather="map-pin"></i>
                      Remote
                    </span>
                    <span className="role-type">
                      <i data-feather="clock"></i>
                      Full-time
                    </span>
                  </div>
                </div>
                <button className="apply-button" onClick={openTypeformModal}>
                  Apply Now
                  <i data-feather="arrow-right"></i>
                </button>
              </div>
              <p className="role-description">
                We're seeking a highly organized and proactive Executive Assistant to support our leadership team. You'll be the operational backbone, managing schedules, coordinating projects, and ensuring smooth day-to-day operations across our remote team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Modal for Typeform */}
      <div className={`modal ${typeformModalActive ? 'active' : ''}`} onClick={(e) => {
        if (e.target.className.includes('modal')) {
          closeTypeformModal();
        }
      }}>
        <div className="modal-content">
          <button className="modal-close" onClick={closeTypeformModal}>
            <i data-feather="x"></i>
          </button>
          <div ref={typeformContainerRef} style={{ width: '100%', height: '100%' }}></div>
        </div>
      </div>

      {/* Modal for Interactive Game */}
      {gameModalActive && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGameModal();
          }}
        >
          <div style={{
            width: '98vw',
            height: '98vh',
            background: 'white',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <button
              onClick={closeGameModal}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10000,
                background: '#31135D',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <iframe
              src="/assets/games/schedule-matcher.html"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title="Schedule Matcher Game"
            />
          </div>
        </div>
      )}
    </>
  );
}
