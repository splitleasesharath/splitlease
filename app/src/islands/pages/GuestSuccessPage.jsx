import { useState, useEffect, useRef } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

// ============================================================================
// DATA: Success Stories
// ============================================================================

const successStories = [
  {
    name: 'Priya Sharma',
    role: 'Senior Product Designer',
    schedule: '12 nights/month in NYC',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop',
    quote: "I work with NYC clients regularly and needed a consistent place to stay. Split Lease gave me the consistency I needed without the commitment I didn't. Saved $24K last year and never had a booking nightmare.",
    fullStory: "Working remotely for a San Francisco tech company while maintaining NYC client relationships meant I was flying in 3 times a month. Hotels were eating my entire travel budget, and Airbnb was a gamble—one time I showed up to find the 'high-speed WiFi' was barely good enough for video calls. Split Lease changed everything. Same apartment in Chelsea, same desk setup, same coffee shop downstairs. My clients think I live here.",
    savings: '$24,000/year',
    location: 'Chelsea, Manhattan'
  },
  {
    name: 'Marcus Chen',
    role: 'Strategy Consultant',
    schedule: '8 nights/month in NYC',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
    quote: "Every week I'm in NYC for client meetings. Split Lease is my second home—literally. Same apartment, same key, zero hassle. It's transformed how I work and live.",
    fullStory: "Management consulting means I'm on the road constantly. Before Split Lease, I was spending 4 hours every trip just figuring out logistics—where to stay, how to get there, whether the place would have decent workspace. Now I just show up. My suits hang in the closet, my favorite coffee mug is in the cabinet. The host and I have never even met, but we share an apartment perfectly.",
    savings: '$18,000/year',
    location: 'Midtown East'
  },
  {
    name: 'David Martinez',
    role: 'Father & Finance Director',
    schedule: 'Every weekend in NYC',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
    quote: "I live in Boston but have custody every weekend. Split Lease gave me a consistent place for my kids—their clothes, toys, and favorite books are always there. They call it 'Dad's NYC home.' Worth every penny for that stability.",
    fullStory: "After the divorce, I moved to Boston for work but wasn't giving up weekends with my kids. Hotels were impersonal and expensive. Airbnb meant explaining to an 8-year-old why her room looked different every week. Now Emma has her own bed with her stuffed animals, and Jake has his PlayStation set up. When they walk in on Friday night, they're home.",
    savings: '$2,100/month',
    location: 'Upper West Side'
  },
  {
    name: 'Sarah Kim',
    role: 'MBA Student at Columbia',
    schedule: '3 nights/week in NYC',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=600&h=400&fit=crop',
    quote: "My program has me in NYC every Tuesday-Thursday. Split Lease saved me from drowning in hotel costs or commuting 4 hours daily. I can focus on my studies, not logistics. My textbooks and study materials stay there—it's my second dorm.",
    fullStory: "The hybrid MBA program sounded perfect until I realized what 3 days a week in NYC actually costs. Hotels near campus? $350/night minimum. A full lease for 3 nights? Insane. Commuting from Philly? 4 hours of my life, gone. Split Lease was the answer I didn't know existed. I share a beautiful studio with a nurse who works weekends. My study corner is always ready.",
    savings: '$15,000/year',
    location: 'Morningside Heights'
  }
];

// ============================================================================
// INTERNAL COMPONENT: Story Card (Full-width)
// ============================================================================

function StoryCard({ story, index, onFindSplitLease }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const isEven = index % 2 === 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`story-feature-card ${isVisible ? 'visible' : ''} ${isEven ? 'image-left' : 'image-right'}`}
    >
      <div className="story-feature-image">
        <img src={story.image} alt={`${story.name}'s space`} loading="lazy" />
        <div className="story-savings-badge">{story.savings} saved</div>
      </div>
      <div className="story-feature-content">
        <div className="story-feature-header">
          <img src={story.avatar} alt={story.name} className="story-feature-avatar" loading="lazy" />
          <div className="story-feature-person">
            <h3>{story.name}</h3>
            <p className="story-role">{story.role}</p>
            <p className="story-schedule">{story.schedule}</p>
          </div>
        </div>
        <blockquote className="story-quote">"{story.quote}"</blockquote>
        <p className="story-full">{story.fullStory}</p>
        <div className="story-meta">
          <span className="story-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {story.location}
          </span>
        </div>
        <button className="story-cta-button" onClick={onFindSplitLease}>
          Find Your NYC Space
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: GuestSuccessPage
// ============================================================================

export default function GuestSuccessPage() {
  // Dynamic text rotation for hero
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const scenarios = [
    { type: 'work', action: 'consulting' },
    { type: 'study', action: 'learning' },
    { type: 'custody', action: 'parenting' },
    { type: 'care', action: 'supporting' },
    { type: 'perform', action: 'creating' },
    { type: 'teach', action: 'educating' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % scenarios.length);
        setFadeOut(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [scenarios.length]);

  const handleFindSplitLease = () => {
    window.location.href = SEARCH_URL;
  };

  return (
    <>
      <Header />

      {/* Hero Section - Floating People Pattern */}
      <section className="success-hero">
        {/* Floating People */}
        <div className="floating-person success-person-1">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop" alt="Guest" />
        </div>
        <div className="floating-person success-person-2">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" alt="Guest" />
        </div>
        <div className="floating-person success-person-3">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop" alt="Guest" />
        </div>
        <div className="floating-person success-person-4">
          <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop" alt="Guest" />
        </div>
        <div className="floating-person success-person-5">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop" alt="Guest" />
        </div>
        <div className="floating-person success-person-6">
          <img src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop" alt="Guest" />
        </div>

        <div className="success-hero-container">
          <div className="success-hero-content">
            <div className="hero-badge">Success Stories</div>
            <h1 className="success-hero-title">
              <span className="hero-line-1">Real people.</span>
              <span className="hero-line-2">
                Real <span className={`dynamic-text ${fadeOut ? 'fade-out' : ''}`}>{scenarios[currentIndex].action}</span>.
              </span>
              <span className="hero-line-3">Real savings.</span>
            </h1>
            <p className="success-hero-subtitle">
              Discover how multi-locals like you found their NYC home base, saved thousands, and stopped living out of suitcases.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">$18K</div>
                <div className="stat-label">Avg Yearly Savings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">2,400+</div>
                <div className="stat-label">Happy Guests</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">4.9</div>
                <div className="stat-label">Guest Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Introduction - Light Gray with Gradient Blobs */}
      <section className="stories-intro-section">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="stories-intro-container">
          <div className="stories-intro-eyebrow">Why They Chose Split Lease</div>
          <h2 className="stories-intro-title">Every Story Starts With a Problem</h2>
          <p className="stories-intro-description">
            Hotels too expensive. Airbnb too inconsistent. Full-time leases too wasteful.
            These guests found a better way—and you can too.
          </p>
        </div>
      </section>

      {/* Featured Stories Section - White with Outlined Bubbles */}
      <section className="featured-stories-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>
        <div className="outlined-bubble outlined-bubble-3"></div>

        <div className="featured-stories-container">
          {successStories.map((story, index) => (
            <StoryCard
              key={index}
              story={story}
              index={index}
              onFindSplitLease={handleFindSplitLease}
            />
          ))}
        </div>
      </section>

      {/* Stats Section - Light Gray with Purple Circle Accents */}
      <section className="success-stats-section">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>
        <div className="circle-accent circle-accent-3"></div>

        <div className="success-stats-container">
          <div className="success-stats-header">
            <div className="success-stats-eyebrow">The Numbers Speak</div>
            <h2 className="success-stats-title">Trusted by Thousands of Multi-Locals</h2>
          </div>
          <div className="success-stats-grid">
            <div className="success-stat-card">
              <div className="success-stat-value">$2.4M+</div>
              <div className="success-stat-label">Total Guest Savings</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">12,000+</div>
              <div className="success-stat-label">Nights Booked</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">89%</div>
              <div className="success-stat-label">Repeat Guests</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">3.2 hrs</div>
              <div className="success-stat-label">Avg Weekly Commute Saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Brand Purple Hero with Gradient Circles */}
      <section className="success-final-cta">
        <div className="gradient-circle gradient-circle-1"></div>
        <div className="gradient-circle gradient-circle-2"></div>
        <div className="gradient-circle gradient-circle-3"></div>

        <div className="success-cta-card">
          <h2 className="success-cta-title">Ready to Write Your Success Story?</h2>
          <p className="success-cta-subtitle">
            Join thousands of multi-locals who found their NYC home base. Save money, skip the hassle, leave your stuff.
          </p>
          <div className="success-hero-cta">
            <button className="cta-button cta-primary" onClick={handleFindSplitLease}>
              <span>Find Your NYC Space</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
