import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

gsap.registerPlugin(ScrollTrigger);

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
// INTERNAL COMPONENT: GSAP Hero Section
// ============================================================================

function HeroSection() {
  const heroRef = useRef(null);
  const textLineTopRef = useRef(null);
  const textLineBottomRef = useRef(null);
  const maskRevealRef = useRef(null);
  const revealContentRef = useRef(null);
  const statsRef = useRef(null);
  const statItemsRef = useRef([]);
  const scrollIndicatorRef = useRef(null);

  // Dynamic text rotation
  const [currentIndex, setCurrentIndex] = useState(0);
  const scenarios = ['consulting', 'learning', 'parenting', 'creating', 'building', 'teaching'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % scenarios.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [scenarios.length]);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const textTop = textLineTopRef.current;
    const textBottom = textLineBottomRef.current;
    const maskReveal = maskRevealRef.current;
    const revealContent = revealContentRef.current;
    const stats = statsRef.current;
    const statItems = statItemsRef.current.filter(Boolean);
    const scrollIndicator = scrollIndicatorRef.current;

    if (!hero || !textTop || !textBottom) return;

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(maskReveal, {
        scaleY: 0,
        transformOrigin: 'center center'
      });
      gsap.set(revealContent, {
        opacity: 0,
        y: 30
      });
      gsap.set(statItems, {
        opacity: 0,
        y: 60
      });
      gsap.set(scrollIndicator, {
        opacity: 1
      });

      // Main timeline with scroll trigger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            // Hide scroll indicator after 10% progress
            if (self.progress > 0.1) {
              gsap.to(scrollIndicator, { opacity: 0, duration: 0.3 });
            } else {
              gsap.to(scrollIndicator, { opacity: 1, duration: 0.3 });
            }
          }
        }
      });

      // Phase 1: Split the text apart (0% - 30%)
      tl.to(textTop, {
        y: '-120%',
        scale: 0.6,
        opacity: 0.3,
        ease: 'power2.inOut',
        duration: 0.3
      }, 0)
      .to(textBottom, {
        y: '120%',
        scale: 0.6,
        opacity: 0.3,
        ease: 'power2.inOut',
        duration: 0.3
      }, 0);

      // Phase 2: Mask reveal expands (30% - 60%)
      tl.to(maskReveal, {
        scaleY: 1,
        ease: 'power3.out',
        duration: 0.4
      }, 0.25);

      // Phase 3: Content fades in (40% - 70%)
      tl.to(revealContent, {
        opacity: 1,
        y: 0,
        ease: 'power2.out',
        duration: 0.3
      }, 0.35);

      // Phase 4: Stats slide in with stagger (60% - 100%)
      tl.to(statItems, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        ease: 'power2.out',
        duration: 0.25
      }, 0.55);

      // Parallax background elements
      gsap.to('.hero-bg-shape', {
        y: -100,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });

    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="gsap-hero">
      {/* Background shapes */}
      <div className="hero-bg-shapes">
        <div className="hero-bg-shape shape-1"></div>
        <div className="hero-bg-shape shape-2"></div>
        <div className="hero-bg-shape shape-3"></div>
      </div>

      {/* Main content container */}
      <div className="gsap-hero-content">
        {/* Large typography - splits apart on scroll */}
        <div className="hero-text-container">
          <div ref={textLineTopRef} className="hero-text-line hero-text-top">
            <span className="hero-text-static">Real</span>
            <span className="hero-text-highlight">People.</span>
          </div>
          <div ref={textLineBottomRef} className="hero-text-line hero-text-bottom">
            <span className="hero-text-static">Real</span>
            <span className="hero-text-highlight hero-text-dynamic" key={currentIndex}>
              {scenarios[currentIndex]}.
            </span>
          </div>
        </div>

        {/* Mask reveal container - appears in center */}
        <div ref={maskRevealRef} className="mask-reveal-container">
          <div ref={revealContentRef} className="reveal-content">
            <div className="reveal-eyebrow">Why They Chose Split Lease</div>
            <h2 className="reveal-headline">Success Stories</h2>
            <p className="reveal-hook">
              Discover how multi-locals like you found their NYC home base,
              saved thousands, and stopped living out of suitcases.
            </p>
            <div className="reveal-cta">
              <a href="#stories" className="reveal-cta-button">
                Read Their Stories
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Stats - slide in from bottom */}
        <div ref={statsRef} className="hero-stats-container">
          <div
            ref={el => statItemsRef.current[0] = el}
            className="hero-stat-item"
          >
            <div className="hero-stat-value">$18K</div>
            <div className="hero-stat-label">Avg Yearly Savings</div>
          </div>
          <div
            ref={el => statItemsRef.current[1] = el}
            className="hero-stat-item"
          >
            <div className="hero-stat-value">2,400+</div>
            <div className="hero-stat-label">Happy Guests</div>
          </div>
          <div
            ref={el => statItemsRef.current[2] = el}
            className="hero-stat-item"
          >
            <div className="hero-stat-value">4.9</div>
            <div className="hero-stat-label">Guest Rating</div>
          </div>
          <div
            ref={el => statItemsRef.current[3] = el}
            className="hero-stat-item"
          >
            <div className="hero-stat-value">89%</div>
            <div className="hero-stat-label">Repeat Guests</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div ref={scrollIndicatorRef} className="scroll-indicator">
        <div className="scroll-indicator-text">Scroll to explore</div>
        <div className="scroll-indicator-line">
          <div className="scroll-indicator-dot"></div>
        </div>
      </div>
    </section>
  );
}

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
  const handleFindSplitLease = () => {
    window.location.href = SEARCH_URL;
  };

  return (
    <>
      <Header />

      {/* GSAP-Powered Hero Section */}
      <HeroSection />

      {/* Featured Stories Section - White with Outlined Bubbles */}
      <section id="stories" className="featured-stories-section">
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
